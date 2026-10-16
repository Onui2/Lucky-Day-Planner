import { db, pdfReportsTable, type PdfReportRow } from "@workspace/db";
import { and, eq, lt, or } from "drizzle-orm";
import { generateSajuReportPdf } from "./report-generator.js";
import { getReportTier } from "./product-config.js";

/** A short lease prevents duplicate renderers; expired work is retryable.
 * Compare the lease timestamp on completion so a late worker cannot overwrite a retry.
 * Payment/entitlement checks belong to the authenticated caller.
 */
export async function renderStoredReport(
  report: PdfReportRow,
  result: Record<string, any>,
  options: { force?: boolean } = {},
) {
  if (report.status === "ready" && !options.force) return report;
  const leasedAt = new Date();
  const eligible = [
    eq(pdfReportsTable.status, "pending"), eq(pdfReportsTable.status, "failed"),
    and(eq(pdfReportsTable.status, "processing"), lt(pdfReportsTable.updatedAt, new Date(leasedAt.getTime() - 120_000))),
  ];
  if (options.force && report.status === "ready") {
    // Only regenerate the version the caller read. Concurrent clicks cannot
    // claim a newer completed PDF after the first request finishes.
    eligible.push(and(eq(pdfReportsTable.status, "ready"), eq(pdfReportsTable.updatedAt, report.updatedAt)));
  }
  const [claimed] = await db.update(pdfReportsTable).set({ status: "processing", updatedAt: leasedAt })
    .where(and(eq(pdfReportsTable.id, report.id), eq(pdfReportsTable.userId, report.userId), or(...eligible))).returning();
  if (!claimed) {
    const [current] = await db.select().from(pdfReportsTable).where(eq(pdfReportsTable.id, report.id));
    return current ?? report;
  }
  try {
    const generated = await generateSajuReportPdf(report.title, result, getReportTier(report.productType));
    const [updated] = await db.update(pdfReportsTable).set({
      status: "ready", previewText: generated.previewText, htmlContent: generated.htmlContent,
      fileName: generated.fileName, fileDataBase64: generated.fileDataBase64,
      failedReason: null, generatedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(pdfReportsTable.id, report.id), eq(pdfReportsTable.status, "processing"),
      eq(pdfReportsTable.updatedAt, leasedAt))).returning();
    return updated ?? claimed;
  } catch {
    const [failed] = await db.update(pdfReportsTable).set({ status: "failed",
      failedReason: "PDF 생성에 실패했습니다. 같은 주문에서 다시 시도해주세요.", updatedAt: new Date(),
    }).where(and(eq(pdfReportsTable.id, report.id), eq(pdfReportsTable.status, "processing"),
      eq(pdfReportsTable.updatedAt, leasedAt))).returning();
    return failed ?? claimed;
  }
}
