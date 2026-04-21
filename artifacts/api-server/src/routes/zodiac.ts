import { Router } from "express";
import { getZodiacFortune } from "../lib/zodiac-fortune.js";

const router = Router();

router.get("/fortune/zodiac", (req, res) => {
  try {
    const { date } = req.query;
    let year: number, month: number, day: number;
    if (date && typeof date === "string") {
      const [y, m, d] = date.split("-").map(Number);
      year = y; month = m; day = d;
    } else {
      const today = new Date();
      year = today.getFullYear(); month = today.getMonth() + 1; day = today.getDate();
    }
    if (!year || !month || !day) return res.status(400).json({ error: "날짜가 올바르지 않습니다." });
    const result = getZodiacFortune(year, month, day);
    return res.json(result);
  } catch (e: any) {
    console.error("Zodiac fortune error:", e);
    return res.status(500).json({ error: e.message ?? "띠별 운세 계산 중 오류가 발생했습니다." });
  }
});

export default router;
