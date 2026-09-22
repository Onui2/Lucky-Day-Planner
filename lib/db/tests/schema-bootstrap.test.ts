import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

interface BootstrapApi {
  ensureDatabaseSchema(): Promise<void>;
  ensureDatabaseReady(): Promise<boolean>;
  isDatabaseReady(): boolean;
  getDatabaseError(): Error | null;
}

function createHarness(options: { failOnceOn?: RegExp; rollbackFails?: boolean } = {}) {
  const clients: Array<{ statements: string[]; released: boolean[] }> = [];
  const originalFailure = new Error("synthetic bootstrap failure");
  let failed = false;
  let beforeCommit: (() => void) | undefined;
  class FakePool {
    on() {}
    async connect() {
      const client = { statements: [] as string[], released: [] as boolean[] };
      clients.push(client);
      return {
        async query(sql: string) {
          const statement = sql.replace(/\s+/g, " ").trim();
          client.statements.push(statement);
          if (statement === "COMMIT") beforeCommit?.();
          if (!failed && options.failOnceOn?.test(statement)) {
            failed = true;
            throw originalFailure;
          }
          if (statement === "ROLLBACK" && options.rollbackFails) throw new Error("synthetic rollback failure");
          return { rows: [] };
        },
        release(discard = false) { client.released.push(discard); },
      };
    }
  }
  const module = { exports: {} };
  // Execute the actual bootstrap source, replacing only external boundaries.
  // No real pg package, schema import, env file, or database connection is used.
  runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: {} },
    console: { error() {} },
    Error,
    require(specifier: string) {
      if (specifier === "pg") return { Pool: FakePool };
      if (specifier === "drizzle-orm/node-postgres") return { drizzle: () => ({}) };
      if (specifier === "./schema") return {};
      if (specifier === "./database-url") return {
        resolveDatabaseUrl: () => "postgresql://synthetic.invalid/test",
        normalizeDatabaseUrlForNodePostgres: (url: string) => url,
        resolveDatabaseSslConfig: () => ({ ssl: { rejectUnauthorized: true } }),
        getDatabaseConfigGuidance: () => "DATABASE_URL",
      };
      throw new Error(`Unexpected bootstrap dependency: ${specifier}`);
    },
  });
  return {
    api: module.exports as BootstrapApi,
    clients,
    originalFailure,
    setBeforeCommit(callback: () => void) { beforeCommit = callback; },
  };
}

function assertLockedTransaction(statements: string[]) {
  assert.equal(statements[0], "BEGIN");
  assert.equal(statements[1], "SELECT pg_advisory_xact_lock(hashtextextended('lucky-day-planner:schema-bootstrap', 0))");
  assert.ok(statements[2].startsWith("CREATE TABLE IF NOT EXISTS users"));
}

test("bootstrap locks before DDL, commits auth schema, and shares concurrent calls", async () => {
  const h = createHarness();
  h.setBeforeCommit(() => assert.equal(h.api.isDatabaseReady(), false));
  const first = h.api.ensureDatabaseSchema();
  const second = h.api.ensureDatabaseSchema();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(h.clients.length, 1);
  const client = h.clients[0];
  assertLockedTransaction(client.statements);
  assert.ok(client.statements.some((sql) => sql.includes("ADD COLUMN IF NOT EXISTS auth_version")));
  assert.ok(client.statements.some((sql) => sql.includes("ADD COLUMN IF NOT EXISTS auth_valid_after")));
  assert.ok(client.statements.some((sql) => sql.startsWith("CREATE TABLE IF NOT EXISTS auth_identities")));
  assert.ok(client.statements.includes("ALTER TABLE auth_identities ENABLE ROW LEVEL SECURITY"));
  assert.equal(client.statements.at(-1), "COMMIT");
  assert.ok(!client.statements.includes("ROLLBACK"));
  assert.deepEqual(client.released, [false]);
  assert.equal(h.api.isDatabaseReady(), true);
  assert.equal(h.api.getDatabaseError(), null);
  await h.api.ensureDatabaseSchema();
  assert.equal(h.clients.length, 1);
});

test("DDL failure rolls back and releases, then a new bootstrap attempt can succeed", async () => {
  const h = createHarness({ failOnceOn: /^CREATE TABLE IF NOT EXISTS auth_identities/ });
  await assert.rejects(h.api.ensureDatabaseSchema(), (error) => error === h.originalFailure);
  assertLockedTransaction(h.clients[0].statements);
  assert.equal(h.clients[0].statements.at(-1), "ROLLBACK");
  assert.ok(!h.clients[0].statements.includes("COMMIT"));
  assert.deepEqual(h.clients[0].released, [false]);
  assert.equal(h.api.isDatabaseReady(), false);
  assert.equal(h.api.getDatabaseError(), h.originalFailure);
  await h.api.ensureDatabaseSchema();
  assert.equal(h.clients.length, 2);
  assertLockedTransaction(h.clients[1].statements);
  assert.equal(h.clients[1].statements.at(-1), "COMMIT");
  assert.equal(h.api.isDatabaseReady(), true);
  assert.equal(h.api.getDatabaseError(), null);
});

test("commit failure never marks the database ready and remains retryable", async () => {
  const h = createHarness({ failOnceOn: /^COMMIT$/ });
  assert.equal(await h.api.ensureDatabaseReady(), false);
  assert.deepEqual(h.clients[0].statements.slice(-2), ["COMMIT", "ROLLBACK"]);
  assert.deepEqual(h.clients[0].released, [false]);
  assert.equal(h.api.isDatabaseReady(), false);
  assert.equal(await h.api.ensureDatabaseReady(), true);
  assert.equal(h.clients.length, 2);
});

test("rollback failure discards the client, preserving the original failure", async () => {
  const h = createHarness({ failOnceOn: /^CREATE TABLE IF NOT EXISTS users/, rollbackFails: true });
  await assert.rejects(h.api.ensureDatabaseSchema(), (error) => error === h.originalFailure);
  assert.equal(h.clients[0].statements.at(-1), "ROLLBACK");
  assert.deepEqual(h.clients[0].released, [true]);
  assert.equal(h.api.isDatabaseReady(), false);
  assert.equal(h.api.getDatabaseError(), h.originalFailure);
  await h.api.ensureDatabaseSchema();
  assert.equal(h.clients.length, 2);
  assert.equal(h.api.isDatabaseReady(), true);
});
