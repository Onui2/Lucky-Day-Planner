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
import { generateSajuReportPdf } from "../lib/report-generator.js";
import { buildSajuResult } from "../lib/saju-result.js";
import { hasReportAccess } from "../lib/report-access.js";
import { birthOptionsFromRecord } from "../lib/birth-resolution.js";
import { REPORT_PRODUCTS, getReportTier } from "../lib/product-config.js";
import { buildSajuHistory } from "../lib/saju-history.js";
import { createTossPayCheckout, confirmTossPayPayment, getTossPayConfig } from "../lib/toss-pay.js";
import { getSeoulDateString } from "../lib/daeun-date.js";

const router = Router();

function trialClaim(userId: string) {
  return and(eq(ordersTable.userId, userId), sql`${ordersTable.metadata}->>'freeTrial' = 'true'`);
}

router.get("/commerce/products", async (req, res) => {
  let freeTrialAvailable: boolean | null = null;
  if (req.isAuthenticated()) {
    if (!(await requireDatabase(res))) return;
    try {
      const used = await db.select({ id: ordersTable.id }).from(ordersTable).where(trialClaim(req.user.id)).limit(1);
      freeTrialAvailable = used.length === 0;
    } catch {
      res.status(503).json({ error: "무료 체험 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요." });
      return;
    }
  }
  res.json({ products: REPORT_PRODUCTS, checkoutMode: getCheckoutMode(), salesEnabled: process.env.REPORT_SALES_ENABLED === "true", freeTrialAvailable });
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

  const hasAdminFreeAccess = isPrivilegedRole(req.user.role);
  let hasFreeTrial = false;
  if (!hasAdminFreeAccess && product.type === "saju_basic") {
    try {
      const used = await db.select({ id: ordersTable.id }).from(ordersTable).where(trialClaim(req.user.id)).limit(1);
      hasFreeTrial = used.length === 0;
    } catch {
      res.status(503).json({ error: "무료 체험 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요." });
      return;
    }
  }
  const expectedAmount = body.expectedAmount;
  if (expectedAmount !== undefined && (!Number.isSafeInteger(expectedAmount) || Number(expectedAmount) < 0)) {
    res.status(400).json({ error: "결제 예정 금액이 유효하지 않습니다." });
    return;
  }
  if ((body.expectFreeTrial === true && !hasFreeTrial)
    || (expectedAmount !== undefined && expectedAmount !== (hasAdminFreeAccess || hasFreeTrial ? 0 : product.amount))) {
    res.status(409).json({ error: "무료 체험 또는 가격 정보가 변경되었습니다. 상품을 다시 확인해주세요." });
    return;
  }
  if (!hasAdminFreeAccess && !hasFreeTrial && process.env.REPORT_SALES_ENABLED !== "true") {
    res.status(503).json({ error: "리포트 판매를 준비 중입니다. 샘플을 먼저 확인해주세요." });
    return;
  }

  if (!hasAdminFreeAccess && !hasFreeTrial && getCheckoutMode() === "disabled") {
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
      ...(product.type === "saju_full" ? { historyAnalysis: buildSajuHistory(birthInput) } : {}),
    };
    const orderId = createMerchantOrderId();
    const title =
      label ??
      `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${product.title}`;

    // Free trial is claimed atomically per account; regeneration reuses this order.
    if (hasAdminFreeAccess || hasFreeTrial) {
      const generated = await generateSajuReportPdf(
        title,
        sajuResult as Record<string, any>,
        getReportTier(product.type),
      ).catch((error: unknown) => {
        console.error("admin report generation error:", error);
        return null;
      });

      const payload = await db.transaction(async (tx) => {
        if (hasFreeTrial) {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`report-trial:${req.user.id}`}, 0))`);
          const used = await tx.select({ id: ordersTable.id }).from(ordersTable).where(trialClaim(req.user.id)).limit(1);
          if (used.length) throw new Error("무료 체험은 이미 발급되었습니다. 마이페이지에서 리포트를 확인해주세요.");
        }
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
              productTitle: product.title,
              productDescription: product.description,
              adminFreeAccess: hasAdminFreeAccess,
              freeTrial: hasFreeTrial,
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
            status: generated ? "ready" : "failed",
            previewText: generated?.previewText,
            htmlContent: generated?.htmlContent,
            fileName: generated?.fileName,
            fileDataBase64: generated?.fileDataBase64,
            failedReason: generated
              ? null
              : "무료 리포트 생성에 실패했습니다. 마이페이지에서 같은 주문을 재생성해주세요.",
            generatedAt: generated ? new Date() : null,
          })
          .returning();

        await tx.insert(paymentsTable).values({
          orderId: order.id,
          provider: hasFreeTrial ? "trial" : "admin",
          paymentKey: `${hasFreeTrial ? "trial" : "admin"}_${order.orderId}`,
          method: hasFreeTrial ? "FREE_TRIAL" : "ADMIN_GRANT",
          status: "paid",
          amount: 0,
          rawResponse: {
            adminFreeAccess: hasAdminFreeAccess,
            freeTrial: hasFreeTrial,
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

      res.json({
        product,
        checkoutMode: hasFreeTrial ? "trial" : "admin",
        order: { id: payload.order.id, orderId: payload.order.orderId, status: "paid", amount: 0, currency: "KRW" },
        report: {
          id: payload.report.id,
          status: payload.report.status,
          title: payload.report.title,
          fileName: payload.report.fileName,
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
            productTitle: product.title,
            productDescription: product.description,
            checkoutProvider: getCheckoutMode() === "toss_pay" ? "toss_pay" : getCheckoutMode() === "dev" ? "dev" : "toss",
            ...(getCheckoutMode() === "toss_pay" ? { tossPayMode: getTossPayConfig()!.mode } : {}),
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
    if (error instanceof Error && error.message.startsWith("무료 체험은 이미")) {
      res.status(409).json({ error: error.message });
      return;
    }
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
        report: row.report,
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
        })
        .onConflictDoNothing({
          target: [
            purchaseEntitlementsTable.orderId,
            purchaseEntitlementsTable.productType,
          ],
        });

      return updatedOrder;
    });

    let report = row.report;
    try {
      const generated = await generateSajuReportPdf(
        row.report.title,
        row.snapshot.sajuResult as Record<string, any>,
        getReportTier(row.report.productType),
      );
      const [updated] = await db
        .update(pdfReportsTable)
        .set({
          status: "ready",
          previewText: generated.previewText,
          htmlContent: generated.htmlContent,
          fileName: generated.fileName,
          fileDataBase64: generated.fileDataBase64,
          failedReason: null,
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(pdfReportsTable.id, row.report.id),
          eq(pdfReportsTable.userId, req.user.id),
          eq(pdfReportsTable.status, "pending"),
        ))
        .returning();
      if (updated) report = updated;
    } catch (error) {
      console.error("report generation error:", error);
      try {
        const [failed] = await db
          .update(pdfReportsTable)
          .set({
            status: "failed",
            failedReason: "PDF 생성에 실패했습니다. 다시 시도해주세요.",
            updatedAt: new Date(),
          })
          .where(and(
            eq(pdfReportsTable.id, row.report.id),
            eq(pdfReportsTable.userId, req.user.id),
            eq(pdfReportsTable.status, "pending"),
          ))
          .returning();
        if (failed) report = failed;
      } catch (updateError) {
        console.error("report failure status update error:", updateError);
        // The paid order and entitlement are durable; regeneration can retry.
      }
    }

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

export default router;
