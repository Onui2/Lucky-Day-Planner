import { downloadReportFile } from "@workspace/api-client-react";

const AUTO_DOWNLOAD_DELAY_MS = 400;

export async function downloadReadyReportAfterDelay(
  reportId: number,
  fileName?: string | null,
  delayMs = AUTO_DOWNLOAD_DELAY_MS,
) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
  return downloadReportFile(reportId, fileName ?? undefined);
}
