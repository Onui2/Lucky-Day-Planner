import { useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
  Layers3,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Route,
  Scale,
  Users,
  X,
} from "lucide-react";

import { customFetch } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ELEMENT_TONE: Record<string, string> = {
  목: "text-emerald-700 bg-emerald-500/8 border-emerald-500/25",
  화: "text-rose-700 bg-rose-500/8 border-rose-500/25",
  토: "text-amber-700 bg-amber-500/8 border-amber-500/25",
  금: "text-zinc-700 bg-zinc-500/8 border-zinc-500/25",
  수: "text-blue-700 bg-blue-500/8 border-blue-500/25",
};

const EVENT_TYPES = [
  ["career", "취업·승진·이직"],
  ["move", "이사·이동"],
  ["relationship", "연애·결혼·이별"],
  ["study", "입학·시험·자격"],
  ["family", "가족 변화"],
  ["health", "건강 변화"],
] as const;

function Confidence({ value }: { value?: string }) {
  const label = value === "high" ? "신뢰도 높음" : value === "medium" ? "신뢰도 중간" : "참고";
  return (
    <span className={cn(
      "text-[11px] rounded-full border px-2 py-0.5",
      value === "high" ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700"
        : value === "medium" ? "border-amber-500/25 bg-amber-500/8 text-amber-700"
          : "border-foreground/10 bg-foreground/5 text-muted-foreground",
    )}>
      {label}
    </span>
  );
}

function Evidence({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="text-[11px] leading-relaxed rounded-md border border-foreground/10 bg-background/45 px-2 py-1 text-muted-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

function Method({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-t border-foreground/8 pt-2">산식: {children}</p>;
}

function InterpretationNote({ school, alternative }: { school?: string; alternative?: string }) {
  if (!school && !alternative) return null;
  return (
    <div className="mt-3 rounded-md border border-foreground/10 bg-foreground/[0.025] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {school && <p><span className="font-medium text-foreground/70">적용 관점</span> · {school}</p>}
      {alternative && <p className={school ? "mt-1" : undefined}><span className="font-medium text-foreground/70">다른 해석 가능성</span> · {alternative}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, meta }: { icon: React.ElementType; title: string; meta?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
        <Icon className="w-4.5 h-4.5 text-primary" />
        {title}
      </h3>
      {meta}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/8">
      <div
        className={cn("h-full rounded-full", score >= 65 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-rose-500")}
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  );
}

function pillarName(pillar: any) {
  if (!pillar || pillar.heavenlyStem === "?") return "미상";
  return `${pillar.heavenlyStem}${pillar.earthlyBranch}`;
}

function PillarComparison({ comparison }: { comparison: any }) {
  if (!comparison) return null;
  const rows = [
    ["year", "년주"],
    ["month", "월주"],
    ["day", "일주"],
    ["hour", "시주"],
  ] as const;

  return (
    <div className="mt-4 rounded-md border border-primary/15 bg-primary/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">보정 전후 팔자 비교</p>
        <span className="text-[11px] text-primary">{comparison.changedPillars?.length ? `${comparison.changedPillars.length}개 변경` : "변경 없음"}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-foreground/75">{comparison.summary}</p>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {rows.map(([key, label]) => {
          const changed = comparison.changedPillars?.some((item: any) => item.key === key);
          return (
            <div key={key} className={cn("rounded-md border px-2.5 py-2", changed ? "border-primary/30 bg-background/70" : "border-foreground/10 bg-background/40")}>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold">{label}</p>
                {changed && <span className="text-[10px] text-primary">변경</span>}
              </div>
              <div className="mt-2 space-y-1 text-[11px]">
                <p className="flex items-center justify-between gap-2"><span className="text-muted-foreground">전</span><span className="font-serif font-semibold">{pillarName(comparison.before?.[key])}</span></p>
                <p className="flex items-center justify-between gap-2"><span className="text-muted-foreground">후</span><span className={cn("font-serif font-semibold", changed && "text-primary")}>{pillarName(comparison.after?.[key])}</span></p>
              </div>
            </div>
          );
        })}
      </div>
      <Evidence items={comparison.notes} />
    </div>
  );
}

function familyScorePercent(score: number) {
  return Math.max(8, Math.min(100, Math.round((Number(score) || 0) * 20)));
}

function familyTone(level?: string) {
  if (level === "강함") return "border-emerald-500/25 bg-emerald-500/[0.06]";
  if (level === "약함") return "border-amber-500/25 bg-amber-500/[0.06]";
  return "border-blue-500/20 bg-blue-500/[0.045]";
}

function CalculationBasisSection({ basis }: { basis: any }) {
  if (!basis) return null;
  const original = basis.original ?? {};
  const adjusted = basis.adjusted ?? {};
  const originalLabel = `${original.year}.${original.month}.${original.day}${original.hour >= 0 ? ` ${String(original.hour).padStart(2, "0")}:${String(original.minute ?? 0).padStart(2, "0")}` : " 시간 미상"}`;
  const adjustedLabel = `${adjusted.year}.${adjusted.month}.${adjusted.day}${adjusted.hour >= 0 ? ` ${String(adjusted.hour).padStart(2, "0")}:${String(adjusted.minute ?? 0).padStart(2, "0")}` : " 시간 미상"}`;
  return (
    <section className="border-y border-primary/15 py-5">
      <SectionTitle icon={MapPin} title="계산 기준" meta={<Confidence value={basis.confidence} />} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border-l-2 border-primary/30 pl-3">
          <p className="text-xs text-muted-foreground">입력</p>
          <p className="text-sm font-medium mt-1">{originalLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">{original.calendarType === "lunar" ? `음력${original.isLeapMonth ? " 윤달" : ""}` : "양력"}</p>
        </div>
        <div className="border-l-2 border-blue-500/30 pl-3">
          <p className="text-xs text-muted-foreground">적용 시각</p>
          <p className="text-sm font-medium mt-1">{adjustedLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">총 보정 {basis.totalCorrectionMinutes > 0 ? "+" : ""}{basis.totalCorrectionMinutes}분</p>
        </div>
        <div className="border-l-2 border-amber-500/30 pl-3">
          <p className="text-xs text-muted-foreground">지역·경계</p>
          <p className="text-sm font-medium mt-1">{basis.birthPlace} · {basis.timeZone}</p>
          <p className="text-xs text-muted-foreground mt-1">{basis.dayBoundary === "late-zi" ? "야자시 23:00 기준" : "자정 00:00 기준"}</p>
        </div>
      </div>
      {basis.appliedTrueSolarTime && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-foreground/5 px-2 py-2"><p className="text-[11px] text-muted-foreground">지역 보정</p><p className="text-sm font-semibold">{basis.longitudeCorrectionMinutes}분</p></div>
          <div className="rounded-md bg-foreground/5 px-2 py-2"><p className="text-[11px] text-muted-foreground">균시차</p><p className="text-sm font-semibold">{basis.equationOfTimeMinutes}분</p></div>
          <div className="rounded-md bg-foreground/5 px-2 py-2"><p className="text-[11px] text-muted-foreground">DST</p><p className="text-sm font-semibold">{basis.dstMinutes}분</p></div>
        </div>
      )}
      <PillarComparison comparison={basis.pillarComparison} />
      {basis.warnings?.length > 0 && <Evidence items={basis.warnings} />}
      <InterpretationNote
        school="절기 기준 사주 계산에 IANA 시간대, 역사적 DST, 경도·균시차 진태양시, 야자시 기준을 순서대로 적용"
        alternative="출생지가 대략값이거나 출생시각이 경계 근처면 시주·일주가 바뀔 수 있어 보정 전후 비교를 함께 확인합니다."
      />
      <Method>{basis.method}</Method>
    </section>
  );
}

function HiddenStemSection({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  const dayMaster = analysis.dayMaster ?? {};
  return (
    <section className="border-b border-primary/15 py-5">
      <SectionTitle
        icon={Network}
        title="지장간 · 통근 · 투출"
        meta={<div className="flex items-center gap-2"><span className="text-sm font-semibold">{dayMaster.type} {dayMaster.strengthPercent}%</span><Confidence value={analysis.confidence} /></div>}
      />
      <p className="text-base leading-relaxed text-foreground/85">{dayMaster.summary}</p>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          ["득령", dayMaster.deukryeong],
          ["득지", dayMaster.deukji],
          ["득세", dayMaster.deukse],
        ].map(([label, active]) => (
          <div key={String(label)} className={cn("rounded-md border px-2 py-2 text-center text-xs", active ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700" : "border-foreground/10 bg-foreground/4 text-muted-foreground")}>
            {active ? <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-1" /> : <Scale className="w-3.5 h-3.5 mx-auto mb-1" />}
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        {analysis.visibleStems?.map((item: any) => (
          <div key={`${item.pillar}-${item.stem}`} className="rounded-md border border-foreground/10 bg-foreground/[0.025] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={cn("w-8 h-8 flex items-center justify-center rounded-md border font-serif font-bold", ELEMENT_TONE[item.element])}>{item.stem}</span>
                <div><p className="text-sm font-medium">{item.pillar} · {item.tenGod}</p><p className="text-[11px] text-muted-foreground">통근 {item.rootScore} · {item.level}</p></div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/75 mt-2">{item.summary}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
        {analysis.pillars?.map((pillar: any) => (
          <div key={pillar.pillar} className="rounded-md border border-foreground/10 p-3">
            <p className="text-xs font-semibold mb-2">{pillar.pillar} {pillar.stem}{pillar.branch}</p>
            <div className="space-y-1.5">
              {pillar.hiddenStems?.map((hidden: any) => (
                <div key={`${hidden.stem}-${hidden.qi}`} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-foreground/75">{hidden.qi} {hidden.stem} · {hidden.tenGod}</span>
                  <span className={hidden.penetrated ? "text-primary font-medium" : "text-muted-foreground"}>{hidden.penetrated ? "투출" : hidden.weight}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <InterpretationNote
        school="월지·일지·시지·년지 가중치와 지장간 정기/중기/여기, 통근·투출 동시 반영"
        alternative="학파에 따라 월령 가중치를 더 크게 보거나 투출을 더 엄격히 잡으면 신강약 경계값이 달라질 수 있습니다."
      />
      <Method>{analysis.method}</Method>
    </section>
  );
}

function UsefulGodSection({ analysis, transformations }: { analysis: any; transformations: any }) {
  if (!analysis) return null;
  return (
    <section className="border-b border-primary/15 py-5">
      <SectionTitle
        icon={GitCompareArrows}
        title="용신 교차 판정 · 합화"
        meta={<div className="flex items-center gap-2"><span className={cn("rounded-md border px-2 py-1 text-sm font-semibold", ELEMENT_TONE[analysis.primary])}>{analysis.primary} 1순위</span><Confidence value={analysis.confidence} /></div>}
      />
      <p className="text-base leading-relaxed text-foreground/85">{analysis.summary}</p>
      <div className="mt-3 rounded-md border border-foreground/10 bg-foreground/[0.025] p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">판정 일치도</span>
          <span className="font-semibold text-foreground">{analysis.agreementScore}%</span>
        </div>
        <div className="mt-2"><ScoreBar score={analysis.agreementScore ?? 0} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        {analysis.methods?.map((method: any) => (
          <div key={method.key} className="rounded-md border border-foreground/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{method.name}</p>
              <Confidence value={method.confidence} />
            </div>
            <div className="flex gap-1.5 mt-2">
              {method.usefulElements?.map((element: string) => <span key={element} className={cn("text-xs rounded-md border px-2 py-0.5", ELEMENT_TONE[element])}>{element}</span>)}
            </div>
            <p className="text-sm leading-relaxed text-foreground/75 mt-2">{method.summary}</p>
            <Evidence items={method.evidence?.slice(0, 2)} />
            <InterpretationNote school={method.school} alternative={method.alternativeInterpretation} />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{analysis.specialPattern?.type}</p><span className="text-xs text-amber-700">{analysis.specialPattern?.status}</span></div>
        <p className="text-sm leading-relaxed text-foreground/80 mt-1">{analysis.specialPattern?.summary}</p>
        {analysis.specialPattern?.conditions?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {analysis.specialPattern.conditions.map((condition: any) => (
              <div key={condition.label} className={cn("rounded-md border px-2.5 py-2 text-xs", condition.passed ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-800" : "border-foreground/10 bg-background/50 text-muted-foreground")}>
                <div className="flex items-center gap-1.5">
                  {condition.passed ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Scale className="w-3.5 h-3.5 shrink-0" />}
                  <span className="font-medium">{condition.label}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">{condition.detail}</p>
              </div>
            ))}
          </div>
        )}
        <Evidence items={analysis.specialPattern?.evidence} />
        <Evidence items={analysis.specialPattern?.breakers} />
        <InterpretationNote alternative={analysis.specialPattern?.alternativeInterpretation} />
      </div>
      <div className="mt-4 space-y-2">
        {transformations?.items?.length > 0 ? transformations.items.map((item: any) => (
          <div key={`${item.pair}-${item.pillars?.join("-")}`} className="rounded-md border border-foreground/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{item.pair} · {item.pillars?.join("·")}</p>
              <span className="text-xs text-primary">{item.status}</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/75 mt-1">{item.summary}</p>
            <Evidence items={item.evidence} />
          </div>
        )) : <p className="text-sm text-muted-foreground rounded-md border border-foreground/10 px-3 py-2">{transformations?.summary}</p>}
      </div>
      <InterpretationNote
        school="용신 다중 판정과 월령·통근·방해 오행·충 관계를 함께 보는 합화 성립 조건"
        alternative="합은 있어도 월령을 얻지 못하거나 방해 오행·충이 강하면 합화가 아닌 관계 신호로만 해석합니다."
      />
      <Method>{analysis.method}</Method>
    </section>
  );
}

function FamilySection({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  return (
    <section className="border-b border-primary/15 py-5">
      <SectionTitle icon={Users} title="육친 · 궁성" />
      <div className="rounded-md border border-primary/15 bg-primary/[0.03] p-3">
        <p className="text-base text-foreground/85 leading-relaxed">{analysis.summary}</p>
        <p className="mt-1 text-sm text-muted-foreground">관계별 십신 점수, 어느 궁성에서 나온 판단인지, 합충해 작용을 분리해서 표시합니다.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-4">
        {analysis.roles?.map((role: any) => (
          <div key={role.key} className={cn("rounded-md border p-3", familyTone(role.level))}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{role.name}</p>
                <p className="text-xs leading-relaxed text-muted-foreground mt-0.5">{role.domain}</p>
              </div>
              <div className="flex items-center gap-2">
                <Confidence value={role.confidence} />
                <span className="rounded-md border border-foreground/10 bg-background/55 px-2 py-1 text-xs font-semibold">{role.level}</span>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-foreground/10 bg-background/45 p-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">관계 작용 강도</span>
                <span className="font-semibold">{role.score}점</span>
              </div>
              <div className="mt-2"><ScoreBar score={familyScorePercent(role.score)} /></div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">궁성 출처</p>
                  <p className="font-medium text-foreground/80">{role.palaces?.join(" · ") || "없음"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">십신 출처</p>
                  <p className="font-medium text-foreground/80">{role.relatedGods?.join(" · ") || "없음"}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-md border border-foreground/10 bg-background/35 p-2.5">
                <p className="text-xs font-semibold text-foreground/70">해석</p>
                <p className="text-sm leading-relaxed text-foreground/80 mt-1">{role.summary}</p>
              </div>
              <div className="rounded-md border border-primary/15 bg-primary/[0.04] p-2.5">
                <p className="text-xs font-semibold text-primary/85">맞춤 행동</p>
                <p className="text-sm leading-relaxed text-foreground/80 mt-1">{role.advice}</p>
              </div>
            </div>
            {role.interactions?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {role.interactions.map((item: string) => (
                  <span key={item} className="rounded-md border border-rose-500/20 bg-rose-500/5 px-2 py-1 text-[11px] text-rose-700">{item}</span>
                ))}
              </div>
            )}
            <Evidence items={role.evidence?.slice(0, 4)} />
          </div>
        ))}
      </div>
      <InterpretationNote
        school="궁성 위치와 십신을 함께 보아 부모·형제·배우자·자녀·직장 관계를 분리"
        alternative="실제 관계 사건은 대운·세운의 작용과 생활 환경에 따라 다르므로, 강점·갈등·행동 조언을 분리해서 봅니다."
      />
      <Method>{analysis.method}</Method>
    </section>
  );
}

function TimingSection({ transition, timeline }: { transition: any; timeline: any }) {
  if (!transition && !timeline) return null;
  const active = transition?.active;
  return (
    <section className="border-b border-primary/15 py-5">
      <SectionTitle icon={Layers3} title="교운기 · 대세월일시 중첩" meta={<Confidence value={timeline?.confidence} />} />
      {active ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{active.phase} · {active.to} 대운</p><span className="text-xs text-primary">{active.windowStart} ~ {active.windowEnd}</span></div>
          <p className="text-sm leading-relaxed text-foreground/80 mt-1">{active.summary}</p>
          <p className="text-sm text-primary/80 mt-2">{active.advice}</p>
        </div>
      ) : <p className="text-sm text-muted-foreground">{transition?.summary}</p>}

      {timeline && (
        <>
          <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
            {timeline.layers?.daeun && <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1">대운 {timeline.layers.daeun.label} · {timeline.layers.daeun.score}</span>}
            <span className="rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1">세운 {timeline.layers?.seun?.label} · {timeline.layers?.seun?.score}</span>
          </div>
          <p className="text-base leading-relaxed text-foreground/85 mt-3">{timeline.summary}</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 mt-4">
            {timeline.months?.map((month: any) => (
              <div key={month.month} className={cn("rounded-md border p-2 min-w-0", timeline.bestMonths?.includes(month.month) ? "border-emerald-500/30 bg-emerald-500/5" : timeline.cautionMonths?.includes(month.month) ? "border-rose-500/25 bg-rose-500/5" : "border-foreground/10") }>
                <div className="flex items-center justify-between gap-1"><span className="text-xs font-semibold">{month.month}월</span><span className="text-[10px] text-muted-foreground">{month.score}</span></div>
                <ScoreBar score={month.score} />
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{month.stem}{month.branch}·{month.tenGod}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2">{timeline.targetMonth}월 상위 일진·시각</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {timeline.selectedMonth?.topDays?.map((day: any) => (
                <div key={day.date} className="rounded-md border border-foreground/10 p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{day.date} · {day.stem}{day.branch}</p><span className="text-sm font-bold text-primary">{day.score}</span></div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {day.bestHours?.map((hour: any) => <span key={hour.range} className="text-[11px] rounded-md border border-primary/15 bg-primary/5 px-2 py-1">{hour.range} {hour.branch}시 · {hour.score}</span>)}
                  </div>
                  <Evidence items={day.evidence?.slice(0, 3)} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <InterpretationNote
        school="대운 방향, 세운 주제, 월운 실행 시기, 일진·시각 후보를 단계별로 중첩"
        alternative="계약·연애·이동처럼 목적이 다르면 월·일·시의 가중치가 달라져 최상위 날짜가 바뀔 수 있습니다."
      />
      <Method>{timeline?.method ?? transition?.method}</Method>
    </section>
  );
}

function BirthTimeCandidatesSection({ result }: { result: any }) {
  const initial = result.birthTimeCandidateAnalysis;
  const [analysis, setAnalysis] = useState<any>(initial);
  const [eventYear, setEventYear] = useState(String(new Date().getFullYear()));
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number][0]>("career");
  const [events, setEvents] = useState<Array<{ year: number; type: (typeof EVENT_TYPES)[number][0] }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const birthInfo = result.birthInfo ?? {};

  const rankedCandidates = useMemo(() => [...(analysis?.candidates ?? [])].sort((left: any, right: any) => {
    if (left.rank == null && right.rank == null) return left.representativeHour - right.representativeHour;
    return (left.rank ?? 99) - (right.rank ?? 99);
  }), [analysis]);

  if (!initial) return null;

  const addEvent = () => {
    const year = Number(eventYear);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
      setError("사건 연도는 1900년부터 올해 사이로 입력해주세요.");
      return;
    }
    if (events.length >= 5) {
      setError("과거 사건은 최대 5개까지 비교할 수 있습니다.");
      return;
    }
    if (events.some((item) => item.year === year && item.type === eventType)) {
      setError("같은 사건이 이미 추가되어 있습니다.");
      return;
    }
    setEvents((current) => [...current, { year, type: eventType }]);
    setError(null);
  };

  const refine = async () => {
    if (events.length === 0) {
      setError("먼저 기억나는 과거 사건을 하나 이상 추가해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await customFetch<any>("/api/saju/birth-time-candidates", {
        method: "POST",
        body: JSON.stringify({
          birthYear: birthInfo.year,
          birthMonth: birthInfo.month,
          birthDay: birthInfo.day,
          birthMinute: birthInfo.minute ?? 0,
          gender: birthInfo.gender,
          calendarType: birthInfo.calendarType,
          isLeapMonth: birthInfo.isLeapMonth,
          birthPlace: birthInfo.birthPlace,
          timeZone: birthInfo.timeZone,
          longitude: birthInfo.longitude,
          latitude: birthInfo.latitude,
          applyTrueSolarTime: birthInfo.applyTrueSolarTime,
          dayBoundary: birthInfo.dayBoundary,
          events,
        }),
      });
      setAnalysis(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "후보 분석 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-5">
      <SectionTitle icon={Clock3} title="출생시간 미상 · 12시주 비교" />
      <p className="text-base leading-relaxed text-foreground/80">{analysis?.summary}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-xs font-semibold text-emerald-700">시간과 무관하게 유지</p><Evidence items={analysis?.stableFacts} /></div>
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-xs font-semibold text-amber-700">시간에 따라 변동</p><Evidence items={analysis?.variableFacts} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)_auto] gap-2 mt-4">
        <Input type="number" min={1900} max={2100} value={eventYear} onChange={(event) => setEventYear(event.target.value)} aria-label="사건 연도" />
        <Select value={eventType} onValueChange={(value) => setEventType(value as typeof eventType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{EVENT_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={addEvent} disabled={events.length >= 5} className="gap-2">
          <Plus className="w-4 h-4" />사건 추가
        </Button>
      </div>
      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {events.map((item) => (
            <span key={`${item.year}-${item.type}`} className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs">
              {item.year}년 · {EVENT_TYPES.find(([value]) => value === item.type)?.[1]}
              <button type="button" onClick={() => setEvents((current) => current.filter((event) => event !== item))} aria-label={`${item.year}년 사건 삭제`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <Button type="button" size="sm" onClick={() => void refine()} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}후보 좁히기
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
        {rankedCandidates.map((candidate: any) => (
          <div key={`${candidate.branch}-${candidate.representativeHour}`} className={cn("rounded-md border p-3", candidate.rank != null && candidate.rank <= 3 ? "border-primary/30 bg-primary/5" : "border-foreground/10") }>
            <div className="flex items-center justify-between gap-2"><p className="font-serif font-semibold">{candidate.hourPillar} · {candidate.branch}시</p>{candidate.rank && <span className="text-xs text-primary">{candidate.rank}순위</span>}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{candidate.representativeHour}시 · {candidate.tenGod} · {candidate.strengthType}</p>
            {candidate.eventScore != null && <div className="mt-2"><div className="flex justify-between text-[11px] mb-1"><span>사건 적합도</span><span>{candidate.eventScore}</span></div><ScoreBar score={candidate.eventScore} /></div>}
            <Evidence items={candidate.eventEvidence?.slice(0, 1)} />
          </div>
        ))}
      </div>
      <InterpretationNote
        school="12개 시주 후보를 다시 계산하고, 시간과 무관한 해석과 시간에 따라 변하는 해석을 분리"
        alternative="과거 사건 입력이 적으면 후보 압축은 참고값입니다. 가족 기록·출생증명·큰 사건 연도를 함께 대조해야 정확도가 올라갑니다."
      />
      <Method>{analysis?.method}</Method>
    </section>
  );
}

export default function AdvancedSajuAnalysis({ result }: { result: any }) {
  return (
    <div className="mt-8 border border-primary/20 rounded-lg px-4 sm:px-5 bg-background/25">
      <div className="py-5 border-b border-primary/15">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-2xl font-semibold">정밀 명리 분석</h2>
        </div>
      </div>
      <CalculationBasisSection basis={result.calculationBasis} />
      <HiddenStemSection analysis={result.hiddenStemAnalysis} />
      <UsefulGodSection analysis={result.multiYongsinAnalysis} transformations={result.stemTransformationAnalysis} />
      <FamilySection analysis={result.familyRoleAnalysis} />
      <TimingSection transition={result.daeunTransitionAnalysis} timeline={result.integratedLuckTimeline} />
      <BirthTimeCandidatesSection result={result} />
    </div>
  );
}
