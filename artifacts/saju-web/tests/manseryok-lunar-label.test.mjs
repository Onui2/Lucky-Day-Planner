import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCalendarSpecialCounts,
  matchesCalendarFilter,
  normalizeCalendarFilter,
} from "../src/lib/manseryok-calendar.ts";

const source = readFileSync(new URL("../src/pages/manseryok.tsx", import.meta.url), "utf8");

test("monthly manseryok keeps compact lunar date visible on mobile", () => {
  const lunarLabel = source.match(/<span\s+className="mb-0\.5 block[^\"]*"[\s\S]*?title=\{`음력 \$\{dayData\.lunar\}`\}[\s\S]*?음 \{dayData\.lunar\}[\s\S]*?<\/span>/)?.[0];
  assert.ok(lunarLabel, "compact lunar label should be rendered in each day card");
  assert.doesNotMatch(lunarLabel, /hidden/);
  assert.match(lunarLabel, /text-\[9px\]/);
  assert.doesNotMatch(lunarLabel, /text-\[(?:7|8)px\]/);
});

test("calendar feature filters count, match, and reset empty categories", () => {
  const days = [
    { noSonDay: true },
    { holiday: "광복절" },
    { solarTerm: "입추" },
    { noSonDay: true, holiday: "설날" },
  ];
  const counts = getCalendarSpecialCounts(days);

  assert.deepEqual(counts, { all: 4, noSon: 2, holiday: 2, solarTerm: 1 });
  assert.equal(matchesCalendarFilter(days[0], "noSon"), true);
  assert.equal(matchesCalendarFilter(days[0], "holiday"), false);
  assert.equal(normalizeCalendarFilter("solarTerm", counts), "solarTerm");
  assert.equal(
    normalizeCalendarFilter("solarTerm", getCalendarSpecialCounts([{ noSonDay: true }])),
    "all",
  );
});

test("calendar cards keep special-day controls and selection states wired", () => {
  assert.match(source, /disabled=\{unavailable\}/);
  assert.match(source, /aria-pressed=\{isSelected\}/);
  assert.match(source, /!matchesActiveFilter && !isSelected/);
  assert.match(source, /dayData\.noSonDay[\s\S]*손없음/);
  assert.match(source, /dayData\.holiday[\s\S]*calendarDataMessage/);
});
