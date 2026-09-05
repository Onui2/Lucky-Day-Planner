import { integer, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";

export const rateLimitBucketsTable = pgTable(
  "rate_limit_buckets",
  {
    bucketName: varchar("bucket_name", { length: 60 }).notNull(),
    key: varchar("key", { length: 200 }).notNull(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.bucketName, table.key] })],
);
