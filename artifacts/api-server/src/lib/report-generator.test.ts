import assert from "node:assert/strict";
import test from "node:test";

import PDFDocument from "pdfkit";
import { buildSajuReportHtml, generateSajuReportPdf, getReportPillars, getSajuReportSections } from "./report-generator.js";

const result = {
  yearPillar: { heavenlyStem: "갑", earthlyBranch: "자" },
  monthPillar: { heavenlyStem: "을", earthlyBranch: "축" },
  dayPillar: { heavenlyStem: "병", earthlyBranch: "인" },
  hourPillar: { heavenlyStem: "정", earthlyBranch: "묘" },
};

test("report pillars use the traditional hour-day-month-year display order", () => {
  assert.deepEqual(
    getReportPillars(result).map(({ label, hanjaLabel }) => [label, hanjaLabel]),
    [
      ["시주", "時柱"],
      ["일주", "日柱"],
      ["월주", "月柱"],
      ["년주", "年柱"],
    ],
  );
});

test("report tiers keep history and annual details exclusive to full", () => {
  const fixture = {
    ...result,
    historyAnalysis: { summary: "과거", years: [{ year: 1990, age: 1, headline: "어린 시절", summary: "회고 근거" }] },
    luckFlowAnalysis: { annual: [{ year: 2027, score: 60, level: "참고", summary: "연간 근거", advice: "확인할 행동" }] },
  };
  const basic = getSajuReportSections(fixture, "basic");
  const detail = getSajuReportSections(fixture, "detail");
  const full = getSajuReportSections(fixture, "full");
  assert.ok(basic.some((section) => section.title === "성격 분석"));
  assert.ok(!basic.some((section) => section.title === "직업운"));
  assert.ok(detail.some((section) => section.title === "직업운"));
  assert.ok(detail.some((section) => section.title === "재물과 생활 관리"));
  assert.ok(!detail.some((section) => section.title.includes("1990년") || section.title.includes("2027년")));
  assert.ok(full.some((section) => section.title === "1990년 · 1세"));
  assert.ok(full.some((section) => section.title === "2027년 연간 흐름"));
  assert.ok(!buildSajuReportHtml("기본", fixture, "basic").includes("연간 근거"));
  assert.ok(buildSajuReportHtml("종합", fixture, "full").includes("연간 근거"));
});

test("selected concern leads every tier with evidence, reality checks and action", () => {
  for (const reportFocus of ["career", "money", "relationship"]) {
    for (const tier of ["basic", "detail", "full"] as const) {
      const [first] = getSajuReportSections({ ...result, reportFocus }, tier);
      assert.match(first.body, /개인 해석 근거:/);
      assert.match(first.body, /현실에서 확인할 조건:/);
      assert.match(first.body, /다음 행동:/);
      assert.match(first.body, /일주 병인/);
    }
  }
  assert.match(getSajuReportSections({ ...result, reportFocus: "career" })[0].title, /이직/);
  assert.match(getSajuReportSections({ ...result, reportFocus: "money" })[0].title, /돈 고민/);
  assert.match(getSajuReportSections({ ...result, reportFocus: "relationship" })[0].title, /연애/);
});

test("calculation basis includes actual resolution method and preserved options", () => {
  const html = buildSajuReportHtml("계산 기준", {
    ...result,
    calculationBasis: {
      method: "명시된 보정 방법", timeZone: "Asia/Seoul", totalCorrectionMinutes: -32,
      solarDate: { year: 2023, month: 3, day: 22 },
      pillarComparison: { summary: "시주 변경", notes: ["음력 윤달 변환", "야자시 기준 선택"] },
    },
  }, "basic");
  for (const content of ["명시된 보정 방법", "Asia/Seoul", "2023년 3월 22일", "시주 변경", "음력 윤달 변환", "야자시 기준 선택", "-32분"]) {
    assert.ok(html.includes(content), content);
  }
});

test("actual PDF splits oversized cards and selects daeun by Seoul date bounds", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2022-11-29T12:00:00+09:00") });
  const textCalls: string[] = [];
  const cardBounds: Array<{ bottom: number; pageBottom: number }> = [];
  const originalText = PDFDocument.prototype.text;
  const originalRoundedRect = PDFDocument.prototype.roundedRect;
  t.mock.method(PDFDocument.prototype, "text", function (this: PDFKit.PDFDocument, ...args: any[]) {
    textCalls.push(String(args[0]));
    return (originalText as Function).apply(this, args);
  });
  t.mock.method(PDFDocument.prototype, "roundedRect", function (this: PDFKit.PDFDocument, ...args: any[]) {
    if (args[0] === 48 && args[2] === this.page.width - 96 && args[4] === 12) {
      cardBounds.push({ bottom: args[1] + args[3], pageBottom: this.page.height - 64 });
    }
    return (originalRoundedRect as Function).apply(this, args);
  });
  const generated = await generateSajuReportPdf("경계 검증", {
    ...result,
    birthInfo: { year: 1990, month: 12, day: 31, gender: "male", calendarType: "solar" },
    fortune: "긴 본문 경계 확인. ".repeat(300),
    daeun: { periods: [
      { stem: "갑", branch: "자", startAge: 22, endAge: 31, startDate: "2012-11-30", endDate: "2022-11-29" },
      { stem: "을", branch: "축", startAge: 32, endAge: 41, startDate: "2022-11-30", endDate: "2032-11-29" },
    ] },
  }, "detail");
  assert.ok(Buffer.from(generated.fileDataBase64, "base64").subarray(0, 5).equals(Buffer.from("%PDF-")));
  assert.ok(textCalls.includes("갑자 · 현재"));
  assert.ok(!textCalls.includes("을축 · 현재"));
  assert.ok(textCalls.includes("핵심 요약 (계속)"));
  assert.ok(cardBounds.length > 0);
  assert.ok(cardBounds.every((card) => card.bottom <= card.pageBottom + 0.01), "cards must end before the footer");
  textCalls.length = 0;
  await generateSajuReportPdf("스냅샷 기준일", {
    ...result, reportAsOfDate: "2022-11-30",
    birthInfo: { year: 1990, month: 12, day: 31, gender: "male", calendarType: "solar" },
    daeun: { periods: [
      { stem: "갑", branch: "자", startAge: 22, endAge: 31, startDate: "2012-11-30", endDate: "2022-11-29" },
      { stem: "을", branch: "축", startAge: 32, endAge: 41, startDate: "2022-11-30", endDate: "2032-11-29" },
    ] },
  }, "detail");
  assert.ok(textCalls.includes("을축 · 현재"));
  assert.ok(!textCalls.includes("갑자 · 현재"));
});

test("HTML report renders the same hour-day-month-year order as the PDF", () => {
  const html = buildSajuReportHtml("테스트", result);
  const pillarSectionStart = html.indexOf(
    '<section style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">',
  );
  const pillarSectionEnd = html.indexOf("</section>", pillarSectionStart);
  const pillarSection = html.slice(pillarSectionStart, pillarSectionEnd);
  const labels = ["시주", "일주", "월주", "년주"];

  assert.ok(pillarSectionStart >= 0, "pillar card section must exist");
  for (let index = 1; index < labels.length; index += 1) {
    assert.ok(
      pillarSection.indexOf(labels[index - 1]) <
        pillarSection.indexOf(labels[index]),
      `${labels[index - 1]} must appear before ${labels[index]}`,
    );
  }
});
