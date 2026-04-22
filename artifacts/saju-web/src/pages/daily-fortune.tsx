import { useEffect, useState } from "react";
import { useGetDailyFortune } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Heart, Briefcase, Activity, UserCircle2, Compass, Clock, Palette, Hash, Star, CalendarDays, Gem, Utensils, ChevronLeft, ChevronRight } from "lucide-react";
import { getElementStyles } from "@/lib/utils";
import { getElementRelation } from "@/lib/saju-relation";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  getStemLucky,
  ELEM_KOR as SAJU_ELEM_KOR, ELEM_COLOR as SAJU_ELEM_COLOR, ELEM_BG as SAJU_ELEM_BG,
} from "@/lib/sajuLucky";
import { useResolvedProfile } from "@/lib/resolved-profile";
import { getMonthKey, getSeoulTodayString } from "@/lib/seoul-date";

const ELEM_KOR: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const ELEM_COLOR: Record<string, string> = { 목: "text-green-400", 화: "text-red-400", 토: "text-yellow-400", 금: "text-gray-300", 수: "text-blue-400" };

const STEM_HANJA: Record<string, string> = {
  갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸',
};
const BRANCH_HANJA: Record<string, string> = {
  자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥',
};
const toH = (k: string) => STEM_HANJA[k] ?? BRANCH_HANJA[k] ?? k;

function overallScoreStyle(s: number) {
  if (s >= 80) return { text: 'text-emerald-400', label: '매우 좋은 날' };
  if (s >= 65) return { text: 'text-blue-400',    label: '좋은 날'     };
  if (s >= 50) return { text: 'text-amber-400',   label: '평범한 날'   };
  if (s >= 35) return { text: 'text-orange-400',  label: '주의가 필요한 날' };
  return             { text: 'text-rose-400',    label: '조심하는 날'  };
}

const TODAY = getSeoulTodayString();
const TODAY_MONTH = TODAY.slice(0, 7);

const DOW_KOR = ["일", "월", "화", "수", "목", "금", "토"];

function DateNavPicker({
  date,
  onDateChange,
  canAccessFutureDates,
}: {
  date: string;
  onDateChange: (d: string) => void;
  canAccessFutureDates: boolean;
}) {
  const dateObj = new Date(date + "T00:00:00");
  const [calMonth, setCalMonth] = useState(new Date(date + "T00:00:00"));
  const [open, setOpen] = useState(false);

  const isToday = date === TODAY;
  const canGoNext = canAccessFutureDates || date < TODAY;
  const canGoNextMonth =
    canAccessFutureDates || getMonthKey(addDays(endOfMonth(calMonth), 1)) <= TODAY_MONTH;

  function goPrev() {
    const prev = subDays(dateObj, 1);
    onDateChange(format(prev, "yyyy-MM-dd"));
  }

  function goNext() {
    if (!canGoNext) return;
    const next = addDays(dateObj, 1);
    onDateChange(format(next, "yyyy-MM-dd"));
  }

  function goToday() {
    onDateChange(TODAY);
  }

  function pickDay(d: Date) {
    onDateChange(format(d, "yyyy-MM-dd"));
    setOpen(false);
  }

  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);

  const dateLabel = format(dateObj, "yyyy년 M월 d일", { locale: ko });
  const dowLabel = DOW_KOR[dateObj.getDay()];

  return (
    <div className="inline-flex items-center justify-center gap-1 p-1.5 rounded-2xl bg-card/60 backdrop-blur-md border border-primary/20 mx-auto">
      {/* 이전 날 */}
      <button
        onClick={goPrev}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        title="이전 날"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* 날짜 클릭 → 달력 팝업 */}
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setCalMonth(dateObj); }}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 h-9 rounded-xl hover:bg-primary/10 transition-colors">
            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            <span className="text-base font-medium text-foreground whitespace-nowrap">
              {dateLabel}
              <span className="text-muted-foreground text-sm ml-1.5">({dowLabel})</span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-3 bg-[#0d1228] border border-primary/30 shadow-2xl shadow-black/80 backdrop-blur-none"
          align="center"
        >
          {/* 월 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCalMonth(m => subDays(startOfMonth(m), 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/15 text-foreground/70 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {format(calMonth, "yyyy년 M월")}
            </span>
            <button
              onClick={() => {
                if (!canGoNextMonth) return;
                setCalMonth(m => addDays(endOfMonth(m), 1));
              }}
              disabled={!canGoNextMonth}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-foreground/70",
                canGoNextMonth ? "hover:bg-primary/15 hover:text-foreground" : "opacity-40 cursor-not-allowed",
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_KOR.map((d, i) => (
              <div key={d} className={cn(
                "text-xs text-center py-1 font-medium",
                i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
              )}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const isSelected = key === date;
              const isTodayCell = key === TODAY;
              const isFutureCell = key > TODAY;
              const dow = getDay(d);
              const isDisabled = !canAccessFutureDates && isFutureCell;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isDisabled) return;
                    pickDay(d);
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "h-8 w-full flex items-center justify-center rounded-lg text-sm transition-colors",
                    isDisabled ? "opacity-35 cursor-not-allowed" : "hover:bg-primary/15",
                    isSelected && "bg-primary text-white font-semibold",
                    !isSelected && isTodayCell && "border border-primary/50 text-primary font-semibold",
                    !isSelected && dow === 0 && "text-rose-400",
                    !isSelected && dow === 6 && "text-blue-400",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 다음 날 */}
      <button
        onClick={goNext}
        disabled={!canGoNext}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-muted-foreground",
          canGoNext ? "hover:bg-primary/10 hover:text-primary" : "opacity-40 cursor-not-allowed",
        )}
        title="다음 날"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* 오늘 버튼 */}
      {!isToday && (
        <button
          onClick={goToday}
          className="ml-0.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/30"
        >
          오늘
        </button>
      )}
    </div>
  );
}

export default function DailyFortunePage() {
  const [date, setDate] = useState(TODAY);
  const { user } = useAuth();
  const canAccessFutureDates = user?.role === "admin" || user?.role === "superadmin";
  const accessScope = canAccessFutureDates ? "privileged" : "standard";
  const { data, isLoading, error } = useGetDailyFortune(
    { date },
    {
      query: {
        queryKey: ["/api/fortune/daily", { date }, accessScope],
      },
    },
  );
  const { profile, profileReady, hasCachedProfile } = useResolvedProfile();

  useEffect(() => {
    if (!canAccessFutureDates && date > TODAY) {
      setDate(TODAY);
    }
  }, [canAccessFutureDates, date]);

  // 명시적 색상 매핑 (Tailwind 동적 클래스 미지원 우회)
  const BAR_BG: Record<string, string> = {
    money:  'bg-amber-400',
    love:   'bg-rose-400',
    career: 'bg-blue-400',
    health: 'bg-emerald-400',
  };
  const ICON_COLOR: Record<string, string> = {
    money:  'text-amber-400',
    love:   'text-rose-400',
    career: 'text-blue-400',
    health: 'text-emerald-400',
  };

  function scoreLabel(s: number) {
    if (s >= 85) return '매우 좋음';
    if (s >= 70) return '좋음';
    if (s >= 55) return '보통';
    if (s >= 40) return '주의';
    return '나쁨';
  }

  const ScoreCard = ({
    label, score, fortune, icon: Icon, category,
  }: { label: string; score: number; fortune: string; icon: any; category: string }) => (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-3">
      <div className="flex justify-between items-center">
        <span className={`flex items-center gap-2 font-semibold text-base ${ICON_COLOR[category]}`}>
          <Icon className="w-5 h-5" /> {label}
        </span>
        <div className="text-right">
          <span className={`text-2xl font-bold font-serif ${ICON_COLOR[category]}`}>{score}</span>
          <span className="text-muted-foreground text-sm ml-0.5">점</span>
          <div className={`text-xs ${ICON_COLOR[category]} opacity-80`}>{scoreLabel(score)}</div>
        </div>
      </div>
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${BAR_BG[category]}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed">{fortune}</p>
    </div>
  );

  const rel = profile?.dayMasterElement && data?.dayElement
    ? getElementRelation(
        profile.dayMasterElement,
        data.dayElement,
        profile.dayMasterStem,
        data.dayHeavenlyStem,
        profile.dayMasterBranch,
        data.dayEarthlyBranch,
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold mb-4">오늘의 일진 (日辰)</h1>
        <p className="text-muted-foreground text-lg mb-8">매일매일 달라지는 그날의 기운을 확인하세요.</p>

        <DateNavPicker
          date={date}
          onDateChange={setDate}
          canAccessFutureDates={canAccessFutureDates}
        />
        {!canAccessFutureDates && (
          <p className="mt-3 text-xs text-muted-foreground">일반 회원은 오늘까지만 조회할 수 있습니다.</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">천기의 흐름을 읽는 중입니다...</p>
        </div>
      ) : error || !data ? (
        <div className="text-center p-8 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
          {error instanceof Error ? error.message : "운세 정보를 불러오지 못했습니다."}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* 오늘의 일진 메인 카드 */}
          <Card className="glass-panel border-primary/30 text-center py-8 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

            <p className="text-muted-foreground mb-2">음력 {data.lunarDate}</p>
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
              오늘은 <span className="text-primary">{toH(data.dayHeavenlyStem)}{toH(data.dayEarthlyBranch)}</span>의 날입니다
            </h2>
            <div className="flex items-center justify-center gap-4 mb-5">
              <div className={`px-4 py-2 rounded-xl border ${getElementStyles(data.dayElement)} text-2xl font-serif font-bold tracking-widest`}>
                {toH(data.dayHeavenlyStem)}{toH(data.dayEarthlyBranch)}
              </div>
              <div className="text-muted-foreground text-sm">{data.dayGanzi} · {data.dayElement}</div>
            </div>

            {/* 오늘의 일진 종합 점수 1-100 */}
            {data.overallScore != null && (() => {
              const sc = overallScoreStyle(data.overallScore);
              return (
                <div className="flex flex-col items-center mb-5">
                  <div className="flex items-end gap-2 mb-1">
                    <span className={`text-7xl font-serif font-bold leading-none ${sc.text}`}>{data.overallScore}</span>
                    <span className="text-muted-foreground text-lg mb-1">/ 100</span>
                  </div>
                  <div className={`text-sm font-medium ${sc.text}`}>{sc.label}</div>
                  <div className="w-48 h-3 mt-3 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500`}
                      initial={{ width: 0 }}
                      animate={{ width: `${data.overallScore}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })()}

            <p className="text-xl text-foreground/90 max-w-2xl mx-auto font-light leading-relaxed">
              "{data.overallFortune}"
            </p>
          </Card>

          {/* 내 사주 개인화 카드 */}
          {rel && profile ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className={`glass-panel border-2 ${rel.borderClass} relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 70% 50%, var(--primary), transparent 70%)` }} />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <UserCircle2 className="w-5 h-5 text-primary" />
                    {profile.name ? `${profile.name}님의` : "내"} 오늘의 기운
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* 오행 충돌 시각화 */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center font-serif font-bold text-xl ${ELEM_COLOR[profile.dayMasterElement!]} border-current/40 bg-current/5`}>
                          <span>{toH(profile.dayMasterStem ?? "")}</span>
                          <span className="text-xs">{ELEM_KOR[profile.dayMasterElement!]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">내 일간</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${rel.colorClass}`}>{rel.emoji}</div>
                        <div className={`text-xs font-bold mt-1 ${rel.colorClass}`}>{rel.label}</div>
                      </div>
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center font-serif font-bold text-xl ${ELEM_COLOR[data.dayElement]} border-current/40 bg-current/5`}>
                          <span>{toH(data.dayHeavenlyStem)}</span>
                          <span className="text-xs">{ELEM_KOR[data.dayElement]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">오늘의 일간</p>
                      </div>
                    </div>

                    {/* 분석 텍스트 */}
                    <div className="flex-1 space-y-3">
                      <p className={`text-base font-medium ${rel.colorClass}`}>{rel.label}의 날</p>
                      <p className="text-foreground/80 leading-relaxed">{rel.fortune}</p>
                      <div className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                        {profile.dayMasterElement}({profile.dayMasterStem}) 일간 ✕ 오늘 {data.dayGanzi}({data.dayElement})의 기운
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : profileReady && !profile ? (
            <div className="p-4 rounded-2xl border border-primary/15 bg-primary/3 flex items-center gap-3 text-sm text-muted-foreground">
              <UserCircle2 className="w-5 h-5 shrink-0" />
              <span>{hasCachedProfile ? "최근 분석한 사주 기준 개인화가 준비되어 있습니다. 저장 프로필을 만들면 모든 메뉴에서 계속 이어집니다." : "내 사주를 등록하거나 먼저 사주를 계산하면 오늘의 기운이 내 일간과 어떻게 작용하는지 개인화 분석을 볼 수 있습니다."}</span>
              <Link href="/saju" className="ml-auto text-primary font-medium hover:underline shrink-0">사주 보기 →</Link>
            </div>
          ) : null}

          {/* 내 일간 기반 사주 행운 카드 */}
          {profile?.dayMasterElement && (() => {
            const dm = profile.dayMasterElement!;
            const stem = profile.dayMasterStem;
            const lucky = getStemLucky(stem, dm);
            const lnums = lucky.numbers;
            const lcolors = lucky.luckyColors;
            const acolors = lucky.avoidColors;
            const ldir = lucky.luckyDirection;
            const adir = lucky.avoidDirection;
            const litems = lucky.luckyItems;
            const lfood = lucky.luckyFood;
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="glass-panel border-primary/20 bg-primary/3">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-primary">
                      <Gem className="w-5 h-5" />
                      {profile.name ? `${profile.name}님` : "내"} 사주 기반 행운 정보
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      일간 <span className={`font-bold ${SAJU_ELEM_COLOR[dm]}`}>{profile.dayMasterStem}({SAJU_ELEM_KOR[dm]})</span> — {lucky.elementDesc}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 행운의 숫자 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Hash className="w-3.5 h-3.5 text-primary" /> 행운의 숫자
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {lnums.map((n, i) => (
                            <span key={i} className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-base font-bold text-primary">{n}</span>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">오행 수리: {dm}({SAJU_ELEM_KOR[dm]}) 기운의 수</p>
                      </div>

                      {/* 행운의 색상 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Palette className="w-3.5 h-3.5 text-primary" /> 행운·주의 색상
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1.5">
                            {lcolors.map((c, i) => (
                              <span key={i} className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${SAJU_ELEM_BG[dm]} ${SAJU_ELEM_COLOR[dm]}`}>✓ {c}</span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {acolors.map((c, i) => (
                              <span key={i} className="px-2.5 py-0.5 rounded-full border border-rose-400/30 bg-rose-400/10 text-xs text-rose-400">✗ {c}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 방향 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Compass className="w-3.5 h-3.5 text-primary" /> 길방·흉방
                        </div>
                        <div className="text-sm">
                          <span className="text-emerald-400 font-medium">길방 {ldir}</span>
                          <span className="text-muted-foreground mx-2">·</span>
                          <span className="text-rose-400 font-medium">흉방 {adir}</span>
                        </div>
                      </div>

                      {/* 행운의 아이템 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Gem className="w-3.5 h-3.5 text-primary" /> 행운의 물건
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {litems.map((item, i) => (
                            <span key={i} className="px-2.5 py-0.5 rounded-full border border-primary/25 bg-card/60 text-xs text-foreground/80">{item}</span>
                          ))}
                        </div>
                      </div>

                      {/* 행운의 음식 */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Utensils className="w-3.5 h-3.5 text-primary" /> 행운의 음식
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lfood.map((f, i) => (
                            <span key={i} className="px-2.5 py-0.5 rounded-full border border-amber-400/25 bg-amber-400/5 text-xs text-amber-300/90">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* 운세 지수 — 2×2 카드 */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">운세 지수</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ScoreCard label="재물운" score={data.moneyScore}  fortune={data.moneyFortune}  icon={TrendingUp} category="money"  />
              <ScoreCard label="애정운" score={data.loveScore}   fortune={data.loveFortune}   icon={Heart}      category="love"   />
              <ScoreCard label="직업운" score={data.careerScore} fortune={data.careerFortune} icon={Briefcase}  category="career" />
              <ScoreCard label="건강운" score={data.healthScore} fortune={data.healthFortune} icon={Activity}   category="health" />
            </div>
          </div>

          {/* 행운 포인트 + 조언 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 행운 포인트 */}
            <Card className="glass-panel border-primary/25 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <Star className="w-5 h-5" /> 오늘의 행운 포인트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">행운의 시간</div>
                      <div className="text-sm font-medium space-y-0.5">
                        {data.luckyHours.map((h, i) => (
                          <div key={i} className="text-foreground/90">{h}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Palette className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">행운의 색상</div>
                      <div className="flex flex-wrap gap-2">
                        {data.luckyColors.map((c, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-medium text-primary">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">행운의 숫자</div>
                      <div className="flex gap-2">
                        {data.luckyNumbers.map((n, i) => (
                          <span key={i} className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold text-primary">{n}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Compass className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">방향</div>
                      <div className="text-sm">
                        <span className="text-emerald-400 font-medium">길방 {data.luckyDirection}</span>
                        <span className="text-muted-foreground mx-2">·</span>
                        <span className="text-rose-400 font-medium">흉방 {data.avoidDirection}</span>
                      </div>
                    </div>
                  </div>
                  {data.dayZodiac && (
                    <div className="pt-2 border-t border-border/30 text-center">
                      <span className="text-xs text-muted-foreground">오늘의 띠 기운 </span>
                      <span className="text-sm font-semibold text-foreground">{data.dayZodiac}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 명해원의 조언 */}
            <Card className="glass-panel border-accent/25">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-accent">명해원의 조언</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="relative pl-4 border-l-2 border-accent/50">
                  <p className="text-foreground/85 leading-relaxed">{data.advice}</p>
                </div>

                {/* 오늘 하면 좋은 일 */}
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">오늘 하면 좋은 일</div>
                  <div className="space-y-1.5">
                    {(data.goodThings ?? []).map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        {tip}
                      </div>
                    ))}
                    {rel?.type === '인성' && (
                      <div className="flex items-center gap-2 text-sm text-emerald-300/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                        오늘 기운이 내 일간을 도와주는 날 — 새 계획·학습·중요한 결정에 특히 유리
                      </div>
                    )}
                    {rel?.type === '재성' && (
                      <div className="flex items-center gap-2 text-sm text-emerald-300/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                        내 일간이 오늘 기운을 제어 — 재물·성과를 노리는 적극적인 행동이 유리
                      </div>
                    )}
                    {rel && ['천간합', '지지육합', '지지반합', '지지삼합', '지지방합', '지지암합'].includes(rel.type) && (
                      <div className="flex items-center gap-2 text-sm text-emerald-300/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                        오늘은 {rel.label} 성향 강함 — 협의·만남·조율·파트너십 움직임이 특히 유리
                      </div>
                    )}
                  </div>
                </div>

                {/* 오늘 피해야 할 일 */}
                <div>
                  <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">오늘 피해야 할 일</div>
                  <div className="space-y-1.5">
                    {(data.avoidThings ?? []).map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        {tip}
                      </div>
                    ))}
                    {rel?.type === '관살' && (
                      <div className="flex items-center gap-2 text-sm text-rose-300/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0" />
                        오늘 기운이 내 일간을 누르는 날 — 감정적 대립이나 무리한 결정 특히 자제
                      </div>
                    )}
                    {rel?.type === '식상' && (
                      <div className="flex items-center gap-2 text-sm text-rose-300/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0" />
                        내 에너지가 바깥으로 흐르는 날 — 과도한 지출이나 체력 소모는 줄이세요
                      </div>
                    )}
                    {rel && ['천간충', '지지충', '지지형', '지지해', '지지원진', '지지귀문'].includes(rel.type) && (
                      <div className="flex items-center gap-2 text-sm text-rose-300/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0" />
                        오늘은 {rel.label} 성향 강함 — 말실수·감정 대립·급한 결정은 특히 줄이는 편이 좋음
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 만세력으로 이동 */}
          <div className="text-center pt-2 pb-4">
            <Link href="/manseryok" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
              <CalendarDays className="w-4 h-4 group-hover:text-primary" />
              만세력에서 이 날 더 자세히 보기
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
