import { customFetch } from "@workspace/api-client-react";
import type { UserProfile } from "@/contexts/UserContext";
import { profileBirthPayload } from "@/lib/birth-precision";

export interface MonthlyFortuneData {
  monthName: string;
  targetYear: number;
  targetMonth: number;
  dayStem: string;
  dayElement: string;
  dayPillar: { stem: string; branch: string };
  seun: {
    stem: string;
    branch: string;
    stemHanja: string;
    branchHanja: string;
    tenGod: string;
    element: string;
    branchElement: string;
  };
  wun: {
    stem: string;
    branch: string;
    stemHanja: string;
    branchHanja: string;
    tenGod: string;
    element: string;
    branchElement: string;
  };
  scores: {
    overall: number;
    wealth: number;
    career: number;
    love: number;
    health: number;
  };
  summary: string;
  wealthText: string;
  careerText: string;
  loveText: string;
  healthText: string;
  hapChungNotes: string[];
  interactions: {
    wunHap: boolean;
    wunChung: boolean;
    stemHap: boolean;
    seunHap: boolean;
    seunChung: boolean;
  };
}

export async function fetchMonthlyFortune(
  profile: UserProfile | null | undefined,
  year: number,
  month: number,
): Promise<MonthlyFortuneData> {
  if (!profile) throw new Error("프로필 없음");

  return customFetch<MonthlyFortuneData>("/api/saju/monthly", {
    method: "POST",
    body: JSON.stringify({
      ...profileBirthPayload(profile),
      targetYear: year,
      targetMonth: month,
    }),
  });
}
