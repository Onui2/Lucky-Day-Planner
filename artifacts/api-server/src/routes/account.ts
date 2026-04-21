import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { clearSession, getSessionId } from "../lib/auth.js";

const router = Router();
const BCRYPT_ROUNDS = 12;

function requireAuth(req: Request, res: Response): req is Request & { user: NonNullable<Request["user"]> } {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }
  return true;
}

router.get("/account", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, role: usersTable.role, createdAt: usersTable.createdAt, hasPassword: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "사용자를 찾을 수 없습니다." }); return; }
  res.json({ id: user.id, email: user.email, firstName: user.firstName, role: user.role, createdAt: user.createdAt, hasPassword: !!user.hasPassword });
});

router.patch("/account/name", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);
  const { name } = req.body as Record<string, unknown>;
  if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 30) {
    res.status(400).json({ error: "이름은 1~30자 사이로 입력해주세요." }); return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ firstName: name.trim() })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, firstName: usersTable.firstName, email: usersTable.email });
  res.json({ user: updated });
});

router.patch("/account/password", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);
  const { currentPassword, newPassword } = req.body as Record<string, unknown>;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "새 비밀번호는 6자 이상이어야 합니다." }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "사용자를 찾을 수 없습니다." }); return; }

  if (user.passwordHash) {
    if (!currentPassword || typeof currentPassword !== "string") {
      res.status(400).json({ error: "현재 비밀번호를 입력해주세요." }); return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "현재 비밀번호가 올바르지 않습니다." }); return; }
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.delete("/account", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);
  const { password } = req.body as Record<string, unknown>;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "사용자를 찾을 수 없습니다." }); return; }

  if (user.passwordHash) {
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "비밀번호를 입력해주세요." }); return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "비밀번호가 올바르지 않습니다." }); return; }
  }

  await db.delete(usersTable).where(eq(usersTable.id, userId));
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ ok: true });
});

export default router;
