const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

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

export function getDatabaseConfigGuidance(): string {
  return [
    ...DATABASE_URL_ENV_KEYS,
    "POSTGRES_HOST/POSTGRES_USER/POSTGRES_DATABASE",
  ].join(", ");
}
