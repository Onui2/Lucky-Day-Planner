import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Star, TrendingUp, Calendar } from "lucide-react";
import ProfileModal from "@/components/ProfileModal";
import { useResolvedProfile } from "@/lib/resolved-profile";

const ELEM_COLOR: Record<string,string> = { 목:'text-green-400', 화:'text-rose-400', 토:'text-amber-400', 금:'text-slate-300', 수:'text-blue-400' };
const ELEM_BG: Record<string,string>    = { 목:'bg-green-400/15', 화:'bg-rose-400/15', 토:'bg-amber-400/15', 금:'bg-slate-400/15', 수:'bg-blue-400/15' };
const ELEM_BORDER: Record<string,string>= { 목:'border-green-400/40', 화:'border-rose-400/40', 토:'border-amber-400/40', 금:'border-slate-400/40', 수:'border-blue-400/40' };
const STEM_HANJA: Record<string,string> = { 갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸' };
const BRANCH_HANJA: Record<string,string> = { 자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥' };
const TENGOD_COLOR: Record<string,string> = {
  비견:'text-green-300', 겁재:'text-amber-300', 식신:'text-emerald-300', 상관:'text-orange-300',
  편재:'text-yellow-300', 정재:'text-lime-300', 편관:'text-rose-400', 정관:'text-blue-300',
  편인:'text-purple-300', 정인:'text-indigo-300',
};

interface DaeunPeriod {
  idx: number; startAge: number; endAge: number;
  startYear: number; endYear: number;
  stem: string; branch: string;
  stemElement: string; branchElement: string;
  fortune: string;
}
interface DaeunData {
  isForward: boolean; startAge: number; periods: DaeunPeriod[];
  dayPillar: { heavenlyStem: string; earthlyBranch: string; heavenlyStemElement: string };
  birthYear: number;
}

async function fetchDaeun(p: ReturnType<typeof useUser>['profile']): Promise<DaeunData> {
  if (!p) throw new Error("프로필 없음");
  const data = await customFetch<Record<string,unknown>>("/api/saju/calculate", {
    method: "POST",
    body: JSON.stringify({
      birthYear: p.birthYear, birthMonth: p.birthMonth, birthDay: p.birthDay,
      birthHour: p.birthHour >= 0 ? p.birthHour : -1,
      gender: p.gender, calendarType: p.calendarType,
    }),
  });
  return {
    isForward: (data.daeun as any).isForward,
    startAge:  (data.daeun as any).startAge,
    periods:   (data.daeun as any).periods,
    dayPillar: data.dayPillar as any,
    birthYear: p.birthYear,
  };
}

function getCurrentPeriod(periods: DaeunPeriod[], birthYear: number) {
  const age = new Date().getFullYear() - birthYear;
  return periods.findIndex(p => age >= p.startAge && age <= p.endAge);
}

function PeriodCard({ period, birthYear, isActive, expanded, onToggle }: {
  period: DaeunPeriod; birthYear: number; isActive: boolean;
  expanded: boolean; onToggle: () => void;
}) {
  const stemColor = ELEM_COLOR[period.stemElement] ?? 'text-white';
  const bg = ELEM_BG[period.stemElement] ?? 'bg-white/5';
  const border = isActive ? 'border-primary/60 ring-1 ring-primary/30' : (ELEM_BORDER[period.stemElement] ?? 'border-white/10');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: period.idx * 0.06 }}
      className={cn("rounded-2xl border p-4 cursor-pointer transition-all duration-200", bg, border, isActive && "shadow-lg shadow-primary/10")}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isActive && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">현재 대운</span>}
          <div className="text-center">
            <div className={cn("text-xl font-serif font-bold tracking-wider", stemColor)}>
              {STEM_HANJA[period.stem] ?? period.stem}{BRANCH_HANJA[period.branch] ?? period.branch}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{period.stem}{period.branch}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">{period.startAge}세 ~ {period.endAge}세</div>
            <div className="text-xs text-muted-foreground">{period.startYear}년 ~ {period.endYear}년</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className={cn("text-xs px-2 py-0.5 rounded-full border", ELEM_COLOR[period.stemElement], ELEM_BG[period.stemElement], ELEM_BORDER[period.stemElement])}>
              {period.stemElement}
            </span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border", ELEM_COLOR[period.branchElement], ELEM_BG[period.branchElement], ELEM_BORDER[period.branchElement])}>
              {period.branchElement}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-foreground/80 leading-relaxed">{period.fortune}</p>
              <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                <span>천간 오행: <span className={cn("font-medium", ELEM_COLOR[period.stemElement])}>{period.stemElement}</span></span>
                <span>·</span>
                <span>지지 오행: <span className={cn("font-medium", ELEM_COLOR[period.branchElement])}>{period.branchElement}</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DaeunPage() {
  const { profile, hasCachedProfile } = useResolvedProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['daeun', profile?.birthYear, profile?.birthMonth, profile?.birthDay, profile?.gender],
    queryFn: () => fetchDaeun(profile),
    enabled: !!profile,
  });

  const currentIdx = data ? getCurrentPeriod(data.periods, data.birthYear) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary/70 text-sm font-medium mb-1">
          <Star className="w-4 h-4" />
          <span>大運 분석</span>
        </div>
        <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
          대운 계산기
        </h1>
        <p className="text-muted-foreground text-sm">10년 단위로 변화하는 운명의 흐름을 확인하세요</p>
      </motion.div>

      {/* 프로필 없음 */}
      {!profile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-panel border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary/50 mx-auto" />
          <p className="text-muted-foreground">대운을 보려면 먼저 사주를 계산하거나 프로필을 등록해주세요.</p>
          <Button onClick={() => setProfileOpen(true)} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40">
            내 사주 등록하기
          </Button>
        </motion.div>
      )}

      {/* 로딩 */}
      {profile && isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="glass-panel border border-rose-400/20 rounded-2xl p-6 text-center text-rose-400">
          대운 계산 중 오류가 발생했습니다.
        </div>
      )}

      {/* 대운 결과 */}
      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {hasCachedProfile && (
            <div className="glass-panel border border-primary/20 rounded-2xl p-4 text-sm text-muted-foreground">
              최근 계산한 사주 기준으로 대운을 계산하고 있습니다. 프로필로 저장하면 이후에도 그대로 이어집니다.
            </div>
          )}
          {/* 기본 정보 카드 */}
          <div className="glass-panel border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">일주 (日柱)</p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-2xl font-serif font-bold", ELEM_COLOR[data.dayPillar.heavenlyStemElement])}>
                    {STEM_HANJA[data.dayPillar.heavenlyStem] ?? data.dayPillar.heavenlyStem}
                  </span>
                  <span className="text-2xl font-serif font-bold text-foreground/80">
                    {BRANCH_HANJA[data.dayPillar.earthlyBranch] ?? data.dayPillar.earthlyBranch}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({data.dayPillar.heavenlyStem}{data.dayPillar.earthlyBranch})
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">대운 시작</p>
                  <p className="font-bold text-primary">{data.startAge}세</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">행운 방향</p>
                  <p className="font-bold">{data.isForward ? '순행 →' : '← 역행'}</p>
                </div>
                {currentIdx >= 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">현재 대운</p>
                    <p className="font-bold text-amber-400">{data.periods[currentIdx]?.idx}번째</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 타임라인 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-medium">대운 타임라인</h2>
              <span className="text-xs text-muted-foreground">(클릭하면 상세 운세 확인)</span>
            </div>

            {/* 시각적 타임라인 바 */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
              {data.periods.map((period, i) => {
                const isActive = i === currentIdx;
                return (
                  <button
                    key={period.idx}
                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                    className={cn(
                      "flex-1 min-w-[50px] h-12 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center",
                      isActive
                        ? "border-primary/80 bg-primary/20 shadow-md shadow-primary/20"
                        : cn(ELEM_BG[period.stemElement], ELEM_BORDER[period.stemElement], "opacity-70 hover:opacity-100")
                    )}
                  >
                    <span className={cn("text-xs font-serif font-bold", ELEM_COLOR[period.stemElement])}>
                      {STEM_HANJA[period.stem]}{BRANCH_HANJA[period.branch]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{period.startAge}세</span>
                  </button>
                );
              })}
            </div>

            {/* 대운 카드 목록 */}
            <div className="space-y-3">
              {data.periods.map((period, i) => (
                <PeriodCard
                  key={period.idx}
                  period={period}
                  birthYear={data.birthYear}
                  isActive={i === currentIdx}
                  expanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))}
            </div>
          </div>

          {/* 대운 해석 안내 */}
          <div className="glass-panel border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">대운(大運) 이해하기</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>대운은 10년마다 변화하는 큰 운의 흐름입니다. 사주의 월주(月柱)에서 출발해 남성 양년생·여성 음년생은 순행(미래 절기 방향), 남성 음년생·여성 양년생은 역행(과거 절기 방향)으로 나아갑니다.</p>
              <p>대운이 <span className="text-primary">용신(用神)</span> 오행을 만나면 좋은 시기, <span className="text-rose-400">기신(忌神)</span> 오행을 만나면 어려운 시기가 됩니다. 각 대운 안에서도 매년 세운(歲運)에 따라 운의 강약이 조절됩니다.</p>
            </div>
          </div>
        </motion.div>
      )}

      {profileOpen && <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
