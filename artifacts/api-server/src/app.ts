/// <reference path="./types/express.d.ts" />

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import router from "./routes/index.js";

const app = express();

app.set("trust proxy", 1);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

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
