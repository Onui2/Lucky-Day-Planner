import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Loader2, Sparkles, CalendarDays, TrendingUp, Heart, Briefcase, Activity,
  ChevronLeft, ChevronRight, Star, Info
} from "lucide-react";
import ProfileModal from "@/components/ProfileModal";
import { useResolvedProfile } from "@/lib/resolved-profile";

const ELEM_COLOR: Record<string,string> = { 목:'text-green-400', 화:'text-rose-400', 토:'text-amber-400', 금:'text-slate-300', 수:'text-blue-400' };
const ELEM_BG:   Record<string,string>  = { 목:'bg-green-400/15', 화:'bg-rose-400/15', 토:'bg-amber-400/15', 금:'bg-slate-400/15', 수:'bg-blue-400/15' };
const ELEM_BORDER: Record<string,string>= { 목:'border-green-400/40', 화:'border-rose-400/40', 토:'border-amber-400/40', 금:'border-slate-400/40', 수:'border-blue-400/40' };
const TENGOD_COLOR: Record<string,string> = {
  비견:'text-green-300', 겁재:'text-amber-300', 식신:'text-emerald-300', 상관:'text-orange-300',
  편재:'text-yellow-300', 정재:'text-lime-300', 편관:'text-rose-400', 정관:'text-blue-300',
  편인:'text-purple-300', 정인:'text-indigo-300',
};
const TENGOD_HANJA: Record<string,string> = {
  비견:'比肩', 겁재:'劫財', 식신:'食神', 상관:'傷官', 편재:'偏財',
  정재:'正財', 편관:'偏官', 정관:'正官', 편인:'偏印', 정인:'正印',
};
const STEM_HANJA: Record<string,string> = { 갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸' };
const BRANCH_HANJA: Record<string,string> = { 자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥' };

interface MonthlyData {
  monthName: string; targetYear: number; targetMonth: number;
  dayStem: string; dayElement: string;
  dayPillar: { stem: string; branch: string };
  seun: { stem: string; branch: string; stemHanja: string; branchHanja: string; tenGod: string; element: string; branchElement: string };
  wun: { stem: string; branch: string; stemHanja: string; branchHanja: string; tenGod: string; element: string; branchElement: string };
  scores: { overall: number; wealth: number; career: number; love: number; health: number };
  summary: string; wealthText: string; careerText: string; loveText: string; healthText: string;
  hapChungNotes: string[];
  interactions: { wunHap: boolean; wunChung: boolean; stemHap: boolean; seunHap: boolean; seunChung: boolean };
}

async function fetchMonthly(
  profile: ReturnType<typeof useUser>['profile'],
  year: number, month: number
): Promise<MonthlyData> {
  if (!profile) throw new Error("프로필 없음");
  return customFetch<MonthlyData>("/api/saju/monthly", {
    method: "POST",
    body: JSON.stringify({
      birthYear: profile.birthYear, birthMonth: profile.birthMonth,
      birthDay: profile.birthDay, birthHour: profile.birthHour,
      gender: profile.gender, calendarType: profile.calendarType,
      targetYear: year, targetMonth: month,
    }),
  });
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <motion.div
        className={cn("h-2 rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function scoreLabel(s: number) {
  if (s >= 85) return '매우 좋음'; if (s >= 70) return '좋음';
  if (s >= 55) return '보통'; if (s >= 40) return '주의'; return '어려움';
}
function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-400'; if (s >= 65) return 'text-blue-400';
  if (s >= 50) return 'text-amber-400'; if (s >= 35) return 'text-orange-400'; return 'text-rose-400';
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-emerald-400'; if (s >= 65) return 'bg-blue-400';
  if (s >= 50) return 'bg-amber-400'; if (s >= 35) return 'bg-orange-400'; return 'bg-rose-400';
}

interface CategoryCardProps {
  label: string; score: number; text: string;
  icon: React.ElementType; barColor: string;
}
function CategoryCard({ label, score, text, icon: Icon, barColor }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-panel border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", scoreColor(score))} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", scoreColor(score))}>{score}점</span>
          <span className="text-xs text-muted-foreground">({scoreLabel(score)})</span>
        </div>
      </div>
      <ScoreBar score={score} color={barColor} />
      <button
        className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Info className="w-3 h-3" />
        {expanded ? '접기' : '상세 분석 보기'}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-sm text-foreground/75 mt-2 leading-relaxed overflow-hidden"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MonthlyFortunePage() {
  const { profile, hasCachedProfile } = useResolvedProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthly', profile?.birthYear, profile?.birthMonth, profile?.birthDay, profile?.gender, year, month],
    queryFn: () => fetchMonthly(profile, year, month),
    enabled: !!profile,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary/70 text-sm font-medium mb-1">
          <CalendarDays className="w-4 h-4" /><span>月運 분석</span>
        </div>
        <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
          월운 분석
        </h1>
        <p className="text-muted-foreground text-sm">세운과 월건이 내 일주와 어떻게 작용하는지 분석합니다</p>
      </motion.div>

      {/* 프로필 없음 */}
      {!profile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-panel border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary/50 mx-auto" />
          <p className="text-muted-foreground">월운을 보려면 먼저 사주를 계산하거나 프로필을 등록해주세요.</p>
          <Button onClick={() => setProfileOpen(true)} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40">
            내 사주 등록하기
          </Button>
        </motion.div>
      )}

      {profile && (
        <>
          {/* 월 선택 */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full w-10 h-10 border border-white/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center min-w-[120px]">
              <p className="text-lg font-bold">{year}년 {month}월</p>
              {year === now.getFullYear() && month === now.getMonth() + 1 && (
                <p className="text-xs text-primary">이번 달</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full w-10 h-10 border border-white/10">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className="glass-panel border border-rose-400/20 rounded-2xl p-6 text-center text-rose-400">
              월운 계산 중 오류가 발생했습니다.
            </div>
          )}

          {/* 결과 */}
          {data && (
            <motion.div key={`${year}-${month}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {hasCachedProfile && (
                <div className="glass-panel border border-primary/20 rounded-2xl p-4 text-sm text-muted-foreground">
                  최근 계산한 사주 기준으로 월운을 분석하고 있습니다. 저장 프로필로 바꾸면 다른 메뉴에서도 그대로 이어집니다.
                </div>
              )}
              {/* 세운/월건 카드 */}
              <div className="glass-panel border border-white/10 rounded-2xl p-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {/* 내 일주 */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">내 일주 (日柱)</p>
                    <div className={cn("text-2xl font-serif font-bold", ELEM_COLOR[data.dayElement])}>
                      {STEM_HANJA[data.dayPillar.stem] ?? data.dayPillar.stem}
                      {BRANCH_HANJA[data.dayPillar.branch] ?? data.dayPillar.branch}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{data.dayPillar.stem}{data.dayPillar.branch}</p>
                  </div>
                  {/* 세운 */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">세운 ({year}년)</p>
                    <div className={cn("text-2xl font-serif font-bold", ELEM_COLOR[data.seun.element])}>
                      {data.seun.stemHanja}{data.seun.branchHanja}
                    </div>
                    <p className="text-xs mt-1">
                      <span className={cn("font-medium", TENGOD_COLOR[data.seun.tenGod])}>{data.seun.tenGod}</span>
                      <span className="text-muted-foreground ml-1">({TENGOD_HANJA[data.seun.tenGod] ?? ''})</span>
                    </p>
                  </div>
                  {/* 월건 */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">월건 ({month}월)</p>
                    <div className={cn("text-2xl font-serif font-bold", ELEM_COLOR[data.wun.element])}>
                      {data.wun.stemHanja}{data.wun.branchHanja}
                    </div>
                    <p className="text-xs mt-1">
                      <span className={cn("font-medium", TENGOD_COLOR[data.wun.tenGod])}>{data.wun.tenGod}</span>
                      <span className="text-muted-foreground ml-1">({TENGOD_HANJA[data.wun.tenGod] ?? ''})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 합충 메모 */}
              {data.hapChungNotes.length > 0 && (
                <div className="space-y-2">
                  {data.hapChungNotes.map((note, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={cn(
                        "flex items-start gap-2 px-4 py-3 rounded-xl border text-sm",
                        note.includes('합') ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300" :
                        note.includes('충') ? "bg-rose-400/10 border-rose-400/30 text-rose-300" :
                        "bg-primary/10 border-primary/30 text-primary/90"
                      )}>
                      <Star className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{note}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* 총운 */}
              <div className="glass-panel border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">총운 (種運)</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold", scoreColor(data.scores.overall))}>{data.scores.overall}점</span>
                    <span className="text-xs text-muted-foreground">({scoreLabel(data.scores.overall)})</span>
                  </div>
                </div>
                <ScoreBar score={data.scores.overall} color={scoreBg(data.scores.overall)} />
                <p className="text-sm text-foreground/75 mt-4 leading-relaxed">{data.summary}</p>
              </div>

              {/* 분야별 운세 */}
              <div className="grid sm:grid-cols-2 gap-3">
                <CategoryCard label="재물운" score={data.scores.wealth} text={data.wealthText}
                  icon={TrendingUp} barColor={scoreBg(data.scores.wealth)} />
                <CategoryCard label="직업·사회운" score={data.scores.career} text={data.careerText}
                  icon={Briefcase} barColor={scoreBg(data.scores.career)} />
                <CategoryCard label="애정·인간관계" score={data.scores.love} text={data.loveText}
                  icon={Heart} barColor={scoreBg(data.scores.love)} />
                <CategoryCard label="건강운" score={data.scores.health} text={data.healthText}
                  icon={Activity} barColor={scoreBg(data.scores.health)} />
              </div>

              {/* 월운 해석 설명 */}
              <div className="glass-panel border border-white/10 rounded-2xl p-4 text-sm text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground/70 mb-2">월운 분석 방법</p>
                <p>세운(歲運)은 올해 해당 연도의 10년 흐름이고, 월건(月建)은 해당 달의 에너지입니다. 두 천간이 내 일간(日干)과 어떤 <span className="text-primary">십신(十神)</span> 관계를 맺는지에 따라 그 달의 운세 방향이 결정됩니다. 지지(地支)의 합·충 여부로 에너지의 강도가 조정됩니다.</p>
              </div>
            </motion.div>
          )}
        </>
      )}

      {profileOpen && <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
