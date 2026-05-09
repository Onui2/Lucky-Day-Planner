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
} from "../lib/commerce.js";
import { generateSajuReportPdf } from "../lib/report-generator.js";
import { buildSajuResult } from "../lib/saju-result.js";

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
  } catch (error) {
    console.error("commerce order create error:", error);
    res.status(500).json({ error: "주문 생성에 실패했습니다." });
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
        ),
      );

    if (!row) {
      res.status(404).json({ error: "주문을 찾을 수 없습니다." });
      return;
    }

    if (row.order.status === "paid") {
      res.json({
        order: row.order,
        report: row.report,
        alreadyPaid: true,
      });
      return;
    }

    const confirmed = await confirmPaymentWithProvider(row.order, paymentKey);

    const generated = await generateSajuReportPdf(
      row.report.title,
      row.snapshot.sajuResult as Record<string, any>,
    ).catch((error: unknown) => {
      console.error("report generation error:", error);
      return null;
    });

    const result = await db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(ordersTable)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, row.order.id))
        .returning();

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

      const [updatedReport] = await tx
        .update(pdfReportsTable)
        .set(
          generated
            ? {
                status: "ready",
                previewText: generated.previewText,
                htmlContent: generated.htmlContent,
                fileName: generated.fileName,
                fileDataBase64: generated.fileDataBase64,
                failedReason: null,
                generatedAt: new Date(),
                updatedAt: new Date(),
              }
            : {
                status: "failed",
                failedReason: "PDF 생성에 실패했습니다. 다시 시도해주세요.",
                updatedAt: new Date(),
              },
        )
        .where(eq(pdfReportsTable.id, row.report.id))
        .returning();

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

      return { order: updatedOrder, report: updatedReport };
    });

    res.json({
      order: result.order,
      report: result.report,
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
