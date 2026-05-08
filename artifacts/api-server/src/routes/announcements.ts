import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { requireDatabase } from "../lib/database-guard.js";

const router = Router();

function requireAdmin(
  req: Request,
  res: Response,
): req is Request & { user: NonNullable<Request["user"]> } {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }
  const role = req.user.role;
  if (role !== "admin" && role !== "superadmin") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return false;
  }
  return true;
}

// 공개: 활성 공지 목록
router.get("/announcements", async (_req: Request, res: Response) => {
  if (!(await requireDatabase(res))) return;
  try {
    const rows = await db
      .select()
      .from(announcementsTable)
      .where(eq(announcementsTable.isActive, true))
      .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt))
      .limit(10);
    res.json(rows);
  } catch (error) {
    console.error("announcements list error:", error);
    res.status(500).json({ error: "공지사항을 불러오지 못했습니다." });
  }
});

// 관리자: 전체 목록
router.get("/admin/announcements", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;
  try {
    const rows = await db
      .select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
    res.json(rows);
  } catch (error) {
    console.error("admin announcements list error:", error);
    res.status(500).json({ error: "공지사항을 불러오지 못했습니다." });
  }
});

// 관리자: 생성
router.post("/admin/announcements", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const { title, content, type = "info", isActive = true, isPinned = false } = req.body as Record<string, unknown>;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "제목을 입력해 주세요." });
    return;
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "내용을 입력해 주세요." });
    return;
  }

  try {
    const [row] = await db.insert(announcementsTable).values({
      title: String(title).trim().slice(0, 100),
      content: String(content).trim(),
      type: ["info", "warning", "notice"].includes(String(type)) ? String(type) : "info",
      isActive: Boolean(isActive),
      isPinned: Boolean(isPinned),
    }).returning();
    res.status(201).json(row);
  } catch (error) {
    console.error("announcement create error:", error);
    res.status(500).json({ error: "공지사항 생성에 실패했습니다." });
  }
});

// 관리자: 수정
router.patch("/admin/announcements/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "유효하지 않은 ID입니다." }); return; }

  const { title, content, type, isActive, isPinned } = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (title !== undefined) updates.title = String(title).trim().slice(0, 100);
  if (content !== undefined) updates.content = String(content).trim();
  if (type !== undefined) updates.type = ["info", "warning", "notice"].includes(String(type)) ? String(type) : "info";
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);

  try {
    const [row] = await db
      .update(announcementsTable)
      .set(updates)
      .where(eq(announcementsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "공지사항을 찾을 수 없습니다." }); return; }
    res.json(row);
  } catch (error) {
    console.error("announcement update error:", error);
    res.status(500).json({ error: "공지사항 수정에 실패했습니다." });
  }
});

// 관리자: 삭제
router.delete("/admin/announcements/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "유효하지 않은 ID입니다." }); return; }

  try {
    const rows = await db.delete(announcementsTable).where(eq(announcementsTable.id, id)).returning({ id: announcementsTable.id });
    if (rows.length === 0) { res.status(404).json({ error: "공지사항을 찾을 수 없습니다." }); return; }
    res.json({ ok: true });
  } catch (error) {
    console.error("announcement delete error:", error);
    res.status(500).json({ error: "공지사항 삭제에 실패했습니다." });
  }
});

export default router;
