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

function createHarness(overrides: Record<string, string | undefined> = { TOSS_SECRET_KEY: "synthetic-test-secret" }) {
  const env: Record<string, string | undefined> = { REPORT_SALES_ENABLED: "true", ...overrides };
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
    orderStatusesAtGeneration: [] as string[],
    generationFails: false,
    failNextTransaction: false,
    providerCalls: [] as Row[],
    providerIdempotencyKeys: [] as string[],
    providerLookups: [] as string[],
    approvedPayment: null as Row | null,
    providerLookupReply: null as Row | null,
    providerReply: {} as Row,
    providerOk: true,
    beforeProviderReply: null as (() => void) | null,
    tossCalls: [] as { endpoint: string; body: Row }[],
    tossStatus: "PAY_APPROVED",
    tossReply: {} as Row,
    tossExecuteTimeout: false,
    locks: 0,
    advisoryLocks: 0,
    historyInputs: [] as Row[],
    generatedTiers: [] as unknown[],
    beforeGeneration: null as (() => Promise<void>) | null,
    nextId: 100,
  };
  const conditions = {
    eq: (left: any, right: any): Predicate => (context) => value(left, context) === value(right, context),
    gt: (left: any, right: any): Predicate => (context) => value(left, context) > value(right, context),
    isNull: (input: any): Predicate => (context) => value(input, context) == null,
    and: (...items: Predicate[]): Predicate => (context) => items.every((item) => item(context)),
    or: (...items: Predicate[]): Predicate => (context) => items.some((item) => item(context)),
    desc: (input: any) => input,
    sql: (strings: TemplateStringsArray, ...args: any[]) => {
      const text = strings.join("?");
      if (/->>\s*'freeTrial'/.test(text)) {
        return (context: Context) => String(value(args[0], context)?.freeTrial) === "true";
      }
      assert.match(text, /pg_advisory_xact_lock/, "Unexpected SQL in isolated commerce harness");
      return { text, args };
    },
  };
  function project(selection: Row | undefined, context: Context, base: string): Row {
    if (!selection) return context[base];
    return Object.fromEntries(Object.entries(selection).map(([key, input]) => [
      key,
      input.tableName ? context[input.tableName] : value(input, context),
    ]));
  }
  let transactionTail: Promise<void> = Promise.resolve();
  const db = {
    async execute(statement: { text: string }) {
      assert.match(statement.text, /pg_advisory_xact_lock/);
      state.advisoryLocks++;
    },
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
        leftJoin(input: Table, predicate: Predicate) {
          contexts = contexts.flatMap((context) => {
            const matches = records[input.tableName].map((row) => ({ ...context, [input.tableName]: row })).filter(predicate);
            return matches.length ? matches : [{ ...context, [input.tableName]: {} }];
          });
          return query;
        },
        for(mode: string) { assert.equal(mode, "update"); state.locks++; return query; },
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
    async transaction(run: (transaction: any) => Promise<unknown>) {
      // Emulate serialized transactions for concurrent same-account trial claims.
      // Tests also assert that the route actually requests its advisory lock.
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        if (state.failNextTransaction) {
          state.failNextTransaction = false;
          throw new Error("synthetic database outage");
        }
        return await run(db);
      } finally {
        release();
      }
    },
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
      module, exports: module.exports, Buffer, Date, Promise, URL, AbortSignal,
      process: { env },
      console: { error() {} },
      fetch: async (url: string, options: { body?: string; headers: Row }) => {
        if (url.startsWith("https://pay.toss.im/api/v2/")) {
          const endpoint = url.split("/").at(-1)!;
          const body = JSON.parse(options.body!);
          state.tossCalls.push({ endpoint, body });
          assert.equal(body.apiKey, env.TOSS_PAY_API_KEY);
          if (endpoint === "payments") return { ok: true, json: async () => ({ code: 0, payToken: "synthetic-toss-token", checkoutPage: "https://pay.toss.im/checkout/synthetic" }) };
          const order = records.orders.find((item) => item.orderId === body.orderNo)!;
          assert.ok(order, "Provider request must reference a stored order");
          if (endpoint === "execute") {
            state.tossStatus = "PAY_COMPLETE";
            if (state.tossExecuteTimeout) throw new Error("synthetic timeout after capture");
          } else assert.equal(endpoint, "status");
          return { ok: true, json: async () => ({ code: 0, mode: "TEST", payToken: "synthetic-toss-token", orderNo: order.orderId, amount: order.amount, payStatus: state.tossStatus, payMethod: "CARD", paidTs: "2026-10-16 12:00:00", transactions: [{ stepType: "PAY", transactionAmount: order.amount }], ...state.tossReply }) };
        }
        if (url.startsWith("https://api.tosspayments.com/v1/payments/") &&
            url !== "https://api.tosspayments.com/v1/payments/confirm") {
          state.providerLookups.push(url);
          const reply = state.providerLookupReply ?? state.approvedPayment;
          return { ok: Boolean(reply), json: async () => reply };
        }
        assert.equal(url, "https://api.tosspayments.com/v1/payments/confirm");
        assert.ok(options.headers["Idempotency-Key"]);
        state.providerIdempotencyKeys.push(options.headers["Idempotency-Key"]);
        const request = JSON.parse(options.body!);
        state.providerCalls.push(request);
        state.beforeProviderReply?.();
        const reply = {
          ...request, totalAmount: request.amount, currency: "KRW", status: "DONE",
          method: "카드", approvedAt: "2026-09-22T03:00:00Z", ...state.providerReply,
        };
        if (state.providerOk && reply.status === "DONE") state.approvedPayment = reply;
        return {
          ok: state.providerOk,
          json: async () => reply,
        };
      },
      require(specifier: string) {
        if (specifier === "@workspace/db") return { db, ...tables };
        if (specifier === "drizzle-orm") return conditions;
        if (specifier.endsWith("/database-guard.js")) return { requireDatabase: async () => true };
        if (specifier.endsWith("/report-generator.js")) return {
          generateSajuReportPdf: async (_title: string, _result: Row, tier: unknown) => {
            state.generated++;
            state.generatedTiers.push(tier);
            state.orderStatusesAtGeneration.push(records.orders[0]?.status);
            await state.beforeGeneration?.();
            if (state.generationFails) throw new Error("synthetic renderer failure");
            return { fileName: "report.pdf", fileDataBase64: Buffer.from("test PDF").toString("base64"), previewText: "preview", htmlContent: "<p>report</p>" };
          },
        };
        if (specifier.endsWith("/saju-result.js")) return { buildSajuResult: () => ({}) };
        if (specifier.endsWith("/saju-history.js")) return { buildSajuHistory: (input: Row) => { state.historyInputs.push(input); return { annual: [{ year: input.birthYear }] }; } };
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
    const order: Row = { id: 11, orderId: "synthetic-order", userId: "owner", productType: "gungap_premium", status: paid ? "paid" : "pending", amount: 9900, currency: "KRW", snapshotId: 7 };
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
  // Port 0 can choose a port forbidden by Fetch. Retry only that allocation.
  for (let attempt = 0; attempt < 10; attempt++) {
    const server = harness.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const close = () => new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()));
    try {
      await fetch(`${baseUrl}/__port_probe`, { method: "HEAD" });
    } catch (error) {
      await close();
      if (error instanceof TypeError && (error.cause as Error | undefined)?.message === "bad port") {
        continue;
      }
      throw error;
    }
    try { await run(baseUrl); }
    finally { await close(); }
    return;
  }
  throw new Error("Could not allocate a Fetch-compatible test port");
}
function post(url: string, body: Row = {}, headers: Record<string, string> = {}) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
const orderBody = { productType: "saju_detail", birthInfo: { year: 1990, month: 1, day: 1, hour: 12, gender: "male", calendarType: "solar" } };
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

for (const [productType, tier] of [["saju_basic", "basic"], ["saju_detail", "detail"], ["saju_full", "full"]]) {
test(`admin ${productType} grant remains usable in production without payment configuration`, async () => {
  const h = createHarness({ NODE_ENV: "production", REPORT_SALES_ENABLED: undefined });
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/orders`, { ...orderBody, productType }, { "x-test-role": "admin" });
    assert.equal(response.status, 200);
    const created = await response.json() as Row;
    assert.equal(created.order.status, "paid");
    assert.equal(created.order.amount, 0);
    assert.equal(h.state.records.purchaseEntitlements[0].status, "active");
    assert.equal((await post(`${url}/reports/${created.report.id}/regenerate`)).status, 200);
    assert.equal((await fetch(`${url}/reports/${created.report.id}/download`)).status, 200);
  });
  assert.equal(h.state.providerCalls.length, 0);
  assert.deepEqual(h.state.generatedTiers, [tier, tier]);
});
}

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
  h.seed().order.metadata = { checkoutProvider: "dev" };
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
  assert.deepEqual(h.state.orderStatusesAtGeneration, ["paid"]);
});

test("duplicate provider approval recovers a payment captured before a failed DB commit", async () => {
  const h = createHarness();
  const { order } = h.seed();
  h.state.failNextTransaction = true;
  await withServer(h, async (url) => {
    const first = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(first.status, 400);
    assert.equal(order.status, "pending");
    assert.equal(h.state.records.payments.length, 0);
    assert.equal(h.state.records.purchaseEntitlements.length, 0);

    h.state.providerOk = false;
    h.state.providerReply = { code: "ALREADY_PROCESSED_PAYMENT", message: "이미 처리된 결제입니다." };
    const retry = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json() as Row).order.status, "paid");
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 200);
  });
  assert.equal(h.state.providerCalls.length, 2);
  assert.equal(h.state.providerIdempotencyKeys[0], h.state.providerIdempotencyKeys[1]);
  assert.equal(h.state.providerLookups.length, 1);
  assert.equal(h.state.records.payments.length, 1);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("owner recovers a completed payment by order ID without the success URL", async () => {
  const h = createHarness();
  const { order } = h.seed();
  h.state.providerLookupReply = {
    orderId: order.orderId,
    paymentKey: "provider-returned-key",
    totalAmount: order.amount,
    currency: order.currency,
    status: "DONE",
    approvedAt: "2026-09-22T03:00:00Z",
    method: "카드",
  };
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as Row).order.status, "paid");
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 200);
  });
  assert.equal(h.state.providerCalls.length, 0);
  assert.deepEqual(h.state.providerLookups, [
    "https://api.tosspayments.com/v1/payments/orders/synthetic-order",
  ]);
  assert.equal(h.state.records.payments[0].paymentKey, "provider-returned-key");
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("missing provider order stays pending without creating payment or entitlement", async () => {
  const h = createHarness();
  const { order } = h.seed();
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId });
    assert.equal(response.status, 400);
  });
  assert.equal(order.status, "pending");
  assert.equal(h.state.providerCalls.length, 0);
  assert.equal(h.state.providerLookups.length, 1);
  assert.equal(h.state.writes, 0);
});

test("oversized payment key is rejected before contacting Toss", async () => {
  const h = createHarness();
  const { order } = h.seed();
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, {
      orderId: order.orderId,
      paymentKey: "x".repeat(201),
    });
    assert.equal(response.status, 400);
  });
  assert.equal(order.status, "pending");
  assert.equal(h.state.providerCalls.length, 0);
  assert.equal(h.state.providerLookups.length, 0);
});

for (const [name, override] of [
  ["unpaid", { status: "WAITING_FOR_DEPOSIT" }],
  ["cancelled", { status: "CANCELED" }],
  ["another order", { orderId: "different-order" }],
  ["missing payment key", { paymentKey: null }],
  ["wrong amount", { totalAmount: 1 }],
  ["string amount", { totalAmount: "9900" }],
  ["wrong currency", { currency: "USD" }],
  ["missing approval date", { approvedAt: null }],
] as const) {
  test(`order ID recovery rejects ${name} provider records`, async () => {
    const h = createHarness();
    const { order } = h.seed();
    h.state.providerLookupReply = Object.assign({
      orderId: order.orderId,
      paymentKey: "provider-returned-key",
      totalAmount: order.amount,
      currency: order.currency,
      status: "DONE",
      approvedAt: "2026-09-22T03:00:00Z",
    }, override);
    await withServer(h, async (url) => {
      const response = await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId });
      assert.equal(response.status, 400);
    });
    assert.equal(order.status, "pending");
    assert.equal(h.state.generated, 0);
    assert.equal(h.state.writes, 0);
    assert.equal(h.state.records.purchaseEntitlements.length, 0);
  });
}

test("order ID recovery checks authentication and ownership before provider access", async () => {
  const h = createHarness();
  h.seed();
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order" }, { "x-test-user": "anonymous" })).status, 401);
    assert.equal((await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order" }, { "x-test-user": "intruder" })).status, 404);
  });
  assert.equal(h.state.providerLookups.length, 0);
  assert.equal(h.state.providerCalls.length, 0);
  assert.equal(h.state.writes, 0);
});

test("a new payment attempt gets a different provider idempotency key", async () => {
  const h = createHarness();
  const { order } = h.seed();
  await h.commerce.confirmPaymentWithProvider(order, "first-payment-key");
  await h.commerce.confirmPaymentWithProvider(order, "second-payment-key");
  assert.notEqual(h.state.providerIdempotencyKeys[0], h.state.providerIdempotencyKeys[1]);
});

test("virtual-account deposit is recognized after a cached waiting response", async () => {
  const h = createHarness();
  const { order } = h.seed();
  h.state.providerReply = { status: "WAITING_FOR_DEPOSIT" };
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/commerce/payments/confirm`, confirmationBody)).status, 400);
    assert.equal(order.status, "pending");
    h.state.providerLookupReply = {
      orderId: order.orderId,
      paymentKey: confirmationBody.paymentKey,
      totalAmount: order.amount,
      currency: order.currency,
      status: "DONE",
      approvedAt: "2026-09-22T03:00:00Z",
      method: "가상계좌",
    };
    const deposited = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(deposited.status, 200);
    assert.equal((await deposited.json() as Row).order.status, "paid");
  });
  assert.equal(h.state.providerLookups.length, 2);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("recovery lookup cannot fulfill a different or incomplete payment", async () => {
  const h = createHarness();
  const { order } = h.seed();
  h.state.providerOk = false;
  h.state.providerReply = { code: "ALREADY_PROCESSED_PAYMENT", message: "이미 처리된 결제입니다." };
  h.state.providerLookupReply = {
    orderId: order.orderId,
    paymentKey: confirmationBody.paymentKey,
    totalAmount: order.amount,
    currency: order.currency,
    status: "WAITING_FOR_DEPOSIT",
    approvedAt: "2026-09-22T03:00:00Z",
  };
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/commerce/payments/confirm`, confirmationBody)).status, 400);
  });
  assert.equal(order.status, "pending");
  assert.equal(h.state.generated, 0);
  assert.equal(h.state.records.purchaseEntitlements.length, 0);
});

test("PDF failure leaves paid order and entitlement durable for regeneration", async () => {
  const h = createHarness();
  const { order, report } = h.seed();
  h.state.generationFails = true;
  await withServer(h, async (url) => {
    const confirmed = await post(`${url}/commerce/payments/confirm`, confirmationBody);
    assert.equal(confirmed.status, 200);
    assert.equal((await confirmed.json() as Row).report.status, "failed");
    assert.equal(order.status, "paid");
    assert.equal(report.status, "failed");
    assert.equal(h.state.records.purchaseEntitlements.length, 1);
    h.state.generationFails = false;
    assert.equal((await post(`${url}/reports/21/regenerate`)).status, 200);
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 200);
  });
  assert.equal(h.state.providerCalls.length, 1);
  assert.deepEqual(h.state.orderStatusesAtGeneration, ["paid", "paid"]);
});

test("cancelled orders cannot be reactivated by confirmation", async () => {
  const h = createHarness();
  const { order } = h.seed();
  order.status = "cancelled";
  await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/payments/confirm`, confirmationBody)).status, 409));
  assert.equal(h.state.providerCalls.length, 0);
  assert.equal(h.state.writes, 0);
});

test("paid sales stay closed by default even when a real payment provider is configured", async () => {
  const h = createHarness({ TOSS_SECRET_KEY: "synthetic-test-secret", REPORT_SALES_ENABLED: undefined });
  h.state.records.orders.push({ id: 1, userId: "owner", metadata: { freeTrial: true } });
  await withServer(h, async (url) => {
    const catalog = await (await fetch(`${url}/commerce/products`)).json() as Row;
    assert.equal(catalog.salesEnabled, false);
    for (const productType of ["saju_basic", "saju_detail", "saju_full"]) {
      assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType })).status, 503);
    }
  });
  assert.equal(h.state.writes, 0);
  assert.equal(h.state.generated, 0);
});

for (const productType of ["saju_pdf", "gungap_premium", "year_fortune_report", "unknown"]) {
  test(`legacy or unknown product ${productType} cannot create a new order`, async () => {
    const h = createHarness();
    await withServer(h, async (url) => {
      for (const role of ["user", "admin"]) {
        assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType }, { "x-test-role": role })).status, 400);
      }
    });
    assert.equal(h.state.writes, 0);
    assert.equal(h.state.generated, 0);
  });
}

for (const [productType, amount] of [["saju_basic", 4900], ["saju_detail", 9900], ["saju_full", 19900]] as const) {
  test(`${productType} uses server price and stores the chosen focus and correct history scope`, async () => {
    const h = createHarness();
    if (productType === "saju_basic") h.state.records.orders.push({ id: 1, userId: "owner", metadata: { freeTrial: true } });
    await withServer(h, async (url) => {
      const response = await post(`${url}/commerce/orders`, { ...orderBody, productType, amount: 1, currency: "USD", reportFocus: "money", adminFreeAccess: true });
      assert.equal(response.status, 200);
      const created = await response.json() as Row;
      assert.equal(created.order.amount, amount);
      assert.equal(created.order.currency, "KRW");
      assert.equal(created.order.status, "pending");
      assert.equal(created.product.type, productType);
      const snapshot = h.state.records.analysisSnapshots[0];
      assert.equal(snapshot.sajuResult.reportFocus, "money");
      assert.equal(Boolean(snapshot.sajuResult.historyAnalysis), productType === "saju_full");
      assert.equal(h.state.historyInputs.length, productType === "saju_full" ? 1 : 0);
    });
    assert.equal(h.state.generated, 0);
    assert.equal(h.state.records.payments.length, 0);
    assert.equal(h.state.records.purchaseEntitlements.length, 0);
  });
}

test("omitted focus defaults to career and all supported focuses are preserved", async () => {
  const h = createHarness();
  await withServer(h, async (url) => {
    for (const reportFocus of [undefined, "career", "money", "relationship"]) {
      assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, reportFocus })).status, 200);
      assert.equal(h.state.records.analysisSnapshots.at(-1)?.sajuResult.reportFocus, reportFocus ?? "career");
    }
  });
});

for (const reportFocus of ["health", "", ["career"], { value: "money" }, 1, true]) {
  test(`invalid focus ${JSON.stringify(reportFocus)} cannot persist a purchase`, async () => {
    const h = createHarness();
    await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, reportFocus })).status, 400));
    assert.equal(h.state.writes, 0);
  });
}

test("enabling development simulation cannot convert an existing real order to a free purchase", async () => {
  const h = createHarness({ NODE_ENV: "test", PAYMENT_SIMULATION_ENABLED: "true" });
  const { order } = h.seed();
  await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId })).status, 409));
  assert.equal(order.status, "pending");
  assert.equal(h.state.writes, 0);
  assert.equal(h.state.generated, 0);
});

const directTossEnv = { NODE_ENV: "test", TOSS_PAY_API_KEY: "sk_test_synthetic", APP_URL: "https://shop.example" };
function seedDirectToss(h: Harness) {
  const seeded = h.seed();
  seeded.order.metadata = { checkoutProvider: "toss_pay", tossPayMode: "TEST", tossPayToken: "synthetic-toss-token", productTitle: "사주 상세 리포트", tossPayCheckoutPage: "https://pay.toss.im/checkout/synthetic" };
  return seeded;
}

test("direct Toss checkout uses stored price, binds its token and reuses its hosted URL", async () => {
  const h = createHarness(directTossEnv);
  await withServer(h, async (url) => {
    const creation = await post(`${url}/commerce/orders`, { ...orderBody, amount: 1 });
    assert.equal(creation.status, 200);
    const created = await creation.json() as Row;
    assert.equal(created.checkoutMode, "toss_pay");
    const endpoint = `${url}/commerce/orders/${created.order.orderId}/checkout`;
    const first = await post(endpoint, { amount: 1, orderNo: "intruder-order", productDesc: "free" });
    assert.equal(first.status, 200);
    const firstResult = await first.json() as Row;
    assert.equal(firstResult.checkoutPage, "https://pay.toss.im/checkout/synthetic");
    const second = await post(endpoint);
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), firstResult);
    assert.equal(h.state.records.orders[0].metadata.tossPayToken, "synthetic-toss-token");
    const providerRequest = h.state.tossCalls[0].body;
    assert.equal(providerRequest.amount, 9900);
    assert.equal(providerRequest.orderNo, created.order.orderId);
    assert.equal(providerRequest.autoExecute, false);
    assert.equal(new URL(providerRequest.retUrl).searchParams.get("orderId"), created.order.orderId);
  });
  assert.equal(h.state.tossCalls.length, 1);
  assert.equal(h.state.locks, 2);
});

test("direct Toss checkout requires authentication and ownership before provider access", async () => {
  const h = createHarness(directTossEnv);
  const { order } = seedDirectToss(h);
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/commerce/orders/${order.orderId}/checkout`, {}, { "x-test-user": "anonymous" })).status, 401);
    assert.equal((await post(`${url}/commerce/orders/${order.orderId}/checkout`, {}, { "x-test-user": "intruder" })).status, 400);
  });
  assert.equal(h.state.tossCalls.length, 0);
  assert.equal(h.state.writes, 0);
});

test("direct Toss authorization records paid status before PDF work and cannot capture twice", async () => {
  const h = createHarness(directTossEnv);
  seedDirectToss(h);
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order", authorize: true, amount: 1, paymentKey: "ignored-client-token" });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as Row).payment.provider, "toss_pay");
    const repeated = await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order", authorize: true });
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json() as Row).alreadyPaid, true);
  });
  assert.deepEqual(h.state.tossCalls.map((call) => call.endpoint), ["status", "execute", "status"]);
  assert.deepEqual(h.state.orderStatusesAtGeneration, ["paid"]);
  assert.equal(h.state.records.payments[0].amount, 9900);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("direct Toss lookup alone never executes an approved but unpaid purchase", async () => {
  const h = createHarness(directTossEnv);
  const { order } = seedDirectToss(h);
  await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId })).status, 400));
  assert.deepEqual(h.state.tossCalls.map((call) => call.endpoint), ["status"]);
  assert.equal(order.status, "pending");
  assert.equal(h.state.writes, 0);
});

test("direct Toss recovers a captured payment after execute times out without executing twice", async () => {
  const h = createHarness(directTossEnv);
  seedDirectToss(h);
  h.state.tossExecuteTimeout = true;
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order", authorize: true });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as Row).order.status, "paid");
  });
  assert.deepEqual(h.state.tossCalls.map((call) => call.endpoint), ["status", "execute", "status"]);
  assert.equal(h.state.records.payments.length, 1);
});

test("direct Toss paid status recovers without the success URL and survives renderer failure", async () => {
  const h = createHarness(directTossEnv);
  seedDirectToss(h);
  h.state.tossStatus = "PAY_COMPLETE";
  h.state.generationFails = true;
  await withServer(h, async (url) => {
    const response = await post(`${url}/commerce/payments/confirm`, { orderId: "synthetic-order" });
    assert.equal(response.status, 200);
    const confirmed = await response.json() as Row;
    assert.equal(confirmed.order.status, "paid");
    assert.equal(confirmed.report.status, "failed");
    h.state.generationFails = false;
    assert.equal((await post(`${url}/reports/21/regenerate`)).status, 200);
    assert.equal((await fetch(`${url}/reports/21/download`)).status, 200);
  });
  assert.deepEqual(h.state.tossCalls.map((call) => call.endpoint), ["status"]);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

for (const [reason, reply] of [
  ["wrong amount", { amount: 1 }],
  ["wrong token", { payToken: "another-token" }],
  ["wrong mode", { mode: "LIVE" }],
  ["wrong order", { orderNo: "another-order" }],
  ["refunded", { transactions: [{ stepType: "PAY" }, { stepType: "REFUND" }] }],
] as const) {
  test(`direct Toss ${reason} cannot create an entitlement`, async () => {
    const h = createHarness(directTossEnv);
    const { order } = seedDirectToss(h);
    h.state.tossStatus = "PAY_COMPLETE";
    h.state.tossReply = reply;
    await withServer(h, async (url) => assert.equal((await post(`${url}/commerce/payments/confirm`, { orderId: order.orderId, authorize: true })).status, 400));
    assert.equal(order.status, "pending");
    assert.equal(h.state.writes, 0);
    assert.equal(h.state.generated, 0);
  });
}

test("first basic report is free per account with paid sales closed and no provider configured", async () => {
  const h = createHarness({ NODE_ENV: "production", REPORT_SALES_ENABLED: undefined });
  await withServer(h, async (url) => {
    const anonymous = await (await fetch(`${url}/commerce/products`, { headers: { "x-test-user": "anonymous" } })).json() as Row;
    assert.equal(anonymous.freeTrialAvailable, null);
    assert.equal((await (await fetch(`${url}/commerce/products`)).json() as Row).freeTrialAvailable, true);
    const first = await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" });
    assert.equal(first.status, 200);
    const created = await first.json() as Row;
    assert.equal(created.checkoutMode, "trial");
    assert.equal(created.order.amount, 0);
    assert.equal(created.order.status, "paid");
    assert.equal((await fetch(`${url}/reports/${created.report.id}/download`)).status, 200);
    assert.equal((await (await fetch(`${url}/commerce/products`)).json() as Row).freeTrialAvailable, false);
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" })).status, 503);
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_detail", freeTrial: true })).status, 503);
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_full", amount: 0 })).status, 503);
    const other = await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" }, { "x-test-user": "another-account" });
    assert.equal(other.status, 200);
    assert.equal((await other.json() as Row).checkoutMode, "trial");
  });
  assert.equal(h.state.records.orders.length, 2);
  assert.equal(h.state.records.purchaseEntitlements.length, 2);
  assert.equal(h.state.records.payments.every((payment) => payment.provider === "trial" && payment.amount === 0), true);
  assert.equal(h.state.tossCalls.length + h.state.providerCalls.length, 0);
  assert.equal(h.state.advisoryLocks, 2);
});

test("a used free trial switches the next basic purchase to the server price", async () => {
  const h = createHarness();
  await withServer(h, async (url) => {
    const first = await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" });
    assert.equal(first.status, 200);
    const next = await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic", freeTrial: true, amount: 0 });
    assert.equal(next.status, 200);
    const created = await next.json() as Row;
    assert.equal(created.checkoutMode, "provider");
    assert.equal(created.order.amount, 4900);
    assert.equal(created.order.status, "pending");
  });
  assert.equal(h.state.records.orders.filter((order) => order.metadata?.freeTrial).length, 1);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("a stale free-trial screen cannot silently create a paid order", async () => {
  const h = createHarness();
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic", expectFreeTrial: true, expectedAmount: 0 })).status, 200);
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic", expectFreeTrial: true, expectedAmount: 0 })).status, 409);
  });
  assert.equal(h.state.records.orders.length, 1);
  assert.equal(h.state.records.orders[0].amount, 0);
  assert.equal(h.state.tossCalls.length + h.state.providerCalls.length, 0);
});

test("a changed displayed price blocks order creation before payment", async () => {
  const h = createHarness();
  await withServer(h, async (url) => {
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_detail", expectedAmount: 1 })).status, 409);
  });
  assert.equal(h.state.records.orders.length, 0);
  assert.equal(h.state.tossCalls.length + h.state.providerCalls.length, 0);
});

test("concurrent first-trial requests claim exactly one free order under the account lock", async () => {
  const h = createHarness({ NODE_ENV: "production", REPORT_SALES_ENABLED: undefined });
  let release!: () => void;
  const bothGenerating = new Promise<void>((resolve) => { release = resolve; });
  h.state.beforeGeneration = async () => {
    if (h.state.generated === 2) release();
    await bothGenerating;
  };
  await withServer(h, async (url) => {
    const results = await Promise.all([
      post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" }),
      post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" }),
    ]);
    assert.equal(results.filter((response) => response.status === 200).length, 1);
    assert.equal(results.filter((response) => response.status === 409).length, 1);
  });
  assert.equal(h.state.advisoryLocks, 2);
  assert.equal(h.state.records.orders.length, 1);
  assert.equal(h.state.records.pdfReports.length, 1);
  assert.equal(h.state.records.payments.length, 1);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
});

test("a failed free PDF can regenerate the same granted report without issuing another trial", async () => {
  const h = createHarness({ NODE_ENV: "production", REPORT_SALES_ENABLED: undefined });
  h.state.generationFails = true;
  await withServer(h, async (url) => {
    const first = await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" });
    assert.equal(first.status, 200);
    const created = await first.json() as Row;
    assert.equal(created.report.status, "failed");
    assert.equal(created.order.status, "paid");
    assert.equal((await post(`${url}/commerce/orders`, { ...orderBody, productType: "saju_basic" })).status, 503);
    h.state.generationFails = false;
    assert.equal((await post(`${url}/reports/${created.report.id}/regenerate`)).status, 200);
    assert.equal((await fetch(`${url}/reports/${created.report.id}/download`)).status, 200);
  });
  assert.equal(h.state.records.orders.length, 1);
  assert.equal(h.state.records.pdfReports.length, 1);
  assert.equal(h.state.records.purchaseEntitlements.length, 1);
  assert.deepEqual(h.state.generatedTiers, ["basic", "basic"]);
});
