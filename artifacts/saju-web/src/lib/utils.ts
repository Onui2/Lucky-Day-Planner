import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getElementStyles(element: string | undefined) {
  if (!element) return "bg-muted/50 text-muted-foreground border-muted";
  
  const el = element.toLowerCase();
  if (el.includes("목") || el.includes("wood")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
  if (el.includes("화") || el.includes("fire")) return "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]";
  if (el.includes("토") || el.includes("earth")) return "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
  if (el.includes("금") || el.includes("metal")) return "bg-slate-300/10 text-slate-200 border-slate-300/30 shadow-[0_0_15px_rgba(203,213,225,0.15)]";
  if (el.includes("수") || el.includes("water")) return "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]";
  
  return "bg-muted/50 text-muted-foreground border-muted";
}

export function getElementKor(element: string | undefined) {
  if (!element) return "-";
  const el = element.toLowerCase();
  if (el.includes("wood")) return "목(木)";
  if (el.includes("fire")) return "화(火)";
  if (el.includes("earth")) return "토(土)";
  if (el.includes("metal")) return "금(金)";
  if (el.includes("water")) return "수(水)";
  return element;
}
