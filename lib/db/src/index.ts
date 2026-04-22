import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";
import {
  getDatabaseConfigGuidance,
  resolveDatabaseUrl,
} from "./database-url";

const { Pool } = pg;

const resolvedDatabaseUrl = resolveDatabaseUrl();
const databaseConfigError = new Error(
  `A Postgres connection string was not found. Set one of: ${getDatabaseConfigGuidance()}.`,
);
const databaseUnavailableError = new Error(
  "The configured Postgres database is unavailable. Verify the server is running and the connection settings are correct.",
);

const databaseHost = resolvedDatabaseUrl
  ? (() => {
      try {
        return new URL(resolvedDatabaseUrl).hostname.toLowerCase();
      } catch {
        return "";
      }
    })()
  : "";

const sslMode = (process.env.PGSSLMODE ?? process.env.PGSSL ?? "").toLowerCase();
const sslExplicitlyDisabled = ["0", "false", "disable", "off"].includes(sslMode);
const sslExplicitlyEnabled = ["1", "true", "require", "on"].includes(sslMode);
const isLocalDatabaseHost =
  databaseHost === "" ||
  databaseHost === "localhost" ||
  databaseHost === "127.0.0.1" ||
  databaseHost === "::1";
const shouldUseSsl =
  !sslExplicitlyDisabled &&
  (
    sslExplicitlyEnabled ||
    process.env.NODE_ENV === "production" ||
    databaseHost.endsWith(".supabase.co") ||
    databaseHost.endsWith(".supabase.com") ||
    !isLocalDatabaseHost
  );
const sslConfig = shouldUseSsl
  ? { ssl: { rejectUnauthorized: false } }
  : {};

export function hasDatabaseConfig(): boolean {
  return Boolean(resolvedDatabaseUrl);
}

let lastDatabaseError: Error | null = hasDatabaseConfig()
  ? null
  : databaseConfigError;
let databaseReady = false;

export const pool = hasDatabaseConfig()
  ? new Pool({
      connectionString: resolvedDatabaseUrl!,
      max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? "1" : "10")),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? "30000"),
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? "10000"),
      ...sslConfig,
    })
  : null;

pool?.on("error", (err) => {
  lastDatabaseError = err;
  databaseReady = false;
  console.error("Unexpected error on idle database client:", err.message);
});

const dbInstance = pool ? drizzle(pool, { schema }) : null;
type Database = NonNullable<typeof dbInstance>;

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    if (!dbInstance) {
      throw databaseConfigError;
    }

    const value = Reflect.get(dbInstance, prop, receiver);
    return typeof value === "function" ? value.bind(dbInstance) : value;
  },
});

let schemaReadyPromise: Promise<void> | null = null;

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export function getDatabaseError(): Error | null {
  return lastDatabaseError;
}

export function getDatabaseStatusMessage(): string {
  if (!hasDatabaseConfig()) {
    return databaseConfigError.message;
  }

  return lastDatabaseError?.message ?? databaseUnavailableError.message;
}

export async function ensureDatabaseReady(): Promise<boolean> {
  if (!pool) {
    lastDatabaseError = databaseConfigError;
    databaseReady = false;
    return false;
  }

  try {
    await ensureDatabaseSchema();
    return true;
  } catch (error) {
    lastDatabaseError =
      error instanceof Error ? error : databaseUnavailableError;
    databaseReady = false;
    return false;
  }
}

export function ensureDatabaseSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      if (!pool) {
        lastDatabaseError = databaseConfigError;
        databaseReady = false;
        return;
      }

      const client = await pool.connect();

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id varchar PRIMARY KEY,
            email varchar UNIQUE,
            first_name varchar,
            last_name varchar,
            profile_image_url varchar,
            role varchar(20) NOT NULL DEFAULT 'user',
            password_hash varchar,
            password_reset_token varchar,
            password_reset_expiry timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url varchar`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'user'`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token varchar`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expiry timestamptz`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
        await client.query(`UPDATE users SET role = 'user' WHERE role IS NULL`);
        await client.query(`UPDATE users SET created_at = now() WHERE created_at IS NULL`);
        await client.query(`UPDATE users SET updated_at = now() WHERE updated_at IS NULL`);
        await client.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'`);
        await client.query(`ALTER TABLE users ALTER COLUMN role SET NOT NULL`);
        await client.query(`ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE users ALTER COLUMN created_at SET NOT NULL`);
        await client.query(`ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS users_email_lookup_idx ON users ((lower(email)))`);
        await client.query(`CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users (password_reset_token)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS sessions (
            sid varchar PRIMARY KEY,
            sess jsonb NOT NULL,
            expire timestamp NOT NULL
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS saved_saju (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            label varchar(50) NOT NULL DEFAULT '내 사주',
            birth_info jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE saved_saju ADD COLUMN IF NOT EXISTS label varchar(50) DEFAULT '내 사주'`);
        await client.query(`ALTER TABLE saved_saju ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
        await client.query(`UPDATE saved_saju SET label = '내 사주' WHERE label IS NULL`);
        await client.query(`UPDATE saved_saju SET created_at = now() WHERE created_at IS NULL`);
        await client.query(`ALTER TABLE saved_saju ALTER COLUMN label SET DEFAULT '내 사주'`);
        await client.query(`ALTER TABLE saved_saju ALTER COLUMN label SET NOT NULL`);
        await client.query(`ALTER TABLE saved_saju ALTER COLUMN created_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE saved_saju ALTER COLUMN created_at SET NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS saved_saju_user_created_idx ON saved_saju (user_id, created_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS inquiries (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_label varchar(100),
            saju_snapshot jsonb,
            message text NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            admin_reply text,
            replied_at timestamptz,
            read_by_admin boolean NOT NULL DEFAULT false,
            inquiry_type varchar(20) NOT NULL DEFAULT 'general',
            read_by_user boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS user_label varchar(100)`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS saju_snapshot jsonb`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending'`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS admin_reply text`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS replied_at timestamptz`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS read_by_admin boolean DEFAULT false`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_type varchar(20) DEFAULT 'general'`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS read_by_user boolean DEFAULT false`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
        await client.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
        await client.query(`UPDATE inquiries SET status = 'pending' WHERE status IS NULL`);
        await client.query(`UPDATE inquiries SET read_by_admin = false WHERE read_by_admin IS NULL`);
        await client.query(`UPDATE inquiries SET inquiry_type = 'general' WHERE inquiry_type IS NULL`);
        await client.query(`UPDATE inquiries SET read_by_user = false WHERE read_by_user IS NULL`);
        await client.query(`UPDATE inquiries SET created_at = now() WHERE created_at IS NULL`);
        await client.query(`UPDATE inquiries SET updated_at = now() WHERE updated_at IS NULL`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN status SET DEFAULT 'pending'`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN status SET NOT NULL`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN read_by_admin SET DEFAULT false`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN read_by_admin SET NOT NULL`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN inquiry_type SET DEFAULT 'general'`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN inquiry_type SET NOT NULL`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN read_by_user SET DEFAULT false`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN read_by_user SET NOT NULL`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN created_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN created_at SET NOT NULL`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN updated_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE inquiries ALTER COLUMN updated_at SET NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS inquiries_user_created_idx ON inquiries (user_id, created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS inquiries_status_created_idx ON inquiries (status, created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS inquiries_admin_unread_idx ON inquiries (read_by_admin, created_at DESC)`);
        databaseReady = true;
        lastDatabaseError = null;
      } finally {
        client.release();
      }
    })().catch((error) => {
      lastDatabaseError =
        error instanceof Error ? error : databaseUnavailableError;
      databaseReady = false;
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

export * from "./schema";
