import { defineConfig } from "drizzle-kit";
import {
  getDatabaseConfigGuidance,
  normalizeDatabaseUrlForNodePostgres,
  resolveDatabaseUrl,
} from "./src/database-url";

const rawDatabaseUrl = resolveDatabaseUrl(process.env);
const databaseUrl = rawDatabaseUrl
  ? normalizeDatabaseUrlForNodePostgres(rawDatabaseUrl)
  : null;

if (!databaseUrl) {
  throw new Error(
    `No database connection string was found. Set one of: ${getDatabaseConfigGuidance()}.`,
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
