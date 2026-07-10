import { Router } from "express";
import { getLoveFortune } from "../lib/love-fortune.js";
import { BirthResolutionError, birthOptionsFromRecord, resolveBirthInput } from "../lib/birth-resolution.js";

const router = Router();

router.post("/love-fortune", (req, res) => {
  try {
    const {
      birthYear, birthMonth, birthDay, birthHour = -1, birthMinute = 0,
      gender = "male",
      status = "solo",
      targetYear,
      partnerYear, partnerMonth, partnerDay, partnerHour = -1, partnerGender = "female",
    } = req.body;

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
    const partnerBasis = partnerYear && partnerMonth && partnerDay
      ? resolveBirthInput({
          birthYear: Number(partnerYear),
          birthMonth: Number(partnerMonth),
          birthDay: Number(partnerDay),
          birthHour: Number(partnerHour),
          birthMinute: Number(req.body.partnerMinute ?? 0),
          calendarType: req.body.partnerCalendarType === "lunar" ? "lunar" : "solar",
          isLeapMonth: req.body.partnerIsLeapMonth === true,
          birthPlace: typeof req.body.partnerBirthPlace === "string" ? req.body.partnerBirthPlace : undefined,
          timeZone: typeof req.body.partnerTimeZone === "string" ? req.body.partnerTimeZone : undefined,
          longitude: Number.isFinite(Number(req.body.partnerLongitude)) ? Number(req.body.partnerLongitude) : undefined,
          latitude: Number.isFinite(Number(req.body.partnerLatitude)) ? Number(req.body.partnerLatitude) : undefined,
          applyTrueSolarTime: req.body.partnerApplyTrueSolarTime === true,
          dayBoundary: req.body.partnerDayBoundary === "late-zi" ? "late-zi" : "midnight",
        })
      : null;
    const result = getLoveFortune(
      basis.dayPillarDate.year, basis.dayPillarDate.month, basis.dayPillarDate.day,
      basis.adjusted.hour,
      gender,
      status,
      targetYear ? Number(targetYear) : undefined,
      partnerBasis?.dayPillarDate.year,
      partnerBasis?.dayPillarDate.month,
      partnerBasis?.dayPillarDate.day,
      partnerBasis?.adjusted.hour ?? Number(partnerHour),
      partnerGender,
    );

    return res.json({ ...result, calculationBasis: basis, partnerCalculationBasis: partnerBasis });
  } catch (e: any) {
    if (e instanceof BirthResolutionError) {
      return res.status(400).json({ error: e.message });
    }
    console.error("Love fortune error:", e);
    return res.status(500).json({ error: e.message ?? "연애운 계산 중 오류가 발생했습니다." });
  }
});

export default router;
