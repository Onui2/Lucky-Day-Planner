import { Router, type IRouter, type Request, type Response } from "express";
import { searchDream, POPULAR_KEYWORDS, CATEGORIES } from "../lib/dream";

const router: IRouter = Router();

router.post("/dream/search", async (req: Request, res: Response) => {
  const { query } = req.body as Record<string, unknown>;
  if (!query || typeof query !== "string" || query.trim().length < 1) {
    res.status(400).json({ error: "검색어를 입력해주세요." });
    return;
  }
  if (query.trim().length > 50) {
    res.status(400).json({ error: "검색어는 50자 이내로 입력해주세요." });
    return;
  }
  const result = searchDream(query);
  res.json(result);
});

router.get("/dream/meta", (_req: Request, res: Response) => {
  res.json({ popularKeywords: POPULAR_KEYWORDS, categories: CATEGORIES });
});

export default router;
