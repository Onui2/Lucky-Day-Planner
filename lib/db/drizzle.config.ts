import { defineConfig } from "drizzle-kit";
import {
  getDatabaseConfigGuidance,
  resolveDatabaseUrl,
} from "./src/database-url";

const databaseUrl = resolveDatabaseUrl(process.env);

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
