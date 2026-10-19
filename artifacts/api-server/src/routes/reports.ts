import { Router, type Request, type Response } from "express";
import {
  analysisSnapshotsTable,
  db,
  pdfReportsTable,
  ordersTable,
  purchaseEntitlementsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireDatabase } from "../lib/database-guard.js";
import { renderStoredReport } from "../lib/report-rendering.js";
import { hasReportAccess } from "../lib/report-access.js";
import { getSajuReportSections } from "../lib/report-generator.js";
import { getReportTier } from "../lib/product-config.js";
import { buildSajuPreview } from "../lib/saju-preview.js";

const router = Router();

async function markFirstDelivery(orderId: number, userId: string) {
  if (process.env.CAMPAIGN_ANALYTICS_ENABLED !== "true") return;
  try {
    // Web reading and PDF delivery share one campaign conversion timestamp.
    await db.update(ordersTable).set({
      metadata: sql`jsonb_set(coalesce(${ordersTable.metadata}, '{}'::jsonb), '{firstDeliveredAt}', to_jsonb(${new Date().toISOString()}::text))`,
    }).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId),
      sql`${ordersTable.metadata}->>'reportEdition' = 'new-year-2027'`,
      sql`${ordersTable.metadata}->>'firstDeliveredAt' IS NULL`));
  } catch {
    // Analytics must not prevent access to a purchased report.
  }
}

function requireAuth(req: Request, res: Response): req is Request & { user: Express.User } {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }

  return true;
}

router.get("/reports", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  try {
    const reports = await db
      .select({
        id: pdfReportsTable.id,
        title: pdfReportsTable.title,
        status: pdfReportsTable.status,
        productType: pdfReportsTable.productType,
        previewText: pdfReportsTable.previewText,
        fileName: pdfReportsTable.fileName,
        generatedAt: pdfReportsTable.generatedAt,
        createdAt: pdfReportsTable.createdAt,
        expiresAt: purchaseEntitlementsTable.expiresAt,
      })
      .from(pdfReportsTable)
      .leftJoin(purchaseEntitlementsTable, and(
        eq(purchaseEntitlementsTable.orderId, pdfReportsTable.orderId),
        eq(purchaseEntitlementsTable.userId, pdfReportsTable.userId),
        eq(purchaseEntitlementsTable.productType, pdfReportsTable.productType),
        eq(purchaseEntitlementsTable.resourceType, "pdf_report"),
        eq(purchaseEntitlementsTable.resourceId, pdfReportsTable.id),
      ))
      .where(eq(pdfReportsTable.userId, req.user.id))
      .orderBy(desc(pdfReportsTable.createdAt));

    res.json({ reports });
  } catch (error) {
    console.error("report list error:", error);
    res.status(500).json({ error: "리포트 목록을 불러오지 못했습니다." });
  }
});

router.get("/reports/:id/download", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "유효하지 않은 리포트 ID입니다." });
    return;
  }

  try {
    const [report] = await db
      .select()
      .from(pdfReportsTable)
      .where(
        and(
          eq(pdfReportsTable.id, id),
          eq(pdfReportsTable.userId, req.user.id),
        ),
      );

    if (!report) {
      res.status(404).json({ error: "리포트를 찾을 수 없습니다." });
      return;
    }

    if (!(await hasReportAccess(req.user.id, report))) {
      res.status(403).json({ error: "리포트 이용 기간이 만료되었거나 이용 권한이 없습니다." });
      return;
    }

    if (report.status !== "ready" || !report.fileDataBase64) {
      res.status(409).json({ error: "아직 다운로드할 수 없는 리포트입니다." });
      return;
    }

    const buffer = Buffer.from(report.fileDataBase64, "base64");
    // `inline=1` lets the in-app viewer (and browsers that render PDFs) show
    // the file instead of forcing a download; the same auth/entitlement checks apply.
    const disposition = req.query.inline === "1" ? "inline" : "attachment";
    res.setHeader("Content-Type", report.mimeType);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(
        report.fileName ?? `report-${report.id}.pdf`,
      )}`,
    );
    await markFirstDelivery(report.orderId, req.user.id);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (error) {
    console.error("report download error:", error);
    res.status(500).json({ error: "리포트 다운로드에 실패했습니다." });
  }
});

router.get("/reports/:id/content", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "유효하지 않은 리포트 ID입니다." });
    return;
  }
  try {
    const [row] = await db.select({ report: pdfReportsTable, snapshot: analysisSnapshotsTable })
      .from(pdfReportsTable)
      .innerJoin(analysisSnapshotsTable, eq(analysisSnapshotsTable.id, pdfReportsTable.snapshotId))
      .where(and(eq(pdfReportsTable.id, id), eq(pdfReportsTable.userId, req.user.id),
        eq(analysisSnapshotsTable.userId, req.user.id)));
    if (!row) {
      res.status(404).json({ error: "리포트를 찾을 수 없습니다." });
      return;
    }
    if (!(await hasReportAccess(req.user.id, row.report))) {
      res.status(403).json({ error: "리포트 이용 기간이 만료되었거나 이용 권한이 없습니다." });
      return;
    }
    if (row.report.status !== "ready") {
      res.status(409).json({ error: "아직 생성 중인 리포트입니다." });
      return;
    }
    const result = row.snapshot.sajuResult as Record<string, any>;
    const tier = getReportTier(row.report.productType);
    const sections = getSajuReportSections(result, tier).map(({ title, body }) => ({ title, body }));
    await markFirstDelivery(row.report.orderId, req.user.id);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      id: row.report.id, title: row.report.title, productType: row.report.productType,
      preview: buildSajuPreview(result),
      // Same server-selected tier as PDF rendering; never serialize the snapshot.
      sections,
    });
  } catch (error) {
    console.error("report content error:", error);
    res.status(500).json({ error: "리포트 내용을 불러오지 못했습니다." });
  }
});

router.post("/reports/:id/regenerate", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "유효하지 않은 리포트 ID입니다." });
    return;
  }

  try {
    const [row] = await db
      .select({
        report: pdfReportsTable,
        snapshot: analysisSnapshotsTable,
      })
      .from(pdfReportsTable)
      .innerJoin(
        analysisSnapshotsTable,
        eq(analysisSnapshotsTable.id, pdfReportsTable.snapshotId),
      )
      .where(
        and(
          eq(pdfReportsTable.id, id),
          eq(pdfReportsTable.userId, req.user.id),
          eq(analysisSnapshotsTable.userId, req.user.id),
        ),
      );

    if (!row) {
      res.status(404).json({ error: "리포트를 찾을 수 없습니다." });
      return;
    }

    if (!(await hasReportAccess(req.user.id, row.report))) {
      res.status(403).json({ error: "리포트 이용 기간이 만료되었거나 이용 권한이 없습니다." });
      return;
    }

    const updated = await renderStoredReport(row.report, row.snapshot.sajuResult as Record<string, any>, { force: true });

    res.json({ report: updated });
  } catch (error) {
    console.error("report regenerate error:", error);
    res.status(500).json({ error: "리포트 재생성에 실패했습니다." });
  }
});

export default router;
