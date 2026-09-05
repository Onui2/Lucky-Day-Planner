import type { Request, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db, hasDatabaseConfig } from "@workspace/db";

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

// In-memory fallback, only used when no database is configured (e.g. local
// dev without DATABASE_URL). On Vercel, each request can land on a separate
// serverless instance, so an in-memory-only store would let attackers scale
// their effective rate limit with the number of instances handling their
// traffic — see memoryStores below for why this must not be the primary store.
const memoryStores = new Map<string, Map<string, RateLimitBucket>>();

function getMemoryStore(name: string) {
  let store = memoryStores.get(name);
  if (!store) {
    store = new Map();
    memoryStores.set(name, store);
  }
  return store;
}

function incrementMemoryBucket(name: string, key: string, windowMs: number): RateLimitBucket {
  const store = getMemoryStore(name);
  const now = Date.now();
  const existing = store.get(key);
  const bucket =
    existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  store.set(key, bucket);
  return bucket;
}

const memoryCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const store of memoryStores.values()) {
    for (const [key, bucket] of store.entries()) {
      if (bucket.resetAt <= now) {
        store.delete(key);
      }
    }
  }
}, 60_000);
memoryCleanupTimer.unref?.();

// Chance (per request) of opportunistically sweeping expired rows out of the
// shared table. There is no long-lived process here to run a cron-style
// cleanup on serverless, so this piggybacks on normal traffic instead.
const DB_CLEANUP_PROBABILITY = 0.01;

async function incrementDbBucket(
  name: string,
  key: string,
  windowMs: number,
): Promise<RateLimitBucket | null> {
  try {
    const candidateResetAt = new Date(Date.now() + windowMs);
    const result = await db.execute<{ count: number; reset_at: string }>(sql`
      INSERT INTO rate_limit_buckets (bucket_name, key, count, reset_at)
      VALUES (${name}, ${key}, 1, ${candidateResetAt})
      ON CONFLICT (bucket_name, key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets.reset_at > now() THEN rate_limit_buckets.count + 1
          ELSE 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at > now() THEN rate_limit_buckets.reset_at
          ELSE ${candidateResetAt}
        END
      RETURNING count, reset_at
    `);

    if (Math.random() < DB_CLEANUP_PROBABILITY) {
      void db
        .execute(sql`DELETE FROM rate_limit_buckets WHERE reset_at < now() - interval '1 day'`)
        .catch((error) => console.error("[rateLimit:cleanup]", error));
    }

    const row = (result as unknown as { rows: Array<{ count: number; reset_at: string }> }).rows[0];
    if (!row) return null;

    return { count: Number(row.count), resetAt: new Date(row.reset_at).getTime() };
  } catch (error) {
    console.error(`[rateLimit:${name}]`, error);
    return null;
  }
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
  return async (req, res, next) => {
    if (!matchesMethod(req, methods) || skip?.(req)) {
      next();
      return;
    }

    const key = keyGenerator(req);

    // Shared across all serverless instances via Postgres; falls back to a
    // per-instance in-memory bucket only when no database is configured, and
    // fails open (allows the request) if the database is unreachable, so
    // rate limiting itself never becomes an outage.
    const bucket = hasDatabaseConfig()
      ? (await incrementDbBucket(name, key, windowMs)) ?? incrementMemoryBucket(name, key, windowMs)
      : incrementMemoryBucket(name, key, windowMs);

    const now = Date.now();
    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));

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
