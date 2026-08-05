import { test } from "node:test";
import assert from "node:assert/strict";

import { getDailyFortune } from "./fortune.js";
import type { RelationProfile } from "./saju-relation.js";

const profileA: RelationProfile = {
  dayMasterElement: "목",
  dayMasterStem: "갑",
  dayMasterBranch: "자",
};

const profileB: RelationProfile = {
  dayMasterElement: "금",
  dayMasterStem: "경",
  dayMasterBranch: "오",
};

test("오늘의 일진 점수가 만세력과 같은 개인화 점수 엔진을 사용한다", () => {
  const generic = getDailyFortune(2026, 8, 5);
  const personalizedA = getDailyFortune(2026, 8, 5, profileA);
  const personalizedB = getDailyFortune(2026, 8, 5, profileB);

  assert.equal(generic.overallScore, 48);
  assert.deepEqual(
    {
      overall: personalizedA.overallScore,
      money: personalizedA.moneyScore,
      love: personalizedA.loveScore,
      health: personalizedA.healthScore,
      career: personalizedA.careerScore,
    },
    { overall: 35, money: 50, love: 20, health: 30, career: 40 },
  );
  assert.deepEqual(
    {
      overall: personalizedB.overallScore,
      money: personalizedB.moneyScore,
      love: personalizedB.loveScore,
      health: personalizedB.healthScore,
      career: personalizedB.careerScore,
    },
    { overall: 85, money: 100, love: 70, health: 80, career: 90 },
  );
});
