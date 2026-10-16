/** Calendar dates in this module use YYYY-MM-DD, with both period bounds inclusive. */
export function getSeoulDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isDaeunOnDate(period: { startDate: string; endDate: string }, date: string): boolean {
  return period.startDate <= date && date <= period.endDate;
}

export function wholeYearsUntil(from: string, to: string): number {
  const years = Number(to.slice(0, 4)) - Number(from.slice(0, 4));
  return Math.max(0, years - (to.slice(5) < from.slice(5) ? 1 : 0));
}
