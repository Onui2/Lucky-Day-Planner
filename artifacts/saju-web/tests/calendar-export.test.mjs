import assert from "node:assert/strict";
import test from "node:test";

import { buildGoogleCalendarUrl, buildIcs, zonedEventStart } from "../src/lib/calendar-export.ts";

const event = {
  title: "추천 일정",
  description: "길일 일정",
  year: 2026,
  month: 9,
  day: 22,
  startHour: 12,
  timeZone: "UTC",
};

for (const [timeZone, expected] of [
  ["UTC", "2026-09-22T12:00:00.000Z"],
  ["GMT", "2026-09-22T12:00:00.000Z"],
  ["Asia/Seoul", "2026-09-22T03:00:00.000Z"],
  ["America/New_York", "2026-09-22T16:00:00.000Z"],
]) {
  test(`calendar export preserves valid time zone ${timeZone}`, () => {
    const input = { ...event, timeZone };
    assert.equal(zonedEventStart(input).toISOString(), expected);
    const url = new URL(buildGoogleCalendarUrl(input));
    assert.equal(url.searchParams.get("ctz"), timeZone);
    assert.equal(url.searchParams.get("dates").split("/")[0], expected.replace(/[-:]/g, "").replace(".000", ""));
    assert.ok(buildIcs(input).includes(`DTSTART;TZID=${timeZone}:20260922T120000`));
  });
}

test("invalid or injected time zones fall back to Seoul", () => {
  for (const timeZone of ["Invalid/Zone", "UTC\r\nSUMMARY:injected", ""]) {
    const input = { ...event, timeZone };
    assert.equal(zonedEventStart(input).toISOString(), "2026-09-22T03:00:00.000Z");
    assert.equal(new URL(buildGoogleCalendarUrl(input)).searchParams.get("ctz"), "Asia/Seoul");
    assert.ok(buildIcs(input).includes("DTSTART;TZID=Asia/Seoul:"));
    assert.ok(!buildIcs(input).includes("SUMMARY:injected"));
  }
});
