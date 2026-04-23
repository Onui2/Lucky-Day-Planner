import { customFetch } from "@workspace/api-client-react";

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
  grade: string;
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

interface MemberInsightsResponse {
  bookmarks: LuckyDayBookmark[];
  recentActivities: RecentActivityItem[];
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
    return Array.isArray(parsed) ? (parsed as T[]) : [];
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

function writeLocalInsights(userId: string, payload: MemberInsightsResponse) {
  writeScopedArray("lucky-day-bookmarks", userId, payload.bookmarks);
  writeScopedArray("recent-activities", userId, payload.recentActivities);
}

function getLocalInsights(userId: string): MemberInsightsResponse {
  return {
    bookmarks: readScopedArray<LuckyDayBookmark>("lucky-day-bookmarks", userId),
    recentActivities: readScopedArray<RecentActivityItem>("recent-activities", userId),
  };
}

async function fetchRemoteInsights(): Promise<MemberInsightsResponse> {
  return customFetch<MemberInsightsResponse>("/api/member-insights");
}

async function syncLegacyInsights(userId: string): Promise<MemberInsightsResponse | null> {
  const legacy = getLocalInsights(userId);
  if (legacy.bookmarks.length === 0 && legacy.recentActivities.length === 0) {
    return null;
  }

  const synced = await customFetch<MemberInsightsResponse>("/api/member-insights/sync", {
    method: "POST",
    body: JSON.stringify(legacy),
  });
  writeLocalInsights(userId, synced);
  return synced;
}

async function loadInsights(userId?: string | null): Promise<MemberInsightsResponse> {
  if (!userId) {
    return { bookmarks: [], recentActivities: [] };
  }

  try {
    const remote = await fetchRemoteInsights();
    if (remote.bookmarks.length > 0 || remote.recentActivities.length > 0) {
      writeLocalInsights(userId, remote);
      return remote;
    }

    const synced = await syncLegacyInsights(userId);
    if (synced) {
      return synced;
    }

    writeLocalInsights(userId, remote);
    return remote;
  } catch {
    return getLocalInsights(userId);
  }
}

function localUpsertBookmark(userId: string, bookmark: LuckyDayBookmark) {
  const current = readScopedArray<LuckyDayBookmark>("lucky-day-bookmarks", userId);
  const next = [bookmark, ...current.filter((item) => item.id !== bookmark.id)].slice(
    0,
    BOOKMARKS_LIMIT,
  );

  writeScopedArray("lucky-day-bookmarks", userId, next);
  return next;
}

function localRemoveBookmark(userId: string, bookmarkId: string) {
  const next = readScopedArray<LuckyDayBookmark>("lucky-day-bookmarks", userId).filter(
    (item) => item.id !== bookmarkId,
  );
  writeScopedArray("lucky-day-bookmarks", userId, next);
  return next;
}

function localAddRecentActivity(userId: string, activity: RecentActivityItem) {
  const current = readScopedArray<RecentActivityItem>("recent-activities", userId);
  const next = [activity, ...current.filter((item) => item.id !== activity.id)].slice(
    0,
    RECENTS_LIMIT,
  );

  writeScopedArray("recent-activities", userId, next);
  return next;
}

function localClearRecentActivities(userId: string) {
  writeScopedArray<RecentActivityItem>("recent-activities", userId, []);
  return [];
}

export function createLuckyDayBookmarkId(
  year: number,
  month: number,
  day: number,
  purpose: string,
) {
  return `${year}-${month}-${day}:${purpose}`;
}

export async function getLuckyDayBookmarks(userId?: string | null) {
  const data = await loadInsights(userId);
  return data.bookmarks;
}

export async function upsertLuckyDayBookmark(userId: string, bookmark: LuckyDayBookmark) {
  try {
    const data = await customFetch<{ bookmarks: LuckyDayBookmark[] }>(
      "/api/member-insights/bookmarks",
      {
        method: "PUT",
        body: JSON.stringify({ bookmark }),
      },
    );
    writeScopedArray("lucky-day-bookmarks", userId, data.bookmarks);
    return data.bookmarks;
  } catch {
    return localUpsertBookmark(userId, bookmark);
  }
}

export async function removeLuckyDayBookmark(userId: string, bookmarkId: string) {
  try {
    const data = await customFetch<{ bookmarks: LuckyDayBookmark[] }>(
      `/api/member-insights/bookmarks/${encodeURIComponent(bookmarkId)}`,
      { method: "DELETE" },
    );
    writeScopedArray("lucky-day-bookmarks", userId, data.bookmarks);
    return data.bookmarks;
  } catch {
    return localRemoveBookmark(userId, bookmarkId);
  }
}

export async function getRecentActivities(userId?: string | null) {
  const data = await loadInsights(userId);
  return data.recentActivities;
}

export async function addRecentActivity(userId: string, activity: RecentActivityItem) {
  try {
    const data = await customFetch<{ recentActivities: RecentActivityItem[] }>(
      "/api/member-insights/recent-activities",
      {
        method: "POST",
        body: JSON.stringify({ activity }),
      },
    );
    writeScopedArray("recent-activities", userId, data.recentActivities);
    return data.recentActivities;
  } catch {
    return localAddRecentActivity(userId, activity);
  }
}

export async function clearRecentActivities(userId: string) {
  try {
    const data = await customFetch<{ recentActivities: RecentActivityItem[] }>(
      "/api/member-insights/recent-activities",
      { method: "DELETE" },
    );
    writeScopedArray("recent-activities", userId, data.recentActivities);
    return data.recentActivities;
  } catch {
    return localClearRecentActivities(userId);
  }
}

export function formatBookmarkDate(item: Pick<LuckyDayBookmark, "year" | "month" | "day">) {
  return `${item.year}년 ${item.month}월 ${item.day}일`;
}
