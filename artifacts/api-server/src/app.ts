/// <reference path="./types/express.d.ts" />

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ensureDatabaseSchema } from "@workspace/db";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import router from "./routes/index.js";

const app = express();

app.set("trust proxy", 1);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(async (_req, _res, next) => {
  try {
    await ensureDatabaseSchema();
    next();
  } catch (error) {
    next(error);
  }
});
app.use(authMiddleware);

app.use("/api", router);

export default app;
