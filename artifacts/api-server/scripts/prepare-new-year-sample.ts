/** Builds a public sample from an explicitly approved, anonymized stored analysis.
 * Does not call an analysis service, create a fictional person, or change release flags.
 */
import { readFile, writeFile } from "node:fs/promises";
import { generateSajuReportPdf } from "../src/lib/report-generator.js";

const source = process.env.REPORT_2027_APPROVED_SAMPLE_JSON;
if (!source) throw new Error("승인된 비식별 분석 JSON 경로가 필요합니다.");
const approved = JSON.parse(await readFile(source, "utf8"));
if (approved.approvedForPublicSample !== true || approved.result?.reportEdition !== "new-year-2027") {
  throw new Error("공개 승인 표시와 실제 저장된 2027 분석이 필요합니다.");
}
// Only the existing annual output is needed by the three sample pages.
// Never pass a customer's identity, birth information, or question to the sample.
const result = {
  reportEdition: approved.result.reportEdition,
  newYearAnalysis: approved.result.newYearAnalysis,
};
const generated = await generateSajuReportPdf("2027 종합 신년운세 · 공개 승인 샘플", result, "detail", { sampleOnly: true });
const output = new URL("../../saju-web/public/report-samples/new-year-2027.pdf", import.meta.url);
await writeFile(output, Buffer.from(generated.fileDataBase64, "base64"));
console.log("샘플 3쪽 생성 완료. 공개 전 실제 제공물과 서식·내용을 대조하고 sampleStatus를 별도로 검토하세요.");
