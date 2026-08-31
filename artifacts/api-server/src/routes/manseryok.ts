import { Router, type Request } from "express";
import { db, hasDatabaseConfig, type StoredUserProfile, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import {
  getManseryokDay,
  getManseryokMonth,
  getMonthYearGanzi,
} from "../lib/manseryok.js";
import {
  enrichCalendarDay,
  getKasiCalendarMonth,
} from "../lib/kasi-calendar.js";
import {
  personalizeManseryokDay,
  toRelationProfile,
} from "../lib/manseryok-personalization.js";
import {
  isFutureDateInSeoul,
  isFutureMonthInSeoul,
  isPrivilegedRole,
} from "../lib/date-access.js";

const router = Router();
const MIN_MANSEYOK_YEAR = 1900;
const MAX_MANSEYOK_YEAR = 2050;

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

function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (
    year < MIN_MANSEYOK_YEAR
    || year > MAX_MANSEYOK_YEAR
    || month < 1
    || month > 12
    || day < 1
    || day > 31
  ) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

router.get("/manseryok/date", async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "date 파라미터가 필요합니다." });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요." });
    }

    const [year, month, day] = date.split("-").map(Number);

    if (!isValidSolarDate(year, month, day)) {
      return res.status(400).json({
        error: `유효하지 않은 날짜입니다. ${MIN_MANSEYOK_YEAR}-${MAX_MANSEYOK_YEAR}년 범위를 사용하세요.`,
      });
    }

    if (isFutureDateInSeoul(year, month, day) && !isPrivilegedRole(req.user?.role)) {
      return res.status(403).json({ error: "관리자만 미래 날짜를 조회할 수 있습니다." });
    }
    
    const [relationProfile, calendar] = await Promise.all([
      resolveRelationProfile(req),
      getKasiCalendarMonth(year, month),
    ]);
    const dayData = enrichCalendarDay(getManseryokDay(year, month, day), calendar);
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
      yearZodiac,
      calendarDataSource: calendar.source,
      calendarDataMessage: calendar.message,
    });
  } catch (error) {
    console.error("Manseryok date error:", error);
    return res.status(500).json({ error: "만세력 조회 중 오류가 발생했습니다." });
  }
});

router.get("/manseryok/month", async (req, res) => {
  try {
    const yearText = asString(req.query.year);
    const monthText = asString(req.query.month);

    if (!yearText || !monthText) {
      return res.status(400).json({ error: "year와 month 파라미터가 필요합니다." });
    }

    if (!/^\d{4}$/.test(yearText) || !/^\d{1,2}$/.test(monthText)) {
      return res.status(400).json({ error: "유효하지 않은 년월 형식입니다." });
    }

    const year = Number(yearText);
    const month = Number(monthText);

    if (
      year < MIN_MANSEYOK_YEAR
      || year > MAX_MANSEYOK_YEAR
      || month < 1
      || month > 12
    ) {
      return res.status(400).json({
        error: `유효하지 않은 년월입니다. ${MIN_MANSEYOK_YEAR}-${MAX_MANSEYOK_YEAR}년 범위를 사용하세요.`,
      });
    }

    const canAccessFutureDates = isPrivilegedRole(req.user?.role);

    if (isFutureMonthInSeoul(year, month) && !canAccessFutureDates) {
      return res.status(403).json({ error: "관리자만 미래 월의 만세력을 조회할 수 있습니다." });
    }
    
    const [relationProfile, calendar] = await Promise.all([
      resolveRelationProfile(req),
      getKasiCalendarMonth(year, month),
    ]);
    // 일반 회원도 현재(및 과거) 달은 전체 날짜를 조회할 수 있다.
    // 미래 '월'은 위에서 403으로 이미 차단되므로 여기서 날짜를 자르지 않는다.
    const days = getManseryokMonth(year, month).map((rawDayData) => {
      const dayData = enrichCalendarDay(rawDayData, calendar);
      return {
        ...dayData,
        personalized: personalizeManseryokDay(dayData, relationProfile),
      };
    });

    const { yearGanzi, monthGanzi, yearZodiac } = getMonthYearGanzi(year, month);
    
    return res.json({
      year,
      month,
      yearGanzi,
      monthGanzi,
      yearZodiac,
      calendarDataSource: calendar.source,
      calendarDataMessage: calendar.message,
      days
    });
  } catch (error) {
    console.error("Manseryok month error:", error);
    return res.status(500).json({ error: "만세력 월 조회 중 오류가 발생했습니다." });
  }
});

export default router;
