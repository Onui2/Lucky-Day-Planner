import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import express from "express";
import cookieParser from "cookie-parser";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function harness(run: (h: any) => Promise<void>) {
  const env: Record<string, string | undefined> = { NODE_ENV: "production", APP_URL: "https://shop.example", TOSS_PAY_REVIEW_ENABLED: "true", TOSS_PAY_REVIEW_API_KEY: "sk_test_synthetic", TOSS_PAY_REVIEW_COOKIE_SECRET: "a".repeat(64) };
  let now = Date.now();
  const calls: any[] = [];
  const limits: any[] = [];
  let approved = false;
  let providerOverride: Record<string, unknown> = {};
  const cache = new Map<string, any>();
  function load(file: string): any {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    runInNewContext(transformSync(readFileSync(file, "utf8"), { loader: "ts", format: "cjs" }).code, {
      module, exports: module.exports, Buffer, URL, AbortSignal,
      Date: class extends Date { static now() { return now; } }, process: { env },
      fetch: async (url: string, options: any) => {
        const body = JSON.parse(options.body);
        calls.push({ url, body });
        assert.match(body.apiKey, /^sk_test_/);
        if (url.endsWith("/payments")) return { ok: true, json: async () => ({ code: 0, payToken: "test-token", checkoutPage: "https://pay.toss.im/payfront?token=test-token", ...providerOverride }) };
        if (url.endsWith("/execute")) approved = true;
        const creation = calls.find(call => call.url.endsWith("/payments")).body;
        return { ok: true, json: async () => ({ code: 0, mode: "TEST", orderNo: creation.orderNo, payToken: "test-token", amount: creation.amount,
          payStatus: approved ? "PAY_COMPLETE" : "PAY_APPROVED", payMethod: "CARD", paidTs: "2026-10-19 12:00:00", transactions: [{ stepType: "PAY" }], ...providerOverride }) };
      },
      require(specifier: string) {
        if (specifier === "@workspace/db") throw new Error("Review flow must not import commerce persistence");
        if (specifier.endsWith("/rateLimit.js")) return { rateLimitKeyByIp: () => "ip", createRateLimiter: (options: any) => { limits.push(options); return (_req: any, _res: any, next: () => void) => next(); } };
        if (specifier.startsWith(".")) return load(path.resolve(path.dirname(file), specifier.replace(/\.js$/, ".ts")));
        return require(specifier);
      },
    });
    cache.set(file, module.exports);
    return module.exports;
  }
  const app = express();
  app.use(express.json(), cookieParser(), load(path.join(root, "routes/checkout-review.ts")).default);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (route: string, body: unknown, cookie = "", origin = "https://shop.example") => fetch(url + route, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: JSON.stringify(body),
  });
  try { await run({ env, url, calls, limits, post, advance: (ms: number) => { now += ms; }, override: (value: Record<string, unknown>) => { providerOverride = value; } }); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

for (const [productType, amount, title] of [
  ["saju_basic", 4900, "사주 기본 리포트"],
  ["saju_detail", 9900, "사주 상세 리포트"],
  ["saju_full", 19900, "사주 종합 리포트"],
] as const) test(`review opens ${productType} with server price, browser binding and no paid fulfillment`, () => harness(async ({ url, post, calls, limits }: any) => {
  const catalog: any = await (await fetch(url + "/commerce/review")).json();
  assert.equal(catalog.enabled, true);
  assert.equal(catalog.product.amount, 4900);
  assert.deepEqual(catalog.products.map((product: any) => [product.type, product.amount]), [["saju_basic", 4900], ["saju_detail", 9900], ["saju_full", 19900]]);
  const created = await post("/commerce/review/checkout", { productType, amount: 1, currency: "USD", title: "Tampered title" });
  assert.equal(created.status, 200);
  const cookie = created.headers.get("set-cookie").split(";")[0];
  assert.match(created.headers.get("set-cookie"), /HttpOnly/);
  assert.match(created.headers.get("set-cookie"), /Secure/);
  assert.match(created.headers.get("set-cookie"), /SameSite=Lax/);
  assert.doesNotMatch(cookie, /test-token|sk_test_/);
  assert.equal(calls[0].body.amount, amount);
  assert.equal(calls[0].body.autoExecute, false);
  assert.match(calls[0].body.productDesc, /테스트/);
  assert.ok(calls[0].body.productDesc.includes(title));
  assert.equal(new URL(calls[0].body.retUrl).pathname, "/reports");
  const orderId = calls[0].body.orderNo;
  assert.match(orderId, /^MHW_REVIEW_[a-f\d]{32}$/);
  const confirmation = await post("/commerce/review/confirm", { orderId, productType: "tampered", amount: 1 }, cookie);
  assert.equal(confirmation.status, 200);
  assert.deepEqual(await confirmation.json(), { status: "test_complete", productType, amount, title });
  assert.equal((await post("/commerce/review/confirm", { orderId }, cookie)).status, 200);
  assert.equal(calls.filter((call: any) => call.url.endsWith("/execute")).length, 1);
  assert.equal(limits.length, 2);
  assert.ok(limits.every((limit: any) => limit.failClosed));
}));

test("review fails closed for disabled, live-key, missing-secret and bad-origin settings", () => harness(async ({ env, post, calls }: any) => {
  for (const [key, value] of [["TOSS_PAY_REVIEW_ENABLED", "false"], ["TOSS_PAY_REVIEW_API_KEY", "sk_live_synthetic"], ["TOSS_PAY_REVIEW_COOKIE_SECRET", ""]]) {
    const previous = env[key]; env[key] = value;
    assert.equal((await post("/commerce/review/checkout", { productType: "saju_basic" })).status, 503);
    env[key] = previous;
  }
  assert.equal((await post("/commerce/review/checkout", { productType: "saju_basic" }, "", "https://evil.example")).status, 403);
  for (const productType of ["unknown", "saju", "new-year-2027", "__proto__", null, ["saju_basic"]]) {
    assert.equal((await post("/commerce/review/checkout", { productType })).status, 400);
  }
  assert.equal(calls.length, 0);
}));

test("review confirmation rejects missing, forged, cross-order and expired cookies before provider access", () => harness(async ({ post, calls, advance }: any) => {
  const created = await post("/commerce/review/checkout", { productType: "saju_basic" });
  const cookie = created.headers.get("set-cookie").split(";")[0];
  const orderId = calls[0].body.orderNo;
  assert.equal((await post("/commerce/review/confirm", { orderId })).status, 400);
  assert.equal((await post("/commerce/review/confirm", { orderId }, cookie.slice(0, -10) + "aaaaaaaaaa")).status, 400);
  assert.equal((await post("/commerce/review/confirm", { orderId: "different-order" }, cookie)).status, 400);
  advance(21 * 60_000);
  assert.equal((await post("/commerce/review/confirm", { orderId }, cookie)).status, 400);
  assert.equal(calls.length, 1);
}));

test("review does not approve provider mode or amount mismatches", () => harness(async ({ post, calls, override }: any) => {
  const created = await post("/commerce/review/checkout", { productType: "saju_basic" });
  const cookie = created.headers.get("set-cookie").split(";")[0];
  for (const value of [{ mode: "LIVE" }, { amount: 1 }, { payToken: "other-token" }, { orderNo: "other-order" }]) {
    override(value);
    assert.equal((await post("/commerce/review/confirm", { orderId: calls[0].body.orderNo }, cookie)).status, 409);
  }
  assert.equal(calls.filter((call: any) => call.url.endsWith("/execute")).length, 0);
}));
