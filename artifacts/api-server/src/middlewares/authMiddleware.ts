import * as oidc from "openid-client";
import { type Request, type Response } from "express";
import {
  clearSession,
  getBearerToken,
  getOidcConfig,
  getSession,
  getSessionId,
  updateSession,
  type SessionData,
} from "../lib/auth.js";
import {
  isSupabaseAuthEnabled,
  verifySupabaseAccessToken,
} from "../lib/supabase-auth.js";

interface SessionUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
}

type AuthAwareRequest = Request & {
  isAuthenticated?: () => boolean;
  user?: SessionUser;
};

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) {
    return session;
  }

  if (!session.refresh_token) {
    return null;
  }

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(config, session.refresh_token);
    const expiresIn = tokens.expiresIn();
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at =
      typeof expiresIn === "number" ? now + expiresIn : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
): Promise<void> {
  const authReq = req as AuthAwareRequest;

  authReq.isAuthenticated = function (
    this: AuthAwareRequest,
  ): this is AuthAwareRequest & { user: SessionUser } {
    return this.user != null;
  };

  const bearerToken = getBearerToken(authReq);
  if (bearerToken && isSupabaseAuthEnabled()) {
    const user = await verifySupabaseAccessToken(bearerToken);
    if (user) {
      authReq.user = user;
      next();
      return;
    }
  }

  const sid = getSessionId(authReq);
  if (!sid) {
    next();
    return;
  }

  let session: SessionData | null = null;
  try {
    session = await getSession(sid);
  } catch (error) {
    console.error("[auth] failed to load session:", error);
    await clearSession(res, sid);
    next();
    return;
  }

  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  authReq.user = {
    ...refreshed.user,
    role: refreshed.user.role ?? "user",
  };

  next();
}
