import { Router, type Request, type Response } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import { db, luckyDayBookmarksTable } from "@workspace/db";
import { requireDatabase } from "../lib/database-guard.js";

const router = Router();
const BOOKMARK_LIMIT = 30;

type BookmarkGrade = "대길" | "길" | "보통" | "흉" | "대흉";

interface BookmarkPayload {
  id: string;
  title: string;
  note?: string | null;
  year: number;
  month: number;
  day: number;
  purpose: string;
  purposeLabel: string;
  ganzi: string;
  ganziHanja: string;
  grade: BookmarkGrade;
  score: number;
  tags: string[];
  href: string;
  createdAt: string;
  updatedAt?: string;
}

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

function buildEntryKey(year: number, month: number, day: number, purpose: string) {
  return `${year}-${month}-${day}:${purpose}`;
}

function toBookmarkPayload(
  row: typeof luckyDayBookmarksTable.$inferSelect,
): BookmarkPayload {
  return {
    id: row.entryKey,
    title: row.title,
    note: row.note,
    year: row.year,
    month: row.month,
    day: row.day,
    purpose: row.purpose,
    purposeLabel: row.purposeLabel,
    ganzi: row.ganzi,
    ganziHanja: row.ganziHanja,
    grade: row.grade as BookmarkGrade,
    score: row.score,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    href: row.href,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseBookmarkBody(body: unknown): Omit<BookmarkPayload, "id" | "href" | "createdAt" | "updatedAt"> | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim().slice(0, 80) : "";
  const note =
    typeof data.note === "string" && data.note.trim()
      ? data.note.trim().slice(0, 500)
      : null;
  const year = Number(data.year);
  const month = Number(data.month);
  const day = Number(data.day);
  const purpose = typeof data.purpose === "string" ? data.purpose.trim().slice(0, 30) : "";
  const purposeLabel =
    typeof data.purposeLabel === "string" && data.purposeLabel.trim()
      ? data.purposeLabel.trim().slice(0, 30)
      : purpose;
  const ganzi = typeof data.ganzi === "string" ? data.ganzi.trim().slice(0, 10) : "";
  const ganziHanja = typeof data.ganziHanja === "string" ? data.ganziHanja.trim().slice(0, 10) : "";
  const grade = typeof data.grade === "string" ? data.grade.trim() as BookmarkGrade : null;
  const score = Number(data.score);
  const tags = Array.isArray(data.tags)
    ? data.tags
        .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        .map((tag) => tag.trim().slice(0, 30))
        .slice(0, 12)
    : [];

  if (!title || !purpose || !ganzi || !ganziHanja) {
    return null;
  }

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return null;
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }

  if (!grade || !["대길", "길", "보통", "흉", "대흉"].includes(grade)) {
    return null;
  }

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return null;
  }

  return {
    title,
    note,
    year,
    month,
    day,
    purpose,
    purposeLabel,
    ganzi,
    ganziHanja,
    grade,
    score: Math.round(score),
    tags,
  };
}

router.get("/account/lucky-days", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  try {
    const rows = await db
      .select()
      .from(luckyDayBookmarksTable)
      .where(eq(luckyDayBookmarksTable.userId, String(req.user.id)))
      .orderBy(desc(luckyDayBookmarksTable.updatedAt), desc(luckyDayBookmarksTable.createdAt));

    res.json(rows.map(toBookmarkPayload));
  } catch (error) {
    console.error("lucky day bookmark list error:", error);
    res.status(500).json({ error: "저장한 길일을 불러오지 못했습니다." });
  }
});

router.post("/account/lucky-days", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const parsed = parseBookmarkBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "길일 저장 값이 올바르지 않습니다." });
    return;
  }

  const userId = String(req.user.id);
  const entryKey = buildEntryKey(parsed.year, parsed.month, parsed.day, parsed.purpose);
  const href = `/lucky-calendar?y=${parsed.year}&m=${parsed.month}&p=${encodeURIComponent(parsed.purpose)}&d=${parsed.day}`;

  try {
    const [existing] = await db
      .select({ id: luckyDayBookmarksTable.id })
      .from(luckyDayBookmarksTable)
      .where(
        and(
          eq(luckyDayBookmarksTable.userId, userId),
          eq(luckyDayBookmarksTable.entryKey, entryKey),
        ),
      );

    if (!existing) {
      const [totalRow] = await db
        .select({ total: count() })
        .from(luckyDayBookmarksTable)
        .where(eq(luckyDayBookmarksTable.userId, userId));

      if (Number(totalRow?.total ?? 0) >= BOOKMARK_LIMIT) {
        res.status(400).json({ error: `길일은 최대 ${BOOKMARK_LIMIT}개까지 저장할 수 있습니다.` });
        return;
      }
    }

    const [row] = await db
      .insert(luckyDayBookmarksTable)
      .values({
        userId,
        entryKey,
        title: parsed.title,
        note: parsed.note,
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        purpose: parsed.purpose,
        purposeLabel: parsed.purposeLabel,
        ganzi: parsed.ganzi,
        ganziHanja: parsed.ganziHanja,
        grade: parsed.grade,
        score: parsed.score,
        tags: parsed.tags,
        href,
      })
      .onConflictDoUpdate({
        target: [luckyDayBookmarksTable.userId, luckyDayBookmarksTable.entryKey],
        set: {
          title: parsed.title,
          note: parsed.note,
          year: parsed.year,
          month: parsed.month,
          day: parsed.day,
          purpose: parsed.purpose,
          purposeLabel: parsed.purposeLabel,
          ganzi: parsed.ganzi,
          ganziHanja: parsed.ganziHanja,
          grade: parsed.grade,
          score: parsed.score,
          tags: parsed.tags,
          href,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(toBookmarkPayload(row));
  } catch (error) {
    console.error("lucky day bookmark upsert error:", error);
    res.status(500).json({ error: "길일 저장에 실패했습니다." });
  }
});

router.delete("/account/lucky-days/:entryKey", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const entryKey = decodeURIComponent(String(req.params.entryKey ?? ""));
  if (!entryKey) {
    res.status(400).json({ error: "삭제할 길일이 올바르지 않습니다." });
    return;
  }

  try {
    const rows = await db
      .delete(luckyDayBookmarksTable)
      .where(
        and(
          eq(luckyDayBookmarksTable.userId, String(req.user.id)),
          eq(luckyDayBookmarksTable.entryKey, entryKey),
        ),
      )
      .returning({ id: luckyDayBookmarksTable.id });

    if (rows.length === 0) {
      res.status(404).json({ error: "길일을 찾을 수 없습니다." });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("lucky day bookmark delete error:", error);
    res.status(500).json({ error: "길일 삭제에 실패했습니다." });
  }
});

export default router;
