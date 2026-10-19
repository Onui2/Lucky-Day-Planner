import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import sajuRouter from "../routes/saju.js";
import { buildSajuResult } from "./saju-result.js";
import { buildSajuPreview } from "./saju-preview.js";

const input = { birthYear: 1990, birthMonth: 1, birthDay: 1, birthHour: 12, birthMinute: 0, gender: "male" as const, calendarType: "solar" as const };

test("free preview allowlist excludes complete and nested paid interpretations", () => {
  const full = buildSajuResult(input);
  const preview = buildSajuPreview({ ...full, privateFutureField: "PRIVATE",
    personality: "무료 한 문장입니다. PRIVATE 나머지 해석",
    birthInfo: { ...full.birthInfo, privateFutureField: "PRIVATE" },
    yearPillar: { ...full.yearPillar, privateFutureField: "PRIVATE" },
    elementBalance: { ...full.elementBalance, privateFutureField: "PRIVATE" },
  });
  assert.equal(preview.accessLevel, "preview");
  assert.equal(preview.previewSummary, "무료 한 문장입니다.");
  assert.equal(preview.dayPillar.heavenlyStem, full.dayPillar.heavenlyStem);
  assert.deepEqual(preview.elementBalance, full.elementBalance);
  assert.ok(!JSON.stringify(preview).includes("PRIVATE"));
  for (const key of ["personality", "fortune", "career", "love", "health", "shadowReading", "luckFlowAnalysis", "daeun", "yongsin", "calculationBasis"]) {
    assert.ok(!(key in preview), `${key} must not be returned for free`);
  }
  assert.ok(buildSajuPreview({ ...full, personality: "가".repeat(500) }).previewSummary.length <= 140);
});

test("anonymous and member calculations receive preview; only authenticated admins receive full data", async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = String(req.headers["x-test-role"] ?? "anonymous");
    req.user = { id: "synthetic", role } as Express.User;
    req.isAuthenticated = (() => role !== "anonymous" && req.headers["x-test-anonymous"] !== "1") as typeof req.isAuthenticated;
    next();
  });
  app.use(sajuRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const role of ["anonymous", "user", "admin", "superadmin"]) {
      const response = await fetch(`${base}/saju/calculate?accessLevel=admin`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-test-role": role },
        body: JSON.stringify({ ...input, role: "admin", accessLevel: "admin", productType: "saju_full" }),
      });
      assert.equal(response.status, 200);
      const result = await response.json() as Record<string, unknown>;
      const admin = role === "admin" || role === "superadmin";
      assert.equal(result.accessLevel, admin ? "admin" : "preview");
      assert.equal(typeof result.career, admin ? "string" : "undefined");
      assert.equal("luckFlowAnalysis" in result, admin);
    }
    const staleAdmin = await fetch(`${base}/saju/calculate`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-role": "admin", "x-test-anonymous": "1" }, body: JSON.stringify(input),
    });
    assert.equal((await staleAdmin.json() as any).accessLevel, "preview");
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
