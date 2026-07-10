export interface CalendarExportEvent {
  title: string;
  description: string;
  location?: string;
  year: number;
  month: number;
  day: number;
  startHour: number;
  startMinute?: number;
  durationMinutes?: number;
  timeZone: string;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function addMinutes(event: CalendarExportEvent, minutes: number) {
  const date = new Date(Date.UTC(
    event.year,
    event.month - 1,
    event.day,
    event.startHour,
    event.startMinute ?? 0,
  ));
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function localStamp(parts: { year: number; month: number; day: number; hour: number; minute: number }) {
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}00`;
}

function utcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function normalizeTimeZone(value: string) {
  if (!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(value)) return "Asia/Seoul";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return value;
  } catch {
    return "Asia/Seoul";
  }
}

function timeZoneOffsetAt(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return representedAsUtc - timestamp;
}

export function zonedEventStart(event: CalendarExportEvent) {
  const timeZone = normalizeTimeZone(event.timeZone);
  const desired = Date.UTC(
    event.year,
    event.month - 1,
    event.day,
    event.startHour,
    event.startMinute ?? 0,
  );
  let timestamp = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    timestamp = desired - timeZoneOffsetAt(timestamp, timeZone);
  }
  return new Date(timestamp);
}

export function parseRecommendedHour(range?: string) {
  const match = range?.match(/^(\d{1,2}):(\d{2})/);
  return match
    ? { hour: Number(match[1]), minute: Number(match[2]) }
    : { hour: 9, minute: 0 };
}

export function buildIcs(event: CalendarExportEvent) {
  const timeZone = normalizeTimeZone(event.timeZone);
  const start = {
    year: event.year,
    month: event.month,
    day: event.day,
    hour: event.startHour,
    minute: event.startMinute ?? 0,
  };
  const end = addMinutes(event, event.durationMinutes ?? 120);
  const uid = `${event.year}${pad(event.month)}${pad(event.day)}-${event.startHour}-${encodeURIComponent(event.title)}@myeonghaewon`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Myeonghaewon//Lucky Day//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${timeZone}:${localStamp(start)}`,
    `DTEND;TZID=${timeZone}:${localStamp(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(`${event.title} 하루 전`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(`${event.title} 한 시간 전`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(event: CalendarExportEvent) {
  const blob = new Blob(["\uFEFF", buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${event.year}-${pad(event.month)}-${pad(event.day)}-${event.title.replace(/[\\/:*?\"<>|]/g, "-")}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(event: CalendarExportEvent) {
  const start = zonedEventStart(event);
  const end = new Date(start.getTime() + (event.durationMinutes ?? 120) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: event.description,
    ctz: normalizeTimeZone(event.timeZone),
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
