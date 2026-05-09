import { Router } from "express";
import {
  calculateGungap,
} from "../lib/saju-calculator.js";
import { buildSajuResult } from "../lib/saju-result.js";

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
    });

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
