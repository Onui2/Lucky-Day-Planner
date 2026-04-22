import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useYearFortune, type YearFortuneData } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BIRTH_HOURS } from "@/components/ProfileModal";
import {
  Loader2, TrendingUp, Heart, Briefcase, Activity,
  Star, ChevronDown, ChevronUp, CalendarDays, Sparkles, UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { formatBirthMinute, parseBirthMinute } from "@/lib/birth-time";

const ELEM_KOR: Record<string, string> = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };
const ELEM_COLOR: Record<string, string> = {
  목:'text-green-400', 화:'text-red-400', 토:'text-yellow-400', 금:'text-gray-300', 수:'text-blue-400',
};
const ELEM_BG: Record<string, string> = {
  목:'bg-green-400', 화:'bg-red-400', 토:'bg-yellow-400', 금:'bg-gray-300', 수:'bg-blue-400',
};

const STEM_HANJA: Record<string, string> = {
  갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸',
};
const BRANCH_HANJA: Record<string, string> = {
  자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥',
};

const ZODIAC_EMOJI: Record<string, string> = {
  쥐:'🐭', 소:'🐮', 호랑이:'🐯', 토끼:'🐰', 용:'🐲', 뱀:'🐍',
  말:'🐴', 양:'🐑', 원숭이:'🐵', 닭:'🐔', 개:'🐶', 돼지:'🐷',
};

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <motion.div
        className={cn("h-2 rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

function scoreLabel(s: number) {
  if (s >= 85) return '매우 좋음';
  if (s >= 70) return '좋음';
  if (s >= 55) return '보통';
  if (s >= 40) return '주의';
  return '어려움';
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 65) return 'text-blue-400';
  if (s >= 50) return 'text-amber-400';
  if (s >= 35) return 'text-orange-400';
  return 'text-rose-400';
}

function CategoryCard({
  label, score, text, icon: Icon, barColor,
}: { label: string; score: number; text: string; icon: any; barColor: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", barColor.replace('bg-','text-'))} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", scoreColor(score))}>{score}점</span>
          <span className="text-xs text-muted-foreground">({scoreLabel(score)})</span>
        </div>
      </div>
      <ScoreBar score={score} color={barColor} />
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-muted-foreground mt-3 leading-relaxed"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-2 text-xs text-primary/70 hover:text-primary flex items-center gap-1"
      >
        {expanded ? <><ChevronUp className="w-3 h-3" />접기</> : <><ChevronDown className="w-3 h-3" />상세 보기</>}
      </button>
    </div>
  );
}

const MONTH_SCORE_COLOR = (score: number) =>
  score >= 80 ? "#f0b429" : score >= 65 ? "#4ade80" : score >= 50 ? "#60a5fa" : "#f87171";

type MonthScore = { month: number; score: number; monthStem?: string; monthBranch?: string };

function MonthlyChart({ months }: { months: MonthScore[] }) {
  const BAR_MAX_PX = 96;
  const max = Math.max(...months.map(m => m.score), 1);
  const currentMonth = new Date().getMonth() + 1;
  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-muted-foreground mb-1">월별 운세 흐름</h3>
      <p className="text-[10px] text-muted-foreground/60 mb-4">각 달의 월주(月柱) 간지와 일간의 오행 관계를 분석한 점수입니다.</p>
      <div className="flex items-end gap-1" style={{ height: `${BAR_MAX_PX + 36}px` }}>
        {months.map(({ month, score, monthStem, monthBranch }) => {
          const barH = Math.round((score / max) * BAR_MAX_PX);
          const isCurrent = month === currentMonth;
          const color = MONTH_SCORE_COLOR(score);
          const ganzi = monthStem && monthBranch ? `${monthStem}${monthBranch}` : '';
          return (
            <div key={month} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              {/* 점수 레이블 */}
              <span className={cn("text-[7px] font-medium leading-none mb-0.5", isCurrent ? "text-white font-bold" : "text-muted-foreground/60")}>
                {score}
              </span>
              {/* 막대 — 이번 달은 흰색 테두리로 구분, 색상은 점수 기반 그대로 */}
              <motion.div
                className={cn("w-full rounded-t", isCurrent && "outline outline-2 outline-white/80")}
                style={{ backgroundColor: isCurrent ? color : color + "99" }}
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.7, delay: month * 0.04, ease: "easeOut" }}
                title={`${month}월 ${ganzi} ${score}점`}
              />
              {/* 간지 */}
              {ganzi && (
                <span className={cn("text-[7px] leading-none mt-0.5", isCurrent ? "text-white font-bold" : "text-muted-foreground/50")}>
                  {ganzi}
                </span>
              )}
              {/* 월 */}
              <span className={cn("text-[8px] leading-none", isCurrent ? "text-white font-bold" : "text-muted-foreground")}>
                {month}월
              </span>
            </div>
          );
        })}
      </div>
      {/* 범례 */}
      <div className="flex items-center gap-3 mt-3 justify-end flex-wrap">
        {[["#f0b429", "80+"], ["#4ade80", "65+"], ["#60a5fa", "50+"], ["#f87171", "~49"]].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c }} />
            <span className="text-[9px] text-muted-foreground">{l}점</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultSection({ data }: { data: YearFortuneData }) {
  const year = data.targetYear;
  const elem = data.dayMasterElement;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* 연도 헤더 */}
      <div className="glass-panel border border-primary/20 rounded-2xl p-6 text-center bg-primary/5">
        <div className="text-4xl mb-1">{ZODIAC_EMOJI[data.yearZodiac] ?? '✨'}</div>
        <div className="text-3xl font-serif text-primary mb-1">
          {STEM_HANJA[data.yearStem] ?? data.yearStem}{BRANCH_HANJA[data.yearBranch] ?? data.yearBranch}년 ({year})
        </div>
        <div className="text-sm text-muted-foreground mb-2">{data.yearStemMeaning.name} — {data.yearStemMeaning.energy}</div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15">
            키워드: {data.yearStemMeaning.keyword}
          </span>
          <span className={cn("text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15", ELEM_COLOR[elem])}>
            일주 오행: {elem}({ELEM_KOR[elem]})
          </span>
        </div>
      </div>

      {/* 총운 */}
      <div className="glass-panel border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-primary" />올해의 총운</h3>
          <div className="flex items-center gap-1">
            <span className={cn("text-2xl font-bold font-serif", scoreColor(data.overallScore))}>{data.overallScore}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        <ScoreBar score={data.overallScore} color="bg-primary" />
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{data.overallText}</p>
      </div>

      {/* 4대 운 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CategoryCard label="재물운" score={data.moneyScore} text={data.moneyText} icon={TrendingUp} barColor="bg-amber-400" />
        <CategoryCard label="애정운" score={data.loveScore} text={data.loveText} icon={Heart} barColor="bg-rose-400" />
        <CategoryCard label="직업운" score={data.careerScore} text={data.careerText} icon={Briefcase} barColor="bg-blue-400" />
        <CategoryCard label="건강운" score={data.healthScore} text={data.healthText} icon={Activity} barColor="bg-emerald-400" />
      </div>

      {/* 월별 흐름 */}
      <MonthlyChart months={data.monthlyScores} />

      {/* 분기별 */}
      <div className="glass-panel border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />계절별 운세
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {data.quarters.map((q, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium">{q.name}</span>
                <span className={cn("text-xs font-bold", scoreColor(q.score))}>{q.score}점</span>
              </div>
              <ScoreBar score={q.score} color={['bg-green-400','bg-red-400','bg-amber-400','bg-blue-400'][i]} />
              <p className="text-[11px] text-muted-foreground mt-2">{q.advice}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 핵심 조언 */}
      <div className="glass-panel border border-primary/20 rounded-2xl p-5 bg-primary/5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" />올해의 핵심 조언
        </h3>
        <ul className="space-y-2">
          {data.keyAdvice.map((adv, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2 leading-relaxed">
              <span className="text-primary shrink-0 mt-0.5">•</span>{adv}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function YearFortunePage() {
  const { profile } = useUser();
  const mut = useYearFortune();
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: -1,
    birthMinute: '',
    targetYear: currentYear.toString(),
  });
  const [fromProfile, setFromProfile] = useState(false);

  function loadMyProfile() {
    if (!profile) return;
    setForm(f => ({
      ...f,
      birthYear:  profile.birthYear?.toString()  ?? '',
      birthMonth: profile.birthMonth?.toString() ?? '',
      birthDay:   profile.birthDay?.toString()   ?? '',
      birthHour:  profile.birthHour !== undefined ? profile.birthHour : -1,
      birthMinute: profile.birthHour !== undefined && profile.birthHour >= 0 ? formatBirthMinute(profile.birthMinute) : '',
    }));
    setFromProfile(true);
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.birthYear || !form.birthMonth || !form.birthDay) return;
    mut.mutate({
      birthYear: Number(form.birthYear),
      birthMonth: Number(form.birthMonth),
      birthDay: Number(form.birthDay),
      birthHour: form.birthHour,
      birthMinute: form.birthHour === -1 ? 0 : parseBirthMinute(form.birthMinute),
      targetYear: Number(form.targetYear),
    });
  };

  const isReady = !!form.birthYear && !!form.birthMonth && !!form.birthDay;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-primary">연간 운세</h1>
            <p className="text-sm text-muted-foreground">올 한 해의 흐름을 분기별로 살펴봅니다</p>
          </div>
        </div>

        {/* 입력 폼 */}
        <div className="glass-panel border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">생년월일 입력</span>
            {profile ? (
              <button
                type="button"
                onClick={loadMyProfile}
                className={`flex items-center gap-1 text-xs font-normal px-2.5 py-1 rounded-full border transition-colors ${
                  fromProfile
                    ? "text-primary bg-primary/15 border-primary/30 hover:bg-primary/25"
                    : "text-primary/70 bg-primary/8 border-primary/20 hover:bg-primary/15 hover:text-primary"
                }`}
              >
                <UserCircle2 className="w-3 h-3" />
                {fromProfile ? "내 사주 ✓" : "내 사주 불러오기"}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                <UserCircle2 className="w-3 h-3" /> 사주 미등록
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">출생 연도</Label>
              <Input placeholder="예: 1990" value={form.birthYear} onChange={e => set('birthYear', e.target.value)}
                className="bg-white/5 border-white/10" type="number" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">월</Label>
              <Input placeholder="1-12" value={form.birthMonth} onChange={e => set('birthMonth', e.target.value)}
                className="bg-white/5 border-white/10" type="number" min={1} max={12} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">일</Label>
              <Input placeholder="1-31" value={form.birthDay} onChange={e => set('birthDay', e.target.value)}
                className="bg-white/5 border-white/10" type="number" min={1} max={31} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">시 (Hour)</Label>
              <Select value={String(form.birthHour)} onValueChange={v => setForm(f => ({ ...f, birthHour: Number(v), birthMinute: Number(v) === -1 ? '' : f.birthMinute }))}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BIRTH_HOURS.map(h => (
                    <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">분 (Minute)</Label>
              <Input
                value={form.birthMinute}
                onChange={e => set('birthMinute', e.target.value)}
                className="bg-white/5 border-white/10"
                type="number"
                min={0}
                max={59}
                placeholder="0~59"
                disabled={form.birthHour === -1}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">조회 연도</Label>
              <Input value={form.targetYear} onChange={e => set('targetYear', e.target.value)}
                className="bg-white/5 border-white/10" type="number" min={2020} max={2040} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!isReady || mut.isPending}
            className="w-full gap-2 bg-primary/80 hover:bg-primary text-primary-foreground">
            {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />분석 중...</> : <><Sparkles className="w-4 h-4" />연간 운세 보기</>}
          </Button>

          {mut.isError && (
            <p className="text-sm text-rose-400 text-center">{(mut.error as any)?.message ?? '오류가 발생했습니다.'}</p>
          )}
        </div>

        {/* 결과 */}
        {mut.data && <ResultSection data={mut.data} />}
      </motion.div>
    </div>
  );
}
