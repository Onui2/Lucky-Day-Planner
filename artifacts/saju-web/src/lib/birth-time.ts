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
