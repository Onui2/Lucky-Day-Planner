import type { StoredUserProfile } from "@workspace/db";

import type { ManseryokDayData } from "./manseryok.js";
import {
  getElementRelation,
  getProfileRelationContext,
  type ElementRelation,
  type RelationProfile,
} from "./saju-relation.js";

export interface PersonalizedDayBadges {
  lucky: boolean;
  inauspicious: boolean;
  caution: boolean;
  genericLucky: boolean;
  genericCaution: boolean;
}

export interface PersonalizedDayInfo {
  score: number;
  label: string;
  relation: ElementRelation | null;
  badges: PersonalizedDayBadges;
}

export interface PersonalizedFortuneScores {
  overallScore: number;
  moneyScore: number;
  loveScore: number;
  healthScore: number;
  careerScore: number;
}

const ELEMENT_DOMAIN_BOOST: Record<string, {
  money: number;
  love: number;
  health: number;
  career: number;
}> = {
  목: { career: 2, health: 1, love: 0, money: -1 },
  화: { love: 2, career: 1, health: -1, money: 0 },
  토: { money: 2, health: 1, career: 0, love: -1 },
  금: { money: 2, career: 1, health: 0, love: -1 },
  수: { career: 2, health: 1, money: 0, love: 0 },
};

const STRONG_POSITIVE_REL_TYPES = new Set([
  "인성",
  "식상",
  "재성",
  "천간합",
  "지지육합",
  "지지반합",
  "지지삼합",
  "지지방합",
  "지지암합",
]);

const STRONG_NEGATIVE_REL_TYPES = new Set([
  "관살",
  "천간충",
  "지지충",
  "지지형",
  "지지해",
  "지지원진",
  "지지귀문",
]);

function calcDayScore(dayData: ManseryokDayData, relation: ElementRelation | null): number {
  if (!relation) {
    let base = 5;
    if (dayData.luckyDay) base = 7;
    if (dayData.inauspiciousDay) base = 3;
    return base;
  }

  let base = relation.score;
  if (dayData.luckyDay && relation.positive) {
    base = Math.min(10, base + 1);
  }
  if (dayData.inauspiciousDay && !relation.positive) {
    base = Math.max(1, base - 1);
  }
  return base;
}

function scoreLabel(score: number): string {
  if (score >= 9) return "대길";
  if (score >= 7) return "길";
  if (score >= 5) return "평";
  if (score >= 3) return "주의";
  return "흉";
}

function getDayBadges(
  dayData: ManseryokDayData,
  score: number,
  relation: ElementRelation | null,
): PersonalizedDayBadges {
  const strongPositive = Boolean(relation?.type && STRONG_POSITIVE_REL_TYPES.has(relation.type));
  const strongNegative = Boolean(relation?.type && STRONG_NEGATIVE_REL_TYPES.has(relation.type));
  const lucky = score >= 8 || (score >= 7 && Boolean(relation?.positive) && strongPositive);
  const inauspicious =
    score <= 2 || (score <= 3 && Boolean(relation && !relation.positive) && strongNegative);
  const caution =
    !lucky &&
    !inauspicious &&
    (score <= 4 || (Boolean(relation && !relation.positive) && score <= 5));

  return {
    lucky,
    inauspicious,
    caution,
    genericLucky: Boolean(dayData.luckyDay) && !lucky,
    genericCaution: Boolean(dayData.inauspiciousDay) && !inauspicious,
  };
}

export function toRelationProfile(
  profile?: StoredUserProfile | RelationProfile | null,
): RelationProfile | null {
  if (!profile?.dayMasterElement) {
    return null;
  }

  return {
    dayMasterElement: profile.dayMasterElement,
    dayMasterStem: profile.dayMasterStem,
    dayMasterBranch: profile.dayMasterBranch,
    yearStem: profile.yearStem,
    yearBranch: profile.yearBranch,
    monthStem: profile.monthStem,
    monthBranch: profile.monthBranch,
    hourStem: profile.hourStem,
    hourBranch: profile.hourBranch,
  };
}

export function personalizeManseryokDay(
  dayData: ManseryokDayData,
  profile?: StoredUserProfile | RelationProfile | null,
): PersonalizedDayInfo | null {
  const relationProfile = toRelationProfile(profile);
  if (!relationProfile?.dayMasterElement) {
    return null;
  }

  const relation = getElementRelation(
    relationProfile.dayMasterElement,
    dayData.dayElement,
    relationProfile.dayMasterStem,
    dayData.dayHeavenlyStem,
    relationProfile.dayMasterBranch,
    dayData.dayEarthlyBranch,
    getProfileRelationContext(relationProfile),
  );

  const score = calcDayScore(dayData, relation);
  return {
    score,
    label: scoreLabel(score),
    relation,
    badges: getDayBadges(dayData, score, relation),
  };
}

export function getPersonalizedFortuneScores(
  dayData: ManseryokDayData,
  profile?: StoredUserProfile | RelationProfile | null,
): PersonalizedFortuneScores | null {
  const personalized = personalizeManseryokDay(dayData, profile);
  if (!personalized) {
    return null;
  }

  const boost = ELEMENT_DOMAIN_BOOST[dayData.dayElement] ?? {
    money: 0,
    love: 0,
    health: 0,
    career: 0,
  };
  const toScore100 = (adjustment: number) =>
    Math.min(100, Math.max(10, (personalized.score + adjustment) * 10));

  const moneyScore = toScore100(boost.money);
  const loveScore = toScore100(boost.love);
  const healthScore = toScore100(boost.health);
  const careerScore = toScore100(boost.career);

  return {
    overallScore: Math.round((moneyScore + loveScore + healthScore + careerScore) / 4),
    moneyScore,
    loveScore,
    healthScore,
    careerScore,
  };
}
