import assert from "node:assert/strict";
import test from "node:test";
import { getDaeun, getDayPillar, getHourPillar, getLuckFlowAnalysis, getMonthPillar, getYearPillar } from "./saju-calculator.js";

test("AI current daeun switches on the transition date, not age or January 1", () => {
  const year = getYearPillar(1990);
  const month = getMonthPillar(1990, 12, 31, 12, 0);
  const day = getDayPillar(1990, 12, 31);
  const hour = getHourPillar(day.stemIndex, 12);
  const daeun = getDaeun(1990, 12, 31, "male", year, month, 12, 0);
  const flow = (date: string) => getLuckFlowAnalysis(1990, day.stem, year, month, day, hour, daeun,
    { yongsin: "목", heegsin: "수", geesin: "금" }, 2022, 1, date);
  for (const period of daeun.periods) {
    assert.equal(flow(period.startDate).currentDaeunIndex, period.idx);
    assert.equal(flow(period.endDate).currentDaeunIndex, period.idx);
  }
  assert.equal(flow("1990-12-31").currentDaeunIndex, null);
});
