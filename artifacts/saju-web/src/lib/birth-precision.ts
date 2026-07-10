import type { UserProfile } from "@/contexts/UserContext";

export interface BirthPrecisionValues {
  birthPlace: string;
  timeZone: string;
  longitude: string;
  latitude: string;
  applyTrueSolarTime: boolean;
  dayBoundary: "midnight" | "late-zi";
  isLeapMonth: boolean;
}

export const BIRTHPLACE_PRESETS = [
  { key: "seoul", label: "서울", timeZone: "Asia/Seoul", longitude: 126.978, latitude: 37.5665 },
  { key: "busan", label: "부산", timeZone: "Asia/Seoul", longitude: 129.0756, latitude: 35.1796 },
  { key: "daegu", label: "대구", timeZone: "Asia/Seoul", longitude: 128.6014, latitude: 35.8714 },
  { key: "daejeon", label: "대전", timeZone: "Asia/Seoul", longitude: 127.3845, latitude: 36.3504 },
  { key: "gwangju", label: "광주", timeZone: "Asia/Seoul", longitude: 126.8526, latitude: 35.1595 },
  { key: "jeju", label: "제주", timeZone: "Asia/Seoul", longitude: 126.5312, latitude: 33.4996 },
  { key: "tokyo", label: "도쿄", timeZone: "Asia/Tokyo", longitude: 139.6917, latitude: 35.6895 },
  { key: "beijing", label: "베이징", timeZone: "Asia/Shanghai", longitude: 116.4074, latitude: 39.9042 },
  { key: "new-york", label: "뉴욕", timeZone: "America/New_York", longitude: -74.006, latitude: 40.7128 },
  { key: "los-angeles", label: "로스앤젤레스", timeZone: "America/Los_Angeles", longitude: -118.2437, latitude: 34.0522 },
  { key: "london", label: "런던", timeZone: "Europe/London", longitude: -0.1276, latitude: 51.5072 },
  { key: "sydney", label: "시드니", timeZone: "Australia/Sydney", longitude: 151.2093, latitude: -33.8688 },
] as const;

export const DEFAULT_BIRTH_PRECISION: BirthPrecisionValues = {
  birthPlace: "서울",
  timeZone: "Asia/Seoul",
  longitude: "126.978",
  latitude: "37.5665",
  applyTrueSolarTime: false,
  dayBoundary: "midnight",
  isLeapMonth: false,
};

export function precisionFromProfile(profile?: UserProfile | null): BirthPrecisionValues {
  return {
    birthPlace: profile?.birthPlace ?? DEFAULT_BIRTH_PRECISION.birthPlace,
    timeZone: profile?.timeZone ?? DEFAULT_BIRTH_PRECISION.timeZone,
    longitude: String(profile?.longitude ?? DEFAULT_BIRTH_PRECISION.longitude),
    latitude: String(profile?.latitude ?? DEFAULT_BIRTH_PRECISION.latitude),
    applyTrueSolarTime: profile?.applyTrueSolarTime ?? false,
    dayBoundary: profile?.dayBoundary === "late-zi" ? "late-zi" : "midnight",
    isLeapMonth: profile?.isLeapMonth ?? false,
  };
}

export function precisionToPayload(values: Partial<BirthPrecisionValues>) {
  const longitude = Number(values.longitude);
  const latitude = Number(values.latitude);
  return {
    birthPlace: values.birthPlace?.trim() || "서울",
    timeZone: values.timeZone?.trim() || "Asia/Seoul",
    longitude: Number.isFinite(longitude) ? longitude : 126.978,
    latitude: Number.isFinite(latitude) ? latitude : 37.5665,
    applyTrueSolarTime: values.applyTrueSolarTime === true,
    dayBoundary: values.dayBoundary === "late-zi" ? "late-zi" as const : "midnight" as const,
    isLeapMonth: values.isLeapMonth === true,
  };
}

export function profileBirthPayload(profile: UserProfile) {
  return {
    birthYear: profile.birthYear,
    birthMonth: profile.birthMonth,
    birthDay: profile.birthDay,
    birthHour: profile.birthHour >= 0 ? profile.birthHour : -1,
    birthMinute: profile.birthMinute ?? 0,
    gender: profile.gender,
    calendarType: profile.calendarType,
    ...precisionToPayload(precisionFromProfile(profile)),
  };
}

export function appendBirthPrecisionParams(params: URLSearchParams, profile: UserProfile) {
  const precision = precisionToPayload(precisionFromProfile(profile));
  params.set("birthMinute", String(profile.birthMinute ?? 0));
  params.set("calendarType", profile.calendarType);
  params.set("isLeapMonth", String(precision.isLeapMonth));
  params.set("birthPlace", precision.birthPlace);
  params.set("timeZone", precision.timeZone);
  params.set("longitude", String(precision.longitude));
  params.set("latitude", String(precision.latitude));
  params.set("applyTrueSolarTime", String(precision.applyTrueSolarTime));
  params.set("dayBoundary", precision.dayBoundary);
  return params;
}
