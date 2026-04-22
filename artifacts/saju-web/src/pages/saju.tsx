import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalculateSaju, useSaveSaju, useGetSavedSaju, useSubmitInquiry } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link, useSearch } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { getCurrentAge } from "@/lib/age";
import { getSajuCacheStorageKey, LEGACY_SAJU_CACHE_STORAGE_KEY } from "@/lib/profile-storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BIRTH_HOURS, getBirthHourLabel } from "@/components/ProfileModal";
import { cn, getElementStyles, getElementKor } from "@/lib/utils";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Loader2, ArrowLeft, Eye, EyeOff, ChevronRight, Sparkles, UserCircle2, Copy, CheckCheck, Share2, AlertTriangle, Shield, ShieldOff, BookMarked, Check, X, MessageCircleQuestion, Send } from "lucide-react";
import { getDayPillarAnalysis } from "@/data/dayPillarAnalysis";

// ─── 한자 변환 ───────────────────────────────────────────
const STEM_HANJA: Record<string, string> = {
  '갑':'甲','을':'乙','병':'丙','정':'丁','무':'戊',
  '기':'己','경':'庚','신':'辛','임':'壬','계':'癸',
};
const BRANCH_HANJA: Record<string, string> = {
  '자':'子','축':'丑','인':'寅','묘':'卯','진':'辰','사':'巳',
  '오':'午','미':'未','신':'申','유':'酉','술':'戌','해':'亥',
};
const toStemHanja  = (k: string) => STEM_HANJA[k]   ?? k;
const toBranchHanja = (k: string) => BRANCH_HANJA[k] ?? k;

// ─── 오행 글자색 ──────────────────────────────────────────
const ELEM_TEXT: Record<string, string> = {
  '목': 'text-emerald-400', '화': 'text-rose-400',
  '토': 'text-amber-400',   '금': 'text-slate-200', '수': 'text-blue-400',
};

// ─── 기둥 점수 (1-10) 색상 ────────────────────────────────
function pillarScoreColor(score: number): { text: string; bg: string; border: string } {
  if (score >= 9) return { text: 'text-emerald-400', bg: 'bg-emerald-400/15', border: 'border-emerald-400/40' };
  if (score >= 7) return { text: 'text-blue-400',    bg: 'bg-blue-400/15',    border: 'border-blue-400/40'    };
  if (score >= 5) return { text: 'text-amber-400',   bg: 'bg-amber-400/15',   border: 'border-amber-400/40'   };
  if (score >= 3) return { text: 'text-orange-400',  bg: 'bg-orange-400/15',  border: 'border-orange-400/40'  };
  return              { text: 'text-rose-400',    bg: 'bg-rose-400/15',    border: 'border-rose-400/40'    };
}

// ─── 일주 점수 (1-100) 색상 ──────────────────────────────
function dayScoreColor(score: number): { text: string; ring: string; label: string } {
  if (score >= 80) return { text: 'text-emerald-400', ring: 'border-emerald-400/60', label: '매우 좋음' };
  if (score >= 65) return { text: 'text-blue-400',    ring: 'border-blue-400/60',    label: '좋음'     };
  if (score >= 45) return { text: 'text-amber-400',   ring: 'border-amber-400/60',   label: '보통'     };
  if (score >= 30) return { text: 'text-orange-400',  ring: 'border-orange-400/60',  label: '주의'     };
  return               { text: 'text-rose-400',    ring: 'border-rose-400/60',    label: '불리'     };
}

// ─── 지장간 (支藏干) ─────────────────────────────────────
const JIJANGGAN: Record<string, { stem: string; element: string }[]> = {
  '자': [{ stem:'임', element:'수' }, { stem:'계', element:'수' }],
  '축': [{ stem:'계', element:'수' }, { stem:'신', element:'금' }, { stem:'기', element:'토' }],
  '인': [{ stem:'무', element:'토' }, { stem:'병', element:'화' }, { stem:'갑', element:'목' }],
  '묘': [{ stem:'갑', element:'목' }, { stem:'을', element:'목' }],
  '진': [{ stem:'을', element:'목' }, { stem:'계', element:'수' }, { stem:'무', element:'토' }],
  '사': [{ stem:'무', element:'토' }, { stem:'경', element:'금' }, { stem:'병', element:'화' }],
  '오': [{ stem:'병', element:'화' }, { stem:'기', element:'토' }, { stem:'정', element:'화' }],
  '미': [{ stem:'정', element:'화' }, { stem:'을', element:'목' }, { stem:'기', element:'토' }],
  '신': [{ stem:'무', element:'토' }, { stem:'임', element:'수' }, { stem:'경', element:'금' }],
  '유': [{ stem:'경', element:'금' }, { stem:'신', element:'금' }],
  '술': [{ stem:'신', element:'금' }, { stem:'정', element:'화' }, { stem:'무', element:'토' }],
  '해': [{ stem:'무', element:'토' }, { stem:'갑', element:'목' }, { stem:'임', element:'수' }],
};

// ─── 타입 ───────────────────────────────────────────────
interface InputForm {
  birthYear: string; birthMonth: string; birthDay: string;
  birthHour: number; birthMinute: string;
  gender: "male" | "female"; calendarType: "solar" | "lunar";
}

// 섹션 키
const SECTIONS = [
  { key: "saju",        label: "사주팔자",   icon: "☯️" },
  { key: "singang",     label: "신강/신약",   icon: "⚖️" },
  { key: "yongsin",     label: "용신 분석",   icon: "🔮" },
  { key: "geokguk",     label: "격국",        icon: "🏛️" },
  { key: "tenGods",     label: "십신·12운성", icon: "🎯" },
  { key: "shinsal",     label: "신살",        icon: "✨" },
  { key: "hapChung",    label: "합충형",      icon: "⚡" },
  { key: "daeun",       label: "대운",        icon: "🌊" },
  { key: "seun",        label: "년운",        icon: "📅" },
  { key: "samjae",      label: "삼재 체크",   icon: "🛡️" },
  { key: "yongsinItem", label: "용신 아이템", icon: "💎" },
  { key: "careful",     label: "조심할 것들", icon: "⚠️" },
  { key: "daymaster",   label: "일간 심층",   icon: "🌟" },
  { key: "career",      label: "직업 적성",   icon: "💼" },
] as const;
type SectionKey = typeof SECTIONS[number]["key"];
type ResultSource = "manual" | "profile" | "cache" | "query";

// 오행 색상 헬퍼
const ELEM_COLOR: Record<string, string> = {
  '목': 'text-green-400 border-green-500/50 bg-green-500/10',
  '화': 'text-red-400 border-red-500/50 bg-red-500/10',
  '토': 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
  '금': 'text-gray-200 border-gray-400/50 bg-gray-400/10',
  '수': 'text-blue-400 border-blue-500/50 bg-blue-500/10',
};
const ELEM_BG: Record<string, string> = {
  '목': 'bg-green-500/20 text-green-300',
  '화': 'bg-red-500/20 text-red-300',
  '토': 'bg-yellow-500/20 text-yellow-300',
  '금': 'bg-gray-400/20 text-gray-200',
  '수': 'bg-blue-500/20 text-blue-300',
};

// ─── 메인 컴포넌트 ───────────────────────────────────
export default function SajuPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);

  const [inputForm, setInputForm] = useState<InputForm>(() => {
    const y = searchParams.get("y"); const m = searchParams.get("m");
    const d = searchParams.get("d"); const h = searchParams.get("h");
    const g = searchParams.get("g"); const c = searchParams.get("c");
    if (y && m && d) {
      return {
        birthYear: y, birthMonth: m, birthDay: d,
        birthHour: h ? Number(h) : -1, birthMinute: "",
        gender: (g as any) ?? "male", calendarType: (c as any) ?? "solar",
      };
    }
    return { birthYear: "", birthMonth: "", birthDay: "", birthHour: -1, birthMinute: "", gender: "male", calendarType: "solar" };
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<Record<SectionKey, boolean>>({
    saju: true, singang: true, yongsin: true,
    geokguk: true, tenGods: true, shinsal: true, hapChung: true,
    daeun: true, seun: true, samjae: true, yongsinItem: true,
    careful: true, daymaster: true, career: true,
  });
  const [copied, setCopied] = useState(false);

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const saveLabelRef = useRef<HTMLInputElement>(null);

  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryDone, setInquiryDone] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const { profile } = useUser();
  const { mutate: calculateSaju, data: result, isPending, error } = useCalculateSaju();
  const saveMut = useSaveSaju();
  const { data: savedList } = useGetSavedSaju(isAuthenticated);
  const inquiryMut = useSubmitInquiry();

  const sajuCacheKey = user?.id ? getSajuCacheStorageKey(user.id) : null;
  const makeCacheKey = (p: typeof profile) =>
    p ? `v3/${p.birthYear}/${p.birthMonth}/${p.birthDay}/${p.birthHour}/${p.birthMinute ?? 0}/${p.gender}/${p.calendarType}` : null;

  const [displayResult, setDisplayResult] = useState<any>(null);
  const [cachedTs, setCachedTs] = useState<number | null>(null);
  const [displaySource, setDisplaySource] = useState<ResultSource | null>(null);
  const pendingResultSourceRef = useRef<ResultSource | null>(null);

  useEffect(() => {
    if (!profile || displayResult || !isAuthenticated || !sajuCacheKey) return;
    try {
      const raw = localStorage.getItem(sajuCacheKey) ?? localStorage.getItem(LEGACY_SAJU_CACHE_STORAGE_KEY);
      if (!raw) return;
      if (!localStorage.getItem(sajuCacheKey)) {
        localStorage.setItem(sajuCacheKey, raw);
      }
      localStorage.removeItem(LEGACY_SAJU_CACHE_STORAGE_KEY);
      const saved = JSON.parse(raw);
      if (saved.key === makeCacheKey(profile)) setCachedTs(saved.ts);
    } catch {}
  }, [displayResult, isAuthenticated, profile, sajuCacheKey]);

  useEffect(() => {
    if (!result) return;
    setDisplayResult(result);
    setDisplaySource(pendingResultSourceRef.current ?? "manual");
    pendingResultSourceRef.current = null;

    if (!isAuthenticated || !sajuCacheKey) return;

    try {
      const bi = result.birthInfo;
      if (!bi) return;

      const fallbackKey = `v4/${bi.year}/${bi.month}/${bi.day}/${bi.hour ?? -1}/${bi.minute ?? 0}/${bi.gender ?? "male"}/${bi.calendarType ?? "solar"}`;
      localStorage.setItem(sajuCacheKey, JSON.stringify({ key: fallbackKey, result, ts: Date.now() }));
      localStorage.removeItem(LEGACY_SAJU_CACHE_STORAGE_KEY);

      if (!profile) return;

      const isOwnProfile =
        bi.year === profile.birthYear &&
        bi.month === profile.birthMonth &&
        bi.day === profile.birthDay &&
        bi.gender === profile.gender;

      if (isOwnProfile) {
        setCachedTs(null);
      }
    } catch {}
  }, [isAuthenticated, profile, result, sajuCacheKey]);

  const loadCached = () => {
    if (!isAuthenticated || !sajuCacheKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(sajuCacheKey) ?? "{}");
      if (saved.result) {
        setDisplayResult(saved.result);
        setCachedTs(null);
        setDisplaySource("cache");
      }
    } catch {}
  };

  useEffect(() => {
    if (isAuthenticated) return;
    if (displaySource !== "profile" && displaySource !== "cache") return;
    setDisplayResult(null);
    setCachedTs(null);
    setDisplaySource(null);
  }, [displaySource, isAuthenticated]);

  const r = displayResult as any;
  const showAccountActions = isAuthenticated;

  const toggleSection = (key: SectionKey) =>
    setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleShare = () => {
    if (!r) return;
    const yp = r.yearPillar; const mp = r.monthPillar; const dp = r.dayPillar; const hp = r.hourPillar;
    const STEM_H: Record<string,string> = {갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸'};
    const BRNCH_H: Record<string,string> = {자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥'};
    const pillarStr = (stem: string, branch: string) => `${STEM_H[stem]??stem}${BRNCH_H[branch]??branch}(${stem}${branch})`;
    const hourStr = hp?.heavenlyStem && hp.heavenlyStem !== '?' ? pillarStr(hp.heavenlyStem, hp.earthlyBranch) : '시간미상';
    const divider = '─────────────────────';
    const cleanShareText = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/[.!?。！？]+$/g, '');
    const fitShareText = (s: string, len: number) => {
      const cleaned = cleanShareText(s);
      if (!cleaned) return '';
      if (cleaned.length <= len) return cleaned;

      const clauses = cleaned.split(/[,:;·]/).map(v => v.trim()).filter(Boolean);
      let combined = '';
      for (const clause of clauses) {
        const next = combined ? `${combined} · ${clause}` : clause;
        if (next.length > len) break;
        combined = next;
      }
      if (combined) return combined;

      const words = cleaned.split(/\s+/);
      let summary = '';
      for (const word of words) {
        const next = summary ? `${summary} ${word}` : word;
        if (next.length > len) break;
        summary = next;
      }

      return summary || cleaned.slice(0, len).trim();
    };
    const shareSummary = (s: string, len = 52) => {
      if (!s) return '';
      const sentences = s.split(/(?<=[.!?。！？])\s+/).map(v => v.trim()).filter(Boolean);
      const first = fitShareText(sentences[0] ?? s, len);
      if (!first) return '';
      if (first.length > Math.floor(len * 0.45) || !sentences[1]) return first;

      const second = fitShareText(sentences[1], len - first.length - 1);
      return second ? `${first} ${second}` : first;
    };

    const lines: string[] = [
      `🌙 명해원(命海苑) 사주팔자 분석`,
      divider,
      `📅 ${r.birthInfo?.year}년 ${r.birthInfo?.month}월 ${r.birthInfo?.day}일 ${r.birthInfo?.gender === 'male' ? '남성' : '여성'}`,
      ``,
      `【 사주팔자 】`,
      `  연주(年柱) ${pillarStr(yp.heavenlyStem, yp.earthlyBranch)}`,
      `  월주(月柱) ${pillarStr(mp.heavenlyStem, mp.earthlyBranch)}`,
      `  일주(日柱) ${pillarStr(dp.heavenlyStem, dp.earthlyBranch)}  ← 일간`,
      `  시주(時柱) ${hourStr}`,
      `  일간 오행: ${dp.heavenlyStem}(${r.dayMasterElement})`,
    ];

    if (r.sinGangYak) {
      lines.push('');
      lines.push(`【 신강/신약 】`);
      lines.push(`  ${r.sinGangYak.type} (강도: ${r.sinGangYak.score > 0 ? '+' : ''}${r.sinGangYak.score})`);
      if (r.sinGangYak.description) lines.push(`  ${shareSummary(r.sinGangYak.description)}`);
      if (r.sinGangYak.advice)      lines.push(`  💡 ${shareSummary(r.sinGangYak.advice, 44)}`);
    }

    if (r.yongsin) {
      lines.push('');
      lines.push(`【 용신/기신 】`);
      lines.push(`  용신(用神): ${r.yongsin.yongsin}  |  희신(喜神): ${r.yongsin.heegsin}  |  기신(忌神): ${r.yongsin.geesin}`);
      if (r.yongsin.advice)      lines.push(`  ${shareSummary(r.yongsin.advice)}`);
      if (r.yongsin.luckyColors?.length) lines.push(`  행운 색상: ${r.yongsin.luckyColors.join(', ')}`);
    }

    if (r.personality || r.fortune) {
      lines.push('');
      lines.push(`【 일간 심층 분석 】`);
      if (r.personality) lines.push(`  성향: ${shareSummary(r.personality, 44)}`);
      if (r.fortune)     lines.push(`  총운: ${shareSummary(r.fortune, 44)}`);
      if (r.love)        lines.push(`  애정: ${shareSummary(r.love, 40)}`);
      if (r.health)      lines.push(`  건강: ${shareSummary(r.health, 40)}`);
    }

    if (r.career) {
      lines.push('');
      lines.push(`【 직업 적성 】`);
      lines.push(`  ${shareSummary(r.career, 56)}`);
    }

    if (r.samjae) {
      lines.push('');
      lines.push(`【 삼재 】`);
      if (r.samjae.inSamjae) {
        lines.push(`  ⚠️ ${r.samjae.type} (${r.samjae.samjaeYears?.join('·')}년)`);
        if (r.samjae.description) lines.push(`  ${shareSummary(r.samjae.description, 44)}`);
        if (r.samjae.advice)      lines.push(`  💡 ${shareSummary(r.samjae.advice, 44)}`);
      } else {
        lines.push(`  ✅ 현재 삼재 해당 없음`);
        if (r.samjae.nextSamjae)  lines.push(`  다음 삼재: ${r.samjae.nextSamjae}년`);
      }
    }

    lines.push('');
    lines.push(divider);
    lines.push(`🌐 명해원(命海苑)에서 무료로 사주를 분석해보세요`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const year = parseInt(inputForm.birthYear);
    const month = parseInt(inputForm.birthMonth);
    const day = parseInt(inputForm.birthDay);
    if (!inputForm.birthYear || isNaN(year) || year < 1900 || year > 2100) { setFormError("년도를 올바르게 입력해주세요. (1900~2100)"); return; }
    if (!inputForm.birthMonth || isNaN(month) || month < 1 || month > 12)   { setFormError("월을 올바르게 입력해주세요. (1~12)"); return; }
    if (!inputForm.birthDay   || isNaN(day)   || day < 1   || day > 31)     { setFormError("일을 올바르게 입력해주세요. (1~31)"); return; }
    const minute = inputForm.birthMinute ? parseInt(inputForm.birthMinute) : 0;
    pendingResultSourceRef.current = "manual";
    calculateSaju({ data: { birthYear: year, birthMonth: month, birthDay: day, birthHour: inputForm.birthHour, birthMinute: isNaN(minute) ? 0 : minute, gender: inputForm.gender, calendarType: inputForm.calendarType } });
  };

  const handleProfileAnalyze = useCallback(() => {
    if (!profile) return;
    pendingResultSourceRef.current = "profile";
    calculateSaju({
      data: {
        birthYear: profile.birthYear,
        birthMonth: profile.birthMonth,
        birthDay: profile.birthDay,
        birthHour: profile.birthHour,
        birthMinute: profile.birthMinute ?? 0,
        gender: profile.gender,
        calendarType: profile.calendarType,
      },
    });
  }, [profile, calculateSaju]);

  const handleSave = async () => {
    if (!r) return;
    const bi = r.birthInfo ?? {};
    await saveMut.mutateAsync({
      label: saveLabel.trim() || "내 사주",
      birthInfo: {
        year: bi.year ?? parseInt(inputForm.birthYear),
        month: bi.month ?? parseInt(inputForm.birthMonth),
        day: bi.day ?? parseInt(inputForm.birthDay),
        hour: bi.hour ?? inputForm.birthHour,
        gender: bi.gender ?? inputForm.gender,
        calendarType: bi.calendarType ?? inputForm.calendarType,
      },
    });
    setJustSaved(true);
    setShowSaveForm(false);
    setSaveLabel("");
    setTimeout(() => setJustSaved(false), 4000);
  };

  const handleInquirySubmit = async () => {
    if (!inquiryMessage.trim() || inquiryMut.isPending) return;
    const bi = r?.birthInfo ?? {};
    const dp = r?.dayPillar;
    const summary = r?.yongsin?.explanation?.slice(0, 100) ?? "";
    await inquiryMut.mutateAsync({
      message: inquiryMessage.trim(),
      inquiryType: "saju",
      userLabel: bi.year ? `${bi.year}년 ${bi.gender === 'male' ? '남' : '여'}` : undefined,
      sajuSnapshot: r ? {
        birthYear: bi.year,
        birthMonth: bi.month,
        birthDay: bi.day,
        birthHour: bi.hour,
        gender: bi.gender,
        calendarType: bi.calendarType,
        dayPillarStem: dp?.heavenlyStem,
        sajuSummary: summary,
      } : undefined,
    });
    setInquiryMessage("");
    setInquiryDone(true);
    setTimeout(() => {
      setShowInquiryModal(false);
      setInquiryDone(false);
    }, 2500);
  };

  useEffect(() => {
    const y = searchParams.get("y"); const m = searchParams.get("m"); const d = searchParams.get("d");
    if (y && m && d && !displayResult) {
      const h = searchParams.get("h"); const g = searchParams.get("g"); const c = searchParams.get("c");
      const minute = 0;
      pendingResultSourceRef.current = "query";
      calculateSaju({ data: {
        birthYear: parseInt(y), birthMonth: parseInt(m), birthDay: parseInt(d),
        birthHour: h ? parseInt(h) : -1, birthMinute: minute,
        gender: (g as any) ?? "male", calendarType: (c as any) ?? "solar",
      }});
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "birthHour") setInputForm(prev => ({ ...prev, birthHour: Number(value) }));
    else setInputForm(prev => ({ ...prev, [name]: value }));
  };

  // ─── 입력 폼 ───────────────────────────────────────
  if (!r) return (
    <div className="max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold mb-4">사주 분석 (四柱)</h1>
            <p className="text-muted-foreground text-lg">태어난 시간을 입력하여 타고난 운명의 흐름을 확인하세요.</p>
          </div>

          {/* 이전 분석 결과 캐시 배너 */}
          {cachedTs && profile && !r && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-4"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm">
                <span className="text-amber-300/90">
                  ⏱ 이전 분석 결과가 있습니다 ({(() => { const m = Math.round((Date.now() - cachedTs) / 60000); return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m/60)}시간 전` : `${Math.floor(m/1440)}일 전`; })()})
                </span>
                <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shrink-0" onClick={loadCached}>
                  결과 불러오기
                </Button>
              </div>
            </motion.div>
          )}

          {/* 등록된 프로필 바로 분석 카드 */}
          {profile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto mb-6"
            >
              <div className="glass-panel border border-primary/40 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <UserCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-0.5">등록된 사주</p>
                    <p className="font-medium text-foreground truncate">
                      {profile.name ? `${profile.name} · ` : ""}
                      {profile.birthYear}년 {profile.birthMonth}월 {profile.birthDay}일
                      {profile.birthHour >= 0 ? ` ${getBirthHourLabel(profile.birthHour).split(' ')[0]}` : ""}
                      {" "}({profile.gender === "male" ? "남" : "여"} · {profile.calendarType === "solar" ? "양력" : "음력"})
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleProfileAnalyze}
                  disabled={isPending}
                  className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  {isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />분석 중...</>
                    : <><Sparkles className="w-4 h-4" />내 사주 보기</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* 직접 입력 폼 */}
          {!profile && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-6"
            >
              <div className="glass-panel border border-primary/20 rounded-2xl p-5 text-center">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  프로필을 등록하면 만세력, 월운, 길일 달력 등에서 개인화 분석이 이어집니다.
                  프로필 없이도 아래에서 바로 사주 분석을 할 수 있습니다.
                </p>
              </div>
            </motion.div>
          )}

          <Card className="max-w-2xl mx-auto glass-panel border-primary/30">
            <CardHeader>
              <CardTitle className="text-center text-3xl font-serif text-primary mb-2">
                {profile ? "다른 사주 직접 입력" : "정보 입력"}
              </CardTitle>
              <CardDescription className="text-center">
                정각을 모르면 시간은 비워둔 채로도 분석할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[{ label:"달력 종류", name:"calendarType", opts:[{v:"solar",l:"양력"},{v:"lunar",l:"음력"}], val:inputForm.calendarType },
                    { label:"성별", name:"gender", opts:[{v:"male",l:"남성"},{v:"female",l:"여성"}], val:inputForm.gender }
                  ].map(({ label, name, opts, val }) => (
                    <div key={name} className="space-y-3">
                      <label className="text-sm font-medium text-foreground/80 block">{label}</label>
                      <div className="flex bg-background/50 rounded-xl p-1 border border-primary/20">
                        {opts.map(o => (
                          <button key={o.v} type="button"
                            onClick={() => setInputForm(prev => ({ ...prev, [name]: o.v as any }))}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${val === o.v ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[{name:"birthYear",label:"년 (Year)",ph:"예) 1990",min:1900,max:2100},
                    {name:"birthMonth",label:"월 (Month)",ph:"1~12",min:1,max:12},
                    {name:"birthDay",label:"일 (Day)",ph:"1~31",min:1,max:31}
                  ].map(f => (
                    <div key={f.name} className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">{f.label}</label>
                      <Input type="number" name={f.name} value={(inputForm as any)[f.name]} onChange={handleChange}
                        placeholder={f.ph} min={f.min} max={f.max} className="placeholder:text-muted-foreground/40" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">시 (Hour)</label>
                    <Select value={String(inputForm.birthHour)} onValueChange={v => setInputForm(prev => ({ ...prev, birthHour: Number(v) }))}>
                      <SelectTrigger className="h-12 rounded-xl border-primary/20 bg-input text-foreground focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BIRTH_HOURS.map(h => (
                          <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">분 (Minute)</label>
                    <Input type="number" name="birthMinute" value={inputForm.birthMinute} onChange={handleChange}
                      placeholder="0~59" min={0} max={59} disabled={inputForm.birthHour === -1} className="placeholder:text-muted-foreground/40" />
                  </div>
                </div>
                {(formError || error) && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {formError || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}
                  </div>
                )}
                <Button type="submit" size="lg" className="w-full text-lg mt-4" disabled={isPending}>
                  {isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 운명의 수레바퀴 돌리는 중...</> : "사주 확인하기"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  // ─── 결과 화면 ───────────────────────────────────
  const bi = r.birthInfo ?? {};
  const currentAge = r?.birthInfo
    ? getCurrentAge(r.birthInfo.year, r.birthInfo.month, r.birthInfo.day)
    : null;

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>

        {/* 헤더 */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <h2 className="text-3xl font-serif text-primary">사주 분석 결과</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {showAccountActions && (
              justSaved ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                  <Check className="w-4 h-4" /> 저장됨
                </span>
              ) : showSaveForm ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={saveLabelRef}
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowSaveForm(false); }}
                    placeholder="이름 입력 (예: 내 사주, 엄마 사주)"
                    className="h-8 text-sm w-44"
                    maxLength={50}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSave} disabled={saveMut.isPending} className="gap-1 h-8">
                    {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    저장
                  </Button>
                  <button onClick={() => setShowSaveForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setShowSaveForm(true); setSaveLabel(""); setTimeout(() => saveLabelRef.current?.focus(), 50); }}
                  className="gap-2"
                  disabled={(savedList?.length ?? 0) >= 20}
                >
                  <BookMarked className="w-4 h-4" />
                  {(savedList?.length ?? 0) >= 20 ? "저장 한도 초과" : "사주 저장"}
                </Button>
              )
            )}
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              {copied ? <><CheckCheck className="w-4 h-4 text-green-400" />복사됨</> : <><Share2 className="w-4 h-4" />결과 공유</>}
            </Button>
            {showAccountActions && (
              <Button
                variant="outline" size="sm"
                onClick={() => setShowInquiryModal(true)}
                className="gap-2 border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
              >
                <MessageCircleQuestion className="w-4 h-4" />
                문의하기
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { setDisplayResult(null); setDisplaySource(null); }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> 다시 분석
            </Button>
          </div>
        </div>

        {/* 섹션 토글 버튼 */}
        <div className="flex flex-wrap gap-2 mb-8 p-4 glass-panel rounded-2xl border border-primary/20">
          <span className="text-sm text-muted-foreground self-center mr-2">섹션 필터:</span>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => toggleSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                visibleSections[s.key]
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-muted/30 border-transparent text-muted-foreground'
              }`}>
              <span>{s.icon}</span>
              {s.label}
              {visibleSections[s.key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          ))}
        </div>

        <div className="space-y-8">

          {/* ── 사주팔자 + 오행 ── */}
          {visibleSections.saju && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <SectionHeader icon="☯️" title="사주팔자 (四柱八字)" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 glass-panel border-primary/30 p-8">
                  <div className="grid grid-cols-4 gap-4 md:gap-8 max-w-2xl mx-auto text-center">
                    {([
                      { label:"시주(시간)", p: r.hourPillar,  scoreKey: "hour" as const, isDay: false },
                      { label:"일주(나)",   p: r.dayPillar,   scoreKey: "day"  as const, isDay: true  },
                      { label:"월주(부모)", p: r.monthPillar, scoreKey: "month"as const, isDay: false },
                      { label:"년주(조상)", p: r.yearPillar,  scoreKey: "year" as const, isDay: false },
                    ] as const).map((item, idx) => {
                      const ps: number | null = r.pillarScores?.[item.scoreKey] ?? null;
                      const pColor = ps != null ? pillarScoreColor(ps) : null;
                      const dayScore: number | null = item.isDay ? (r.dayPillarScore ?? null) : null;
                      const dColor = dayScore != null ? dayScoreColor(dayScore) : null;
                      return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                        {item.p && item.p.heavenlyStem !== "?" ? (
                          <div className="flex flex-col gap-2 w-full">
                            <div className={`w-full aspect-square rounded-full flex flex-col items-center justify-center border-2 ${getElementStyles(item.p.heavenlyStemElement)}`}>
                              <span className="text-2xl md:text-3xl font-serif font-bold">{toStemHanja(item.p.heavenlyStem)}</span>
                              <span className="text-[10px] opacity-70">{item.p.heavenlyStemElement}</span>
                            </div>
                            <div className={`w-full aspect-square rounded-full flex flex-col items-center justify-center border-2 ${getElementStyles(item.p.earthlyBranchElement)}`}>
                              <span className="text-2xl md:text-3xl font-serif font-bold">{toBranchHanja(item.p.earthlyBranch)}</span>
                              <span className="text-[10px] opacity-70">{item.p.earthlyBranchElement}</span>
                            </div>
                            {/* 지장간 */}
                            <div className="flex flex-col items-center gap-0.5 pt-0.5">
                              <span className="text-[9px] text-muted-foreground/50 tracking-wide">지장간</span>
                              <div className="flex items-center gap-1.5">
                                {(JIJANGGAN[item.p.earthlyBranch] ?? []).map((jj, ji) => (
                                  <span key={ji} className={`text-sm font-serif font-bold leading-none ${ELEM_TEXT[jj.element] ?? 'text-foreground/70'}`}
                                    title={jj.element}>
                                    {toStemHanja(jj.stem)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {/* 기둥 점수 1-10 */}
                            {pColor && ps != null && (
                              <div className={`mt-1 w-full rounded-lg border px-1 py-1 text-center ${pColor.bg} ${pColor.border}`}>
                                <span className={`text-xs font-bold ${pColor.text}`}>{ps}/10</span>
                              </div>
                            )}
                            {/* 일주 전용 점수 1-100 */}
                            {item.isDay && dColor && dayScore != null && (
                              <div className={`w-full rounded-xl border-2 px-2 py-2 text-center ${dColor.ring} bg-background/40`}>
                                <div className={`text-lg font-serif font-bold leading-none ${dColor.text}`}>{dayScore}</div>
                                <div className={`text-[9px] mt-0.5 ${dColor.text} opacity-80`}>{dColor.label}</div>
                                <div className="text-[8px] text-muted-foreground/50">/ 100</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 opacity-40">
                            {[0,1].map(i=><div key={i} className="w-full aspect-square rounded-full bg-muted border-2 border-dashed flex items-center justify-center text-xl">?</div>)}
                          </div>
                        )}
                      </div>
                    );})}
                  </div>
                </Card>
                <Card className="glass-panel border-primary/30 p-6 flex flex-col">
                  <h3 className="text-lg font-serif mb-3 text-primary text-center">오행 분석 (五行)</h3>
                  <div className="flex-1 min-h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { subject:'목(木)', A: r.elementBalance.wood,  fullMark:4 },
                        { subject:'화(火)', A: r.elementBalance.fire,  fullMark:4 },
                        { subject:'토(土)', A: r.elementBalance.earth, fullMark:4 },
                        { subject:'금(金)', A: r.elementBalance.metal, fullMark:4 },
                        { subject:'수(水)', A: r.elementBalance.water, fullMark:4 },
                      ]}>
                        <PolarGrid stroke="rgba(212,175,55,0.2)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill:'hsl(var(--foreground))', fontSize:11 }} />
                        <PolarRadiusAxis angle={30} domain={[0,4]} tick={false} axisLine={false} />
                        <Radar dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      {Object.entries(r.elementBalance).map(([eng, cnt]: [string, any]) => {
                        const kor = {wood:'목',fire:'화',earth:'토',metal:'금',water:'수'}[eng] ?? eng;
                        return (
                          <div key={eng} className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${ELEM_COLOR[kor]}`}>{kor}</span>
                            <span className="text-xs text-muted-foreground">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 flex-wrap mt-1">
                      <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs border border-primary/30">강한: {getElementKor(r.dominantElement)}</span>
                      <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs border border-destructive/30">부족: {getElementKor(r.lackingElement)}</span>
                    </div>
                  </div>
                </Card>
              </div>
              {/* 행운 정보 */}
              <Card className="glass-panel border-accent/30 bg-accent/5 mt-4">
                <CardContent className="pt-5 flex flex-col md:flex-row items-center justify-around gap-4">
                  <div className="text-center"><div className="text-xs text-muted-foreground mb-1">행운의 숫자</div><div className="text-xl font-serif text-accent font-bold">{r.luckyNumbers?.join(", ")}</div></div>
                  <div className="w-px h-8 bg-accent/20 hidden md:block" />
                  <div className="text-center"><div className="text-xs text-muted-foreground mb-1">행운의 색상</div><div className="flex gap-2">{r.luckyColors?.map((c:string,i:number)=><span key={i} className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs border border-accent/30">{c}</span>)}</div></div>
                  <div className="w-px h-8 bg-accent/20 hidden md:block" />
                  <div className="text-center"><div className="text-xs text-muted-foreground mb-1">행운의 방향</div><div className="text-lg font-serif text-accent">{r.luckyDirections?.join(", ")}</div></div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 일주 심층 분석 카드 (사주팔자 바로 아래) ── */}
          {r?.dayPillar && (() => {
            const stem   = r.dayPillar?.heavenlyStem;
            const branch = r.dayPillar?.earthlyBranch;
            const analysis = stem && branch ? getDayPillarAnalysis(stem, branch) : undefined;
            if (!analysis) return null;
            const dayPillarQuery = `${stem}${branch}`;
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Card className="glass-panel border-amber-400/30">
                  <CardHeader className="pb-3 border-b border-amber-400/15">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-amber-300">
                        <span className="text-xl font-serif">{analysis.hanja}</span>
                        <span className="text-base font-medium">{analysis.title} 분석</span>
                        <span className="text-xs font-normal text-muted-foreground bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">일주 고전 해석</span>
                      </CardTitle>
                      {isAdmin && (
                        <Link
                          href={`/day-pillar-analysis?q=${encodeURIComponent(dayPillarQuery)}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary hover:bg-primary/10 transition-colors"
                        >
                          관리자 검색으로 보기
                        </Link>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                      {analysis.text}
                    </div>
                    <p className="mt-4 text-[11px] text-muted-foreground/50 border-t border-white/5 pt-3">
                      * 일주 분석은 개인의 성향·경향을 참고하는 자료이며, 전체 사주팔자와 종합하여 해석해야 합니다.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* ── 신강/신약 ── */}
          {visibleSections.singang && r.sinGangYak && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
              <SectionHeader icon="⚖️" title="사주 강약 (신강/신약)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center justify-center md:w-48">
                      <div className={`text-5xl font-serif font-bold mb-2 ${
                        r.sinGangYak.type === '신강' ? 'text-red-400' : r.sinGangYak.type === '신약' ? 'text-blue-400' : 'text-yellow-400'
                      }`}>{r.sinGangYak.type}</div>
                      <div className="text-sm text-muted-foreground">신강도: {r.sinGangYak.score > 0 ? '+' : ''}{r.sinGangYak.score}</div>
                      {/* 게이지 */}
                      <div className="w-full mt-3 h-3 rounded-full bg-muted relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-red-500"
                          style={{ width: `${Math.max(5, Math.min(95, 50 + r.sinGangYak.score * 4))}%` }} />
                        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
                      </div>
                      <div className="flex justify-between w-full text-xs text-muted-foreground mt-1"><span>신약</span><span>신강</span></div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="text-foreground/90">{r.sinGangYak.description}</p>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="text-sm font-medium text-primary mb-1">조언</div>
                        <p className="text-sm text-foreground/80">{r.sinGangYak.advice}</p>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground/60 mb-2">적합한 분야</div>
                        <div className="flex flex-wrap gap-2">
                          {r.sinGangYak.suitable?.map((s:string, i:number) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-accent/15 text-accent text-xs border border-accent/30">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-foreground/70">
                        ⚠️ {r.sinGangYak.caution}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 용신 분석 ── */}
          {visibleSections.yongsin && r.yongsin && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
              <SectionHeader icon="🔮" title="용신 분석 (用神)" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label:"용신 (用神)", subtitle:"반드시 보충해야 할 기운", elem: r.yongsin.yongsin, positive: true },
                  { label:"희신 (喜神)", subtitle:"도움이 되는 기운", elem: r.yongsin.heegsin, positive: true },
                  { label:"기신 (忌神)", subtitle:"주의해야 할 기운", elem: r.yongsin.geesin, positive: false },
                ].map(({ label, subtitle, elem, positive }) => (
                  <Card key={label} className={`glass-panel border-primary/20 text-center p-6 ${!positive ? 'border-destructive/20' : ''}`}>
                    <div className="text-sm text-muted-foreground mb-1">{label}</div>
                    <div className={`text-4xl font-serif font-bold mb-1 ${ELEM_COLOR[elem]?.split(' ')[0]}`}>{elem}</div>
                    <div className="text-xs text-muted-foreground">{subtitle}</div>
                    {positive && <div className={`mt-3 inline-block px-3 py-1 rounded-full text-xs ${ELEM_BG[elem]}`}>{elem}(을)를 보충하세요</div>}
                    {!positive && <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs bg-destructive/15 text-destructive/80">{elem} 기운을 자제하세요</div>}
                  </Card>
                ))}
              </div>
              <Card className="glass-panel border-primary/20 mt-4">
                <CardContent className="pt-5 space-y-3">
                  <p className="text-foreground/80">{r.yongsin.advice}</p>
                  <p className="text-foreground/60 text-sm">{r.yongsin.avoidAdvice}</p>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">행운의 색상 (용신 기반)</div>
                      <div className="flex gap-2">{r.yongsin.luckyColors?.map((c:string,i:number)=><span key={i} className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">{c}</span>)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">행운의 방위 (용신 기반)</div>
                      <div className="flex gap-2">{r.yongsin.luckyDirections?.map((d:string,i:number)=><span key={i} className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">{d}</span>)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 격국 (格局) ── */}
          {visibleSections.geokguk && r.geokguk && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.07 }}>
              <SectionHeader icon="🏛️" title="격국 분석 (格局)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center justify-center md:w-52 shrink-0">
                      <div className="text-4xl mb-2">
                        {r.geokguk.tenGod === '정관' || r.geokguk.tenGod === '편관' ? '⚖️'
                          : r.geokguk.tenGod === '정재' || r.geokguk.tenGod === '편재' ? '💰'
                          : r.geokguk.tenGod === '정인' || r.geokguk.tenGod === '편인' ? '📚'
                          : r.geokguk.tenGod === '식신' ? '🍀'
                          : r.geokguk.tenGod === '상관' ? '🎭'
                          : r.geokguk.tenGod === '비견' ? '🌲'
                          : r.geokguk.tenGod === '겁재' ? '⚔️' : '🔮'}
                      </div>
                      <div className="text-2xl font-serif font-bold text-primary mb-1">{r.geokguk.name}</div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border mb-2 ${
                        r.geokguk.power === '강' ? 'bg-green-500/20 text-green-300 border-green-500/40'
                          : r.geokguk.power === '약' ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                      }`}>
                        격국 강도: {r.geokguk.power}
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 ${
                        r.geokguk.tenGod === '정관' || r.geokguk.tenGod === '편관' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : r.geokguk.tenGod === '정재' || r.geokguk.tenGod === '편재' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                          : r.geokguk.tenGod === '정인' || r.geokguk.tenGod === '편인' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : r.geokguk.tenGod === '식신' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : r.geokguk.tenGod === '상관' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                          : 'bg-primary/20 text-primary border-primary/40'
                      }`}>
                        월령 십신: {r.geokguk.tenGod}
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="text-foreground/90 leading-relaxed">{r.geokguk.description}</p>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="text-sm font-medium text-primary mb-1.5">✅ 격국 조언 & 적합 분야</div>
                        <p className="text-sm text-foreground/80">{r.geokguk.advice}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 십신 & 12운성 ── */}
          {visibleSections.tenGods && r.pillarTenGods && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
              <SectionHeader icon="🎯" title="십신 & 12운성 (十神·十二運星)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground mb-4 p-3 rounded-lg bg-muted/20 border border-primary/10">
                    <strong className="text-primary">십신(十神)</strong>은 일간(나)과 각 기둥 천간·지장간의 오행 관계를 나타내며,
                    <strong className="text-accent"> 12운성</strong>은 일간의 기운이 각 지지에서 어떤 생애 단계에 있는지를 보여줍니다.
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {([
                      { label: '년주(年柱)',  pillar: r.yearPillar,  tg: r.pillarTenGods?.year },
                      { label: '월주(月柱)',  pillar: r.monthPillar, tg: r.pillarTenGods?.month },
                      { label: '일주(日柱)',  pillar: r.dayPillar,   tg: r.pillarTenGods?.day  },
                      { label: '시주(時柱)',  pillar: r.hourPillar,  tg: r.pillarTenGods?.hour },
                    ] as const).map(({ label, pillar, tg }, idx) => {
                      if (!pillar || pillar.heavenlyStem === '?' || !tg) return (
                        <div key={idx} className="rounded-xl border border-dashed border-primary/20 p-3 flex items-center justify-center text-muted-foreground/40 text-sm h-40">
                          시간 미입력
                        </div>
                      );
                      const TG_COLOR: Record<string, string> = {
                        '비견':'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        '겁재':'bg-green-600/20 text-green-300 border-green-600/40',
                        '식신':'bg-orange-400/20 text-orange-300 border-orange-400/40',
                        '상관':'bg-red-400/20 text-red-300 border-red-400/40',
                        '편재':'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                        '정재':'bg-amber-400/20 text-amber-300 border-amber-400/40',
                        '편관':'bg-purple-500/20 text-purple-300 border-purple-500/40',
                        '정관':'bg-indigo-400/20 text-indigo-300 border-indigo-400/40',
                        '편인':'bg-sky-500/20 text-sky-300 border-sky-500/40',
                        '정인':'bg-blue-400/20 text-blue-300 border-blue-400/40',
                      };
                      const US_COLOR = (stage: string) =>
                        stage === '제왕' ? 'text-yellow-400'
                          : ['장생','관대','건록'].includes(stage) ? 'text-emerald-400'
                          : ['목욕','쇠','병','사','묘'].includes(stage) ? 'text-red-400/80'
                          : 'text-blue-400/80';
                      const stemGodColor = TG_COLOR[tg.stemGod] ?? 'bg-primary/20 text-primary border-primary/40';
                      return (
                        <div key={idx} className="rounded-xl border border-primary/20 bg-background/40 p-3 flex flex-col gap-2">
                          <div className="text-xs text-muted-foreground text-center font-medium">{label}</div>
                          {/* 천간 */}
                          <div className="flex items-center justify-between gap-2">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-serif font-bold text-lg border ${getElementStyles(pillar.heavenlyStemElement)}`}>
                              {toStemHanja(pillar.heavenlyStem)}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${stemGodColor}`}>
                              {tg.stemGod}
                            </span>
                          </div>
                          {/* 지지 + 12운성 */}
                          <div className="flex items-center justify-between gap-2">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-serif font-bold text-lg border ${getElementStyles(pillar.earthlyBranchElement)}`}>
                              {toBranchHanja(pillar.earthlyBranch)}
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-sm font-bold font-serif ${US_COLOR(tg.unseong.stage)}`}>
                                {tg.unseong.icon} {tg.unseong.stage}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70">{tg.unseong.desc.slice(0, 14)}</span>
                            </div>
                          </div>
                          {/* 지장간 십신 */}
                          {tg.branchHidden && tg.branchHidden.length > 0 && (
                            <div className="border-t border-primary/10 pt-1.5 flex flex-wrap gap-1">
                              <span className="text-[9px] text-muted-foreground/50 w-full">지장간:</span>
                              {tg.branchHidden.map((bh: any, bi: number) => (
                                <span key={bi} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TG_COLOR[bh.god] ?? 'bg-primary/10 text-primary border-primary/20'}`}>
                                  {toStemHanja(bh.stem)} {bh.god}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* 십신 범례 */}
                  <div className="mt-5 p-4 rounded-xl bg-muted/20 border border-primary/10">
                    <div className="text-xs font-medium text-primary mb-3">십신(十神) 범례</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        { name:'비견', desc:'동료·독립', color:'bg-emerald-500/20 text-emerald-300' },
                        { name:'겁재', desc:'경쟁·탈재', color:'bg-green-600/20 text-green-300' },
                        { name:'식신', desc:'창의·복록', color:'bg-orange-400/20 text-orange-300' },
                        { name:'상관', desc:'재능·반항', color:'bg-red-400/20 text-red-300' },
                        { name:'편재', desc:'사업·투기', color:'bg-yellow-500/20 text-yellow-300' },
                        { name:'정재', desc:'안정 재물', color:'bg-amber-400/20 text-amber-300' },
                        { name:'편관', desc:'권위·도전', color:'bg-purple-500/20 text-purple-300' },
                        { name:'정관', desc:'명예·규범', color:'bg-indigo-400/20 text-indigo-300' },
                        { name:'편인', desc:'직관·종교', color:'bg-sky-500/20 text-sky-300' },
                        { name:'정인', desc:'학문·어머니', color:'bg-blue-400/20 text-blue-300' },
                      ].map(({ name, desc, color }) => (
                        <div key={name} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${color} bg-opacity-50`}>
                          <span className="font-semibold text-xs">{name}</span>
                          <span className="text-[10px] opacity-70">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 신살 (神煞) ── */}
          {visibleSections.shinsal && r.shinsal && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.09 }}>
              <SectionHeader icon="✨" title="신살 분석 (神煞)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-5 p-3 rounded-lg bg-muted/20 border border-primary/10">
                    신살(神煞)은 사주 속에 숨어 있는 특별한 에너지 기운입니다.
                    길신(吉神)은 삶을 빛나게 하는 힘이고, 흉살(凶殺)은 주의가 필요한 영역을 알려줍니다.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(r.shinsal as any[]).map((item: any, idx: number) => (
                      <div key={idx} className={`rounded-xl border p-4 transition-all ${
                        item.found
                          ? 'border-primary/40 bg-primary/8'
                          : 'border-muted/30 bg-muted/10 opacity-60'
                      }`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`font-serif font-bold text-base ${item.found ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {item.name}
                              </span>
                              <span className="text-xs text-muted-foreground/60">({item.hanja})</span>
                              {item.found ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/20 text-primary border border-primary/40">
                                  📍 {item.foundIn?.join('·')}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] text-muted-foreground/50 border border-muted/30">
                                  없음
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed mb-2">{item.description}</p>
                            {item.advice && (
                              <div className="text-xs text-primary/80 bg-primary/5 rounded-lg px-2.5 py-1.5 border border-primary/15">
                                💡 {item.advice}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 합충형파해 (合冲刑破害) ── */}
          {visibleSections.hapChung && r.hapChung && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <SectionHeader icon="⚡" title="합충형 관계 (合冲刑害)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-5 p-3 rounded-lg bg-muted/20 border border-primary/10">
                    사주 4기둥 간의 천간·지지 상호작용입니다.
                    합(合)은 기운이 합쳐지는 긍정적 작용, 충(沖)·형(刑)·해(害)는 기운이 충돌하거나 방해받는 것을 의미합니다.
                  </p>
                  {(r.hapChung as any[]).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground/50">
                      <div className="text-3xl mb-2">☯️</div>
                      <p>사주 기둥 간의 특이한 충돌이나 합 관계가 없습니다.<br />
                      <span className="text-sm">균형 잡힌 사주입니다.</span></p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {(r.hapChung as any[]).map((item: any, idx: number) => {
                        const typeColor =
                          item.type === '삼형살' ? 'border-red-700/40 bg-red-700/8'
                          : item.type === '지지방합' ? 'border-blue-500/40 bg-blue-500/8'
                          : item.type.includes('합') ? 'border-emerald-500/40 bg-emerald-500/8'
                          : item.type.includes('충') ? 'border-red-500/40 bg-red-500/8'
                          : item.type.includes('형') ? 'border-orange-500/40 bg-orange-500/8'
                          : 'border-yellow-500/40 bg-yellow-500/8';
                        const typeLabel: Record<string, { icon: string; color: string }> = {
                          '천간합':  { icon: '🤝', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                          '천간충':  { icon: '⚡', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
                          '지지삼합':{ icon: '🌀', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
                          '지지육합':{ icon: '💞', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
                          '지지방합':{ icon: '🧭', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                          '지지충':  { icon: '💥', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                          '지지형':  { icon: '⚠️', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
                          '삼형살':  { icon: '🔱', color: 'bg-red-700/20 text-red-300 border-red-700/40' },
                          '지지해':  { icon: '🩸', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
                        };
                        const tl = typeLabel[item.type] ?? { icon: '•', color: 'bg-primary/20 text-primary border-primary/40' };
                        return (
                          <div key={idx} className={`rounded-xl border p-4 ${typeColor}`}>
                            <div className="flex items-start gap-3">
                              <span className="text-xl shrink-0 mt-0.5">{tl.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tl.color}`}>
                                    {item.type}
                                  </span>
                                  <span className="text-sm font-medium text-foreground/80">
                                    {item.pillars?.join(' ↔ ')}
                                  </span>
                                  {item.result && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ELEM_BG[item.result] ?? 'bg-primary/20 text-primary'}`}>
                                      → {item.result} 오행
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground/70 leading-relaxed">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 대운 타임라인 ── */}
          {visibleSections.daeun && r.daeun && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <SectionHeader icon="🌊" title="대운 타임라인 (大運)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <span>{r.daeun.isForward ? '순행(順行)' : '역행(逆行)'}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>첫 대운 시작 나이: <strong className="text-primary">{r.daeun.startAge}세</strong></span>
                    {typeof currentAge === 'number' && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span>현재 나이: <strong className="text-primary">{currentAge}세</strong></span>
                      </>
                    )}
                    <span className="text-muted-foreground text-xs">(3일 = 1년 환산)</span>
                  </div>
                  <div className="space-y-3">
                    {r.daeun.periods?.map((p: any) => {
                      const isNow = typeof currentAge === 'number' && currentAge >= p.startAge && currentAge <= p.endAge;
                      return (
                        <div key={p.idx} className={`relative flex gap-4 p-4 rounded-xl border transition-all ${isNow ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/10' : 'border-primary/15 bg-primary/3 hover:border-primary/30'}`}>
                          {isNow && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
                          <div className="flex-shrink-0 w-20 text-center">
                            <div className="text-xs text-muted-foreground">{p.startYear}~{p.endYear}</div>
                            <div className="text-lg font-bold text-foreground/60">{p.startAge}~{p.endAge}세</div>
                            {isNow && <div className="text-xs text-primary font-medium mt-0.5">◀ 현재</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 text-lg font-serif font-bold ${ELEM_COLOR[p.stemElement]}`}>{toStemHanja(p.stem)}</div>
                            <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 text-lg font-serif font-bold ${ELEM_COLOR[p.branchElement]}`}>{toBranchHanja(p.branch)}</div>
                          </div>
                          <div className="flex-1 flex items-center">
                            <p className="text-sm text-foreground/75">{p.fortune}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 세운 (년운) ── */}
          {visibleSections.seun && r.seun && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}>
              <SectionHeader icon="📅" title="년운 · 세운 (歲運)" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {r.seun?.map((s: any) => {
                      const isNow = s.isCurrent;
                      return (
                        <div key={s.year} className={`p-3 rounded-xl border text-sm transition-all ${isNow ? 'border-primary/70 bg-primary/15 shadow-md' : 'border-primary/15 hover:border-primary/30'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-foreground">{s.year}년</span>
                            <span className="text-muted-foreground text-xs">{s.age}세</span>
                            {isNow && <span className="ml-auto text-xs text-primary font-medium bg-primary/20 px-2 py-0.5 rounded-full">올해</span>}
                          </div>
                          <div className="flex gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${ELEM_BG[s.stemElement]}`}>{toStemHanja(s.stem)} {s.stemElement}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${ELEM_BG[s.branchElement]}`}>{toBranchHanja(s.branch)} {s.branchElement}</span>
                          </div>
                          <p className="text-xs text-foreground/70 leading-relaxed">{s.fortune}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 삼재 체크 ── */}
          {visibleSections.samjae && r.samjae && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.13 }}>
              <SectionHeader icon="🛡️" title="삼재 (三災) 체크" />
              <Card className={`glass-panel border-2 ${r.samjae.inSamjae ? 'border-orange-500/50' : 'border-primary/20'}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* 상태 표시 */}
                    <div className="flex flex-col items-center gap-3 md:w-52 shrink-0">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
                        r.samjae.inSamjae
                          ? r.samjae.type === '눌삼재' ? 'border-red-500/60 bg-red-500/10' : 'border-orange-400/60 bg-orange-400/10'
                          : 'border-emerald-500/50 bg-emerald-500/10'
                      }`}>
                        {r.samjae.inSamjae
                          ? <ShieldOff className={`w-10 h-10 ${r.samjae.type === '눌삼재' ? 'text-red-400' : 'text-orange-400'}`} />
                          : <Shield className="w-10 h-10 text-emerald-400" />}
                      </div>
                      <div className="text-center">
                        {r.samjae.inSamjae ? (
                          <>
                            <div className={`text-2xl font-serif font-bold ${r.samjae.type === '눌삼재' ? 'text-red-400' : 'text-orange-400'}`}>{r.samjae.type}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              삼재 기간: {r.samjae.samjaeYears?.join(' · ')}년
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl font-serif font-bold text-emerald-400">삼재 없음</div>
                            {r.samjae.nextSamjae && (
                              <div className="text-xs text-muted-foreground mt-1">다음 삼재: {r.samjae.nextSamjae}년부터</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {/* 설명 */}
                    <div className="flex-1 space-y-4">
                      <p className="text-foreground/90 leading-relaxed">{r.samjae.description}</p>
                      {r.samjae.inSamjae && r.samjae.advice && (
                        <div className={`p-4 rounded-xl border ${r.samjae.type === '눌삼재' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className={`w-4 h-4 ${r.samjae.type === '눌삼재' ? 'text-red-400' : 'text-orange-400'}`} />
                            <span className="text-sm font-semibold text-foreground/90">삼재 대처법</span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{r.samjae.advice}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
                        💡 삼재(三災)는 띠(년주 지지) 기준으로 12년마다 3년간 돌아오는 힘든 시기를 뜻합니다. 미리 알고 준비하면 충분히 극복할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── 용신 보완 아이템 ── */}
          {visibleSections.yongsinItem && r.yongsinItems && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.135 }}>
              <SectionHeader icon="💎" title="용신 보완 아이템 추천" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 음식 */}
                <Card className="glass-panel border-primary/20">
                  <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="text-base flex items-center gap-2">🍽️ 권장 음식</CardTitle>
                    <CardDescription className="text-xs">용신({r.yongsin?.yongsin}) 기운을 보충하는 음식</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {r.yongsinItems.foods?.map((f: any, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-2xl shrink-0">{f.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-foreground/90">{f.name}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                {/* 보석·크리스털 */}
                <Card className="glass-panel border-primary/20">
                  <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="text-base flex items-center gap-2">💎 행운의 보석</CardTitle>
                    <CardDescription className="text-xs">지니면 용신 기운이 강화되는 보석</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {r.yongsinItems.crystals?.map((c: any, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-2xl shrink-0">{c.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-foreground/90">{c.name}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{c.desc}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                {/* 생활 습관 */}
                <Card className="glass-panel border-primary/20">
                  <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="text-base flex items-center gap-2">✅ 추천 생활 습관</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {r.yongsinItems.habits?.map((h: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-primary/60 shrink-0" />{h}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {/* 피해야 할 것 */}
                <Card className="glass-panel border-destructive/20">
                  <CardHeader className="pb-3 border-b border-destructive/10">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive/80">⛔ 피해야 할 것들</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {r.yongsinItems.avoid?.map((a: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-destructive/60 shrink-0" />{a}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ── 조심해야 할 것들 ── */}
          {visibleSections.careful && r.carefulThings && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}>
              <SectionHeader icon="⚠️" title="조심해야 할 것들" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {r.carefulThings?.map((w: any, i: number) => (
                  <Card key={i} className={`glass-panel border ${w.severity === 'high' ? 'border-red-500/40' : w.severity === 'medium' ? 'border-yellow-500/30' : 'border-primary/20'}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${w.severity === 'high' ? 'bg-red-500/20 text-red-400' : w.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🔵'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground/90 mb-1">{w.category}</div>
                          <p className="text-sm text-foreground/75 leading-relaxed">{w.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 일간 심층 분석 ── */}
          {visibleSections.daymaster && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className="space-y-4">
              <SectionHeader icon="🌟" title="일간 심층 분석 (日干)" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title:"타고난 성향", desc: r.personality, icon: "🧠" },
                  { title:"애정·연애운",  desc: r.love,        icon: "💕" },
                  { title:"건강 관리",   desc: r.health,      icon: "🌿" },
                  { title:"평생 총운",   desc: r.fortune,     icon: "✨" },
                ].map((s, idx) => (
                  <Card key={idx} className="glass-panel border-primary/20">
                    <CardHeader className="pb-3 border-b border-primary/10">
                      <CardTitle className="text-lg flex items-center gap-2"><span>{s.icon}</span>{s.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4"><p className="text-sm text-foreground/85 leading-relaxed">{s.desc}</p></CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 직업 적성 ── */}
          {visibleSections.career && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
              <SectionHeader icon="💼" title="직업 적성 매칭" />
              <Card className="glass-panel border-primary/30">
                <CardContent className="pt-6">
                  <p className="text-foreground/85 leading-relaxed mb-5">{r.career}</p>
                  <CareerCards stem={r.dayMasterStem ?? ''} element={r.dayMasterElement} />
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>
      </motion.div>

      {/* 문의하기 모달 */}
      <AnimatePresence>
        {showInquiryModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowInquiryModal(false); }}
          >
            <motion.div
              className="w-full max-w-lg glass-panel border border-violet-500/30 rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.22 }}
            >
              {inquiryDone ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                    <Check className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">문의가 접수되었습니다</p>
                  <p className="text-sm text-muted-foreground text-center">관리자가 확인 후 답변드립니다.<br />답변은 '내 문의' 메뉴에서 확인하실 수 있습니다.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <MessageCircleQuestion className="w-5 h-5 text-violet-400" />
                      <h3 className="text-lg font-semibold text-foreground">사주 관련 문의</h3>
                    </div>
                    <button onClick={() => setShowInquiryModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {r && (
                    <div className="mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>📅 {r.birthInfo?.year}년 {r.birthInfo?.month}월 {r.birthInfo?.day}일</span>
                      <span>{r.birthInfo?.gender === 'male' ? '♂ 남성' : '♀ 여성'}</span>
                      {r.dayPillar && <span>일간: {r.dayPillar.heavenlyStem}({r.dayMasterElement})</span>}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground mb-3">
                    위의 사주 분석 결과에 대해 궁금한 점이나 추가 상담 내용을 작성해 주세요.
                  </p>

                  <textarea
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value.slice(0, 2000))}
                    placeholder="예) 올해 직업 운에 대해 더 자세히 알고 싶습니다. 용신이 어떻게 적용되는지 궁금합니다..."
                    className="w-full h-36 resize-none rounded-xl border border-primary/20 bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleInquirySubmit();
                    }}
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2 mb-4">
                    <span className="text-xs text-muted-foreground">{inquiryMessage.length}/2000</span>
                    <span className="text-xs text-muted-foreground">Ctrl+Enter로 전송</span>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowInquiryModal(false)}>
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleInquirySubmit}
                      disabled={!inquiryMessage.trim() || inquiryMut.isPending}
                      className="gap-2 bg-violet-600 hover:bg-violet-500 text-white border-0"
                    >
                      {inquiryMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      문의 접수
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 서브 컴포넌트 ───────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-xl font-serif text-foreground">{title}</h3>
      <div className="flex-1 h-px bg-primary/20" />
    </div>
  );
}

// 10천간별 직업 카드 데이터 (4개 카드 × 각 3~4개 직업)
const CAREER_DATA: Record<string, { icon: string; category: string; jobs: string[] }[]> = {
  // ── 목(木) ──────────────────────────────────────────
  '갑': [
    { icon: '🌲', category: '교육·학문', jobs: ['대학교수', '교사', '강사', '학원장'] },
    { icon: '⚖️', category: '법률·사회', jobs: ['변호사', '판사', '사회운동가', 'NGO'] },
    { icon: '🌿', category: '의약·복지', jobs: ['의사', '한의사', '사회복지사'] },
    { icon: '🗺️', category: '개척·환경', jobs: ['환경연구원', '조경사', '스타트업 CEO'] },
  ],
  '을': [
    { icon: '🎨', category: '예술·디자인', jobs: ['그래픽 디자이너', 'UX/UI 디자이너', '아트디렉터'] },
    { icon: '🌸', category: '뷰티·플로리스트', jobs: ['플로리스트', '스타일리스트', '메이크업아티스트'] },
    { icon: '🏠', category: '인테리어·의류', jobs: ['인테리어 디자이너', '의류 디자이너', '패브릭 전문가'] },
    { icon: '🤝', category: '상담·심리', jobs: ['심리상담사', '코치', '사회복지사'] },
  ],
  // ── 화(火) ──────────────────────────────────────────
  '병': [
    { icon: '📺', category: '방송·연예', jobs: ['배우', 'PD', '아나운서', 'MC'] },
    { icon: '🏛️', category: '정치·군경', jobs: ['정치인', '군인', '경찰관', '소방관'] },
    { icon: '✈️', category: '항공·무대', jobs: ['파일럿', '스튜어디스', '이벤트 기획자'] },
    { icon: '👑', category: '리더십·경영', jobs: ['CEO', '임원', '기업인', '창업가'] },
  ],
  '정': [
    { icon: '📚', category: '교육·강의', jobs: ['학원 강사', '교사', '학습 코치', '유튜브 강사'] },
    { icon: '✍️', category: '작가·콘텐츠', jobs: ['소설가', '카피라이터', '작사가', '칼럼니스트'] },
    { icon: '🍽️', category: '요식·서비스', jobs: ['셰프', '파티시에', '카페 창업', '요리연구가'] },
    { icon: '💆', category: '심리·종교', jobs: ['심리상담사', '명상 지도자', '종교인'] },
  ],
  // ── 토(土) ──────────────────────────────────────────
  '무': [
    { icon: '🏗️', category: '건설·토목', jobs: ['건축가', '시공감리', '토목 엔지니어', '건설사 임원'] },
    { icon: '🏛️', category: '공무원·군경', jobs: ['공무원', '군인', '경찰관', '행정직'] },
    { icon: '🌾', category: '농업·부동산', jobs: ['농업인', '공인중개사', '부동산 개발'] },
    { icon: '🏭', category: '제조·물류', jobs: ['공장장', '생산관리', '물류 책임자'] },
  ],
  '기': [
    { icon: '💰', category: '금융·세무', jobs: ['세무사', '회계사', '은행원', '재무관리자'] },
    { icon: '🛒', category: '유통·무역', jobs: ['유통업', '도·소매업', '수출입 담당'] },
    { icon: '🍜', category: '요식·서비스', jobs: ['음식점 운영', '외식 프랜차이즈', '급식 관리자'] },
    { icon: '🏥', category: '의료행정', jobs: ['병원 행정', '의료 코디네이터', '보험 심사'] },
  ],
  // ── 금(金) ──────────────────────────────────────────
  '경': [
    { icon: '⚖️', category: '법조·사법', jobs: ['검사', '판사', '변호사', '법무사'] },
    { icon: '🛡️', category: '군경·안보', jobs: ['군인', '경찰관', '보안 전문가', '형사'] },
    { icon: '🔧', category: '엔지니어링', jobs: ['기계 엔지니어', '설비 관리', '금속 전문가'] },
    { icon: '🖥️', category: 'IT 보안', jobs: ['보안 전문가', '해킹 방어 전문가', '시스템 관리자'] },
  ],
  '신': [
    { icon: '💎', category: '귀금속·패션', jobs: ['주얼리 디자이너', '명품 MD', '패션 디자이너'] },
    { icon: '🦷', category: '의료·정밀', jobs: ['치과의사', '성형외과 의사', '안과의사'] },
    { icon: '💊', category: '제약·미용', jobs: ['약사', '의약품 영업', '뷰티 전문가'] },
    { icon: '🔬', category: '정밀기기', jobs: ['정밀계측 엔지니어', '광학 전문가', '반도체 엔지니어'] },
  ],
  // ── 수(水) ──────────────────────────────────────────
  '임': [
    { icon: '🌏', category: '무역·외교', jobs: ['외교관', '무역 전문가', '국제 컨설턴트'] },
    { icon: '🚢', category: '해운·물류', jobs: ['해운업', '항만 관리자', '물류 기획자'] },
    { icon: '📈', category: '금융·핀테크', jobs: ['투자 분석가', '벤처 투자자', '핀테크 전문가'] },
    { icon: '✈️', category: '여행·첨단기술', jobs: ['여행사 기획자', 'AI 엔지니어', '테크 창업가'] },
  ],
  '계': [
    { icon: '🔭', category: '학술·연구', jobs: ['연구원', '데이터 사이언티스트', '철학자'] },
    { icon: '🎵', category: '예술·음악', jobs: ['작곡가', '음악가', '영화감독', '사진작가'] },
    { icon: '🧠', category: '심리·종교', jobs: ['임상심리사', '정신건강 전문가', '종교인'] },
    { icon: '📡', category: '미래기술', jobs: ['AI 연구자', '빅데이터 분석가', '우주공학'] },
  ],
};

// 오행 fallback용
const CAREER_DATA_ELEM: Record<string, { icon: string; category: string; jobs: string[] }[]> = {
  '목': CAREER_DATA['갑'],
  '화': CAREER_DATA['병'],
  '토': CAREER_DATA['무'],
  '금': CAREER_DATA['경'],
  '수': CAREER_DATA['임'],
};

function CareerCards({ stem, element }: { stem: string; element: string }) {
  const cards = CAREER_DATA[stem] ?? CAREER_DATA_ELEM[element] ?? CAREER_DATA['무'];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.category} className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
          <div className="text-2xl text-center">{c.icon}</div>
          <div className="text-xs font-semibold text-primary text-center">{c.category}</div>
          <div className="flex flex-col gap-1">
            {c.jobs.map(j => (
              <div key={j} className="flex items-center gap-1 text-xs text-foreground/70">
                <ChevronRight className="w-3 h-3 text-primary/50 shrink-0" />{j}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
