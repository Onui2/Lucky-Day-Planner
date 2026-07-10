import { Router } from "express";
import {
  getSajuYear,
  getYearPillar,
  getMonthPillar,
  getDayPillar,
  getHourPillar,
  getDaeun,
  getSeun,
  countElements,
  getYongsin,
  getTenGod,
} from "../lib/saju-calculator.js";
import {
  BirthResolutionError,
  birthOptionsFromRecord,
  resolveBirthInput,
} from "../lib/birth-resolution.js";

const router = Router();

// ─── 공통 상수 ───────────────────────────────────────────────────────────────
const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊",
  기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
const BRANCH_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};
const ELEM_KOR: Record<string, string> = {
  목: "木", 화: "火", 토: "土", 금: "金", 수: "水",
};

function parseBirthBody(body: Record<string, unknown>) {
  const {
    birthYear,
    birthMonth,
    birthDay,
    birthHour = -1,
    birthMinute = 0,
    gender,
  } = body;

  if (!birthYear || !birthMonth || !birthDay || !gender) {
    return null;
  }

  const basis = resolveBirthInput({
    birthYear: Number(birthYear),
    birthMonth: Number(birthMonth),
    birthDay: Number(birthDay),
    birthHour: Number(birthHour),
    birthMinute: Number(birthMinute),
    calendarType: body.calendarType === "lunar" ? "lunar" : "solar",
    ...birthOptionsFromRecord(body),
  });

  return {
    year: basis.adjusted.year,
    month: basis.adjusted.month,
    day: basis.adjusted.day,
    hour: basis.adjusted.hour,
    minute: basis.adjusted.minute,
    dayYear: basis.dayPillarDate.year,
    dayMonth: basis.dayPillarDate.month,
    dayDay: basis.dayPillarDate.day,
    gender: gender as "male" | "female",
    calculationBasis: basis,
  };
}

// ─── POST /daeun — 대운(大運) 목록 조회 ──────────────────────────────────────
/**
 * Body: { birthYear, birthMonth, birthDay, birthHour?, birthMinute?, gender }
 * Returns: 8개 대운 기간 목록 + 현재 대운 정보 + 일간 십신 정보
 */
router.post("/daeun", (req, res) => {
  try {
    const parsed = parseBirthBody(req.body);
    if (!parsed) {
      return res.status(400).json({ error: "필수 입력 값이 누락되었습니다. (birthYear, birthMonth, birthDay, gender)" });
    }

    const { year, month, day, hour, minute, dayYear, dayMonth, dayDay, gender } = parsed;

    const sajuYear = getSajuYear(year, month, day, hour, minute);
    const yearPillar = getYearPillar(sajuYear);
    const monthPillar = getMonthPillar(year, month, day, hour, minute);
    const dayPillar = getDayPillar(dayYear, dayMonth, dayDay);
    const hourPillar = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;

    const daeun = getDaeun(year, month, day, gender, yearPillar, monthPillar, hour, minute);

    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - year;

    // 현재 적용 중인 대운 찾기
    const currentPeriod = daeun.periods.find(
      (p) => currentAge >= p.startAge && currentAge <= p.endAge
    ) ?? null;

    // 다음 대운 찾기
    const nextPeriod = currentPeriod
      ? daeun.periods.find((p) => p.startAge > currentPeriod.endAge) ?? null
      : null;

    // 각 대운에 십신 정보 추가
    const periodsWithTenGod = daeun.periods.map((p) => ({
      ...p,
      stemHanja: STEM_HANJA[p.stem] ?? p.stem,
      branchHanja: BRANCH_HANJA[p.branch] ?? p.branch,
      stemElemHanja: ELEM_KOR[p.stemElement] ?? p.stemElement,
      branchElemHanja: ELEM_KOR[p.branchElement] ?? p.branchElement,
      tenGod: getTenGod(dayPillar.stem, p.stem),
      isCurrent: currentPeriod ? p.startAge === currentPeriod.startAge : false,
    }));

    // 일간 기준 용신
    const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
    const elementBalance = countElements(pillars);
    const { yongsin, geesin } = getYongsin(elementBalance, dayPillar.stemElement);

    return res.json({
      // 사주 기본 정보
      birthInfo: { year, month, day, hour, minute, gender },
      dayMasterStem: dayPillar.stem,
      dayMasterElement: dayPillar.stemElement,
      dayMasterStemHanja: STEM_HANJA[dayPillar.stem] ?? dayPillar.stem,
      yongsin,
      geesin,

      // 대운 방향 정보
      isForward: daeun.isForward,
      startAge: daeun.startAge,
      direction: daeun.isForward ? "순행(順行)" : "역행(逆行)",

      // 대운 목록 (8개 × 10년)
      periods: periodsWithTenGod,

      // 현재 대운
      currentAge,
      currentPeriod: currentPeriod
        ? {
            ...currentPeriod,
            stemHanja: STEM_HANJA[currentPeriod.stem] ?? currentPeriod.stem,
            branchHanja: BRANCH_HANJA[currentPeriod.branch] ?? currentPeriod.branch,
            tenGod: getTenGod(dayPillar.stem, currentPeriod.stem),
            yearsRemaining: currentPeriod.endAge - currentAge,
          }
        : null,

      // 다음 대운
      nextPeriod: nextPeriod
        ? {
            ...nextPeriod,
            stemHanja: STEM_HANJA[nextPeriod.stem] ?? nextPeriod.stem,
            branchHanja: BRANCH_HANJA[nextPeriod.branch] ?? nextPeriod.branch,
            tenGod: getTenGod(dayPillar.stem, nextPeriod.stem),
            yearsUntil: nextPeriod.startAge - currentAge,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof BirthResolutionError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Daeun error:", err);
    return res.status(500).json({ error: "대운 계산 중 오류가 발생했습니다." });
  }
});

// ─── POST /seun — 세운(歲運) 목록 조회 ──────────────────────────────────────
/**
 * Body: { birthYear, birthMonth, birthDay, birthHour?, gender, fromYear?, toYear? }
 * Returns: 연도별 세운 목록 (기본: 현재 -3년 ~ +30년)
 */
router.post("/seun", (req, res) => {
  try {
    const parsed = parseBirthBody(req.body);
    if (!parsed) {
      return res.status(400).json({ error: "필수 입력 값이 누락되었습니다. (birthYear, birthMonth, birthDay, gender)" });
    }

    const { year, month, day, hour, minute, dayYear, dayMonth, dayDay, gender } = parsed;
    const { fromYear, toYear } = req.body as Record<string, unknown>;

    const sajuYear = getSajuYear(year, month, day, hour, minute);
    const yearPillar = getYearPillar(sajuYear);
    const monthPillar = getMonthPillar(year, month, day, hour, minute);
    const dayPillar = getDayPillar(dayYear, dayMonth, dayDay);
    const hourPillar = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;

    const currentYear = new Date().getFullYear();
    const startYear = fromYear ? Number(fromYear) : currentYear - 3;
    const endYear = toYear ? Number(toYear) : currentYear + 30;
    const count = endYear - startYear + 3; // getSeun에서 -3 오프셋이 있으므로 조정

    // 대운과 합산하여 세운에 대운 간지 정보 추가
    const daeun = getDaeun(year, month, day, gender, yearPillar, monthPillar, hour, minute);
    const seuns = getSeun(year, count + 5);

    const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
    const elementBalance = countElements(pillars);
    const { yongsin, geesin } = getYongsin(elementBalance, dayPillar.stemElement);

    // 세운 필터링 및 보강
    const filteredSeuns = seuns
      .filter((s) => s.year >= startYear && s.year <= endYear)
      .map((s) => {
        // 해당 연도에 해당하는 대운 찾기
        const age = s.year - year;
        const daeunPeriod = daeun.periods.find(
          (p) => age >= p.startAge && age <= p.endAge
        );

        // 세운-일간 십신
        const seunTenGod = getTenGod(dayPillar.stem, s.stem);

        // 용신/기신 여부
        const isYongsinYear =
          s.stemElement === yongsin || s.branchElement === yongsin;
        const isGeesinYear =
          s.stemElement === geesin || s.branchElement === geesin;

        return {
          ...s,
          stemHanja: STEM_HANJA[s.stem] ?? s.stem,
          branchHanja: BRANCH_HANJA[s.branch] ?? s.branch,
          stemElemHanja: ELEM_KOR[s.stemElement] ?? s.stemElement,
          branchElemHanja: ELEM_KOR[s.branchElement] ?? s.branchElement,
          tenGod: seunTenGod,
          isYongsinYear,
          isGeesinYear,
          daeun: daeunPeriod
            ? {
                stem: daeunPeriod.stem,
                branch: daeunPeriod.branch,
                stemHanja: STEM_HANJA[daeunPeriod.stem] ?? daeunPeriod.stem,
                branchHanja: BRANCH_HANJA[daeunPeriod.branch] ?? daeunPeriod.branch,
                startAge: daeunPeriod.startAge,
                endAge: daeunPeriod.endAge,
              }
            : null,
        };
      });

    return res.json({
      birthInfo: { year, month, day, hour, minute, gender },
      dayMasterStem: dayPillar.stem,
      dayMasterElement: dayPillar.stemElement,
      yongsin,
      geesin,
      currentYear,
      seuns: filteredSeuns,
    });
  } catch (err) {
    if (err instanceof BirthResolutionError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Seun error:", err);
    return res.status(500).json({ error: "세운 계산 중 오류가 발생했습니다." });
  }
});

// ─── GET /daeun/current — 현재 대운+세운 빠른 조회 ───────────────────────────
/**
 * Query: ?birthYear=&birthMonth=&birthDay=&gender=&birthHour=
 * Returns: 현재 대운 + 현재 세운 + 이번 달 월운 요약
 */
router.get("/daeun/current", (req, res) => {
  try {
    const query = req.query as Record<string, unknown>;
    if (!query.birthYear || !query.birthMonth || !query.birthDay || !query.gender) {
      return res.status(400).json({ error: "birthYear, birthMonth, birthDay, gender 파라미터가 필요합니다." });
    }
    const parsed = parseBirthBody(query);
    if (!parsed) {
      return res.status(400).json({ error: "출생 정보가 올바르지 않습니다." });
    }
    const { year, month, day, hour, minute, dayYear, dayMonth, dayDay, gender: genderTyped } = parsed;

    const sajuYear = getSajuYear(year, month, day, hour, minute);
    const yearPillar = getYearPillar(sajuYear);
    const monthPillar = getMonthPillar(year, month, day, hour, minute);
    const dayPillar = getDayPillar(dayYear, dayMonth, dayDay);
    const hourPillar = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;

    const daeun = getDaeun(year, month, day, genderTyped, yearPillar, monthPillar, hour, minute);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentAge = currentYear - year;

    // 현재 대운
    const currentDaeun = daeun.periods.find(
      (p) => currentAge >= p.startAge && currentAge <= p.endAge
    ) ?? null;

    // 현재 세운
    const seunYearPillar = getYearPillar(currentYear);

    // 현재 월운 기간
    const currentMonthPillar = getMonthPillar(
      now.getFullYear(), now.getMonth() + 1, now.getDate()
    );

    // 용신
    const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
    const elementBalance = countElements(pillars);
    const { yongsin, geesin } = getYongsin(elementBalance, dayPillar.stemElement);

    return res.json({
      // 일간 정보
      dayMasterStem: dayPillar.stem,
      dayMasterStemHanja: STEM_HANJA[dayPillar.stem] ?? dayPillar.stem,
      dayMasterElement: dayPillar.stemElement,
      yongsin,
      geesin,
      isForward: daeun.isForward,
      direction: daeun.isForward ? "순행(順行)" : "역행(逆行)",

      // 현재 대운
      currentAge,
      currentDaeun: currentDaeun
        ? {
            stem: currentDaeun.stem,
            branch: currentDaeun.branch,
            stemHanja: STEM_HANJA[currentDaeun.stem] ?? currentDaeun.stem,
            branchHanja: BRANCH_HANJA[currentDaeun.branch] ?? currentDaeun.branch,
            stemElement: currentDaeun.stemElement,
            branchElement: currentDaeun.branchElement,
            stemElemHanja: ELEM_KOR[currentDaeun.stemElement] ?? currentDaeun.stemElement,
            branchElemHanja: ELEM_KOR[currentDaeun.branchElement] ?? currentDaeun.branchElement,
            tenGod: getTenGod(dayPillar.stem, currentDaeun.stem),
            startAge: currentDaeun.startAge,
            endAge: currentDaeun.endAge,
            startYear: currentDaeun.startYear,
            endYear: currentDaeun.endYear,
            yearsRemaining: currentDaeun.endAge - currentAge,
            fortune: currentDaeun.fortune,
          }
        : null,

      // 현재 세운
      currentSeun: {
        year: currentYear,
        age: currentAge,
        stem: seunYearPillar.stem,
        branch: seunYearPillar.branch,
        stemHanja: STEM_HANJA[seunYearPillar.stem] ?? seunYearPillar.stem,
        branchHanja: BRANCH_HANJA[seunYearPillar.branch] ?? seunYearPillar.branch,
        stemElement: seunYearPillar.stemElement,
        branchElement: seunYearPillar.branchElement,
        tenGod: getTenGod(dayPillar.stem, seunYearPillar.stem),
        isYongsinYear:
          seunYearPillar.stemElement === yongsin ||
          seunYearPillar.branchElement === yongsin,
      },

      // 현재 월건
      currentWolgeon: {
        month: now.getMonth() + 1,
        stem: currentMonthPillar.stem,
        branch: currentMonthPillar.branch,
        stemHanja: STEM_HANJA[currentMonthPillar.stem] ?? currentMonthPillar.stem,
        branchHanja: BRANCH_HANJA[currentMonthPillar.branch] ?? currentMonthPillar.branch,
        stemElement: currentMonthPillar.stemElement,
        branchElement: currentMonthPillar.branchElement,
        tenGod: getTenGod(dayPillar.stem, currentMonthPillar.stem),
      },
    });
  } catch (err) {
    if (err instanceof BirthResolutionError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Daeun current error:", err);
    return res.status(500).json({ error: "현재 대운 조회 중 오류가 발생했습니다." });
  }
});

export default router;
