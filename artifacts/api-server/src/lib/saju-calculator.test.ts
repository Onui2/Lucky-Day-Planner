import { test } from "node:test";
import assert from "node:assert/strict";

import { getDaeun, getDayPillar, getMonthPillar, getSajuYear, getYearPillar } from "./saju-calculator.js";

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

test("day pillar rolls forward to the next date for 자시 (23:00-23:59) births", () => {
  const evening = getDayPillar(2024, 3, 15, 22); // still same-day, no rollover
  const jaSi = getDayPillar(2024, 3, 15, 23);    // 자시 -> rolls to 3/16
  const nextDayNoon = getDayPillar(2024, 3, 16, 12);

  assert.notEqual(jaSi.stemIndex, evening.stemIndex);
  assert.equal(jaSi.stemIndex, nextDayNoon.stemIndex);
  assert.equal(jaSi.branchIndex, nextDayNoon.branchIndex);
});

test("day pillar rollover crosses month/year boundaries correctly", () => {
  const jaSi = getDayPillar(2023, 12, 31, 23);
  const newYearNoon = getDayPillar(2024, 1, 1, 12);
  assert.equal(jaSi.stemIndex, newYearNoon.stemIndex);
  assert.equal(jaSi.branchIndex, newYearNoon.branchIndex);
});

test("day pillar with unknown or non-자시 hour does not roll over", () => {
  const unknown = getDayPillar(2024, 3, 15, -1);
  const midnight = getDayPillar(2024, 3, 15, 0);
  const sameDay = getDayPillar(2024, 3, 15);
  assert.equal(unknown.stemIndex, sameDay.stemIndex);
  assert.equal(midnight.stemIndex, sameDay.stemIndex);
});
