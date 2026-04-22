import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface UserProfile {
  name?: string;
  gender: "male" | "female";
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
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

const STORAGE_KEY = "myunghae_user_profile";

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
      birthMinute: 0,
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
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: UserProfile = JSON.parse(raw);
          if (needsPillarMigration(parsed)) {
            try {
              const pillarInfo = await fetchProfilePillars(parsed);
              const migrated = { ...parsed, ...pillarInfo };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
              setProfileState(migrated);
            } catch {
              setProfileState(parsed);
            }
          } else {
            setProfileState(parsed);
          }
        }
      } catch {}
      setProfileReady(true);
    })();
  }, []);

  const setProfile = useCallback(async (p: UserProfile) => {
    setIsLoading(true);
    try {
      const pillarInfo = await fetchProfilePillars(p);
      const full: UserProfile = { ...p, ...pillarInfo };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
      setProfileState(full);
    } catch {
      const full: UserProfile = { ...p };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
      setProfileState(full);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfileState(null);
  }, []);

  return (
    <UserContext.Provider value={{ profile, setProfile, clearProfile, isLoading, profileReady }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
