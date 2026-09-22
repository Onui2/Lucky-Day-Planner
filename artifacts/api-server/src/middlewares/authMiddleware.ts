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
import { IdentityAuthError } from "../lib/auth-users.js";
import { isDatabaseAvailable } from "../lib/database-guard.js";

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
  const sid = getSessionId(authReq);
  if ((bearerToken || sid) && !(await isDatabaseAvailable())) {
    res.status(503).json({ error: "인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요." });
    return;
  }
  if (bearerToken) {
    try {
      const user = isSupabaseAuthEnabled() ? await verifySupabaseAccessToken(bearerToken) : null;
      if (!user) {
        res.status(401).json({ error: "로그인 토큰이 유효하지 않습니다. 다시 로그인해주세요." });
        return;
      }
      authReq.user = user;
    } catch (error) {
      if (error instanceof IdentityAuthError) {
        res.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      next(error);
      return;
    }
    // An invalid bearer must never fall back to cookie authentication, which
    // would also bypass the bearer-token CSRF exemption.
    next();
    return;
  }

  if (!sid) {
    next();
    return;
  }

  let session: SessionData | null = null;
  try {
    session = await getSession(sid);
  } catch (error) {
    console.error("[auth] failed to load session:", error);
    res.status(503).json({ error: "인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요." });
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
