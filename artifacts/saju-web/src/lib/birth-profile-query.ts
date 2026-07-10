import type { UserProfile } from "@/contexts/UserContext";

export interface BirthProfileQueryInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  gender?: string;
  calendarType?: string;
  isLeapMonth?: boolean;
  birthPlace?: string;
  timeZone?: string;
  longitude?: number;
  latitude?: number | null;
  applyTrueSolarTime?: boolean;
  dayBoundary?: string;
}

export interface ParsedBirthProfileQuery {
  profile: UserProfile;
  label?: string;
}

function numberFromParam(value: string | null, fallback?: number) {
  if (value === null || value.trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeGender(value?: string | null): UserProfile["gender"] {
  return value === "female" ? "female" : "male";
}

function normalizeCalendarType(value?: string | null): UserProfile["calendarType"] {
  return value === "lunar" ? "lunar" : "solar";
}

function normalizeDayBoundary(value?: string | null): UserProfile["dayBoundary"] {
  return value === "late-zi" ? "late-zi" : "midnight";
}

function setOptionalParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return;
  params.set(key, String(value));
}

export function appendBirthProfileParams(
  params: URLSearchParams,
  birthInfo: BirthProfileQueryInput,
  label?: string,
) {
  params.set("bprof", "saved");
  params.set("by", String(birthInfo.year));
  params.set("bm", String(birthInfo.month));
  params.set("bd", String(birthInfo.day));
  params.set("bh", String(birthInfo.hour ?? -1));
  params.set("bmin", String(birthInfo.minute ?? 0));
  params.set("bg", normalizeGender(birthInfo.gender));
  params.set("bc", normalizeCalendarType(birthInfo.calendarType));

  setOptionalParam(params, "bl", label?.trim());
  setOptionalParam(params, "bleap", birthInfo.isLeapMonth === true ? "1" : undefined);
  setOptionalParam(params, "bplace", birthInfo.birthPlace);
  setOptionalParam(params, "btz", birthInfo.timeZone);
  setOptionalParam(params, "blng", birthInfo.longitude);
  setOptionalParam(params, "blat", birthInfo.latitude);
  setOptionalParam(params, "btrue", birthInfo.applyTrueSolarTime === true ? "1" : undefined);
  setOptionalParam(params, "bdb", normalizeDayBoundary(birthInfo.dayBoundary));

  return params;
}

export function createBirthProfileSearchParams(
  birthInfo: BirthProfileQueryInput,
  label?: string,
) {
  return appendBirthProfileParams(new URLSearchParams(), birthInfo, label);
}

export function parseBirthProfileSearch(search: string): ParsedBirthProfileQuery | null {
  const params = new URLSearchParams(search);
  if (params.get("bprof") !== "saved") return null;

  const birthYear = numberFromParam(params.get("by"));
  const birthMonth = numberFromParam(params.get("bm"));
  const birthDay = numberFromParam(params.get("bd"));
  const birthHour = numberFromParam(params.get("bh"), -1);

  if (
    !birthYear ||
    !birthMonth ||
    !birthDay ||
    birthMonth < 1 ||
    birthMonth > 12 ||
    birthDay < 1 ||
    birthDay > 31 ||
    birthHour === undefined ||
    birthHour < -1 ||
    birthHour > 23
  ) {
    return null;
  }

  const birthMinute = numberFromParam(params.get("bmin"), 0) ?? 0;
  const label = params.get("bl")?.trim() || undefined;
  const longitude = numberFromParam(params.get("blng"));
  const latitude = numberFromParam(params.get("blat"));

  return {
    label,
    profile: {
      name: label,
      gender: normalizeGender(params.get("bg")),
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      calendarType: normalizeCalendarType(params.get("bc")),
      isLeapMonth: params.get("bleap") === "1",
      birthPlace: params.get("bplace")?.trim() || undefined,
      timeZone: params.get("btz")?.trim() || undefined,
      longitude,
      latitude,
      applyTrueSolarTime: params.get("btrue") === "1",
      dayBoundary: normalizeDayBoundary(params.get("bdb")),
    },
  };
}
