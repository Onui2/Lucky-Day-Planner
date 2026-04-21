import * as oidc from "openid-client";
import { Router, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { count, eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../lib/email.js";
import {
  clearSession,
  getOidcConfig,
  getOidcClientId,
  getSession,
  getSessionId,
  createSession,
  isOidcEnabled,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1시간

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router = Router();

function getOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0];
  const proto = protoHeader?.trim() || req.protocol || "http";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function shouldUseSecureCookies(req: Request): boolean {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0];

  return (protoHeader?.trim() || req.protocol || "http") === "https";
}

function setSessionCookie(res: Response, sid: string) {
  const secure = shouldUseSecureCookies(res.req);
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  const secure = shouldUseSecureCookies(res.req);
  res.cookie(name, value, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

function hasConfiguredPrivilegedEmails(): boolean {
  return Boolean(
    (process.env.SUPER_ADMIN_EMAILS ?? "").trim() ||
    (process.env.ADMIN_EMAILS ?? "").trim(),
  );
}

function resolveRole(email: string | null | undefined, fallback = "user"): string {
  if (isSuperAdminEmail(email)) return "superadmin";
  if (isAdminEmail(email)) return "admin";
  return fallback;
}

async function needsAdminBootstrap(): Promise<boolean> {
  if (hasConfiguredPrivilegedEmails()) {
    return false;
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.role, "admin"),
        eq(usersTable.role, "superadmin"),
      ),
    );

  return Number(total) === 0;
}

async function resolveAssignableRole(
  email: string | null | undefined,
  fallback = "user",
): Promise<string> {
  const explicitRole = resolveRole(email, fallback);

  if (explicitRole !== fallback) {
    return explicitRole;
  }

  if (fallback === "user" && await needsAdminBootstrap()) {
    return "superadmin";
  }

  return fallback;
}

async function upsertUser(claims: Record<string, unknown>) {
  const email = (claims.email as string) || null;
  const subject = String(claims.sub ?? "");
  const [existingUserById] = subject
    ? await db.select().from(usersTable).where(eq(usersTable.id, subject))
    : [];
  const [existingUserByEmail] = !existingUserById && email
    ? await db.select().from(usersTable).where(eq(usersTable.email, email))
    : [];
  const existingUser = existingUserById ?? existingUserByEmail;
  const resolvedRole = await resolveAssignableRole(email, existingUser?.role ?? "user");

  const userData: Record<string, unknown> = {
    id: existingUser?.id ?? subject,
    email,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
    role: resolvedRole,
  };

  const updateData: Record<string, unknown> = { ...userData, updatedAt: new Date() };

  if (existingUser) {
    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, existingUser.id))
      .returning();
    return user;
  }

  const [user] = await db.insert(usersTable).values(userData).returning();
  return user;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/auth/setup-status", async (_req: Request, res: Response) => {
  res.json({
    canSelfBootstrapAdmin: await needsAdminBootstrap(),
    hasConfiguredPrivilegedEmails: hasConfiguredPrivilegedEmails(),
  });
});

router.get("/login", async (req: Request, res: Response) => {
  if (!isOidcEnabled()) {
    const returnTo = getSafeReturnTo(req.query.returnTo);
    res.redirect(`/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
    return;
  }

  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  if (!isOidcEnabled()) {
    res.redirect("/login");
    return;
  }

  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  const session = sid ? await getSession(sid) : null;
  await clearSession(res, sid);

  const hadOidcSession = Boolean(
    session?.access_token || session?.refresh_token,
  );

  if (!hadOidcSession || !isOidcEnabled()) {
    res.redirect("/");
    return;
  }

  try {
    const clientId = getOidcClientId();
    if (!clientId) {
      throw new Error("OIDC client id is not configured.");
    }

    const config = await getOidcConfig();
    const origin = getOrigin(req);
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: clientId,
      post_logout_redirect_uri: origin,
    });
    res.redirect(endSessionUrl.href);
  } catch {
    res.redirect("/");
  }
});

// ─── 로컬 회원가입 ─────────────────────────────────────
router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "유효한 이메일 주소를 입력해주세요." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing.length > 0) {
    res.status(409).json({ error: "이미 사용 중인 이메일입니다." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const role = await resolveAssignableRole(normalizedEmail);

  const displayName = typeof name === "string" && name.trim() ? name.trim() : null;

  const [user] = await db.insert(usersTable).values({
    id: crypto.randomUUID(),
    email: normalizedEmail,
    firstName: displayName,
    passwordHash,
    role,
  }).returning();

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
    },
    access_token: "",
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
    },
  });
});

// ─── 로컬 로그인 ─────────────────────────────────────
router.post("/auth/login-local", async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const role = await resolveAssignableRole(normalizedEmail, user.role ?? "user");

  if (role !== user.role) {
    await db.update(usersTable).set({ role }).where(eq(usersTable.id, user.id));
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role,
    },
    access_token: "",
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      role,
    },
  });
});

// ─── 비밀번호 찾기 (초기화 이메일 발송) ─────────────
router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body as Record<string, unknown>;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "이메일을 입력해주세요." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 보안상 이유로 계정 존재 여부를 노출하지 않음
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user || !user.passwordHash) {
    // 계정이 없거나 소셜 로그인 계정이어도 성공처럼 응답
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db
    .update(usersTable)
    .set({ passwordResetToken: token, passwordResetExpiry: expiry })
    .where(eq(usersTable.id, user.id));

  try {
    await sendPasswordResetEmail(normalizedEmail, token);
  } catch (err) {
    console.error("[비밀번호 초기화] 이메일 발송 실패:", err);
    // 이메일 발송 실패해도 토큰은 저장됨
  }

  res.json({ ok: true });
});

// ─── 비밀번호 초기화 (토큰 검증 + 새 비밀번호 설정) ─
router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body as Record<string, unknown>;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "유효하지 않은 요청입니다." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.passwordResetToken, token));

  if (!user || !user.passwordResetExpiry) {
    res.status(400).json({ error: "초기화 링크가 유효하지 않거나 만료되었습니다." });
    return;
  }

  if (new Date() > user.passwordResetExpiry) {
    res.status(400).json({ error: "초기화 링크가 만료되었습니다. 다시 요청해주세요." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db
    .update(usersTable)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    })
    .where(eq(usersTable.id, user.id));

  res.json({ ok: true });
});

// ─── 토큰 유효성 확인 (폼 진입 전 체크) ─────────────
router.get("/auth/reset-password/verify", async (req: Request, res: Response) => {
  const { token } = req.query as Record<string, unknown>;

  if (!token || typeof token !== "string") {
    res.status(400).json({ valid: false, error: "토큰이 없습니다." });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, expiry: usersTable.passwordResetExpiry })
    .from(usersTable)
    .where(eq(usersTable.passwordResetToken, token));

  if (!user || !user.expiry || new Date() > user.expiry) {
    res.json({ valid: false, error: "링크가 만료되었거나 유효하지 않습니다." });
    return;
  }

  res.json({ valid: true });
});

export default router;
