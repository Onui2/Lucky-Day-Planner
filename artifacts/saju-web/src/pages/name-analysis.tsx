import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNameAnalysis, type NameAnalysisData } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Star, BookOpen, Briefcase, AlertCircle, ChevronDown, ChevronUp, Hash, Palette, Compass, Gem, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import {
  getStemLucky,
  ELEM_KOR as SAJU_ELEM_KOR, ELEM_COLOR as SAJU_ELEM_COLOR, ELEM_BG as SAJU_ELEM_BG,
  getElemRelation,
} from "@/lib/sajuLucky";

const ELEM_KOR: Record<string, string> = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };
const ELEM_COLOR: Record<string, string> = {
  목:'text-green-400', 화:'text-red-400', 토:'text-yellow-400', 금:'text-gray-300', 수:'text-blue-400',
};
const ELEM_BG: Record<string, string> = {
  목:'bg-green-400/20 border-green-400/30', 화:'bg-red-400/20 border-red-400/30',
  토:'bg-yellow-400/20 border-yellow-400/30', 금:'bg-gray-400/20 border-gray-400/30',
  수:'bg-blue-400/20 border-blue-400/30',
};

function gradeColor(grade: string): string {
  if (grade.includes('대길')) return 'text-emerald-400';
  if (grade.includes('吉') && !grade.includes('중')) return 'text-blue-400';
  if (grade.includes('중길')) return 'text-amber-400';
  if (grade.includes('보통')) return 'text-orange-400';
  return 'text-rose-400';
}

function ScoreArc({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#10b981' : score >= 65 ? '#60a5fa' : score >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold font-serif" style={{ color }}>{score}</div>
        <div className="text-[10px] text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function GyeokCard({ label, hanja, strokes, suri }: {
  label: string; hanja: string; strokes: number;
  suri: { name: string; fortune: string; score: number };
}) {
  const [open, setOpen] = useState(false);
  const scoreC = suri.score >= 75 ? 'text-emerald-400' : suri.score >= 55 ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="glass-panel border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-primary">{label}</span>
        <span className={cn("text-xs font-bold", scoreC)}>{suri.score}점</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xl font-serif">{strokes}획</span>
        <span className="text-xs text-muted-foreground">{hanja}</span>
      </div>
      <p className="text-xs text-primary/80 font-medium mb-1">{suri.name}</p>
      <AnimatePresence>
        {open && (
          <motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="text-xs text-muted-foreground leading-relaxed">
            {suri.fortune}
          </motion.p>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(o => !o)} className="mt-1.5 text-[11px] text-primary/60 hover:text-primary flex items-center gap-0.5">
        {open ? <><ChevronUp className="w-3 h-3"/>접기</> : <><ChevronDown className="w-3 h-3"/>풀이 보기</>}
      </button>
    </div>
  );
}

type Profile = ReturnType<typeof useUser>['profile'];

function ResultSection({ data, profile }: { data: NameAnalysisData; profile: Profile }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* 이름 헤더 */}
      <div className="glass-panel border border-primary/20 rounded-2xl p-6 text-center bg-primary/5">
        <div className="text-5xl font-serif text-primary tracking-widest mb-3">{data.name}</div>
        <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
          {data.strokes.map(({ char, strokes }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xl font-serif">{char}</span>
              <span className="text-xs text-muted-foreground">{strokes}획</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center mb-2">
          <ScoreArc score={data.overallScore} />
        </div>
        <div className={cn("text-xl font-serif font-bold", gradeColor(data.overallGrade))}>{data.overallGrade}</div>
      </div>

      {/* 4격 분석 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />수리사주 4격 (四格) 분석
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <GyeokCard label="원격(元格)" hanja="첫 글자" strokes={data.wonGyeok} suri={data.wonGyeokSuri} />
          <GyeokCard label="형격(亨格)" hanja="성+이름1" strokes={data.hyeongGyeok} suri={data.hyeongGyeokSuri} />
          <GyeokCard label="이격(利格)" hanja="이름 합" strokes={data.iGyeok} suri={data.iGyeokSuri} />
          <GyeokCard label="정격(貞格)" hanja="전체 합" strokes={data.jeongGyeok} suri={data.jeongGyeokSuri} />
        </div>
      </div>

      {/* 오행 분석 */}
      <div className="glass-panel border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">오행(五行) 분석</h3>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {data.elements.map((el, i) => (
            <span key={i} className={cn("text-xs px-2.5 py-1 rounded-full border", ELEM_BG[el], ELEM_COLOR[el])}>
              {data.name[i]} — {el}({ELEM_KOR[el]})
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{data.elementFlow}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.yinYangBalance}</p>
      </div>

      {/* 성격 & 직업 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />성격 특성
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.personality}</p>
        </div>
        <div className="glass-panel border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" />적합 직업군
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.careerSuggestions}</p>
        </div>
      </div>

      {/* 행운 영역 */}
      <div className="glass-panel border border-primary/20 rounded-2xl p-5 bg-primary/5">
        <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />이름이 주관하는 운세 영역
        </h3>
        <ul className="space-y-1.5">
          {data.luckAreas.map((area, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-primary shrink-0">•</span>{area}
            </li>
          ))}
        </ul>
      </div>

      {/* 주의 사항 */}
      <div className="glass-panel border border-orange-500/20 rounded-2xl p-4 bg-orange-500/5">
        <div className="flex items-center gap-2 text-orange-400 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">주의 사항</span>
        </div>
        <p className="text-sm text-muted-foreground">{data.caution}</p>
      </div>

      {/* 내 사주와 이름 오행 궁합 (프로필 있는 경우) */}
      {profile?.dayMasterElement && (() => {
        const dm = profile.dayMasterElement!;
        const nameElem = data.dominantElement;
        const rel = getElemRelation(dm, nameElem);
        const lucky = getStemLucky(profile.dayMasterStem, dm);
        const lnums = lucky.numbers;
        const lcolors = lucky.luckyColors;
        const acolors = lucky.avoidColors;
        const ldir = lucky.luckyDirection;
        const adir = lucky.avoidDirection;
        const litems = lucky.luckyItems;
        const lfood = lucky.luckyFood;
        return (
          <div className="space-y-4">
            {/* 오행 궁합 헤더 */}
            <div className={`glass-panel rounded-2xl p-5 border-2 ${rel.isGood ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-orange-400/30 bg-orange-400/5'}`}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${rel.isGood ? 'text-emerald-400' : 'text-orange-400'}`} />
                내 사주와 이름 오행 궁합
              </h3>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-serif font-bold ${SAJU_ELEM_COLOR[dm]} border-current/40 bg-current/10`}>
                    <span className="text-base">{profile.dayMasterStem}</span>
                    <span className="text-[10px]">{SAJU_ELEM_KOR[dm]}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">내 일간</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${rel.isGood ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {rel.isGood ? '✨' : '⚡'}
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${rel.isGood ? 'text-emerald-400' : 'text-orange-400'}`}>{rel.label}</div>
                </div>
                <div className="text-center">
                  <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-serif font-bold ${SAJU_ELEM_COLOR[nameElem]} border-current/40 bg-current/10`}>
                    <span className="text-base">{nameElem}</span>
                    <span className="text-[10px]">{SAJU_ELEM_KOR[nameElem]}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">이름 주 오행</p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed text-center">{rel.desc}</p>
            </div>

            {/* 내 일간 기반 행운 데이터 */}
            <div className="glass-panel border border-primary/20 rounded-2xl p-5 bg-primary/3">
              <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                <Gem className="w-4 h-4" />
                내 일간 <span className={`${SAJU_ELEM_COLOR[dm]}`}>{profile.dayMasterStem}({SAJU_ELEM_KOR[dm]})</span> 기반 행운 정보
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 행운의 숫자 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Hash className="w-3.5 h-3.5 text-primary" /> 행운의 숫자
                  </div>
                  <div className="flex gap-2">
                    {lnums.map((n, i) => (
                      <span key={i} className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-base font-bold text-primary">{n}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{lucky.elementDesc.split('—')[0].trim()}</p>
                </div>

                {/* 행운의 색상 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Palette className="w-3.5 h-3.5 text-primary" /> 행운·주의 색상
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {lcolors.map((c, i) => (
                        <span key={i} className={cn('px-2 py-0.5 rounded-full border text-xs font-medium', SAJU_ELEM_BG[dm], SAJU_ELEM_COLOR[dm])}>✓ {c}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {acolors.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full border border-rose-400/30 bg-rose-400/10 text-xs text-rose-400">✗ {c}</span>
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

                {/* 행운의 물건 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Gem className="w-3.5 h-3.5 text-primary" /> 행운의 물건
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {litems.map((item, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full border border-primary/25 bg-card/60 text-xs text-foreground/80">{item}</span>
                    ))}
                  </div>
                </div>

                {/* 행운의 음식 */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Utensils className="w-3.5 h-3.5 text-primary" /> 행운의 음식
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lfood.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full border border-amber-400/25 bg-amber-400/5 text-xs text-amber-300/90">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}

export default function NameAnalysisPage() {
  const [name, setName] = useState('');
  const mut = useNameAnalysis();
  const { profile } = useUser();

  const handleSubmit = () => {
    if (!name.trim()) return;
    mut.mutate(name.trim());
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xl">
            名
          </div>
          <div>
            <h1 className="text-2xl font-serif text-primary">이름 풀이</h1>
            <p className="text-sm text-muted-foreground">수리사주와 오행으로 이름의 운세를 분석합니다</p>
          </div>
        </div>

        {/* 입력 */}
        <div className="glass-panel border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">한글 이름 입력</Label>
            <Input
              placeholder="예: 홍길동"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="bg-white/5 border-white/10 text-lg text-center tracking-widest"
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground text-center">성씨 포함 2~4자 한글 이름을 입력하세요</p>
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim() || mut.isPending}
            className="w-full gap-2 bg-primary/80 hover:bg-primary text-primary-foreground">
            {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />분석 중...</> : <><Sparkles className="w-4 h-4" />이름 풀이 보기</>}
          </Button>
          {mut.isError && (
            <p className="text-sm text-rose-400 text-center">{(mut.error as any)?.message ?? '오류가 발생했습니다.'}</p>
          )}
        </div>

        {/* 결과 */}
        {mut.data && <ResultSection data={mut.data} profile={profile} />}
      </motion.div>
    </div>
  );
}
