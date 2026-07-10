/// <reference path="./types/express.d.ts" />

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ensureDatabaseSchema, hasDatabaseConfig } from "@workspace/db";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import { csrfProtection } from "./middlewares/csrf.js";
import {
  createRateLimiter,
  rateLimitKeyByEmailAndIp,
  rateLimitKeyByUserOrIp,
} from "./middlewares/rateLimit.js";
import router from "./routes/index.js";

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function collectCorsOrigins(): Set<string> {
  const origins = new Set<string>();

  function add(value: string | undefined): void {
    if (!value) {
      return;
    }

    for (const part of value.split(",")) {
      const origin = normalizeOrigin(part);

      if (origin) {
        origins.add(origin);
      }
    }
  }

  add(process.env.CORS_ORIGINS);
  add(process.env.APP_URL);
  add(process.env.WEB_ORIGIN);
  add(process.env.WEB_URL);
  add(process.env.PUBLIC_APP_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  add(process.env.VERCEL_BRANCH_URL);
  add(process.env.VERCEL_URL);

  if (process.env.NODE_ENV !== "production") {
    const webPort = process.env.WEB_PORT ?? "3000";
    add(`http://localhost:${webPort}`);
    add(`http://127.0.0.1:${webPort}`);
    add("http://localhost:5173");
    add("http://127.0.0.1:5173");
  }

  return origins;
}

const allowedCorsOrigins = collectCorsOrigins();

const app = express();

function isProductionLike(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function getErrorStatus(error: unknown): number {
  if (!error || typeof error !== "object") {
    return 500;
  }

  const status = "status" in error ? Number((error as { status?: unknown }).status) : NaN;
  const statusCode =
    "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : NaN;
  const candidate = Number.isInteger(status) ? status : statusCode;

  return Number.isInteger(candidate) && candidate >= 400 && candidate < 600
    ? candidate
    : 500;
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) {
      if (!origin || allowedCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api",
  createRateLimiter({
    name: "api-general",
    windowMs: 60_000,
    max: 900,
  }),
);
app.use(
  "/api/auth/register",
  createRateLimiter({
    name: "auth-register",
    windowMs: 60 * 60_000,
    max: 8,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByEmailAndIp,
  }),
);
app.use(
  "/api/auth/login-local",
  createRateLimiter({
    name: "auth-login",
    windowMs: 15 * 60_000,
    max: 12,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByEmailAndIp,
  }),
);
app.use(
  "/api/auth/forgot-password",
  createRateLimiter({
    name: "auth-forgot-password",
    windowMs: 15 * 60_000,
    max: 5,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByEmailAndIp,
  }),
);
app.use(
  "/api/auth/reset-password",
  createRateLimiter({
    name: "auth-reset-password",
    windowMs: 15 * 60_000,
    max: 8,
    methods: ["POST"],
  }),
);
app.use(authMiddleware);
app.use(
  "/api/ai/questions",
  createRateLimiter({
    name: "ai-questions",
    windowMs: 60_000,
    max: 12,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByUserOrIp,
  }),
);
app.use(
  "/api/commerce/orders",
  createRateLimiter({
    name: "commerce-orders",
    windowMs: 60_000,
    max: 10,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByUserOrIp,
  }),
);
app.use(
  "/api/commerce/payments/confirm",
  createRateLimiter({
    name: "commerce-payment-confirm",
    windowMs: 60_000,
    max: 20,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByUserOrIp,
  }),
);
app.use(
  /^\/api\/reports\/[^/]+\/regenerate$/,
  createRateLimiter({
    name: "report-regenerate",
    windowMs: 10 * 60_000,
    max: 5,
    methods: ["POST"],
    keyGenerator: rateLimitKeyByUserOrIp,
  }),
);
app.use(csrfProtection);

app.use("/api", router);

if (hasDatabaseConfig()) {
  void ensureDatabaseSchema().catch((error) => {
    console.error("[db:init]", error);
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "서버 오류가 발생했습니다.";

  const statusCode = getErrorStatus(error);

  console.error("[api]", error);

  if (message.includes("DATABASE_URL must be set")) {
    res.status(503).json({
      error: "서버 데이터베이스 설정이 누락되었습니다. Vercel 환경변수를 확인해주세요.",
    });
    return;
  }

  if (message.includes("Postgres connection string was not found")) {
    res.status(503).json({
      error: "서버 데이터베이스 설정이 누락되었습니다. DATABASE_URL 또는 POSTGRES_URL 환경변수를 확인해주세요.",
    });
    return;
  }

  if (isProductionLike()) {
    res.status(statusCode).json({
      error: statusCode >= 500 ? "Internal server error." : "Bad request.",
    });
    return;
  }

  res.status(statusCode).json({ error: message });
  return;

});

export default app;
