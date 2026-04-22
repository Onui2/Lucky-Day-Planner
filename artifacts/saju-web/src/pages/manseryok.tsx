import { useState, useMemo, useEffect } from "react";
import { useGetManseryokMonth } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, UserCircle2, Star, TrendingDown, Hash, Palette, Compass, Gem } from "lucide-react";
import { getElementStyles, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getElementRelation } from "@/lib/saju-relation";
import { Link } from "wouter";
import {
  getStemLucky,
  ELEM_KOR as SAJU_ELEM_KOR,
  ELEM_COLOR as SAJU_ELEM_COLOR_MAP,
  ELEM_BG as SAJU_ELEM_BG,
} from "@/lib/sajuLucky";
import { useResolvedProfile } from "@/lib/resolved-profile";
import { getMonthKey, getSeoulTodayString } from "@/lib/seoul-date";

const STEM_HANJA: Record<string, string> = {
  갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸',
};
const BRANCH_HANJA: Record<string, string> = {
  자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥',
};
const toGanziHanja = (stem: string, branch: string) =>
  (STEM_HANJA[stem] ?? stem) + (BRANCH_HANJA[branch] ?? branch);

function getDayRelation(
  dayData: any,
  myElem: string | null,
  myStem: string | null,
  myBranch: string | null,
) {
  if (!myElem || !dayData?.dayElement) {
    return null;
  }

  return getElementRelation(
    myElem,
    dayData.dayElement,
    myStem,
    dayData.dayHeavenlyStem,
    myBranch,
    dayData.dayEarthlyBranch,
  );
}

function calcDayScore(
  dayData: any,
  myElem: string | null,
  myStem: string | null,
  myBranch: string | null,
): number {
  const relation = getDayRelation(dayData, myElem, myStem, myBranch);

  if (!relation) {
    let base = 5;
    if (dayData?.luckyDay)        base = 7;
    if (dayData?.inauspiciousDay) base = 3;
    return base;
  }

  let base = relation.score;
  if (dayData.luckyDay)        base = Math.min(10, base + 1);
  if (dayData.inauspiciousDay) base = Math.max(1,  base - 1);
  return base;
}

function scoreLabel(score: number): string {
  if (score >= 9) return "대길";
  if (score >= 7) return "길";
  if (score >= 5) return "평";
  if (score >= 3) return "주의";
  return "흉";
}

function scoreDotColor(score: number): string {
  if (score >= 9) return "bg-yellow-400";
  if (score >= 7) return "bg-emerald-400";
  if (score >= 5) return "bg-slate-400";
  if (score >= 3) return "bg-orange-400";
  return "bg-red-400";
}

function scoreBgColor(score: number): string {
  if (score >= 9) return "bg-yellow-400/20 text-yellow-300 border-yellow-400/40";
  if (score >= 7) return "bg-emerald-400/15 text-emerald-300 border-emerald-400/30";
  if (score >= 5) return "bg-slate-400/10 text-slate-300 border-slate-400/20";
  if (score >= 3) return "bg-orange-400/15 text-orange-300 border-orange-400/30";
  return "bg-red-400/10 text-red-300 border-red-400/20";
}

const ELEM_COLOR: Record<string, string> = {
  목:"text-green-400", 화:"text-red-400",
  토:"text-yellow-400", 금:"text-gray-300", 수:"text-blue-400",
};

const ELEM_DIRECTION: Record<string, string> = {
  목:"동(東)", 화:"남(南)", 토:"중앙(中)", 금:"서(西)", 수:"북(北)",
};
const ELEM_LUCKY_COLORS: Record<string, string[]> = {
  목:["청색","녹색"], 화:["적색","주황"], 토:["황색","갈색"], 금:["흰색","금색"], 수:["검정","남색"],
};
const ELEM_DOMAIN_BOOST: Record<string, Record<string, number>> = {
  목:{ 직업:2, 건강:1, 애정:0, 재물:-1 },
  화:{ 애정:2, 직업:1, 건강:-1, 재물:0 },
  토:{ 재물:2, 건강:1, 직업:0, 애정:-1 },
  금:{ 재물:2, 직업:1, 건강:0, 애정:-1 },
  수:{ 직업:2, 건강:1, 재물:0, 애정:0 },
};
function getSubScores(base: number, elem: string) {
  const b = ELEM_DOMAIN_BOOST[elem] ?? { 재물:0, 애정:0, 건강:0, 직업:0 };
  return {
    재물: Math.min(10, Math.max(1, base + (b.재물 ?? 0))),
    애정: Math.min(10, Math.max(1, base + (b.애정 ?? 0))),
    건강: Math.min(10, Math.max(1, base + (b.건강 ?? 0))),
    직업: Math.min(10, Math.max(1, base + (b.직업 ?? 0))),
  };
}

const STEM_DESC: Record<string, string> = {
  갑:"새로운 시작과 리더십의 기운",
  을:"유연함과 적응력의 기운",
  병:"밝음과 활기의 기운",
  정:"따뜻함과 섬세함의 기운",
  무:"안정과 중용의 기운",
  기:"꼼꼼함과 내실의 기운",
  경:"강인함과 개혁의 기운",
  신:"예리함과 정밀함의 기운",
  임:"포용과 지혜의 기운",
  계:"성숙과 정화의 기운",
};
const BRANCH_DESC: Record<string, string> = {
  자:"지혜로운 기운이 흐르는 날",
  축:"인내와 꼼꼼함이 빛나는 날",
  인:"활동적이고 도전적인 날",
  묘:"창의력과 표현력이 풍부한 날",
  진:"다재다능한 변화의 날",
  사:"통찰력과 집중력이 높은 날",
  오:"열정과 추진력이 넘치는 날",
  미:"따뜻함과 배려가 돋보이는 날",
  신:"명석함과 순발력이 뛰어난 날",
  유:"정교함과 심미안이 발휘되는 날",
  술:"의리와 책임감이 강한 날",
  해:"자유로움과 직관력이 살아있는 날",
};
const SCORE_ADVICE: Record<string, { good: string[]; avoid: string[] }> = {
  대길:{ good:["새로운 시작·계약","투자·사업 결정","중요한 만남","이사·개업"], avoid:["게으름·지체"] },
  길: { good:["중요한 미팅","계획 발표","프로젝트 시작","협력 요청"], avoid:["큰 지출 무계획","조급한 판단"] },
  평: { good:["일상 업무·공부","유지 관리","자기 계발"], avoid:["무리한 도전","큰 변화 강행"] },
  주의:{ good:["현황 점검·정리","준비·학습","신중한 확인"], avoid:["계약·서명","큰 결정","새로운 투자"] },
  흉: { good:["휴식·재충전","내면 성찰","주변 정리"], avoid:["무리한 행동","갈등 유발","큰 지출·계약"] },
};

const REL_WHY: Record<string, string> = {
  인성: "오늘의 오행이 내 일간(日干)을 생(生)하는 구조로, 하늘의 기운이 나를 보호하고 뒷받침합니다. 주변의 도움을 받기 쉽고 심신이 안정되는 좋은 날입니다.",
  비겁: "오늘의 오행이 내 일간과 같은 기운으로 맞부딪힙니다. 경쟁·분산의 흐름이 생기고, 협력보다는 독립 욕구가 강해질 수 있습니다.",
  식상: "내 일간의 기운이 오늘의 오행을 생(生)하며 에너지를 밖으로 쏟아내는 형태입니다. 창의력과 표현력이 올라가지만, 그만큼 체력 소모도 큽니다.",
  재성: "내 일간이 오늘의 오행을 극(剋)하는 구조로, 에너지를 소비해 무언가를 얻으려는 흐름입니다. 재물·성과를 노릴 수 있지만 과욕은 피해야 합니다.",
  관살: "오늘의 오행이 내 일간을 극(剋)하는 구조입니다. 외부 압박·규제·경쟁이 강해지며, 무리하게 맞서기보다 순응하고 기다리는 자세가 유리합니다.",
};

interface SelectedDay {
  dayNum: number;
  dayData: any;
  score: number;
  rel: ReturnType<typeof getElementRelation> | null;
}

const TODAY = getSeoulTodayString();
const TODAY_MONTH = TODAY.slice(0, 7);
const TODAY_DATE = new Date(`${TODAY}T00:00:00`);

export default function ManseryokPage() {
  const today = TODAY_DATE;
  const [currentDate, setCurrentDate] = useState(TODAY_DATE);
  const [selected, setSelected] = useState<SelectedDay | null>(null);
  const { user } = useAuth();
  const { profile, profileReady, hasCachedProfile } = useResolvedProfile();
  const canAccessFutureDates = user?.role === "admin" || user?.role === "superadmin";

  const yearStr = format(currentDate, "yyyy");
  const monthStr = format(currentDate, "MM");
  const currentMonthKey = `${yearStr}-${monthStr}`;
  const isCurrentMonth = currentMonthKey === TODAY_MONTH;
  const accessScope = canAccessFutureDates ? "privileged" : "standard";

  const { data, isLoading, error } = useGetManseryokMonth(
    { year: yearStr, month: monthStr },
    {
      query: {
        queryKey: ["/api/manseryok/month", { year: yearStr, month: monthStr }, accessScope],
      },
    },
  );
  const myElem = profile?.dayMasterElement ?? null;
  const myStem = profile?.dayMasterStem ?? null;
  const myBranch = profile?.dayMasterBranch ?? null;

  useEffect(() => {
    if (!canAccessFutureDates && currentMonthKey > TODAY_MONTH) {
      setCurrentDate(TODAY_DATE);
      setSelected(null);
    }
  }, [canAccessFutureDates, currentMonthKey]);

  // 오늘 날짜 자동 선택 (데이터·프로필 로드 후, 현재 달일 때)
  useEffect(() => {
    if (!data?.days || !isCurrentMonth || !profileReady) return;
    const todayNum = today.getDate();
    // 아무것도 선택 안 됐거나, 오늘이 이미 선택돼 있으면 갱신 (다른 날 선택 시엔 덮어쓰지 않음)
    if (selected && selected.dayNum !== todayNum) return;
    const todayStr = `${yearStr}-${monthStr}-${todayNum.toString().padStart(2, "0")}`;
    const todayData = data.days.find((d: any) => d.solar === todayStr);
    if (!todayData) return;
    const score = calcDayScore(todayData, myElem, myStem, myBranch);
    const rel = getDayRelation(todayData, myElem, myStem, myBranch);
    setSelected({ dayNum: todayNum, dayData: todayData, score, rel });
  }, [
    data,
    isCurrentMonth,
    monthStr,
    profileReady,
    selected?.dayNum,
    yearStr,
    myBranch,
    myElem,
    myStem,
  ]);

  useEffect(() => {
    if (!selected || canAccessFutureDates) return;

    const selectedDate = `${yearStr}-${monthStr}-${String(selected.dayNum).padStart(2, "0")}`;
    if (selectedDate > TODAY) {
      setSelected(null);
    }
  }, [canAccessFutureDates, monthStr, selected, yearStr]);

  const nextMonth = () => {
    const next = addMonths(currentDate, 1);
    if (!canAccessFutureDates && getMonthKey(next) > TODAY_MONTH) return;
    setCurrentDate(next);
    setSelected(null);
  };
  const prevMonth = () => { setCurrentDate(subMonths(currentDate, 1)); setSelected(null); };
  const nextMonthDisabled = !canAccessFutureDates && currentMonthKey >= TODAY_MONTH;

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getDay(startOfMonth(currentDate));

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const dayScores = useMemo(() => {
    if (!data) return {};
    const map: Record<number, number> = {};
    days.forEach(dayNum => {
      const dayStr = dayNum.toString().padStart(2, "0");
      const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
      const dayData = data.days.find((d: any) => d.solar === fullDate);
      if (dayData) map[dayNum] = calcDayScore(dayData, myElem, myStem, myBranch);
    });
    return map;
  }, [data, monthStr, myBranch, myElem, myStem, yearStr]);

  const scoreValues = Object.values(dayScores);
  const avgScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length * 10) / 10
    : null;
  const bestDay = scoreValues.length > 0
    ? Object.entries(dayScores).reduce((a, b) => Number(a[1]) >= Number(b[1]) ? a : b)
    : null;
  const worstDay = scoreValues.length > 0
    ? Object.entries(dayScores).reduce((a, b) => Number(a[1]) <= Number(b[1]) ? a : b)
    : null;

  function handleDayClick(dayNum: number, dayData: any) {
    if (!dayData) return;
    if (selected?.dayNum === dayNum) { setSelected(null); return; }
    const score = calcDayScore(dayData, myElem, myStem, myBranch);
    const rel = getDayRelation(dayData, myElem, myStem, myBranch);
    setSelected({ dayNum, dayData, score, rel });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold mb-3">만세력 (萬年曆)</h1>
        <p className="text-muted-foreground">날마다 깃든 우주의 기운과 운세를 달력으로 한눈에 파악하세요.</p>
      </div>

      {/* 내 사주 개인화 배너 */}
      {myElem ? (
        <div className="mb-5 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center gap-3">
          <UserCircle2 className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="text-primary font-medium">{profile?.name ? `${profile.name}님의` : "내"} 사주 기반으로 분석합니다.</span>
            <span className="text-muted-foreground ml-2">일간 오행: <strong className="text-foreground">{profile?.dayMasterStem} ({myElem})</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <span className="text-yellow-400 font-medium">★ 대길</span>
            <span className="text-emerald-400 font-medium">● 길</span>
            <span className="text-orange-400 font-medium">▲ 주의</span>
          </div>
        </div>
      ) : profileReady ? (
        <div className="mb-5 p-4 rounded-2xl border border-primary/15 bg-primary/3 flex items-center gap-3 text-sm text-muted-foreground">
          <UserCircle2 className="w-5 h-5 shrink-0" />
          <span>{hasCachedProfile ? "최근 계산한 사주 기준으로 개인화 분석을 이어 볼 수 있습니다. 저장 프로필을 만들면 계속 유지됩니다." : "내 사주를 등록하거나 먼저 사주를 계산하면 오행 기운 분석이 달력에 표시됩니다."}</span>
          <Link href="/saju" className="ml-auto text-primary font-medium hover:underline shrink-0">사주 보기 →</Link>
        </div>
      ) : null}

      {/* 요약 카드 */}
      {data && !isLoading && avgScore !== null && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="glass-panel rounded-xl border border-primary/15 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">이달 평균 운세</p>
            <p className="text-2xl font-bold text-primary">{avgScore}</p>
            <p className="text-xs text-muted-foreground">/ 10점</p>
          </div>
          {bestDay && (
            <div className="glass-panel rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-center">
              <p className="text-xs text-yellow-400/70 mb-1 flex items-center justify-center gap-1"><Star className="w-3 h-3" />최고의 날</p>
              <p className="text-lg font-bold text-yellow-300">{monthStr}월 {bestDay[0]}일</p>
              <p className="text-xs text-yellow-400/70">{scoreLabel(Number(bestDay[1]))} ({bestDay[1]}점)</p>
            </div>
          )}
          {worstDay && (
            <div className="glass-panel rounded-xl border border-slate-400/20 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" />주의의 날</p>
              <p className="text-lg font-bold text-muted-foreground">{monthStr}월 {worstDay[0]}일</p>
              <p className="text-xs text-muted-foreground">{scoreLabel(Number(worstDay[1]))} ({worstDay[1]}점)</p>
            </div>
          )}
        </div>
      )}

      <Card className="glass-panel border-primary/20 p-4 md:p-6">
        {/* 월 이동 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              {yearStr}년 {monthStr}월
            </h2>
            {data && (
              <p className="text-primary mt-1 text-base font-serif tracking-widest">
                {toGanziHanja(data.yearGanzi[0], data.yearGanzi[1])} {toGanziHanja(data.monthGanzi[0], data.monthGanzi[1])}
              </p>
            )}
            {!isCurrentMonth && (
              <button
                onClick={() => { setCurrentDate(TODAY_DATE); setSelected(null); }}
                className="mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              >
                이번달로 이동
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            disabled={nextMonthDisabled}
            className="rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {!canAccessFutureDates && (
          <p className="mb-4 text-center text-xs text-muted-foreground">일반 회원은 오늘 이후 날짜와 다음 달 만세력을 볼 수 없습니다.</p>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">만세력을 펼치는 중입니다...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[240px] rounded-2xl border border-destructive/20 bg-destructive/10 text-center text-destructive">
            <p>{error instanceof Error ? error.message : "만세력을 불러오지 못했습니다."}</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={yearStr + monthStr}
          >
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {weekDays.map((day, i) => (
                <div key={day} className={cn(
                  "text-center font-medium pb-2 border-b border-border/50 text-sm",
                  i === 0 ? "text-destructive" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                )}>
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="min-h-[80px] md:min-h-[96px]" />
              ))}

              {days.map(dayNum => {
                const dayStr = dayNum.toString().padStart(2, "0");
                const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
                const dayData = data?.days.find((d: any) => d.solar === fullDate);
                const dayOfWeek = (firstDayOfMonth + dayNum - 1) % 7;
                const dateColor = dayOfWeek === 0 ? "text-destructive" : dayOfWeek === 6 ? "text-blue-400" : "text-foreground";
                const isTodayDate = fullDate === TODAY;
                const isBlockedFutureDate = !canAccessFutureDates && fullDate > TODAY;
                const rel = getDayRelation(dayData, myElem, myStem, myBranch);
                const score = dayData ? dayScores[dayNum] : null;
                const isSelected = selected?.dayNum === dayNum;
                const canSelectDay = Boolean(dayData) && !isBlockedFutureDate;

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      if (!canSelectDay) return;
                      handleDayClick(dayNum, dayData);
                    }}
                    disabled={!canSelectDay}
                    className={cn(
                      "min-h-[80px] md:min-h-[96px] p-1 md:p-1.5 rounded-xl border flex flex-col transition-all text-left",
                      canSelectDay
                        ? "cursor-pointer hover:bg-card/80"
                        : isBlockedFutureDate
                        ? "cursor-not-allowed opacity-45 border-border/30 bg-card/10"
                        : "cursor-default opacity-0",
                      isSelected && "ring-2 ring-primary/50",
                      isTodayDate ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                        : canSelectDay && rel ? `${rel.borderClass} bg-card/20`
                        : canSelectDay ? "border-border/40 bg-card/20 hover:border-primary/40"
                        : undefined,
                    )}
                  >
                    {dayData ? (
                      <>
                        {/* 날짜 + 점수 점 */}
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={cn(
                            "text-xs md:text-sm font-semibold leading-none",
                            dateColor,
                            isTodayDate && "bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full"
                          )}>
                            {dayNum}
                          </span>
                          {score != null && (
                            <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", scoreDotColor(score))} />
                          )}
                        </div>

                        {/* 음력 */}
                        <span className="text-[8px] md:text-[9px] text-muted-foreground leading-none mb-0.5">
                          {dayData.lunar}
                        </span>

                        {/* 한자 간지 */}
                        <div className={cn(
                          "text-xs md:text-sm font-serif px-0.5 py-0.5 rounded border text-center tracking-widest leading-none w-full",
                          getElementStyles(dayData.dayElement)
                        )}>
                          {toGanziHanja(dayData.dayHeavenlyStem, dayData.dayEarthlyBranch)}
                        </div>

                        {/* 절기 */}
                        {dayData.solarTerm && (
                          <div className="text-[8px] md:text-[9px] text-emerald-400 font-medium leading-none mt-0.5 text-center">
                            {dayData.solarTerm}
                          </div>
                        )}

                        {/* 운세 레이블 + 관계 심볼 */}
                        <div className="flex items-center justify-between mt-auto pt-0.5">
                          {score != null && (
                            <span className={cn("text-[8px] md:text-[9px] font-bold", scoreDotColor(score).replace("bg-", "text-"))}>
                              {scoreLabel(score)}
                            </span>
                          )}
                          {rel && (
                            <span className={cn("text-[9px] md:text-[10px] font-bold ml-auto", rel.colorClass)} title={rel.fortune}>
                              {rel.emoji}
                            </span>
                          )}
                        </div>

                        {/* 길일/흉일 점 */}
                        {(dayData.luckyDay || dayData.inauspiciousDay) && (
                          <div className="flex gap-0.5">
                            {dayData.luckyDay && <span className="w-1 h-1 rounded-full bg-primary" title="길일" />}
                            {dayData.inauspiciousDay && <span className="w-1 h-1 rounded-full bg-destructive" title="흉일" />}
                          </div>
                        )}
                      </>
                    ) : isBlockedFutureDate ? (
                      <>
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={cn("text-xs md:text-sm font-semibold leading-none", dateColor)}>
                            {dayNum}
                          </span>
                        </div>
                        <div className="mt-auto text-[9px] md:text-[10px] text-muted-foreground font-medium">
                          미래 날짜
                        </div>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-5">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" />대길</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />길</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" />평</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />주의</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />흉</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />길일</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />흉일</div>
              {myElem && (
                <>
                  <div className="flex items-center gap-1"><span className="text-emerald-400 font-bold text-xs">★</span> 인성</div>
                  <div className="flex items-center gap-1"><span className="text-rose-400 font-bold text-xs">▲</span> 관살</div>
                  <div className="flex items-center gap-1"><span className="text-amber-400 font-bold text-xs">◆</span> 재성</div>
                  <div className="flex items-center gap-1"><span className="text-blue-400 font-bold text-xs">◎</span> 식상</div>
                  <div className="flex items-center gap-1"><span className="text-yellow-400 font-bold text-xs">◈</span> 비겁</div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </Card>

      {/* 선택한 날 상세 */}
      <AnimatePresence>
        {selected && (() => {
          const sub = getSubScores(selected.score, selected.dayData.dayElement);
          const label = scoreLabel(selected.score);
          const advice = SCORE_ADVICE[label] ?? SCORE_ADVICE["평"];
          const direction = ELEM_DIRECTION[selected.dayData.dayElement];
          const luckyColors = ELEM_LUCKY_COLORS[selected.dayData.dayElement] ?? [];
          const branchDesc = BRANCH_DESC[selected.dayData.dayEarthlyBranch] ?? "";
          const stemDesc = STEM_DESC[selected.dayData.dayHeavenlyStem] ?? "";
          const subEntries: { name: string; icon: string; key: keyof typeof sub }[] = [
            { name: "재물운", icon: "💰", key: "재물" },
            { name: "애정운", icon: "💕", key: "애정" },
            { name: "건강운", icon: "🌿", key: "건강" },
            { name: "직업운", icon: "⚡", key: "직업" },
          ];
          return (
            <motion.div
              key={selected.dayNum}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className={cn("mt-4 rounded-2xl border p-5 space-y-4", scoreBgColor(selected.score))}
            >
              {/* ── 헤더: 날짜·간지·점수 ── */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {yearStr}년 {monthStr}월 {selected.dayNum}일
                    {selected.dayData.solarTerm && (
                      <span className="ml-2 text-emerald-400 font-medium">{selected.dayData.solarTerm}</span>
                    )}
                  </p>
                  <h3 className="font-serif text-2xl font-bold text-foreground leading-tight">
                    {toGanziHanja(selected.dayData.dayHeavenlyStem, selected.dayData.dayEarthlyBranch)}일
                    <span className={cn("text-lg ml-2", ELEM_COLOR[selected.dayData.dayElement] ?? "text-muted-foreground")}>
                      {selected.dayData.dayElement}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{branchDesc}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-3xl font-bold text-foreground leading-none">
                    {selected.score}<span className="text-base text-muted-foreground">/10</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">운세 점수</p>
                  <p className={cn("text-sm font-bold mt-0.5", scoreDotColor(selected.score).replace("bg-", "text-"))}>
                    {label}
                  </p>
                </div>
              </div>

              {/* ── 전체 점수 바 ── */}
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selected.score * 10}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", scoreDotColor(selected.score))}
                />
              </div>

              {/* ── 음력·길흉일·관계 ── */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-3">
                  {selected.dayData.luckyDay && <span className="text-primary font-medium">✦ 길일</span>}
                  {selected.dayData.inauspiciousDay && <span className="text-destructive font-medium">✦ 흉일</span>}
                  <span>음력 {selected.dayData.lunar}</span>
                </div>
                {selected.rel && (
                  <div className={cn("flex items-center gap-1 font-medium", selected.rel.colorClass)}>
                    <span>{selected.rel.emoji}</span>
                    <span>{selected.rel.label}</span>
                  </div>
                )}
              </div>

              {/* ── 운세 해설 (왜 이런 점수인가) ── */}
              <div className="rounded-xl bg-white/5 px-4 py-3 border border-white/10 space-y-2">
                <p className="text-xs font-semibold text-foreground/70">운세 해설</p>
                {selected.rel ? (
                  <>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {selected.rel.why || REL_WHY[selected.rel.type] || ""}
                    </p>
                    <p className={cn("text-xs font-medium leading-relaxed border-t border-white/10 pt-2", selected.rel.colorClass)}>
                      {selected.rel.emoji} {selected.rel.fortune}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {selected.dayData.luckyDay
                      ? "오늘은 길일(吉日)로 지정된 날입니다. 하늘의 기운이 순조롭게 흘러 중요한 일을 진행하기 좋은 날입니다."
                      : selected.dayData.inauspiciousDay
                      ? "오늘은 흉일(凶日)로 지정된 날입니다. 하늘의 기운이 거스르는 방향으로 흘러 중요한 결정·계약·이사 등은 피하는 것이 좋습니다."
                      : "내 사주를 등록하면 오행 상호작용에 따른 맞춤 운세 해설을 확인할 수 있습니다."}
                  </p>
                )}
                {selected.dayData.inauspiciousDay && (
                  <p className="text-[11px] text-destructive/80 border-t border-white/10 pt-2">
                    ※ 흉일 — 중요한 행사·계약·이사·수술 등을 피하고 기존 업무에 집중하세요.
                  </p>
                )}
                {selected.dayData.luckyDay && (
                  <p className="text-[11px] text-primary/80 border-t border-white/10 pt-2">
                    ※ 길일 — 결혼·계약·개업·이사 등 중요한 일정을 잡기 좋은 날입니다.
                  </p>
                )}
              </div>

              {/* ── 오늘의 기운 ── */}
              <div className="rounded-xl bg-white/5 px-4 py-3 border border-white/10">
                <p className="text-xs font-semibold text-foreground/70 mb-1">오늘의 기운</p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  <span className={cn("font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{selected.dayData.dayHeavenlyStem}({STEM_HANJA[selected.dayData.dayHeavenlyStem] ?? selected.dayData.dayHeavenlyStem})</span>의 {stemDesc}이 흐르고,{" "}
                  <span className={cn("font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{selected.dayData.dayEarthlyBranch}({BRANCH_HANJA[selected.dayData.dayEarthlyBranch] ?? selected.dayData.dayEarthlyBranch})</span>의 기운으로 {branchDesc.replace("날", "하루입니다")}
                </p>
              </div>

              {/* ── 분야별 운세 ── */}
              <div>
                <p className="text-xs font-semibold text-foreground/70 mb-2">분야별 운세</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {subEntries.map(({ name, icon, key }) => {
                    const val = sub[key];
                    const pct = val * 10;
                    const barCls = val >= 8 ? "bg-yellow-400" : val >= 6 ? "bg-emerald-400" : val >= 4 ? "bg-slate-400" : "bg-orange-400";
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground/70">{icon} {name}</span>
                          <span className="text-xs font-bold text-foreground">{val}/10</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                            className={cn("h-full rounded-full", barCls)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 오늘 일진 기준 길한 방향·색상 ── */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">오늘 일진 기준</p>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">길한 방향</p>
                    <p className={cn("text-sm font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{direction}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">길한 색상</p>
                    <p className={cn("text-sm font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{luckyColors.join(" · ")}</p>
                  </div>
                </div>
              </div>

              {/* ── 내 사주 기반 행운 (프로필 있는 경우) ── */}
              {profile?.dayMasterElement && (() => {
                const dm = profile.dayMasterElement!;
                const lucky = getStemLucky(profile.dayMasterStem, dm);
                const lnums = lucky.numbers;
                const lcolors = lucky.luckyColors;
                const acolors = lucky.avoidColors;
                const ldir = lucky.luckyDirection;
                const adir = lucky.avoidDirection;
                const litems = lucky.luckyItems;
                return (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 space-y-3">
                    <p className="text-[10px] font-semibold text-primary flex items-center gap-1">
                      <Gem className="w-3 h-3" />
                      {profile.name ? `${profile.name}님` : "내"} 일간 <span className={SAJU_ELEM_COLOR_MAP[dm]}>{profile.dayMasterStem}({SAJU_ELEM_KOR[dm]})</span> 기반 행운
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 행운의 숫자 */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" /> 행운의 숫자</p>
                        <div className="flex gap-1.5">
                          {lnums.map((n, i) => (
                            <span key={i} className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">{n}</span>
                          ))}
                        </div>
                      </div>
                      {/* 방향 */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Compass className="w-2.5 h-2.5" /> 길방·흉방</p>
                        <p className="text-xs">
                          <span className="text-emerald-400 font-medium">{ldir}</span>
                          <span className="text-muted-foreground mx-1">·</span>
                          <span className="text-rose-400 font-medium">{adir}</span>
                        </p>
                      </div>
                      {/* 색상 */}
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Palette className="w-2.5 h-2.5" /> 행운·주의 색상</p>
                        <div className="flex flex-wrap gap-1">
                          {lcolors.map((c, i) => (
                            <span key={i} className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", SAJU_ELEM_BG[dm], SAJU_ELEM_COLOR_MAP[dm])}>✓ {c}</span>
                          ))}
                          {acolors.map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-full border border-rose-400/30 bg-rose-400/10 text-[10px] text-rose-400">✗ {c}</span>
                          ))}
                        </div>
                      </div>
                      {/* 행운의 물건 */}
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Gem className="w-2.5 h-2.5" /> 행운의 물건</p>
                        <div className="flex flex-wrap gap-1">
                          {litems.map((item, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-full border border-primary/25 bg-card/60 text-[10px] text-foreground/80">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 추천 / 피할 것 ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-emerald-400 mb-1.5">✔ 하면 좋은 일</p>
                  <ul className="space-y-1">
                    {advice.good.map(item => (
                      <li key={item} className="text-[11px] text-foreground/80 leading-snug">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-red-400 mb-1.5">✗ 피할 것</p>
                  <ul className="space-y-1">
                    {advice.avoid.map(item => (
                      <li key={item} className="text-[11px] text-foreground/80 leading-snug">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
