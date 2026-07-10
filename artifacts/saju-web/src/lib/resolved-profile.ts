import { useEffect, useState } from "react";

import { useAuth } from "@workspace/replit-auth-web";
import { useUser, type UserProfile } from "@/contexts/UserContext";
import { getSajuCacheStorageKey, LEGACY_SAJU_CACHE_STORAGE_KEY } from "@/lib/profile-storage";

function parseNumber(value: unknown, fallback = -1): number {
  if (value === null || value === undefined || typeof value === "boolean") return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeGender(value: unknown): UserProfile["gender"] {
  return value === "female" ? "female" : "male";
}

function normalizeCalendarType(value: unknown): UserProfile["calendarType"] {
  return value === "lunar" ? "lunar" : "solar";
}

// 사주 계산 결과(CalculateSaju 응답/캐시)를 만세력·개인화가 쓰는 UserProfile로 변환한다.
// 다른 사람 사주를 조회해 만세력에 주입할 때도 이 매핑을 그대로 재사용한다.
export function sajuResultToProfile(result?: Record<string, unknown> | null): UserProfile | null {
  if (!result) return null;

  const birthInfo = result.birthInfo as Record<string, unknown> | undefined;
  const yearPillar = result.yearPillar as Record<string, unknown> | undefined;
  const monthPillar = result.monthPillar as Record<string, unknown> | undefined;
  const dayPillar = result.dayPillar as Record<string, unknown> | undefined;
  const hourPillar = result.hourPillar as Record<string, unknown> | undefined;

  if (!birthInfo?.year || !birthInfo?.month || !birthInfo?.day) {
    return null;
  }

  return {
    gender: normalizeGender(birthInfo.gender),
    birthYear: parseNumber(birthInfo.year, 0),
    birthMonth: parseNumber(birthInfo.month, 0),
    birthDay: parseNumber(birthInfo.day, 0),
    birthHour: parseNumber(birthInfo.hour, -1),
    birthMinute: parseNumber(birthInfo.minute, 0),
    calendarType: normalizeCalendarType(birthInfo.calendarType),
    isLeapMonth: birthInfo.isLeapMonth === true,
    birthPlace: typeof birthInfo.birthPlace === "string" ? birthInfo.birthPlace : undefined,
    timeZone: typeof birthInfo.timeZone === "string" ? birthInfo.timeZone : undefined,
    longitude: parseNumber(birthInfo.longitude, Number.NaN),
    latitude: parseNumber(birthInfo.latitude, Number.NaN),
    applyTrueSolarTime: birthInfo.applyTrueSolarTime === true,
    dayBoundary: birthInfo.dayBoundary === "late-zi" ? "late-zi" : "midnight",
    dayMasterElement:
      typeof result.dayMasterElement === "string"
        ? result.dayMasterElement
        : typeof dayPillar?.heavenlyStemElement === "string"
          ? dayPillar.heavenlyStemElement
          : undefined,
    dayMasterStem:
      typeof dayPillar?.heavenlyStem === "string" ? dayPillar.heavenlyStem : undefined,
    dayMasterBranch:
      typeof dayPillar?.earthlyBranch === "string" ? dayPillar.earthlyBranch : undefined,
    yearStem:
      typeof yearPillar?.heavenlyStem === "string" ? yearPillar.heavenlyStem : undefined,
    yearBranch:
      typeof yearPillar?.earthlyBranch === "string" ? yearPillar.earthlyBranch : undefined,
    monthStem:
      typeof monthPillar?.heavenlyStem === "string" ? monthPillar.heavenlyStem : undefined,
    monthBranch:
      typeof monthPillar?.earthlyBranch === "string" ? monthPillar.earthlyBranch : undefined,
    hourStem:
      typeof hourPillar?.heavenlyStem === "string" ? hourPillar.heavenlyStem : undefined,
    hourBranch:
      typeof hourPillar?.earthlyBranch === "string" ? hourPillar.earthlyBranch : undefined,
  };
}

export function readCachedSajuProfile(userId?: string | null): UserProfile | null {
  if (typeof window === "undefined") return null;
  if (!userId) return null;

  try {
    const storageKey = getSajuCacheStorageKey(userId);
    const raw =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem(LEGACY_SAJU_CACHE_STORAGE_KEY);
    if (!raw) return null;

    if (!window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, raw);
    }
    window.localStorage.removeItem(LEGACY_SAJU_CACHE_STORAGE_KEY);

    const saved = JSON.parse(raw) as { result?: Record<string, unknown> };
    return sajuResultToProfile(saved.result);
  } catch {
    return null;
  }
}

export function useResolvedProfile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile, profileReady } = useUser();
  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (authLoading) {
      setCachedProfile(null);
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setCachedProfile(null);
      try {
        window.localStorage.removeItem(LEGACY_SAJU_CACHE_STORAGE_KEY);
      } catch {}
      return;
    }

    if (profile) {
      setCachedProfile(null);
      return;
    }

    setCachedProfile(readCachedSajuProfile(user.id));
  }, [authLoading, isAuthenticated, profile, profileReady, user?.id]);

  const resolvedProfile = authLoading || !isAuthenticated ? null : profile ?? cachedProfile;

  return {
    profile: resolvedProfile,
    hasSavedProfile: isAuthenticated && Boolean(profile),
    hasCachedProfile: isAuthenticated && !profile && Boolean(cachedProfile),
    profileReady: authLoading ? false : profileReady,
  };
}
