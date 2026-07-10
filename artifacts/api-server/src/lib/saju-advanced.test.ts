import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getBirthTimeCandidateAnalysis,
  getRelationshipTimingAnalysis,
} from "./saju-advanced.js";
import { buildSajuResult } from "./saju-result.js";

test("advanced saju result exposes weighted roots and five useful-god methods", () => {
  const result = buildSajuResult({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 11,
    birthMinute: 30,
    gender: "female",
    calendarType: "solar",
  });

  assert.equal(result.hiddenStemAnalysis.pillars.length, 4);
  assert.equal(result.hiddenStemAnalysis.visibleStems.length, 4);
  assert.ok(result.hiddenStemAnalysis.dayMaster.strengthPercent >= 0);
  assert.equal(result.multiYongsinAnalysis.methods.length, 5);
  assert.equal(new Set(result.multiYongsinAnalysis.methods.map((item) => item.summary)).size, 5);
  assert.match(result.multiYongsinAnalysis.method, /억부·조후·통관·병약/);
});

test("family roles have role-specific interpretation and advice", () => {
  const result = buildSajuResult({
    birthYear: 1988,
    birthMonth: 9,
    birthDay: 3,
    birthHour: 7,
    gender: "male",
    calendarType: "solar",
  });

  const roles = result.familyRoleAnalysis.roles;
  assert.equal(roles.length, 5);
  assert.equal(new Set(roles.map((item) => item.summary)).size, roles.length);
  assert.equal(new Set(roles.map((item) => item.advice)).size, roles.length);
  assert.deepEqual(roles.map((item) => item.key), ["parents", "siblings", "spouse", "children", "career"]);
});

test("integrated timeline contains year, month, day and hour layers", () => {
  const result = buildSajuResult({
    birthYear: 1995,
    birthMonth: 4,
    birthDay: 18,
    birthHour: 16,
    gender: "female",
    calendarType: "solar",
  });

  assert.equal(result.daeunTransitionAnalysis.transitions.length, 8);
  assert.equal(result.integratedLuckTimeline.months.length, 12);
  assert.equal(result.integratedLuckTimeline.selectedMonth.topDays.length, 5);
  assert.ok(result.integratedLuckTimeline.selectedMonth.topDays.every((day) => day.bestHours.length === 3));
  assert.equal(new Set(result.integratedLuckTimeline.months.map((item) => item.summary)).size, 12);
});

test("unknown birth time returns all twelve candidates and separates stable facts", () => {
  const result = buildSajuResult({
    birthYear: 1992,
    birthMonth: 10,
    birthDay: 8,
    birthHour: -1,
    gender: "male",
    calendarType: "solar",
  });

  assert.ok(result.birthTimeCandidateAnalysis);
  assert.equal(result.birthTimeCandidateAnalysis?.candidates.length, 12);
  assert.equal(new Set(result.birthTimeCandidateAnalysis?.candidates.map((item) => item.branch)).size, 12);
  assert.ok(result.birthTimeCandidateAnalysis?.stableFacts.some((item) => item.includes("년주·월주·일주")));
  assert.ok(result.birthTimeCandidateAnalysis?.variableFacts.some((item) => item.includes("시주")));
});

test("past events rank birth-time candidates without presenting an exact answer", () => {
  const analysis = getBirthTimeCandidateAnalysis({
    birthYear: 1992,
    birthMonth: 10,
    birthDay: 8,
    birthMinute: 0,
    gender: "male",
    calendarType: "solar",
  }, [
    { year: 2018, type: "career" },
    { year: 2021, type: "move" },
    { year: 2024, type: "relationship" },
  ]);

  assert.equal(analysis.eventApplied, true);
  assert.deepEqual(
    analysis.candidates.map((item) => item.rank).filter((rank): rank is number => rank !== null).sort((a, b) => a - b),
    Array.from({ length: 12 }, (_, index) => index + 1),
  );
  assert.match(analysis.summary, /확정값이 아니라/);
});

test("relationship timing scores both people independently for ten years", () => {
  const analysis = getRelationshipTimingAnalysis({
    year: 1990,
    month: 6,
    day: 15,
    hour: 11,
    gender: "male",
    calendarType: "solar",
  }, {
    year: 1993,
    month: 2,
    day: 9,
    hour: 18,
    gender: "female",
    calendarType: "solar",
  }, 2026, 10);

  assert.equal(analysis.years.length, 10);
  assert.equal(analysis.bestYears.length, 3);
  assert.equal(analysis.bestMonths.length, 4);
  assert.equal(new Set(analysis.years.map((item) => item.summary)).size, 10);
  assert.ok(analysis.years.every((item) => item.person1Score >= 10 && item.person2Score >= 10));
  assert.match(analysis.method, /체감 격차를 감점/);
});
