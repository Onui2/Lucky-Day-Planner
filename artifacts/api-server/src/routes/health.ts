import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isDatabaseAvailable } from "../lib/database-guard.js";
import { isOidcEnabled } from "../lib/auth.js";
import { getCheckoutMode } from "../lib/commerce.js";

const router = Router();

function isProductionLike(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/details", async (_req, res) => {
  const databaseConfigured = await isDatabaseAvailable();

  if (isProductionLike()) {
    res.json({
      status: "ok",
    });
    return;
  }

  const paymentMode = getCheckoutMode();

  res.json({
    status: "ok",
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
