import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Installed by the separately reviewed SQL; deliberately not added to auto bootstrap.
export const campaignVisitsTable = pgTable("campaign_visits", {
  visitId: uuid("visit_id").primaryKey(),
  campaignId: varchar("campaign_id", { length: 40 }).notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  creative: varchar("creative", { length: 30 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  inputAt: timestamp("input_at", { withTimezone: true }),
  freeResultAt: timestamp("free_result_at", { withTimezone: true }),
}, (table) => [index("campaign_visits_cohort_idx").on(table.campaignId, table.createdAt)]);
