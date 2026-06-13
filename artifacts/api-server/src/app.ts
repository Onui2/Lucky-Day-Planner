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

const app = express();

function normalizeOrigin(rawOrigin: string | undefined | null): string | null {
  const value = rawOrigin?.trim();
  if (!value) return null;

  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

function getConfiguredCorsOrigins(): Set<string> {
  const values = [
    process.env.APP_URL,
    process.env.REPLIT_DEV_DOMAIN,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ...(process.env.CORS_ORIGINS ?? "").split(","),
  ];

  return new Set(
    values
      .map((value) => normalizeOrigin(value))
      .filter((value): value is string => Boolean(value)),
  );
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

const corsOrigins = getConfiguredCorsOrigins();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || corsOrigins.has(origin) || isLocalDevelopmentOrigin(origin)) {
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

  res.status(500).json({ error: message });
});

export default app;
