import assert from "node:assert/strict";
import test from "node:test";

import { buildSajuReportHtml, getReportPillars } from "./report-generator.js";

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
