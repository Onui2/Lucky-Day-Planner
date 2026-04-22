import { useEffect, useState } from "react";

import { useUser, type UserProfile } from "@/contexts/UserContext";

const SAJU_CACHE_KEY = "myunghae_saju_v1";

function parseNumber(value: unknown, fallback = -1): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeGender(value: unknown): UserProfile["gender"] {
  return value === "female" ? "female" : "male";
}

function normalizeCalendarType(value: unknown): UserProfile["calendarType"] {
  return value === "lunar" ? "lunar" : "solar";
}

export function readCachedSajuProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SAJU_CACHE_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw) as { result?: Record<string, unknown> };
    const result = saved.result;
    const birthInfo = result?.birthInfo as Record<string, unknown> | undefined;
    const yearPillar = result?.yearPillar as Record<string, unknown> | undefined;
    const monthPillar = result?.monthPillar as Record<string, unknown> | undefined;
    const dayPillar = result?.dayPillar as Record<string, unknown> | undefined;
    const hourPillar = result?.hourPillar as Record<string, unknown> | undefined;

    if (!birthInfo?.year || !birthInfo?.month || !birthInfo?.day) {
      return null;
    }

    return {
      gender: normalizeGender(birthInfo.gender),
      birthYear: parseNumber(birthInfo.year, 0),
      birthMonth: parseNumber(birthInfo.month, 0),
      birthDay: parseNumber(birthInfo.day, 0),
      birthHour: parseNumber(birthInfo.hour, -1),
      calendarType: normalizeCalendarType(birthInfo.calendarType),
      dayMasterElement:
        typeof result?.dayMasterElement === "string"
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
  } catch {
    return null;
  }
}

export function useResolvedProfile() {
  const { profile, profileReady } = useUser();
  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (profile) {
      setCachedProfile(null);
      return;
    }

    if (!profileReady) return;
    setCachedProfile(readCachedSajuProfile());
  }, [profile, profileReady]);

  return {
    profile: profile ?? cachedProfile,
    hasSavedProfile: Boolean(profile),
    hasCachedProfile: !profile && Boolean(cachedProfile),
    profileReady,
  };
}
