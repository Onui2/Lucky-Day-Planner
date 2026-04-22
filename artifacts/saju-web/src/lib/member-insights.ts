export interface LuckyDayBookmark {
  id: string;
  title: string;
  note?: string;
  year: number;
  month: number;
  day: number;
  purpose: string;
  purposeLabel: string;
  ganzi: string;
  ganziHanja: string;
  grade: "대길" | "길" | "보통" | "흉" | "대흉";
  score: number;
  tags: string[];
  href: string;
  createdAt: string;
}

export interface RecentActivityItem {
  id: string;
  kind: "saju" | "day-pillar" | "lucky-day";
  title: string;
  subtitle?: string;
  href: string;
  createdAt: string;
}

const INSIGHTS_PREFIX = "myunghae_member_insights";
const RECENTS_LIMIT = 12;
const BOOKMARKS_LIMIT = 30;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getScopedKey(section: string, userId?: string | null) {
  return userId ? `${INSIGHTS_PREFIX}:${section}:${userId}` : null;
}

function readScopedArray<T>(section: string, userId?: string | null): T[] {
  if (!canUseStorage()) return [];

  const key = getScopedKey(section, userId);
  if (!key) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeScopedArray<T>(section: string, userId: string, values: T[]) {
  if (!canUseStorage()) return;

  const key = getScopedKey(section, userId);
  if (!key) return;

  window.localStorage.setItem(key, JSON.stringify(values));
}

export function createLuckyDayBookmarkId(
  year: number,
  month: number,
  day: number,
  purpose: string,
) {
  return `${year}-${month}-${day}:${purpose}`;
}

export function getLuckyDayBookmarks(userId?: string | null) {
  return readScopedArray<LuckyDayBookmark>("lucky-day-bookmarks", userId);
}

export function upsertLuckyDayBookmark(userId: string, bookmark: LuckyDayBookmark) {
  const current = getLuckyDayBookmarks(userId);
  const next = [
    bookmark,
    ...current.filter((item) => item.id !== bookmark.id),
  ].slice(0, BOOKMARKS_LIMIT);

  writeScopedArray("lucky-day-bookmarks", userId, next);
  return next;
}

export function removeLuckyDayBookmark(userId: string, bookmarkId: string) {
  const next = getLuckyDayBookmarks(userId).filter((item) => item.id !== bookmarkId);
  writeScopedArray("lucky-day-bookmarks", userId, next);
  return next;
}

export function getRecentActivities(userId?: string | null) {
  return readScopedArray<RecentActivityItem>("recent-activities", userId);
}

export function addRecentActivity(userId: string, activity: RecentActivityItem) {
  const current = getRecentActivities(userId);
  const next = [
    activity,
    ...current.filter((item) => item.id !== activity.id),
  ].slice(0, RECENTS_LIMIT);

  writeScopedArray("recent-activities", userId, next);
  return next;
}

export function clearRecentActivities(userId: string) {
  writeScopedArray<RecentActivityItem>("recent-activities", userId, []);
  return [];
}

export function formatBookmarkDate(item: Pick<LuckyDayBookmark, "year" | "month" | "day">) {
  return `${item.year}년 ${item.month}월 ${item.day}일`;
}
