function getSiName(h: number): string {
  if (h === 23 || h === 0) return "자시";
  if (h <= 2) return "축시";
  if (h <= 4) return "인시";
  if (h <= 6) return "묘시";
  if (h <= 8) return "진시";
  if (h <= 10) return "사시";
  if (h <= 12) return "오시";
  if (h <= 14) return "미시";
  if (h <= 16) return "신시";
  if (h <= 18) return "유시";
  if (h <= 20) return "술시";
  return "해시";
}

export const BIRTH_HOURS = [
  { value: -1, label: "모름" },
  ...Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${h}시 (${getSiName(h)})`,
  })),
];

export function normalizeBirthHour(h: number): number {
  if (h < 0) return -1;
  if (h === 23) return 0;
  if (h % 2 === 0) return h;
  return h + 1;
}

export function getBirthHourLabel(h: number): string {
  const entry = BIRTH_HOURS.find((x) => x.value === h);
  return entry?.label ?? `${h}시 (${getSiName(h)})`;
}

export function parseBirthMinute(value: string | number | null | undefined): number {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const minute = typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(minute)) {
    return 0;
  }

  return Math.max(0, Math.min(59, minute));
}

export function formatBirthMinute(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const minute = Number(value);
  if (!Number.isFinite(minute)) {
    return "";
  }

  return String(Math.max(0, Math.min(59, minute)));
}
