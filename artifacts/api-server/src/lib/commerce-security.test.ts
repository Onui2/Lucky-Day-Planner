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

// Load the real route/helper source with isolated DB/provider boundaries. No
// database package, environment file, payment service, or PDF renderer is loaded.
const require = createRequire(import.meta.url);
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
type Row = Record<string, any>;
type Context = Record<string, Row>;
type Predicate = (context: Context) => boolean;
type Column = { table: string; column: string };
type Table = Record<string, any> & { tableName: string };

function table(tableName: string): Table {
  return new Proxy({ tableName }, {
    get(target, key: string) {
      return key === "tableName" ? target.tableName : { table: tableName, column: key };
    },
  });
}

function value(input: any, context: Context): any {
  return input && typeof input === "object" && "column" in input
    ? context[(input as Column).table]?.[(input as Column).column]
    : input;
}

function createHarness(env: Record<string, string | undefined> = { TOSS_SECRET_KEY: "synthetic-test-secret" }) {
  const tables: Record<string, Table> = {};
  const records: Record<string, Row[]> = {};
  for (const name of ["orders", "payments", "pdfReports", "analysisSnapshots", "purchaseEntitlements"]) {
    tables[`${name}Table`] = table(name);
    records[name] = [];
  }
  const state = {
    records,
    queries: 0,
    writes: 0,
    generated: 0,
    providerCalls: [] as Row[],
    providerReply: {} as Row,
    providerOk: true,
    beforeProviderReply: null as (() => void) | null,
    nextId: 100,
  };
  const conditions = {
    eq: (left: any, right: any): Predicate => (context) => value(left, context) === value(right, context),
    gt: (left: any, right: any): Predicate => (context) => value(left, context) > value(right, context),
    isNull: (input: any): Predicate => (context) => value(input, context) == null,
    and: (...items: Predicate[]): Predicate => (context) => items.every((item) => item(context)),
    or: (...items: Predicate[]): Predicate => (context) => items.some((item) => item(context)),
    desc: (input: any) => input,
  };
  function project(selection: Row | undefined, context: Context, base: string): Row {
    if (!selection) return context[base];
    return Object.fromEntries(Object.entries(selection).map(([key, input]) => [
      key,
      input.tableName ? context[input.tableName] : value(input, context),
    ]));
  }
  const db = {
    select(selection?: Row) {
      let base = "";
      let contexts: Context[] = [];
      const query = {
        from(input: Table) {
          state.queries++;
          base = input.tableName;
          contexts = records[base].map((row) => ({ [base]: row }));
          return query;
        },
        innerJoin(input: Table, predicate: Predicate) {
          contexts = contexts.flatMap((context) => records[input.tableName]
            .map((row) => ({ ...context, [input.tableName]: row }))
            .filter(predicate));
          return query;
        },
        where(predicate: Predicate) { contexts = contexts.filter(predicate); return query; },
        orderBy() { return query; },
        limit(limit: number) { contexts = contexts.slice(0, limit); return query; },
        then(resolve: (rows: Row[]) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(contexts.map((context) => project(selection, context, base))).then(resolve, reject);
        },
      };
      return query;
    },
    insert(input: Table) {
      return { values(values: Row) {
        state.writes++;
        const row = {
          id: state.nextId++, createdAt: new Date(), expiresAt: null,
          mimeType: "application/pdf", ...values,
        };
        records[input.tableName].push(row);
        const result = {
          returning: async () => [row],
          onConflictDoNothing: async () => undefined,
          onConflictDoUpdate: async () => undefined,
          then: (resolve: (rows: Row[]) => unknown) => Promise.resolve([row]).then(resolve),
        };
        return result;
      } };
    },
    update(input: Table) {
      return { set(values: Row) { return { where(predicate: Predicate) {
        const rows = records[input.tableName].filter((row) => predicate({ [input.tableName]: row }));
        for (const row of rows) { Object.assign(row, values); state.writes++; }
        return { returning: async () => rows };
      } }; } };
    },
    async transaction(run: (transaction: any) => Promise<unknown>) { return run(db); },
  };
  const cache = new Map<string, any>();
  function load(filename: string): any {
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} as any };
    cache.set(filename, module.exports);
    const code = transformSync(readFileSync(filename, "utf8"), {
      loader: "ts", format: "cjs", target: "es2016", sourcefile: filename,
    }).code;
    runInNewContext(code, {
      module, exports: module.exports, Buffer, Date, Promise,
      process: { env },
      console: { error() {} },
      fetch: async (url: string, options: { body: string }) => {
        assert.equal(url, "https://api.tosspayments.com/v1/payments/confirm");
        const request = JSON.parse(options.body);
        state.providerCalls.push(request);
        state.beforeProviderReply?.();
        return {
          ok: state.providerOk,
          json: async () => ({
            ...request, totalAmount: request.amount, currency: "KRW", status: "DONE",
            method: "카드", approvedAt: "2026-09-22T03:00:00Z", ...state.providerReply,
          }),
        };
      },
      require(specifier: string) {
        if (specifier === "@workspace/db") return { db, ...tables };
        if (specifier === "drizzle-orm") return conditions;
        if (specifier.endsWith("/database-guard.js")) return { requireDatabase: async () => true };
        if (specifier.endsWith("/report-generator.js")) return {
          generateSajuReportPdf: async () => {
            state.generated++;
            return { fileName: "report.pdf", fileDataBase64: Buffer.from("test PDF").toString("base64"), previewText: "preview", htmlContent: "<p>report</p>" };
          },
        };
        if (specifier.endsWith("/saju-result.js")) return { buildSajuResult: () => ({}) };
        if (specifier.startsWith(".")) return load(path.resolve(path.dirname(filename), specifier.replace(/\.js$/, ".ts")));
        return require(specifier);
      },
    }, { filename });
    cache.set(filename, module.exports);
    return module.exports;
  }
  const commerce = load(path.join(sourceDir, "lib/commerce.ts"));
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = String(req.headers["x-test-user"] ?? "owner");
    if (userId !== "anonymous") req.user = { id: userId, role: String(req.headers["x-test-role"] ?? "user") } as Express.User;
    req.isAuthenticated = (() => Boolean(req.user)) as typeof req.isAuthenticated;
    next();
  });
  app.use(load(path.join(sourceDir, "routes/commerce.ts")).default);
  app.use(load(path.join(sourceDir, "routes/reports.ts")).default);
  function seed(paid = false) {
    const order = { id: 11, orderId: "synthetic-order", userId: "owner", productType: "gungap_premium", status: paid ? "paid" : "pending", amount: 9900, currency: "KRW", snapshotId: 7 };
    const report = { id: 21, userId: "owner", orderId: 11, snapshotId: 7, productType: order.productType, status: "pending", title: "Report", fileDataBase64: null, mimeType: "application/pdf" };
    const entitlement: Row = { id: 31, userId: "owner", orderId: 11, productType: order.productType, resourceType: "pdf_report", resourceId: 21, status: "active", expiresAt: null };
    records.orders.push(order);
    records.pdfReports.push(report);
    records.analysisSnapshots.push({ id: 7, userId: "owner", sajuResult: {} });
    if (paid) records.purchaseEntitlements.push(entitlement);
    return { order, report, entitlement };
  }
  return { app, state, seed, commerce };
}

type Harness = ReturnType<typeof createHarness>;
async function withServer(harness: Harness, run: (baseUrl: string) => Promise<void>) {
  const server = harness.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}
function post(url: string, body: Row = {}, headers: Record<string, string> = {}) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
const orderBody = { productType: "gungap_premium", birthInfo: { year: 1990, month: 1, day: 1, hour: 12, gender: "male", calendarType: "solar" } };
const confirmationBody = { orderId: "synthetic-order", paymentKey: "synthetic-payment-key" };

test("an order cancelled during provider confirmation cannot be paid or fulfilled", async () => {
  const h = createHarness();
  const { order } = h.seed();
  h.state.beforeProviderReply = () => { order.status = "cancelled"; };
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(response.status, 400);
    assert.equal((await response.json() as Row).report, undefined);
  });
  assert.equal(order.status, "cancelled");
  assert.equal(h.state.records.payments.length, 0);
  assert.equal(h.state.records.purchaseEntitlements.length, 0);
});

test("an unpaid order cannot generate or download a report, including legacy ready reports", async () => {
  const h = createHarness();
  const { report } = h.seed();
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/reports/21/regenerate`)).status, 403);
    Object.assign(report, { status: "ready", fileDataBase64: Buffer.from("legacy unpaid PDF").toString("base64") });
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 403);
  });
  assert.equal(h.state.generated, 0);
  assert.equal(h.state.writes, 0);
});

test("paid report without an entitlement stays inaccessible", async () => {
  const h = createHarness();
  h.seed(true);
  h.state.records.purchaseEntitlements.length = 0;
  await withServer(h, async (url) => assert.equal((await post(`${url}/reports/21/regenerate`)).status, 403));
  assert.equal(h.state.generated, 0);
});

for (const [name, override] of [
  ["revoked", { status: "revoked" }],
  ["expired", { expiresAt: new Date("2000-01-01T00:00:00Z") }],
  ["another user's", { userId: "someone-else" }],
  ["another report's", { resourceId: 22 }],
  ["another product's", { productType: "year_fortune_report" }],
  ["another resource type's", { resourceType: "other" }],
] as const) {
  test(`${name} entitlement cannot regenerate, download, or retrieve a paid report through confirmation`, async () => {
    const h = createHarness();
    const { report, entitlement } = h.seed(true);
    Object.assign(report, { status: "ready", fileDataBase64: Buffer.from("private PDF").toString("base64") });
    Object.assign(entitlement, override);
    await withServer(h, async (url) => {
      assert.equal((await post(`${url}/reports/21/regenerate`)).status, 403);
      assert.equal((await fetch(`${url}/reports/21/download`)).status, 403);
      const confirmation = await post(`${url}/commerce/payments/confirm`, confirmationBody);
      assert.equal(confirmation.status, 403);
      assert.equal((await confirmation.json() as Row).report, undefined);
    });
    assert.equal(h.state.generated, 0);
    assert.equal(h.state.providerCalls.length, 0);
    assert.equal(h.state.writes, 0);
  });
}

test("report/order ownership is enforced for regeneration, download and confirmation", async () => {
  const h = createHarness();
  h.seed(true);
  const headers = { "x-test-user": "intruder" };
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/reports/21/regenerate`, {}, headers)).status, 404);
    assert.equal((await fetch(`${url}/reports/21/download`, { headers })).status, 404);
    assert.equal((await post(`${url}/commerce/payments/confirm`, confirmationBody, headers)).status, 404);
  });
  assert.equal(h.state.generated, 0);
  assert.equal(h.state.providerCalls.length, 0);
});

test("owned report cannot reuse an order belonging to another user", async () => {
  const h = createHarness();
  const { order } = h.seed(true);
  order.userId = "someone-else";
  await withServer(h, async (url) => assert.equal((await post(`${url}/reports/21/regenerate`)).status, 403));
  assert.equal(h.state.generated, 0);
});

test("paid report with an active entitlement can be regenerated and downloaded", async () => {
  const h = createHarness();
  h.seed(true);
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/reports/21/regenerate`)).status, 200);
    const download = await fetch(`${url}/reports/21/download`);
    assert.equal(download.status, 200);
    assert.equal(await download.text(), "test PDF");
  });
  assert.equal(h.state.generated, 1);
});

test("free saju_pdf grant remains usable in production without payment configuration", async () => {
  const h = createHarness({ NODE_ENV: "production" });
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_pdf" });
    assert.equal(response.status, 200);
    const created = await response.json() as Row;
    assert.equal(created.order.status, "paid");
    assert.equal(created.order.amount, 0);
    assert.equal(h.state.records.purchaseEntitlements[0].status, "active");
    assert.equal((await post(`${url}/reports/${created.report.id}/regenerate`)).status, 200);
    assert.equal((await fetch(`${url}/reports/${created.report.id}/download`)).status, 200);
  });
  assert.equal(h.state.providerCalls.length, 0);
});

for (const env of [
  { NODE_ENV: "production", PAYMENT_SIMULATION_ENABLED: "true" },
  { NODE_ENV: "development", VERCEL_ENV: "production", PAYMENT_SIMULATION_ENABLED: "true" },
  { NODE_ENV: "production", TOSS_SECRET_KEY: "   " },
  { NODE_ENV: "development" },
]) {
  test(`missing payment key fails closed: ${JSON.stringify(env)}`, async () => {
    const h = createHarness(env);
    const { order } = h.seed();
    assert.equal(h.commerce.getCheckoutMode(), "disabled");
    await assert.rejects(h.commerce.confirmPaymentWithProvider(order), /결제 설정/);
    await withServer(h, async (url) => {
      assert.equal((await post(`${url}/commerce/orders`, orderBody)).status, 503);
      assert.equal((await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId })).status, 503);
    });
    assert.equal(h.state.providerCalls.length, 0);
    assert.equal(h.state.generated, 0);
    assert.equal(h.state.writes, 0);
  });
}

test("explicit nonproduction simulation grants a paid report without calling Toss", async () => {
  const h = createHarness({ NODE_ENV: "test", PAYMENT_SIMULATION_ENABLED: "true" });
  h.seed();
  assert.equal(h.commerce.getCheckoutMode(), "dev");
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order" });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as Row).payment.provider, "dev");
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 200);
  });
  assert.equal(h.state.providerCalls.length, 0);
});

for (const [name, reply] of [
  ["waiting for deposit", { status: "WAITING_FOR_DEPOSIT" }],
  ["cancelled", { status: "CANCELED" }],
  ["wrong order", { orderId: "different-order" }],
  ["wrong payment key", { paymentKey: "different-key" }],
  ["wrong amount", { totalAmount: 1 }],
  ["string amount", { totalAmount: "9900" }],
  ["wrong currency", { currency: "USD" }],
  ["missing approval date", { approvedAt: null }],
] as const) {
  test(`provider HTTP 200 ${name} cannot fulfill an order`, async () => {
    const h = createHarness();
    const { order } = h.seed();
    h.state.providerReply = reply;
    await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/payments/confirm`, confirmationBody)).status, 400));
    assert.equal(order.status, "pending");
    assert.equal(h.state.generated, 0);
    assert.equal(h.state.writes, 0);
    assert.equal(h.state.records.purchaseEntitlements.length, 0);
  });
}

test("matching DONE card approval fulfills once and supports authorized idempotent confirmation", async () => {
  const h = createHarness({ TOSS_SECRET_KEY: "synthetic-test-secret", PAYMENT_SIMULATION_ENABLED: "true" });
  h.seed();
  assert.equal(h.commerce.getCheckoutMode(), "provider");
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(response.status, 200);
    assert.equal((await response.json() as Row).order.status, "paid");
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 200);
    const repeated = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json() as Row).alreadyPaid, true);
  });
  assert.equal(h.state.generated, 1);
  assert.equal(h.state.providerCalls.length, 1);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("cancelled orders cannot be reactivated by confirmation", async () => {
  const h = createHarness();
  const { order } = h.seed();
  order.status = "cancelled";
  await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/payments/confirm`, confirmationBody)).status, 409));
  assert.equal(h.state.providerCalls.length, 0);
  assert.equal(h.state.writes, 0);
});
