import * as oidc from "openid-client";
import { type Request, type Response } from "express";
import {
  clearSession,
  getOidcConfig,
  getSession,
  getSessionId,
  updateSession,
  type SessionData,
} from "../lib/auth.js";

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

  const sid = getSessionId(authReq);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
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
