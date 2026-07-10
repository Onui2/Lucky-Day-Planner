import KoreanLunarCalendar from "korean-lunar-calendar";

export type DayBoundaryRule = "midnight" | "late-zi";

export interface BirthCalculationOptions {
  birthPlace?: string;
  timeZone?: string;
  longitude?: number;
  latitude?: number;
  applyTrueSolarTime?: boolean;
  dayBoundary?: DayBoundaryRule;
  isLeapMonth?: boolean;
}

export interface BirthResolutionInput extends BirthCalculationOptions {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  birthMinute?: number;
  calendarType: "solar" | "lunar";
}

export interface ResolvedBirthDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface BirthCalculationBasis {
  original: ResolvedBirthDateTime & {
    calendarType: "solar" | "lunar";
    isLeapMonth: boolean;
  };
  solarDate: ResolvedBirthDateTime;
  adjusted: ResolvedBirthDateTime;
  dayPillarDate: Pick<ResolvedBirthDateTime, "year" | "month" | "day">;
  birthPlace: string;
  timeZone: string;
  longitude: number;
  latitude: number | null;
  utcOffsetMinutes: number | null;
  dstMinutes: number;
  equationOfTimeMinutes: number;
  longitudeCorrectionMinutes: number;
  totalCorrectionMinutes: number;
  appliedTrueSolarTime: boolean;
  dayBoundary: DayBoundaryRule;
  lunarConverted: boolean;
  dayShiftedByLateZi: boolean;
  confidence: "high" | "medium";
  method: string;
  warnings: string[];
}

export class BirthResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BirthResolutionError";
  }
}

const DEFAULT_TIME_ZONE = "Asia/Seoul";
const DEFAULT_LONGITUDE = 126.978;
const DEFAULT_LATITUDE = 37.5665;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new BirthResolutionError(`지원하지 않는 시간대입니다: ${timeZone}`);
  }

  formatterCache.set(timeZone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timeZone: string): ResolvedBirthDateTime & { second: number } {
  const parts = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function componentsEpoch(value: Pick<ResolvedBirthDateTime, "year" | "month" | "day" | "hour" | "minute">) {
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0);
}

function zonedLocalToUtc(value: ResolvedBirthDateTime, timeZone: string): Date {
  const targetEpoch = componentsEpoch(value);
  let guess = targetEpoch;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const observed = getZonedParts(new Date(guess), timeZone);
    const difference = targetEpoch - componentsEpoch(observed);
    guess += difference;
    if (Math.abs(difference) < 1_000) break;
  }

  return new Date(guess);
}

function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const local = getZonedParts(date, timeZone);
  return Math.round((componentsEpoch(local) - date.getTime()) / 60_000);
}

function getLikelyDstMinutes(date: Date, timeZone: string): number {
  const year = getZonedParts(date, timeZone).year;
  const offsets = Array.from({ length: 12 }, (_, month) => {
    const sample = zonedLocalToUtc({ year, month: month + 1, day: 15, hour: 12, minute: 0 }, timeZone);
    return getUtcOffsetMinutes(sample, timeZone);
  });
  const standardOffset = Math.min(...offsets);
  return Math.max(0, getUtcOffsetMinutes(date, timeZone) - standardOffset);
}

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000);
}

// NOAA fractional-year approximation. Accuracy is sufficient for birth-hour boundary checks.
export function getEquationOfTimeMinutes(value: ResolvedBirthDateTime): number {
  const days = isLeapYear(value.year) ? 366 : 365;
  const gamma = (2 * Math.PI / days) * (
    dayOfYear(value.year, value.month, value.day) - 1 + (value.hour - 12) / 24
  );
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validateDate(year: number, month: number, day: number, calendarType: "solar" | "lunar") {
  if (![year, month, day].every(Number.isInteger)) {
    throw new BirthResolutionError("생년월일은 정수여야 합니다.");
  }
  if (
    calendarType === "lunar" &&
    year >= 1000 && year <= 2050 &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= 30
  ) {
    return;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1000 || year > 2050 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BirthResolutionError("지원하지 않거나 존재하지 않는 생년월일입니다.");
  }
}

function validateTime(hour: number, minute: number) {
  if (hour !== -1 && (!Number.isInteger(hour) || hour < 0 || hour > 23)) {
    throw new BirthResolutionError("출생 시각은 0~23 또는 모름(-1)이어야 합니다.");
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new BirthResolutionError("출생 분은 0~59여야 합니다.");
  }
}

function addDays(year: number, month: number, day: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function convertLunarToSolar(year: number, month: number, day: number, isLeapMonth: boolean) {
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setLunarDate(year, month, day, isLeapMonth)) {
    throw new BirthResolutionError(
      isLeapMonth
        ? "해당 연도·월에 존재하는 윤달 날짜가 아닙니다."
        : "지원하지 않거나 존재하지 않는 음력 날짜입니다.",
    );
  }
  const solar = calendar.getSolarCalendar();
  return { year: solar.year, month: solar.month, day: solar.day };
}

function roundMinute(value: number) {
  return Math.round(value * 10) / 10;
}

export function resolveBirthInput(input: BirthResolutionInput): BirthCalculationBasis {
  const year = Number(input.birthYear);
  const month = Number(input.birthMonth);
  const day = Number(input.birthDay);
  const knownHour = input.birthHour !== -1 && input.birthHour != null;
  const hour = knownHour ? Number(input.birthHour) : -1;
  const minute = knownHour ? Number(input.birthMinute ?? 0) : 0;
  const isLeapMonth = Boolean(input.isLeapMonth && input.calendarType === "lunar");
  const timeZone = input.timeZone?.trim() || DEFAULT_TIME_ZONE;
  const hasLongitude = input.longitude !== undefined && input.longitude !== null && input.longitude !== ("" as unknown);
  const hasLatitude = input.latitude !== undefined && input.latitude !== null && input.latitude !== ("" as unknown);
  const longitude = hasLongitude && Number.isFinite(Number(input.longitude))
    ? Math.max(-180, Math.min(180, Number(input.longitude)))
    : DEFAULT_LONGITUDE;
  const latitude = hasLatitude && Number.isFinite(Number(input.latitude))
    ? Math.max(-90, Math.min(90, Number(input.latitude)))
    : input.birthPlace || input.timeZone || input.longitude != null
      ? null
      : DEFAULT_LATITUDE;
  const dayBoundary: DayBoundaryRule = input.dayBoundary === "late-zi" ? "late-zi" : "midnight";
  const applyTrueSolarTime = Boolean(input.applyTrueSolarTime);

  validateDate(year, month, day, input.calendarType);
  validateTime(hour, minute);
  getFormatter(timeZone);

  const solar = input.calendarType === "lunar"
    ? convertLunarToSolar(year, month, day, isLeapMonth)
    : { year, month, day };
  const solarDate: ResolvedBirthDateTime = {
    ...solar,
    hour,
    minute,
  };
  const warnings: string[] = [];

  let adjusted = { ...solarDate };
  let utcOffsetMinutes: number | null = null;
  let dstMinutes = 0;
  let equationOfTimeMinutes = 0;
  let longitudeCorrectionMinutes = 0;
  let totalCorrectionMinutes = 0;

  if (applyTrueSolarTime) {
    const civilForConversion = { ...solarDate, hour: knownHour ? hour : 12 };
    const instant = zonedLocalToUtc(civilForConversion, timeZone);
    utcOffsetMinutes = getUtcOffsetMinutes(instant, timeZone);
    dstMinutes = getLikelyDstMinutes(instant, timeZone);
    equationOfTimeMinutes = getEquationOfTimeMinutes(civilForConversion);
    longitudeCorrectionMinutes = longitude * 4 - utcOffsetMinutes;
    totalCorrectionMinutes = longitudeCorrectionMinutes + equationOfTimeMinutes;

    const apparentSolarInstant = new Date(
      instant.getTime() + (longitude * 4 + equationOfTimeMinutes) * 60_000,
    );
    adjusted = {
      year: apparentSolarInstant.getUTCFullYear(),
      month: apparentSolarInstant.getUTCMonth() + 1,
      day: apparentSolarInstant.getUTCDate(),
      hour: knownHour ? apparentSolarInstant.getUTCHours() : -1,
      minute: knownHour ? apparentSolarInstant.getUTCMinutes() : 0,
    };

    if (!knownHour) {
      warnings.push("출생시간 미상이라 진태양시 보정은 날짜 경계 확인에만 사용했습니다.");
    }
    if (Math.abs(totalCorrectionMinutes) >= 30) {
      warnings.push("시각 보정이 30분 이상이라 시주가 달라질 가능성을 확인했습니다.");
    }
    if (dstMinutes > 0) {
      warnings.push(`해당 지역의 역사적 일광절약시간 ${dstMinutes}분을 반영했습니다.`);
    }
  }

  const dayShiftedByLateZi = knownHour && dayBoundary === "late-zi" && adjusted.hour === 23;
  const dayPillarDate = dayShiftedByLateZi
    ? addDays(adjusted.year, adjusted.month, adjusted.day, 1)
    : { year: adjusted.year, month: adjusted.month, day: adjusted.day };

  return {
    original: {
      year,
      month,
      day,
      hour,
      minute,
      calendarType: input.calendarType,
      isLeapMonth,
    },
    solarDate,
    adjusted,
    dayPillarDate,
    birthPlace: input.birthPlace?.trim() || "서울",
    timeZone,
    longitude,
    latitude,
    utcOffsetMinutes,
    dstMinutes,
    equationOfTimeMinutes: roundMinute(equationOfTimeMinutes),
    longitudeCorrectionMinutes: roundMinute(longitudeCorrectionMinutes),
    totalCorrectionMinutes: roundMinute(totalCorrectionMinutes),
    appliedTrueSolarTime: applyTrueSolarTime,
    dayBoundary,
    lunarConverted: input.calendarType === "lunar",
    dayShiftedByLateZi,
    confidence: knownHour ? "high" : "medium",
    method: applyTrueSolarTime
      ? "IANA 시간대·과거 DST와 경도 4분/도, NOAA 균시차 근사식을 적용한 진태양시"
      : "입력 민간시를 그대로 사용하고 절기 경계만 분 단위로 적용",
    warnings,
  };
}

export function birthOptionsFromRecord(value: Record<string, unknown>): BirthCalculationOptions {
  const optionalNumber = (input: unknown) => {
    if (input === null || input === undefined || typeof input === "boolean") return undefined;
    if (typeof input === "string" && input.trim() === "") return undefined;
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    birthPlace: typeof value.birthPlace === "string" ? value.birthPlace : undefined,
    timeZone: typeof value.timeZone === "string" ? value.timeZone : undefined,
    longitude: optionalNumber(value.longitude),
    latitude: optionalNumber(value.latitude),
    applyTrueSolarTime: value.applyTrueSolarTime === true || value.applyTrueSolarTime === "true",
    dayBoundary: value.dayBoundary === "late-zi" ? "late-zi" : "midnight",
    isLeapMonth: value.isLeapMonth === true || value.isLeapMonth === "true",
  };
}
