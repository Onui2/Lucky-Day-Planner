import { SUPABASE_ROOT_CA } from "./supabase-root-ca.js";

const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

const SSL_DISABLED_VALUES = new Set(["0", "false", "disable", "off"]);
const SSL_VERIFY_VALUES = new Set(["1", "true", "on", "prefer", "require", "verify-ca", "verify-full"]);
const SSL_URL_OPTIONS = ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"];

type NodePostgresSslConfig = {
  ssl: false | {
    rejectUnauthorized: true;
    ca?: string;
  };
};

export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  const host = env.POSTGRES_HOST ?? env.PGHOST;
  const user = env.POSTGRES_USER ?? env.PGUSER;
  const password = env.POSTGRES_PASSWORD ?? env.PGPASSWORD;
  const database = env.POSTGRES_DATABASE ?? env.PGDATABASE ?? null;
  const port = env.POSTGRES_PORT ?? env.PGPORT ?? "5432";

  if (!host || !user || !database) {
    return null;
  }

  const auth = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);

  return `postgresql://${auth}@${host}:${port}/${database}`;
}

export function normalizeDatabaseUrlForNodePostgres(databaseUrl: string): string {
  const url = getDatabaseUrl(databaseUrl)!;
  // pg lets URL SSL parameters replace the entire ssl object, including its CA.
  // Callers must pair this URL with resolveDatabaseSslConfig(rawUrl).
  for (const option of SSL_URL_OPTIONS) {
    url.searchParams.delete(option);
  }

  return url.toString();
}

function getDatabaseUrl(databaseUrl: string | null): URL | null {
  if (!databaseUrl) {
    return null;
  }

  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error();
    }
    return url;
  } catch {
    throw new Error("Database URL must be a valid postgres:// or postgresql:// URL.");
  }
}

function getSslMode(value: string | undefined | null): string | null {
  const sslMode = value?.trim().toLowerCase();
  return sslMode || null;
}

export function resolveDatabaseSslConfig(
  databaseUrl: string | null,
  env: NodeJS.ProcessEnv = process.env,
): NodePostgresSslConfig {
  const url = getDatabaseUrl(databaseUrl);
  if (!url) return { ssl: false };
  // pg accepts a host query parameter and uses its last occurrence.
  const hostOverrides = url.searchParams.getAll("host");
  const databaseHost = (hostOverrides.at(-1) || url.hostname).toLowerCase();
  const isLocalDatabaseHost =
    databaseHost === "localhost" ||
    databaseHost === "127.0.0.1" ||
    databaseHost === "::1" || databaseHost === "[::1]";
  const sslMode = getSslMode(env.PGSSLMODE ?? env.PGSSL) ??
    getSslMode(url.searchParams.getAll("sslmode").at(-1)) ??
    getSslMode(url.searchParams.getAll("ssl").at(-1));

  if (sslMode && SSL_DISABLED_VALUES.has(sslMode)) {
    if (!isLocalDatabaseHost) {
      throw new Error("Remote database connections require verified TLS.");
    }
    return { ssl: false };
  }
  if (sslMode && !SSL_VERIFY_VALUES.has(sslMode)) {
    throw new Error("Unsupported or insecure database SSL mode. Use verify-full and DATABASE_SSL_CA_CERT if needed.");
  }
  const suppliedCa = env.DATABASE_SSL_CA_CERT?.replace(/\\n/g, "\n").trim();
  const isSupabaseDatabaseHost =
    /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(databaseHost) ||
    /^db\.[a-z0-9-]+\.supabase\.co$/.test(databaseHost);
  const ca = suppliedCa || (isSupabaseDatabaseHost ? SUPABASE_ROOT_CA : undefined);
  if (isLocalDatabaseHost && !sslMode && !ca) return { ssl: false };
  return { ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) } };
}

export function getDatabaseConfigGuidance(): string {
  return [
    ...DATABASE_URL_ENV_KEYS,
    "POSTGRES_HOST/POSTGRES_USER/POSTGRES_DATABASE",
  ].join(", ");
}
