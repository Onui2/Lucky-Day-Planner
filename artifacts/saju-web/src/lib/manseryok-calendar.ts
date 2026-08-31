export type CalendarFilter = "all" | "noSon" | "holiday" | "solarTerm";

export interface CalendarFeatureDay {
  noSonDay?: boolean;
  holiday?: string;
  solarTerm?: string;
}

export type CalendarSpecialCounts = Record<CalendarFilter, number>;

export function matchesCalendarFilter(
  dayData: CalendarFeatureDay | null | undefined,
  filter: CalendarFilter,
): boolean {
  if (filter === "all") return true;
  if (!dayData) return false;
  if (filter === "noSon") return Boolean(dayData.noSonDay);
  if (filter === "holiday") return Boolean(dayData.holiday);
  return Boolean(dayData.solarTerm);
}

export function getCalendarSpecialCounts(
  days: CalendarFeatureDay[] | null | undefined,
): CalendarSpecialCounts {
  const monthDays = days ?? [];
  return {
    all: monthDays.length,
    noSon: monthDays.filter((day) => day.noSonDay).length,
    holiday: monthDays.filter((day) => day.holiday).length,
    solarTerm: monthDays.filter((day) => day.solarTerm).length,
  };
}

export function normalizeCalendarFilter(
  filter: CalendarFilter,
  counts: CalendarSpecialCounts,
): CalendarFilter {
  return filter === "all" || counts[filter] > 0 ? filter : "all";
}
