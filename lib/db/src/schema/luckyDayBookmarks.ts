import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const luckyDayBookmarksTable = pgTable(
  "lucky_day_bookmarks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    entryKey: varchar("entry_key", { length: 80 }).notNull(),
    title: varchar("title", { length: 80 }).notNull(),
    note: text("note"),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    day: integer("day").notNull(),
    purpose: varchar("purpose", { length: 30 }).notNull(),
    purposeLabel: varchar("purpose_label", { length: 30 }).notNull(),
    ganzi: varchar("ganzi", { length: 10 }).notNull(),
    ganziHanja: varchar("ganzi_hanja", { length: 10 }).notNull(),
    grade: varchar("grade", { length: 10 }).notNull(),
    score: integer("score").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull(),
    href: varchar("href", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("lucky_day_bookmarks_user_entry_key_uidx").on(table.userId, table.entryKey),
    index("lucky_day_bookmarks_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export type LuckyDayBookmark = typeof luckyDayBookmarksTable.$inferSelect;
export type InsertLuckyDayBookmark = typeof luckyDayBookmarksTable.$inferInsert;
