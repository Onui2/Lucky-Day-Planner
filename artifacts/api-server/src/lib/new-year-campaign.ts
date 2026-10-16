import type { SajuBirthInput } from "./saju-result.js";
import { resolveBirthInput } from "./birth-resolution.js";
import { getYearFortune } from "./year-fortune.js";

export const NEW_YEAR_CAMPAIGN = {
  id: "new-year-2027", targetYear: 2027, productType: "saju_detail",
  title: "2027 종합 신년운세", amount: 9900,
  scope: ["성향", "관계", "직업", "재물", "2027 연간 흐름", "양력 1~12월 요약"],
  monthBasis: "월별 표시는 양력 2027년 1~12월이며, 각 월 15일의 절기 월주를 대표값으로 사용합니다. 점수에는 2027년 연간 가중치가 포함되므로 월 전체·날짜별·절기 경계 전후를 나누어 분석한 결과가 아닙니다. 연간 세운은 입춘 기준으로 읽으며, 입춘 전 시기는 전년도 흐름도 함께 확인해야 합니다.",
  sampleStatus: "unverified" as "unverified" | "verified",
  samplePath: null as string | null,
  samplePages: ["핵심 요약·목차", "월별 요약표", "분야별 상세 해석"],
};

// Change sampleStatus/path only after an approved, anonymized sample is rendered
// with the production renderer and its three pages have been visually reviewed.
export function getNewYearCampaign() {
  return {
    ...NEW_YEAR_CAMPAIGN,
    salesEnabled: process.env.REPORT_SALES_ENABLED === "true"
      && process.env.REPORT_2027_SALES_ENABLED === "true"
      && NEW_YEAR_CAMPAIGN.sampleStatus === "verified"
      && Boolean(NEW_YEAR_CAMPAIGN.samplePath),
  };
}

export function buildNewYearAnalysis(input: SajuBirthInput) {
  const basis = resolveBirthInput(input);
  const { year, month, day, hour, minute } = basis.adjusted;
  if (hour < 0) throw new Error("2027 유료 분석의 출생시간 미입력 처리는 아직 검수되지 않았습니다.");
  // Existing calculation engine only. No invented predictions or sample data.
  return {
    ...getYearFortune(year, month, day, hour, NEW_YEAR_CAMPAIGN.targetYear, basis.dayPillarDate, minute),
    monthBasis: NEW_YEAR_CAMPAIGN.monthBasis,
    engine: "year-fortune-v1",
  };
}
