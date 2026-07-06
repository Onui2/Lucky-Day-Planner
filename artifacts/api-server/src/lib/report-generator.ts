import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

// 한자 글리프가 포함된 Noto KR 폰트 — NanumGothic 서브셋은 한자가 없어 PDF에서 사라짐
type FontName = "body" | "bold" | "serif";

const FONT_FILES: Record<FontName, string> = {
  body: "NotoSansKR-Regular.otf",
  bold: "NotoSansKR-Bold.otf",
  serif: "NotoSerifKR-Bold.otf",
};

async function loadEmbeddedFont(name: FontName): Promise<string | null> {
  try {
    let mod: { default?: unknown };
    if (name === "body") {
      // @ts-ignore — esbuild base64 loader inlines font at build time
      mod = await import("../../assets/fonts/NotoSansKR-Regular.otf");
    } else if (name === "bold") {
      // @ts-ignore — esbuild base64 loader inlines font at build time
      mod = await import("../../assets/fonts/NotoSansKR-Bold.otf");
    } else {
      // @ts-ignore — esbuild base64 loader inlines font at build time
      mod = await import("../../assets/fonts/NotoSerifKR-Bold.otf");
    }
    const data = mod.default;
    return typeof data === "string" && data.length > 100 ? data : null;
  } catch {
    // dev(tsx)는 폰트 모듈을 로드할 수 없음 — 파일시스템 폴백 사용
    return null;
  }
}

function getFontCandidates(fileName: string) {
  const cwd = process.cwd();
  return Array.from(
    new Set([
      path.join(cwd, "artifacts", "api-server", "assets", "fonts", fileName),
      path.join(cwd, "artifacts", "api-server", "dist", "fonts", fileName),
      path.join(cwd, "artifacts", "saju-web", "api", "fonts", fileName),
      path.join(cwd, "assets", "fonts", fileName),
      path.join(cwd, "dist", "fonts", fileName),
      path.join(cwd, "api", "fonts", fileName),
      path.join(cwd, "fonts", fileName),
    ]),
  );
}

async function getFontBuffer(name: FontName): Promise<Buffer> {
  const fileName = FONT_FILES[name];
  // 로컬 개발: import.meta.url 기준
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const p = path.join(moduleDir, "fonts", fileName);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {}
  // 마지막 fallback: process.cwd() 기반 다중 경로
  for (const p of getFontCandidates(fileName)) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  throw new Error(
    `폰트를 찾을 수 없습니다 (${fileName}). 확인한 경로: ${getFontCandidates(fileName).join(", ")}`,
  );
}

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

const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊",
  기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};

const BRANCH_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};

const ELEMENT_HANJA: Record<string, string> = {
  목: "木", 화: "火", 토: "土", 금: "金", 수: "水",
};

const ELEMENT_COLORS: Record<string, string> = {
  목: "#4d7c54",
  화: "#b8493f",
  토: "#bb8c33",
  금: "#787f89",
  수: "#3f658c",
};

// elementBalance는 영문 키(wood/fire/earth/metal/water)로 저장됨
const ELEMENT_KEY_EN: Record<string, string> = {
  목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water",
};

const SINGANGYAK_HANJA: Record<string, string> = {
  신강: "身强", 신약: "身弱", 중화: "中和",
};

function stemHanja(value: unknown): string {
  return typeof value === "string" ? STEM_HANJA[value] ?? "?" : "?";
}

function branchHanja(value: unknown): string {
  return typeof value === "string" ? BRANCH_HANJA[value] ?? "?" : "?";
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

function formatShadowReading(result: Record<string, any>) {
  const shadow = result.shadowReading;
  if (!shadow || typeof shadow !== "object") {
    return "";
  }

  const summary = typeof shadow.summary === "string" ? shadow.summary.trim() : "";
  const pitfalls: string[] = Array.isArray(shadow.pitfalls)
    ? shadow.pitfalls
        .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 4)
    : [];
  const advice = typeof shadow.advice === "string" ? shadow.advice.trim() : "";

  return [summary, ...pitfalls.map((item) => `주의: ${item}`), advice]
    .filter(Boolean)
    .join(" ");
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
      title: "그림자와 주의점",
      body:
        formatShadowReading(result) ||
        "좋은 기운도 과하면 부담이 됩니다. 강점이 과해질 때 생기는 반복 실수를 함께 살피는 편이 좋습니다.",
      accent: "#9a4f4f",
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
    <body style="font-family:'Noto Sans KR','Nanum Gothic',sans-serif;background:#f4efe6;color:#1f1722;padding:36px;">
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
    result.shadowReading?.summary,
    result.personality,
    result.career,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  return parts.join(" ").slice(0, 220);
}

// ─── PDF 색상 팔레트 ───
const INK = "#221a26";          // 표지 배경 — 짙은 먹빛
const INK_SOFT = "#2e2433";
const PAPER = "#faf6ee";        // 본문 배경 — 한지
const CARD = "#fffdf6";
const CARD_BORDER = "#e8dcc2";
const GOLD = "#c8a356";
const GOLD_DARK = "#8a6b1f";
const GOLD_LIGHT = "#ecd9a8";
const TEXT = "#2a2230";
const TEXT_BODY = "#4a4036";
const TEXT_SUB = "#7a6f5f";

export async function generateSajuReportPdf(title: string, result: Record<string, any>) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: title,
      Author: "명해원",
      Subject: "정밀 사주 PDF 리포트",
    },
  });

  const [bodyFont, boldFont, serifFont] = await Promise.all([
    getFontBuffer("body"),
    getFontBuffer("bold"),
    getFontBuffer("serif"),
  ]);
  doc.registerFont("body", bodyFont);
  doc.registerFont("bold", boldFont);
  doc.registerFont("serif", serifFont);
  doc.font("body");

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

  const birthInfo = result.birthInfo ?? {};
  const genderLabel = birthInfo.gender === "female" ? "여성" : "남성";
  const calendarLabel = birthInfo.calendarType === "lunar" ? "음력" : "양력";
  const hourLabel =
    typeof birthInfo.hour === "number" && birthInfo.hour >= 0
      ? ` ${birthInfo.hour}시${birthInfo.minute ? ` ${birthInfo.minute}분` : ""}`
      : "";

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const contentTop = 96;
  const contentBottom = pageHeight - 64;

  const pillars = [
    { label: "년주", hanjaLabel: "年柱", pillar: result.yearPillar },
    { label: "월주", hanjaLabel: "月柱", pillar: result.monthPillar },
    { label: "일주", hanjaLabel: "日柱", pillar: result.dayPillar },
    { label: "시주", hanjaLabel: "時柱", pillar: result.hourPillar },
  ];

  const sections = [
    {
      title: "핵심 요약",
      hanja: "總評",
      body: result.fortune ?? "현재 흐름은 급하게 단정하기보다 리듬을 보며 움직일 때 안정적입니다.",
      accent: "#caa75d",
    },
    {
      title: "그림자와 주의점",
      hanja: "陰影",
      body:
        formatShadowReading(result) ||
        "좋은 기운도 과하면 부담이 됩니다. 강점이 과해질 때 생기는 반복 실수를 함께 살피는 편이 좋습니다.",
      accent: "#9a4f4f",
    },
    {
      title: "성격 분석",
      hanja: "性格",
      body: result.personality ?? "성격 분석 데이터가 준비되지 않았습니다.",
      accent: "#7a8f7b",
    },
    {
      title: "직업운",
      hanja: "職業運",
      body: result.career ?? "직업운 데이터가 준비되지 않았습니다.",
      accent: "#cb8f6d",
    },
    {
      title: "연애운",
      hanja: "戀愛運",
      body: result.love ?? "연애운 데이터가 준비되지 않았습니다.",
      accent: "#b67b8c",
    },
    {
      title: "건강운",
      hanja: "健康運",
      body: result.health ?? "건강운 데이터가 준비되지 않았습니다.",
      accent: "#6f92a6",
    },
    {
      title: "조심해야 할 시기와 행동",
      hanja: "助言",
      body:
        result.yongsin?.advice ??
        result.samjae?.advice ??
        "중요한 결정은 한 번 더 확인하고, 감정이 급해질 때는 속도를 늦추는 편이 좋습니다.",
      accent: "#5b5368",
    },
  ];

  // ─── 페이지 크롬 (본문 페이지 공통) ───
  let pageNo = 1;
  const drawContentChrome = () => {
    // 하단 마진 밖(푸터)에 텍스트를 그릴 때 pdfkit이 자동 페이지 추가하는 것을 방지
    const prevBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(PAPER);
    doc.font("serif").fillColor(INK).fontSize(10).text("命海苑", margin, 34, { lineBreak: false });
    doc.font("body").fillColor(TEXT_SUB).fontSize(8.5).text("정밀 사주 리포트", margin + 46, 36.5, { lineBreak: false });
    doc.font("body").fillColor(TEXT_SUB).fontSize(8.5).text(
      `${birthInfo.year ?? "?"}.${String(birthInfo.month ?? "?").padStart(2, "0")}.${String(birthInfo.day ?? "?").padStart(2, "0")} ${genderLabel}`,
      margin, 36.5,
      { width: contentWidth, align: "right", lineBreak: false },
    );
    doc.moveTo(margin, 54).lineTo(pageWidth - margin, 54).lineWidth(0.8).strokeColor(GOLD, 0.65).stroke();
    // 푸터
    doc.font("body").fillColor(TEXT_SUB).fontSize(8).text(
      "하늘의 뜻을 읽어 내일을 준비하다 · 명해원",
      margin, pageHeight - 42,
      { lineBreak: false },
    );
    doc.font("body").fillColor(GOLD_DARK).fontSize(8.5).text(
      `${pageNo}`,
      margin, pageHeight - 42,
      { width: contentWidth, align: "right", lineBreak: false },
    );
    doc.restore();
    doc.page.margins.bottom = prevBottomMargin;
    doc.font("body").fillColor(TEXT);
  };

  doc.on("pageAdded", () => {
    pageNo += 1;
    drawContentChrome();
    doc.y = contentTop;
  });

  const ensureSpace = (height: number) => {
    if (doc.y + height <= contentBottom) return;
    doc.addPage();
  };

  // ─── 섹션 헤딩 ───
  const drawSectionHeading = (text: string, hanja: string) => {
    ensureSpace(40);
    const y = doc.y;
    doc.save();
    doc.circle(margin + 3.5, y + 8, 3.5).fill(GOLD);
    doc.font("serif").fillColor(INK).fontSize(14).text(text, margin + 16, y, { lineBreak: false });
    const titleWidth = doc.widthOfString(text);
    doc.font("serif").fillColor(GOLD_DARK, 0.85).fontSize(10).text(hanja, margin + 16 + titleWidth + 8, y + 3.5, { lineBreak: false });
    doc.restore();
    doc.y = y + 26;
  };

  // ════════════════ 1페이지: 표지 ════════════════
  doc.rect(0, 0, pageWidth, pageHeight).fill(INK);

  // 장식 — 은은한 동심원과 모서리 괘선
  doc.save();
  doc.circle(pageWidth / 2, 175, 132).lineWidth(0.6).strokeColor(GOLD, 0.28).stroke();
  doc.circle(pageWidth / 2, 175, 124).lineWidth(0.4).strokeColor(GOLD, 0.18).stroke();
  doc.circle(pageWidth - 36, pageHeight - 110, 150).lineWidth(0.5).strokeColor(GOLD, 0.12).stroke();
  doc.circle(36, pageHeight - 300, 90).lineWidth(0.5).strokeColor(GOLD, 0.10).stroke();
  const frame = 22;
  doc.lineWidth(0.8).strokeColor(GOLD, 0.5);
  doc.moveTo(frame, frame + 26).lineTo(frame, frame).lineTo(frame + 26, frame).stroke();
  doc.moveTo(pageWidth - frame - 26, frame).lineTo(pageWidth - frame, frame).lineTo(pageWidth - frame, frame + 26).stroke();
  doc.moveTo(frame, pageHeight - frame - 26).lineTo(frame, pageHeight - frame).lineTo(frame + 26, pageHeight - frame).stroke();
  doc.moveTo(pageWidth - frame - 26, pageHeight - frame).lineTo(pageWidth - frame, pageHeight - frame).lineTo(pageWidth - frame, pageHeight - frame - 26).stroke();
  doc.restore();

  // 상단 브랜드
  doc.font("serif").fillColor(GOLD).fontSize(21).text("命 海 苑", 0, 96, {
    width: pageWidth,
    align: "center",
    characterSpacing: 6,
  });
  doc.font("body").fillColor(GOLD_LIGHT, 0.9).fontSize(9.5).text("명해원 · 하늘의 뜻을 읽어 내일을 준비하다", 0, 128, {
    width: pageWidth,
    align: "center",
    characterSpacing: 1,
  });

  // 중앙 타이틀
  doc.font("serif").fillColor("#fff8ec").fontSize(31).text("정밀 사주 리포트", 0, 166, {
    width: pageWidth,
    align: "center",
    characterSpacing: 2,
  });
  doc.font("body").fillColor(GOLD_LIGHT).fontSize(11.5).text(
    `${birthInfo.year ?? "?"}년 ${birthInfo.month ?? "?"}월 ${birthInfo.day ?? "?"}일${hourLabel} · ${genderLabel} · ${calendarLabel}`,
    0, 214,
    { width: pageWidth, align: "center" },
  );

  // 구분 괘선
  const ruleY = 252;
  doc.moveTo(pageWidth / 2 - 110, ruleY).lineTo(pageWidth / 2 - 14, ruleY).lineWidth(0.7).strokeColor(GOLD, 0.7).stroke();
  doc.moveTo(pageWidth / 2 + 14, ruleY).lineTo(pageWidth / 2 + 110, ruleY).lineWidth(0.7).strokeColor(GOLD, 0.7).stroke();
  doc.font("serif").fillColor(GOLD).fontSize(10).text("四柱八字", pageWidth / 2 - 30, ruleY - 6, {
    width: 60,
    align: "center",
  });

  // 사주 4기둥 카드
  const cardGap = 13;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 168;
  const cardTop = 292;

  for (const [index, item] of pillars.entries()) {
    const x = margin + index * (cardWidth + cardGap);
    const isDay = item.label === "일주";
    doc.save();
    doc.roundedRect(x, cardTop, cardWidth, cardHeight, 12).fill(isDay ? "#fbf4e2" : "#f5eedd");
    if (isDay) {
      doc.roundedRect(x + 2.5, cardTop + 2.5, cardWidth - 5, cardHeight - 5, 10).lineWidth(1).strokeColor(GOLD_DARK, 0.8).stroke();
    }
    doc.font("body").fillColor(GOLD_DARK).fontSize(8.5).text(
      `${item.label} ${item.hanjaLabel}${isDay ? " · 나" : ""}`,
      x, cardTop + 14,
      { width: cardWidth, align: "center", characterSpacing: 0.5 },
    );
    const stem = item.pillar?.heavenlyStem;
    const branch = item.pillar?.earthlyBranch;
    const stemColor = ELEMENT_COLORS[item.pillar?.heavenlyStemElement as string] ?? TEXT;
    const branchColor = ELEMENT_COLORS[item.pillar?.earthlyBranchElement as string] ?? TEXT;
    if (stem || branch) {
      doc.font("serif").fillColor(stemColor).fontSize(33).text(stemHanja(stem), x, cardTop + 34, {
        width: cardWidth,
        align: "center",
      });
      doc.font("serif").fillColor(branchColor).fontSize(33).text(branchHanja(branch), x, cardTop + 78, {
        width: cardWidth,
        align: "center",
      });
      doc.font("body").fillColor(TEXT_SUB).fontSize(10).text(`${stem ?? "?"}${branch ?? "?"}`, x, cardTop + 130, {
        width: cardWidth,
        align: "center",
      });
    } else {
      doc.font("serif").fillColor(TEXT_SUB).fontSize(20).text("미상", x, cardTop + 70, {
        width: cardWidth,
        align: "center",
      });
    }
    doc.restore();
  }

  // 핵심 지표 줄 — 일간 · 용신 · 신강/신약
  const summaryTop = cardTop + cardHeight + 26;
  const summaryItems = [
    { label: "일간 오행", value: result.dayMasterElement ? `${result.dayMasterElement} ${ELEMENT_HANJA[result.dayMasterElement as string] ?? ""}` : "미확인" },
    { label: "용신", value: result.yongsin?.yongsin ? `${result.yongsin.yongsin} ${ELEMENT_HANJA[result.yongsin.yongsin as string] ?? ""}` : "미확인" },
    {
      label: "신강 · 신약",
      value: result.sinGangYak?.type
        ? `${result.sinGangYak.type} ${SINGANGYAK_HANJA[result.sinGangYak.type as string] ?? ""}`
        : "미확인",
    },
  ];
  const summaryWidth = (contentWidth - 24) / 3;
  for (const [index, item] of summaryItems.entries()) {
    const x = margin + index * (summaryWidth + 12);
    doc.font("body").fillColor(GOLD, 0.85).fontSize(8.5).text(item.label, x, summaryTop, {
      width: summaryWidth,
      align: "center",
      characterSpacing: 1,
    });
    doc.font("serif").fillColor("#fff8ec").fontSize(15).text(String(item.value), x, summaryTop + 15, {
      width: summaryWidth,
      align: "center",
    });
  }

  // 표지 하단 — 발행 정보
  const issuedAt = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  doc.font("body").fillColor(GOLD_LIGHT, 0.75).fontSize(9).text(`발행일 ${issuedAt}`, 0, pageHeight - 96, {
    width: pageWidth,
    align: "center",
  });
  doc.font("body").fillColor(TEXT_SUB, 0.8).fontSize(8).text(
    "본 리포트는 사주 명리학 기반의 참고용 콘텐츠입니다",
    0, pageHeight - 80,
    { width: pageWidth, align: "center" },
  );

  // ════════════════ 2페이지부터: 본문 ════════════════
  doc.addPage();

  // 오행 분포 차트
  drawSectionHeading("오행 분포", "五行 分布");
  const balance = (result.elementBalance ?? {}) as Record<string, number>;
  const elementOrder = ["목", "화", "토", "금", "수"];
  const maxValue = Math.max(1, ...elementOrder.map((k) => Number(balance[ELEMENT_KEY_EN[k]]) || 0));
  const chartTop = doc.y;
  const rowHeight = 24;
  const labelWidth = 64;
  const valueWidth = 30;
  const trackWidth = contentWidth - labelWidth - valueWidth - 16;

  for (const [index, key] of elementOrder.entries()) {
    const y = chartTop + index * rowHeight;
    const value = Number(balance[ELEMENT_KEY_EN[key]]) || 0;
    const color = ELEMENT_COLORS[key];
    doc.save();
    doc.font("serif").fillColor(color).fontSize(12).text(ELEMENT_HANJA[key], margin, y + 2, { lineBreak: false });
    doc.font("body").fillColor(TEXT_BODY).fontSize(10).text(key, margin + 20, y + 4, { lineBreak: false });
    doc.roundedRect(margin + labelWidth, y + 3, trackWidth, 11, 5.5).fill("#efe5cd");
    const fillWidth = Math.max(6, (value / maxValue) * trackWidth);
    if (value > 0) {
      doc.roundedRect(margin + labelWidth, y + 3, fillWidth, 11, 5.5).fill(color);
    }
    doc.font("bold").fillColor(TEXT_BODY).fontSize(9.5).text(String(value), margin + labelWidth + trackWidth + 8, y + 4, { lineBreak: false });
    doc.restore();
  }
  doc.y = chartTop + elementOrder.length * rowHeight + 6;

  // 많은/부족한 오행 캡션
  doc.font("body").fillColor(TEXT_SUB).fontSize(9.5).text(
    `강한 기운 — ${result.dominantElement ?? "미확인"}    ·    부족한 기운 — ${result.lackingElement ?? "미확인"}`,
    margin, doc.y,
    { width: contentWidth },
  );
  doc.y += 24;

  // 대운 타임라인
  const daeunPeriods: Array<{ stem?: string; branch?: string; startAge?: number; endAge?: number }> =
    Array.isArray(result.daeun?.periods) ? result.daeun.periods.slice(0, 8) : [];
  if (daeunPeriods.length > 0) {
    drawSectionHeading("대운의 흐름", "大運");
    const laneTop = doc.y;
    const boxGap = 6;
    const boxWidth = (contentWidth - boxGap * (daeunPeriods.length - 1)) / daeunPeriods.length;
    const boxHeight = 64;
    const nowYear = new Date().getFullYear();
    const currentAge = typeof birthInfo.year === "number" ? nowYear - birthInfo.year + 1 : -1;

    for (const [index, period] of daeunPeriods.entries()) {
      const x = margin + index * (boxWidth + boxGap);
      const isCurrent =
        typeof period.startAge === "number" &&
        typeof period.endAge === "number" &&
        currentAge >= period.startAge &&
        currentAge <= period.endAge;
      doc.save();
      doc.roundedRect(x, laneTop, boxWidth, boxHeight, 8).fillAndStroke(
        isCurrent ? "#f3e7c8" : CARD,
        isCurrent ? GOLD_DARK : CARD_BORDER,
      );
      doc.font("body").fillColor(isCurrent ? GOLD_DARK : TEXT_SUB).fontSize(7.5).text(
        `${period.startAge ?? "?"}~${period.endAge ?? "?"}세`,
        x, laneTop + 9,
        { width: boxWidth, align: "center" },
      );
      doc.font("serif").fillColor(TEXT).fontSize(15).text(
        `${stemHanja(period.stem)}${branchHanja(period.branch)}`,
        x, laneTop + 23,
        { width: boxWidth, align: "center" },
      );
      doc.font("body").fillColor(TEXT_SUB).fontSize(8).text(
        `${period.stem ?? "?"}${period.branch ?? "?"}${isCurrent ? " · 현재" : ""}`,
        x, laneTop + 45,
        { width: boxWidth, align: "center" },
      );
      doc.restore();
    }
    doc.y = laneTop + boxHeight + 26;
  }

  // ─── 인사이트 섹션 카드 ───
  const drawInsightCard = (titleText: string, hanja: string, bodyText: string, accent: string) => {
    doc.font("body").fontSize(10.5);
    const textWidth = contentWidth - 44;
    const bodyHeight = doc.heightOfString(bodyText, {
      width: textWidth,
      lineGap: 5,
    });
    const cardHeightInner = bodyHeight + 60;

    ensureSpace(cardHeightInner + 14);

    const x = margin;
    const y = doc.y;

    doc.save();
    doc.roundedRect(x, y, contentWidth, cardHeightInner, 12).fillAndStroke(CARD, CARD_BORDER);
    doc.roundedRect(x, y + 12, 3.5, cardHeightInner - 24, 1.75).fill(accent);
    doc.restore();

    doc.font("serif").fillColor(TEXT).fontSize(13.5).text(titleText, x + 22, y + 16, { lineBreak: false });
    const tWidth = doc.widthOfString(titleText);
    doc.font("serif").fillColor(accent).fontSize(9.5).text(hanja, x + 22 + tWidth + 8, y + 19.5, { lineBreak: false });
    doc.font("body").fillColor(TEXT_BODY).fontSize(10.5).text(bodyText, x + 22, y + 40, {
      width: textWidth,
      lineGap: 5,
    });

    doc.y = y + cardHeightInner + 14;
  };

  drawSectionHeading("운세 풀이", "解說");
  for (const section of sections) {
    drawInsightCard(section.title, section.hanja, section.body, section.accent);
  }

  // 안내 문구
  const disclaimer =
    "참고용 안내: 명해원의 사주 분석 결과는 참고용 콘텐츠이며, 의료·법률·투자·진로·결혼 등 중요한 의사결정을 대신하지 않습니다.";
  doc.font("body").fontSize(9);
  const disclaimerHeight = doc.heightOfString(disclaimer, {
    width: contentWidth - 36,
    lineGap: 4,
  });
  ensureSpace(disclaimerHeight + 34);
  const dy = doc.y;
  doc.save();
  doc.roundedRect(margin, dy, contentWidth, disclaimerHeight + 24, 10).fill("#efe7d4");
  doc.restore();
  doc.font("body").fillColor("#6b5b45").fontSize(9).text(disclaimer, margin + 18, dy + 12, {
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
