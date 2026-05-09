import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeFilename(input: string) {
  return input.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().replace(/\s+/g, "_");
}

function formatPillar(pillar: Record<string, unknown> | null | undefined) {
  if (!pillar) return "미확인";
  return `${pillar.heavenlyStem ?? "?"}${pillar.earthlyBranch ?? "?"}`;
}

function sectionHtml(title: string, body: string) {
  return `
    <section style="margin-top:24px;">
      <h2 style="font-size:18px;margin:0 0 10px;color:#7c5c10;">${escapeHtml(title)}</h2>
      <p style="font-size:13px;line-height:1.8;margin:0;color:#2f2614;">${escapeHtml(body)}</p>
    </section>
  `;
}

function getFontPath(): string | null {
  const name = "NanumGothic-Regular.ttf";
  const candidates: string[] = [];

  // ESM 번들 기준 (Vercel: api/fonts/ 에 복사됨)
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.join(moduleDir, "fonts", name));
  } catch { /* CJS 환경 */ }

  // 로컬 개발 환경 (프로젝트 루트 기준)
  candidates.push(path.join(process.cwd(), "artifacts", "api-server", "assets", "fonts", name));
  candidates.push(path.join(process.cwd(), "assets", "fonts", name));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function buildSajuReportHtml(title: string, result: Record<string, any>) {
  const birthInfo = result.birthInfo ?? {};
  const summary = [
    `생년월일 ${birthInfo.year ?? "?"}년 ${birthInfo.month ?? "?"}월 ${birthInfo.day ?? "?"}일`,
    `일주 ${formatPillar(result.dayPillar)}`,
    `용신 ${result.yongsin?.yongsin ?? "미확인"}`,
  ].join(" · ");

  return `<!DOCTYPE html>
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="font-family:'Nanum Gothic',sans-serif;background:#f7f3ea;color:#1f1722;padding:40px;">
      <header style="border-bottom:2px solid #d4af37;padding-bottom:18px;">
        <div style="font-size:12px;letter-spacing:0.12em;color:#8b6b1a;">명해원 정밀 리포트</div>
        <h1 style="font-size:28px;margin:10px 0 6px;">${escapeHtml(title)}</h1>
        <p style="font-size:13px;line-height:1.7;margin:0;color:#4b3d25;">${escapeHtml(summary)}</p>
      </header>
      ${sectionHtml("핵심 요약", result.fortune ?? "현재 흐름은 균형과 속도 조절이 핵심입니다.")}
      ${sectionHtml("성격 분석", result.personality ?? "기본 성향 정보가 준비되지 않았습니다.")}
      ${sectionHtml("직업운", result.career ?? "직업운 정보가 준비되지 않았습니다.")}
      ${sectionHtml("연애운", result.love ?? "연애운 정보가 준비되지 않았습니다.")}
      ${sectionHtml("건강운", result.health ?? "건강운 정보가 준비되지 않았습니다.")}
      ${sectionHtml(
        "대운과 조언",
        result.yongsin?.advice ??
          "조급하게 결론을 내리기보다 현재 강한 기운과 부족한 기운을 함께 보며 움직이세요.",
      )}
    </body>
  </html>`;
}

export function buildSajuReportPreview(result: Record<string, any>) {
  const parts = [
    result.fortune,
    result.personality,
    result.career,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  return parts.join(" ").slice(0, 220);
}

export async function generateSajuReportPdf(title: string, result: Record<string, any>) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: title,
      Author: "명해원",
      Subject: "정밀 사주 PDF 리포트",
    },
  });

  const fontPath = getFontPath();
  if (fontPath) {
    doc.registerFont("nanum", fontPath);
    doc.font("nanum");
  }

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

  const birthInfo = result.birthInfo ?? {};
  const sections = [
    {
      title: "핵심 요약",
      body: result.fortune ?? "현재 흐름은 급하게 단정하기보다 리듬을 보며 움직일 때 안정적입니다.",
    },
    {
      title: "성격 분석",
      body: result.personality ?? "성격 분석 데이터가 준비되지 않았습니다.",
    },
    {
      title: "직업운",
      body: result.career ?? "직업운 데이터가 준비되지 않았습니다.",
    },
    {
      title: "연애운",
      body: result.love ?? "연애운 데이터가 준비되지 않았습니다.",
    },
    {
      title: "건강운",
      body: result.health ?? "건강운 데이터가 준비되지 않았습니다.",
    },
    {
      title: "조심해야 할 시기와 행동",
      body:
        result.yongsin?.advice ??
        result.samjae?.advice ??
        "중요한 결정은 한 번 더 확인하고, 감정이 급해질 때는 속도를 늦추는 편이 좋습니다.",
    },
  ];

  doc.fillColor("#8b6b1a").fontSize(13).text("명해원 정밀 사주 리포트", { align: "center" });
  doc.moveDown(0.5);
  doc.fillColor("#1f1722").fontSize(24).text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#4b3d25").text(
    `${birthInfo.year ?? "?"}년 ${birthInfo.month ?? "?"}월 ${birthInfo.day ?? "?"}일 · ${
      birthInfo.gender === "female" ? "여성" : "남성"
    } · ${birthInfo.calendarType === "lunar" ? "음력" : "양력"}`,
    { align: "center" },
  );
  doc.moveDown(1.5);

  doc.fontSize(12).fillColor("#2f2614").text(
    `사주팔자: 년주 ${formatPillar(result.yearPillar)} · 월주 ${formatPillar(result.monthPillar)} · 일주 ${formatPillar(result.dayPillar)} · 시주 ${formatPillar(result.hourPillar)}`,
    { lineGap: 4 },
  );
  doc.moveDown(0.5);
  doc.text(
    `오행 흐름: 강한 기운 ${result.dominantElement ?? "미확인"} / 부족한 기운 ${result.lackingElement ?? "미확인"} / 용신 ${result.yongsin?.yongsin ?? "미확인"}`,
    { lineGap: 4 },
  );
  doc.moveDown(1.2);

  for (const section of sections) {
    doc.fontSize(16).fillColor("#7c5c10").text(section.title);
    doc.moveDown(0.3);
    doc.fontSize(11.5).fillColor("#1f1722").text(section.body, {
      lineGap: 6,
      align: "left",
    });
    doc.moveDown(1);
  }

  doc.moveDown(1);
  doc.fontSize(9).fillColor("#6b5b45").text(
    "참고용 안내: 명해원의 사주 분석 결과는 참고용 콘텐츠이며, 의료·법률·투자·진로·결혼 등 중요한 의사결정을 대신하지 않습니다.",
    { lineGap: 4 },
  );

  doc.end();

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return {
    fileName: `${sanitizeFilename(title) || "myeonghaewon_report"}.pdf`,
    previewText: buildSajuReportPreview(result),
    htmlContent: buildSajuReportHtml(title, result),
    fileDataBase64: buffer.toString("base64"),
  };
}
