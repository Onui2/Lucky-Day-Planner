import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BIRTH_HOURS, normalizeBirthHour } from "@/components/ProfileModal";
import {
  Heart, Loader2, RefreshCw, UserCircle2, Star, Flame, Sprout,
  AlertTriangle, Lightbulb, Share2, CheckCheck, MessageCircle,
  Sparkles, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useLoveFortune, type LoveFortuneResult } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import HomeInquiryModal from "@/components/HomeInquiryModal";

// ── 공통 상수 ────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();

const ELEM_BG: Record<string, string> = {
  목: "bg-green-500/20 text-green-300",
  화: "bg-red-500/20 text-red-300",
  토: "bg-yellow-500/20 text-yellow-300",
  금: "bg-gray-400/20 text-gray-200",
  수: "bg-blue-500/20 text-blue-300",
};
const ELEM_COLOR: Record<string, string> = {
  목: "text-green-400", 화: "text-red-400", 토: "text-yellow-400", 금: "text-gray-300", 수: "text-blue-400",
};
const ELEM_BORDER: Record<string, string> = {
  목: "border-green-400/40", 화: "border-red-400/40", 토: "border-yellow-400/40", 금: "border-slate-300/40", 수: "border-blue-400/40",
};
const ELEM_KOR: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

function loveScoreColor(s: number) {
  if (s >= 85) return "text-emerald-400";
  if (s >= 72) return "text-yellow-400";
  if (s >= 58) return "text-sky-400";
  return "text-rose-400";
}
function loveScoreLabel(s: number) {
  if (s >= 85) return "매우 좋음";
  if (s >= 72) return "좋음";
  if (s >= 58) return "보통";
  return "주의";
}

// ── 인연운: 게이지 ──────────────────────────────────────────
function LoveScoreGauge({ score }: { score: number }) {
  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r="50" fill="none"
          stroke="hsl(46,72%,56%)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 50}`}
          initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", loveScoreColor(score))}>{score}</span>
        <span className="text-xs text-muted-foreground mt-0.5">{loveScoreLabel(score)}</span>
      </div>
    </div>
  );
}

// ── 인연운: 월별 막대 ────────────────────────────────────────
function MonthBar({ month, score, isTop }: { month: number; score: number; isTop: boolean }) {
  const maxH = 72;
  const barH = Math.round((score / 100) * maxH);
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ height: maxH + "px", display: "flex", alignItems: "flex-end" }}>
        <motion.div
          className="w-4 rounded-t-sm"
          initial={{ height: 0 }}
          animate={{ height: barH }}
          transition={{ duration: 0.7, delay: month * 0.04, ease: "easeOut" }}
          style={{ backgroundColor: isTop ? "hsl(46,72%,56%)" : "rgba(255,255,255,0.15)" }}
        />
      </div>
      <span className={cn("text-[9px]", isTop ? "text-primary font-bold" : "text-muted-foreground")}>{month}월</span>
    </div>
  );
}

// ── 인연운 결과 ──────────────────────────────────────────────
function SoloResult({ data }: { data: LoveFortuneResult }) {
  const [expanded, setExpanded] = useState(false);
  const topSet = new Set((data.luckyMonths ?? []).map((m) => m.month));
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-5">
      {/* 종합 */}
      <div className="rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <LoveScoreGauge score={data.loveScore} />
        <div className="flex-1 text-center sm:text-left">
          <div className="text-xs text-primary/70 tracking-widest uppercase mb-1">{CURRENT_YEAR}년 인연운</div>
          <h2 className={cn("text-2xl font-bold mb-1", loveScoreColor(data.loveScore))}>{data.loveGrade}</h2>
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

      {/* 소조언 */}
      {data.soloAdvice && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex gap-3 items-start">
          <Star className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-200 leading-relaxed">{data.soloAdvice}</p>
        </div>
      )}

      {/* 월별 차트 */}
      <div className="rounded-3xl border border-white/10 bg-card/30 backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">📅 월별 인연운 흐름</h3>
        <div className="flex items-end justify-between gap-1 px-1">
          {(data.allMonthScores ?? []).map(({ month, score }) => (
            <MonthBar key={month} month={month} score={score} isTop={topSet.has(month)} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">금색 막대 — 인연이 찾아오는 황금 달</p>
      </div>

      {/* 베스트 달 */}
      {data.luckyMonths && data.luckyMonths.length > 0 && (
        <div className="rounded-3xl border border-primary/20 bg-card/30 backdrop-blur-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-2">💛 인연이 찾아오는 베스트 달</h3>
          {data.luckyMonths.map((m, i) => (
            <div key={m.month} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: i === 0 ? "hsl(46,72%,56%)" : i === 1 ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)",
                  color: i === 0 ? "#1a1a2e" : "white",
                }}
              >
                {m.month}월
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{m.month}월</div>
                <div className="text-xs text-muted-foreground">{m.reason}</div>
              </div>
              <div className={cn("text-lg font-bold", loveScoreColor(m.score))}>{m.score}</div>
            </div>
          ))}
        </div>
      )}

      {/* 어떤 인연 */}
      {data.partnerTraits && (
        <div className="rounded-3xl border border-pink-400/20 bg-card/30 backdrop-blur-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">💖 어떤 인연을 만날까</h3>
          {data.partnerTraits.map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-rose-400/20 flex items-center justify-center shrink-0">
                <Heart className="w-3 h-3 text-rose-400" />
              </span>
              {t}
            </div>
          ))}
          {data.meetWhere && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-muted-foreground">
              <span className="text-primary/80 font-medium">만남의 장소·상황: </span>{data.meetWhere}
            </div>
          )}
        </div>
      )}

      {/* 팁 */}
      <div className="rounded-3xl border border-sky-400/20 bg-card/30 backdrop-blur-xl p-6">
        <button
          className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
          onClick={() => setExpanded((e) => !e)}
        >
          <span>✨ 인연을 만나기 위한 실천 팁</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
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

// ── 인연운 입력 폼 ────────────────────────────────────────────
interface BirthFieldState { year: string; month: string; day: string; hour: number; }
const EMPTY_BIRTH: BirthFieldState = { year: "", month: "", day: "", hour: -1 };

function BirthBlock({
  label, icon, state, onChange, gender, setGender,
}: {
  label: string; icon: React.ReactNode;
  state: BirthFieldState; onChange: (s: BirthFieldState) => void;
  gender?: string; setGender?: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}<span>{label}</span></div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { k: "year" as const, ph: "예) 1995", label: "연도" },
          { k: "month" as const, ph: "1~12", label: "월" },
          { k: "day" as const, ph: "1~31", label: "일" },
        ].map((f) => (
          <div key={f.k}>
            <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
            <Input
              placeholder={f.ph} value={state[f.k]}
              onChange={(e) => onChange({ ...state, [f.k]: e.target.value })}
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">태어난 시 (선택)</Label>
        <Select value={String(state.hour)} onValueChange={(v) => onChange({ ...state, hour: Number(v) })}>
          <SelectTrigger className="bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="-1">모름</SelectItem>
            {BIRTH_HOURS.map((h) => (
              <SelectItem key={`h-${h.value}`} value={String(h.value)}>{h.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {setGender && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">성별</Label>
          <div className="flex gap-2">
            {([{ v: "male", l: "남성" }, { v: "female", l: "여성" }] as const).map((opt) => (
              <button
                key={opt.v} type="button" onClick={() => setGender(opt.v)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                  gender === opt.v ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-muted-foreground"
                )}
              >{opt.l}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 인연운 탭 전체 ────────────────────────────────────────────
function SoloTab() {
  const { profile } = useUser();
  const [gender, setGender] = useState("female");
  const [myBirth, setMyBirth] = useState<BirthFieldState>(EMPTY_BIRTH);
  const [result, setResult] = useState<LoveFortuneResult | null>(null);
  const { mutate, isPending, error } = useLoveFortune();

  function loadMyProfile() {
    const p = profile;
    if (!p) return;
    setMyBirth({
      year: p.birthYear ? String(p.birthYear) : "",
      month: p.birthMonth ? String(p.birthMonth) : "",
      day: p.birthDay ? String(p.birthDay) : "",
      hour: p.birthHour != null ? normalizeBirthHour(p.birthHour) : -1,
    });
    if (p.gender) setGender(p.gender);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      {
        birthYear: Number(myBirth.year), birthMonth: Number(myBirth.month),
        birthDay: Number(myBirth.day), birthHour: normalizeBirthHour(myBirth.hour),
        gender, status: "solo", targetYear: CURRENT_YEAR,
      },
      { onSuccess: (data) => setResult(data) }
    );
  }

  return (
    <div className="space-y-6">
      {/* 입력 */}
      {!result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-4">
                <BirthBlock
                  label="내 생년월일" icon={<UserCircle2 className="w-4 h-4 text-primary" />}
                  state={myBirth} onChange={setMyBirth} gender={gender} setGender={setGender}
                />
                {profile && (
                  <button type="button" onClick={loadMyProfile}
                    className="flex items-center gap-2 text-xs text-primary/70 hover:text-primary transition-colors">
                    <UserCircle2 className="w-3.5 h-3.5" />내 사주 불러오기
                  </button>
                )}
              </div>
              <Button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl py-3 text-base">
                {isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />분석 중...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />인연운 분석하기</>}
              </Button>
              {error && <p className="text-sm text-rose-400 text-center">{(error as any)?.message ?? "오류가 발생했습니다."}</p>}
            </form>
          </div>
        </motion.div>
      )}

      {result && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setResult(null)}>
              <RefreshCw className="w-4 h-4 mr-2" />다시 보기
            </Button>
          </div>
          <SoloResult data={result} />
        </>
      )}
    </div>
  );
}

// ── 궁합 탭 ──────────────────────────────────────────────────
interface PersonForm {
  birthYear: string; birthMonth: string; birthDay: string;
  birthHour: number; gender: "male" | "female"; name: string;
}
const defaultPerson = (g: "male" | "female"): PersonForm => ({
  birthYear: "", birthMonth: "", birthDay: "", birthHour: -1, gender: g, name: "",
});

async function fetchGungap(p1: PersonForm, p2: PersonForm) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const toPayload = (p: PersonForm) => ({
    year: parseInt(p.birthYear), month: parseInt(p.birthMonth),
    day: parseInt(p.birthDay), hour: p.birthHour, gender: p.gender,
  });
  const res = await fetch(`${base}/api/gungap/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person1: toPayload(p1), person2: toPayload(p2) }),
  });
  if (!res.ok) throw new Error("궁합 계산 오류");
  return res.json();
}

function GungapTab() {
  const { profile } = useUser();
  const [p1, setP1] = useState<PersonForm>(defaultPerson("male"));
  const [p2, setP2] = useState<PersonForm>(defaultPerson("female"));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [p1FromProfile, setP1FromProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  function loadMyProfile() {
    if (!profile) return;
    setP1({
      name: profile.name ?? "", gender: profile.gender,
      birthYear: String(profile.birthYear), birthMonth: String(profile.birthMonth),
      birthDay: String(profile.birthDay), birthHour: normalizeBirthHour(profile.birthHour),
    });
    setP1FromProfile(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (const [label, p] of [["첫 번째", p1], ["두 번째", p2]] as [string, PersonForm][]) {
      const y = parseInt(p.birthYear), m = parseInt(p.birthMonth), d = parseInt(p.birthDay);
      if (!p.birthYear || isNaN(y) || y < 1900 || y > 2100) { setError(`${label} 사람의 년도를 올바르게 입력해주세요.`); return; }
      if (!p.birthMonth || isNaN(m) || m < 1 || m > 12) { setError(`${label} 사람의 월을 올바르게 입력해주세요.`); return; }
      if (!p.birthDay || isNaN(d) || d < 1 || d > 31) { setError(`${label} 사람의 일을 올바르게 입력해주세요.`); return; }
    }
    setLoading(true);
    try { setResult(await fetchGungap(p1, p2)); }
    catch { setError("궁합 계산 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setResult(null); setError(null);
    setP1(defaultPerson("male")); setP2(defaultPerson("female")); setP1FromProfile(false);
  };

  const handleShare = () => {
    if (!result) return;
    const n1 = p1.name || "첫 번째", n2 = p2.name || "두 번째";
    const lines = [
      "💑 명해원 궁합 결과", "━━━━━━━━━━━━━━━━━━━━", `👤 ${n1} ❤️ ${n2}`, "",
      `【종합 점수】 ${result.score}점 / 100점`, `【궁합 등급】 ${result.grade}`,
    ];
    if (result.advice) lines.push(`\n${result.advice}`);
    if (result.summary) lines.push(`\n【궁합 요약】`, result.summary);
    if (result.strengthsTogether?.length) { lines.push(`\n【함께할 때 강점】`); result.strengthsTogether.forEach((s: string) => lines.push(`• ${s}`)); }
    if (result.challengesTogether?.length) { lines.push(`\n【함께할 때 도전】`); result.challengesTogether.forEach((c: string) => lines.push(`• ${c}`)); }
    if (result.tips?.length) { lines.push(`\n【명해원 실천 팁】`); result.tips.forEach((t: string, i: number) => lines.push(`${i + 1}. ${t}`)); }
    lines.push(`\n━━━━━━━━━━━━━━━━━━━━`, "🌊 명해원(命海苑) — 운명의 바다, 지혜가 모이는 곳");
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); });
  };

  const scoreColor =
    (result?.score ?? 0) >= 85 ? "text-yellow-400" :
    (result?.score ?? 0) >= 70 ? "text-green-400" :
    (result?.score ?? 0) >= 55 ? "text-blue-400" : "text-red-400";

  if (!result) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {[
              { label: "첫 번째 사람", state: p1, setState: setP1, heartColor: "text-primary", isMe: true },
              { label: "두 번째 사람", state: p2, setState: setP2, heartColor: "text-rose-400", isMe: false },
            ].map(({ label, state, setState, heartColor, isMe }) => (
              <Card key={label} className="glass-panel border-primary/30">
                <CardHeader className="pb-4">
                  <CardTitle className={`text-xl font-serif flex items-center gap-2 ${heartColor}`}>
                    <Heart className="w-5 h-5 fill-current" />{label}
                    {isMe && (
                      profile ? (
                        <button type="button" onClick={loadMyProfile}
                          className={`ml-auto flex items-center gap-1 text-xs font-normal px-2.5 py-1 rounded-full border transition-colors ${p1FromProfile ? "text-primary bg-primary/15 border-primary/30 hover:bg-primary/25" : "text-primary/70 bg-primary/8 border-primary/20 hover:bg-primary/15 hover:text-primary"}`}>
                          <UserCircle2 className="w-3 h-3" />{p1FromProfile ? "내 사주 ✓" : "내 사주 불러오기"}
                        </button>
                      ) : (
                        <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full cursor-default select-none">
                          <UserCircle2 className="w-3 h-3" />사주 미등록
                        </span>
                      )
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/70">이름 (선택)</label>
                    <Input placeholder="예) 홍길동" value={state.name} onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))} className="placeholder:text-muted-foreground/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/70">성별</label>
                    <div className="flex bg-background/50 rounded-xl p-1 border border-primary/20">
                      {[{ v: "male", l: "남성" }, { v: "female", l: "여성" }].map((o) => (
                        <button key={o.v} type="button"
                          onClick={() => setState((prev) => ({ ...prev, gender: o.v as "male" | "female" }))}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${state.gender === o.v ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: "birthYear", label: "년도", ph: "예) 1990" },
                      { name: "birthMonth", label: "월", ph: "1~12" },
                      { name: "birthDay", label: "일", ph: "1~31" },
                    ].map((f) => (
                      <div key={f.name} className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">{f.label}</label>
                        <Input
                          type="number" placeholder={f.ph}
                          value={(state as any)[f.name]}
                          onChange={(e) => setState((prev) => ({ ...prev, [f.name]: e.target.value }))}
                          className="placeholder:text-muted-foreground/40 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">출생 시간 (선택)</label>
                    <Select value={String(state.birthHour)} onValueChange={(v) => setState((prev) => ({ ...prev, birthHour: Number(v) }))}>
                      <SelectTrigger className="h-10 rounded-xl border-primary/20 bg-input text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BIRTH_HOURS.map((h) => (<SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">{error}</div>
          )}

          <Button type="submit" size="lg" className="w-full text-lg py-6" disabled={loading}>
            {loading
              ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />인연의 실을 잇는 중...</>
              : <><Heart className="mr-2 h-5 w-5 fill-current" />궁합 보기</>}
          </Button>
        </form>
      </motion.div>
    );
  }

  // ── 궁합 결과 ──
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-serif text-primary">궁합 결과</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            {copied ? <><CheckCheck className="w-4 h-4 text-green-400" />복사됨</> : <><Share2 className="w-4 h-4" />결과 공유</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />다시 보기
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-6 text-lg font-serif">
        <span className="text-primary">{p1.name || "첫 번째"}</span>
        <Heart className="w-5 h-5 text-rose-400 fill-current animate-pulse" />
        <span className="text-rose-400">{p2.name || "두 번째"}</span>
      </div>

      <Card className="glass-panel border-primary/40 mb-6">
        <CardContent className="pt-8 pb-8 flex flex-col items-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`text-8xl font-serif font-bold mb-2 ${scoreColor}`}>
            {result.score}
          </motion.div>
          <div className="text-muted-foreground text-sm mb-4">/ 100점</div>
          <div className="text-2xl font-serif text-accent mb-4">{result.grade}</div>
          <div className="w-full max-w-sm h-4 rounded-full bg-muted overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500"
              initial={{ width: 0 }} animate={{ width: `${result.score}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between w-full max-w-sm text-xs text-muted-foreground mb-6">
            <span>어려운 궁합</span><span>천생연분</span>
          </div>
          <p className="text-base text-foreground/85 text-center max-w-lg leading-relaxed">{result.advice}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: p1.name || "첫 번째", pillar: result.p1?.dayPillar, yearPillar: result.p1?.yearPillar },
          { label: p2.name || "두 번째", pillar: result.p2?.dayPillar, yearPillar: result.p2?.yearPillar },
        ].map(({ label, pillar, yearPillar }) => (
          <Card key={label} className="glass-panel border-primary/20 text-center p-5">
            <div className="text-sm text-muted-foreground mb-3">{label}</div>
            {pillar && (
              <>
                <div className="text-2xl font-serif font-bold text-primary mb-1">{pillar.stem}{pillar.branch}</div>
                <div className="text-xs text-muted-foreground mb-2">일주</div>
                <div className="flex justify-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${ELEM_BG[pillar.stemElement]}`}>{pillar.stemElement}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${ELEM_BG[pillar.branchElement]}`}>{pillar.branchElement}</span>
                </div>
                {yearPillar && <div className="mt-2 text-xs text-muted-foreground">{yearPillar.zodiac}띠</div>}
              </>
            )}
          </Card>
        ))}
      </div>

      {result.summary && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-6">
          <Card className="glass-panel border-primary/30">
            <CardContent className="pt-6 pb-6">
              <h3 className="text-lg font-serif text-primary mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5" />두 사람의 관계 분석
              </h3>
              <p className="text-sm text-foreground/85 leading-relaxed mb-5">{result.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4">
                  <div className="flex items-center gap-2 text-green-400 font-semibold text-sm mb-3">
                    <Star className="w-4 h-4 fill-current" />함께하면 빛나는 점
                  </div>
                  <ul className="space-y-2">
                    {result.strengthsTogether?.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-4">
                  <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm mb-3">
                    <AlertTriangle className="w-4 h-4" />함께 주의할 점
                  </div>
                  <ul className="space-y-2">
                    {result.challengesTogether?.map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-orange-400 mt-0.5 flex-shrink-0">!</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(result.p1Strengths?.length > 0 || result.p2Strengths?.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mb-6">
          <h3 className="text-lg font-serif text-foreground/80 mb-3 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary" />각자의 강점 &amp; 성장 포인트
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: p1.name || "첫 번째", elem: result.p1Element, strengths: result.p1Strengths, weaknesses: result.p1Weaknesses, color: "text-primary", border: "border-primary/25", bg: "bg-primary/5" },
              { name: p2.name || "두 번째", elem: result.p2Element, strengths: result.p2Strengths, weaknesses: result.p2Weaknesses, color: "text-rose-400", border: "border-rose-500/25", bg: "bg-rose-500/5" },
            ].map(({ name, elem, strengths, weaknesses, color, border, bg }) => (
              <Card key={name} className={`glass-panel ${border} ${bg}`}>
                <CardContent className="pt-5 pb-5">
                  <div className={`font-serif font-semibold ${color} mb-1 flex items-center gap-2`}>
                    <span>{name}</span>
                    {elem && <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${ELEM_BG[elem]}`}>{elem}(일간)</span>}
                  </div>
                  <div className="mt-3 mb-1 text-xs font-semibold text-green-400 uppercase tracking-wide">강점</div>
                  <ul className="space-y-1 mb-3">
                    {strengths?.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✦</span>{s}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 mb-1 text-xs font-semibold text-amber-400 uppercase tracking-wide">성장 포인트</div>
                  <ul className="space-y-1">
                    {weaknesses?.map((w: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">△</span>{w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {result.details?.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-serif text-foreground/80 mb-3">지지(地支) 관계 분석</h3>
          {result.details.map((d: any, i: number) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: d.positive ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.4 }}
              className={`flex gap-4 p-4 rounded-xl border ${d.positive ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}
            >
              <span className="text-2xl flex-shrink-0">{d.icon}</span>
              <div>
                <div className={`font-semibold mb-1 ${d.positive ? "text-green-400" : "text-red-400"}`}>{d.label}</div>
                <p className="text-sm text-foreground/75 leading-relaxed">{d.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(!result.details || result.details.length === 0) && (
        <Card className="glass-panel border-primary/20 mb-6">
          <CardContent className="pt-5 text-center text-muted-foreground text-sm py-6">
            특별한 지지 관계는 발견되지 않았습니다. 서로의 노력이 관계를 만들어갑니다.
          </CardContent>
        </Card>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="glass-panel border-accent/30 bg-accent/5">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 font-medium text-accent mb-3">
              <Lightbulb className="w-5 h-5" />명해원의 실천 팁
            </div>
            {result.tips?.length > 0 && (
              <ul className="space-y-2 mb-4">
                {result.tips.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed">
                    <span className="text-accent font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>{tip}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-accent/10 pt-3 mt-1">
              💌 궁합은 참고사항일 뿐입니다. 진정한 인연은 서로를 이해하고 존중하는 노력에서 만들어집니다.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="mt-6 text-center">
        <button
          onClick={() => setInquiryOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-rose-400/30 bg-rose-400/8 text-rose-300 hover:bg-rose-400/15 hover:border-rose-400/50 transition-all text-sm font-medium"
        >
          <MessageCircle className="w-4 h-4" />이 궁합에 대해 상담 문의하기
        </button>
      </motion.div>

      <HomeInquiryModal open={inquiryOpen} type="gungap" onClose={() => setInquiryOpen(false)} />
    </motion.div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
type Tab = "solo" | "gungap";

export default function GungapPage() {
  const [tab, setTab] = useState<Tab>("gungap");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "solo",   label: "인연운",  icon: <Heart className="w-4 h-4" />,  desc: "솔로 — 언제 인연을 만날까" },
    { id: "gungap", label: "궁합",    icon: <Users className="w-4 h-4" />,  desc: "두 사람의 오행 궁합 분석" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-400/30 bg-rose-400/5 mb-4">
          <Heart className="w-4 h-4 text-rose-400" />
          <span className="text-sm text-rose-300 font-medium">연애 &amp; 궁합</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold mb-3">
          연애운 &amp; 궁합 (戀愛·宮合)
        </h1>
        <p className="text-muted-foreground">
          솔로라면 인연의 흐름을, 연인이 있다면 두 사람의 오행 궁합을 확인하세요
        </p>
      </motion.div>

      {/* 탭 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-3 p-1.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <span className="flex items-center gap-1.5">{t.icon}{t.label}</span>
              <span className={cn("text-[10px] font-normal", tab === t.id ? "text-primary-foreground/70" : "text-muted-foreground/60")}>{t.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 탭 컨텐츠 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "solo"   && <SoloTab />}
          {tab === "gungap" && <GungapTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
