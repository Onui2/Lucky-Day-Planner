export type ReportTier = "basic" | "detail" | "full";
export type ProductType = "saju_basic" | "saju_detail" | "saju_full";
export interface ProductConfig {
  type: ProductType;
  title: string;
  amount: number;
  description: string;
}

export const REPORT_PRODUCTS: ProductConfig[] = [
  { type: "saju_basic", title: "사주 기본 리포트", amount: 4900, description: "사주 핵심·성향·오행 요약" },
  { type: "saju_detail", title: "사주 상세 리포트", amount: 9900, description: "기본 분석 + 직업·재물·관계·건강·대운 해설" },
  { type: "saju_full", title: "사주 종합 리포트", amount: 19900, description: "상세 분석 + 어린 시절부터 현재까지의 흐름·향후 연도별 분석" },
];

// Legacy products remain downloadable, but cannot create new orders.
export function getProductConfig(type: string): ProductConfig | null {
  return REPORT_PRODUCTS.find((product) => product.type === type) ?? null;
}

export function getReportTier(type: string): ReportTier | undefined {
  if (type === "saju_basic") return "basic";
  if (type === "saju_detail") return "detail";
  if (type === "saju_full") return "full";
  return undefined;
}
