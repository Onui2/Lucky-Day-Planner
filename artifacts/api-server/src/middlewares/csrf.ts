import crypto from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { getBearerToken, getSessionId } from "../lib/auth.js";

export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "x-csrf-token";

const CSRF_TTL = 2 * 60 * 60 * 1000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PUBLIC_MUTATION_PATHS = new Set([
  "/api/auth/register",
  "/api/auth/login-local",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/saju/calculate",
  "/api/gungap/compare",
  "/api/saju/share",
  "/api/year-fortune",
  "/api/saju/monthly",
  "/api/love-fortune",
  "/api/dream/search",
  "/api/name-analysis",
]);

function shouldUseSecureCookies(req: Request): boolean {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0];

  return (protoHeader?.trim() || req.protocol || "http") === "https";
}

function isValidTokenShape(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function getHeaderToken(req: Request) {
  const value = req.headers[CSRF_HEADER];
  return Array.isArray(value) ? value[0] : value;
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function setCsrfCookie(req: Request, res: Response, token: string) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(req),
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_TTL,
  });
}

export function issueCsrfToken(req: Request, res: Response) {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token = isValidTokenShape(existing)
    ? existing
    : crypto.randomBytes(32).toString("hex");

  setCsrfCookie(req, res, token);
  return token;
}

function shouldValidateCsrf(req: Request) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return false;
  }

  if (getBearerToken(req)) {
    return false;
  }

  if (PUBLIC_MUTATION_PATHS.has(req.path)) {
    return false;
  }

  return Boolean(getSessionId(req) && req.isAuthenticated());
}

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (!shouldValidateCsrf(req)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = getHeaderToken(req);

  if (
    isValidTokenShape(cookieToken) &&
    isValidTokenShape(headerToken) &&
    timingSafeEqual(cookieToken, headerToken)
  ) {
    next();
    return;
  }

  res.status(403).json({
    error: "보안 토큰이 만료되었거나 유효하지 않습니다. 새로고침 후 다시 시도해주세요.",
    code: "CSRF_TOKEN_INVALID",
  });
};
