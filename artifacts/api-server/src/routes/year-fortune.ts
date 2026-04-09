import { Router, type IRouter } from "express";
import { getYearFortune } from "../lib/year-fortune.js";

const router: IRouter = Router();

router.post("/year-fortune", (req, res) => {
  try {
    const { birthYear, birthMonth, birthDay, birthHour = -1, targetYear } = req.body;
    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).json({ error: "생년월일을 입력해주세요." });
    }
    const result = getYearFortune(
      Number(birthYear), Number(birthMonth), Number(birthDay),
      Number(birthHour), targetYear ? Number(targetYear) : undefined,
    );
    return res.json(result);
  } catch (e: any) {
    console.error("Year fortune error:", e);
    return res.status(500).json({ error: e.message ?? "연간 운세 계산 중 오류가 발생했습니다." });
  }
});

export default router;
