import { Router, type IRouter, type Request, type Response } from "express";
import { db, savedSajuTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }
  return true;
}

// GET /api/saju/saved — 내 저장 목록
router.get("/saju/saved", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(savedSajuTable)
      .where(eq(savedSajuTable.userId, req.user!.id))
      .orderBy(savedSajuTable.createdAt);
    res.json(rows);
  } catch (err) {
    console.error("saved saju list error:", err);
    res.status(500).json({ error: "목록을 불러오지 못했습니다." });
  }
});

// POST /api/saju/saved — 저장
router.post("/saju/saved", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { label, birthInfo } = req.body;
  if (!birthInfo) { res.status(400).json({ error: "birthInfo가 필요합니다." }); return; }

  const existing = await db
    .select({ id: savedSajuTable.id })
    .from(savedSajuTable)
    .where(eq(savedSajuTable.userId, req.user!.id));
  if (existing.length >= 20) {
    res.status(400).json({ error: "최대 20개까지 저장할 수 있습니다." }); return;
  }

  try {
    const [row] = await db
      .insert(savedSajuTable)
      .values({
        userId: req.user!.id,
        label: (label as string)?.trim().slice(0, 50) || "내 사주",
        birthInfo,
      })
      .returning();
    res.json(row);
  } catch (err) {
    console.error("saved saju insert error:", err);
    res.status(500).json({ error: "저장에 실패했습니다." });
  }
});

// PATCH /api/saju/saved/:id — 이름 수정
router.patch("/saju/saved/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = Number(req.params.id);
  const { label } = req.body;
  if (!label) { res.status(400).json({ error: "label이 필요합니다." }); return; }
  try {
    const [row] = await db
      .update(savedSajuTable)
      .set({ label: (label as string).trim().slice(0, 50) })
      .where(and(eq(savedSajuTable.id, id), eq(savedSajuTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "항목을 찾을 수 없습니다." }); return; }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "수정에 실패했습니다." });
  }
});

// DELETE /api/saju/saved/:id — 삭제
router.delete("/saju/saved/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = Number(req.params.id);
  try {
    await db
      .delete(savedSajuTable)
      .where(and(eq(savedSajuTable.id, id), eq(savedSajuTable.userId, req.user!.id)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "삭제에 실패했습니다." });
  }
});

export default router;
