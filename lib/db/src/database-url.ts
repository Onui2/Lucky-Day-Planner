const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

const LIBPQ_COMPAT_SSLMODES = new Set(["prefer", "require"]);
const SSL_DISABLED_VALUES = new Set(["0", "false", "disable", "off"]);
const SSL_ENABLED_VALUES = new Set(["1", "true", "on"]);
const SSL_NO_VERIFY_VALUES = new Set([
  "allow",
  "allow-unauthorized",
  "disable-verification",
  "insecure",
  "no-verify",
  "prefer",
  "require",
]);
const SSL_VERIFY_VALUES = new Set(["verify-ca", "verify-full"]);

type NodePostgresSslConfig = {
  ssl?: {
    rejectUnauthorized: boolean;
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
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }

  const sslMode = url.searchParams.get("sslmode")?.trim().toLowerCase();
  if (!sslMode || !LIBPQ_COMPAT_SSLMODES.has(sslMode)) {
    return databaseUrl;
  }

  if (!url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function getDatabaseUrl(databaseUrl: string | null): URL | null {
  if (!databaseUrl) {
    return null;
  }

  try {
    return new URL(databaseUrl);
  } catch {
    return null;
  }
}

function getSslMode(value: string | undefined | null): string | null {
  const sslMode = value?.trim().toLowerCase();
  return sslMode || null;
}

function sslConfigFromMode(sslMode: string | null): NodePostgresSslConfig | null {
  if (!sslMode) {
    return null;
  }

  if (SSL_DISABLED_VALUES.has(sslMode)) {
    return {};
  }

  if (SSL_NO_VERIFY_VALUES.has(sslMode)) {
    return { ssl: { rejectUnauthorized: false } };
  }

  if (SSL_VERIFY_VALUES.has(sslMode) || SSL_ENABLED_VALUES.has(sslMode)) {
    return { ssl: { rejectUnauthorized: true } };
  }

  return null;
}

export function resolveDatabaseSslConfig(
  databaseUrl: string | null,
  env: NodeJS.ProcessEnv = process.env,
): NodePostgresSslConfig {
  const envSslMode = getSslMode(env.PGSSLMODE ?? env.PGSSL);
  const envSslConfig = sslConfigFromMode(envSslMode);

  if (envSslConfig) {
    return envSslConfig;
  }

  const url = getDatabaseUrl(databaseUrl);
  const urlSslConfig = sslConfigFromMode(getSslMode(url?.searchParams.get("sslmode")));

  if (urlSslConfig) {
    return urlSslConfig;
  }

  const databaseHost = url?.hostname.toLowerCase() ?? "";
  const isLocalDatabaseHost =
    databaseHost === "" ||
    databaseHost === "localhost" ||
    databaseHost === "127.0.0.1" ||
    databaseHost === "::1";

  if (isLocalDatabaseHost) {
    return {};
  }

  return {
    ssl: {
      rejectUnauthorized:
        !databaseHost.endsWith(".supabase.co") &&
        !databaseHost.endsWith(".supabase.com"),
    },
  };
}

export function getDatabaseConfigGuidance(): string {
  return [
    ...DATABASE_URL_ENV_KEYS,
    "POSTGRES_HOST/POSTGRES_USER/POSTGRES_DATABASE",
  ].join(", ");
}
