import { Router } from "express";
import { campaignVisitsTable, db } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireDatabase } from "../lib/database-guard.js";
import { isPrivilegedRole } from "../lib/date-access.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import { applyCampaignCosts, parseCampaignVisit, summarizeRefundVerification } from "../lib/campaign-metrics.js";

const router = Router();
router.post("/campaign/events", createRateLimiter({ name: "campaign-events", windowMs: 60_000, max: 30, methods: ["POST"] }), async (req, res) => {
  if (process.env.CAMPAIGN_ANALYTICS_ENABLED !== "true") {
    res.status(503).json({ error: "콘텐츠 측정은 아직 활성화되지 않았습니다." }); return;
  }
  if (isPrivilegedRole(req.user?.role)) { res.sendStatus(204); return; }
  const visit = parseCampaignVisit(req.body);
  const event = req.body?.event;
  if (!visit || !["visit", "input_complete", "free_result"].includes(event)) {
    res.status(400).json({ error: "유효한 콘텐츠 측정 이벤트가 필요합니다." }); return;
  }
  if (!(await requireDatabase(res))) return;
  try {
    const stamp = new Date();
    const stages = event === "input_complete" ? { inputAt: stamp }
      : event === "free_result" ? { inputAt: stamp, freeResultAt: stamp } : {};
    const rows = await db.insert(campaignVisitsTable).values({
      ...visit, campaignId: "new-year-2027", ...stages,
    }).onConflictDoUpdate({
      target: campaignVisitsTable.visitId,
      set: event === "input_complete" ? { inputAt: sql`coalesce(${campaignVisitsTable.inputAt}, now())` }
        : event === "free_result" ? {
          inputAt: sql`coalesce(${campaignVisitsTable.inputAt}, now())`,
          freeResultAt: sql`coalesce(${campaignVisitsTable.freeResultAt}, now())`,
        } : { visitId: visit.visitId },
      setWhere: and(eq(campaignVisitsTable.campaignId, "new-year-2027"),
        eq(campaignVisitsTable.source, visit.source), eq(campaignVisitsTable.creative, visit.creative)),
    }).returning({ id: campaignVisitsTable.visitId });
    if (!rows.length) { res.status(409).json({ error: "유입 정보가 기존 방문과 다릅니다." }); return; }
    res.sendStatus(204);
  } catch (error) {
    console.error("campaign measurement unavailable", error instanceof Error ? error.name : "unknown");
    res.status(503).json({ error: "콘텐츠 측정 저장소를 사용할 수 없습니다." });
  }
});

// Read-only cohort report. Costs are explicit invoice inputs, never assumed zero.
router.post("/admin/campaigns/new-year-2027/metrics", async (req, res) => {
  if (!req.isAuthenticated()) { res.sendStatus(401); return; }
  if (!isPrivilegedRole(req.user.role)) { res.sendStatus(403); return; }
  if (process.env.CAMPAIGN_ANALYTICS_ENABLED !== "true") { res.status(503).json({ error: "콘텐츠 측정이 비활성화되어 있습니다." }); return; }
  const { from, to, costsByContent = {} } = req.body ?? {};
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const start = new Date(String(from) + "T00:00:00+09:00");
  const end = new Date(String(to) + "T00:00:00+09:00");
  if (!datePattern.test(String(from)) || !datePattern.test(String(to))
    || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())
    || new Date(start.getTime() + 32_400_000).toISOString().slice(0, 10) !== from
    || new Date(end.getTime() + 32_400_000).toISOString().slice(0, 10) !== to
    || end <= start || end.getTime() - start.getTime() > 93 * 86_400_000
    || !costsByContent || typeof costsByContent !== "object" || Array.isArray(costsByContent)) {
    res.status(400).json({ error: "최대 93일의 한국시간 방문 기간을 입력해주세요. 종료일은 미포함입니다." }); return;
  }
  if (!(await requireDatabase(res))) return;
  try {
    const data = await db.execute(sql`
      WITH cohort AS (
        SELECT * FROM campaign_visits
        WHERE campaign_id = 'new-year-2027' AND created_at >= ${start} AND created_at < ${end}
      ), measured_orders AS (
        SELECT o.id, o.metadata->>'campaignVisitId' AS visit_id,
          p.approved_at, p.amount, p.status AS payment_status, o.status AS order_status,
          EXISTS (SELECT 1 FROM pdf_reports r WHERE r.order_id = o.id AND r.status = 'ready') AS ready,
          o.metadata->>'firstDeliveredAt' AS delivered_at,
          o.metadata->'refundSync'->>'outcome' AS refund_outcome,
          CASE WHEN o.metadata->'refundSync'->>'checkedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
            THEN (o.metadata->'refundSync'->>'checkedAt')::timestamptz END AS refund_checked_at,
          CASE WHEN o.metadata->'refundSync'->>'refundedAmount' ~ '^[0-9]{1,12}$'
            THEN (o.metadata->'refundSync'->>'refundedAmount')::bigint END AS refund_synced_amount
        FROM orders o LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.product_type = 'saju_detail' AND o.metadata->>'reportEdition' = 'new-year-2027'
          AND o.amount > 0 AND o.metadata->>'paymentEnvironment' = 'live'
          AND (p.provider IS NULL OR p.provider IN ('toss', 'toss_pay'))
      )
      SELECT c.source, c.creative, count(DISTINCT c.visit_id)::int AS visits,
        count(DISTINCT c.visit_id) FILTER (WHERE c.input_at IS NOT NULL)::int AS input_complete,
        count(DISTINCT c.visit_id) FILTER (WHERE c.free_result_at IS NOT NULL)::int AS free_result,
        count(DISTINCT o.id)::int AS checkout,
        count(DISTINCT o.id) FILTER (WHERE o.approved_at IS NOT NULL)::int AS approved,
        count(DISTINCT o.id) FILTER (WHERE o.approved_at IS NOT NULL AND o.ready)::int AS ready,
        count(DISTINCT o.id) FILTER (WHERE o.approved_at IS NOT NULL AND o.delivered_at IS NOT NULL)::int AS provided,
        count(DISTINCT o.id) FILTER (WHERE o.order_status IN ('refunded','partially_refunded') OR o.payment_status IN ('refunded','partially_refunded','canceled'))::int AS refund_status_orders,
        count(DISTINCT o.id) FILTER (WHERE o.approved_at IS NOT NULL AND o.refund_checked_at IS NOT NULL
          AND o.refund_outcome IN ('not_refunded','partial_refund','full_refund'))::int AS refund_checked,
        count(DISTINCT o.id) FILTER (WHERE o.approved_at IS NOT NULL AND o.order_status = 'refunded')::int AS refunded_orders,
        count(DISTINCT o.id) FILTER (WHERE o.approved_at IS NOT NULL AND o.order_status = 'paid' AND o.payment_status = 'partially_refunded')::int AS partially_refunded_orders,
        coalesce(sum(o.refund_synced_amount) FILTER (WHERE o.approved_at IS NOT NULL
          AND o.refund_outcome IN ('partial_refund','full_refund')),0)::bigint AS refund_synced_krw,
        min(o.refund_checked_at) FILTER (WHERE o.approved_at IS NOT NULL
          AND o.refund_outcome IN ('not_refunded','partial_refund','full_refund')) AS oldest_refund_check_at,
        coalesce(sum(o.amount) FILTER (WHERE o.approved_at IS NOT NULL),0)::bigint AS gross_krw
      FROM cohort c LEFT JOIN measured_orders o ON o.visit_id = c.visit_id::text
      GROUP BY c.source, c.creative ORDER BY c.source, c.creative
    `);
    const rows = data.rows.map((row: Record<string, unknown>) => {
      const grossKrw = Number(row.gross_krw);
      const key = String(row.source) + ":" + String(row.creative);
      return { ...row, key, grossKrw,
        ...applyCampaignCosts(grossKrw, Number(row.visits), costsByContent[key]) };
    });
    const refund = summarizeRefundVerification(data.rows as Array<Record<string, unknown>>);
    // Refund status comes only from the admin Toss re-sync; there is no provider webhook.
    const refundNote = refund.refundStatusVerified
      ? refund.approvedOrders === 0
        ? "승인 주문이 없어 확인할 환불 상태가 없습니다."
        : `승인 주문 ${refund.approvedOrders}건 모두 토스페이 환불 상태를 재조회했습니다(가장 오래된 조회 ${refund.oldestRefundCheckAt}). 조회 이후의 환불은 반영되지 않습니다.`
      : `승인 주문 ${refund.approvedOrders}건 중 ${refund.uncheckedApprovedOrders}건은 환불 상태를 재조회하지 않았거나 결과가 불확실해 환불 상태는 미확인입니다.`;
    res.json({ from, to, rows, refundStatusVerified: refund.refundStatusVerified, refundVerification: refund,
      note: `방문일 기준 코호트입니다. 구매·제공은 서버 기록, 초기 단계는 브라우저 기록입니다. ${refundNote} 집계된 환불액은 재조회로 확인된 금액이며 비용 입력의 실제 환불액을 대체하지 않습니다. 같은 코호트의 실제 환불액과 모든 비용을 입력해야 손익이 계산됩니다. 관리자·무료·개발·테스트·결제 환경 미확인 주문은 매출에서 제외합니다.` });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error && error.message.startsWith("비용")
      ? error.message : "측정 저장소와 입력한 비용·기간을 확인해주세요." });
  }
});
export default router;
