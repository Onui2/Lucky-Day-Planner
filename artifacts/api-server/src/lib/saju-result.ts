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
  type DayBoundaryRule,
  type ResolvedBirthDateTime,
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

type PillarResponse = ReturnType<typeof makePillarResponse>;

const COMPARISON_PILLARS = [
  ["year", "년주"],
  ["month", "월주"],
  ["day", "일주"],
  ["hour", "시주"],
] as const;

function addComparisonDays(value: Pick<ResolvedBirthDateTime, "year" | "month" | "day">, amount: number) {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function buildPillarSnapshot(value: ResolvedBirthDateTime, dayBoundary: DayBoundaryRule) {
  const sajuYearNum = getSajuYear(value.year, value.month, value.day, value.hour, value.minute);
  const yearPillar = getYearPillar(sajuYearNum);
  const monthPillar = getMonthPillar(value.year, value.month, value.day, value.hour, value.minute);
  const dayPillarDate = value.hour >= 0 && dayBoundary === "late-zi" && value.hour === 23
    ? addComparisonDays(value, 1)
    : { year: value.year, month: value.month, day: value.day };
  const dayPillar = getDayPillar(dayPillarDate.year, dayPillarDate.month, dayPillarDate.day);
  const hourPillar = value.hour >= 0 ? getHourPillar(dayPillar.stemIndex, value.hour) : null;

  return {
    dateTime: value,
    dayPillarDate,
    year: makePillarResponse(yearPillar),
    month: makePillarResponse(monthPillar),
    day: makePillarResponse(dayPillar),
    hour: makePillarResponse(hourPillar),
  };
}

function hasPillarChanged(before: PillarResponse, after: PillarResponse) {
  return before.heavenlyStem !== after.heavenlyStem || before.earthlyBranch !== after.earthlyBranch;
}

function buildPillarComparison(calculationBasis: ReturnType<typeof resolveBirthInput>) {
  const before = buildPillarSnapshot(calculationBasis.solarDate, "midnight");
  const after = buildPillarSnapshot(calculationBasis.adjusted, calculationBasis.dayBoundary);
  const changedPillars = COMPARISON_PILLARS
    .filter(([key]) => hasPillarChanged(before[key], after[key]))
    .map(([key, label]) => ({
      key,
      label,
      before: `${before[key].heavenlyStem}${before[key].earthlyBranch}`,
      after: `${after[key].heavenlyStem}${after[key].earthlyBranch}`,
    }));

  return {
    beforeLabel: "보정 전(양력 민간시·자정 경계)",
    afterLabel: "보정 후(선택 보정 적용)",
    before,
    after,
    changedPillars,
    summary: changedPillars.length > 0
      ? `${changedPillars.map((item) => item.label).join("·")}가 보정 기준에 따라 달라졌습니다.`
      : "진태양시·야자시 기준을 적용해도 네 기둥은 동일합니다.",
    notes: [
      calculationBasis.lunarConverted
        ? `음력${calculationBasis.original.isLeapMonth ? " 윤달" : ""}을 양력 ${calculationBasis.solarDate.year}.${calculationBasis.solarDate.month}.${calculationBasis.solarDate.day}로 변환`
        : "양력 입력값 기준",
      calculationBasis.appliedTrueSolarTime
        ? `진태양시 보정 ${calculationBasis.totalCorrectionMinutes > 0 ? "+" : ""}${calculationBasis.totalCorrectionMinutes}분 적용`
        : "진태양시 보정 미적용",
      calculationBasis.dayShiftedByLateZi
        ? "야자시 기준으로 일주를 다음 날로 계산"
        : calculationBasis.dayBoundary === "late-zi" ? "야자시 기준 선택, 일주 변경 없음" : "자정 기준 일주 계산",
    ],
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
  const calculationBasisWithComparison = {
    ...calculationBasis,
    pillarComparison: buildPillarComparison(calculationBasis),
  };

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
    calculationBasis: calculationBasisWithComparison,
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
