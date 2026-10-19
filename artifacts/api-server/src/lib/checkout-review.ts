import crypto from "node:crypto";
import type { TossPayOrder } from "./toss-pay.js";

export const REVIEW_COOKIE = "toss_pay_review";
export const REVIEW_TTL = 20 * 60_000;

export function reviewSettings() {
  if (process.env.TOSS_PAY_REVIEW_ENABLED !== "true") return null;
  const key = process.env.TOSS_PAY_REVIEW_API_KEY?.trim() ?? "";
  const secret = process.env.TOSS_PAY_REVIEW_COOKIE_SECRET ?? "";
  if (!/^sk_test_[A-Za-z0-9]{1,22}$/.test(key) || !/^[a-f\d]{64}$/i.test(secret)) return null;
  try {
    const url = new URL(process.env.APP_URL ?? "");
    const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && !production && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return { origin: url.origin, secure: url.protocol === "https:", key: Buffer.from(secret, "hex") };
  } catch { return null; }
}

export function sealReviewOrder(order: TossPayOrder): string {
  const settings = reviewSettings();
  if (!settings) throw new Error("Review unavailable");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", settings.key, iv);
  cipher.setAAD(Buffer.from("toss-pay-review:v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ order, expiresAt: Date.now() + REVIEW_TTL }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readReviewOrder(cookie: unknown): TossPayOrder | null {
  const settings = reviewSettings();
  if (!settings || typeof cookie !== "string" || cookie.length > 4000 || !/^[a-z\d_-]+$/i.test(cookie)) return null;
  try {
    const data = Buffer.from(cookie, "base64url");
    const cipher = crypto.createDecipheriv("aes-256-gcm", settings.key, data.subarray(0, 12));
    cipher.setAAD(Buffer.from("toss-pay-review:v1"));
    cipher.setAuthTag(data.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"));
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now() || payload.expiresAt > Date.now() + REVIEW_TTL) return null;
    if (!/^MHW_REVIEW_[a-f\d]{32}$/.test(payload.order?.orderId) || payload.order.metadata?.tossPayMode !== "TEST") return null;
    return payload.order;
  } catch { return null; }
}
