/// <reference path="./types/express.d.ts" />

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ensureDatabaseSchema, hasDatabaseConfig } from "@workspace/db";
import { authMiddleware } from "./middlewares/authMiddleware.js";
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
app.use(authMiddleware);

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
