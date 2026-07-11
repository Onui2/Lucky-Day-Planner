import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { db, shareSnapshotsTable } from "@workspace/db";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { requireDatabase } from "../lib/database-guard.js";
import { buildPublicSharePayload } from "../lib/share-snapshot.js";

const router = Router();
const DEFAULT_EXPIRY_DAYS = 30;
const MAX_ACTIVE_SHARES = 20;

function requireAuth(req: Request, res: Response): req is Request & { user: Express.User } {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }
  return true;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

router.post("/share-snapshots", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const publicPayload = buildPublicSharePayload(
    { name: req.body?.name, result: req.body?.result },
    req.body?.visibility,
  );
  const encodedPayload = JSON.stringify(publicPayload);
  if (encodedPayload.length > 100_000) {
    res.status(413).json({ error: "공유할 내용이 너무 큽니다." });
    return;
  }

  const now = new Date();
  const existing = await db
    .select({ id: shareSnapshotsTable.id })
    .from(shareSnapshotsTable)
    .where(
      and(
        eq(shareSnapshotsTable.userId, req.user.id),
        isNull(shareSnapshotsTable.deletedAt),
        gt(shareSnapshotsTable.expiresAt, now),
      ),
    );
  if (existing.length >= MAX_ACTIVE_SHARES) {
    res.status(409).json({ error: "활성 공유는 최대 20개까지 만들 수 있습니다." });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const [row] = await db
    .insert(shareSnapshotsTable)
    .values({
      userId: req.user.id,
      tokenHash: hashToken(token),
      publicPayload,
      expiresAt,
    })
    .returning({ id: shareSnapshotsTable.id, expiresAt: shareSnapshotsTable.expiresAt });

  res.status(201).json({ ...row, token, path: `/share/${token}` });
});

router.get("/share-snapshots", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const rows = await db
    .select({
      id: shareSnapshotsTable.id,
      expiresAt: shareSnapshotsTable.expiresAt,
      deletedAt: shareSnapshotsTable.deletedAt,
      createdAt: shareSnapshotsTable.createdAt,
    })
    .from(shareSnapshotsTable)
    .where(eq(shareSnapshotsTable.userId, req.user.id))
    .orderBy(desc(shareSnapshotsTable.createdAt));

  res.json({ shares: rows });
});

router.delete("/share-snapshots/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "유효하지 않은 공유 ID입니다." });
    return;
  }

  const [deleted] = await db
    .update(shareSnapshotsTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(shareSnapshotsTable.id, id),
        eq(shareSnapshotsTable.userId, req.user.id),
        isNull(shareSnapshotsTable.deletedAt),
      ),
    )
    .returning({ id: shareSnapshotsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "공유 링크를 찾을 수 없습니다." });
    return;
  }
  res.status(204).end();
});

router.get("/public/share/:token", async (req, res) => {
  if (!(await requireDatabase(res))) return;
  const token = req.params.token;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    res.status(404).json({ error: "공유 링크를 찾을 수 없습니다." });
    return;
  }

  const [row] = await db
    .select({
      publicPayload: shareSnapshotsTable.publicPayload,
      expiresAt: shareSnapshotsTable.expiresAt,
      deletedAt: shareSnapshotsTable.deletedAt,
    })
    .from(shareSnapshotsTable)
    .where(eq(shareSnapshotsTable.tokenHash, hashToken(token)));

  if (!row) {
    res.status(404).json({ error: "공유 링크를 찾을 수 없습니다." });
    return;
  }
  if (row.deletedAt || row.expiresAt <= new Date()) {
    res.status(410).json({ error: "만료되었거나 삭제된 공유 링크입니다." });
    return;
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.json({ payload: row.publicPayload, expiresAt: row.expiresAt });
});

export default router;
