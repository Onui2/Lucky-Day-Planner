import { Router } from "express";
import { getYearFortune } from "../lib/year-fortune.js";
import { BirthResolutionError, birthOptionsFromRecord, resolveBirthInput } from "../lib/birth-resolution.js";

const router = Router();

router.post("/year-fortune", (req, res) => {
  try {
    const { birthYear, birthMonth, birthDay, birthHour = -1, birthMinute = 0, targetYear } = req.body;
    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).json({ error: "생년월일을 입력해주세요." });
    }
    const basis = resolveBirthInput({
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
      birthHour: Number(birthHour),
      birthMinute: Number(birthMinute),
      calendarType: req.body.calendarType === "lunar" ? "lunar" : "solar",
      ...birthOptionsFromRecord(req.body),
    });
    const result = getYearFortune(
      basis.adjusted.year, basis.adjusted.month, basis.adjusted.day,
      basis.adjusted.hour, targetYear ? Number(targetYear) : undefined,
      basis.dayPillarDate,
    );
    return res.json({ ...result, calculationBasis: basis });
  } catch (e: any) {
    if (e instanceof BirthResolutionError) {
      return res.status(400).json({ error: e.message });
    }
    console.error("Year fortune error:", e);
    return res.status(500).json({ error: e.message ?? "연간 운세 계산 중 오류가 발생했습니다." });
  }
});

export default router;
