import {
  countElements,
  getAuxiliaryAnalysis,
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
  getJohuAnalysis,
  getLoveText,
  getLuckyColors,
  getLuckyDirections,
  getLuckyNumbers,
  getLuckFlowAnalysis,
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
  getShinsalTransitActivations,
  getSinGangYak,
  getTenGodDistribution,
  getYearPillar,
  getYongsin,
  getYongsinItems,
} from "./saju-calculator.js";
import {
  resolveBirthInput,
  type BirthCalculationOptions,
} from "./birth-resolution.js";
import {
  getBirthTimeCandidateAnalysis,
  getDaeunTransitionAnalysis,
  getFamilyRoleAnalysis,
  getHiddenStemPowerAnalysis,
  getIntegratedLuckTimeline,
  getMultiUsefulGodAnalysis,
  getStemTransformationAnalysis,
} from "./saju-advanced.js";

export interface SajuBirthInput extends BirthCalculationOptions {
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
  const calculationBasis = resolveBirthInput(input);
  const year = calculationBasis.adjusted.year;
  const month = calculationBasis.adjusted.month;
  const day = calculationBasis.adjusted.day;
  const hour = calculationBasis.adjusted.hour;
  const minute = calculationBasis.adjusted.minute;

  const sajuYearNum = getSajuYear(year, month, day, hour, minute);
  const yearPillar = getYearPillar(sajuYearNum);
  const monthPillar = getMonthPillar(year, month, day, hour, minute);
  const dayPillar = getDayPillar(
    calculationBasis.dayPillarDate.year,
    calculationBasis.dayPillarDate.month,
    calculationBasis.dayPillarDate.day,
  );
  const hourPillar = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;

  const pillars = [yearPillar, monthPillar, dayPillar];
  if (hourPillar) {
    pillars.push(hourPillar);
  }

  const elementBalance = countElements(pillars);
  const { dominant, lacking } = getElementStats(elementBalance);
  const dayElement = dayPillar.stemElement;
  const yongsin = getYongsin(elementBalance, dayElement);
  const daeun = getDaeun(year, month, day, input.gender, yearPillar, monthPillar, hour, minute);
  const seun = getSeun(year, 30);
  const sinGangYak = getSinGangYak(yearPillar, monthPillar, dayPillar, hourPillar);
  const geokguk = getGeokguk(
    dayPillar.stem,
    { branch: dayPillar.branch },
    elementBalance,
    [yearPillar, monthPillar, dayPillar, hourPillar],
  );
  const shinsal = getShinsal(yearPillar, monthPillar, dayPillar, hourPillar, dayPillar.stem, input.gender);
  const tenGodDistribution = getTenGodDistribution(
    dayPillar.stem,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  );
  const johuAnalysis = getJohuAnalysis(monthPillar, dayPillar, elementBalance);
  const hiddenStemAnalysis = getHiddenStemPowerAnalysis(
    dayPillar.stem,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  );
  const multiYongsinAnalysis = getMultiUsefulGodAnalysis(
    hiddenStemAnalysis,
    johuAnalysis,
    yongsin,
  );
  const stemTransformationAnalysis = getStemTransformationAnalysis(
    hiddenStemAnalysis,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  );
  const familyRoleAnalysis = getFamilyRoleAnalysis(
    input.gender,
    dayPillar.stem,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  );
  const shinsalTransitActivations = getShinsalTransitActivations(
    year,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayPillar.stem,
    daeun,
    seun,
  );
  const auxiliaryAnalysis = getAuxiliaryAnalysis(
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  );
  const luckFlowAnalysis = getLuckFlowAnalysis(
    year,
    dayPillar.stem,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    daeun,
    yongsin,
  );
  const daeunTransitionAnalysis = getDaeunTransitionAnalysis(daeun);
  const integratedLuckTimeline = getIntegratedLuckTimeline(
    year,
    dayPillar.stem,
    [yearPillar, monthPillar, dayPillar, hourPillar],
    multiYongsinAnalysis,
    luckFlowAnalysis,
  );
  const birthTimeCandidateAnalysis = hour === -1
    ? getBirthTimeCandidateAnalysis({
        birthYear: calculationBasis.original.year,
        birthMonth: calculationBasis.original.month,
        birthDay: calculationBasis.original.day,
        birthMinute: calculationBasis.original.minute,
        gender: input.gender,
        calendarType: input.calendarType,
        birthPlace: calculationBasis.birthPlace,
        timeZone: calculationBasis.timeZone,
        longitude: calculationBasis.longitude,
        latitude: calculationBasis.latitude ?? undefined,
        applyTrueSolarTime: calculationBasis.appliedTrueSolarTime,
        dayBoundary: calculationBasis.dayBoundary,
        isLeapMonth: calculationBasis.original.isLeapMonth,
      })
    : null;

  return {
    birthInfo: {
      year: calculationBasis.original.year,
      month: calculationBasis.original.month,
      day: calculationBasis.original.day,
      hour: calculationBasis.original.hour,
      minute: calculationBasis.original.minute,
      gender: input.gender,
      calendarType: input.calendarType,
      isLeapMonth: calculationBasis.original.isLeapMonth,
      birthPlace: calculationBasis.birthPlace,
      timeZone: calculationBasis.timeZone,
      longitude: calculationBasis.longitude,
      latitude: calculationBasis.latitude,
      applyTrueSolarTime: calculationBasis.appliedTrueSolarTime,
      dayBoundary: calculationBasis.dayBoundary,
    },
    calculationBasis,
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
    daeun,
    seun,
    yongsin,
    sinGangYak,
    johuAnalysis,
    hiddenStemAnalysis,
    multiYongsinAnalysis,
    stemTransformationAnalysis,
    familyRoleAnalysis,
    auxiliaryAnalysis,
    luckFlowAnalysis,
    daeunTransitionAnalysis,
    integratedLuckTimeline,
    birthTimeCandidateAnalysis,
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
    geokguk,
    shinsal,
    tenGodDistribution,
    shinsalTransitActivations,
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
