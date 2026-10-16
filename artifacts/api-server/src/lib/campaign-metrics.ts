export const CAMPAIGN_SOURCES = ["instagram", "youtube", "direct"] as const;
export const CAMPAIGN_CREATIVES = ["input-demo", "monthly-table", "free-vs-paid", "direct"] as const;
export const COST_FIELDS = ["refundsKrw", "pgKrw", "freeAnalysisKrw", "paidGenerationKrw", "retriesKrw", "adKrw", "contentKrw", "otherKrw"] as const;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCampaignVisit(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some((key) => !["visitId", "source", "creative", "event"].includes(key))) return null;
  if (typeof item.visitId !== "string" || !UUID_PATTERN.test(item.visitId)
    || !CAMPAIGN_SOURCES.includes(item.source as any)
    || !CAMPAIGN_CREATIVES.includes(item.creative as any)) return null;
  return { visitId: item.visitId, source: String(item.source), creative: String(item.creative) };
}

export function applyCampaignCosts(grossKrw: number, visitors: number, value: unknown) {
  const costs = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const missing = COST_FIELDS.filter((field) => costs[field] === undefined || costs[field] === null);
  for (const field of COST_FIELDS) {
    const amount = costs[field];
    if (amount !== undefined && amount !== null
      && (!Number.isSafeInteger(amount) || Number(amount) < 0 || Number(amount) > 1_000_000_000_000)) {
      throw new Error("비용은 확인된 0 이상의 원 단위 정수로 입력해주세요: " + field);
    }
  }
  if (Number(costs.refundsKrw ?? 0) > grossKrw) throw new Error("같은 방문 코호트의 환불액이 승인 매출을 초과했습니다.");
  const contributionKrw = missing.length ? null
    : grossKrw - COST_FIELDS.reduce((sum, field) => sum + Number(costs[field]), 0);
  return { costs, missingCosts: missing, contributionKrw,
    perVisitorKrw: contributionKrw === null || visitors === 0 ? null : contributionKrw / visitors };
}
