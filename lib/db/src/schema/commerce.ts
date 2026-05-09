import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { usersTable } from "./auth";

export interface ReportBirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender: "male" | "female";
  calendarType: "solar" | "lunar";
}

export type JsonObject = Record<string, unknown>;

export const analysisSnapshotsTable = pgTable(
  "analysis_snapshots",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull().default("saju"),
    title: varchar("title", { length: 120 }).notNull().default("사주 분석"),
    birthInfo: jsonb("birth_info").$type<ReportBirthInfo>().notNull(),
    sajuResult: jsonb("saju_result").$type<JsonObject>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("analysis_snapshots_user_created_idx").on(table.userId, table.createdAt),
    index("analysis_snapshots_kind_created_idx").on(table.kind, table.createdAt),
  ],
);

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderId: varchar("order_id", { length: 80 }).notNull(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productType: varchar("product_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    currency: varchar("currency", { length: 10 }).notNull().default("KRW"),
    amount: integer("amount").notNull(),
    snapshotId: integer("snapshot_id").references(() => analysisSnapshotsTable.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<JsonObject>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("orders_order_id_uidx").on(table.orderId),
    index("orders_user_created_idx").on(table.userId, table.createdAt),
    index("orders_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull().default("toss"),
    paymentKey: varchar("payment_key", { length: 200 }),
    method: varchar("method", { length: 40 }),
    status: varchar("status", { length: 20 }).notNull().default("ready"),
    amount: integer("amount").notNull(),
    rawResponse: jsonb("raw_response").$type<JsonObject>(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("payments_order_id_uidx").on(table.orderId),
    uniqueIndex("payments_payment_key_uidx").on(table.paymentKey),
    index("payments_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const purchaseEntitlementsTable = pgTable(
  "purchase_entitlements",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    productType: varchar("product_type", { length: 40 }).notNull(),
    resourceType: varchar("resource_type", { length: 40 }).notNull(),
    resourceId: integer("resource_id"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("purchase_entitlements_order_product_uidx").on(
      table.orderId,
      table.productType,
    ),
    index("purchase_entitlements_user_status_idx").on(table.userId, table.status),
  ],
);

export const pdfReportsTable = pgTable(
  "pdf_reports",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => analysisSnapshotsTable.id, { onDelete: "cascade" }),
    productType: varchar("product_type", { length: 40 }).notNull().default("saju_pdf"),
    title: varchar("title", { length: 160 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    format: varchar("format", { length: 20 }).notNull().default("pdf"),
    previewText: text("preview_text"),
    htmlContent: text("html_content"),
    fileName: varchar("file_name", { length: 200 }),
    mimeType: varchar("mime_type", { length: 120 }).notNull().default("application/pdf"),
    fileDataBase64: text("file_data_base64"),
    failedReason: text("failed_reason"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("pdf_reports_order_uidx").on(table.orderId),
    index("pdf_reports_user_status_idx").on(table.userId, table.status),
    index("pdf_reports_snapshot_idx").on(table.snapshotId),
  ],
);

export const userSubscriptionsTable = pgTable(
  "user_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    planCode: varchar("plan_code", { length: 30 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    metadata: jsonb("metadata").$type<JsonObject>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("user_subscriptions_user_status_idx").on(table.userId, table.status),
    index("user_subscriptions_period_end_idx").on(table.currentPeriodEnd),
  ],
);

export const aiQuestionsTable = pgTable(
  "ai_questions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subscriptionPlanCode: varchar("subscription_plan_code", { length: 30 }),
    monthlyBucket: varchar("monthly_bucket", { length: 7 }).notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    birthInfo: jsonb("birth_info").$type<ReportBirthInfo>(),
    sajuResult: jsonb("saju_result").$type<JsonObject>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_questions_user_bucket_idx").on(table.userId, table.monthlyBucket),
    index("ai_questions_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export type AnalysisSnapshot = typeof analysisSnapshotsTable.$inferSelect;
export type InsertAnalysisSnapshot = typeof analysisSnapshotsTable.$inferInsert;
export type OrderRow = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
export type PaymentRow = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
export type PurchaseEntitlementRow = typeof purchaseEntitlementsTable.$inferSelect;
export type InsertPurchaseEntitlement = typeof purchaseEntitlementsTable.$inferInsert;
export type PdfReportRow = typeof pdfReportsTable.$inferSelect;
export type InsertPdfReport = typeof pdfReportsTable.$inferInsert;
export type UserSubscriptionRow = typeof userSubscriptionsTable.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptionsTable.$inferInsert;
export type AiQuestionRow = typeof aiQuestionsTable.$inferSelect;
export type InsertAiQuestion = typeof aiQuestionsTable.$inferInsert;
