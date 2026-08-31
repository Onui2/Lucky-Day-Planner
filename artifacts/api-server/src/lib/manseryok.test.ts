import assert from "node:assert/strict";
import test from "node:test";

import { getManseryokDay, getManseryokMonth, isNoSonDay } from "./manseryok.js";

test("isNoSonDay follows lunar dates ending in nine or zero", () => {
  for (const day of [9, 10, 19, 20, 29, 30]) assert.equal(isNoSonDay(day), true);
  for (const day of [0, 1, 8, 11, 18, 21, 28, 31]) assert.equal(isNoSonDay(day), false);
});

test("monthly manseryok exposes lunar numbers and handless-day flags", () => {
  const month = getManseryokMonth(2026, 9);
  assert.equal(month.length, 30);

  for (const day of month) {
    assert.ok(day.lunarMonth >= 1 && day.lunarMonth <= 12);
    assert.ok(day.lunarDay >= 1 && day.lunarDay <= 30);
    assert.equal(day.noSonDay, isNoSonDay(day.lunarDay));
  }

  assert.ok(month.filter((day) => day.noSonDay).length >= 5);
});

test("monthly manseryok uses accurate lunar dates outside the legacy lookup table", () => {
  const historical = getManseryokDay(1990, 1, 5);
  assert.equal(historical.lunarMonth, 12);
  assert.equal(historical.lunarDay, 9);
  assert.equal(historical.noSonDay, true);

  const future = getManseryokDay(2036, 1, 6);
  assert.equal(future.lunarMonth, 12);
  assert.equal(future.lunarDay, 9);
  assert.equal(future.noSonDay, true);
});

test("unknown-year local solar terms do not expand one term across three dates", () => {
  const september2019 = getManseryokMonth(2019, 9);
  assert.deepEqual(september2019.filter((day) => day.solarTerm), []);

  const september2026 = getManseryokMonth(2026, 9);
  assert.deepEqual(
    september2026.filter((day) => day.solarTerm).map((day) => [day.solar, day.solarTerm]),
    [["2026-09-08", "백로"], ["2026-09-23", "추분"]],
  );
});
