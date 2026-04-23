import { Router, type Request, type Response } from "express";
import {
  db,
  memberBookmarksTable,
  recentActivitiesTable,
  type StoredLuckyDayBookmark,
  type StoredRecentActivityItem,
  type StoredUserProfile,
  userProfilesTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";

import { requireDatabase } from "../lib/database-guard.js";

const router = Router();

const BOOKMARKS_LIMIT = 30;
const RECENTS_LIMIT = 12;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNumber(value: unknown, fallback?: number): number | undefined {
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }

  return fallback;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeProfile(value: unknown): StoredUserProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const gender = value.gender === "female" ? "female" : value.gender === "male" ? "male" : null;
  const calendarType =
    value.calendarType === "lunar"
      ? "lunar"
      : value.calendarType === "solar"
        ? "solar"
        : null;
  const birthYear = asNumber(value.birthYear);
  const birthMonth = asNumber(value.birthMonth);
  const birthDay = asNumber(value.birthDay);
  const birthHour = asNumber(value.birthHour, -1);

  if (!gender || !calendarType || !birthYear || !birthMonth || !birthDay || birthHour === undefined) {
    return null;
  }

  return {
    name: asString(value.name),
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute: asNumber(value.birthMinute),
    calendarType,
    dayMasterElement: asString(value.dayMasterElement),
    dayMasterStem: asString(value.dayMasterStem),
    dayMasterBranch: asString(value.dayMasterBranch),
    yearStem: asString(value.yearStem),
    yearBranch: asString(value.yearBranch),
    monthStem: asString(value.monthStem),
    monthBranch: asString(value.monthBranch),
    hourStem: asString(value.hourStem),
    hourBranch: asString(value.hourBranch),
  };
}

function normalizeBookmark(value: unknown): StoredLuckyDayBookmark | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const title = asString(value.title);
  const purpose = asString(value.purpose);
  const purposeLabel = asString(value.purposeLabel);
  const ganzi = asString(value.ganzi);
  const ganziHanja = asString(value.ganziHanja);
  const href = asString(value.href);
  const createdAt = asString(value.createdAt) ?? new Date().toISOString();
  const year = asNumber(value.year);
  const month = asNumber(value.month);
  const day = asNumber(value.day);
  const score = asNumber(value.score, 0) ?? 0;

  if (!id || !title || !purpose || !purposeLabel || !ganzi || !ganziHanja || !href || !year || !month || !day) {
    return null;
  }

  return {
    id,
    title,
    note: asString(value.note),
    year,
    month,
    day,
    purpose,
    purposeLabel,
    ganzi,
    ganziHanja,
    grade: asString(value.grade) ?? "보통",
    score,
    tags: Array.isArray(value.tags)
      ? value.tags.map((item) => asString(item)).filter((item): item is string => Boolean(item))
      : [],
    href,
    createdAt,
  };
}

function normalizeRecentActivity(value: unknown): StoredRecentActivityItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const kind =
    value.kind === "saju" || value.kind === "day-pillar" || value.kind === "lucky-day"
      ? value.kind
      : null;
  const title = asString(value.title);
  const href = asString(value.href);
  const createdAt = asString(value.createdAt) ?? new Date().toISOString();

  if (!id || !kind || !title || !href) {
    return null;
  }

  return {
    id,
    kind,
    title,
    subtitle: asString(value.subtitle),
    href,
    createdAt,
  };
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function readBookmarks(userId: string): Promise<StoredLuckyDayBookmark[]> {
  const rows = await db
    .select({ payload: memberBookmarksTable.payload })
    .from(memberBookmarksTable)
    .where(eq(memberBookmarksTable.userId, userId))
    .orderBy(desc(memberBookmarksTable.updatedAt));

  return rows.map((row) => row.payload).filter(Boolean);
}

async function readRecentActivities(userId: string): Promise<StoredRecentActivityItem[]> {
  const rows = await db
    .select({ payload: recentActivitiesTable.payload })
    .from(recentActivitiesTable)
    .where(eq(recentActivitiesTable.userId, userId))
    .orderBy(desc(recentActivitiesTable.updatedAt));

  return rows.map((row) => row.payload).filter(Boolean);
}

async function replaceBookmarks(userId: string, bookmarks: StoredLuckyDayBookmark[]) {
  const normalized = sortByCreatedAtDesc(bookmarks).slice(0, BOOKMARKS_LIMIT);

  await db.transaction(async (tx) => {
    await tx.delete(memberBookmarksTable).where(eq(memberBookmarksTable.userId, userId));

    if (normalized.length === 0) {
      return;
    }

    await tx.insert(memberBookmarksTable).values(
      normalized.map((bookmark) => ({
        userId,
        bookmarkId: bookmark.id,
        payload: bookmark,
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(),
      })),
    );
  });

  return normalized;
}

async function replaceRecentActivities(
  userId: string,
  recentActivities: StoredRecentActivityItem[],
) {
  const normalized = sortByCreatedAtDesc(recentActivities).slice(0, RECENTS_LIMIT);

  await db.transaction(async (tx) => {
    await tx.delete(recentActivitiesTable).where(eq(recentActivitiesTable.userId, userId));

    if (normalized.length === 0) {
      return;
    }

    await tx.insert(recentActivitiesTable).values(
      normalized.map((activity) => ({
        userId,
        activityId: activity.id,
        kind: activity.kind,
        payload: activity,
        createdAt: new Date(activity.createdAt),
        updatedAt: new Date(),
      })),
    );
  });

  return normalized;
}

router.get("/profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const [row] = await db
    .select({ profile: userProfilesTable.profile })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  res.json({ profile: row?.profile ?? null });
});

router.put("/profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const profile = normalizeProfile((req.body as Record<string, unknown>)?.profile ?? req.body);

  if (!profile) {
    res.status(400).json({ error: "유효한 프로필 정보가 아닙니다." });
    return;
  }

  const [existing] = await db
    .select({ userId: userProfilesTable.userId })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (existing) {
    await db
      .update(userProfilesTable)
      .set({ profile, updatedAt: new Date() })
      .where(eq(userProfilesTable.userId, userId));
  } else {
    await db.insert(userProfilesTable).values({ userId, profile });
  }

  res.json({ profile });
});

router.delete("/profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  await db.delete(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  res.json({ ok: true });
});

router.get("/member-insights", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const [bookmarks, recentActivities] = await Promise.all([
    readBookmarks(userId),
    readRecentActivities(userId),
  ]);

  res.json({ bookmarks, recentActivities });
});

router.put("/member-insights/bookmarks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const bookmark = normalizeBookmark((req.body as Record<string, unknown>)?.bookmark);

  if (!bookmark) {
    res.status(400).json({ error: "유효한 북마크 정보가 아닙니다." });
    return;
  }

  const current = await readBookmarks(userId);
  const next = [bookmark, ...current.filter((item) => item.id !== bookmark.id)];
  const bookmarks = await replaceBookmarks(userId, next);

  res.json({ bookmarks });
});

router.delete("/member-insights/bookmarks/:bookmarkId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const bookmarkId = String(req.params.bookmarkId);
  const current = await readBookmarks(userId);
  const bookmarks = await replaceBookmarks(
    userId,
    current.filter((item) => item.id !== bookmarkId),
  );

  res.json({ bookmarks });
});

router.post("/member-insights/recent-activities", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const activity = normalizeRecentActivity((req.body as Record<string, unknown>)?.activity);

  if (!activity) {
    res.status(400).json({ error: "유효한 최근 활동 정보가 아닙니다." });
    return;
  }

  const current = await readRecentActivities(userId);
  const next = [activity, ...current.filter((item) => item.id !== activity.id)];
  const recentActivities = await replaceRecentActivities(userId, next);

  res.json({ recentActivities });
});

router.delete("/member-insights/recent-activities", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const recentActivities = await replaceRecentActivities(userId, []);

  res.json({ recentActivities });
});

router.post("/member-insights/sync", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const userId = String(req.user.id);
  const body = (req.body as Record<string, unknown>) ?? {};
  const incomingBookmarks = Array.isArray(body.bookmarks)
    ? body.bookmarks
        .map((bookmark) => normalizeBookmark(bookmark))
        .filter((bookmark): bookmark is StoredLuckyDayBookmark => Boolean(bookmark))
    : [];
  const incomingRecentActivities = Array.isArray(body.recentActivities)
    ? body.recentActivities
        .map((activity) => normalizeRecentActivity(activity))
        .filter((activity): activity is StoredRecentActivityItem => Boolean(activity))
    : [];

  const [currentBookmarks, currentRecentActivities] = await Promise.all([
    readBookmarks(userId),
    readRecentActivities(userId),
  ]);

  const bookmarks = currentBookmarks.length > 0
    ? currentBookmarks
    : await replaceBookmarks(userId, incomingBookmarks);
  const recentActivities = currentRecentActivities.length > 0
    ? currentRecentActivities
    : await replaceRecentActivities(userId, incomingRecentActivities);

  res.json({
    bookmarks: bookmarks ?? [],
    recentActivities: recentActivities ?? [],
  });
});

export default router;
