import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

export const OIDC_ISSUER_URL =
  process.env.OIDC_ISSUER_URL ??
  process.env.ISSUER_URL ??
  "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

let oidcConfig: client.Configuration | null = null;

export function getOidcClientId(): string | null {
  return process.env.OIDC_CLIENT_ID ?? process.env.REPL_ID ?? null;
}

export function isOidcEnabled(): boolean {
  return Boolean(getOidcClientId());
}

export async function getOidcConfig(): Promise<client.Configuration> {
  const clientId = getOidcClientId();

  if (!isOidcEnabled()) {
    throw new Error(
      "OIDC is disabled because OIDC_CLIENT_ID is not configured.",
    );
  }

  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(OIDC_ISSUER_URL),
      clientId!,
    );
  }
  return oidcConfig;
}

// ─── 세션 인메모리 캐시 ──────────────────────────────
// 모든 인증 요청이 getSession으로 DB를 조회하던 것을, 짧은 TTL 동안 캐시해
// 원격 DB 왕복을 줄인다. 서버리스 다중 인스턴스에서는 인스턴스별 캐시라
// 다른 인스턴스의 로그아웃/역할변경이 최대 TTL(30초)까지 지연될 수 있다.
const SESSION_CACHE_TTL = 30_000;
const SESSION_CACHE_MAX = 5000;
type SessionCacheEntry = { data: SessionData; cachedAt: number; expire: number };
const sessionCache = new Map<string, SessionCacheEntry>();

function cacheSession(sid: string, data: SessionData, expire: number): void {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    const now = Date.now();
    for (const [key, entry] of sessionCache) {
      if (now - entry.cachedAt >= SESSION_CACHE_TTL) sessionCache.delete(key);
    }
    if (sessionCache.size >= SESSION_CACHE_MAX) sessionCache.clear();
  }
  sessionCache.set(sid, { data, cachedAt: Date.now(), expire });
}

function invalidateSessionCache(sid: string): void {
  sessionCache.delete(sid);
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + SESSION_TTL);
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire,
  });
  cacheSession(sid, data, expire.getTime());
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const now = Date.now();
  const cached = sessionCache.get(sid);
  if (cached && now - cached.cachedAt < SESSION_CACHE_TTL) {
    if (cached.expire <= now) {
      invalidateSessionCache(sid);
      await deleteSessionQuietly(sid, "expired-session");
      return null;
    }
    return cached.data;
  }

  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    invalidateSessionCache(sid);
    if (row) {
      await deleteSessionQuietly(sid, "expired-session");
    }
    return null;
  }

  const data = row.sess as unknown as SessionData;
  cacheSession(sid, data, row.expire.getTime());
  return data;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  const expire = new Date(Date.now() + SESSION_TTL);
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire,
    })
    .where(eq(sessionsTable.sid, sid));
  cacheSession(sid, data, expire.getTime());
}

export async function deleteSession(sid: string): Promise<void> {
  invalidateSessionCache(sid);
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

async function deleteSessionQuietly(
  sid: string,
  context: string,
): Promise<void> {
  try {
    await deleteSession(sid);
  } catch (error) {
    console.error(`[auth] failed to delete session during ${context}:`, error);
  }
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) {
    await deleteSessionQuietly(sid, "clear-session");
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  return req.cookies?.[SESSION_COOKIE];
}

export function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return undefined;
}
