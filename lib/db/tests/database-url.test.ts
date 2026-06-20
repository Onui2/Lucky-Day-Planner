import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  normalizeDatabaseUrlForNodePostgres,
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
