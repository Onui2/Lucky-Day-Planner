export type ReportFocus = "career" | "money" | "relationship";

export function parseReportFocus(value: string | null): ReportFocus | undefined {
  return value === "career" || value === "money" || value === "relationship" ? value : undefined;
}

export const REPORT_FOCUS_LABELS: Record<ReportFocus, string> = {
  career: "이직·일", money: "돈·생활", relationship: "연애·관계",
};
