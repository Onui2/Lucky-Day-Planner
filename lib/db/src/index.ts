import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";
import {
  getDatabaseConfigGuidance,
  normalizeDatabaseUrlForNodePostgres,
  resolveDatabaseSslConfig,
  resolveDatabaseUrl,
} from "./database-url";

const { Pool } = pg;

const rawDatabaseUrl = resolveDatabaseUrl();
const resolvedDatabaseUrl = rawDatabaseUrl
  ? normalizeDatabaseUrlForNodePostgres(rawDatabaseUrl)
  : null;
const databaseConfigError = new Error(
  `A Postgres connection string was not found. Set one of: ${getDatabaseConfigGuidance()}.`,
);
const databaseUnavailableError = new Error(
  "The configured Postgres database is unavailable. Verify the server is running and the connection settings are correct.",
);
const sslConfig = resolveDatabaseSslConfig(rawDatabaseUrl);

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
      let discardClient = false;

      try {
        // Each serverless instance runs bootstrap. Keep DDL atomic and
        // serialize it across instances; IF NOT EXISTS alone can still race.
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended('lucky-day-planner:schema-bootstrap', 0))");
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
          );
          ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url varchar;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'user';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_valid_after timestamptz;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token varchar;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expiry timestamptz;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
          ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
          UPDATE users SET role = 'user' WHERE role IS NULL;
          UPDATE users SET created_at = now() WHERE created_at IS NULL;
          UPDATE users SET updated_at = now() WHERE updated_at IS NULL;
          ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
          ALTER TABLE users ALTER COLUMN role SET NOT NULL;
          ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
          ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
          ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;
          CREATE INDEX IF NOT EXISTS users_email_lookup_idx ON users ((lower(email)));
          CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users (password_reset_token);
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS auth_identities (
            provider varchar NOT NULL,
            subject varchar NOT NULL,
            user_id varchar REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (provider, subject)
          );
          CREATE INDEX IF NOT EXISTS auth_identities_user_idx ON auth_identities (user_id);

          CREATE TABLE IF NOT EXISTS sessions (
            sid varchar PRIMARY KEY,
            sess jsonb NOT NULL,
            expire timestamp NOT NULL
          );
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

          CREATE TABLE IF NOT EXISTS saved_saju (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            label varchar(50) NOT NULL DEFAULT '내 사주',
            birth_info jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE saved_saju ADD COLUMN IF NOT EXISTS label varchar(50) DEFAULT '내 사주';
          ALTER TABLE saved_saju ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
          UPDATE saved_saju SET label = '내 사주' WHERE label IS NULL;
          UPDATE saved_saju SET created_at = now() WHERE created_at IS NULL;
          ALTER TABLE saved_saju ALTER COLUMN label SET DEFAULT '내 사주';
          ALTER TABLE saved_saju ALTER COLUMN label SET NOT NULL;
          ALTER TABLE saved_saju ALTER COLUMN created_at SET DEFAULT now();
          ALTER TABLE saved_saju ALTER COLUMN created_at SET NOT NULL;
          CREATE INDEX IF NOT EXISTS saved_saju_user_created_idx ON saved_saju (user_id, created_at DESC);

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
          );
          CREATE UNIQUE INDEX IF NOT EXISTS lucky_day_bookmarks_user_entry_key_uidx ON lucky_day_bookmarks (user_id, entry_key);
          CREATE INDEX IF NOT EXISTS lucky_day_bookmarks_user_updated_idx ON lucky_day_bookmarks (user_id, updated_at DESC);

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
          );
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS user_label varchar(100);
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS saju_snapshot jsonb;
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending';
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS admin_reply text;
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS replied_at timestamptz;
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS read_by_admin boolean DEFAULT false;
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_type varchar(20) DEFAULT 'general';
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS read_by_user boolean DEFAULT false;
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
          ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
          UPDATE inquiries SET status = 'pending' WHERE status IS NULL;
          UPDATE inquiries SET read_by_admin = false WHERE read_by_admin IS NULL;
          UPDATE inquiries SET inquiry_type = 'general' WHERE inquiry_type IS NULL;
          UPDATE inquiries SET read_by_user = false WHERE read_by_user IS NULL;
          UPDATE inquiries SET created_at = now() WHERE created_at IS NULL;
          UPDATE inquiries SET updated_at = now() WHERE updated_at IS NULL;
          ALTER TABLE inquiries ALTER COLUMN status SET DEFAULT 'pending';
          ALTER TABLE inquiries ALTER COLUMN status SET NOT NULL;
          ALTER TABLE inquiries ALTER COLUMN read_by_admin SET DEFAULT false;
          ALTER TABLE inquiries ALTER COLUMN read_by_admin SET NOT NULL;
          ALTER TABLE inquiries ALTER COLUMN inquiry_type SET DEFAULT 'general';
          ALTER TABLE inquiries ALTER COLUMN inquiry_type SET NOT NULL;
          ALTER TABLE inquiries ALTER COLUMN read_by_user SET DEFAULT false;
          ALTER TABLE inquiries ALTER COLUMN read_by_user SET NOT NULL;
          ALTER TABLE inquiries ALTER COLUMN created_at SET DEFAULT now();
          ALTER TABLE inquiries ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE inquiries ALTER COLUMN updated_at SET DEFAULT now();
          ALTER TABLE inquiries ALTER COLUMN updated_at SET NOT NULL;
          CREATE INDEX IF NOT EXISTS inquiries_user_created_idx ON inquiries (user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS inquiries_status_created_idx ON inquiries (status, created_at DESC);
          CREATE INDEX IF NOT EXISTS inquiries_admin_unread_idx ON inquiries (read_by_admin, created_at DESC);

          CREATE TABLE IF NOT EXISTS user_profiles (
            user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            profile jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile jsonb DEFAULT '{}'::jsonb;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
          UPDATE user_profiles SET profile = '{}'::jsonb WHERE profile IS NULL;
          UPDATE user_profiles SET created_at = now() WHERE created_at IS NULL;
          UPDATE user_profiles SET updated_at = now() WHERE updated_at IS NULL;
          ALTER TABLE user_profiles ALTER COLUMN profile SET DEFAULT '{}'::jsonb;
          ALTER TABLE user_profiles ALTER COLUMN profile SET NOT NULL;
          ALTER TABLE user_profiles ALTER COLUMN created_at SET DEFAULT now();
          ALTER TABLE user_profiles ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE user_profiles ALTER COLUMN updated_at SET DEFAULT now();
          ALTER TABLE user_profiles ALTER COLUMN updated_at SET NOT NULL;
          CREATE INDEX IF NOT EXISTS user_profiles_updated_idx ON user_profiles (updated_at DESC);

          CREATE TABLE IF NOT EXISTS member_bookmarks (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            bookmark_id varchar(160) NOT NULL,
            payload jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS bookmark_id varchar(160);
          ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
          ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
          ALTER TABLE member_bookmarks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
          UPDATE member_bookmarks SET payload = '{}'::jsonb WHERE payload IS NULL;
          UPDATE member_bookmarks SET created_at = now() WHERE created_at IS NULL;
          UPDATE member_bookmarks SET updated_at = now() WHERE updated_at IS NULL;
          ALTER TABLE member_bookmarks ALTER COLUMN bookmark_id SET NOT NULL;
          ALTER TABLE member_bookmarks ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
          ALTER TABLE member_bookmarks ALTER COLUMN payload SET NOT NULL;
          ALTER TABLE member_bookmarks ALTER COLUMN created_at SET DEFAULT now();
          ALTER TABLE member_bookmarks ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE member_bookmarks ALTER COLUMN updated_at SET DEFAULT now();
          ALTER TABLE member_bookmarks ALTER COLUMN updated_at SET NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS member_bookmarks_user_bookmark_idx ON member_bookmarks (user_id, bookmark_id);
          CREATE INDEX IF NOT EXISTS member_bookmarks_user_updated_idx ON member_bookmarks (user_id, updated_at DESC);

          CREATE TABLE IF NOT EXISTS recent_activities (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_id varchar(200) NOT NULL,
            kind varchar(30) NOT NULL DEFAULT 'saju',
            payload jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS activity_id varchar(200);
          ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS kind varchar(30) DEFAULT 'saju';
          ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
          ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
          ALTER TABLE recent_activities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
          UPDATE recent_activities SET kind = 'saju' WHERE kind IS NULL;
          UPDATE recent_activities SET payload = '{}'::jsonb WHERE payload IS NULL;
          UPDATE recent_activities SET created_at = now() WHERE created_at IS NULL;
          UPDATE recent_activities SET updated_at = now() WHERE updated_at IS NULL;
          ALTER TABLE recent_activities ALTER COLUMN activity_id SET NOT NULL;
          ALTER TABLE recent_activities ALTER COLUMN kind SET DEFAULT 'saju';
          ALTER TABLE recent_activities ALTER COLUMN kind SET NOT NULL;
          ALTER TABLE recent_activities ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
          ALTER TABLE recent_activities ALTER COLUMN payload SET NOT NULL;
          ALTER TABLE recent_activities ALTER COLUMN created_at SET DEFAULT now();
          ALTER TABLE recent_activities ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE recent_activities ALTER COLUMN updated_at SET DEFAULT now();
          ALTER TABLE recent_activities ALTER COLUMN updated_at SET NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS recent_activities_user_activity_idx ON recent_activities (user_id, activity_id);
          CREATE INDEX IF NOT EXISTS recent_activities_user_updated_idx ON recent_activities (user_id, updated_at DESC);
          CREATE INDEX IF NOT EXISTS recent_activities_kind_updated_idx ON recent_activities (kind, updated_at DESC);

          CREATE TABLE IF NOT EXISTS announcements (
            id serial PRIMARY KEY,
            title varchar(100) NOT NULL,
            content text NOT NULL,
            type varchar(20) NOT NULL DEFAULT 'info',
            is_active boolean NOT NULL DEFAULT true,
            is_pinned boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type varchar(20) DEFAULT 'info';
          ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
          ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
          UPDATE announcements SET type = 'info' WHERE type IS NULL;
          UPDATE announcements SET is_active = true WHERE is_active IS NULL;
          UPDATE announcements SET is_pinned = false WHERE is_pinned IS NULL;
          CREATE INDEX IF NOT EXISTS announcements_active_pinned_idx ON announcements (is_active, is_pinned);

          CREATE TABLE IF NOT EXISTS analysis_snapshots (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind varchar(30) NOT NULL DEFAULT 'saju',
            title varchar(120) NOT NULL DEFAULT '사주 분석',
            birth_info jsonb NOT NULL,
            saju_result jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS analysis_snapshots_user_created_idx ON analysis_snapshots (user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS analysis_snapshots_kind_created_idx ON analysis_snapshots (kind, created_at DESC);

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
          );
          CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders (user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC);

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
          );
          CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments (status, created_at DESC);

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
          );
          CREATE UNIQUE INDEX IF NOT EXISTS purchase_entitlements_order_product_uidx ON purchase_entitlements (order_id, product_type);
          CREATE INDEX IF NOT EXISTS purchase_entitlements_user_status_idx ON purchase_entitlements (user_id, status);

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
          );
          CREATE INDEX IF NOT EXISTS pdf_reports_user_status_idx ON pdf_reports (user_id, status);
          CREATE INDEX IF NOT EXISTS pdf_reports_snapshot_idx ON pdf_reports (snapshot_id);

          CREATE TABLE IF NOT EXISTS share_snapshots (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash varchar(64) NOT NULL UNIQUE,
            public_payload jsonb NOT NULL,
            expires_at timestamptz NOT NULL,
            deleted_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE UNIQUE INDEX IF NOT EXISTS share_snapshots_token_hash_uidx ON share_snapshots (token_hash);
          CREATE INDEX IF NOT EXISTS share_snapshots_user_created_idx ON share_snapshots (user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS share_snapshots_expires_idx ON share_snapshots (expires_at);

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
          );
          CREATE INDEX IF NOT EXISTS user_subscriptions_user_status_idx ON user_subscriptions (user_id, status);
          CREATE INDEX IF NOT EXISTS user_subscriptions_period_end_idx ON user_subscriptions (current_period_end);

          CREATE TABLE IF NOT EXISTS ai_questions (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subscription_plan_code varchar(30),
            monthly_bucket varchar(7) NOT NULL,
            question text NOT NULL,
            answer text NOT NULL,
            birth_info jsonb,
            saju_result jsonb,
            blocked_by_guard boolean NOT NULL DEFAULT false,
            risk_level varchar(20) NOT NULL DEFAULT 'none',
            risk_reasons jsonb,
            conversation_history jsonb,
            request_metadata jsonb,
            prompt_guard_version varchar(40),
            created_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE ai_questions ADD COLUMN IF NOT EXISTS blocked_by_guard boolean NOT NULL DEFAULT false;
          ALTER TABLE ai_questions ADD COLUMN IF NOT EXISTS risk_level varchar(20) NOT NULL DEFAULT 'none';
          ALTER TABLE ai_questions ADD COLUMN IF NOT EXISTS risk_reasons jsonb;
          ALTER TABLE ai_questions ADD COLUMN IF NOT EXISTS conversation_history jsonb;
          ALTER TABLE ai_questions ADD COLUMN IF NOT EXISTS request_metadata jsonb;
          ALTER TABLE ai_questions ADD COLUMN IF NOT EXISTS prompt_guard_version varchar(40);
          CREATE INDEX IF NOT EXISTS ai_questions_user_bucket_idx ON ai_questions (user_id, monthly_bucket);
          CREATE INDEX IF NOT EXISTS ai_questions_user_created_idx ON ai_questions (user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS ai_questions_guard_created_idx ON ai_questions (blocked_by_guard, created_at DESC);

          CREATE TABLE IF NOT EXISTS rate_limit_buckets (
            bucket_name varchar(60) NOT NULL,
            key varchar(200) NOT NULL,
            count integer NOT NULL DEFAULT 0,
            reset_at timestamptz NOT NULL,
            PRIMARY KEY (bucket_name, key)
          );
          CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_idx ON rate_limit_buckets (reset_at);

          -- These tables are accessed only through the server. Supabase exposes
          -- public tables through its Data API and may grant anon/authenticated
          -- privileges by default, including on tables created in raw SQL.
          DO $private_tables$
          DECLARE
            private_tables text[] := ARRAY[
              'users', 'auth_identities', 'sessions', 'saved_saju',
              'lucky_day_bookmarks', 'inquiries', 'user_profiles',
              'member_bookmarks', 'recent_activities', 'announcements',
              'analysis_snapshots', 'orders', 'payments',
              'purchase_entitlements', 'pdf_reports', 'share_snapshots',
              'user_subscriptions', 'ai_questions', 'rate_limit_buckets'
            ];
            private_table text;
            private_sequence text;
          BEGIN
            FOREACH private_table IN ARRAY private_tables LOOP
              EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', private_table);
              EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', private_table);
              IF to_regrole('anon') IS NOT NULL THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', private_table);
              END IF;
              IF to_regrole('authenticated') IS NOT NULL THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', private_table);
              END IF;
            END LOOP;

            FOR private_sequence IN
              SELECT format('%I.%I', sequence_schema.nspname, sequence_relation.relname)
              FROM pg_class AS sequence_relation
              JOIN pg_namespace AS sequence_schema ON sequence_schema.oid = sequence_relation.relnamespace
              JOIN pg_depend AS sequence_dependency ON sequence_dependency.objid = sequence_relation.oid
              JOIN pg_class AS table_relation ON table_relation.oid = sequence_dependency.refobjid
              JOIN pg_namespace AS table_schema ON table_schema.oid = table_relation.relnamespace
              WHERE sequence_relation.relkind = 'S'
                AND sequence_dependency.deptype IN ('a', 'i')
                AND table_schema.nspname = 'public'
                AND table_relation.relname = ANY(private_tables)
            LOOP
              EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC', private_sequence);
              IF to_regrole('anon') IS NOT NULL THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM anon', private_sequence);
              END IF;
              IF to_regrole('authenticated') IS NOT NULL THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM authenticated', private_sequence);
              END IF;
            END LOOP;
          END
          $private_tables$;
        `);

        await client.query("COMMIT");
        databaseReady = true;
        lastDatabaseError = null;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // A connection with an unknown transaction state must leave the pool.
          discardClient = true;
        }
        throw error;
      } finally {
        client.release(discardClient);
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
