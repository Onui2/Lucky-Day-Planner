import { Suspense, lazy } from "react";
import { Link } from "wouter";
import type { MonetizationBirthInfo, SajuResult } from "@workspace/api-client-react";
import { ArrowRight, BookOpenText, FileText, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { ReportPurchaseButton } from "./ReportPurchaseButton";
import { NewYearFreeSummary } from "./NewYearFreeSummary";
import type { ReportFocus } from "@/lib/report-focus";

const AiChatPanel = lazy(() => import("./AiChatPanel").then((module) => ({ default: module.AiChatPanel })));
const ELEMENTS = [
  { key: "wood", label: "목", color: "bg-emerald-600" },
  { key: "fire", label: "화", color: "bg-rose-400" },
  { key: "earth", label: "토", color: "bg-amber-600" },
  { key: "metal", label: "금", color: "bg-slate-500" },
  { key: "water", label: "수", color: "bg-sky-600" },
] as const;

export function SajuCoreChart({ result }: { result: SajuResult }) {
  const total = ELEMENTS.reduce((sum, element) => sum + (result.elementBalance[element.key] ?? 0), 0) || 1;
  const pillars = [
    { label: "시주", value: result.hourPillar }, { label: "일주", value: result.dayPillar },
    { label: "월주", value: result.monthPillar }, { label: "년주", value: result.yearPillar },
  ];
  return <div className="grid divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-foreground/10 bg-card md:grid-cols-2 md:divide-x md:divide-y-0">
    <section className="p-5 sm:p-7" aria-label="사주 원국">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-base font-semibold">사주 원국</h2>
        <span className="text-xs text-muted-foreground">일주가 나를 나타냅니다</span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-1 text-center">
        {pillars.map(({ label, value }) => {
          const unknown = !value || value.heavenlyStem === "?";
          return <div key={label} className={`rounded-lg py-3 ${label === "일주" ? "bg-secondary/60" : ""}`}>
            <p className={`text-xs ${label === "일주" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</p>
            <p className={`mt-3 font-serif text-2xl ${unknown ? "text-muted-foreground" : "text-foreground"}`}>{unknown ? "—" : value.heavenlyStem}</p>
            <p className={`mt-1 font-serif text-2xl ${unknown ? "text-muted-foreground" : "text-foreground"}`}>{unknown ? "—" : value.earthlyBranch}</p>
            <p className="mt-3 text-xs text-muted-foreground">{unknown ? "시간 모름" : value.heavenlyStemElement}</p>
          </div>;
        })}
      </div>
    </section>
    <section className="p-5 sm:p-7" aria-label="오행 분포">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-sans text-base font-semibold">오행 분포</h2>
        <span className="text-xs text-muted-foreground">원국의 오행 개수</span>
      </div>
      <div className="mt-5 space-y-3">
        {ELEMENTS.map(({ key, label, color }) => <div key={key} className="flex items-center gap-3 text-sm">
          <span className="w-5">{label}</span>
          <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/5"><div className={`h-full rounded-full ${color}`} style={{ width: `${(result.elementBalance[key] ?? 0) / total * 100}%` }} /></div>
          <span className="w-4 text-right tabular-nums text-muted-foreground">{result.elementBalance[key] ?? 0}</span>
        </div>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">개수의 많고 적음이 좋고 나쁨을 뜻하지는 않습니다.</p>
    </section>
  </div>;
}

export default function SajuPreview({ result, birthInfo, isAuthenticated, onReset, initialFocus, reportEdition }: {
  result: SajuResult; birthInfo: MonetizationBirthInfo; isAuthenticated: boolean;
  onReset: () => void; initialFocus?: ReportFocus; reportEdition?: "new-year-2027";
}) {
  return <div className="mx-auto max-w-4xl space-y-8 break-keep sm:space-y-10">
    <header className="border-b border-foreground/10 pb-7">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">무료 핵심 요약</span>
        <Button variant="ghost" onClick={onReset} className="gap-1.5 px-2 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />다시 입력</Button>
      </div>
      <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">나의 사주 요약</h1>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm leading-6 text-muted-foreground">
        <span>{birthInfo.year}년 {birthInfo.month}월 {birthInfo.day}일</span>
        <span>{birthInfo.hour < 0 ? "출생시간 모름" : `${birthInfo.hour}시 ${birthInfo.minute ?? 0}분`}</span>
        <span>{birthInfo.gender === "male" ? "남성" : "여성"} · {birthInfo.calendarType === "lunar" ? `음력${birthInfo.isLeapMonth ? " 윤달" : ""}` : "양력"}</span>
      </div>
    </header>
    <section aria-labelledby="preview-summary-title">
      <h2 id="preview-summary-title" className="font-sans text-sm font-medium text-muted-foreground">핵심 성향</h2>
      <p className="mt-3 max-w-3xl whitespace-pre-line font-serif text-xl leading-relaxed sm:text-2xl">{result.previewSummary || `일간은 ${result.dayMasterElement}입니다. 원국과 오행을 바탕으로 나의 성향을 살펴보세요.`}</p>
    </section>
    {reportEdition === "new-year-2027" && <NewYearFreeSummary birthInfo={birthInfo} />}
    <SajuCoreChart result={result} />
    <section className="grid gap-7 rounded-2xl border border-foreground/10 bg-card p-5 sm:p-7 md:grid-cols-[1fr_auto] md:gap-10" aria-labelledby="reading-upgrade-title">
      <div>
        <p className="text-xs font-medium text-muted-foreground">구매 후 웹 · PDF 제공</p>
        <h2 id="reading-upgrade-title" className="mt-2 font-serif text-2xl">더 자세한 해석이 궁금하다면</h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground">성격 전체 풀이부터 직업·관계·앞으로의 흐름까지.<br className="hidden sm:block" />필요한 범위의 리포트를 선택하세요.</p>
        {reportEdition !== "new-year-2027" && <a className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary" href={`${import.meta.env.BASE_URL}report-samples/saju-basic.pdf`} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" aria-hidden="true" />샘플 먼저 보기<span className="sr-only"> (새 탭)</span></a>}
      </div>
      <div className="flex flex-col justify-center border-t border-foreground/10 pt-5 md:min-w-48 md:border-t-0 md:pt-0">
        <p className="mb-3 text-sm text-muted-foreground">{reportEdition === "new-year-2027"
          ? <strong className="text-2xl font-semibold tabular-nums text-foreground">9,900원</strong>
          : <><strong className="text-2xl font-semibold tabular-nums text-foreground">4,900원</strong>부터</>}</p>
        <ReportPurchaseButton birthInfo={birthInfo} isAuthenticated={isAuthenticated} initialFocus={initialFocus} reportEdition={reportEdition} className="w-full justify-center" />
        <p className="mt-2.5 text-xs text-muted-foreground">1회 결제 · 자동 결제 없음</p>
      </div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-foreground/10 pt-4">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"><BookOpenText className="h-4 w-4" aria-hidden="true" />구매한 리포트<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      <Suspense fallback={null}><AiChatPanel birthInfo={birthInfo} isAuthenticated={isAuthenticated} /></Suspense>
    </div>
  </div>;
}
