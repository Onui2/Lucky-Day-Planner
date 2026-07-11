import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicSharePayload } from "./share-snapshot.js";

const result = {
  birthInfo: { year: 1998, month: 4, day: 26, hour: 12, gender: "male" },
  hourPillar: { heavenlyStem: "정", earthlyBranch: "묘" },
  dayPillar: { heavenlyStem: "병", earthlyBranch: "인" },
  monthPillar: { heavenlyStem: "을", earthlyBranch: "축" },
  yearPillar: { heavenlyStem: "갑", earthlyBranch: "자" },
  elementBalance: { wood: 2, fire: 3, earth: 1, metal: 0, water: 2 },
  fortune: "좋은 흐름입니다.",
};

test("share payload omits personal fields by default", () => {
  const payload = buildPublicSharePayload({ name: "홍길동", result }, {});
  assert.equal(payload.name, undefined);
  assert.equal(payload.birthInfo, undefined);
  assert.equal(payload.pillars, undefined);
  assert.ok(payload.elements);
  assert.ok(payload.summary);
});

test("share payload exposes only explicitly selected personal fields", () => {
  const payload = buildPublicSharePayload(
    { name: "홍길동", result },
    { name: true, birthInfo: false, pillars: true, elements: false, summary: true },
  );
  assert.equal(payload.name, "홍길동");
  assert.equal(payload.birthInfo, undefined);
  assert.equal(payload.elements, undefined);
  assert.deepEqual(
    (payload.pillars as Array<{ label: string }>).map((item) => item.label),
    ["시주", "일주", "월주", "년주"],
  );
});
