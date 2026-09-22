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

for (const host of ["db.example.com", "project.supabase.co", "aws-0-ap-northeast-2.pooler.supabase.com"]) {
  test(`verifies remote database certificates by default for ${host}`, () => {
    const raw = `postgresql://user:pass@${host}:5432/postgres`;
    const parameters = new ConnectionParameters({
      connectionString: normalizeDatabaseUrlForNodePostgres(raw),
      ...resolveDatabaseSslConfig(raw, {}),
    });
    assert.deepEqual(parameters.ssl, { rejectUnauthorized: true });
  });
}

for (const mode of ["require", "prefer", "verify-ca", "verify-full"]) {
  test(`keeps certificate and hostname verification for sslmode=${mode}`, () => {
    const raw = `postgresql://user:pass@db.example.com/postgres?sslmode=${mode}&uselibpqcompat=true&application_name=security-test`;
    const normalized = normalizeDatabaseUrlForNodePostgres(raw);
    const parameters = new ConnectionParameters({
      connectionString: normalized,
      ...resolveDatabaseSslConfig(raw, {}),
    });
    assert.deepEqual(parameters.ssl, { rejectUnauthorized: true });
    assert.equal(new URL(normalized).searchParams.has("sslmode"), false);
    assert.equal(new URL(normalized).searchParams.has("uselibpqcompat"), false);
    assert.equal(new URL(normalized).searchParams.get("application_name"), "security-test");
  });
}

test("URL TLS options cannot replace the explicitly trusted CA", () => {
  const raw = "postgresql://user:pass@db.example.com/postgres?sslmode=require&ssl=no-verify&sslrootcert=/not-read&sslcert=/not-read&sslkey=/not-read&uselibpqcompat=true";
  const ca = "-----BEGIN CERTIFICATE-----\ntrusted-test-ca\n-----END CERTIFICATE-----";
  const config = resolveDatabaseSslConfig(raw, { DATABASE_SSL_CA_CERT: ca.replace(/\n/g, "\\n") });
  const parameters = new ConnectionParameters({
    connectionString: normalizeDatabaseUrlForNodePostgres(raw),
    ...config,
  });
  assert.deepEqual(parameters.ssl, { rejectUnauthorized: true, ca });
});

for (const mode of ["disable", "no-verify", "insecure", "allow", "false"]) {
  test(`rejects insecure remote database SSL mode ${mode}`, () => {
    for (const runtime of [{ NODE_ENV: "production" }, { NODE_ENV: "development" }, {}]) {
      assert.throws(() => resolveDatabaseSslConfig(
        `postgresql://user:pass@db.example.com/postgres?sslmode=${mode}`, runtime,
      ), /verified TLS|insecure database SSL mode/);
      assert.throws(() => resolveDatabaseSslConfig(
        "postgresql://user:pass@db.example.com/postgres", { ...runtime, PGSSLMODE: mode },
      ), /verified TLS|insecure database SSL mode/);
    }
  });
}

test("PGSSLMODE cannot downgrade remote TLS and verified env settings survive URL overrides", () => {
  const raw = "postgresql://user:pass@db.example.com/postgres?sslmode=no-verify&ssl=0";
  const parameters = new ConnectionParameters({
    connectionString: normalizeDatabaseUrlForNodePostgres(raw),
    ...resolveDatabaseSslConfig(raw, { PGSSLMODE: "verify-full" }),
  });
  assert.deepEqual(parameters.ssl, { rejectUnauthorized: true });
  assert.throws(() => resolveDatabaseSslConfig("postgresql://user:pass@db.example.com/postgres?ssl=0", {}), /verified TLS/);
});

test("allows plaintext only for explicit loopback hosts", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.deepEqual(resolveDatabaseSslConfig(`postgresql://user:pass@${host}/postgres`, {}), { ssl: false });
    assert.deepEqual(resolveDatabaseSslConfig(`postgresql://user:pass@${host}/postgres?sslmode=disable`, {}), { ssl: false });
  }
  assert.deepEqual(resolveDatabaseSslConfig(null, {}), { ssl: false });
});

test("query host overrides cannot bypass remote TLS", () => {
  const raw = "postgresql://user:pass@localhost/postgres?host=localhost&host=db.example.com";
  assert.deepEqual(resolveDatabaseSslConfig(raw, {}), { ssl: { rejectUnauthorized: true } });
  assert.throws(() => resolveDatabaseSslConfig(`${raw}&sslmode=disable`, {}), /verified TLS/);
});

test("rejects invalid database URLs without disclosing their contents", () => {
  assert.throws(() => normalizeDatabaseUrlForNodePostgres("not-a-url-with-sensitive-content"), {
    message: "Database URL must be a valid postgres:// or postgresql:// URL.",
  });
  assert.throws(() => resolveDatabaseSslConfig("https://example.com/db", {}), /Database URL must be/);
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
