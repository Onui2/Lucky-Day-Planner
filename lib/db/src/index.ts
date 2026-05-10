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
          CREATE TABLE IF NOT EXISTS lucky_day_bookmarks (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            entry_key varchar(80) NOT NULL,
            title varchar(80) NOT NULL,
            note text,
            year integer NOT NULL,
            month integer NOT NULL,
            day integer NOT NULL,
            purpose varchar(30) NOT NULL,
            purpose_label varchar(30) NOT NULL,
            ganzi varchar(10) NOT NULL,
            ganzi_hanja varchar(10) NOT NULL,
            grade varchar(10) NOT NULL,
            score integer NOT NULL,
            tags jsonb NOT NULL DEFAULT '[]'::jsonb,
            href varchar(255) NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS lucky_day_bookmarks_user_entry_key_uidx ON lucky_day_bookmarks (user_id, entry_key)`);
        await client.query(`CREATE INDEX IF NOT EXISTS lucky_day_bookmarks_user_updated_idx ON lucky_day_bookmarks (user_id, updated_at DESC)`);

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

        await client.query(`
          CREATE TABLE IF NOT EXISTS user_profiles (
            user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            profile jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile jsonb DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
        await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
        await client.query(`UPDATE user_profiles SET profile = '{}'::jsonb WHERE profile IS NULL`);
        await client.query(`UPDATE user_profiles SET created_at = now() WHERE created_at IS NULL`);
        await client.query(`UPDATE user_profiles SET updated_at = now() WHERE updated_at IS NULL`);
        await client.query(`ALTER TABLE user_profiles ALTER COLUMN profile SET DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE user_profiles ALTER COLUMN profile SET NOT NULL`);
        await client.query(`ALTER TABLE user_profiles ALTER COLUMN created_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE user_profiles ALTER COLUMN created_at SET NOT NULL`);
        await client.query(`ALTER TABLE user_profiles ALTER COLUMN updated_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE user_profiles ALTER COLUMN updated_at SET NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS user_profiles_updated_idx ON user_profiles (updated_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS member_bookmarks (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            bookmark_id varchar(160) NOT NULL,
            payload jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS bookmark_id varchar(160)`);
        await client.query(`ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
        await client.query(`ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
        await client.query(`UPDATE member_bookmarks SET payload = '{}'::jsonb WHERE payload IS NULL`);
        await client.query(`UPDATE member_bookmarks SET created_at = now() WHERE created_at IS NULL`);
        await client.query(`UPDATE member_bookmarks SET updated_at = now() WHERE updated_at IS NULL`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN bookmark_id SET NOT NULL`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN payload SET DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN payload SET NOT NULL`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN created_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN created_at SET NOT NULL`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN updated_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE member_bookmarks ALTER COLUMN updated_at SET NOT NULL`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS member_bookmarks_user_bookmark_idx ON member_bookmarks (user_id, bookmark_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS member_bookmarks_user_updated_idx ON member_bookmarks (user_id, updated_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS recent_activities (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_id varchar(200) NOT NULL,
            kind varchar(30) NOT NULL DEFAULT 'saju',
            payload jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS activity_id varchar(200)`);
        await client.query(`ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS kind varchar(30) DEFAULT 'saju'`);
        await client.query(`ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
        await client.query(`ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
        await client.query(`UPDATE recent_activities SET kind = 'saju' WHERE kind IS NULL`);
        await client.query(`UPDATE recent_activities SET payload = '{}'::jsonb WHERE payload IS NULL`);
        await client.query(`UPDATE recent_activities SET created_at = now() WHERE created_at IS NULL`);
        await client.query(`UPDATE recent_activities SET updated_at = now() WHERE updated_at IS NULL`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN activity_id SET NOT NULL`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN kind SET DEFAULT 'saju'`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN kind SET NOT NULL`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN payload SET DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN payload SET NOT NULL`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN created_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN created_at SET NOT NULL`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN updated_at SET DEFAULT now()`);
        await client.query(`ALTER TABLE recent_activities ALTER COLUMN updated_at SET NOT NULL`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS recent_activities_user_activity_idx ON recent_activities (user_id, activity_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS recent_activities_user_updated_idx ON recent_activities (user_id, updated_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS recent_activities_kind_updated_idx ON recent_activities (kind, updated_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS announcements (
            id serial PRIMARY KEY,
            title varchar(100) NOT NULL,
            content text NOT NULL,
            type varchar(20) NOT NULL DEFAULT 'info',
            is_active boolean NOT NULL DEFAULT true,
            is_pinned boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type varchar(20) DEFAULT 'info'`);
        await client.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true`);
        await client.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false`);
        await client.query(`UPDATE announcements SET type = 'info' WHERE type IS NULL`);
        await client.query(`UPDATE announcements SET is_active = true WHERE is_active IS NULL`);
        await client.query(`UPDATE announcements SET is_pinned = false WHERE is_pinned IS NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS announcements_active_pinned_idx ON announcements (is_active, is_pinned)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS analysis_snapshots (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind varchar(30) NOT NULL DEFAULT 'saju',
            title varchar(120) NOT NULL DEFAULT '사주 분석',
            birth_info jsonb NOT NULL,
            saju_result jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS analysis_snapshots_user_created_idx ON analysis_snapshots (user_id, created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS analysis_snapshots_kind_created_idx ON analysis_snapshots (kind, created_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS orders (
            id serial PRIMARY KEY,
            order_id varchar(80) NOT NULL UNIQUE,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_type varchar(40) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            currency varchar(10) NOT NULL DEFAULT 'KRW',
            amount integer NOT NULL,
            snapshot_id integer REFERENCES analysis_snapshots(id) ON DELETE SET NULL,
            metadata jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders (user_id, created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS payments (
            id serial PRIMARY KEY,
            order_id integer NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
            provider varchar(20) NOT NULL DEFAULT 'toss',
            payment_key varchar(200) UNIQUE,
            method varchar(40),
            status varchar(20) NOT NULL DEFAULT 'ready',
            amount integer NOT NULL,
            raw_response jsonb,
            approved_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments (status, created_at DESC)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS purchase_entitlements (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_type varchar(40) NOT NULL,
            resource_type varchar(40) NOT NULL,
            resource_id integer,
            status varchar(20) NOT NULL DEFAULT 'active',
            expires_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS purchase_entitlements_order_product_uidx ON purchase_entitlements (order_id, product_type)`);
        await client.query(`CREATE INDEX IF NOT EXISTS purchase_entitlements_user_status_idx ON purchase_entitlements (user_id, status)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS pdf_reports (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            order_id integer NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
            snapshot_id integer NOT NULL REFERENCES analysis_snapshots(id) ON DELETE CASCADE,
            product_type varchar(40) NOT NULL DEFAULT 'saju_pdf',
            title varchar(160) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            format varchar(20) NOT NULL DEFAULT 'pdf',
            preview_text text,
            html_content text,
            file_name varchar(200),
            mime_type varchar(120) NOT NULL DEFAULT 'application/pdf',
            file_data_base64 text,
            failed_reason text,
            generated_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS pdf_reports_user_status_idx ON pdf_reports (user_id, status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS pdf_reports_snapshot_idx ON pdf_reports (snapshot_id)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS user_subscriptions (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_code varchar(30) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            current_period_start timestamptz NOT NULL,
            current_period_end timestamptz NOT NULL,
            cancel_at_period_end boolean NOT NULL DEFAULT false,
            metadata jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS user_subscriptions_user_status_idx ON user_subscriptions (user_id, status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS user_subscriptions_period_end_idx ON user_subscriptions (current_period_end)`);

        await client.query(`
          CREATE TABLE IF NOT EXISTS ai_questions (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subscription_plan_code varchar(30),
            monthly_bucket varchar(7) NOT NULL,
            question text NOT NULL,
            answer text NOT NULL,
            birth_info jsonb,
            saju_result jsonb,
            created_at timestamptz NOT NULL DEFAULT now()
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS ai_questions_user_bucket_idx ON ai_questions (user_id, monthly_bucket)`);
        await client.query(`CREATE INDEX IF NOT EXISTS ai_questions_user_created_idx ON ai_questions (user_id, created_at DESC)`);

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
