import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";

import {
  normalizeDatabaseUrlForNodePostgres,
  resolveDatabaseSslConfig,
  resolveDatabaseUrl,
} from "../src/database-url.ts";
import { SUPABASE_ROOT_CA } from "../src/supabase-root-ca.ts";

const require = createRequire(import.meta.url);
const ConnectionParameters = require("pg/lib/connection-parameters") as new (
  config: Record<string, unknown>,
) => { ssl: unknown };

for (const host of ["db.example.com", "project.supabase.co"]) {
  test(`verifies remote database certificates by default for ${host}`, () => {
    const raw = `postgresql://user:pass@${host}:5432/postgres`;
    const parameters = new ConnectionParameters({
      connectionString: normalizeDatabaseUrlForNodePostgres(raw),
      ...resolveDatabaseSslConfig(raw, {}),
    });
    assert.deepEqual(parameters.ssl, { rejectUnauthorized: true });
  });
}

test("bundled Supabase root is a valid CA with the expected fingerprint", () => {
  const certificate = new X509Certificate(SUPABASE_ROOT_CA);
  assert.equal(certificate.ca, true);
  assert.equal(certificate.fingerprint256, "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA");
});

for (const host of ["db.exampleproject123.supabase.co", "aws-1-ap-northeast-1.pooler.supabase.com"]) {
  test("uses the Supabase root CA and verifies hostname for " + host, () => {
    const raw = "postgresql://user:pass@" + host + ":5432/postgres?sslmode=require";
    const parameters = new ConnectionParameters({
      connectionString: normalizeDatabaseUrlForNodePostgres(raw),
      ...resolveDatabaseSslConfig(raw, {}),
    });
    assert.deepEqual(parameters.ssl, { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA });
  });
}

test("does not trust the Supabase CA for lookalike or unrelated hosts", () => {
  for (const host of [
    "pooler.supabase.com.evil.test",
    "db.project.supabase.co.evil.test",
    "foo.db.project.supabase.co",
    "foo.bar.pooler.supabase.com",
    "db.example.com",
  ]) {
    const raw = "postgresql://user:pass@" + host + "/postgres";
    assert.deepEqual(resolveDatabaseSslConfig(raw, {}), { ssl: { rejectUnauthorized: true } });
  }
});

test("query host override selects the CA for the actual host", () => {
  const raw = "postgresql://user:pass@localhost/postgres?host=localhost&host=aws-1-ap-northeast-1.pooler.supabase.com";
  assert.deepEqual(resolveDatabaseSslConfig(raw, {}), { ssl: { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA } });
});

test("explicit CA takes priority over the bundled Supabase root", () => {
  const raw = "postgresql://user:pass@aws-1-ap-northeast-1.pooler.supabase.com/postgres";
  assert.deepEqual(resolveDatabaseSslConfig(raw, { DATABASE_SSL_CA_CERT: "my-private-ca" }), {
    ssl: { rejectUnauthorized: true, ca: "my-private-ca" },
  });
});

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
