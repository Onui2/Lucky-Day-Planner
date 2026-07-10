import {
  countElements,
  getCarefulThings,
  getCareerText,
  getDaeun,
  getDayPillar,
  getDayPillarScore,
  getElementStats,
  getFortuneText,
  getGeokguk,
  getHapChung,
  getHealthText,
  getHourPillar,
  getLoveText,
  getLuckyColors,
  getLuckyDirections,
  getLuckyNumbers,
  getMonthPillar,
  getPersonality,
  getPillarScore,
  getPillarTenGods,
  getSajuYear,
  getSajuSpecialSummary,
  getSamjae,
  getSeun,
  getShadowReading,
  getShinsal,
  getSinGangYak,
  getYearPillar,
  getYongsin,
  getYongsinItems,
} from "./saju-calculator.js";

export interface SajuBirthInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  birthMinute?: number;
  gender: "male" | "female";
  calendarType: "solar" | "lunar";
}

function makePillarResponse(
  pillar:
    | ReturnType<typeof getYearPillar>
    | ReturnType<typeof getMonthPillar>
    | ReturnType<typeof getDayPillar>
    | ReturnType<typeof getHourPillar>
    | null,
) {
  if (!pillar) {
    return {
      heavenlyStem: "?",
      earthlyBranch: "?",
      heavenlyStemElement: "?",
      earthlyBranchElement: "?",
      heavenlyStemKorean: "?",
      earthlyBranchKorean: "?",
      zodiac: "시간 미입력",
      stemIndex: -1,
      branchIndex: -1,
    };
  }

  return {
    heavenlyStem: pillar.stem,
    earthlyBranch: pillar.branch,
    heavenlyStemElement: pillar.stemElement,
    earthlyBranchElement: pillar.branchElement,
    heavenlyStemKorean: pillar.stem,
    earthlyBranchKorean: pillar.branch,
    zodiac: pillar.zodiac,
    stemIndex: pillar.stemIndex,
    branchIndex: pillar.branchIndex,
  };
}

export function buildSajuResult(input: SajuBirthInput) {
  const year = Number(input.birthYear);
  const month = Number(input.birthMonth);
  const day = Number(input.birthDay);
  const hour = input.birthHour === -1 || input.birthHour == null ? -1 : Number(input.birthHour);
  const minute = hour === -1 ? 0 : Number(input.birthMinute ?? 0);

  const sajuYearNum = getSajuYear(year, month, day, hour, minute);
  const yearPillar = getYearPillar(sajuYearNum);
  const monthPillar = getMonthPillar(year, month, day, hour, minute);
  const dayPillar = getDayPillar(year, month, day);
  const hourPillar = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;

  const pillars = [yearPillar, monthPillar, dayPillar];
  if (hourPillar) {
    pillars.push(hourPillar);
  }

  const elementBalance = countElements(pillars);
  const { dominant, lacking } = getElementStats(elementBalance);
  const dayElement = dayPillar.stemElement;
  const yongsin = getYongsin(elementBalance, dayElement);

  return {
    birthInfo: {
      year,
      month,
      day,
      hour,
      minute,
      gender: input.gender,
      calendarType: input.calendarType,
    },
    yearPillar: makePillarResponse(yearPillar),
    monthPillar: makePillarResponse(monthPillar),
    dayPillar: makePillarResponse(dayPillar),
    hourPillar: makePillarResponse(hourPillar),
    elementBalance,
    specialSummary: getSajuSpecialSummary(
      year,
      month,
      day,
      hour,
      minute,
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar,
      elementBalance,
    ),
    dominantElement: dominant,
    lackingElement: lacking,
    dayMasterElement: dayElement,
    dayMasterStem: dayPillar.stem,
    personality: getPersonality(
      dayPillar.stem,
      dayPillar.branch,
      dayElement,
      dayPillar.branchElement,
      dominant,
    ),
    fortune: getFortuneText(
      dayPillar.stem,
      dayPillar.branch,
      dayElement,
      dayPillar.branchElement,
    ),
    shadowReading: getShadowReading(
      dayPillar.stem,
      dayPillar.branch,
      dayElement,
      dayPillar.branchElement,
      dominant,
      lacking,
    ),
    career: getCareerText(
      dayPillar.stem,
      dayPillar.branch,
      dayElement,
      dayPillar.branchElement,
    ),
    love: getLoveText(
      dayPillar.stem,
      dayPillar.branch,
      dayElement,
      dayPillar.branchElement,
    ),
    health: getHealthText(
      dayPillar.stem,
      dayPillar.branch,
      dayElement,
      dayPillar.branchElement,
    ),
    luckyNumbers: getLuckyNumbers(dayPillar.stemIndex, dayPillar.branchIndex),
    luckyColors: getLuckyColors(dayElement, dayPillar.stem),
    luckyDirections: getLuckyDirections(dayElement, dayPillar.stem),
    zodiac: yearPillar.zodiac,
    daeun: getDaeun(year, month, day, input.gender, yearPillar, monthPillar, hour, minute),
    seun: getSeun(year, 30),
    yongsin,
    sinGangYak: getSinGangYak(yearPillar, monthPillar, dayPillar, hourPillar),
    carefulThings: getCarefulThings(dayPillar, monthPillar, yearPillar, elementBalance),
    samjae: getSamjae(yearPillar.branchIndex, new Date().getFullYear()),
    yongsinItems: getYongsinItems(yongsin.yongsin),
    pillarScores: {
      year: getPillarScore(
        yearPillar.stemElement,
        yearPillar.branchElement,
        yongsin.yongsin,
        yongsin.heegsin,
        yongsin.geesin,
      ),
      month: getPillarScore(
        monthPillar.stemElement,
        monthPillar.branchElement,
        yongsin.yongsin,
        yongsin.heegsin,
        yongsin.geesin,
      ),
      day: getPillarScore(
        dayPillar.stemElement,
        dayPillar.branchElement,
        yongsin.yongsin,
        yongsin.heegsin,
        yongsin.geesin,
      ),
      hour: hourPillar
        ? getPillarScore(
            hourPillar.stemElement,
            hourPillar.branchElement,
            yongsin.yongsin,
            yongsin.heegsin,
            yongsin.geesin,
          )
        : null,
    },
    dayPillarScore: getDayPillarScore(
      dayPillar.stemElement,
      dayPillar.branchElement,
      yongsin.yongsin,
      yongsin.heegsin,
      yongsin.geesin,
      elementBalance,
    ),
    geokguk: getGeokguk(dayPillar.stem, { branch: dayPillar.branch }, elementBalance),
    shinsal: getShinsal(yearPillar, monthPillar, dayPillar, hourPillar, dayPillar.stem, input.gender),
    hapChung: getHapChung(yearPillar, monthPillar, dayPillar, hourPillar),
    pillarTenGods: getPillarTenGods(
      dayPillar.stem,
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar,
    ),
  };
}
