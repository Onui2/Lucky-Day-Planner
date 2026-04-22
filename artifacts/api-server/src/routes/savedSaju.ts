import { Router, type Request, type Response } from "express";
import { db, savedSajuTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireDatabase } from "../lib/database-guard.js";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }

  return true;
}

router.get("/saju/saved", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  try {
    const rows = await db
      .select()
      .from(savedSajuTable)
      .where(eq(savedSajuTable.userId, req.user!.id))
      .orderBy(savedSajuTable.createdAt);

    res.json(rows);
  } catch (error) {
    console.error("saved saju list error:", error);
    res.status(500).json({ error: "저장한 사주 목록을 불러오지 못했습니다." });
  }
});

router.post("/saju/saved", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const { label, birthInfo } = req.body;
  if (!birthInfo) {
    res.status(400).json({ error: "birthInfo가 필요합니다." });
    return;
  }

  const existing = await db
    .select({ id: savedSajuTable.id })
    .from(savedSajuTable)
    .where(eq(savedSajuTable.userId, req.user!.id));

  if (existing.length >= 20) {
    res.status(400).json({ error: "최대 20개까지 저장할 수 있습니다." });
    return;
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
  } catch (error) {
    console.error("saved saju insert error:", error);
    res.status(500).json({ error: "사주 저장에 실패했습니다." });
  }
});

router.patch("/saju/saved/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = Number(req.params.id);
  const { label } = req.body;

  if (!label) {
    res.status(400).json({ error: "label이 필요합니다." });
    return;
  }

  try {
    const [row] = await db
      .update(savedSajuTable)
      .set({ label: (label as string).trim().slice(0, 50) })
      .where(
        and(
          eq(savedSajuTable.id, id),
          eq(savedSajuTable.userId, req.user!.id),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "항목을 찾을 수 없습니다." });
      return;
    }

    res.json(row);
  } catch (error) {
    console.error("saved saju rename error:", error);
    res.status(500).json({ error: "이름 수정에 실패했습니다." });
  }
});

router.delete("/saju/saved/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = Number(req.params.id);

  try {
    await db
      .delete(savedSajuTable)
      .where(
        and(
          eq(savedSajuTable.id, id),
          eq(savedSajuTable.userId, req.user!.id),
        ),
      );

    res.json({ ok: true });
  } catch (error) {
    console.error("saved saju delete error:", error);
    res.status(500).json({ error: "삭제에 실패했습니다." });
  }
});

export default router;
