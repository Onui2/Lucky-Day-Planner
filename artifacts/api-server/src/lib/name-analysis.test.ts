import assert from "node:assert/strict";
import test from "node:test";

import { analyzeName } from "./name-analysis.js";

test("2-syllable names get a distinct hyeongGyeok and iGyeok reading", () => {
  // Previously both fell back to sv[0]+sv[1] for 2-character names, so
  // addition's commutativity made iGyeok always equal hyeongGyeok exactly —
  // two different fortune categories (직업운 vs 대인관계운) showed byte-for-byte
  // identical text to the user.
  const result = analyzeName("김민");

  assert.notEqual(result.iGyeok, result.hyeongGyeok);
  assert.notDeepEqual(result.iGyeokSuri, result.hyeongGyeokSuri);
});

test("3+ syllable names keep the original hyeongGyeok/iGyeok formula", () => {
  const result = analyzeName("김민준");

  const strokes = result.strokes.map((s) => s.strokes);
  assert.equal(result.hyeongGyeok, strokes[0] + strokes[1]);
  assert.equal(result.iGyeok, strokes[1] + strokes[2]);
});
