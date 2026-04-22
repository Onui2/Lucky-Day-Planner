import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { getProfileStorageKey, LEGACY_PROFILE_STORAGE_KEY } from "@/lib/profile-storage";

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
    dayMasterElement: data.dayMasterElement ?? data.dayPillar?.heavenlyStemElement ?? "목",
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

      try {
        const storageKey = getProfileStorageKey(user.id);
        const raw = localStorage.getItem(storageKey) ?? localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
        if (raw) {
          const parsed: UserProfile = JSON.parse(raw);
          if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, raw);
          }
          localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
          if (needsPillarMigration(parsed)) {
            try {
              const pillarInfo = await fetchProfilePillars(parsed);
              const migrated = { ...parsed, ...pillarInfo };
              localStorage.setItem(storageKey, JSON.stringify(migrated));
              if (!cancelled) setProfileState(migrated);
            } catch {
              if (!cancelled) setProfileState(parsed);
            }
          } else {
            if (!cancelled) setProfileState(parsed);
          }
        } else if (!cancelled) {
          setProfileState(null);
        }
      } catch {}
      if (!cancelled) {
        setProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  const setProfile = useCallback(async (p: UserProfile) => {
    if (!user?.id || !isAuthenticated) {
      setProfileState(null);
      return;
    }

    const storageKey = getProfileStorageKey(user.id);
    setIsLoading(true);
    try {
      const pillarInfo = await fetchProfilePillars(p);
      const full: UserProfile = { ...p, ...pillarInfo };
      localStorage.setItem(storageKey, JSON.stringify(full));
      setProfileState(full);
    } catch {
      const full: UserProfile = { ...p };
      localStorage.setItem(storageKey, JSON.stringify(full));
      setProfileState(full);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const clearProfile = useCallback(() => {
    if (user?.id) {
      localStorage.removeItem(getProfileStorageKey(user.id));
    }
    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    setProfileState(null);
  }, [user?.id]);

  return (
    <UserContext.Provider value={{ profile, setProfile, clearProfile, isLoading, profileReady }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
