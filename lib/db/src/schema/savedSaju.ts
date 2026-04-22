import { index, serial, pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const savedSajuTable = pgTable(
  "saved_saju",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 50 }).notNull().default("내 사주"),
    birthInfo: jsonb("birth_info").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("saved_saju_user_created_idx").on(table.userId, table.createdAt)],
);

export type SavedSaju = typeof savedSajuTable.$inferSelect;
export type InsertSavedSaju = typeof savedSajuTable.$inferInsert;
