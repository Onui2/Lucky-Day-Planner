import { Router, type Request, type Response } from "express";
import {
  analysisSnapshotsTable,
  db,
  ordersTable,
  paymentsTable,
  pdfReportsTable,
  purchaseEntitlementsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireDatabase } from "../lib/database-guard.js";
import {
  confirmPaymentWithProvider,
  createMerchantOrderId,
  getCheckoutMode,
  getProductConfig,
  parseBirthInfo,
  recoverPaymentByOrderId,
} from "../lib/commerce.js";
import { isPrivilegedRole } from "../lib/date-access.js";
import { buildSajuResult } from "../lib/saju-result.js";
import { hasReportAccess } from "../lib/report-access.js";
import { birthOptionsFromRecord } from "../lib/birth-resolution.js";
import { REPORT_PRODUCTS } from "../lib/product-config.js";
import { buildSajuHistory } from "../lib/saju-history.js";
import { checkTossPayRefundStatus, createTossPayCheckout, confirmTossPayPayment, getTossPayConfig } from "../lib/toss-pay.js";
import { getSeoulDateString } from "../lib/daeun-date.js";

import { buildNewYearAnalysis, getNewYearCampaign, NEW_YEAR_CAMPAIGN } from "../lib/new-year-campaign.js";
import { campaignVisitsTable } from "@workspace/db";
import { UUID_PATTERN } from "../lib/campaign-metrics.js";

import { renderStoredReport } from "../lib/report-rendering.js";

const router = Router();
type CommerceTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

router.get("/commerce/products", (_req, res) => {
  res.json({
    campaign: { ...getNewYearCampaign(), analyticsEnabled: process.env.CAMPAIGN_ANALYTICS_ENABLED === "true" },
    products: REPORT_PRODUCTS,
    checkoutMode: getCheckoutMode(),
    salesEnabled: process.env.REPORT_SALES_ENABLED === "true",
    // Keep the field for older clients, but fail closed: public report trials are disabled.
    freeTrialAvailable: false,
  });
});

function requireAuth(req: Request, res: Response): req is Request & { user: Express.User } {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }

  return true;
}

router.get("/commerce/orders", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  try {
    const rows = await db
      .select({
        id: ordersTable.id,
        orderId: ordersTable.orderId,
        productType: ordersTable.productType,
        status: ordersTable.status,
        amount: ordersTable.amount,
        currency: ordersTable.currency,
        createdAt: ordersTable.createdAt,
        reportId: pdfReportsTable.id,
        reportStatus: pdfReportsTable.status,
        reportTitle: pdfReportsTable.title,
      })
      .from(ordersTable)
      .leftJoin(pdfReportsTable, eq(pdfReportsTable.orderId, ordersTable.id))
      .where(eq(ordersTable.userId, req.user.id))
      .orderBy(desc(ordersTable.createdAt));

    res.json({ orders: rows, checkoutMode: getCheckoutMode() });
  } catch (error) {
    console.error("commerce order list error:", error);
    res.status(500).json({ error: "주문 내역을 불러오지 못했습니다." });
  }
});

router.post("/commerce/orders", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const body = req.body as Record<string, unknown>;
  const product = getProductConfig(String(body.productType ?? ""));
  const birthInfo = parseBirthInfo(body.birthInfo);
  const reportFocus = body.reportFocus ?? "career";
  if (typeof reportFocus !== "string" || !["career", "money", "relationship"].includes(reportFocus)) {
    res.status(400).json({ error: "유효한 고민 주제를 선택해주세요." });
    return;
  }
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 120)
      : null;

  if (!product) {
    res.status(400).json({ error: "지원하지 않는 상품입니다." });
    return;
  }

  if (!birthInfo) {
    res.status(400).json({ error: "유효한 birthInfo가 필요합니다." });
    return;
  }

  const isNewYear = body.reportEdition === NEW_YEAR_CAMPAIGN.id;
  if (body.reportEdition !== undefined && !isNewYear) {
    res.status(400).json({ error: "지원하지 않는 리포트 버전입니다." }); return;
  }
  if (isNewYear && (product.type !== NEW_YEAR_CAMPAIGN.productType || product.amount !== NEW_YEAR_CAMPAIGN.amount)) {
    res.status(400).json({ error: "2027 신년운세는 9,900원 상세 상품으로만 발급합니다." }); return;
  }
  if (isNewYear && birthInfo.hour < 0) {
    res.status(400).json({ error: "2027 유료 리포트는 출생시간을 입력해야 합니다. 시간 미확인 상태에서는 무료 요약을 이용해주세요." }); return;
  }
  // No public sale until actual sample and provision have been reviewed.
  if (isNewYear && !isPrivilegedRole(req.user.role) && !getNewYearCampaign().salesEnabled) {
    res.status(503).json({ error: "2027 신년운세는 실제 샘플을 검수 중입니다. 무료 요약을 먼저 확인해주세요." }); return;
  }
  let campaignVisitId: string | null = null;
  if (isNewYear && process.env.CAMPAIGN_ANALYTICS_ENABLED === "true"
    && typeof body.campaignVisitId === "string" && UUID_PATTERN.test(body.campaignVisitId)) {
    try {
      const [visit] = await db.select({ id: campaignVisitsTable.visitId }).from(campaignVisitsTable).where(and(
        eq(campaignVisitsTable.visitId, body.campaignVisitId), eq(campaignVisitsTable.campaignId, NEW_YEAR_CAMPAIGN.id),
        sql`${campaignVisitsTable.createdAt} >= now() - interval '7 days'`,
      )).limit(1);
      campaignVisitId = visit?.id ?? null;
    } catch { /* Tracking failure must not prevent a valid order. */ }
  }
  const hasAdminFreeAccess = isPrivilegedRole(req.user.role);
  const expectedAmount = body.expectedAmount;
  if (expectedAmount !== undefined && (!Number.isSafeInteger(expectedAmount) || Number(expectedAmount) < 0)) {
    res.status(400).json({ error: "결제 예정 금액이 유효하지 않습니다." });
    return;
  }
  if (body.expectFreeTrial === true) {
    res.status(409).json({ error: "무료 리포트 체험이 종료되었습니다. 상품 가격을 다시 확인해주세요.", code: "FREE_TRIAL_CLOSED" });
    return;
  }
  if (expectedAmount !== undefined && expectedAmount !== (hasAdminFreeAccess ? 0 : product.amount)) {
    res.status(409).json({ error: "가격 정보가 변경되었습니다. 상품을 다시 확인해주세요." });
    return;
  }
  if (!hasAdminFreeAccess && process.env.REPORT_SALES_ENABLED !== "true") {
    res.status(503).json({ error: "리포트 판매를 준비 중입니다. 샘플을 먼저 확인해주세요." });
    return;
  }

  if (!hasAdminFreeAccess && getCheckoutMode() === "disabled") {
    res.status(503).json({ error: "결제 설정이 준비되지 않았습니다." });
    return;
  }

  try {
    const birthInput = {
      birthYear: birthInfo.year,
      birthMonth: birthInfo.month,
      birthDay: birthInfo.day,
      birthHour: birthInfo.hour,
      birthMinute: birthInfo.minute ?? 0,
      gender: birthInfo.gender,
      calendarType: birthInfo.calendarType,
      ...birthOptionsFromRecord({ ...birthInfo }),
    };
    const sajuResult = {
      ...buildSajuResult(birthInput),
      reportFocus,
      reportAsOfDate: getSeoulDateString(),
      ...(isNewYear ? { reportEdition: NEW_YEAR_CAMPAIGN.id, newYearAnalysis: buildNewYearAnalysis(birthInput) } : {}),
      ...(product.type === "saju_full" ? { historyAnalysis: buildSajuHistory(birthInput) } : {}),
    };
    const orderId = createMerchantOrderId();
    const title =
      label ??
      `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${isNewYear ? NEW_YEAR_CAMPAIGN.title : product.title}`;

    if (hasAdminFreeAccess) {
      const payload = await db.transaction(async (tx) => {
        const [snapshot] = await tx
          .insert(analysisSnapshotsTable)
          .values({ userId: req.user.id, kind: "saju", title, birthInfo, sajuResult })
          .returning();
        const [order] = await tx
          .insert(ordersTable)
          .values({
            orderId,
            userId: req.user.id,
            productType: product.type,
            status: "paid",
            currency: "KRW",
            amount: 0,
            snapshotId: snapshot.id,
            metadata: {
              productTitle: isNewYear ? NEW_YEAR_CAMPAIGN.title : product.title,
              ...(isNewYear ? { reportEdition: NEW_YEAR_CAMPAIGN.id, campaignVisitId } : {}),
              productDescription: product.description,
              adminFreeAccess: true,
              grantedByRole: req.user.role ?? "user",
            },
          })
          .returning();
        const [report] = await tx
          .insert(pdfReportsTable)
          .values({
            userId: req.user.id,
            orderId: order.id,
            snapshotId: snapshot.id,
            productType: product.type,
            title,
            status: "pending",
          })
          .returning();

        await tx.insert(paymentsTable).values({
          orderId: order.id,
          provider: "admin",
          paymentKey: `admin_${order.orderId}`,
          method: "ADMIN_GRANT",
          status: "paid",
          amount: 0,
          rawResponse: {
            adminFreeAccess: true,
            role: req.user.role ?? "admin",
          },
          approvedAt: new Date(),
        });

        await tx.insert(purchaseEntitlementsTable).values({
          userId: req.user.id,
          orderId: order.id,
          productType: order.productType,
          resourceType: "pdf_report",
          resourceId: report.id,
          status: "active",
        });

        return { order, report, snapshot, sajuResult };
      });
      const report = await renderStoredReport(payload.report, payload.sajuResult as Record<string, any>);

      res.json({
        product,
        checkoutMode: "admin",
        order: { id: payload.order.id, orderId: payload.order.orderId, status: "paid", amount: 0, currency: "KRW" },
        report: {
          id: report.id,
          status: report.status,
          title: report.title,
          fileName: report.fileName,
        },
      });
      return;
    }

    const payload = await db.transaction(async (tx) => {
      const [snapshot] = await tx
        .insert(analysisSnapshotsTable)
        .values({
          userId: req.user.id,
          kind: "saju",
          title,
          birthInfo,
          sajuResult,
        })
        .returning();

      const [order] = await tx
        .insert(ordersTable)
        .values({
          orderId,
          userId: req.user.id,
          productType: product.type,
          status: "pending",
          currency: "KRW",
          amount: product.amount,
          snapshotId: snapshot.id,
          metadata: {
            productTitle: isNewYear ? NEW_YEAR_CAMPAIGN.title : product.title,
              ...(isNewYear ? { reportEdition: NEW_YEAR_CAMPAIGN.id, campaignVisitId } : {}),
            productDescription: product.description,
            checkoutProvider: getCheckoutMode() === "toss_pay" ? "toss_pay" : getCheckoutMode() === "dev" ? "dev" : "toss",
            ...(getCheckoutMode() === "toss_pay" ? { tossPayMode: getTossPayConfig()!.mode } : {}),
            paymentEnvironment: getCheckoutMode() === "toss_pay"
              ? (getTossPayConfig()?.mode === "LIVE" ? "live" : "test")
              : getCheckoutMode() === "provider" && process.env.TOSS_SECRET_KEY?.startsWith("live_") ? "live" : "test",
          },
        })
        .returning();

      const [report] = await tx
        .insert(pdfReportsTable)
        .values({
          userId: req.user.id,
          orderId: order.id,
          snapshotId: snapshot.id,
          productType: product.type,
          title,
          status: "pending",
        })
        .returning();

      return { order, report, snapshot, sajuResult };
    });

    res.json({
      product,
      checkoutMode: getCheckoutMode(),
      order: {
        id: payload.order.id,
        orderId: payload.order.orderId,
        status: payload.order.status,
        amount: payload.order.amount,
        currency: payload.order.currency,
      },
      report: {
        id: payload.report.id,
        status: payload.report.status,
        title: payload.report.title,
      },
    });
    return;
  } catch (error) {
    console.error("commerce order create error:", error);
    res.status(500).json({ error: "주문 생성에 실패했습니다." });
    return;
  }
});

// Create a hosted checkout only for the authenticated owner's stored order.
// The row lock serializes repeated clicks; the provider order number also stays stable.
router.post("/commerce/orders/:orderId/checkout", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;
  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(ordersTable).where(and(
        eq(ordersTable.orderId, String(req.params.orderId)), eq(ordersTable.userId, req.user.id),
      )).for("update");
      if (!order) throw new Error("주문을 찾을 수 없습니다.");
      if (order.status !== "pending" || order.metadata?.checkoutProvider !== "toss_pay") {
        throw new Error("결제를 시작할 수 없는 주문입니다.");
      }
      if (order.metadata.tossPayToken) {
        if (getTossPayConfig()?.mode !== order.metadata.tossPayMode) {
          throw new Error("결제 설정이 변경되었습니다. 새 주문으로 다시 시도해주세요.");
        }
        const url = new URL(String(order.metadata.tossPayCheckoutPage));
        if (url.origin !== "https://pay.toss.im" || url.username || url.password) {
          throw new Error("결제창 주소를 확인하지 못했습니다.");
        }
        return { checkoutPage: url.toString() };
      }
      const checkout = await createTossPayCheckout(order, String(order.metadata.productTitle));
      await tx.update(ordersTable).set({
        metadata: { ...order.metadata, tossPayToken: checkout.payToken, tossPayMode: checkout.mode, tossPayCheckoutPage: checkout.checkoutPage },
        updatedAt: new Date(),
      }).where(eq(ordersTable.id, order.id));
      return { checkoutPage: checkout.checkoutPage };
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "결제창을 준비하지 못했습니다." });
  }
});

router.post("/commerce/payments/confirm", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const body = req.body as Record<string, unknown>;
  const publicOrderId =
    typeof body.orderId === "string" ? body.orderId.trim() : "";
  const paymentKey =
    typeof body.paymentKey === "string" ? body.paymentKey.trim() : undefined;

  if (!publicOrderId) {
    res.status(400).json({ error: "orderId가 필요합니다." });
    return;
  }

  try {
    const [row] = await db
      .select({
        order: ordersTable,
        report: pdfReportsTable,
        snapshot: analysisSnapshotsTable,
      })
      .from(ordersTable)
      .innerJoin(pdfReportsTable, eq(pdfReportsTable.orderId, ordersTable.id))
      .innerJoin(
        analysisSnapshotsTable,
        eq(analysisSnapshotsTable.id, ordersTable.snapshotId),
      )
      .where(
        and(
          eq(ordersTable.userId, req.user.id),
          eq(ordersTable.orderId, publicOrderId),
          eq(pdfReportsTable.userId, req.user.id),
          eq(analysisSnapshotsTable.userId, req.user.id),
        ),
      );

    if (!row) {
      res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      return;
    }

    if (row.order.status === "paid") {
      if (!(await hasReportAccess(req.user.id, row.report))) {
        res.status(403).json({ error: "이 리포트를 이용할 권한이 없습니다." });
        return;
      }
      res.json({
        order: row.order,
        report: await renderStoredReport(row.report, row.snapshot.sajuResult as Record<string, any>),
        alreadyPaid: true,
      });
      return;
    }

    if (row.order.status !== "pending") {
      res.status(409).json({ error: "승인할 수 없는 주문 상태입니다." });
      return;
    }
    const checkoutMode = getCheckoutMode();
    if (checkoutMode === "disabled") {
      res.status(503).json({ error: "결제 설정이 준비되지 않았습니다." });
      return;
    }
    if (checkoutMode === "dev" && row.order.metadata?.checkoutProvider !== "dev") {
      res.status(409).json({ error: "실제 결제 주문은 개발 모드로 승인할 수 없습니다." });
      return;
    }

    const confirmed = row.order.metadata?.checkoutProvider === "toss_pay"
      ? await confirmTossPayPayment(row.order, body.authorize === true)
      : paymentKey || checkoutMode === "dev"
      ? await confirmPaymentWithProvider(row.order, paymentKey)
      : await recoverPaymentByOrderId(row.order);

    // Commit payment and access before PDF work. A renderer crash or serverless
    // timeout can then be retried without losing a completed provider payment.
    const paidOrder = await db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(ordersTable)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(and(
          eq(ordersTable.id, row.order.id),
          eq(ordersTable.userId, req.user.id),
          eq(ordersTable.status, "pending"),
        ))
        .returning();

      // The provider call runs outside this transaction. Never overwrite
      // cancellation or another confirmation that completed meanwhile.
      if (!updatedOrder) {
        throw new Error("주문 상태가 변경되었습니다. 주문 내역을 확인해주세요.");
      }

      await tx
        .insert(paymentsTable)
        .values({
          orderId: row.order.id,
          provider: confirmed.provider,
          paymentKey: confirmed.paymentKey,
          method: confirmed.method,
          status: confirmed.status,
          amount: confirmed.amount,
          rawResponse: confirmed.rawResponse,
          approvedAt: confirmed.approvedAt,
        })
        .onConflictDoUpdate({
          target: paymentsTable.orderId,
          set: {
            provider: confirmed.provider,
            paymentKey: confirmed.paymentKey,
            method: confirmed.method,
            status: confirmed.status,
            amount: confirmed.amount,
            rawResponse: confirmed.rawResponse,
            approvedAt: confirmed.approvedAt,
            updatedAt: new Date(),
          },
        });

      await tx
        .insert(purchaseEntitlementsTable)
        .values({
          userId: req.user.id,
          orderId: row.order.id,
          productType: row.order.productType,
          resourceType: "pdf_report",
          resourceId: row.report.id,
          status: "active",
          // Start at the provider's original approval time; recovery must not
          // extend the disclosed one-year service period. Existing grants stay unchanged.
          expiresAt: new Date(confirmed.approvedAt.getTime() + 365 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing({
          target: [
            purchaseEntitlementsTable.orderId,
            purchaseEntitlementsTable.productType,
          ],
        });

      return updatedOrder;
    });

    // Recovering an old provider payment records the original payment without
    // delivering content after its service period (or after access was revoked).
    if (!(await hasReportAccess(req.user.id, row.report))) {
      res.status(403).json({ error: "리포트 이용 기간이 만료되었거나 이용 권한이 없습니다." });
      return;
    }
    const report = await renderStoredReport(row.report, row.snapshot.sajuResult as Record<string, any>);

    res.json({
      order: paidOrder,
      report,
      payment: {
        provider: confirmed.provider,
        method: confirmed.method,
        approvedAt: confirmed.approvedAt,
      },
    });
  } catch (error) {
    console.error("commerce payment confirm error:", error);
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "결제 승인에 실패했습니다.",
    });
  }
});

// Admin-only refund re-sync for refunds made outside the app (e.g. Toss Pay
// Partners). Reads canonical Toss status; only a consistent full refund revokes
// access. Partial refunds are flagged; pending/unknown states and failures never
// change access. There is no public provider webhook for this flow.
router.post("/admin/commerce/orders/:orderId/refund-sync", async (req, res) => {
  if (!req.isAuthenticated()) { res.sendStatus(401); return; }
  if (!isPrivilegedRole(req.user.role)) { res.sendStatus(403); return; }
  const note = req.body?.note;
  if (note !== undefined && (typeof note !== "string" || note.length > 200)) {
    res.status(400).json({ error: "메모는 200자 이하 문자열이어야 합니다." }); return;
  }
  if (!(await requireDatabase(res))) return;
  const actor = { actorUserId: req.user.id, actorRole: req.user.role ?? "admin", ...(note ? { note: note.trim() } : {}) };
  const publicOrderId = String(req.params.orderId);

  // Revoke any entitlement still active for an order already marked refunded.
  async function revokeActive(tx: CommerceTransaction, orderRowId: number): Promise<number[]> {
    const revoked = await tx.update(purchaseEntitlementsTable).set({ status: "revoked" }).where(and(
      eq(purchaseEntitlementsTable.orderId, orderRowId),
      eq(purchaseEntitlementsTable.status, "active"),
    )).returning();
    return revoked.map((item) => item.id);
  }

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, publicOrderId)).limit(1);
    if (!order) { res.status(404).json({ error: "주문을 찾을 수 없습니다." }); return; }
    if (order.metadata?.checkoutProvider !== "toss_pay") {
      res.status(409).json({ error: "토스페이 직접 결제 주문만 환불 상태를 동기화할 수 있습니다." }); return;
    }
    if (order.status === "refunded") {
      const revokedEntitlementIds = await db.transaction((tx) => revokeActive(tx, order.id));
      res.json({ orderId: order.orderId, outcome: "already_revoked", revoked: false, revokedEntitlementIds });
      return;
    }
    if (order.status !== "paid") {
      res.status(409).json({ error: "결제 완료 주문만 환불 상태를 동기화할 수 있습니다." }); return;
    }

    let check: Awaited<ReturnType<typeof checkTossPayRefundStatus>>;
    try {
      check = await checkTossPayRefundStatus(order);
    } catch {
      // Network, provider or identity failure: never infer a refund.
      console.error("toss refund sync unverified");
      res.status(502).json({ outcome: "unverified", revoked: false, error: "토스페이 환불 상태를 확인하지 못했습니다. 권한은 변경하지 않았습니다." });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(ordersTable).where(eq(ordersTable.id, order.id)).for("update");
      if (!locked) throw new Error("주문을 찾을 수 없습니다.");
      if (locked.status === "refunded") {
        return { outcome: "already_revoked", revoked: false, revokedEntitlementIds: await revokeActive(tx, locked.id) };
      }
      if (locked.status !== "paid") throw new Error("주문 상태가 변경되었습니다. 다시 확인해주세요.");
      const now = new Date().toISOString();
      const previous = (locked.metadata?.refundSync ?? {}) as Record<string, unknown>;
      const refundSync = {
        checkedAt: now, outcome: check.outcome, payStatus: check.payStatus,
        refundedAmount: check.refundedAmount, refundableAmount: check.refundableAmount, ...actor,
        ...(check.outcome === "partial_refund"
          ? { partialRefundFlaggedAt: typeof previous.partialRefundFlaggedAt === "string" ? previous.partialRefundFlaggedAt : now }
          : {}),
      };
      if (check.outcome === "full_refund") {
        const revokedEntitlementIds = await revokeActive(tx, locked.id);
        await tx.update(paymentsTable).set({ status: "refunded", updatedAt: new Date() })
          .where(eq(paymentsTable.orderId, locked.id));
        await tx.update(ordersTable).set({
          status: "refunded",
          metadata: {
            ...locked.metadata, refundSync,
            refundRevocation: {
              revokedAt: now, reason: "toss_pay_full_refund", payStatus: check.payStatus,
              refundedAmount: check.refundedAmount, entitlementIds: revokedEntitlementIds, ...actor,
            },
          },
          updatedAt: new Date(),
        }).where(and(eq(ordersTable.id, locked.id), eq(ordersTable.status, "paid")));
        return { outcome: check.outcome, revoked: true, revokedEntitlementIds };
      }
      if (check.outcome === "partial_refund") {
        await tx.update(paymentsTable).set({ status: "partially_refunded", updatedAt: new Date() })
          .where(eq(paymentsTable.orderId, locked.id));
      }
      await tx.update(ordersTable).set({ metadata: { ...locked.metadata, refundSync }, updatedAt: new Date() })
        .where(eq(ordersTable.id, locked.id));
      return { outcome: check.outcome, revoked: false, revokedEntitlementIds: [] as number[] };
    });

    res.json({
      orderId: order.orderId, ...result,
      payStatus: check.payStatus, refundedAmount: check.refundedAmount,
      requiresManualReview: result.outcome === "partial_refund" || result.outcome === "unknown",
    });
  } catch (error) {
    console.error("toss refund sync error");
    const changed = error instanceof Error && /^주문/.test(error.message);
    res.status(changed ? 409 : 500).json({ error: changed ? (error as Error).message : "환불 상태를 저장하지 못했습니다. 권한은 변경되지 않았을 수 있으니 다시 확인해주세요." });
  }
});

export default router;
