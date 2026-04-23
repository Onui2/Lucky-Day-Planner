import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";

import {
  getProfileStorageKey,
  LEGACY_PROFILE_STORAGE_KEY,
} from "@/lib/profile-storage";

export interface UserProfile {
  name?: string;
  gender: "male" | "female";
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  calendarType: "solar" | "lunar";
  dayMasterElement?: string;
  dayMasterStem?: string;
  dayMasterBranch?: string;
  yearStem?: string;
  yearBranch?: string;
  monthStem?: string;
  monthBranch?: string;
  hourStem?: string;
  hourBranch?: string;
}

interface UserContextType {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => Promise<void>;
  clearProfile: () => void;
  isLoading: boolean;
  profileReady: boolean;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  setProfile: async () => {},
  clearProfile: () => {},
  isLoading: false,
  profileReady: false,
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNumber(value: unknown, fallback?: number) {
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }

  return fallback;
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const gender = value.gender === "female" ? "female" : value.gender === "male" ? "male" : null;
  const calendarType =
    value.calendarType === "lunar"
      ? "lunar"
      : value.calendarType === "solar"
        ? "solar"
        : null;
  const birthYear = parseNumber(value.birthYear);
  const birthMonth = parseNumber(value.birthMonth);
  const birthDay = parseNumber(value.birthDay);
  const birthHour = parseNumber(value.birthHour, -1);

  if (!gender || !calendarType || !birthYear || !birthMonth || !birthDay || birthHour === undefined) {
    return null;
  }

  return {
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : undefined,
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute: parseNumber(value.birthMinute),
    calendarType,
    dayMasterElement:
      typeof value.dayMasterElement === "string" ? value.dayMasterElement : undefined,
    dayMasterStem:
      typeof value.dayMasterStem === "string" ? value.dayMasterStem : undefined,
    dayMasterBranch:
      typeof value.dayMasterBranch === "string" ? value.dayMasterBranch : undefined,
    yearStem: typeof value.yearStem === "string" ? value.yearStem : undefined,
    yearBranch: typeof value.yearBranch === "string" ? value.yearBranch : undefined,
    monthStem: typeof value.monthStem === "string" ? value.monthStem : undefined,
    monthBranch: typeof value.monthBranch === "string" ? value.monthBranch : undefined,
    hourStem: typeof value.hourStem === "string" ? value.hourStem : undefined,
    hourBranch: typeof value.hourBranch === "string" ? value.hourBranch : undefined,
  };
}

function readLocalProfile(userId: string): UserProfile | null {
  try {
    const storageKey = getProfileStorageKey(userId);
    const raw =
      localStorage.getItem(storageKey) ??
      localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, raw);
    }
    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);

    return normalizeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalProfile(userId: string, profile: UserProfile | null) {
  const storageKey = getProfileStorageKey(userId);

  if (!profile) {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    return;
  }

  const serialized = JSON.stringify(profile);
  localStorage.setItem(storageKey, serialized);
  localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
}

function needsPillarMigration(profile: UserProfile) {
  return !profile.dayMasterStem
    || !profile.dayMasterBranch
    || !profile.yearStem
    || !profile.yearBranch
    || !profile.monthStem
    || !profile.monthBranch
    || (profile.birthHour >= 0 && (!profile.hourStem || !profile.hourBranch));
}

async function fetchProfilePillars(p: UserProfile): Promise<Partial<UserProfile>> {
  const res = await fetch(`${BASE}/api/saju/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthYear: p.birthYear,
      birthMonth: p.birthMonth,
      birthDay: p.birthDay,
      birthHour: p.birthHour,
      birthMinute: p.birthMinute ?? 0,
      gender: p.gender,
      calendarType: p.calendarType,
    }),
  });

  if (!res.ok) throw new Error("사주 계산 실패");

  const data = await res.json();
  return {
    dayMasterElement:
      data.dayMasterElement ?? data.dayPillar?.heavenlyStemElement ?? "목",
    dayMasterStem: data.dayPillar?.heavenlyStem ?? "",
    dayMasterBranch: data.dayPillar?.earthlyBranch ?? "",
    yearStem: data.yearPillar?.heavenlyStem ?? "",
    yearBranch: data.yearPillar?.earthlyBranch ?? "",
    monthStem: data.monthPillar?.heavenlyStem ?? "",
    monthBranch: data.monthPillar?.earthlyBranch ?? "",
    hourStem: data.hourPillar?.heavenlyStem ?? "",
    hourBranch: data.hourPillar?.earthlyBranch ?? "",
  };
}

async function fetchRemoteProfile() {
  const response = await customFetch<{ profile: unknown }>("/api/profile");
  return normalizeProfile(response.profile);
}

async function saveRemoteProfile(profile: UserProfile) {
  const response = await customFetch<{ profile: unknown }>("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ profile }),
  });

  return normalizeProfile(response.profile) ?? profile;
}

async function removeRemoteProfile() {
  return customFetch<{ ok: boolean }>("/api/profile", { method: "DELETE" });
}

async function resolveProfile(profile: UserProfile) {
  if (!needsPillarMigration(profile)) {
    return profile;
  }

  try {
    const pillarInfo = await fetchProfilePillars(profile);
    return { ...profile, ...pillarInfo };
  } catch {
    return profile;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setProfileState(null);
      setProfileReady(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!isAuthenticated || !user?.id) {
        setProfileState(null);
        setProfileReady(true);
        try {
          localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
        } catch {}
        return;
      }

      setProfileState(null);
      setProfileReady(false);

      const localProfile = readLocalProfile(user.id);

      try {
        const remoteProfile = await fetchRemoteProfile();
        const baseProfile = remoteProfile ?? localProfile;

        if (!baseProfile) {
          if (!cancelled) setProfileState(null);
          return;
        }

        const resolvedProfile = await resolveProfile(baseProfile);
        writeLocalProfile(user.id, resolvedProfile);

        if (!remoteProfile || needsPillarMigration(remoteProfile)) {
          void saveRemoteProfile(resolvedProfile).catch(() => {});
        }

        if (!cancelled) {
          setProfileState(resolvedProfile);
        }
      } catch {
        if (!localProfile) {
          if (!cancelled) setProfileState(null);
          return;
        }

        const resolvedProfile = await resolveProfile(localProfile);
        writeLocalProfile(user.id, resolvedProfile);
        if (!cancelled) {
          setProfileState(resolvedProfile);
        }
      } finally {
        if (!cancelled) {
          setProfileReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  const setProfile = useCallback(
    async (nextProfile: UserProfile) => {
      if (!user?.id || !isAuthenticated) {
        setProfileState(null);
        return;
      }

      setIsLoading(true);
      const resolvedProfile = await resolveProfile(nextProfile);
      writeLocalProfile(user.id, resolvedProfile);
      setProfileState(resolvedProfile);

      try {
        const savedProfile = await saveRemoteProfile(resolvedProfile);
        writeLocalProfile(user.id, savedProfile);
        setProfileState(savedProfile);
      } catch {
        setProfileState(resolvedProfile);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, user?.id],
  );

  const clearProfile = useCallback(() => {
    if (user?.id) {
      writeLocalProfile(user.id, null);
      void removeRemoteProfile().catch(() => {});
    }

    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    setProfileState(null);
  }, [user?.id]);

  return (
    <UserContext.Provider
      value={{ profile, setProfile, clearProfile, isLoading, profileReady }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
