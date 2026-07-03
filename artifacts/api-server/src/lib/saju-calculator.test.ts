import { test } from "node:test";
import assert from "node:assert/strict";

import { getDaeun, getMonthPillar, getSajuYear, getYearPillar } from "./saju-calculator.js";

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
