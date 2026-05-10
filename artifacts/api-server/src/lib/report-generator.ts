import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const FONT_FILE_NAME = "NanumGothic-Regular.ttf";

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

function sectionHtml(title: string, body: string, accent: string) {
  return `
    <section style="margin-top:22px;border:1px solid #e7dcc8;border-radius:20px;background:#fffdf8;overflow:hidden;box-shadow:0 16px 40px rgba(31,23,34,0.05);">
      <div style="height:6px;background:${accent};"></div>
      <div style="padding:20px 22px 22px;">
        <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7d7364;">Insight</div>
        <h2 style="font-size:20px;margin:8px 0 10px;color:#241b20;">${escapeHtml(title)}</h2>
        <p style="font-size:13px;line-height:1.9;margin:0;color:#43372c;">${escapeHtml(body)}</p>
      </div>
    </section>
  `;
}

function infoCardHtml(label: string, value: string, tone: string) {
  return `
    <div style="flex:1;min-width:0;border-radius:18px;padding:18px 16px;background:${tone};border:1px solid rgba(36,27,32,0.06);">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6f6457;">${escapeHtml(label)}</div>
      <div style="margin-top:10px;font-size:20px;font-weight:700;color:#20171c;">${escapeHtml(value)}</div>
    </div>
  `;
}

function pillarCardHtml(label: string, value: string) {
  return `
    <div style="flex:1;min-width:0;border-radius:18px;padding:16px 14px;background:#fffaf0;border:1px solid #ebddbf;text-align:center;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b6b1a;">${escapeHtml(label)}</div>
      <div style="margin-top:8px;font-size:22px;font-weight:700;color:#241b20;">${escapeHtml(value)}</div>
    </div>
  `;
}

function getFontCandidates(moduleDir?: string) {
  const cwd = process.cwd();
  return Array.from(
    new Set([
      moduleDir
        ? path.resolve(moduleDir, "../../assets", "fonts", FONT_FILE_NAME)
        : null,
      moduleDir ? path.resolve(moduleDir, "fonts", FONT_FILE_NAME) : null,
      path.join(cwd, "artifacts", "api-server", "assets", "fonts", FONT_FILE_NAME),
      path.join(cwd, "artifacts", "api-server", "dist", "fonts", FONT_FILE_NAME),
      path.join(cwd, "artifacts", "saju-web", "api", "fonts", FONT_FILE_NAME),
      path.join(cwd, "assets", "fonts", FONT_FILE_NAME),
      path.join(cwd, "dist", "fonts", FONT_FILE_NAME),
      path.join(cwd, "api", "fonts", FONT_FILE_NAME),
      path.join(cwd, "fonts", FONT_FILE_NAME),
    ].filter((value): value is string => Boolean(value))),
  );
}

function getFontBuffer(): Buffer {
  let moduleDir: string | undefined;
  try {
    moduleDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {}

  for (const p of getFontCandidates(moduleDir)) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }

  throw new Error(
    `한글 폰트를 찾을 수 없습니다. 확인한 경로: ${getFontCandidates(moduleDir).join(", ")}`,
  );
}

export function buildSajuReportHtml(title: string, result: Record<string, any>) {
  const birthInfo = result.birthInfo ?? {};
  const summary = [
    `생년월일 ${birthInfo.year ?? "?"}년 ${birthInfo.month ?? "?"}월 ${birthInfo.day ?? "?"}일`,
    `일주 ${formatPillar(result.dayPillar)}`,
    `용신 ${result.yongsin?.yongsin ?? "미확인"}`,
  ].join(" · ");

  const sections = [
    {
      title: "핵심 요약",
      body: result.fortune ?? "현재 흐름은 균형과 속도 조절이 핵심입니다.",
      accent: "#caa75d",
    },
    {
      title: "성격 분석",
      body: result.personality ?? "기본 성향 정보가 준비되지 않았습니다.",
      accent: "#7a8f7b",
    },
    {
      title: "직업운",
      body: result.career ?? "직업운 정보가 준비되지 않았습니다.",
      accent: "#cb8f6d",
    },
    {
      title: "연애운",
      body: result.love ?? "연애운 정보가 준비되지 않았습니다.",
      accent: "#b67b8c",
    },
    {
      title: "건강운",
      body: result.health ?? "건강운 정보가 준비되지 않았습니다.",
      accent: "#6f92a6",
    },
    {
      title: "대운과 조언",
      body:
        result.yongsin?.advice ??
        "조급하게 결론을 내리기보다 현재 강한 기운과 부족한 기운을 함께 보며 움직이세요.",
      accent: "#5b5368",
    },
  ];

  return `<!DOCTYPE html>
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="font-family:'Nanum Gothic',sans-serif;background:#f4efe6;color:#1f1722;padding:36px;">
      <div style="max-width:880px;margin:0 auto;">
        <header style="position:relative;overflow:hidden;border-radius:28px;padding:30px 32px 34px;background:linear-gradient(135deg,#1f1722 0%,#3a2d2d 52%,#6a4d1d 100%);box-shadow:0 24px 60px rgba(31,23,34,0.18);">
          <div style="font-size:12px;letter-spacing:0.18em;color:#f4d898;text-transform:uppercase;">명해원 정밀 리포트</div>
          <h1 style="font-size:30px;line-height:1.3;margin:14px 0 8px;color:#fff8ec;">${escapeHtml(title)}</h1>
          <p style="max-width:560px;font-size:13px;line-height:1.8;margin:0;color:#f3e8d4;">${escapeHtml(summary)}</p>
          <div style="margin-top:24px;padding:16px 18px;border-radius:20px;background:rgba(255,248,236,0.1);border:1px solid rgba(255,248,236,0.18);">
            <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#eadab7;">Core Insight</div>
            <div style="margin-top:8px;font-size:15px;line-height:1.8;color:#fff8ec;">${escapeHtml(
              result.fortune ?? "현재 흐름은 균형과 속도 조절이 핵심입니다.",
            )}</div>
          </div>
        </header>

        <section style="display:flex;gap:14px;flex-wrap:wrap;margin-top:20px;">
          ${infoCardHtml("일주", formatPillar(result.dayPillar), "#fffaf0")}
          ${infoCardHtml("용신", result.yongsin?.yongsin ?? "미확인", "#f4f8f2")}
          ${infoCardHtml(
            "오행 밸런스",
            `${result.dominantElement ?? "미확인"} / ${result.lackingElement ?? "미확인"}`,
            "#f8f3fb",
          )}
        </section>

        <section style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
          ${pillarCardHtml("년주", formatPillar(result.yearPillar))}
          ${pillarCardHtml("월주", formatPillar(result.monthPillar))}
          ${pillarCardHtml("일주", formatPillar(result.dayPillar))}
          ${pillarCardHtml("시주", formatPillar(result.hourPillar))}
        </section>

        ${sections.map((section) => sectionHtml(section.title, section.body, section.accent)).join("")}

        <footer style="margin-top:24px;padding:18px 20px;border-radius:20px;background:#efe7d7;border:1px solid #e2d3b7;color:#5d5145;font-size:11px;line-height:1.8;">
          참고용 안내: 명해원의 사주 분석 결과는 참고용 콘텐츠이며, 의료·법률·투자·진로·결혼 등 중요한 의사결정을 대신하지 않습니다.
        </footer>
      </div>
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

  const fontBuffer = getFontBuffer();
  doc.registerFont("nanum", fontBuffer);
  doc.font("nanum");

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

  const birthInfo = result.birthInfo ?? {};
  const genderLabel = birthInfo.gender === "female" ? "여성" : "남성";
  const calendarLabel = birthInfo.calendarType === "lunar" ? "음력" : "양력";
  const sections = [
    {
      title: "핵심 요약",
      body: result.fortune ?? "현재 흐름은 급하게 단정하기보다 리듬을 보며 움직일 때 안정적입니다.",
      accent: "#caa75d",
    },
    {
      title: "성격 분석",
      body: result.personality ?? "성격 분석 데이터가 준비되지 않았습니다.",
      accent: "#7a8f7b",
    },
    {
      title: "직업운",
      body: result.career ?? "직업운 데이터가 준비되지 않았습니다.",
      accent: "#cb8f6d",
    },
    {
      title: "연애운",
      body: result.love ?? "연애운 데이터가 준비되지 않았습니다.",
      accent: "#b67b8c",
    },
    {
      title: "건강운",
      body: result.health ?? "건강운 데이터가 준비되지 않았습니다.",
      accent: "#6f92a6",
    },
    {
      title: "조심해야 할 시기와 행동",
      body:
        result.yongsin?.advice ??
        result.samjae?.advice ??
        "중요한 결정은 한 번 더 확인하고, 감정이 급해질 때는 속도를 늦추는 편이 좋습니다.",
      accent: "#5b5368",
    },
  ];
  const metricCards = [
    { label: "일주", value: formatPillar(result.dayPillar), fill: "#fff8e8" },
    { label: "용신", value: result.yongsin?.yongsin ?? "미확인", fill: "#f3f8f1" },
    {
      label: "오행 밸런스",
      value: `${result.dominantElement ?? "미확인"} / ${result.lackingElement ?? "미확인"}`,
      fill: "#f7f2fb",
    },
  ];
  const pillarCards = [
    { label: "년주", value: formatPillar(result.yearPillar) },
    { label: "월주", value: formatPillar(result.monthPillar) },
    { label: "일주", value: formatPillar(result.dayPillar) },
    { label: "시주", value: formatPillar(result.hourPillar) },
  ];

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const footerTop = pageHeight - margin - 12;

  const drawPageChrome = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill("#f4efe6");
    doc.rect(0, 0, pageWidth, 96).fill("#1f1722");
    doc.rect(margin, 82, contentWidth, 3).fill("#caa75d");
    doc.font("nanum").fillColor("#f0ddaf").fontSize(10).text("명해원 정밀 사주 리포트", margin, 24);
    doc.fillColor("#7d7364").fontSize(8.5).text(
      "하늘의 뜻을 읽어 내일을 준비하다",
      margin,
      footerTop,
      { width: contentWidth, align: "left", lineBreak: false },
    );
    doc.restore();
    doc.font("nanum").fillColor("#1f1722");
  };

  doc.on("pageAdded", () => {
    drawPageChrome();
    doc.y = 118;
  });

  const ensureSpace = (height: number) => {
    if (doc.y + height <= pageHeight - margin - 20) {
      return;
    }
    doc.addPage();
  };

  const drawMetricRow = () => {
    const gap = 12;
    const cardWidth = (contentWidth - gap * 2) / 3;
    const cardHeight = 78;
    const top = doc.y;

    for (const [index, card] of metricCards.entries()) {
      const x = margin + index * (cardWidth + gap);
      doc.save();
      doc.roundedRect(x, top, cardWidth, cardHeight, 16).fillAndStroke(card.fill, "#e6d8c2");
      doc.fillColor("#7d7364").fontSize(10).text(card.label, x + 14, top + 14, {
        width: cardWidth - 28,
      });
      doc.fillColor("#20171c").fontSize(16).text(card.value, x + 14, top + 34, {
        width: cardWidth - 28,
      });
      doc.restore();
    }

    doc.y = top + cardHeight + 16;
  };

  const drawPillarRow = () => {
    const gap = 10;
    const cardWidth = (contentWidth - gap * 3) / 4;
    const cardHeight = 74;
    const top = doc.y;

    for (const [index, card] of pillarCards.entries()) {
      const x = margin + index * (cardWidth + gap);
      doc.save();
      doc.roundedRect(x, top, cardWidth, cardHeight, 16).fillAndStroke("#fffaf0", "#eadab7");
      doc.fillColor("#8b6b1a").fontSize(10).text(card.label, x, top + 14, {
        width: cardWidth,
        align: "center",
      });
      doc.fillColor("#241b20").fontSize(18).text(card.value, x, top + 34, {
        width: cardWidth,
        align: "center",
      });
      doc.restore();
    }

    doc.y = top + cardHeight + 20;
  };

  const drawFeatureCard = (titleText: string, bodyText: string, accent: string) => {
    doc.font("nanum");
    doc.fontSize(11);
    const textWidth = contentWidth - 40;
    const bodyHeight = doc.heightOfString(bodyText, {
      width: textWidth,
      lineGap: 5,
      align: "left",
    });
    const cardHeight = bodyHeight + 68;

    ensureSpace(cardHeight + 12);

    const x = margin;
    const y = doc.y;

    doc.save();
    doc.roundedRect(x, y, contentWidth, cardHeight, 20).fillAndStroke("#fffdf8", "#e7dcc8");
    doc.roundedRect(x, y, contentWidth, 8, 20).fill(accent);
    doc.restore();

    doc.fillColor("#7d7364").fontSize(9.5).text("INSIGHT", x + 20, y + 18, {
      width: textWidth,
    });
    doc.fillColor("#241b20").fontSize(16).text(titleText, x + 20, y + 32, {
      width: textWidth,
    });
    doc.fillColor("#43372c").fontSize(11.2).text(bodyText, x + 20, y + 58, {
      width: textWidth,
      lineGap: 5,
      align: "left",
    });

    doc.y = y + cardHeight + 14;
  };

  drawPageChrome();
  doc.y = 118;
  const heroTop = doc.y;

  doc.save();
  doc.roundedRect(margin, heroTop, contentWidth, 168, 26).fillAndStroke("#fffaf0", "#eadab7");
  doc.rect(margin, heroTop, contentWidth, 56).fill("#2b2126");
  doc.fillColor("#f0ddaf").fontSize(10.5).text("Premium Personal Reading", margin + 22, heroTop + 18, {
    width: contentWidth - 44,
  });
  doc.fillColor("#20171c").fontSize(24).text(title, margin + 22, heroTop + 74, {
    width: contentWidth - 44,
  });
  doc.fillColor("#5f5142").fontSize(11).text(
    `${birthInfo.year ?? "?"}년 ${birthInfo.month ?? "?"}월 ${birthInfo.day ?? "?"}일 · ${genderLabel} · ${calendarLabel}`,
    margin + 22,
    heroTop + 110,
    { width: contentWidth - 44 },
  );
  doc.fillColor("#5f5142").fontSize(10.6).text(
    `사주팔자: 년주 ${formatPillar(result.yearPillar)} · 월주 ${formatPillar(result.monthPillar)} · 일주 ${formatPillar(result.dayPillar)} · 시주 ${formatPillar(result.hourPillar)}`,
    margin + 22,
    heroTop + 130,
    { width: contentWidth - 44, lineGap: 2 },
  );
  doc.restore();
  doc.y = heroTop + 188;

  ensureSpace(94);
  drawMetricRow();

  ensureSpace(90);
  drawPillarRow();

  drawFeatureCard(
    "이번 리포트의 핵심 흐름",
    result.fortune ?? "현재 흐름은 균형과 속도 조절이 핵심입니다.",
    "#caa75d",
  );

  for (const section of sections.slice(1)) {
    drawFeatureCard(section.title, section.body, section.accent);
  }

  const disclaimer =
    "참고용 안내: 명해원의 사주 분석 결과는 참고용 콘텐츠이며, 의료·법률·투자·진로·결혼 등 중요한 의사결정을 대신하지 않습니다.";
  doc.fontSize(10);
  const disclaimerHeight = doc.heightOfString(disclaimer, {
    width: contentWidth - 36,
    lineGap: 4,
  });
  ensureSpace(disclaimerHeight + 36);
  doc.save();
  doc.roundedRect(margin, doc.y, contentWidth, disclaimerHeight + 26, 18).fillAndStroke("#efe7d7", "#e2d3b7");
  doc.restore();
  doc.fillColor("#6b5b45").fontSize(9.5).text(disclaimer, margin + 18, doc.y + 14, {
    width: contentWidth - 36,
    lineGap: 4,
  });

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
