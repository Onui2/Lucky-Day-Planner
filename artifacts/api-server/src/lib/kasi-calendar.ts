const KASI_SPECIAL_DAY_BASE_URL =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";
const SUCCESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4_500;
const MAX_CACHE_ENTRIES = 600;
const REMOTE_REQUEST_WINDOW_MS = 60 * 1000;
const MAX_REMOTE_MONTHS_PER_WINDOW = 30;
const REMOTE_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REMOTE_MONTHS_PER_DAY = 500;
const MIN_SUPPORTED_YEAR = 1900;
const MAX_SUPPORTED_YEAR = 2050;

export type CalendarDataSource = "kasi" | "partial" | "local";

export interface KasiSpecialDay {
  holiday?: string;
  solarTerm?: string;
}

export interface KasiCalendarMonth {
  source: CalendarDataSource;
  message: string;
  days: Record<string, KasiSpecialDay>;
  holidaysAuthoritative: boolean;
  solarTermsAuthoritative: boolean;
}

interface CachedMonth {
  expiresAt: number;
  value: KasiCalendarMonth;
}

interface KasiItem {
  locdate: string;
  dateName: string;
  isHoliday: string;
}

const monthCache = new Map<string, CachedMonth>();
const inFlightMonths = new Map<string, Promise<KasiCalendarMonth>>();
let remoteMonthRequestTimes: number[] = [];

function localCalendarMonth(message: string): KasiCalendarMonth {
  return {
    source: "local",
    message,
    days: {},
    holidaysAuthoritative: false,
    solarTermsAuthoritative: false,
  };
}

function readCachedMonth(cacheKey: string): KasiCalendarMonth | undefined {
  const cached = monthCache.get(cacheKey);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    monthCache.delete(cacheKey);
    return undefined;
  }

  // Refresh insertion order so the bounded Map behaves as an LRU cache.
  monthCache.delete(cacheKey);
  monthCache.set(cacheKey, cached);
  return cached.value;
}

function writeCachedMonth(cacheKey: string, value: KasiCalendarMonth): void {
  monthCache.delete(cacheKey);
  monthCache.set(cacheKey, {
    expiresAt: Date.now() + (value.source === "kasi" ? SUCCESS_CACHE_TTL_MS : FAILURE_CACHE_TTL_MS),
    value,
  });

  while (monthCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = monthCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    monthCache.delete(oldestKey);
  }
}

function canStartRemoteMonthRequest(now = Date.now()): boolean {
  remoteMonthRequestTimes = remoteMonthRequestTimes.filter(
    (requestedAt) => now - requestedAt < REMOTE_DAILY_WINDOW_MS,
  );
  const requestsInCurrentMinute = remoteMonthRequestTimes.filter(
    (requestedAt) => now - requestedAt < REMOTE_REQUEST_WINDOW_MS,
  ).length;
  if (
    requestsInCurrentMinute >= MAX_REMOTE_MONTHS_PER_WINDOW
    || remoteMonthRequestTimes.length >= MAX_REMOTE_MONTHS_PER_DAY
  ) return false;
  remoteMonthRequestTimes.push(now);
  return true;
}

function getServiceKey(): string | undefined {
  const key = process.env.DATA_GO_KR_SERVICE_KEY?.trim() || process.env.KASI_SERVICE_KEY?.trim();
  if (!key) return undefined;

  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function readXmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

export function parseKasiItems(xml: string): KasiItem[] {
  const resultCode = readXmlTag(xml, "resultCode")
    || readXmlTag(xml, "returnReasonCode")
    || readXmlTag(xml, "returnCode");
  if (!resultCode) {
    throw new Error("한국천문연구원 API 응답 코드 누락");
  }
  if (resultCode !== "00" && resultCode !== "0") {
    const resultMessage = readXmlTag(xml, "resultMsg")
      || readXmlTag(xml, "returnAuthMsg")
      || readXmlTag(xml, "errMsg")
      || "한국천문연구원 API 오류";
    throw new Error(`${resultCode}: ${resultMessage}`);
  }

  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .map((match) => ({
      locdate: readXmlTag(match[1], "locdate"),
      dateName: readXmlTag(match[1], "dateName"),
      isHoliday: readXmlTag(match[1], "isHoliday"),
    }))
    .filter((item) => /^\d{8}$/.test(item.locdate) && item.dateName.length > 0);
}

function toIsoDate(locdate: string): string {
  return `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;
}

function appendName(current: string | undefined, next: string): string {
  if (!current) return next;
  const names = current.split(" · ");
  return names.includes(next) ? current : `${current} · ${next}`;
}

async function fetchKasiItems(
  operation: "getRestDeInfo" | "get24DivisionsInfo",
  year: number,
  month: number,
  serviceKey: string,
): Promise<KasiItem[]> {
  const url = new URL(`${KASI_SPECIAL_DAY_BASE_URL}/${operation}`);
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("solYear", String(year));
  url.searchParams.set("solMonth", String(month).padStart(2, "0"));

  const response = await fetch(url, {
    headers: { Accept: "application/xml, text/xml;q=0.9, */*;q=0.1" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${operation} HTTP ${response.status}`);
  }

  return parseKasiItems(await response.text());
}

export function clearKasiCalendarCache(): void {
  monthCache.clear();
  inFlightMonths.clear();
  remoteMonthRequestTimes = [];
}

export function enrichCalendarDay<
  T extends { solar: string; holiday?: string; solarTerm?: string },
>(dayData: T, calendar: KasiCalendarMonth): T {
  const external = calendar.days[dayData.solar];
  const holiday = calendar.holidaysAuthoritative
    ? external?.holiday
    : external?.holiday || dayData.holiday;
  const solarTerm = calendar.solarTermsAuthoritative
    ? external?.solarTerm
    : external?.solarTerm || dayData.solarTerm;

  if (holiday === dayData.holiday && solarTerm === dayData.solarTerm) return dayData;

  return {
    ...dayData,
    holiday,
    solarTerm,
  };
}

async function loadKasiCalendarMonth(
  year: number,
  month: number,
  serviceKey: string,
): Promise<KasiCalendarMonth> {
  const [holidaysResult, solarTermsResult] = await Promise.allSettled([
    fetchKasiItems("getRestDeInfo", year, month, serviceKey),
    fetchKasiItems("get24DivisionsInfo", year, month, serviceKey),
  ]);

  const days: Record<string, KasiSpecialDay> = {};
  if (holidaysResult.status === "fulfilled") {
    for (const item of holidaysResult.value) {
      if (item.isHoliday && item.isHoliday !== "Y") continue;
      const date = toIsoDate(item.locdate);
      days[date] = {
        ...days[date],
        holiday: appendName(days[date]?.holiday, item.dateName),
      };
    }
  }

  if (solarTermsResult.status === "fulfilled") {
    for (const item of solarTermsResult.value) {
      const date = toIsoDate(item.locdate);
      days[date] = {
        ...days[date],
        solarTerm: appendName(days[date]?.solarTerm, item.dateName),
      };
    }
  }

  const successCount = Number(holidaysResult.status === "fulfilled")
    + Number(solarTermsResult.status === "fulfilled");
  const source: CalendarDataSource = successCount === 2 ? "kasi" : successCount === 1 ? "partial" : "local";
  const holidaysAuthoritative = holidaysResult.status === "fulfilled";
  const solarTermsAuthoritative = solarTermsResult.status === "fulfilled";
  const message = source === "kasi"
    ? "공휴일·24절기: 한국천문연구원 공공데이터"
    : holidaysAuthoritative
      ? "공휴일: 한국천문연구원 · 24절기: 로컬 지원 데이터"
      : solarTermsAuthoritative
        ? "24절기: 한국천문연구원 · 공휴일: 일시 미제공"
        : "공공데이터 연결 실패 · 공휴일 미제공, 음력/손없는날은 로컬 계산";
  return {
    source,
    message,
    days,
    holidaysAuthoritative,
    solarTermsAuthoritative,
  };
}

export async function getKasiCalendarMonth(year: number, month: number): Promise<KasiCalendarMonth> {
  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || year < MIN_SUPPORTED_YEAR
    || year > MAX_SUPPORTED_YEAR
    || month < 1
    || month > 12
  ) {
    return localCalendarMonth("지원 범위를 벗어난 년월 · 공휴일 미제공, 음력/손없는날은 로컬 계산");
  }

  const cacheKey = `${year}-${String(month).padStart(2, "0")}`;
  const cached = readCachedMonth(cacheKey);
  if (cached) return cached;

  const serviceKey = getServiceKey();
  if (!serviceKey) {
    return localCalendarMonth("공공데이터 API 키 미설정 · 공휴일 미제공, 음력/손없는날은 로컬 계산");
  }

  const inFlight = inFlightMonths.get(cacheKey);
  if (inFlight) return inFlight;

  if (!canStartRemoteMonthRequest()) {
    return localCalendarMonth("공공데이터 요청 한도 도달 · 공휴일 미제공, 음력/손없는날은 로컬 계산");
  }

  const request = loadKasiCalendarMonth(year, month, serviceKey)
    .then((value) => {
      writeCachedMonth(cacheKey, value);
      return value;
    })
    .finally(() => {
      inFlightMonths.delete(cacheKey);
    });

  inFlightMonths.set(cacheKey, request);
  return request;
}
