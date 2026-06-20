import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  normalizeDatabaseUrlForNodePostgres,
  resolveDatabaseSslConfig,
  resolveDatabaseUrl,
} from "../src/database-url.ts";

const require = createRequire(import.meta.url);
const ConnectionParameters = require("pg/lib/connection-parameters") as new (
  config: Record<string, unknown>,
) => { ssl: unknown };

test("normalizes sslmode=require so pg keeps the runtime SSL override", () => {
  const normalized = normalizeDatabaseUrlForNodePostgres(
    "postgresql://user:pass@example.supabase.com:5432/postgres?sslmode=require",
  );

  const parameters = new ConnectionParameters({
    connectionString: normalized,
    ssl: { rejectUnauthorized: false },
  });

  assert.equal(new URL(normalized).searchParams.get("uselibpqcompat"), "true");
  assert.deepEqual(parameters.ssl, { rejectUnauthorized: false });
});

test("leaves strict certificate verification mode untouched", () => {
  const databaseUrl =
    "postgresql://user:pass@example.supabase.com:5432/postgres?sslmode=verify-full";

  assert.equal(normalizeDatabaseUrlForNodePostgres(databaseUrl), databaseUrl);
});

test("maps sslmode=require to non-verifying SSL for node-postgres pools", () => {
  assert.deepEqual(
    resolveDatabaseSslConfig(
      "postgresql://user:pass@example.supabase.com:5432/postgres?sslmode=require",
      {},
    ),
    { ssl: { rejectUnauthorized: false } },
  );
});

test("keeps strict SSL verification modes strict", () => {
  assert.deepEqual(
    resolveDatabaseSslConfig(
      "postgresql://user:pass@example.supabase.com:5432/postgres?sslmode=verify-full",
      {},
    ),
    { ssl: { rejectUnauthorized: true } },
  );
});

test("uses non-verifying SSL by default for Supabase hosts", () => {
  assert.deepEqual(
    resolveDatabaseSslConfig(
      "postgresql://user:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
      {},
    ),
    { ssl: { rejectUnauthorized: false } },
  );
});

test("does not enable SSL for local database hosts by default", () => {
  assert.deepEqual(
    resolveDatabaseSslConfig("postgresql://user:pass@localhost:5432/postgres", {}),
    {},
  );
});

test("resolves Vercel Postgres component variables", () => {
  assert.equal(
    resolveDatabaseUrl({
      POSTGRES_HOST: "db.example.com",
      POSTGRES_USER: "user@example.com",
      POSTGRES_PASSWORD: "p@ss word",
      POSTGRES_DATABASE: "postgres",
      POSTGRES_PORT: "6543",
    } as NodeJS.ProcessEnv),
    "postgresql://user%40example.com:p%40ss%20word@db.example.com:6543/postgres",
  );
});
