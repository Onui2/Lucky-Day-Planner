/** Older saved readings can lack exact dates; never guess their current period from age. */
export function isDaeunOnDate(
  period: { startDate?: string; endDate?: string },
  date: string,
): boolean {
  return !!period.startDate && !!period.endDate && period.startDate <= date && date <= period.endDate;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
