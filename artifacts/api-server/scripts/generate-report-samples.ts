/** Run: pnpm --filter @workspace/api-server exec tsx scripts/generate-report-samples.ts */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildSajuResult } from "../src/lib/saju-result.js";
import { buildSajuHistory } from "../src/lib/saju-history.js";
import { generateSajuReportPdf, type ReportTier } from "../src/lib/report-generator.js";

// Synthetic fixture; never replace with a customer's birth information.
const birth = {
  birthYear: 1990, birthMonth: 12, birthDay: 31,
  birthHour: 12, birthMinute: 0,
  gender: "male" as const, calendarType: "solar" as const,
};
const result = {
  ...buildSajuResult(birth),
  reportFocus: "career",
  historyAnalysis: buildSajuHistory(birth),
};
const destination = new URL("../../saju-web/public/report-samples/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const tier of ["basic", "detail", "full"] satisfies ReportTier[]) {
  const generated = await generateSajuReportPdf("가상 인물 샘플 · 이직 고민 · 실제 개인 정보 아님", result, tier);
  const output = new URL(`saju-${tier}.pdf`, destination);
  const buffer = Buffer.from(generated.fileDataBase64, "base64");
  await writeFile(output, buffer);
  console.log(`${fileURLToPath(output)} (${buffer.length} bytes)`);
}
