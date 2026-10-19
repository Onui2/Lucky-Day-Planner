import { Link } from "wouter";
import { ArrowRight, Briefcase, Heart, Sparkles, TrendingUp } from "lucide-react";

const CONCERNS = [
  { focus: "career", title: "이직·일", question: "지금 하는 일, 나에게 맞을까요?", description: "일할 때의 강점과 선택할 때 살펴볼 점", icon: Briefcase, tone: "border-sky-500/25 bg-sky-500/10 text-sky-700" },
  { focus: "money", title: "돈·재물", question: "돈을 대하는 내 성향이 궁금해요", description: "돈 관리 성향과 놓치기 쉬운 점", icon: TrendingUp, tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" },
  { focus: "relationship", title: "연애·관계", question: "나는 어떤 관계에서 편안할까요?", description: "관계에서의 강점과 대화할 때 살펴볼 점", icon: Heart, tone: "border-rose-500/25 bg-rose-500/10 text-rose-600" },
] as const;

export default function HomeStartGuide({ isAdmin, isAuthenticated }: { isAdmin: boolean; isAuthenticated: boolean }) {
  return (
    <section className="text-center w-full max-w-5xl mx-auto mb-8" aria-labelledby="home-start-title">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-5">
        <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-primary">내 고민에서 시작하는 사주</span>
      </div>
      <h1 id="home-start-title" className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 text-gradient-gold break-keep">지금, 어떤 고민이 있으세요?</h1>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-keep">
        궁금한 주제를 고르고 생년월일을 입력해 보세요.<br />어려운 사주 용어를 몰라도 시작할 수 있습니다.
      </p>
      <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {CONCERNS.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link key={entry.focus} href={`/saju?focus=${entry.focus}`} className="group rounded-2xl border border-primary/20 bg-card/60 p-4 sm:p-5 transition-colors hover:bg-card hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl border p-2.5 ${entry.tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
                <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
                <ArrowRight className="ml-auto h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-2 sm:mt-4 text-sm font-medium text-foreground break-keep">{entry.question}</p>
              <p className="hidden sm:block mt-1 text-xs leading-relaxed text-muted-foreground break-keep">{entry.description}</p>
              <span className="hidden sm:inline-flex mt-4 text-sm font-medium text-primary">이 고민으로 시작하기</span>
            </Link>
          );
        })}
      </div>
      <ol aria-label="이용 순서" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <li><span className="font-semibold text-primary">1.</span> 고민 선택</li>
        <li><span className="font-semibold text-primary">2.</span> 생년월일 입력</li>
        <li><span className="font-semibold text-primary">3.</span> 무료 요약 · 맞춤 해석 선택</li>
      </ol>
      <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">{isAdmin ? "관리자는 모든 PDF 리포트 무료" : "핵심 요약 무료 · 맞춤 해석 4,900원부터"}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{isAdmin ? "분석 결과 화면에서 원하는 리포트를 선택하세요." : "구매한 해석은 웹에서 읽고 PDF로 보관하세요. 자동 정기결제는 없습니다."}</p>
        <a href={`${import.meta.env.BASE_URL}report-samples/saju-basic.pdf`} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline underline-offset-4">기본 PDF 샘플 보기 <ArrowRight className="h-3 w-3" aria-hidden="true" /></a>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/reports" className="rounded-xl border border-foreground/15 px-4 py-2.5 text-sm text-foreground hover:bg-foreground/5">리포트 상품 · 결제</Link>
        <Link href="/saju" className="rounded-xl border border-foreground/15 px-4 py-2.5 text-sm text-foreground hover:bg-foreground/5">전체 사주부터 보기</Link>
        <Link href="/daily-fortune" className="rounded-xl border border-foreground/15 px-4 py-2.5 text-sm text-foreground hover:bg-foreground/5">오늘 운세</Link>
        {isAuthenticated && <Link href="/account" className="rounded-xl border border-foreground/15 px-4 py-2.5 text-sm text-foreground hover:bg-foreground/5">내 PDF · 구매 내역</Link>}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">사주 풀이는 자신을 돌아보는 참고 자료입니다. 실제 선택에는 현재 상황도 함께 고려하세요.</p>
    </section>
  );
}
