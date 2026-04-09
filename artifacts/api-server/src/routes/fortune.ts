import { Router, type IRouter } from "express";
import { getDailyFortune } from "../lib/fortune.js";

const router: IRouter = Router();

router.get("/fortune/daily", (req, res) => {
  try {
    const { date } = req.query;
    
    let year: number, month: number, day: number;
    
    if (date && typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length !== 3) {
        return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요." });
      }
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      const today = new Date();
      year = today.getFullYear();
      month = today.getMonth() + 1;
      day = today.getDate();
    }
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return res.status(400).json({ error: "유효하지 않은 날짜입니다." });
    }
    
    const fortune = getDailyFortune(year, month, day);
    return res.json(fortune);
  } catch (error) {
    console.error("Daily fortune error:", error);
    return res.status(500).json({ error: "일진 운세 조회 중 오류가 발생했습니다." });
  }
});

export default router;
