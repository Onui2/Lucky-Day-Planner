import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";
import { hasDatabaseConfig } from "@workspace/db";

import { createRateLimiter } from "../middlewares/rateLimit.js";

// Whether DATABASE_URL is configured determines which store this test
// actually exercises (shared Postgres bucket vs. the per-process in-memory
// fallback) — both must enforce the same limit/header contract.
const usingDbStore = hasDatabaseConfig();

async function withTestServer(
  limiter: express.RequestHandler,
  run: (baseUrl: string) => Promise<void>,
) {
  const app = express();
  app.get("/probe", limiter, (_req, res) => res.status(200).json({ ok: true }));
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test(`rate limiter allows up to max requests then returns 429 (store: ${usingDbStore ? "postgres" : "in-memory"})`, async () => {
  const limiter = createRateLimiter({
    name: `test-basic-${Date.now()}-${Math.random()}`,
    windowMs: 60_000,
    max: 3,
  });

  await withTestServer(limiter, async (baseUrl) => {
    for (let i = 1; i <= 3; i++) {
      const res = await fetch(`${baseUrl}/probe`);
      assert.equal(res.status, 200, `request ${i} should be allowed`);
      assert.equal(res.headers.get("ratelimit-limit"), "3");
      assert.equal(res.headers.get("ratelimit-remaining"), String(3 - i));
    }

    const blocked = await fetch(`${baseUrl}/probe`);
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get("retry-after"));
    const body = await blocked.json();
    assert.match(body.error, /너무 많습니다/);
  });
});

test("rate limiter tracks distinct keys independently", async () => {
  const bucketName = `test-keyed-${Date.now()}-${Math.random()}`;
  const limiter = createRateLimiter({
    name: bucketName,
    windowMs: 60_000,
    max: 1,
    keyGenerator: (req) => `ip:${req.query.who ?? "unknown"}`,
  });

  await withTestServer(limiter, async (baseUrl) => {
    const alice1 = await fetch(`${baseUrl}/probe?who=alice`);
    assert.equal(alice1.status, 200);
    const bob1 = await fetch(`${baseUrl}/probe?who=bob`);
    assert.equal(bob1.status, 200, "a different key must not share alice's bucket");
    const alice2 = await fetch(`${baseUrl}/probe?who=alice`);
    assert.equal(alice2.status, 429, "alice's second request exceeds max=1");
  });
});
