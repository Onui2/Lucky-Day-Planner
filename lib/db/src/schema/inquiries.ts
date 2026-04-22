import { boolean, index, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const inquiriesTable = pgTable(
  "inquiries",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    userLabel: varchar("user_label", { length: 100 }),
    sajuSnapshot: jsonb("saju_snapshot"),
    message: text("message").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    adminReply: text("admin_reply"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    readByAdmin: boolean("read_by_admin").notNull().default(false),
    inquiryType: varchar("inquiry_type", { length: 20 }).notNull().default("general"),
    readByUser: boolean("read_by_user").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("inquiries_user_created_idx").on(table.userId, table.createdAt),
    index("inquiries_status_created_idx").on(table.status, table.createdAt),
    index("inquiries_admin_unread_idx").on(table.readByAdmin, table.createdAt),
  ],
);

export type Inquiry = typeof inquiriesTable.$inferSelect;
export type InsertInquiry = typeof inquiriesTable.$inferInsert;
