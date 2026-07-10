import { Router } from "express";
import {
  calculateGungap,
  getSajuYear,
} from "../lib/saju-calculator.js";
import { buildSajuResult } from "../lib/saju-result.js";
import {
  BirthResolutionError,
  birthOptionsFromRecord,
  resolveBirthInput,
} from "../lib/birth-resolution.js";
import {
  getBirthTimeCandidateAnalysis,
  getRelationshipTimingAnalysis,
  type BirthTimeEvent,
} from "../lib/saju-advanced.js";

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

    const result = buildSajuResult({
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
      birthHour,
      birthMinute,
      gender,
      calendarType,
      ...birthOptionsFromRecord(req.body),
    });

    return res.json(result);
  } catch (error) {
    if (error instanceof BirthResolutionError) {
      return res.status(400).json({ error: error.message });
    }
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
    const resolvePerson = (person: Record<string, unknown>) => {
      const basis = resolveBirthInput({
        birthYear: Number(person.birthYear ?? person.year),
        birthMonth: Number(person.birthMonth ?? person.month),
        birthDay: Number(person.birthDay ?? person.day),
        birthHour: Number(person.birthHour ?? person.hour ?? -1),
        birthMinute: Number(person.birthMinute ?? person.minute ?? 0),
        calendarType: person.calendarType === "lunar" ? "lunar" : "solar",
        ...birthOptionsFromRecord(person),
      });
      return {
        year: basis.dayPillarDate.year,
        month: basis.dayPillarDate.month,
        day: basis.dayPillarDate.day,
        hour: basis.adjusted.hour,
        yearPillarYear: getSajuYear(
          basis.adjusted.year,
          basis.adjusted.month,
          basis.adjusted.day,
          basis.adjusted.hour,
          basis.adjusted.minute,
        ),
        gender: person.gender === "female" ? "female" as const : "male" as const,
      };
    };
    const result = calculateGungap(resolvePerson(person1), resolvePerson(person2));
    const timing = getRelationshipTimingAnalysis(person1, person2);
    return res.json({ ...result, timing });
  } catch (error) {
    if (error instanceof BirthResolutionError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Gungap error:", error);
    return res.status(500).json({ error: "궁합 계산 중 오류가 발생했습니다." });
  }
});

router.post("/saju/birth-time-candidates", (req, res) => {
  try {
    const {
      birthYear,
      birthMonth,
      birthDay,
      birthMinute = 0,
      gender,
      calendarType = "solar",
      events = [],
    } = req.body as Record<string, unknown>;
    if (!birthYear || !birthMonth || !birthDay || (gender !== "male" && gender !== "female")) {
      return res.status(400).json({ error: "생년월일과 성별이 필요합니다." });
    }
    const normalizedEvents = Array.isArray(events)
      ? events.flatMap((event): BirthTimeEvent[] => {
          if (!event || typeof event !== "object") return [];
          const record = event as Record<string, unknown>;
          const type = record.type;
          const year = Number(record.year);
          if (
            !Number.isInteger(year) ||
            !["career", "move", "relationship", "study", "family", "health"].includes(String(type))
          ) return [];
          return [{ year, type: type as BirthTimeEvent["type"] }];
        }).slice(0, 5)
      : [];
    return res.json(getBirthTimeCandidateAnalysis({
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
      birthMinute: Number(birthMinute),
      gender,
      calendarType: calendarType === "lunar" ? "lunar" : "solar",
      ...birthOptionsFromRecord(req.body),
    }, normalizedEvents));
  } catch (error) {
    if (error instanceof BirthResolutionError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Birth time candidate error:", error);
    return res.status(500).json({ error: "출생시간 후보 분석 중 오류가 발생했습니다." });
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
