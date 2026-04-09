// Manseryok (만세력) - Korean Almanac Calculator

import {
  getYearPillar,
  getMonthPillar,
  getDayPillar,
} from './saju-calculator.js';
import { solarToLunar, formatLunar } from './lunar-calendar.js';

// Korean solar terms (절기) with accurate approximate solar dates per year
// Each entry: [name, approximate month, day range start, day range end]
// The actual dates shift by 1 day each year due to leap years
const SOLAR_TERMS_DATA: Array<{ name: string; month: number; days: number[] }> = [
  { name: '소한', month: 1, days: [5, 6, 7] },
  { name: '대한', month: 1, days: [19, 20, 21] },
  { name: '입춘', month: 2, days: [3, 4, 5] },
  { name: '우수', month: 2, days: [18, 19, 20] },
  { name: '경칩', month: 3, days: [5, 6, 7] },
  { name: '춘분', month: 3, days: [20, 21, 22] },
  { name: '청명', month: 4, days: [4, 5, 6] },
  { name: '곡우', month: 4, days: [19, 20, 21] },
  { name: '입하', month: 5, days: [5, 6, 7] },
  { name: '소만', month: 5, days: [20, 21, 22] },
  { name: '망종', month: 6, days: [5, 6, 7] },
  { name: '하지', month: 6, days: [20, 21, 22] },
  { name: '소서', month: 7, days: [6, 7, 8] },
  { name: '대서', month: 7, days: [22, 23, 24] },
  { name: '입추', month: 8, days: [6, 7, 8] },
  { name: '처서', month: 8, days: [22, 23, 24] },
  { name: '백로', month: 9, days: [7, 8, 9] },
  { name: '추분', month: 9, days: [22, 23, 24] },
  { name: '한로', month: 10, days: [7, 8, 9] },
  { name: '상강', month: 10, days: [22, 23, 24] },
  { name: '입동', month: 11, days: [6, 7, 8] },
  { name: '소설', month: 11, days: [21, 22, 23] },
  { name: '대설', month: 12, days: [6, 7, 8] },
  { name: '동지', month: 12, days: [21, 22, 23] },
];

// More precise solar term dates for specific years (year -> { termName -> day })
const PRECISE_SOLAR_TERMS: Record<number, Record<string, number>> = {
  2020: { '소한':6,'대한':20,'입춘':4,'우수':19,'경칩':5,'춘분':20,'청명':4,'곡우':19,'입하':5,'소만':20,'망종':5,'하지':21,'소서':6,'대서':22,'입추':7,'처서':22,'백로':7,'추분':22,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':21 },
  2021: { '소한':5,'대한':20,'입춘':3,'우수':18,'경칩':5,'춘분':20,'청명':4,'곡우':20,'입하':5,'소만':21,'망종':5,'하지':21,'소서':7,'대서':22,'입추':7,'처서':23,'백로':7,'추분':23,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':22 },
  2022: { '소한':5,'대한':20,'입춘':4,'우수':19,'경칩':6,'춘분':21,'청명':5,'곡우':20,'입하':5,'소만':21,'망종':6,'하지':21,'소서':7,'대서':23,'입추':7,'처서':23,'백로':8,'추분':23,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':22 },
  2023: { '소한':6,'대한':20,'입춘':4,'우수':19,'경칩':6,'춘분':21,'청명':5,'곡우':20,'입하':6,'소만':21,'망종':6,'하지':21,'소서':7,'대서':23,'입추':8,'처서':23,'백로':8,'추분':23,'한로':8,'상강':24,'입동':8,'소설':22,'대설':7,'동지':22 },
  2024: { '소한':6,'대한':20,'입춘':4,'우수':19,'경칩':5,'춘분':20,'청명':4,'곡우':19,'입하':5,'소만':20,'망종':5,'하지':21,'소서':6,'대서':22,'입추':7,'처서':22,'백로':7,'추분':22,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':21 },
  2025: { '소한':5,'대한':20,'입춘':3,'우수':18,'경칩':5,'춘분':20,'청명':4,'곡우':20,'입하':5,'소만':21,'망종':5,'하지':21,'소서':7,'대서':22,'입추':7,'처서':22,'백로':7,'추분':22,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':21 },
  2026: { '소한':5,'대한':20,'입춘':4,'우수':18,'경칩':6,'춘분':20,'청명':5,'곡우':20,'입하':5,'소만':21,'망종':6,'하지':21,'소서':7,'대서':23,'입추':7,'처서':23,'백로':8,'추분':23,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':22 },
  2027: { '소한':5,'대한':20,'입춘':3,'우수':18,'경칩':5,'춘분':20,'청명':5,'곡우':20,'입하':5,'소만':21,'망종':6,'하지':21,'소서':7,'대서':23,'입추':7,'처서':23,'백로':7,'추분':23,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':22 },
  2028: { '소한':5,'대한':20,'입춘':4,'우수':19,'경칩':5,'춘분':20,'청명':4,'곡우':19,'입하':5,'소만':20,'망종':5,'하지':21,'소서':6,'대서':22,'입추':7,'처서':22,'백로':7,'추분':22,'한로':8,'상강':23,'입동':7,'소설':22,'대설':7,'동지':21 },
};

function getSolarTerm(year: number, month: number, day: number): string | undefined {
  const precise = PRECISE_SOLAR_TERMS[year];
  if (precise) {
    for (const term of SOLAR_TERMS_DATA) {
      if (term.month === month && precise[term.name] === day) {
        return term.name;
      }
    }
    return undefined;
  }

  // Fallback for years without precise data
  for (const term of SOLAR_TERMS_DATA) {
    if (term.month === month && term.days.includes(day)) {
      return term.name;
    }
  }
  return undefined;
}

export interface ManseryokDayData {
  solar: string;
  lunar: string;
  lunarLeap: boolean;
  dayGanzi: string;
  dayHeavenlyStem: string;
  dayEarthlyBranch: string;
  dayElement: string;
  dayZodiac: string;
  solarTerm?: string;
  luckyDay: boolean;
  inauspiciousDay: boolean;
  dayDescription?: string;
}

// Lucky/Inauspicious days based on day branch (simplified traditional pattern)
// 인(2), 사(5), 신(8), 해(11) are traditionally lucky (천덕귀인 simplified)
const LUCKY_BRANCH_INDICES = new Set([2, 5, 8, 11]); // 인, 사, 신, 해
// 자(0), 묘(3), 오(6), 유(9) are traditionally more cautious days
const INAUSPICIOUS_BRANCH_INDICES = new Set([0, 3, 6, 9]); // 자, 묘, 오, 유

export function getManseryokDay(year: number, month: number, day: number): ManseryokDayData {
  const dayPillar = getDayPillar(year, month, day);
  const lunarDate = solarToLunar(year, month, day);
  const solarTerm = getSolarTerm(year, month, day);

  const lunarStr = formatLunar(lunarDate);
  const luckyDay = LUCKY_BRANCH_INDICES.has(dayPillar.branchIndex);
  const inauspiciousDay = INAUSPICIOUS_BRANCH_INDICES.has(dayPillar.branchIndex);

  let dayDescription = '';
  if (solarTerm) {
    dayDescription = `${solarTerm} - 절기일`;
  } else if (luckyDay) {
    dayDescription = '길일 - 좋은 일을 시작하기 좋은 날';
  } else if (inauspiciousDay) {
    dayDescription = '주의가 필요한 날 - 중요한 결정은 피하세요';
  }

  return {
    solar: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    lunar: lunarStr,
    lunarLeap: lunarDate.isLeap,
    dayGanzi: `${dayPillar.stem}${dayPillar.branch}`,
    dayHeavenlyStem: dayPillar.stem,
    dayEarthlyBranch: dayPillar.branch,
    dayElement: dayPillar.stemElement,
    dayZodiac: dayPillar.zodiac,
    solarTerm,
    luckyDay,
    inauspiciousDay,
    dayDescription,
  };
}

export function getManseryokMonth(year: number, month: number): ManseryokDayData[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: ManseryokDayData[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(getManseryokDay(year, month, d));
  }

  return days;
}

export function getMonthYearGanzi(year: number, month: number) {
  const yearPillar = getYearPillar(year);
  const monthPillar = getMonthPillar(year, month, 15); // 15일 기준: 해당 월의 대표 절기

  return {
    yearGanzi: `${yearPillar.stem}${yearPillar.branch}년`,
    monthGanzi: `${monthPillar.stem}${monthPillar.branch}월`,
    yearElement: yearPillar.stemElement,
    monthElement: monthPillar.stemElement,
    yearZodiac: yearPillar.zodiac,
  };
}
