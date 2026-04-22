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

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) {
      await deleteSessionQuietly(sid, "expired-session");
    }
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
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
