import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useZodiacFortune, type ZodiacDayFortune } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, TrendingUp, Heart, ChevronDown, ChevronUp, Star, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@workspace/replit-auth-web";

const ELEM_COLOR: Record<string, string> = {
  목:'text-green-400', 화:'text-red-400', 토:'text-yellow-400', 금:'text-gray-300', 수:'text-blue-400',
};
const ELEM_KOR: Record<string, string> = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };

// 출생 연도 → 지지 인덱스 (子=0, 丑=1, ...)
function getZodiacIndexFromYear(year: number): number {
  return ((year - 4) % 12 + 12) % 12;
}

// 지지 목록 (사주 계산기와 동일한 순서: 자축인묘진사오미신유술해)
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 65) return 'text-blue-400';
  if (s >= 50) return 'text-amber-400';
  if (s >= 35) return 'text-orange-400';
  return 'text-rose-400';
}

function scoreLabel(s: number) {
  if (s >= 85) return '대길';
  if (s >= 70) return '길';
  if (s >= 55) return '평';
  if (s >= 40) return '주의';
  return '흉';
}

function relBadge(rel: ZodiacDayFortune['relation']) {
  if (rel === 'harmony')  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">합(合)</span>;
  if (rel === 'conflict') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400">충(沖)</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-muted-foreground">평(平)</span>;
}

function ZodiacCard({
  z, isMyZodiac, rank,
}: { z: ZodiacDayFortune; isMyZodiac: boolean; rank: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={cn(
        "glass-panel border rounded-2xl p-4 transition-all cursor-pointer",
        isMyZodiac ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-white/10 hover:border-white/20",
      )}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center gap-3">
        {/* 순위 */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          rank <= 3 ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/8 text-muted-foreground"
        )}>
          {rank}
        </div>

        {/* 이모지 + 이름 */}
        <div className="text-2xl shrink-0">{z.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{z.zodiac}띠</span>
            {isMyZodiac && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-semibold">나의 띠</span>
            )}
            {relBadge(z.relation)}
          </div>
          <div className="text-xs text-muted-foreground">
            {z.birthYears.slice(0, 4).join(' · ')}년생
          </div>
        </div>

        {/* 점수 */}
        <div className="text-right shrink-0">
          <div className={cn("text-lg font-bold font-serif", scoreColor(z.score))}>{z.score}</div>
          <div className={cn("text-xs", scoreColor(z.score))}>{scoreLabel(z.score)}</div>
        </div>

        {/* 토글 */}
        <div className="text-muted-foreground shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* 확장 내용 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10 space-y-3"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{z.fortune}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">재물운</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{z.moneyFortune}</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-400">애정운</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{z.loveFortune}</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">오늘의 조언 </span>{z.advice}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              오행: <span className={ELEM_COLOR[z.element]}>{z.element}({ELEM_KOR[z.element]})</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const ZODIAC_TODAY = format(new Date(), 'yyyy-MM-dd');
const Z_YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i);
const Z_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const Z_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const _zNow = new Date();
const Z_TODAY_Y = _zNow.getFullYear();
const Z_TODAY_M = _zNow.getMonth() + 1;
const Z_TODAY_D = _zNow.getDate();

export default function ZodiacPage() {
  const [date, setDate] = useState(ZODIAC_TODAY);
  const { data, isLoading, error } = useZodiacFortune(date);
  const { profile } = useUser();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [zYear, zMonth, zDay] = date.split('-');

  function onZodiacDateChange(y: string, m: string, d: string) {
    const yi = Number(y), mi = Number(m), di = Number(d);
    const maxDay = new Date(yi, mi, 0).getDate();
    let clampedDay = Math.min(di, maxDay);
    if (!isAdmin) {
      if (yi > Z_TODAY_Y) return;
      if (yi === Z_TODAY_Y && mi > Z_TODAY_M) { return onZodiacDateChange(y, String(Z_TODAY_M), d); }
      if (yi === Z_TODAY_Y && mi === Z_TODAY_M && clampedDay > Z_TODAY_D) { clampedDay = Z_TODAY_D; }
    }
    setDate(`${y}-${String(mi).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`);
  }

  const zAvailYears = Z_YEARS.filter(y => isAdmin || y <= Z_TODAY_Y);
  const selYearN = Number(zYear), selMonthN = Number(zMonth);
  const zAvailMonths = Z_MONTHS.filter(m => {
    if (isAdmin) return true;
    if (selYearN < Z_TODAY_Y) return true;
    return m <= Z_TODAY_M;
  });
  const zAvailDays = Z_DAYS.filter(d => {
    if (isAdmin) return true;
    if (selYearN < Z_TODAY_Y) return true;
    if (selYearN === Z_TODAY_Y && selMonthN < Z_TODAY_M) return true;
    if (selYearN === Z_TODAY_Y && selMonthN === Z_TODAY_M) return d <= Z_TODAY_D;
    return false;
  });

  // 내 띠 인덱스 (지지 기준)
  const myZodiacBranchIdx = profile?.birthYear
    ? getZodiacIndexFromYear(profile.birthYear)
    : -1;

  // 점수 내림차순 정렬
  const sorted = data
    ? [...data.zodiacs].map((z, i) => ({ ...z, origIdx: i })).sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xl">
            🐉
          </div>
          <div>
            <h1 className="text-2xl font-serif text-primary">오늘의 띠별 운세</h1>
            <p className="text-sm text-muted-foreground">12지신(十二支神) 오늘의 운세를 확인하세요</p>
          </div>
        </div>

        {/* 날짜 선택 */}
        <div className="flex items-center gap-1 mb-6 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-xl bg-white/5 border border-white/10 gap-0.5">
            <CalendarDays className="w-4 h-4 text-muted-foreground ml-2 mr-1 shrink-0" />

            <Select value={zYear} onValueChange={(v) => onZodiacDateChange(v, zMonth, zDay)}>
              <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 h-8 px-1 text-sm font-medium w-[76px] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zAvailYears.map((y) => (<SelectItem key={y} value={String(y)}>{y}년</SelectItem>))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground/40 text-xs select-none">·</span>

            <Select value={String(Number(zMonth))} onValueChange={(v) => onZodiacDateChange(zYear, v, zDay)}>
              <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 h-8 px-1 text-sm font-medium w-[52px] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zAvailMonths.map((m) => (<SelectItem key={m} value={String(m)}>{m}월</SelectItem>))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground/40 text-xs select-none">·</span>

            <Select value={String(Number(zDay))} onValueChange={(v) => onZodiacDateChange(zYear, zMonth, v)}>
              <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 h-8 px-1 text-sm font-medium w-[48px] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zAvailDays.map((d) => (<SelectItem key={d} value={String(d)}>{d}일</SelectItem>))}
              </SelectContent>
            </Select>

            {date !== ZODIAC_TODAY && <div className="w-1" />}
          </div>

          {date !== ZODIAC_TODAY && (
            <button
              onClick={() => setDate(ZODIAC_TODAY)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/30"
            >
              오늘
            </button>
          )}
          {data && (
            <div className="text-sm text-muted-foreground">
              일진: <span className="text-primary font-medium">{data.dayGanzi}</span>
            </div>
          )}
        </div>

        {/* 내 띠 강조 */}
        {profile?.birthYear && myZodiacBranchIdx >= 0 && data && (
          <div className="glass-panel border border-primary/20 rounded-2xl p-4 mb-5 bg-primary/5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{data.zodiacs[myZodiacBranchIdx]?.emoji}</span>
              <div>
                <p className="text-sm font-medium">
                  나의 띠 —{' '}
                  <span className="text-primary">{data.zodiacs[myZodiacBranchIdx]?.zodiac}띠</span>
                  {' '}({profile.birthYear}년생)
                </p>
                <p className="text-xs text-muted-foreground">
                  오늘의 운세 점수: <span className={cn("font-bold", scoreColor(data.zodiacs[myZodiacBranchIdx]?.score ?? 0))}>
                    {data.zodiacs[myZodiacBranchIdx]?.score}점
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 랭킹 안내 */}
        {data && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Star className="w-3.5 h-3.5 text-primary" />
            오늘의 운세 순위 (클릭하면 상세 운세를 확인할 수 있습니다)
          </div>
        )}

        {/* 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-rose-400 text-sm">운세를 불러오지 못했습니다.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((z, rankIdx) => (
              <ZodiacCard
                key={z.zodiac}
                z={z}
                isMyZodiac={z.origIdx === myZodiacBranchIdx}
                rank={rankIdx + 1}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
