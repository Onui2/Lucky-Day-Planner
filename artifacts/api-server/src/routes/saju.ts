import { Router } from "express";
import {
  getSajuYear,
  getYearPillar,
  getMonthPillar,
  getDayPillar,
  getHourPillar,
  countElements,
  getElementStats,
  getPersonality,
  getFortuneText,
  getCareerText,
  getLoveText,
  getHealthText,
  getLuckyNumbers,
  getLuckyColors,
  getLuckyDirections,
  getDaeun,
  getSeun,
  getYongsin,
  getSinGangYak,
  getCarefulThings,
  calculateGungap,
  getSamjae,
  getYongsinItems,
  getPillarScore,
  getDayPillarScore,
  ZODIAC_KR,
  getGeokguk,
  getShinsal,
  getHapChung,
  getPillarTenGods,
} from "../lib/saju-calculator.js";

const router = Router();

router.post("/saju/calculate", (req, res) => {
  try {
    const {
      birthYear, birthMonth, birthDay,
      birthHour = -1, birthMinute = 0,
      gender, calendarType
    } = req.body;

    if (!birthYear || !birthMonth || !birthDay || !gender || !calendarType) {
      return res.status(400).json({ error: "필수 입력 값이 누락되었습니다." });
    }

    const year  = Number(birthYear);
    const month = Number(birthMonth);
    const day   = Number(birthDay);
    const hour  = birthHour === -1 ? -1 : Number(birthHour);
    const minute = hour === -1 ? 0 : Number(birthMinute);

    // 입춘 시각 기준으로 정확한 사주 연도 계산 (입춘 전 출생자는 전년도 간지)
    const sajuYearNum = getSajuYear(year, month, day, hour);
    const yearPillar  = getYearPillar(sajuYearNum);
    const monthPillar = getMonthPillar(year, month, day, hour);
    const dayPillar   = getDayPillar(year, month, day);
    const hourPillar  = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;

    const pillars = [yearPillar, monthPillar, dayPillar];
    if (hourPillar) pillars.push(hourPillar);

    const elementBalance = countElements(pillars);
    const { dominant, lacking } = getElementStats(elementBalance);
    const dayElement = dayPillar.stemElement;

    const makePillarResponse = (p: typeof yearPillar | null) => {
      if (!p) return {
        heavenlyStem: "?", earthlyBranch: "?",
        heavenlyStemElement: "?", earthlyBranchElement: "?",
        heavenlyStemKorean: "?", earthlyBranchKorean: "?",
        zodiac: "시간 미입력", stemIndex: -1, branchIndex: -1
      };
      return {
        heavenlyStem: p.stem, earthlyBranch: p.branch,
        heavenlyStemElement: p.stemElement, earthlyBranchElement: p.branchElement,
        heavenlyStemKorean: p.stem, earthlyBranchKorean: p.branch,
        zodiac: p.zodiac, stemIndex: p.stemIndex, branchIndex: p.branchIndex
      };
    };

    const result = {
      birthInfo: { year, month, day, hour, minute, gender, calendarType },
      yearPillar:  makePillarResponse(yearPillar),
      monthPillar: makePillarResponse(monthPillar),
      dayPillar:   makePillarResponse(dayPillar),
      hourPillar:  makePillarResponse(hourPillar),
      elementBalance,
      dominantElement: dominant,
      lackingElement:  lacking,
      dayMasterElement: dayElement,
      dayMasterStem:    dayPillar.stem,
      personality: getPersonality(dayPillar.stem, dayElement, dominant),
      fortune:     getFortuneText(dayElement, year, dayPillar.stem),
      career:      getCareerText(dayElement, dayPillar.stem),
      love:        getLoveText(dayPillar.stem, dayElement),
      health:      getHealthText(dayPillar.stem, dayElement),
      luckyNumbers:    getLuckyNumbers(dayPillar.stemIndex, dayPillar.branchIndex),
      luckyColors:     getLuckyColors(dayElement, dayPillar.stem),
      luckyDirections: getLuckyDirections(dayElement, dayPillar.stem),
      zodiac:      yearPillar.zodiac,
      // 신규 기능
      daeun:       getDaeun(year, month, day, gender as 'male' | 'female', yearPillar, monthPillar),
      seun:        getSeun(year, 30),
      yongsin:     getYongsin(elementBalance, dayElement),
      sinGangYak:  getSinGangYak(yearPillar, monthPillar, dayPillar, hourPillar),
      carefulThings: getCarefulThings(dayPillar, monthPillar, yearPillar, elementBalance),
      samjae:      getSamjae(yearPillar.branchIndex, new Date().getFullYear()),
      yongsinItems: getYongsinItems(getYongsin(elementBalance, dayElement).yongsin),
      pillarScores: (() => {
        const { yongsin: y, heegsin: h, geesin: g } = getYongsin(elementBalance, dayElement);
        return {
          year:  getPillarScore(yearPillar.stemElement,  yearPillar.branchElement,  y, h, g),
          month: getPillarScore(monthPillar.stemElement, monthPillar.branchElement, y, h, g),
          day:   getPillarScore(dayPillar.stemElement,   dayPillar.branchElement,   y, h, g),
          hour:  hourPillar ? getPillarScore(hourPillar.stemElement, hourPillar.branchElement, y, h, g) : null,
        };
      })(),
      dayPillarScore: (() => {
        const { yongsin: y, heegsin: h, geesin: g } = getYongsin(elementBalance, dayElement);
        return getDayPillarScore(dayPillar.stemElement, dayPillar.branchElement, y, h, g, elementBalance);
      })(),
      // ── 고급 분석 ──
      geokguk:    getGeokguk(dayPillar.stem, { branch: dayPillar.branch }, elementBalance),
      shinsal:    getShinsal(yearPillar, monthPillar, dayPillar, hourPillar, dayPillar.stem),
      hapChung:   getHapChung(yearPillar, monthPillar, dayPillar, hourPillar),
      pillarTenGods: getPillarTenGods(dayPillar.stem, yearPillar, monthPillar, dayPillar, hourPillar),
    };

    return res.json(result);
  } catch (error) {
    console.error("Saju calculation error:", error);
    return res.status(500).json({ error: "사주 계산 중 오류가 발생했습니다." });
  }
});

router.post("/gungap/compare", (req, res) => {
  try {
    const { person1, person2 } = req.body;
    if (!person1 || !person2) {
      return res.status(400).json({ error: "두 사람의 정보가 필요합니다." });
    }
    const result = calculateGungap(person1, person2);
    return res.json(result);
  } catch (error) {
    console.error("Gungap error:", error);
    return res.status(500).json({ error: "궁합 계산 중 오류가 발생했습니다." });
  }
});

// ─── 사주 공유 링크 ────────────────────────────────────────────────────────────
interface ShareEntry { data: unknown; expires: number; name?: string }
const shareStore = new Map<string, ShareEntry>();

// 만료된 항목 정리 (30분마다)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of shareStore.entries()) {
    if (v.expires < now) shareStore.delete(k);
  }
}, 30 * 60 * 1000);

router.post("/saju/share", (req, res) => {
  try {
    const { data, name } = req.body;
    if (!data) return res.status(400).json({ error: "공유할 데이터가 없습니다." });
    const token = Array.from({ length: 12 }, () =>
      Math.random().toString(36)[2]
    ).join('');
    shareStore.set(token, {
      data,
      name: name ?? "사주 분석",
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
    });
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: "공유 링크 생성 중 오류가 발생했습니다." });
  }
});

router.get("/saju/share/:token", (req, res) => {
  const entry = shareStore.get(req.params.token);
  if (!entry || entry.expires < Date.now()) {
    return res.status(404).json({ error: "만료되었거나 존재하지 않는 링크입니다." });
  }
  return res.json({ data: entry.data, name: entry.name });
});

export default router;
