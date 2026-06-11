import type { MonetizationBirthInfo } from "@workspace/api-client-react";

const STORAGE_PREFIX = "myeonghaewon-ai-chat-sessions:v1";

export interface AiChatSessionRecord {
  id: string;
  birthInfoKey: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  questionIds: number[];
  draft?: boolean;
  imported?: boolean;
}

interface AiChatSessionStore {
  sessions: AiChatSessionRecord[];
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeQuestionIds(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return Array.from(
    new Set(
      raw.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0),
    ),
  );
}

function normalizeSession(raw: unknown): AiChatSessionRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : null;
  const birthInfoKey =
    typeof row.birthInfoKey === "string" && row.birthInfoKey.trim()
      ? row.birthInfoKey.trim()
      : null;
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : "새 세션";
  const createdAt =
    typeof row.createdAt === "string" && row.createdAt
      ? row.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof row.updatedAt === "string" && row.updatedAt
      ? row.updatedAt
      : createdAt;

  if (!id || !birthInfoKey) {
    return null;
  }

  return {
    id,
    birthInfoKey,
    title,
    createdAt,
    updatedAt,
    questionIds: normalizeQuestionIds(row.questionIds),
    draft: row.draft === true,
    imported: row.imported === true,
  };
}

function generateSessionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAiChatBirthInfoKey(birthInfo: MonetizationBirthInfo) {
  return [
    birthInfo.year,
    birthInfo.month,
    birthInfo.day,
    birthInfo.hour,
    birthInfo.minute ?? 0,
    birthInfo.gender,
    birthInfo.calendarType,
  ].join(":");
}

export function buildAiChatSessionTitle(question: string) {
  const cleaned = question.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "새 세션";
  }

  return cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : cleaned;
}

export function sortAiChatSessions(sessions: AiChatSessionRecord[]) {
  return [...sessions].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function createAiChatSessionRecord(
  birthInfoKey: string,
  title = "새 세션",
): AiChatSessionRecord {
  const now = new Date().toISOString();

  return {
    id: generateSessionId(),
    birthInfoKey,
    title,
    createdAt: now,
    updatedAt: now,
    questionIds: [],
    draft: true,
  };
}

export function loadAiChatSessions(userId: string) {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AiChatSessionStore | null;
    if (!parsed || !Array.isArray(parsed.sessions)) {
      return [];
    }

    return sortAiChatSessions(
      parsed.sessions
        .map((session) => normalizeSession(session))
        .filter((session): session is AiChatSessionRecord => Boolean(session)),
    );
  } catch {
    return [];
  }
}

export function saveAiChatSessions(userId: string, sessions: AiChatSessionRecord[]) {
  if (!canUseStorage()) {
    return;
  }

  const normalized = sessions
    .map((session) => normalizeSession(session))
    .filter((session): session is AiChatSessionRecord => Boolean(session));

  window.localStorage.setItem(
    storageKey(userId),
    JSON.stringify({ sessions: sortAiChatSessions(normalized) }),
  );
}
