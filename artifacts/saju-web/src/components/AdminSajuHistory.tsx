import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import {
  calculateSajuHistory,
  type SajuBirthInfo,
  type SajuHistoryResult,
  type SajuHistoryYear,
  type SajuRequest,
} from "@workspace/api-client-react";
import { ChevronDown, History, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function yearTone(year: SajuHistoryYear) {
  if (year.isCurrent) return "border-primary/30 bg-primary/5 text-primary";
  if (year.score < 45) return "border-rose-500/25 bg-rose-500/5 text-rose-700";
  if (year.score >= 60) return "border-emerald-500/25 bg-emerald-500/5 text-emerald-700";
  return "border-foreground/15 bg-background/40 text-foreground/75";
}

function HistoryReading({ data }: { data: SajuHistoryResult }) {
  const [periodStart, setPeriodStart] = useState(data.birthYear);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const yearElements = useRef(new Map<number, HTMLDivElement>());
  const period = data.periods.find((item) => item.startYear === periodStart) ?? data.periods[0];
  const visibleYears = data.years.filter((item) => item.year >= period.startYear && item.year <= period.endYear);

  const openYear = (year: number) => {
    const nextPeriod = data.periods.find((item) => year >= item.startYear && year <= item.endYear);
    if (nextPeriod) setPeriodStart(nextPeriod.startYear);
    setExpandedYear(year);
  };

  useEffect(() => {
    if (expandedYear !== null) {
      yearElements.current.get(expandedYear)?.scrollIntoView({ block: "nearest" });
    }
  }, [expandedYear, periodStart]);

  const highlights = [
    { title: "부담이 컸을 수 있는 해", years: data.difficultYears, empty: "뚜렷한 부담 구간 없음", tone: "border-rose-500/20 bg-rose-500/5" },
    { title: "도움·기회가 있었을 수 있는 해", years: data.favorableYears, empty: "뚜렷한 상승 구간 없음", tone: "border-emerald-500/20 bg-emerald-500/5" },
    { title: "최근 과거 대운 전환기", years: data.transitionYears.slice(-3), empty: "지난 대운 전환기 없음", tone: "border-primary/20 bg-primary/5" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-foreground/80 break-keep">{data.summary}</p>
      {!data.birthTimeKnown && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
          출생시간 미입력: 시주를 제외한 세 기둥 기준입니다. 세부 시기 해석은 달라질 수 있습니다.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {highlights.map((highlight) => (
          <div key={highlight.title} className={cn("rounded-xl border p-3", highlight.tone)}>
            <h3 className="text-xs font-semibold text-foreground/80">{highlight.title}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {highlight.years.length ? highlight.years.map((year) => (
                <button key={year} type="button" onClick={() => openYear(year)}
                  aria-label={`${year}년 과거 해석 보기`}
                  className="min-h-10 rounded-lg border border-foreground/10 bg-background/70 px-2.5 text-sm font-semibold hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {year}년
                </button>
              )) : <p className="py-2 text-xs text-muted-foreground">{highlight.empty}</p>}
            </div>
          </div>
        ))}
      </div>

      {data.years.length > 1 && (
        <div className="rounded-xl border border-primary/15 bg-background/30 px-2 pt-4 pb-2">
          <p className="px-2 text-xs text-muted-foreground">출생부터 현재까지 · 해석용 참고 점수 · 올해는 진행 중</p>
          <div className="mt-3 h-44 w-full min-w-0" role="img" aria-label={`${data.birthYear}년부터 ${data.currentYear}년까지 사주 참고 점수 추이. 상세 값은 아래 연도별 목록에서 확인할 수 있습니다.`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.years} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="year" minTickGap={32} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 10, fill: "currentColor" }} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={(year) => `${year}년${Number(year) === data.currentYear ? " · 진행 중" : ""}`}
                  formatter={(value) => [`${value}점`, "참고 점수"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))", fontSize: 12 }}
                />
                <Area type="linear" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">나이대별로 돌아보기 · 세는나이</h3>
          <p className="mt-1 text-xs text-muted-foreground">연도를 열면 당시 흐름과 해석 근거를 볼 수 있습니다.</p>
        </div>
        <Select value={expandedYear === null ? "" : String(expandedYear)} onValueChange={(year) => openYear(Number(year))}>
          <SelectTrigger className="h-10 w-full sm:w-48" aria-label="과거 분석 연도 바로 찾기">
            <SelectValue placeholder="연도 바로 찾기" />
          </SelectTrigger>
          <SelectContent>
            {data.years.map((year) => <SelectItem key={year.year} value={String(year.year)}>{year.year}년 · {year.age}세{year.isCurrent ? " · 올해" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="과거 분석 나이대 선택">
        {data.periods.map((item) => (
          <button key={item.startYear} type="button" aria-pressed={period.startYear === item.startYear}
            onClick={() => { setPeriodStart(item.startYear); setExpandedYear(null); }}
            className={cn("shrink-0 rounded-xl border px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              period.startYear === item.startYear ? "border-primary/50 bg-primary/10 text-primary" : "border-primary/15 bg-background/30 text-muted-foreground hover:border-primary/30")}>
            <span className="block text-sm font-semibold">{item.title}</span>
            <span className="mt-1 block text-[11px]">{item.startAge}~{item.endAge}세 · {item.startYear}~{item.endYear}</span>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">{period.summary}</p>
      <div className="space-y-2">
        {visibleYears.map((year) => {
          const open = expandedYear === year.year;
          const detailsId = `saju-history-details-${year.year}`;
          return (
            <div key={year.year} ref={(element) => { if (element) yearElements.current.set(year.year, element); else yearElements.current.delete(year.year); }}
              className={cn("overflow-hidden rounded-xl border", yearTone(year))}>
              <button type="button" aria-expanded={open} aria-controls={detailsId}
                onClick={() => setExpandedYear(open ? null : year.year)}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left sm:p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                <span className="w-14 text-center">
                  <span className="block font-bold text-foreground">{year.year}</span>
                  <span className="block text-xs text-muted-foreground">{year.age}세{year.year === data.birthYear ? " · 출생" : ""}</span>
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-semibold">{year.level}</span>
                    <span className="text-muted-foreground">{year.ganzi} 세운{year.daeunLabel ? ` · ${year.daeunLabel} 대운` : " · 대운 전"}</span>
                    {year.transition && <span className="rounded-full border border-primary/20 px-2 py-0.5 text-primary">전환기</span>}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-foreground/85 break-keep">{year.headline}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
              </button>
              <div id={detailsId} hidden={!open} className="space-y-4 border-t border-current/10 p-4 text-foreground sm:pl-[5.25rem]">
                <p className="text-sm leading-relaxed break-keep">{year.summary}</p>
                {year.transition && <p className="rounded-lg bg-primary/5 p-3 text-sm leading-relaxed text-primary">{year.transition}</p>}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground">이렇게 해석한 근거 · 참고 점수 {year.score}점</h4>
                  <ul className="mt-2 space-y-2">
                    {year.evidence.map((evidence, index) => (
                      <li key={`${evidence.label}-${index}`} className="text-sm leading-relaxed">
                        <span className={cn("font-medium", evidence.kind === "caution" ? "text-rose-700" : evidence.kind === "support" ? "text-emerald-700" : "text-foreground/80")}>{evidence.label}</span>
                        <span className="ml-1.5 text-foreground/70">{evidence.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-background/50 p-3">
                  <h4 className="text-xs font-semibold">실제 경험과 대조하기</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-foreground/75">
                    {year.reviewPoints.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
        <p>{data.ageNote}</p>
        <p>{data.methodNote}</p>
        <p>분석 기준일: {data.asOfDate} · 한국 시간</p>
      </div>
    </div>
  );
}

export default function AdminSajuHistory({ birthInfo }: { birthInfo: SajuBirthInfo }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const payload: SajuRequest = {
    birthYear: birthInfo.year,
    birthMonth: birthInfo.month,
    birthDay: birthInfo.day,
    birthHour: birthInfo.hour ?? -1,
    birthMinute: birthInfo.minute ?? 0,
    gender: birthInfo.gender === "female" ? "female" : "male",
    calendarType: birthInfo.calendarType === "lunar" ? "lunar" : "solar",
    isLeapMonth: birthInfo.isLeapMonth,
    birthPlace: birthInfo.birthPlace,
    timeZone: birthInfo.timeZone,
    longitude: birthInfo.longitude,
    latitude: birthInfo.latitude ?? undefined,
    applyTrueSolarTime: birthInfo.applyTrueSolarTime,
    dayBoundary: birthInfo.dayBoundary === "late-zi" ? "late-zi" : "midnight",
  };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["saju-history", user?.id, user?.role, payload, today],
    queryFn: ({ signal }) => calculateSajuHistory(payload, { signal }),
    enabled: isAdmin,
    retry: false,
    gcTime: 0,
  });

  if (!isAdmin) return null;

  return (
    <Card className="mb-8 glass-panel border-amber-500/30" data-saju-history>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-700">
          <ShieldCheck className="h-4 w-4" /> 관리자 전용
        </div>
        <CardTitle className="flex items-center gap-2 pt-1 font-serif text-xl sm:text-2xl">
          <History className="h-5 w-5 shrink-0 text-primary" /> 지나온 삶의 흐름
        </CardTitle>
        <CardDescription>어린 시절부터 지금까지, 힘들었을 시기와 잘 풀렸을 시기를 함께 돌아봅니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending && <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> 출생부터 현재까지의 흐름을 분석하고 있습니다.</p>}
        {error && (
          <div role="alert" className="space-y-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm">{error instanceof Error ? error.message : "과거 흐름을 불러오지 못했습니다."}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}><RefreshCw className="mr-2 h-3.5 w-3.5" /> 다시 불러오기</Button>
          </div>
        )}
        {data && !error && <HistoryReading key={JSON.stringify(payload)} data={data} />}
      </CardContent>
    </Card>
  );
}
