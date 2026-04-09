import { Router, type IRouter } from "express";
import { getManseryokDay, getManseryokMonth, getMonthYearGanzi } from "../lib/manseryok.js";

const router: IRouter = Router();

router.get("/manseryok/date", (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: "date 파라미터가 필요합니다." });
    }
    
    const parts = date.split('-');
    if (parts.length !== 3) {
      return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요." });
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return res.status(400).json({ error: "유효하지 않은 날짜입니다." });
    }
    
    const dayData = getManseryokDay(year, month, day);
    const { yearGanzi, monthGanzi, yearElement, monthElement, yearZodiac } = getMonthYearGanzi(year, month);
    
    return res.json({
      day: dayData,
      yearGanzi,
      monthGanzi,
      yearElement,
      monthElement,
      yearZodiac
    });
  } catch (error) {
    console.error("Manseryok date error:", error);
    return res.status(500).json({ error: "만세력 조회 중 오류가 발생했습니다." });
  }
});

router.get("/manseryok/month", (req, res) => {
  try {
    const { year: yearStr, month: monthStr } = req.query;
    
    if (!yearStr || !monthStr) {
      return res.status(400).json({ error: "year와 month 파라미터가 필요합니다." });
    }
    
    const year = parseInt(yearStr as string, 10);
    const month = parseInt(monthStr as string, 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "유효하지 않은 년월입니다." });
    }
    
    const days = getManseryokMonth(year, month);
    const { yearGanzi, monthGanzi, yearZodiac } = getMonthYearGanzi(year, month);
    
    return res.json({
      year,
      month,
      yearGanzi,
      monthGanzi,
      yearZodiac,
      days
    });
  } catch (error) {
    console.error("Manseryok month error:", error);
    return res.status(500).json({ error: "만세력 월 조회 중 오류가 발생했습니다." });
  }
});

export default router;
