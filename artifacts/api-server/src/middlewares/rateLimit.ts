import type { Request, RequestHandler } from "express";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
  methods?: string[];
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

const stores = new Map<string, Map<string, RateLimitBucket>>();

function getStore(name: string) {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstForwardedFor = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0];

  return (
    firstForwardedFor?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function defaultKeyGenerator(req: Request) {
  return `ip:${getClientIp(req)}`;
}

function matchesMethod(req: Request, methods?: string[]) {
  if (!methods?.length) return true;
  const method = req.method.toUpperCase();
  return methods.some((item) => item.toUpperCase() === method);
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, bucket] of store.entries()) {
      if (bucket.resetAt <= now) {
        store.delete(key);
      }
    }
  }
}, 60_000);
cleanupTimer.unref?.();

export function rateLimitKeyByUserOrIp(req: Request) {
  return req.user?.id ? `user:${req.user.id}` : defaultKeyGenerator(req);
}

export function rateLimitKeyByEmailAndIp(req: Request) {
  const rawEmail =
    req.body && typeof req.body === "object"
      ? (req.body as Record<string, unknown>).email
      : null;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  return `${defaultKeyGenerator(req)}:email:${email || "unknown"}`;
}

export function createRateLimiter({
  name,
  windowMs,
  max,
  methods,
  keyGenerator = defaultKeyGenerator,
  skip,
}: RateLimitOptions): RequestHandler {
  const store = getStore(name);

  return (req, res, next) => {
    if (!matchesMethod(req, methods) || skip?.(req)) {
      next();
      return;
    }

    const now = Date.now();
    const key = keyGenerator(req);
    const existing = store.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    store.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }

    next();
  };
}
