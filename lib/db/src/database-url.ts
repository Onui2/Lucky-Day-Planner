const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

const LIBPQ_COMPAT_SSLMODES = new Set(["prefer", "require"]);

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

export function getDatabaseConfigGuidance(): string {
  return [
    ...DATABASE_URL_ENV_KEYS,
    "POSTGRES_HOST/POSTGRES_USER/POSTGRES_DATABASE",
  ].join(", ");
}
