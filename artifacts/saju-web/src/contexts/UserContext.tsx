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

async function fetchDayMaster(p: UserProfile): Promise<{ element: string; stem: string; branch: string }> {
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
    element: data.dayMasterElement ?? data.dayPillar?.heavenlyStemElement ?? "목",
    stem: data.dayPillar?.heavenlyStem ?? "",
    branch: data.dayPillar?.earthlyBranch ?? "",
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
          // 기존 프로필에 dayMasterBranch가 없으면 자동 보완
          if (parsed.dayMasterStem && !parsed.dayMasterBranch) {
            try {
              const dm = await fetchDayMaster(parsed);
              const migrated = { ...parsed, dayMasterElement: dm.element, dayMasterStem: dm.stem, dayMasterBranch: dm.branch };
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
      const dm = await fetchDayMaster(p);
      const full: UserProfile = { ...p, dayMasterElement: dm.element, dayMasterStem: dm.stem, dayMasterBranch: dm.branch };
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

// 오행 상생상극 관계 분석
const GENERATES: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<string, string>  = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

export type RelationType = "인성" | "비겁" | "식상" | "재성" | "관살";

export interface ElementRelation {
  type: RelationType;
  label: string;
  fortune: string;
  colorClass: string;
  borderClass: string;
  emoji: string;
}

export function getElementRelation(myElem: string, dayElem: string): ElementRelation {
  if (!myElem || !dayElem) return { type: "비겁", label: "비겁", fortune: "정보 없음", colorClass: "text-muted-foreground", borderClass: "border-muted", emoji: "○" };
  if (GENERATES[dayElem] === myElem)  return { type: "인성", label: "인성 (생조)", fortune: "나를 돕는 기운의 날. 학습·계획·새 시작에 유리합니다.", colorClass: "text-emerald-400", borderClass: "border-emerald-500/60", emoji: "★" };
  if (dayElem === myElem)             return { type: "비겁", label: "비겁 (비화)", fortune: "같은 기운끼리 경쟁. 독립적으로 움직이세요.", colorClass: "text-yellow-400", borderClass: "border-yellow-500/40", emoji: "◈" };
  if (GENERATES[myElem] === dayElem)  return { type: "식상", label: "식상 (설기)", fortune: "에너지가 밖으로 흐르는 날. 창작·표현·소통에 집중하세요.", colorClass: "text-blue-400", borderClass: "border-blue-500/40", emoji: "◎" };
  if (CONTROLS[myElem] === dayElem)   return { type: "재성", label: "재성 (극일)", fortune: "내가 통제하는 기운. 재물·성과를 노릴 수 있습니다.", colorClass: "text-amber-400", borderClass: "border-amber-500/40", emoji: "◆" };
  if (CONTROLS[dayElem] === myElem)   return { type: "관살", label: "관살 (극아)", fortune: "압박과 도전의 날. 신중하게 행동하고 과욕을 피하세요.", colorClass: "text-rose-400", borderClass: "border-rose-500/60", emoji: "▲" };
  return { type: "비겁", label: "비겁", fortune: "보통의 날입니다.", colorClass: "text-muted-foreground", borderClass: "border-muted", emoji: "○" };
}
