import {
  index,
  jsonb,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { usersTable } from "./auth";

export type SharePublicPayload = Record<string, unknown>;

export const shareSnapshotsTable = pgTable(
  "share_snapshots",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    publicPayload: jsonb("public_payload").$type<SharePublicPayload>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("share_snapshots_token_hash_uidx").on(table.tokenHash),
    index("share_snapshots_user_created_idx").on(table.userId, table.createdAt),
    index("share_snapshots_expires_idx").on(table.expiresAt),
  ],
);

export type ShareSnapshot = typeof shareSnapshotsTable.$inferSelect;
export type InsertShareSnapshot = typeof shareSnapshotsTable.$inferInsert;
