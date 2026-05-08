import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const announcementsTable = pgTable(
  "announcements",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 100 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 20 }).notNull().default("info"),
    isActive: boolean("is_active").notNull().default(true),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("announcements_active_pinned_idx").on(table.isActive, table.isPinned),
  ],
);

export type Announcement = typeof announcementsTable.$inferSelect;
export type InsertAnnouncement = typeof announcementsTable.$inferInsert;
