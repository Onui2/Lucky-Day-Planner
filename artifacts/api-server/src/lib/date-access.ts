const SEOUL_TIME_ZONE = "Asia/Seoul";

type Ymd = {
  year: number;
  month: number;
  day: number;
};

function getDatePart(
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day",
): number {
  const value = parts.find((part) => part.type === type)?.value;
  return Number(value ?? 0);
}

export function getSeoulToday(): Ymd {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  return {
    year: getDatePart(parts, "year"),
    month: getDatePart(parts, "month"),
    day: getDatePart(parts, "day"),
  };
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isPrivilegedRole(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isFutureDateInSeoul(
  year: number,
  month: number,
  day: number,
): boolean {
  const today = getSeoulToday();

  return (
    Date.UTC(year, month - 1, day) >
    Date.UTC(today.year, today.month - 1, today.day)
  );
}

export function isFutureMonthInSeoul(year: number, month: number): boolean {
  const today = getSeoulToday();

  return year > today.year || (year === today.year && month > today.month);
}

export function isCurrentMonthInSeoul(year: number, month: number): boolean {
  const today = getSeoulToday();

  return year === today.year && month === today.month;
}

export function filterDaysUpToTodayInSeoul<T extends { solar: string }>(
  days: T[],
): T[] {
  const today = getSeoulToday();
  const todayKey = toDateKey(today.year, today.month, today.day);

  return days.filter((day) => day.solar <= todayKey);
}
