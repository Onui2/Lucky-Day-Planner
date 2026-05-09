import { Router, type Request, type Response } from "express";
import {
  analysisSnapshotsTable,
  db,
  pdfReportsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireDatabase } from "../lib/database-guard.js";
import { generateSajuReportPdf } from "../lib/report-generator.js";

const router = Router();

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
      })
      .from(pdfReportsTable)
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
  if (!Number.isFinite(id)) {
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

    if (report.status !== "ready" || !report.fileDataBase64) {
      res.status(409).json({ error: "아직 다운로드할 수 없는 리포트입니다." });
      return;
    }

    const buffer = Buffer.from(report.fileDataBase64, "base64");
    res.setHeader("Content-Type", report.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(
        report.fileName ?? `report-${report.id}.pdf`,
      )}`,
    );
    res.send(buffer);
  } catch (error) {
    console.error("report download error:", error);
    res.status(500).json({ error: "리포트 다운로드에 실패했습니다." });
  }
});

router.post("/reports/:id/regenerate", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
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
        ),
      );

    if (!row) {
      res.status(404).json({ error: "리포트를 찾을 수 없습니다." });
      return;
    }

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
      .where(eq(pdfReportsTable.id, row.report.id))
      .returning();

    res.json({ report: updated });
  } catch (error) {
    console.error("report regenerate error:", error);
    res.status(500).json({ error: "리포트 재생성에 실패했습니다." });
  }
});

export default router;
