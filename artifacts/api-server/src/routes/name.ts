import { Router, type IRouter } from "express";
import { analyzeName } from "../lib/name-analysis.js";

const router: IRouter = Router();

router.post("/name-analysis", (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "이름을 입력해주세요." });
    }
    const result = analyzeName(name.trim());
    return res.json(result);
  } catch (e: any) {
    console.error("Name analysis error:", e);
    return res.status(400).json({ error: e.message ?? "이름 분석 중 오류가 발생했습니다." });
  }
});

export default router;
