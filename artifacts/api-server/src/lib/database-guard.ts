import type { Response } from "express";
import {
  ensureDatabaseReady,
  getDatabaseStatusMessage,
  hasDatabaseConfig,
  isDatabaseReady,
} from "@workspace/db";

const NOT_CONFIGURED_MESSAGE =
  "Database is not configured. Set DATABASE_URL or POSTGRES_URL.";
const UNAVAILABLE_MESSAGE =
  "Database is currently unavailable. Check that Postgres is running and reachable.";

export async function isDatabaseAvailable(): Promise<boolean> {
  if (!hasDatabaseConfig()) {
    return false;
  }

  if (isDatabaseReady()) {
    return true;
  }

  return ensureDatabaseReady();
}

export async function requireDatabase(res: Response): Promise<boolean> {
  if (!hasDatabaseConfig()) {
    res.status(503).json({
      error: "DB_NOT_CONFIGURED",
      message: NOT_CONFIGURED_MESSAGE,
    });
    return false;
  }

  if (await isDatabaseAvailable()) {
    return true;
  }

  res.status(503).json({
    error: "DB_UNAVAILABLE",
    message: UNAVAILABLE_MESSAGE,
    detail: getDatabaseStatusMessage(),
  });
  return false;
}
