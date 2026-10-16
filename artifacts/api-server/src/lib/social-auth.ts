import crypto from "node:crypto";
import * as oidc from "openid-client";
import type { IdentityUserInput } from "./auth-users.js";

export type SocialProvider = "google" | "kakao";
export const SOCIAL_FLOW_TTL = 10 * 60 * 1000;
export const SOCIAL_FLOW_COOKIE = "social_auth_flow";
export const SOCIAL_PENDING_COOKIE = "social_auth_pending";
const issuers = { google: "https://accounts.google.com", kakao: "https://kauth.kakao.com" };

export function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "kakao";
}
export function safeSocialReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return "/";
  } catch { return "/"; }
  return value;
}
export function socialAppUrl(): URL | null {
  try {
    const url = new URL(process.env.APP_URL ?? "");
    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
    const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && !production && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return url;
  } catch { return null; }
}
function encryptionKey(): Buffer {
  const secret = process.env.SOCIAL_AUTH_COOKIE_SECRET ?? "";
  if (!/^[a-f\d]{64}$/i.test(secret)) throw new Error("Social authentication cookie key is not configured.");
  return Buffer.from(secret, "hex");
}
export function socialProviderSettings(provider: SocialProvider) {
  const prefix = provider.toUpperCase();
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_OAUTH_CLIENT_SECRET`]?.trim();
  const appUrl = socialAppUrl();
  if (!clientId || !clientSecret || !appUrl) return null;
  try { encryptionKey(); } catch { return null; }
  return { clientId, clientSecret, appUrl, callbackUrl: new URL(`/api/auth/social/${provider}/callback`, appUrl).href };
}
const configs = new Map<string, Promise<oidc.Configuration>>();
export async function socialOidcConfig(provider: SocialProvider): Promise<oidc.Configuration> {
  const settings = socialProviderSettings(provider);
  if (!settings) throw new Error("Social authentication is not configured.");
  const key = JSON.stringify([provider, settings.clientId, settings.clientSecret]);
  let config = configs.get(key);
  if (!config) {
    config = oidc.discovery(new URL(issuers[provider]), settings.clientId, undefined,
      oidc.ClientSecretPost(settings.clientSecret), { timeout: 10, execute: [oidc.enableNonRepudiationChecks] });
    configs.set(key, config);
    config.catch(() => configs.delete(key));
  }
  return config;
}

// Authenticated encryption prevents clients forging a provider subject or
// modifying the nonce, PKCE verifier, destination or expiry in either cookie.
export function sealSocialCookie(purpose: "flow" | "pending", value: Record<string, unknown>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`social-auth:${purpose}:v1`));
  const plaintext = JSON.stringify({ ...value, expiresAt: Date.now() + SOCIAL_FLOW_TTL });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function readSocialCookie<T>(purpose: "flow" | "pending", cookie: unknown): T | null {
  if (typeof cookie !== "string" || cookie.length > 6000 || !/^[a-z\d_-]+$/i.test(cookie)) return null;
  try {
    const data = Buffer.from(cookie, "base64url");
    const cipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
    cipher.setAAD(Buffer.from(`social-auth:${purpose}:v1`));
    cipher.setAuthTag(data.subarray(12, 28));
    const decoded = JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"));
    if (!Number.isFinite(decoded.expiresAt) || decoded.expiresAt <= Date.now() || decoded.expiresAt > Date.now() + SOCIAL_FLOW_TTL) return null;
    return decoded as T;
  } catch { return null; }
}
export interface SocialFlow { provider: SocialProvider; state: string; nonce: string; verifier: string; returnTo: string }
export interface PendingSocialSignup { provider: SocialProvider; identity: IdentityUserInput; returnTo: string }

export function socialIdentity(provider: SocialProvider, claims: Record<string, unknown>): IdentityUserInput {
  if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255) throw new Error("Invalid provider subject.");
  const email = provider === "google" && claims.email_verified === true && typeof claims.email === "string"
    && claims.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) ? claims.email.trim().toLowerCase() : null;
  return { provider: `social:${provider}`, externalId: claims.sub, email, emailVerified: email !== null };
}
