import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { authIdentitiesTable, db, sessionsTable, usersTable, type User } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

export const OIDC_ISSUER_URL =
  process.env.OIDC_ISSUER_URL ??
  process.env.ISSUER_URL ??
  "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  authVersion: number;
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

export type AuthTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class AuthStateChangedError extends Error {
  constructor() {
    super("계정 인증 정보가 변경되었습니다. 다시 로그인해주세요.");
  }
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
  };
}

// Call inside the same transaction as the credential/role/account change.
// Version checking also prevents a login that verified an old password before
// this transaction from creating a new session after revocation completes.
export async function revokeUserSessions(tx: AuthTransaction, userId: string): Promise<void> {
  await tx.update(usersTable).set({
    authVersion: sql`${usersTable.authVersion} + 1`,
    authValidAfter: new Date(),
  }).where(eq(usersTable.id, userId));
  await tx.delete(sessionsTable).where(sql`${sessionsTable.sess}->'user'->>'id' = ${userId}`);
}

export async function lockLegacyUserId(tx: AuthTransaction, userId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`legacy-user:${userId}`}, 0))`);
}

export async function deleteUserAccount(tx: AuthTransaction, userId: string): Promise<void> {
  await lockLegacyUserId(tx, userId);
  const [user] = await tx.select().from(usersTable)
    .where(eq(usersTable.id, userId)).for("update");
  if (!user) return;
  await revokeUserSessions(tx, userId);
  // Pre-upgrade external accounts may not have a provider binding yet.
  await tx.insert(authIdentitiesTable).values({
    provider: "legacy-deleted", subject: userId, userId: null,
  }).onConflictDoNothing();
  await tx.delete(usersTable).where(eq(usersTable.id, userId));
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + SESSION_TTL);
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable)
      .where(eq(usersTable.id, data.user.id)).for("update");
    if (!user || user.authVersion !== data.authVersion) {
      throw new AuthStateChangedError();
    }
    await tx.insert(sessionsTable).values({
      sid,
      sess: { ...data, user: toAuthUser(user) } as unknown as Record<string, unknown>,
      expire,
    });
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  // No per-instance auth cache: revocations must apply across all instances.
  const [row] = await db
    .select({ session: sessionsTable, user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sql`${sessionsTable.sess}->'user'->>'id'`))
    .where(eq(sessionsTable.sid, sid));

  const data = row?.session.sess as unknown as SessionData | undefined;
  if (!row || !data || row.session.expire.getTime() <= Date.now() ||
      !Number.isInteger(data?.authVersion) || data?.authVersion !== row.user.authVersion) {
    if (row) {
      await deleteSessionQuietly(sid, "expired-session");
    }
    return null;
  }

  return { ...data, user: toAuthUser(row.user) };
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  const expire = new Date(Date.now() + SESSION_TTL);
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable)
      .where(eq(usersTable.id, data.user.id)).for("update");
    if (!user || user.authVersion !== data.authVersion) throw new AuthStateChangedError();
    const updated = await tx.update(sessionsTable).set({
      sess: { ...data, user: toAuthUser(user) } as unknown as Record<string, unknown>,
      expire,
    }).where(eq(sessionsTable.sid, sid)).returning({ sid: sessionsTable.sid });
    if (!updated.length) throw new AuthStateChangedError();
  });
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
