import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { isDatabaseAvailable } from "../lib/database-guard.js";
import { isOidcEnabled } from "../lib/auth.js";
import { getCheckoutMode } from "../lib/commerce.js";

const router = Router();
const READINESS_QUERY = { text: "SELECT 1", query_timeout: 3_000 };

function isProductionLike(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

async function isDatabaseResponsive(): Promise<boolean> {
  if (!(await isDatabaseAvailable()) || !pool) {
    return false;
  }

  try {
    await pool.query(READINESS_QUERY);
    return true;
  } catch {
    return false;
  }
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/details", async (_req, res) => {
  const databaseConfigured = await isDatabaseResponsive();
  const status = databaseConfigured ? "ok" : "degraded";
  const statusCode = databaseConfigured ? 200 : 503;

  if (isProductionLike()) {
    res.status(statusCode).json({ status });
    return;
  }

  const paymentMode = getCheckoutMode();

  res.status(statusCode).json({
    status,
    databaseConfigured,
    localPasswordAuthEnabled: databaseConfigured,
    oidcEnabled: isOidcEnabled(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    paymentMode,
    tossClientKeyConfigured:
      paymentMode === "provider"
        ? Boolean(process.env.VITE_TOSS_CLIENT_KEY?.trim())
        : null,
  });
});

export default router;
