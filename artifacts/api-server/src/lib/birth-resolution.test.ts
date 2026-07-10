import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BirthResolutionError,
  resolveBirthInput,
} from "./birth-resolution.js";

test("lunar new year converts to its solar date", () => {
  const basis = resolveBirthInput({
    birthYear: 2024,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    calendarType: "lunar",
  });

  assert.deepEqual(basis.solarDate, {
    year: 2024,
    month: 2,
    day: 10,
    hour: 12,
    minute: 0,
  });
  assert.equal(basis.lunarConverted, true);
});

test("valid lunar day 30 is not rejected by Gregorian month length", () => {
  const basis = resolveBirthInput({
    birthYear: 2023,
    birthMonth: 2,
    birthDay: 30,
    birthHour: 12,
    calendarType: "lunar",
  });

  assert.deepEqual(basis.dayPillarDate, { year: 2023, month: 3, day: 21 });
});

test("nonexistent leap lunar month returns a user input error", () => {
  assert.throws(
    () => resolveBirthInput({
      birthYear: 2024,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 12,
      calendarType: "lunar",
      isLeapMonth: true,
    }),
    (error) => error instanceof BirthResolutionError && /윤달/.test(error.message),
  );
});

test("Seoul true solar time applies longitude and equation-of-time correction", () => {
  const basis = resolveBirthInput({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 12,
    birthMinute: 0,
    calendarType: "solar",
    birthPlace: "서울",
    timeZone: "Asia/Seoul",
    longitude: 126.978,
    applyTrueSolarTime: true,
  });

  assert.equal(basis.utcOffsetMinutes, 540);
  assert.ok(basis.totalCorrectionMinutes < -30 && basis.totalCorrectionMinutes > -35);
  assert.equal(basis.adjusted.hour, 11);
  assert.equal(basis.adjusted.minute, 27);
});

test("historical Seoul daylight saving time is included", () => {
  const basis = resolveBirthInput({
    birthYear: 1988,
    birthMonth: 7,
    birthDay: 1,
    birthHour: 12,
    calendarType: "solar",
    timeZone: "Asia/Seoul",
    longitude: 126.978,
    applyTrueSolarTime: true,
  });

  assert.equal(basis.dstMinutes, 60);
  assert.equal(basis.utcOffsetMinutes, 600);
  assert.ok(basis.warnings.some((warning) => warning.includes("일광절약시간")));
});

test("late-zi rule advances only the day pillar date at 23:00", () => {
  const basis = resolveBirthInput({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 23,
    birthMinute: 20,
    calendarType: "solar",
    dayBoundary: "late-zi",
  });

  assert.deepEqual(basis.adjusted, { year: 1990, month: 6, day: 15, hour: 23, minute: 20 });
  assert.deepEqual(basis.dayPillarDate, { year: 1990, month: 6, day: 16 });
  assert.equal(basis.dayShiftedByLateZi, true);
});
