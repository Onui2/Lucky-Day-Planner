import { Router, type Request, type Response } from "express";
import { getDailyFortune } from "../lib/fortune.js";
import { getSeoulToday } from "../lib/date-access.js";

const router = Router();

router.get("/fortune/calendar", async (req: Request, res: Response) => {
  const today = getSeoulToday();
  const yearText = req.query.year ?? String(today.year);
  const monthText = req.query.month ?? String(today.month);

  if (typeof yearText !== "string" || !/^\d{4}$/.test(yearText)) {
    res.status(400).json({ error: "유효하지 않은 연도입니다." }); return;
  }
  if (typeof monthText !== "string" || !/^\d{1,2}$/.test(monthText)) {
    res.status(400).json({ error: "유효하지 않은 월입니다." }); return;
  }

  const year = Number(yearText);
  const month = Number(monthText);

  if (isNaN(year) || year < 1900 || year > 2100) {
    res.status(400).json({ error: "유효하지 않은 연도입니다." }); return;
  }
  if (isNaN(month) || month < 1 || month > 12) {
    res.status(400).json({ error: "유효하지 않은 월입니다." }); return;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: { day: number; overallScore: number; ganzi: string; element: string; label: string }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const fortune = getDailyFortune(year, month, d);
    const score = fortune.overallScore;
    let label = "보통";
    if (score >= 85) label = "대길";
    else if (score >= 70) label = "길";
    else if (score >= 55) label = "평";
    else if (score >= 40) label = "주의";
    else label = "흉";

    days.push({
      day: d,
      overallScore: score,
      ganzi: fortune.dayGanzi,
      element: fortune.dayElement,
      label,
    });
  }

  const scores = days.map(d => d.overallScore);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best = days.reduce((a, b) => (a.overallScore >= b.overallScore ? a : b));
  const worst = days.reduce((a, b) => (a.overallScore <= b.overallScore ? a : b));

  res.json({ year, month, days, avg, best, worst });
});

export default router;
