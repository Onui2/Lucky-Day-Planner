import { Router, type Request, type Response } from "express";
import { db, inquiriesTable, savedSajuTable, usersTable } from "@workspace/db";
import { count, desc, eq, gte, ilike, or } from "drizzle-orm";
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

function requireSuperAdmin(
  req: Request,
  res: Response,
): req is Request & { user: NonNullable<Request["user"]> } {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }

  if (req.user.role !== "superadmin") {
    res.status(403).json({ error: "최고 관리자 권한이 필요합니다." });
    return false;
  }

  return true;
}

function getSeoulDayStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
}

router.get("/admin/stats", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const seoulDayStart = getSeoulDayStart();

  const [
    [{ totalUsers }],
    [{ newUsersToday }],
    [{ adminUsers }],
    [{ totalSavedSaju }],
    [{ totalInquiries }],
    [{ unreadInquiries }],
    [{ pendingInquiries }],
    [{ inquiriesToday }],
    [{ answeredToday }],
    [{ generalInquiries }],
    [{ sajuInquiries }],
    [{ gungapInquiries }],
    recentUsers,
    recentInquiries,
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(usersTable),
    db
      .select({ newUsersToday: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, seoulDayStart)),
    db
      .select({ adminUsers: count() })
      .from(usersTable)
      .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "superadmin"))),
    db.select({ totalSavedSaju: count() }).from(savedSajuTable),
    db.select({ totalInquiries: count() }).from(inquiriesTable),
    db
      .select({ unreadInquiries: count() })
      .from(inquiriesTable)
      .where(eq(inquiriesTable.readByAdmin, false)),
    db
      .select({ pendingInquiries: count() })
      .from(inquiriesTable)
      .where(eq(inquiriesTable.status, "pending")),
    db
      .select({ inquiriesToday: count() })
      .from(inquiriesTable)
      .where(gte(inquiriesTable.createdAt, seoulDayStart)),
    db
      .select({ answeredToday: count() })
      .from(inquiriesTable)
      .where(gte(inquiriesTable.repliedAt, seoulDayStart)),
    db
      .select({ generalInquiries: count() })
      .from(inquiriesTable)
      .where(eq(inquiriesTable.inquiryType, "general")),
    db
      .select({ sajuInquiries: count() })
      .from(inquiriesTable)
      .where(eq(inquiriesTable.inquiryType, "saju")),
    db
      .select({ gungapInquiries: count() })
      .from(inquiriesTable)
      .where(eq(inquiriesTable.inquiryType, "gungap")),
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(5),
    db
      .select({
        id: inquiriesTable.id,
        inquiryType: inquiriesTable.inquiryType,
        status: inquiriesTable.status,
        userLabel: inquiriesTable.userLabel,
        userEmail: usersTable.email,
        createdAt: inquiriesTable.createdAt,
      })
      .from(inquiriesTable)
      .leftJoin(usersTable, eq(inquiriesTable.userId, usersTable.id))
      .orderBy(desc(inquiriesTable.createdAt))
      .limit(5),
  ]);

  res.json({
    counts: {
      totalUsers: Number(totalUsers),
      newUsersToday: Number(newUsersToday),
      adminUsers: Number(adminUsers),
      totalSavedSaju: Number(totalSavedSaju),
      totalInquiries: Number(totalInquiries),
      unreadInquiries: Number(unreadInquiries),
      pendingInquiries: Number(pendingInquiries),
      inquiriesToday: Number(inquiriesToday),
      answeredToday: Number(answeredToday),
    },
    inquiryTypes: {
      general: Number(generalInquiries),
      saju: Number(sajuInquiries),
      gungap: Number(gungapInquiries),
    },
    recentUsers,
    recentInquiries,
  });
});

router.get("/admin/users", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const page = Math.max(1, parseInt(String(req.query.page) || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const condition = search
    ? or(
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.firstName, `%${search}%`),
        ilike(usersTable.lastName, `%${search}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(condition)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(condition);

  res.json({ users: rows, total: Number(total), page, limit });
});

router.patch("/admin/users/:id/role", async (req: Request, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const targetId = String(req.params.id);
  const requesterId = String(req.user.id);
  const { role } = req.body as Record<string, unknown>;

  if (role !== "admin" && role !== "user") {
    res.status(400).json({ error: "유효하지 않은 역할입니다. (admin 또는 user)" });
    return;
  }

  if (targetId === requesterId) {
    res.status(400).json({ error: "자신의 권한은 변경할 수 없습니다." });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target) {
    res.status(404).json({ error: "회원을 찾을 수 없습니다." });
    return;
  }

  if (target.role === "superadmin" && role !== "admin") {
    res.status(400).json({
      error: "최고 관리자는 관리자까지만 변경할 수 있습니다.",
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role: String(role) })
    .where(eq(usersTable.id, targetId))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      role: usersTable.role,
    });

  res.json({ user: updated });
});

export default router;
