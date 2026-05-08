export type BirthCalendarType = "solar" | "lunar";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function stripLeadingZeros(value: string) {
  return value.replace(/^0+/, "");
}

function toInt(value: string | number) {
  const normalized = typeof value === "number" ? String(value) : value;
  const digits = stripLeadingZeros(digitsOnly(normalized));
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeBoundedValue(rawValue: string, maxDigits: number, maxValue: number) {
  const digits = stripLeadingZeros(digitsOnly(rawValue)).slice(0, maxDigits);
  if (!digits) return "";
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(parsed, maxValue));
}

export function sanitizeBirthYearInput(rawValue: string) {
  return digitsOnly(rawValue).slice(0, 4);
}

export function sanitizeBirthMonthInput(rawValue: string) {
  return sanitizeBoundedValue(rawValue, 2, 12);
}

export function getBirthDayMax(
  yearValue: string | number,
  monthValue: string | number,
  calendarType: BirthCalendarType = "solar",
) {
  const month = toInt(monthValue);
  if (!month || month < 1 || month > 12) {
    return calendarType === "lunar" ? 30 : 31;
  }

  if (calendarType === "lunar") {
    return 30;
  }

  const year = toInt(yearValue) ?? 2024;
  return new Date(year, month, 0).getDate();
}

export function sanitizeBirthDayInput(
  rawValue: string,
  yearValue: string | number,
  monthValue: string | number,
  calendarType: BirthCalendarType = "solar",
) {
  return sanitizeBoundedValue(rawValue, 2, getBirthDayMax(yearValue, monthValue, calendarType));
}

export function clampBirthDayValue(
  rawValue: string,
  yearValue: string | number,
  monthValue: string | number,
  calendarType: BirthCalendarType = "solar",
) {
  const parsed = toInt(rawValue);
  if (!parsed) return "";
  return String(clamp(parsed, 1, getBirthDayMax(yearValue, monthValue, calendarType)));
}

export function getBirthDateError(params: {
  birthYear: string | number;
  birthMonth: string | number;
  birthDay: string | number;
  calendarType?: BirthCalendarType;
  yearMin?: number;
  yearMax?: number;
}) {
  const {
    birthYear,
    birthMonth,
    birthDay,
    calendarType = "solar",
    yearMin = 1900,
    yearMax = 2100,
  } = params;

  const year = toInt(birthYear);
  const month = toInt(birthMonth);
  const day = toInt(birthDay);

  if (!year || year < yearMin || year > yearMax) {
    return `년도를 올바르게 입력해주세요. (${yearMin}~${yearMax})`;
  }

  if (!month || month < 1 || month > 12) {
    return "월을 올바르게 입력해주세요. (1~12)";
  }

  const maxDay = getBirthDayMax(year, month, calendarType);
  if (!day || day < 1 || day > maxDay) {
    return calendarType === "lunar"
      ? `일을 올바르게 입력해주세요. (음력은 1~${maxDay})`
      : `일을 올바르게 입력해주세요. (${month}월은 1~${maxDay})`;
  }

  return null;
}
