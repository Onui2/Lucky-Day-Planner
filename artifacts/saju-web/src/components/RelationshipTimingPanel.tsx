import { CalendarRange, Scale, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

interface RelationshipYearTiming {
  year: number;
  ganzi: string;
  commonScore: number;
  person1Score: number;
  person2Score: number;
  level: string;
  evidence: string[];
  summary: string;
}

interface RelationshipTiming {
  years: RelationshipYearTiming[];
  bestYears: number[];
  selectedYear: number;
  bestMonths: Array<{
    month: number;
    commonScore: number;
    evidence: string[];
  }>;
  summary: string;
  method: string;
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-500 text-emerald-700";
  if (score >= 60) return "bg-amber-500 text-amber-700";
  return "bg-rose-500 text-rose-700";
}

export default function RelationshipTimingPanel({
  timing,
  person1Name,
  person2Name,
}: {
  timing: RelationshipTiming;
  person1Name: string;
  person2Name: string;
}) {
  const bestYears = new Set(timing.bestYears);

  return (
    <section className="mb-6 border-y border-primary/20 py-6 space-y-5">
      <div className="flex items-start gap-3">
        <CalendarRange className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="text-lg font-serif text-primary">두 사람의 관계 시기</h3>
          <p className="text-sm text-foreground/80 leading-relaxed mt-1">{timing.summary}</p>
        </div>
      </div>

      <div className="space-y-2">
        {timing.years.map((item) => {
          const isBest = bestYears.has(item.year);
          return (
            <details
              key={item.year}
              className={cn(
                "group rounded-lg border bg-foreground/[0.025] px-3 py-3",
                isBest ? "border-primary/40" : "border-foreground/10",
              )}
            >
              <summary className="list-none cursor-pointer grid grid-cols-[68px_minmax(0,1fr)_44px] sm:grid-cols-[80px_minmax(0,1fr)_120px_44px] items-center gap-3">
                <div>
                  <div className="font-semibold text-sm">{item.year}년</div>
                  <div className="text-[11px] text-muted-foreground">{item.ganzi} · {item.level}</div>
                </div>
                <div className="h-2 rounded-full bg-foreground/10 overflow-hidden" aria-label={`공통 흐름 ${item.commonScore}점`}>
                  <div className={cn("h-full rounded-full", scoreTone(item.commonScore).split(" ")[0])} style={{ width: `${item.commonScore}%` }} />
                </div>
                <div className="hidden sm:flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                  <span>{person1Name} {item.person1Score}</span>
                  <span>{person2Name} {item.person2Score}</span>
                </div>
                <div className={cn("text-right font-bold", scoreTone(item.commonScore).split(" ")[1])}>{item.commonScore}</div>
              </summary>
              <div className="pt-3 mt-3 border-t border-foreground/10 text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>{item.summary}</p>
                <div className="sm:hidden flex gap-3">
                  <span>{person1Name} {item.person1Score}점</span>
                  <span>{person2Name} {item.person2Score}점</span>
                </div>
                <ul className="space-y-1">
                  {item.evidence.map((evidence) => <li key={evidence}>· {evidence}</li>)}
                </ul>
              </div>
            </details>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-amber-600" />
          {timing.selectedYear}년 중 함께 움직이기 좋은 달
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {timing.bestMonths.map((item) => (
            <div key={item.month} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{item.month}월</span>
                <span className="text-amber-700 font-bold">{item.commonScore}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.evidence.join(" · ")}</p>
            </div>
          ))}
        </div>
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer inline-flex items-center gap-1.5 text-foreground/65">
          <Scale className="w-3.5 h-3.5" />산출 기준
        </summary>
        <p className="mt-2 leading-relaxed">{timing.method}</p>
      </details>
    </section>
  );
}
