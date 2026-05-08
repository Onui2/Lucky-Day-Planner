import { Router, type Request } from "express";
import { db, hasDatabaseConfig, type StoredUserProfile, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import { getManseryokDay, getManseryokMonth, getMonthYearGanzi } from "../lib/manseryok.js";
import {
  personalizeManseryokDay,
  toRelationProfile,
} from "../lib/manseryok-personalization.js";
import {
  filterDaysUpToTodayInSeoul,
  isCurrentMonthInSeoul,
  isFutureDateInSeoul,
  isFutureMonthInSeoul,
  isPrivilegedRole,
} from "../lib/date-access.js";

const router = Router();

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getProfileFromQuery(query: Record<string, unknown>): StoredUserProfile | null {
  const dayMasterElement = asString(query.dayMasterElement);
  if (!dayMasterElement) {
    return null;
  }

  return {
    gender: query.gender === "female" ? "female" : "male",
    birthYear: 0,
    birthMonth: 0,
    birthDay: 0,
    birthHour: -1,
    calendarType: query.calendarType === "lunar" ? "lunar" : "solar",
    dayMasterElement,
    dayMasterStem: asString(query.dayMasterStem),
    dayMasterBranch: asString(query.dayMasterBranch),
    yearStem: asString(query.yearStem),
    yearBranch: asString(query.yearBranch),
    monthStem: asString(query.monthStem),
    monthBranch: asString(query.monthBranch),
    hourStem: asString(query.hourStem),
    hourBranch: asString(query.hourBranch),
  };
}

async function getStoredProfile(userId: string): Promise<StoredUserProfile | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const [row] = await db
    .select({ profile: userProfilesTable.profile })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  return row?.profile ?? null;
}

async function resolveRelationProfile(req: Request) {
  const queryProfile = getProfileFromQuery(req.query as Record<string, unknown>);
  if (queryProfile) {
    return toRelationProfile(queryProfile);
  }

  if (!req.isAuthenticated() || !req.user?.id) {
    return null;
  }

  try {
    return toRelationProfile(await getStoredProfile(String(req.user.id)));
  } catch (error) {
    console.error("Manseryok profile resolve error:", error);
    return null;
  }
}

router.get("/manseryok/date", async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: "date 파라미터가 필요합니다." });
    }
    
    const parts = date.split('-');
    if (parts.length !== 3) {
      return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요." });
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return res.status(400).json({ error: "유효하지 않은 날짜입니다." });
    }

    if (isFutureDateInSeoul(year, month, day) && !isPrivilegedRole(req.user?.role)) {
      return res.status(403).json({ error: "관리자만 미래 날짜를 조회할 수 있습니다." });
    }
    
    const relationProfile = await resolveRelationProfile(req);
    const dayData = getManseryokDay(year, month, day);
    const { yearGanzi, monthGanzi, yearElement, monthElement, yearZodiac } = getMonthYearGanzi(year, month);
    
    return res.json({
      day: {
        ...dayData,
        personalized: personalizeManseryokDay(dayData, relationProfile),
      },
      yearGanzi,
      monthGanzi,
      yearElement,
      monthElement,
      yearZodiac
    });
  } catch (error) {
    console.error("Manseryok date error:", error);
    return res.status(500).json({ error: "만세력 조회 중 오류가 발생했습니다." });
  }
});

router.get("/manseryok/month", async (req, res) => {
  try {
    const { year: yearStr, month: monthStr } = req.query;
    
    if (!yearStr || !monthStr) {
      return res.status(400).json({ error: "year와 month 파라미터가 필요합니다." });
    }
    
    const year = parseInt(yearStr as string, 10);
    const month = parseInt(monthStr as string, 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "유효하지 않은 년월입니다." });
    }

    const canAccessFutureDates = isPrivilegedRole(req.user?.role);

    if (isFutureMonthInSeoul(year, month) && !canAccessFutureDates) {
      return res.status(403).json({ error: "관리자만 미래 월의 만세력을 조회할 수 있습니다." });
    }
    
    const relationProfile = await resolveRelationProfile(req);
    let days = getManseryokMonth(year, month).map((dayData) => ({
      ...dayData,
      personalized: personalizeManseryokDay(dayData, relationProfile),
    }));
    if (!canAccessFutureDates && isCurrentMonthInSeoul(year, month)) {
      days = filterDaysUpToTodayInSeoul(days);
    }

    const { yearGanzi, monthGanzi, yearZodiac } = getMonthYearGanzi(year, month);
    
    return res.json({
      year,
      month,
      yearGanzi,
      monthGanzi,
      yearZodiac,
      days
    });
  } catch (error) {
    console.error("Manseryok month error:", error);
    return res.status(500).json({ error: "만세력 월 조회 중 오류가 발생했습니다." });
  }
});

export default router;
