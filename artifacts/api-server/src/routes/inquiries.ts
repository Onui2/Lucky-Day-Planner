import { Router, type Request, type Response } from "express";
import { db, inquiriesTable, usersTable } from "@workspace/db";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { requireDatabase } from "../lib/database-guard.js";

const router = Router();

function requireAuth(
  req: Request,
  res: Response,
): req is Request & { user: NonNullable<Request["user"]> } {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }

  return true;
}

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

router.post("/inquiries", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const { message, sajuSnapshot, userLabel, inquiryType } =
    req.body as Record<string, unknown>;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "문의 내용을 입력해주세요." });
    return;
  }

  if (message.trim().length > 2000) {
    res.status(400).json({ error: "문의 내용은 2000자 이내로 입력해주세요." });
    return;
  }

  const validTypes = ["general", "saju", "gungap"];
  const resolvedType =
    typeof inquiryType === "string" && validTypes.includes(inquiryType)
      ? inquiryType
      : "general";

  const [inquiry] = await db
    .insert(inquiriesTable)
    .values({
      userId: String(req.user.id),
      userLabel: typeof userLabel === "string" ? userLabel : null,
      sajuSnapshot: sajuSnapshot ?? null,
      message: message.trim(),
      inquiryType: resolvedType,
    })
    .returning();

  res.status(201).json({ inquiry });
});

router.get("/inquiries/my", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const page = Math.max(1, parseInt(String(req.query.page) || "1", 10));
  const limit = 10;
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(inquiriesTable)
    .where(eq(inquiriesTable.userId, userId))
    .orderBy(desc(inquiriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(inquiriesTable)
    .where(eq(inquiriesTable.userId, userId));

  res.json({ inquiries: rows, total, page, limit });
});

router.get("/inquiries/my/unread-count", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const [{ total }] = await db
    .select({ total: count() })
    .from(inquiriesTable)
    .where(
      and(
        eq(inquiriesTable.userId, userId),
        eq(inquiriesTable.readByUser, false),
        sql`${inquiriesTable.adminReply} IS NOT NULL`,
      ),
    );

  res.json({ count: Number(total) });
});

router.patch("/inquiries/:id/read", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const id = parseInt(String(req.params.id), 10);

  const [row] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.id, id));
  if (!row || row.userId !== userId) {
    res.status(404).json({ error: "문의를 찾을 수 없습니다." });
    return;
  }

  await db
    .update(inquiriesTable)
    .set({ readByUser: true })
    .where(eq(inquiriesTable.id, id));

  res.json({ ok: true });
});

router.get("/admin/inquiries", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const page = Math.max(1, parseInt(String(req.query.page) || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;

  const condition =
    status === "pending" || status === "answered"
      ? eq(inquiriesTable.status, status)
      : undefined;

  const rows = await db
    .select({
      id: inquiriesTable.id,
      userId: inquiriesTable.userId,
      userLabel: inquiriesTable.userLabel,
      sajuSnapshot: inquiriesTable.sajuSnapshot,
      message: inquiriesTable.message,
      status: inquiriesTable.status,
      adminReply: inquiriesTable.adminReply,
      repliedAt: inquiriesTable.repliedAt,
      inquiryType: inquiriesTable.inquiryType,
      readByAdmin: inquiriesTable.readByAdmin,
      readByUser: inquiriesTable.readByUser,
      createdAt: inquiriesTable.createdAt,
      updatedAt: inquiriesTable.updatedAt,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
    })
    .from(inquiriesTable)
    .leftJoin(usersTable, eq(inquiriesTable.userId, usersTable.id))
    .where(condition)
    .orderBy(desc(inquiriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(inquiriesTable)
    .where(condition);

  res.json({ inquiries: rows, total, page, limit });
});

router.get(
  "/admin/inquiries/unread-count",
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    if (!(await requireDatabase(res))) return;

    const [{ total }] = await db
      .select({ total: count() })
      .from(inquiriesTable)
      .where(eq(inquiriesTable.readByAdmin, false));

    res.json({ count: Number(total) });
  },
);

router.patch("/admin/inquiries/:id/read", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = parseInt(String(req.params.id), 10);
  await db
    .update(inquiriesTable)
    .set({ readByAdmin: true })
    .where(eq(inquiriesTable.id, id));

  res.json({ ok: true });
});

router.patch("/admin/inquiries/:id/reply", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = parseInt(String(req.params.id), 10);
  const { reply } = req.body as Record<string, unknown>;

  if (!reply || typeof reply !== "string" || reply.trim().length === 0) {
    res.status(400).json({ error: "답변 내용을 입력해주세요." });
    return;
  }

  const [row] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "문의를 찾을 수 없습니다." });
    return;
  }

  const [updated] = await db
    .update(inquiriesTable)
    .set({
      adminReply: reply.trim(),
      status: "answered",
      repliedAt: new Date(),
      readByAdmin: true,
      readByUser: false,
    })
    .where(eq(inquiriesTable.id, id))
    .returning();

  res.json({ inquiry: updated });
});

router.delete("/admin/inquiries/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const id = parseInt(String(req.params.id), 10);
  await db.delete(inquiriesTable).where(eq(inquiriesTable.id, id));

  res.json({ ok: true });
});

export default router;
