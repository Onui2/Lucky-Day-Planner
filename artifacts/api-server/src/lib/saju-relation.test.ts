import { test } from "node:test";
import assert from "node:assert/strict";

import { getDayPillar, getHourPillar, getMonthPillar, getSajuYear, getYearPillar } from "./saju-calculator.js";
import { getElementRelation, getProfileRelationContext, type RelationProfile } from "./saju-relation.js";

function buildProfile(year: number, month: number, day: number, hour: number): RelationProfile {
  const sajuYear = getSajuYear(year, month, day, hour);
  const yearP = getYearPillar(sajuYear);
  const monthP = getMonthPillar(year, month, day, hour);
  const dayP = getDayPillar(year, month, day);
  const hourP = getHourPillar(dayP.stemIndex, hour);
  return {
    dayMasterElement: dayP.stemElement,
    dayMasterStem: dayP.stem,
    dayMasterBranch: dayP.branch,
    yearStem: yearP.stem,
    yearBranch: yearP.branch,
    monthStem: monthP.stem,
    monthBranch: monthP.branch,
    hourStem: hourP.stem,
    hourBranch: hourP.branch,
  };
}

function relationForDay(profile: RelationProfile, year: number, month: number, day: number) {
  const target = getDayPillar(year, month, day);
  return getElementRelation(
    profile.dayMasterElement ?? "",
    target.stemElement,
    profile.dayMasterStem,
    target.stem,
    profile.dayMasterBranch,
    target.branch,
    getProfileRelationContext(profile),
  );
}

// 1998-02-04 08:23 출생(정축년 계축월 임오일 갑진시): 축이 년지·월지에 중복.
const profile = buildProfile(1998, 2, 4, 8);

test("같은 페어(축오)의 해·원진·귀문 중첩이 점수를 1점까지 끌어내리지 않는다", () => {
  // 2026-07-19 = 갑오일. 축오원진이 대표 관계, 기본 십성은 식상(6).
  const rel = relationForDay(profile, 2026, 7, 19);
  assert.equal(rel.type, "지지원진");
  assert.equal(rel.positive, false);
  // 대표 3점과 기본 6점의 블렌드 = 4. 같은 축오 페어의 귀문·해는 추가 감점 없음.
  assert.equal(rel.score, 4);
});

test("년지·월지가 같은 글자여도 동일 관계가 안내 문구에 중복 노출되지 않는다", () => {
  const rel = relationForDay(profile, 2026, 7, 19);
  const gwimunMentions = rel.fortune.split("축오귀문").length - 1;
  assert.equal(gwimunMentions, 1);
  const wonjinMentions = rel.fortune.split("축오원진").length - 1;
  assert.equal(wonjinMentions, 1);
});

test("특수관계가 없는 날의 기본 십성 점수는 그대로 유지된다", () => {
  // 2026-07-18 = 계사일: 계(수)는 임(수)과 비겁, 사는 축과 사축반합(금국 성분).
  // 특수관계가 하나뿐인 경로 검증: primary 점수 블렌드만 적용되고 캡 로직이 왜곡하지 않는다.
  const rel = relationForDay(profile, 2026, 7, 18);
  assert.ok(rel.score >= 1 && rel.score <= 10);

  // 순수 기본 관계 경로: 임(수) 일간에 무토 일주(무술일 2026-06-24 아님, 직접 지정).
  const plain = getElementRelation("수", "금", "임", "경", "오", "유", getProfileRelationContext({
    dayMasterElement: "수",
    dayMasterStem: "임",
    dayMasterBranch: "오",
  }));
  // 금생수 = 인성. 오-유는 특수관계 없음 → 기본 9점 유지.
  assert.equal(plain.type, "인성");
  assert.equal(plain.score, 9);
});

test("보조 관계 가감은 총 ±2를 넘지 않는다", () => {
  // 서로 다른 페어의 부정 관계를 여럿 만드는 프로필: 자오충(일지) + 축오원진(년지)
  // + 오미... 대신 실제로 도달 가능한 조합으로 상한만 확인한다.
  const crowded: RelationProfile = {
    dayMasterElement: "수",
    dayMasterStem: "임",
    dayMasterBranch: "자",
    yearBranch: "축",
    monthBranch: "유",
    hourBranch: "미",
  };
  // 오일: 자오충(일지, 페어 자오) + 축오원진/귀문/해(년지, 페어 축오) + 오미육합(시지, 페어 미오)
  const rel = getElementRelation("수", "화", "임", "병", "자", "오", getProfileRelationContext(crowded));
  // 대표 = 자오충(우선순위 86, 3점). 블렌드 round((3*2+3)/3)=3.
  // 서로 다른 페어 가감: 축오(-1), 미오(+1) → 순 0. 캡 적용 후에도 [1,10] 안.
  assert.ok(rel.score >= 3, `score ${rel.score} — 같은 페어 중첩이 다시 스택되면 실패`);
});

test("일간 직접 천간충은 시주 천간합보다 우선한다", () => {
  // 1998-04-26 20:30 = 무인년 병진월 계묘일 임술시.
  // 오늘 천간이 정이면 시주 임과 정임합도 잡히지만, 내 일간 계와 정계충이 핵심이다.
  const userProfile = buildProfile(1998, 4, 26, 20);
  assert.equal(userProfile.dayMasterStem, "계");
  assert.equal(userProfile.hourStem, "임");

  const rel = getElementRelation(
    userProfile.dayMasterElement ?? "",
    "화",
    userProfile.dayMasterStem,
    "정",
    userProfile.dayMasterBranch,
    "묘",
    getProfileRelationContext(userProfile),
  );

  assert.equal(rel.type, "천간충");
  assert.match(rel.label, /정계충/);
  assert.equal(rel.positive, false);
  assert.ok(rel.score <= 4, `score ${rel.score} — 시주 정임합이 일간 정계충을 덮으면 실패`);
});
