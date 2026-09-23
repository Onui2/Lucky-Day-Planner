import { Router, type Request, type Response } from "express";
import {
  analysisSnapshotsTable,
  db,
  ordersTable,
  paymentsTable,
  pdfReportsTable,
  purchaseEntitlementsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
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

const router = Router();

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

  const hasAdminFreeAccess = product.type === "saju_pdf" || isPrivilegedRole(req.user.role);

  if (!hasAdminFreeAccess && getCheckoutMode() === "disabled") {
    res.status(503).json({ error: "결제 설정이 준비되지 않았습니다." });
    return;
  }

  try {
    const sajuResult = buildSajuResult({
      birthYear: birthInfo.year,
      birthMonth: birthInfo.month,
      birthDay: birthInfo.day,
      birthHour: birthInfo.hour,
      birthMinute: birthInfo.minute ?? 0,
      gender: birthInfo.gender,
      calendarType: birthInfo.calendarType,
    });
    const orderId = createMerchantOrderId();
    const title =
      label ??
      `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${product.title}`;

    // 관리자는 결제 없이 즉시 PDF 생성
    if (hasAdminFreeAccess) {
      const generated = await generateSajuReportPdf(
        title,
        sajuResult as Record<string, any>,
      ).catch((error: unknown) => {
        console.error("admin report generation error:", error);
        return null;
      });

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
              productTitle: product.title,
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
            status: generated ? "ready" : "failed",
            previewText: generated?.previewText,
            htmlContent: generated?.htmlContent,
            fileName: generated?.fileName,
            fileDataBase64: generated?.fileDataBase64,
            failedReason: generated
              ? null
              : "관리자 무료 리포트 생성에 실패했습니다. 다시 시도해주세요.",
            generatedAt: generated ? new Date() : null,
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

      res.json({
        product,
        checkoutMode: "admin",
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

    const confirmed = paymentKey || checkoutMode === "dev"
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
