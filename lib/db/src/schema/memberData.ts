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

export interface StoredUserProfile {
  name?: string;
  gender: "male" | "female";
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  calendarType: "solar" | "lunar";
  dayMasterElement?: string;
  dayMasterStem?: string;
  dayMasterBranch?: string;
  yearStem?: string;
  yearBranch?: string;
  monthStem?: string;
  monthBranch?: string;
  hourStem?: string;
  hourBranch?: string;
}

export interface StoredLuckyDayBookmark {
  id: string;
  title: string;
  note?: string;
  year: number;
  month: number;
  day: number;
  purpose: string;
  purposeLabel: string;
  ganzi: string;
  ganziHanja: string;
  grade: string;
  score: number;
  tags: string[];
  href: string;
  createdAt: string;
}

export interface StoredRecentActivityItem {
  id: string;
  kind: "saju" | "day-pillar" | "lucky-day";
  title: string;
  subtitle?: string;
  href: string;
  createdAt: string;
}

export const userProfilesTable = pgTable(
  "user_profiles",
  {
    userId: varchar("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    profile: jsonb("profile").$type<StoredUserProfile>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("user_profiles_updated_idx").on(table.updatedAt)],
);

export const memberBookmarksTable = pgTable(
  "member_bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookmarkId: varchar("bookmark_id", { length: 160 }).notNull(),
    payload: jsonb("payload").$type<StoredLuckyDayBookmark>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("member_bookmarks_user_bookmark_idx").on(
      table.userId,
      table.bookmarkId,
    ),
    index("member_bookmarks_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const recentActivitiesTable = pgTable(
  "recent_activities",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    activityId: varchar("activity_id", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 30 }).notNull(),
    payload: jsonb("payload").$type<StoredRecentActivityItem>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("recent_activities_user_activity_idx").on(
      table.userId,
      table.activityId,
    ),
    index("recent_activities_user_updated_idx").on(table.userId, table.updatedAt),
    index("recent_activities_kind_updated_idx").on(table.kind, table.updatedAt),
  ],
);

export type UserProfileRow = typeof userProfilesTable.$inferSelect;
export type InsertUserProfile = typeof userProfilesTable.$inferInsert;
export type MemberBookmarkRow = typeof memberBookmarksTable.$inferSelect;
export type InsertMemberBookmark = typeof memberBookmarksTable.$inferInsert;
export type RecentActivityRow = typeof recentActivitiesTable.$inferSelect;
export type InsertRecentActivity = typeof recentActivitiesTable.$inferInsert;
