import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getAuxiliaryAnalysis,
  getDaeun,
  getGanzi,
  getLuckFlowAnalysis,
  getMonthPillar,
  getNayin,
  getSajuYear,
  getYearPillar,
} from "./saju-calculator.js";
import { buildSajuResult } from "./saju-result.js";

test("daeun start age uses same-day ipchun minute boundary", () => {
  const birth = { year: 1998, month: 2, day: 4, hour: 8, minute: 23 } as const;
  const sajuYear = getSajuYear(birth.year, birth.month, birth.day, birth.hour, birth.minute);
  const yearPillar = getYearPillar(sajuYear);
  const monthPillar = getMonthPillar(birth.year, birth.month, birth.day, birth.hour, birth.minute);

  const daeun = getDaeun(
    birth.year,
    birth.month,
    birth.day,
    "female",
    yearPillar,
    monthPillar,
    birth.hour,
    birth.minute,
  );

  assert.equal(daeun.isForward, true);
  assert.equal(daeun.startAge, 1);
  assert.equal(daeun.periods[0]?.startAge, 1);
  assert.equal(daeun.periods[0]?.endAge, 10);
});

test("saju year switches at the 1998 ipchun minute", () => {
  assert.equal(getSajuYear(1998, 2, 4, 8, 23), 1997);
  assert.equal(getSajuYear(1998, 2, 4, 10, 30), 1998);
});

test("saju month switches at the 1998 ipchun minute", () => {
  assert.equal(getMonthPillar(1998, 2, 4, 9, 0).branchIndex, 1);
  assert.equal(getMonthPillar(1998, 2, 4, 10, 30).branchIndex, 2);
});

test("nayin maps both ends of the sexagenary cycle", () => {
  assert.deepEqual(getNayin(0, 0), {
    name: "해중금",
    hanja: "海中金",
    element: "금",
    image: "깊은 물속 금처럼 재능이 겉보다 늦게 드러나며, 안전한 기반을 얻을수록 가치가 선명해집니다.",
  });
  assert.equal(getNayin(9, 11).name, "대해수");
  assert.equal(getNayin(9, 11).element, "수");
});

test("auxiliary palaces use explicit taewon and hidden-palace rules", () => {
  const analysis = getAuxiliaryAnalysis(
    getGanzi(34), // 무인년
    getGanzi(54), // 무오월
    getGanzi(0),  // 갑자일
    getGanzi(50), // 갑인시
  );

  assert.equal(analysis.taewon.stem + analysis.taewon.branch, "기유");
  assert.ok(analysis.minggung);
  assert.ok(analysis.shingung);
  assert.equal(analysis.minggung.stem + analysis.minggung.branch, "신유");
  assert.equal(analysis.shingung.stem + analysis.shingung.branch, "신유");
  assert.equal(analysis.requiresBirthTime, false);
  assert.equal(analysis.nayinPillars.length, 4);
  assert.equal(new Set(analysis.nayinPillars.map((item) => item.reading)).size, 4);
});

test("auxiliary analysis keeps taewon when birth time is unknown", () => {
  const analysis = getAuxiliaryAnalysis(getGanzi(34), getGanzi(54), getGanzi(0), null);

  assert.equal(analysis.taewon.name, "태원");
  assert.equal(analysis.minggung, null);
  assert.equal(analysis.shingung, null);
  assert.equal(analysis.requiresBirthTime, true);
  assert.equal(analysis.nayinPillars.length, 3);
});

test("luck flow combines yongsin, daeun, and natal interactions per year", () => {
  const flow = getLuckFlowAnalysis(
    1990,
    "갑",
    getGanzi(2),
    getGanzi(14),
    getGanzi(0), // 자(子) 일지: 2026 오(午) 세운과 충
    getGanzi(50),
    {
      periods: [{
        idx: 1,
        startAge: 0,
        endAge: 99,
        startYear: 1990,
        endYear: 2089,
        stem: "병",
        branch: "인",
        stemElement: "화",
        branchElement: "목",
      }],
    },
    { yongsin: "화", heegsin: "목", geesin: "수" },
    2026,
    10,
  );

  assert.equal(flow.annual.length, 10);
  assert.equal(flow.annual[0]?.year, 2026);
  assert.equal(flow.annual[0]?.daeunLabel, "병인");
  assert.ok(flow.annual[0]?.interactions.some((item) => item.type === "지지충" && item.target === "일주"));
  assert.equal(new Set(flow.annual.map((item) => item.summary)).size, 10);
  assert.match(flow.periods[0]?.summary ?? "", /0~99세 병인 대운/);
});

test("saju result exposes auxiliary and ten-year flow analyses", () => {
  const result = buildSajuResult({
    birthYear: 1998,
    birthMonth: 2,
    birthDay: 4,
    birthHour: 10,
    birthMinute: 30,
    gender: "female",
    calendarType: "solar",
  });

  assert.equal(result.auxiliaryAnalysis.nayinPillars.length, 4);
  assert.ok(result.auxiliaryAnalysis.minggung);
  assert.equal(result.luckFlowAnalysis.annual.length, 10);
  assert.equal(result.luckFlowAnalysis.periods.length, 8);
});
