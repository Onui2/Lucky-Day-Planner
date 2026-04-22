import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLoveFortune, type LoveFortuneResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BIRTH_HOURS, normalizeBirthHour } from "@/components/ProfileModal";
import { Loader2, Heart, UserCircle2, Sparkles, ChevronDown, ChevronUp, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

const ELEM_COLOR: Record<string, string> = {
  목:'text-green-400', 화:'text-red-400', 토:'text-yellow-400', 금:'text-gray-300', 수:'text-blue-400',
};
const ELEM_BORDER: Record<string, string> = {
  목:'border-green-400/40', 화:'border-red-400/40', 토:'border-yellow-400/40', 금:'border-slate-300/40', 수:'border-blue-400/40',
};
const ELEM_KOR: Record<string, string> = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };

const CURRENT_YEAR = new Date().getFullYear();

function scoreColor(s: number) {
  if (s >= 85) return 'text-emerald-400';
  if (s >= 72) return 'text-yellow-400';
  if (s >= 58) return 'text-sky-400';
  return 'text-rose-400';
}
function scoreLabel(s: number) {
  if (s >= 85) return '매우 좋음';
  if (s >= 72) return '좋음';
  if (s >= 58) return '보통';
  return '주의';
}

function LoveScoreGauge({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <motion.circle
            cx="60" cy="60" r="50" fill="none"
            stroke="hsl(46,72%,56%)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - score / 100) }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", scoreColor(score))}>{score}</span>
          <span className="text-xs text-muted-foreground mt-0.5">{scoreLabel(score)}</span>
        </div>
      </div>
    </div>
  );
}

function MonthScoreBar({ month, score, isTop }: { month: number; score: number; isTop: boolean }) {
  const maxH = 80;
  const barH = Math.round((score / 100) * maxH);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ height: maxH + 'px', display:'flex', alignItems:'flex-end' }}>
        <motion.div
          className="w-5 rounded-t-md"
          initial={{ height: 0 }}
          animate={{ height: barH }}
          transition={{ duration: 0.7, delay: month * 0.04, ease: "easeOut" }}
          style={{ backgroundColor: isTop ? 'hsl(46,72%,56%)' : 'rgba(255,255,255,0.15)' }}
        />
      </div>
      <span className={cn("text-[10px]", isTop ? "text-primary font-bold" : "text-muted-foreground")}>{month}월</span>
    </div>
  );
}

function SoloResult({ data }: { data: LoveFortuneResult }) {
  const [expanded, setExpanded] = useState(false);
  const topMonthNums = new Set((data.luckyMonths ?? []).map(m => m.month));
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <LoveScoreGauge score={data.loveScore} />
        <div className="flex-1 text-center sm:text-left">
          <div className="text-xs text-primary/70 tracking-widest uppercase mb-1">{CURRENT_YEAR}년 인연운</div>
          <h2 className={cn("text-2xl font-bold mb-1", scoreColor(data.loveScore))}>{data.loveGrade}</h2>
          <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start flex-wrap">
            <span className={cn("text-sm font-semibold px-2 py-0.5 rounded-full border", ELEM_COLOR[data.myElement], ELEM_BORDER[data.myElement])}>
              {data.myStem}({ELEM_KOR[data.myElement]}) 일간
            </span>
            {data.loveElementRole && (
              <span className="text-xs text-muted-foreground">· {data.loveElementRole} = {data.loveElement}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.loveText}</p>
        </div>
      </div>

      {data.soloAdvice && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex gap-3 items-start">
          <Star className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-200 leading-relaxed">{data.soloAdvice}</p>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-card/30 backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">📅 월별 인연운 흐름</h3>
        <div className="flex items-end justify-between gap-1 px-2">
          {(data.allMonthScores ?? []).map(({ month, score }) => (
            <MonthScoreBar key={month} month={month} score={score} isTop={topMonthNums.has(month)} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">금색 막대 — 인연이 찾아오는 황금 달</p>
      </div>

      {data.luckyMonths && data.luckyMonths.length > 0 && (
        <div className="rounded-3xl border border-primary/20 bg-card/30 backdrop-blur-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-2">💛 인연이 찾아오는 베스트 달</h3>
          {data.luckyMonths.map((m, i) => (
            <div key={m.month} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: i === 0 ? 'hsl(46,72%,56%)' : i === 1 ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)',
                  color: i === 0 ? '#1a1a2e' : 'white'
                }}>
                {m.month}월
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{m.month}월</div>
                <div className="text-xs text-muted-foreground">{m.reason}</div>
              </div>
              <div className={cn("text-lg font-bold", scoreColor(m.score))}>{m.score}</div>
            </div>
          ))}
        </div>
      )}

      {data.partnerTraits && (
        <div className="rounded-3xl border border-pink-400/20 bg-card/30 backdrop-blur-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">💖 어떤 인연을 만날까</h3>
          <div className="space-y-2">
            {data.partnerTraits.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-rose-400/20 flex items-center justify-center shrink-0">
                  <Heart className="w-3 h-3 text-rose-400" />
                </span>
                {t}
              </div>
            ))}
          </div>
          {data.meetWhere && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-muted-foreground">
              <span className="text-primary/80 font-medium">만남의 장소·상황: </span>{data.meetWhere}
            </div>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-sky-400/20 bg-card/30 backdrop-blur-xl p-6">
        <button
          className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
          onClick={() => setExpanded(e => !e)}
        >
          <span>✨ 인연을 만나기 위한 실천 팁</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <ul className="mt-4 space-y-2">
                {data.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>{tip}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DatingResult({ data }: { data: LoveFortuneResult }) {
  const [expanded, setExpanded] = useState(false);
  const myElem = data.myElement;
  const partElem = data.partnerElement ?? '화';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <LoveScoreGauge score={data.compatScore ?? data.loveScore} />
        <div className="flex-1 text-center sm:text-left">
          <div className="text-xs text-primary/70 tracking-widest uppercase mb-1">{CURRENT_YEAR}년 연애운</div>
          <h2 className={cn("text-2xl font-bold mb-2", scoreColor(data.loveScore))}>{data.compatGrade ?? data.loveGrade}</h2>
          <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start flex-wrap">
            <span className={cn("text-sm font-semibold px-2 py-0.5 rounded-full border", ELEM_COLOR[myElem], ELEM_BORDER[myElem])}>
              나 {data.myStem}({ELEM_KOR[myElem]})
            </span>
            <span className="text-muted-foreground">↔</span>
            <span className={cn("text-sm font-semibold px-2 py-0.5 rounded-full border", ELEM_COLOR[partElem], ELEM_BORDER[partElem])}>
              상대 {data.partnerStem}({ELEM_KOR[partElem]})
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.compatSummary ?? data.loveText}</p>
        </div>
      </div>

      {data.datingStrengths && (
        <div className="rounded-3xl border border-emerald-400/20 bg-card/30 backdrop-blur-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center text-xs">✓</span>
            이 관계의 강점
          </h3>
          {data.datingStrengths.map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="text-emerald-400 mt-0.5 shrink-0">+</span>{s}
            </div>
          ))}
        </div>
      )}

      {data.datingChallenges && (
        <div className="rounded-3xl border border-rose-400/20 bg-card/30 backdrop-blur-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-400/20 flex items-center justify-center text-xs">!</span>
            함께 주의할 점
          </h3>
          {data.datingChallenges.map((c, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="text-rose-400 mt-0.5 shrink-0">△</span>{c}
            </div>
          ))}
        </div>
      )}

      {data.datingAdvice && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex gap-3 items-start">
          <Star className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-200 leading-relaxed">{data.datingAdvice}</p>
        </div>
      )}

      <div className="rounded-3xl border border-sky-400/20 bg-card/30 backdrop-blur-xl p-6">
        <button
          className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
          onClick={() => setExpanded(e => !e)}
        >
          <span>✨ 관계를 더 깊게 만드는 팁</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <ul className="mt-4 space-y-2">
                {data.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>{tip}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// 생년월일 입력 블록
interface BirthFieldState {
  year: string; month: string; day: string; hour: number;
}
function BirthBlock({
  label, icon, state, onChange,
  gender, setGender,
}: {
  label: string; icon: React.ReactNode;
  state: BirthFieldState; onChange: (s: BirthFieldState) => void;
  gender?: string; setGender?: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}<span>{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">연도</Label>
          <Input
            placeholder="예) 1995" value={state.year}
            onChange={e => onChange({ ...state, year: e.target.value })}
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">월</Label>
          <Input
            placeholder="1~12" value={state.month}
            onChange={e => onChange({ ...state, month: e.target.value })}
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">일</Label>
          <Input
            placeholder="1~31" value={state.day}
            onChange={e => onChange({ ...state, day: e.target.value })}
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">태어난 시 (선택)</Label>
        <Select
          value={String(state.hour)}
          onValueChange={v => onChange({ ...state, hour: Number(v) })}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-sm">
            <SelectValue placeholder="시간 선택" />
          </SelectTrigger>
          <SelectContent>
            {BIRTH_HOURS.map(h => (
              <SelectItem key={`h-${h.value}`} value={String(h.value)}>{h.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {setGender && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">성별</Label>
          <div className="flex gap-2">
            {([{ v: 'male', l: '남성' }, { v: 'female', l: '여성' }] as const).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setGender(opt.v)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                  gender === opt.v
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground"
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_BIRTH: BirthFieldState = { year: '', month: '', day: '', hour: -1 };

export default function LoveFortunePage() {
  const { profile } = useUser();
  const [status, setStatus] = useState<'solo' | 'dating'>('solo');
  const [gender, setGender] = useState<string>('female');
  const [myBirth, setMyBirth] = useState<BirthFieldState>(EMPTY_BIRTH);
  const [partnerBirth, setPartnerBirth] = useState<BirthFieldState>(EMPTY_BIRTH);
  const [result, setResult] = useState<LoveFortuneResult | null>(null);
  const { mutate, isPending, error } = useLoveFortune();

  function loadMyProfile() {
    if (!profile) return;
    const p = profile;
    setMyBirth({
      year: p.birthYear ? String(p.birthYear) : '',
      month: p.birthMonth ? String(p.birthMonth) : '',
      day: p.birthDay ? String(p.birthDay) : '',
      hour: p.birthHour != null ? normalizeBirthHour(p.birthHour) : -1,
    });
    if (p.gender) setGender(p.gender);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: Parameters<ReturnType<typeof useLoveFortune>['mutate']>[0] = {
      birthYear: Number(myBirth.year),
      birthMonth: Number(myBirth.month),
      birthDay: Number(myBirth.day),
      birthHour: normalizeBirthHour(myBirth.hour),
      gender,
      status,
      targetYear: CURRENT_YEAR,
    };
    if (status === 'dating' && partnerBirth.year) {
      body.partnerYear = Number(partnerBirth.year);
      body.partnerMonth = Number(partnerBirth.month) || undefined;
      body.partnerDay = Number(partnerBirth.day) || undefined;
      body.partnerHour = normalizeBirthHour(partnerBirth.hour);
    }
    mutate(body, { onSuccess: (data) => setResult(data) });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-400/30 bg-rose-400/5 mb-4">
          <Heart className="w-4 h-4 text-rose-400" />
          <span className="text-sm text-rose-300 font-medium">연애운 · 인연 분석</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
          {CURRENT_YEAR}년 연애운
        </h1>
        <p className="text-muted-foreground text-sm">
          오행 사주로 풀어보는 인연의 흐름 — 솔로라면 언제 만날지, 연애중이라면 어떻게 발전하는지
        </p>
      </motion.div>

      {/* 입력 폼 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 space-y-6"
      >
        {/* 상태 토글 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">나의 연애 상태</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStatus('solo'); setResult(null); }}
              className={cn(
                "flex-1 py-3 rounded-2xl text-sm font-medium border flex items-center justify-center gap-2 transition-all",
                status === 'solo'
                  ? "bg-rose-400/20 border-rose-400 text-rose-300"
                  : "bg-white/5 border-white/10 text-muted-foreground"
              )}
            >
              <Heart className="w-4 h-4" /> 솔로 (인연 탐색)
            </button>
            <button
              type="button"
              onClick={() => { setStatus('dating'); setResult(null); }}
              className={cn(
                "flex-1 py-3 rounded-2xl text-sm font-medium border flex items-center justify-center gap-2 transition-all",
                status === 'dating'
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground"
              )}
            >
              <Users className="w-4 h-4" /> 연애중 (관계 분석)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 내 정보 */}
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-4">
            <BirthBlock
              label="내 생년월일"
              icon={<UserCircle2 className="w-4 h-4 text-primary" />}
              state={myBirth}
              onChange={setMyBirth}
              gender={gender}
              setGender={setGender}
            />
            {profile && (
              <button
                type="button"
                onClick={loadMyProfile}
                className="flex items-center gap-2 text-xs text-primary/70 hover:text-primary transition-colors"
              >
                <UserCircle2 className="w-3.5 h-3.5" />
                내 사주 불러오기
              </button>
            )}
          </div>

          {/* 상대방 정보 (연애중만) */}
          <AnimatePresence>
            {status === 'dating' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <BirthBlock
                    label="상대방 생년월일 (입력 시 정확도 높아짐)"
                    icon={<Heart className="w-4 h-4 text-rose-400" />}
                    state={partnerBirth}
                    onChange={setPartnerBirth}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl py-3 text-base"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />분석 중...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />
                {status === 'solo' ? '인연운 분석하기' : '연애운 분석하기'}
              </>
            )}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-rose-400 text-center">{(error as any)?.message ?? "오류가 발생했습니다."}</p>
        )}
      </motion.div>

      {/* 결과 */}
      <AnimatePresence>
        {result && (
          result.status === 'solo'
            ? <SoloResult key="solo" data={result} />
            : <DatingResult key="dating" data={result} />
        )}
      </AnimatePresence>
    </div>
  );
}
