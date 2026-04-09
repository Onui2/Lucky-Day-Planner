import { Router, type IRouter } from "express";
import { getLoveFortune } from "../lib/love-fortune.js";

const router: IRouter = Router();

router.post("/love-fortune", (req, res) => {
  try {
    const {
      birthYear, birthMonth, birthDay, birthHour = -1,
      gender = "male",
      status = "solo",
      targetYear,
      partnerYear, partnerMonth, partnerDay, partnerHour = -1, partnerGender = "female",
    } = req.body;

    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).json({ error: "생년월일을 입력해주세요." });
    }

    const result = getLoveFortune(
      Number(birthYear), Number(birthMonth), Number(birthDay),
      Number(birthHour),
      gender,
      status,
      targetYear ? Number(targetYear) : undefined,
      partnerYear ? Number(partnerYear) : undefined,
      partnerMonth ? Number(partnerMonth) : undefined,
      partnerDay ? Number(partnerDay) : undefined,
      Number(partnerHour),
      partnerGender,
    );

    return res.json(result);
  } catch (e: any) {
    console.error("Love fortune error:", e);
    return res.status(500).json({ error: e.message ?? "연애운 계산 중 오류가 발생했습니다." });
  }
});

export default router;
