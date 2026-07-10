import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Sparkles,
  Sun,
  Calendar,
  ArrowRight,
  Heart,
  FileQuestion,
  CalendarDays,
  Type,
  Orbit,
  MoonStar,
  TrendingUp,
  BookOpen,
  Star,
  TableProperties,
  Search,
  BookmarkPlus,
  History,
  UserCircle2,
  Clock,
  Palette,
  Hash,
  Compass,
  CheckCircle2,
  ShieldAlert,
  Briefcase,
  Activity,
  FileText,
  Download,
  ReceiptText,
  MessageCircleQuestion,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import {
  downloadReportFile,
  useGetDailyFortune,
  useGetMyAiQuestions,
  useGetMyOrders,
  useGetMyReports,
  useRegenerateReport,
} from "@workspace/api-client-react";
import HomeInquiryModal from "@/components/HomeInquiryModal";
import { useResolvedProfile } from "@/lib/resolved-profile";
import { getCurrentAge } from "@/lib/age";
import {
  clearRecentActivities,
  formatBookmarkDate,
  getRecentActivities,
  type LuckyDayBookmark,
  type RecentActivityItem,
} from "@/lib/member-insights";
import { getSeoulTodayString } from "@/lib/seoul-date";
import { useLuckyDayBookmarks } from "@/hooks/use-lucky-day-bookmarks";
import { getElementRelation } from "@/lib/saju-relation";
import { fetchMonthlyFortune } from "@/lib/monthly-fortune";

type InquiryType = "general" | "saju" | "gungap";
type MemberServiceFocus =
  | "all"
  | "fortune"
  | "planning"
  | "relationship"
  | "tool";
type InquiryDraftBirth = {
  name?: string;
  year?: string;
  month?: string;
  day?: string;
  hour?: string;
  gender?: string;
};
type InquiryDraft = {
  message?: string;
  person1?: InquiryDraftBirth;
  person2?: InquiryDraftBirth;
};

const PREVIEW_FEATURES = [
  {
    href: "/daeun",
    title: "대운 계산기",
    desc: "10년 단위 인생의 큰 흐름을 타임라인으로",
    icon: TrendingUp,
    iconClass: "bg-teal-400/15 border-teal-400/30 text-teal-600",
  },
  {
    href: "/monthly-fortune",
    title: "월운 분석",
    desc: "이달의 재물·직업·애정·건강 흐름",
    icon: CalendarDays,
    iconClass: "bg-purple-400/15 border-purple-400/30 text-purple-600",
  },
  {
    href: "/year-fortune",
    title: "연간 운세",
    desc: "올 한 해를 분기·월별로 상세 분석",
    icon: CalendarDays,
    iconClass: "bg-blue-500/15 border-blue-500/30 text-blue-600",
  },
  {
    href: "/lucky-calendar",
    title: "길일 달력",
    desc: "이사·개업·결혼에 맞는 최적의 날",
    icon: Calendar,
    iconClass: "bg-emerald-400/15 border-emerald-400/30 text-emerald-600",
  },
  {
    href: "/zodiac",
    title: "띠별 운세",
    desc: "12지신의 오늘 운세를 순위별로",
    icon: Orbit,
    iconClass: "bg-amber-500/15 border-amber-500/30 text-amber-600",
  },
  {
    href: "/dream",
    title: "꿈 해몽",
    desc: "꿈 속 키워드로 오늘의 길흉 풀이",
    icon: MoonStar,
    iconClass: "bg-indigo-500/15 border-indigo-500/30 text-indigo-600",
  },
  {
    href: "/name-analysis",
    title: "이름 풀이",
    desc: "수리사주와 오행으로 이름 운세 분석",
    icon: Type,
    iconClass: "bg-violet-500/15 border-violet-500/30 text-violet-600",
  },
  {
    href: "/love-fortune",
    title: "연애운",
    desc: "인연 만날 흐름과 오행 궁합 점수",
    icon: Heart,
    iconClass: "bg-rose-500/15 border-rose-500/30 text-rose-400",
  },
] as const;

const MEMBER_SERVICE_FOCUS_OPTIONS: Array<{
  value: MemberServiceFocus;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "fortune", label: "운세 흐름" },
  { value: "planning", label: "일정 선택" },
  { value: "relationship", label: "관계 해석" },
  { value: "tool", label: "해석 도구" },
];

const MEMBER_SERVICE_CARDS = [
  {
    href: "/daeun",
    title: "대운 계산기",
    desc: "10년 단위로 변화하는 인생의 큰 흐름을 타임라인으로 확인하고, 현재 내가 어떤 대운 안에 있는지 한눈에 파악합니다.",
    action: "확인하기",
    icon: TrendingUp,
    filter: "fortune" as const,
    cardClass: "border-teal-400/20",
    orbClass: "bg-teal-400/10 group-hover:bg-teal-400/20",
    iconBoxClass: "bg-teal-400/20 border-teal-400/30",
    textClass: "text-teal-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(45,212,191,0.15)]",
  },
  {
    href: "/monthly-fortune",
    title: "월운 분석",
    desc: "세운(歲運)과 월건(月建)이 내 일주와 어떤 십신 관계를 맺는지 분석하여 이달의 재물·직업·애정·건강 흐름을 풀어드립니다.",
    action: "분석하기",
    icon: CalendarDays,
    filter: "fortune" as const,
    cardClass: "border-purple-400/20",
    orbClass: "bg-purple-400/10 group-hover:bg-purple-400/20",
    iconBoxClass: "bg-purple-400/20 border-purple-400/30",
    textClass: "text-purple-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(192,132,252,0.15)]",
  },
  {
    href: "/lucky-calendar",
    title: "길일 달력",
    desc: "이사·개업·결혼·계약 등 목적별로 내 사주에 맞는 최적의 날을 달력 위에서 바로 확인하고 현명하게 선택하세요.",
    action: "날짜 고르기",
    icon: Calendar,
    filter: "planning" as const,
    cardClass: "border-emerald-400/20",
    orbClass: "bg-emerald-400/10 group-hover:bg-emerald-400/20",
    iconBoxClass: "bg-emerald-400/20 border-emerald-400/30",
    textClass: "text-emerald-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(52,211,153,0.15)]",
  },
  {
    href: "/year-fortune",
    title: "연간 운세",
    desc: "올 한 해의 운세를 분기·월별로 상세 분석합니다.",
    action: "확인하기",
    icon: CalendarDays,
    filter: "fortune" as const,
    cardClass: "border-primary/20",
    orbClass: "bg-blue-500/10 group-hover:bg-blue-500/20",
    iconBoxClass: "bg-blue-500/20 border-blue-500/30",
    textClass: "text-blue-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]",
  },
  {
    href: "/zodiac",
    title: "띠별 운세",
    desc: "12지신의 오늘 운세를 순위별로 한눈에 확인합니다.",
    action: "확인하기",
    icon: Orbit,
    filter: "fortune" as const,
    cardClass: "border-primary/20",
    orbClass: "bg-amber-500/10 group-hover:bg-amber-500/20",
    iconBoxClass: "bg-amber-500/20 border-amber-500/30",
    textClass: "text-amber-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]",
  },
  {
    href: "/dream",
    title: "꿈 해몽",
    desc: "꿈에 나타난 키워드로 오늘의 길흉을 풀이합니다.",
    action: "풀이하기",
    icon: MoonStar,
    filter: "tool" as const,
    cardClass: "border-primary/20",
    orbClass: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
    iconBoxClass: "bg-indigo-500/20 border-indigo-500/30",
    textClass: "text-indigo-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]",
  },
  {
    href: "/name-analysis",
    title: "이름 풀이",
    desc: "수리사주와 오행으로 이름의 운세와 성격을 분석합니다.",
    action: "분석하기",
    icon: Type,
    filter: "tool" as const,
    cardClass: "border-primary/20",
    orbClass: "bg-violet-500/10 group-hover:bg-violet-500/20",
    iconBoxClass: "bg-violet-500/20 border-violet-500/30",
    textClass: "text-violet-600",
    shadowClass: "hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]",
  },
  {
    href: "/love-fortune",
    title: "연애운",
    desc: "솔로라면 인연 만날 월별 흐름을, 연인이 있다면 오행 궁합 점수와 조언을 분석합니다.",
    action: "분석하기",
    icon: Heart,
    filter: "relationship" as const,
    cardClass: "border-rose-400/20",
    orbClass: "bg-rose-500/10 group-hover:bg-rose-500/20",
    iconBoxClass: "bg-rose-500/20 border-rose-500/30",
    textClass: "text-rose-400",
    shadowClass: "hover:shadow-[0_0_40px_rgba(251,113,133,0.15)]",
  },
] as const;

function getDashboardScoreTone(score?: number) {
  if (typeof score !== "number") {
    return {
      label: "확인 중",
      textClass: "text-muted-foreground",
      barClass: "bg-muted-foreground",
    };
  }
  if (score >= 82)
    return {
      label: "상승",
      textClass: "text-emerald-600",
      barClass: "bg-emerald-500",
    };
  if (score >= 70)
    return {
      label: "활용",
      textClass: "text-blue-600",
      barClass: "bg-blue-500",
    };
  if (score >= 56)
    return {
      label: "무난",
      textClass: "text-amber-600",
      barClass: "bg-amber-500",
    };
  if (score >= 42)
    return {
      label: "주의",
      textClass: "text-orange-600",
      barClass: "bg-orange-500",
    };
  return { label: "보수", textClass: "text-rose-600", barClass: "bg-rose-500" };
}

function formatDashboardDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function getReportStatusMeta(status?: string | null) {
  if (status === "ready") {
    return {
      label: "다운로드 가능",
      className: "border-emerald-500/25 bg-emerald-500/8 text-emerald-700",
    };
  }
  if (status === "failed") {
    return {
      label: "생성 실패",
      className: "border-rose-500/25 bg-rose-500/8 text-rose-700",
    };
  }
  return {
    label: "생성 중",
    className: "border-amber-500/25 bg-amber-500/8 text-amber-700",
  };
}

function getOrderStatusLabel(status?: string | null) {
  if (status === "paid") return "결제 완료";
  if (status === "pending") return "결제 대기";
  if (status === "failed") return "결제 실패";
  if (status === "cancelled") return "결제 취소";
  return status ?? "상태 확인 중";
}

function getAiPlanLabel(planCode?: string | null, unlimited?: boolean) {
  if (unlimited) return "운영자";
  if (planCode === "expert") return "Expert";
  if (planCode === "pro") return "Pro";
  if (planCode === "premium") return "Premium";
  return "무료";
}

function getRecentActivityMeta(kind: RecentActivityItem["kind"]) {
  if (kind === "day-pillar") {
    return {
      label: "오늘 운세",
      className: "border-amber-500/20 bg-amber-500/8 text-amber-700",
      icon: Sun,
    };
  }
  if (kind === "lucky-day") {
    return {
      label: "길일 분석",
      className: "border-emerald-500/20 bg-emerald-500/8 text-emerald-700",
      icon: Calendar,
    };
  }
  return {
    label: "사주 분석",
    className: "border-primary/20 bg-primary/8 text-primary",
    icon: Sparkles,
  };
}

function getDateDiffFromToday(
  target: { year: number; month: number; day: number },
  todayDate: string,
) {
  const [year, month, day] = todayDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const todayUtc = Date.UTC(year, month - 1, day);
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

function getDailyScoreFocus(
  dailyFortune?: {
    moneyScore?: number;
    loveScore?: number;
    careerScore?: number;
    healthScore?: number;
  } | null,
) {
  if (!dailyFortune) return null;

  const scores = [
    { label: "재물", value: dailyFortune.moneyScore },
    { label: "애정", value: dailyFortune.loveScore },
    { label: "직업", value: dailyFortune.careerScore },
    { label: "건강", value: dailyFortune.healthScore },
  ].filter(
    (item): item is { label: string; value: number } =>
      typeof item.value === "number",
  );

  if (scores.length === 0) return null;

  const best = [...scores].sort((left, right) => right.value - left.value)[0];
  const caution = [...scores].sort((left, right) => left.value - right.value)[0];

  return { best, caution };
}

function getUpcomingBookmarkSummary(
  bookmarks: LuckyDayBookmark[],
  todayDate: string,
) {
  let nearest: { bookmark: LuckyDayBookmark; diffDays: number } | null = null;

  for (const bookmark of bookmarks) {
    const diffDays = getDateDiffFromToday(bookmark, todayDate);
    if (diffDays === null) continue;
    if (diffDays < 0) continue;
    if (!nearest || diffDays < nearest.diffDays) {
      nearest = { bookmark, diffDays };
    }
  }

  if (!nearest) return null;

  return {
    label:
      nearest.diffDays === 0
        ? "오늘"
        : nearest.diffDays === 1
          ? "내일"
          : `D-${nearest.diffDays}`,
    description: `${formatBookmarkDate(nearest.bookmark)} · ${nearest.bookmark.purposeLabel}`,
    grade: nearest.bookmark.grade,
  };
}

function getMonthlyScoreFocus(
  monthlyFortune?: {
    scores?: {
      wealth?: number;
      love?: number;
      career?: number;
      health?: number;
    };
  } | null,
) {
  if (!monthlyFortune?.scores) return null;

  const scores = [
    { label: "재물", value: monthlyFortune.scores.wealth },
    { label: "관계", value: monthlyFortune.scores.love },
    { label: "직업", value: monthlyFortune.scores.career },
    { label: "건강", value: monthlyFortune.scores.health },
  ].filter(
    (item): item is { label: string; value: number } =>
      typeof item.value === "number",
  );

  if (scores.length === 0) return null;

  const best = [...scores].sort((left, right) => right.value - left.value)[0];
  const caution = [...scores].sort((left, right) => left.value - right.value)[0];

  return { best, caution };
}

export default function Home() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState<InquiryType>("general");
  const [inquiryDraft, setInquiryDraft] = useState<InquiryDraft>({});
  const [memberServiceFocus, setMemberServiceFocus] =
    useState<MemberServiceFocus>("all");
  const [memberServiceQuery, setMemberServiceQuery] = useState("");
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [showMonthlyDetailsMobile, setShowMonthlyDetailsMobile] =
    useState(false);
  const [bookmarksClearing, setBookmarksClearing] = useState(false);
  const [recentActivitiesClearing, setRecentActivitiesClearing] =
    useState(false);
  const [recentActivities, setRecentActivities] = useState<
    RecentActivityItem[]
  >([]);
  const [todayDate, setTodayDate] = useState(() => getSeoulTodayString());
  const { user, isAuthenticated } = useAuth();
  const { profile } = useResolvedProfile();
  const { bookmarks, removeBookmark } = useLuckyDayBookmarks();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const dashboardYear = Number(todayDate.slice(0, 4));
  const dashboardMonth = Number(todayDate.slice(5, 7));
  const { data: reportsData, isLoading: reportsLoading } =
    useGetMyReports(isAuthenticated);
  const { data: ordersData } = useGetMyOrders(isAuthenticated);
  const regenerateReport = useRegenerateReport();
  const { data: aiQuestionsData, isLoading: aiQuestionsLoading } =
    useGetMyAiQuestions(isAuthenticated);
  const { data: dailyFortune, isLoading: dailyFortuneLoading } =
    useGetDailyFortune(
      { date: todayDate },
      {
        query: {
          queryKey: [
            "/api/fortune/daily",
            { date: todayDate },
            "home-dashboard",
          ],
          staleTime: 5 * 60_000,
          enabled: true,
        },
      },
    );
  const {
    data: monthlyFortune,
    isLoading: monthlyFortuneLoading,
    isError: monthlyFortuneError,
  } = useQuery({
    queryKey: [
      "home-monthly-fortune",
      profile?.birthYear,
      profile?.birthMonth,
      profile?.birthDay,
      profile?.birthHour,
      profile?.birthMinute,
      profile?.gender,
      profile?.calendarType,
      profile?.isLeapMonth,
      profile?.timeZone,
      profile?.longitude,
      profile?.applyTrueSolarTime,
      profile?.dayBoundary,
      dashboardYear,
      dashboardMonth,
    ],
    queryFn: () => fetchMonthlyFortune(profile, dashboardYear, dashboardMonth),
    enabled: Boolean(isAuthenticated && profile),
    staleTime: 30 * 60_000,
  });

  function openInquiry(type: InquiryType, draft?: InquiryDraft) {
    setInquiryType(type);
    setInquiryDraft(draft ?? {});
    setInquiryOpen(true);
  }

  async function handleCopyRecommendedAiPrompt() {
    try {
      await navigator.clipboard.writeText(recommendedAiPrompt);
      setAiPromptCopied(true);
      window.setTimeout(() => setAiPromptCopied(false), 1600);
    } catch {
      setAiPromptCopied(false);
    }
  }

  async function handleClearRecentActivities() {
    if (!user?.id || recentActivitiesClearing) return;

    setRecentActivitiesClearing(true);
    try {
      setRecentActivities(await clearRecentActivities(user.id));
    } finally {
      setRecentActivitiesClearing(false);
    }
  }

  async function handleClearBookmarks() {
    if (bookmarks.length === 0 || bookmarksClearing) return;

    setBookmarksClearing(true);
    try {
      for (const bookmark of [...bookmarks]) {
        await removeBookmark(bookmark.id);
      }
    } finally {
      setBookmarksClearing(false);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setRecentActivities([]);
      return;
    }

    void (async () => {
      const nextRecentActivities = await getRecentActivities(user.id);
      if (cancelled) return;
      setRecentActivities(nextRecentActivities);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = getSeoulTodayString();
      setTodayDate((current) => (current === next ? current : next));
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const todayScoreTone = getDashboardScoreTone(dailyFortune?.overallScore);
  const monthlyScoreTone = getDashboardScoreTone(
    monthlyFortune?.scores.overall,
  );
  const todayScoreFocus = getDailyScoreFocus(dailyFortune);
  const monthlyScoreFocus = getMonthlyScoreFocus(monthlyFortune);
  const recommendedAiPrompt =
    todayScoreFocus && monthlyScoreFocus
      ? `오늘 ${todayScoreFocus.caution.label} 흐름이 ${todayScoreFocus.caution.value}점이고 이번 달 ${monthlyScoreFocus.best.label} 흐름이 ${monthlyScoreFocus.best.value}점인데, 지금 어떤 선택에 집중하면 좋을까요?`
      : todayScoreFocus
        ? `오늘 ${todayScoreFocus.best.label}은 ${todayScoreFocus.best.value}점이고 ${todayScoreFocus.caution.label}은 ${todayScoreFocus.caution.value}점인데, 어떻게 움직이면 좋을까요?`
        : monthlyScoreFocus
          ? `이번 달 ${monthlyScoreFocus.best.label} 흐름이 ${monthlyScoreFocus.best.value}점인데 가장 잘 활용하는 방법이 궁금합니다.`
          : "지금 제 사주에서 가장 먼저 챙겨야 할 흐름을 알려주세요.";
  const latestReport = reportsData?.reports?.[0] ?? null;
  const latestOrder = ordersData?.orders?.[0] ?? null;
  const latestReportStatus = getReportStatusMeta(latestReport?.status);
  const latestAiQuestion = aiQuestionsData?.questions?.[0] ?? null;
  const readyReportsCount =
    reportsData?.reports?.filter((report) => report.status === "ready")
      .length ?? 0;
  const hasUnlimitedAiAccess = Boolean(isAdmin || aiQuestionsData?.unlimited);
  const aiRemainingCount = aiQuestionsData?.remaining ?? 0;
  const aiLimitCount = aiQuestionsData?.limit ?? 0;
  const aiQuestionCount = aiQuestionsData?.questions?.length ?? 0;
  const currentAge = profile
    ? getCurrentAge(profile.birthYear, profile.birthMonth, profile.birthDay)
    : null;
  const aiPlanLabel = getAiPlanLabel(
    aiQuestionsData?.planCode,
    hasUnlimitedAiAccess,
  );
  const aiUsageLabel = hasUnlimitedAiAccess
    ? "이번 달 무제한 이용"
    : `${aiRemainingCount}/${aiLimitCount}회 남음`;
  const aiQuestionsExhausted =
    !hasUnlimitedAiAccess && Boolean(aiQuestionsData) && aiRemainingCount < 1;
  const latestRecentActivity = recentActivities[0] ?? null;
  const sortedBookmarks = [...bookmarks].sort((left, right) => {
    const leftDiff = getDateDiffFromToday(left, todayDate);
    const rightDiff = getDateDiffFromToday(right, todayDate);

    if (leftDiff === null || rightDiff === null) return 0;
    const leftUpcoming = leftDiff >= 0;
    const rightUpcoming = rightDiff >= 0;

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    if (leftUpcoming && rightUpcoming) {
      return leftDiff - rightDiff;
    }

    return rightDiff - leftDiff;
  });
  const upcomingBookmarkSummary = getUpcomingBookmarkSummary(
    bookmarks,
    todayDate,
  );
  const dashboardActivitySummary = [
    {
      href: "/account",
      label: "다운로드 가능",
      value: `${readyReportsCount}개`,
      description: "리포트",
      icon: FileText,
      toneClass: "border-primary/20 bg-primary/8 text-primary",
    },
    {
      href: "/lucky-calendar",
      label: "저장한 길일",
      value: `${bookmarks.length}건`,
      description: "일정 후보",
      icon: BookmarkPlus,
      toneClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-600",
    },
    {
      href: "/account",
      label: "이어서 보기",
      value: `${recentActivities.length}건`,
      description: "최근 기록",
      icon: History,
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    },
    {
      href: "/saju",
      label: "남은 AI 질문",
      value: hasUnlimitedAiAccess ? "무제한" : `${aiRemainingCount}회`,
      description: hasUnlimitedAiAccess ? "운영자 플랜" : `${aiQuestionCount}개 기록`,
      icon: MessageCircleQuestion,
      toneClass: "border-sky-500/20 bg-sky-500/10 text-sky-600",
    },
  ];
  const inquiryProfileDraft = profile
    ? {
        name: profile.name ?? user?.firstName ?? "",
        year: String(profile.birthYear ?? ""),
        month: String(profile.birthMonth ?? ""),
        day: String(profile.birthDay ?? ""),
        hour: "모름/미입력",
        gender: profile.gender === "female" ? "female" : "male",
      }
    : undefined;
  const suggestedInquiry =
    profile && latestRecentActivity
      ? {
          type: "saju" as const,
          title: "최근 본 분석 이어서 상담하기",
          description: `${getRecentActivityMeta(latestRecentActivity.kind).label}에서 막힌 부분을 바로 질문할 수 있어요.`,
          message: `최근에 "${latestRecentActivity.title}" 분석을 봤습니다.\n${latestRecentActivity.subtitle ? `${latestRecentActivity.subtitle}\n` : ""}이 내용을 바탕으로 지금 가장 중요하게 봐야 할 흐름과 주의할 점을 더 자세히 상담받고 싶습니다.`,
        }
      : profile && dailyFortune
        ? {
            type: "saju" as const,
            title: "오늘 흐름 더 자세히 상담하기",
            description: "오늘 운세 결과를 바탕으로 조심할 점과 활용 포인트를 깊게 물어볼 수 있어요.",
            message: `오늘 운세에서 전체 흐름이 ${dailyFortune.overallScore}점으로 나왔습니다.\n"${dailyFortune.overallFortune}"\n오늘 특히 조심할 점과 활용하면 좋은 포인트를 더 자세히 알고 싶습니다.`,
          }
        : null;
  const memberServiceRecommendations = [
    monthlyFortune
      ? {
          href: "/monthly-fortune",
          badge: "이번 달",
          title: `${dashboardMonth}월 월운 이어보기`,
          description: `월운 지수 ${monthlyFortune.scores.overall}점 · ${monthlyFortune.wun.tenGod} 기운 중심으로 보면 좋습니다.`,
          icon: CalendarDays,
          toneClass: "border-purple-400/20 bg-purple-400/10 text-purple-600",
        }
      : {
          href: "/monthly-fortune",
          badge: "기본 추천",
          title: "월운 분석 먼저 보기",
          description: "이번 달 재물, 직업, 관계 흐름을 먼저 확인해보세요.",
          icon: CalendarDays,
          toneClass: "border-purple-400/20 bg-purple-400/10 text-purple-600",
        },
    bookmarks.length > 0
      ? {
          href: "/lucky-calendar",
          badge: "저장 일정",
          title: "길일 저장분 이어보기",
          description: `${formatBookmarkDate(bookmarks[0])} ${bookmarks[0].purposeLabel} 일정이 저장돼 있습니다.`,
          icon: Calendar,
          toneClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-600",
        }
      : {
          href: "/lucky-calendar",
          badge: "일정 준비",
          title: "길일 후보부터 모으기",
          description: "이사, 계약, 만남 일정에 맞는 날짜를 먼저 찾아 저장해보세요.",
          icon: Calendar,
          toneClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-600",
        },
    latestRecentActivity?.kind === "day-pillar"
      ? {
          href: "/year-fortune",
          badge: "넓혀보기",
          title: "연간 운세로 확장",
          description: "오늘 흐름을 올해 전체 리듬 안에서 다시 확인해보세요.",
          icon: CalendarDays,
          toneClass: "border-blue-500/20 bg-blue-500/10 text-blue-600",
        }
      : latestAiQuestion
        ? {
            href: "/daeun",
            badge: "다음 단계",
            title: "대운 계산기로 이어보기",
            description: currentAge
              ? `${currentAge}세 전후 장기 흐름을 같이 보면 해석이 더 또렷해집니다.`
              : "질문으로 본 포인트를 장기 흐름 안에서 이어서 확인해보세요.",
            icon: TrendingUp,
            toneClass: "border-teal-400/20 bg-teal-400/10 text-teal-600",
          }
        : {
            href: "/daeun",
            badge: "장기 흐름",
            title: "대운 계산기 열기",
        description: currentAge
              ? `${currentAge}세 전후 큰 사이클을 보면 다음 선택이 더 쉬워집니다.`
              : "10년 단위 큰 흐름부터 확인해보세요.",
            icon: TrendingUp,
            toneClass: "border-teal-400/20 bg-teal-400/10 text-teal-600",
          },
  ];
  const memberTopicShortcuts = [
    {
      href: "/daeun",
      label: "장기 흐름",
      description: "10년 단위",
      toneClass: "border-teal-400/20 bg-teal-400/10 text-teal-600",
    },
    {
      href: "/monthly-fortune",
      label: "이번 달",
      description: "재물·직업·관계",
      toneClass: "border-purple-400/20 bg-purple-400/10 text-purple-600",
    },
    {
      href: "/lucky-calendar",
      label: "일정 선택",
      description: "이사·계약·만남",
      toneClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-600",
    },
    {
      href: "/love-fortune",
      label: "관계 해석",
      description: "연애·궁합",
      toneClass: "border-rose-400/20 bg-rose-400/10 text-rose-600",
    },
    {
      href: "/name-analysis",
      label: "이름 풀이",
      description: "오행·수리",
      toneClass: "border-violet-400/20 bg-violet-400/10 text-violet-600",
    },
    {
      href: "/dream",
      label: "해석 도구",
      description: "꿈·상징",
      toneClass: "border-indigo-400/20 bg-indigo-400/10 text-indigo-600",
    },
  ];
  const memberServiceInsightByHref: Record<
    string,
    { label: string; className: string } | undefined
  > = {
    "/monthly-fortune": monthlyFortune
      ? {
          label: `${dashboardMonth}월 흐름`,
          className:
            "border-purple-400/20 bg-purple-400/10 text-purple-700",
        }
      : undefined,
    "/lucky-calendar":
      bookmarks.length > 0
        ? {
            label: `저장 ${bookmarks.length}건`,
            className:
              "border-emerald-400/20 bg-emerald-400/10 text-emerald-700",
          }
        : undefined,
    "/daeun": currentAge
      ? {
          label: `${currentAge}세 흐름`,
          className: "border-teal-400/20 bg-teal-400/10 text-teal-700",
        }
      : undefined,
    "/year-fortune":
      dailyFortune && (dailyFortune.overallScore ?? 0) < 56
        ? {
            label: "오늘 흐름 확장",
            className: "border-blue-500/20 bg-blue-500/10 text-blue-700",
          }
        : undefined,
    "/love-fortune":
      latestRecentActivity?.kind === "saju"
        ? {
            label: "관계 해석 추천",
            className: "border-rose-400/20 bg-rose-400/10 text-rose-700",
          }
        : undefined,
    "/dream":
      latestAiQuestion
        ? {
            label: "질문 확장용",
            className:
              "border-indigo-400/20 bg-indigo-400/10 text-indigo-700",
          }
        : undefined,
  };
  const recommendedMemberServiceHrefs = new Set(
    memberServiceRecommendations.map((service) => service.href),
  );
  const normalizedMemberServiceQuery = memberServiceQuery.trim().toLowerCase();
  const filteredMemberServiceCards = MEMBER_SERVICE_CARDS.filter((card) => {
    const matchesFocus =
      memberServiceFocus === "all" ? true : card.filter === memberServiceFocus;
    const matchesQuery =
      !normalizedMemberServiceQuery ||
      `${card.title} ${card.desc} ${card.action}`
        .toLowerCase()
        .includes(normalizedMemberServiceQuery);

    return matchesFocus && matchesQuery;
  }).sort((left, right) => {
    const leftRecommended = recommendedMemberServiceHrefs.has(left.href);
    const rightRecommended = recommendedMemberServiceHrefs.has(right.href);
    if (leftRecommended === rightRecommended) return 0;
    return leftRecommended ? -1 : 1;
  });
  const recommendedActions = [
    !profile
      ? {
          href: "/saju",
          label: "시작하기",
          title: "내 사주 등록",
          description: "대시보드를 더 정확하게 개인화해보세요.",
          icon: UserCircle2,
          iconClass: "border-primary/20 bg-primary/10 text-primary",
        }
      : dailyFortune && (dailyFortune.overallScore ?? 0) < 56
        ? {
            href: "/daily-fortune",
            label: "오늘 우선",
            title: "주의 포인트 먼저 보기",
            description: "오늘 피해야 할 일과 조심할 타이밍을 더 자세히 봅니다.",
            icon: Sun,
            iconClass:
              "border-rose-500/20 bg-rose-500/10 text-rose-600",
          }
        : {
            href: "/monthly-fortune",
            label: "이번 달",
            title: "월운 흐름 이어보기",
            description: `${dashboardMonth}월 재물, 직업, 관계 흐름을 한 번에 확인합니다.`,
            icon: CalendarDays,
            iconClass:
              "border-blue-500/20 bg-blue-500/10 text-blue-600",
          },
    bookmarks.length > 0
      ? {
          href: bookmarks[0].href,
          label: "저장한 일정",
          title: "길일 다시 확인",
          description: `${bookmarks[0].purposeLabel} 후보 중 저장한 날짜를 바로 엽니다.`,
          icon: BookmarkPlus,
          iconClass:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        }
      : {
          href: "/lucky-calendar",
          label: "준비하기",
          title: "길일 하나 저장",
          description: "이사, 계약, 만남 일정 후보를 먼저 모아두세요.",
          icon: BookmarkPlus,
          iconClass:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        },
    recentActivities.length > 0
      ? {
          href: recentActivities[0].href,
          label: "이어서 보기",
          title: "최근 분석 열기",
          description:
            recentActivities[0].subtitle || recentActivities[0].title,
          icon: History,
          iconClass:
            "border-amber-500/20 bg-amber-500/10 text-amber-600",
        }
      : latestAiQuestion
        ? {
            href: "/saju",
            label: "질문 이어가기",
            title: "AI 질문 다시 열기",
            description: "방금 본 해석에서 궁금했던 포인트를 바로 이어서 물어봅니다.",
            icon: MessageCircleQuestion,
            iconClass: "border-sky-500/20 bg-sky-500/10 text-sky-600",
          }
        : {
            href: "/daeun",
            label: "다음 분석",
            title: "대운 흐름 확인",
            description: "10년 단위의 큰 사이클을 먼저 훑어보세요.",
            icon: TrendingUp,
            iconClass:
              "border-violet-500/20 bg-violet-500/10 text-violet-600",
          },
  ];
  const todayRelation =
    profile?.dayMasterElement && dailyFortune?.dayElement
      ? getElementRelation(
          profile.dayMasterElement,
          dailyFortune.dayElement,
          profile.dayMasterStem,
          dailyFortune.dayHeavenlyStem,
          profile.dayMasterBranch,
          dailyFortune.dayEarthlyBranch,
        )
      : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        className="text-center max-w-3xl mx-auto mb-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-md mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            당신의 운명을 비추는 빛
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 text-gradient-gold drop-shadow-2xl break-keep">
          하늘의 뜻을 읽어
          <br className="hidden md:block" /> 내일을 준비하다
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light break-keep">
          정통 명리학을 바탕으로 당신의 사주팔자와 오늘의 운세,{" "}
          <br className="hidden md:block" />
          그리고 인생의 흐름을 정확하게 짚어드립니다.
        </p>
      </motion.div>

      {isAuthenticated && (
        <motion.div
          className="w-full max-w-6xl mb-12"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <div className="rounded-[28px] border border-primary/20 bg-card/35 backdrop-blur-xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
              <div>
                <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">
                  my dashboard
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                  내 사주 대시보드
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  다시 볼 분석과 저장한 길일을 한곳에 모았습니다
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/saju"
                  className="px-3 py-2 rounded-xl border border-primary/20 bg-primary/8 text-primary text-sm hover:bg-primary/12 transition-colors"
                >
                  사주 다시 보기
                </Link>
                <Link
                  href="/account"
                  className="px-3 py-2 rounded-xl border border-foreground/10 bg-foreground/5 text-foreground/80 text-sm hover:bg-foreground/8 transition-colors"
                >
                  내 정보 관리
                </Link>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] tracking-[0.18em] uppercase text-primary/65">
                  내 활동 요약
                </p>
              </div>
              <div className="grid grid-cols-[repeat(4,minmax(160px,1fr))] gap-2 overflow-x-auto pb-1 lg:grid-cols-4 lg:overflow-visible lg:pb-0">
                {dashboardActivitySummary.map((summary) => {
                  const Icon = summary.icon;

                  return (
                    <Link
                      key={`${summary.label}-${summary.href}`}
                      href={summary.href}
                      className="block rounded-2xl border border-primary/10 bg-background/30 px-3 py-3 hover:bg-background/45 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">
                            {summary.label}
                          </div>
                          <div className="mt-1 font-medium text-sm text-foreground">
                            {summary.value}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {summary.description}
                          </div>
                        </div>
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${summary.toneClass}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] tracking-[0.18em] uppercase text-primary/65">
                  오늘 추천 동선
                </p>
              </div>
              <div className="grid grid-cols-[repeat(3,minmax(220px,1fr))] gap-2 overflow-x-auto pb-1 lg:grid-cols-3 lg:overflow-visible lg:pb-0">
                {recommendedActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={`${action.label}-${action.href}`}
                      href={action.href}
                      className="block rounded-2xl border border-primary/15 bg-background/35 px-3 py-3 hover:bg-background/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">
                            {action.label}
                          </div>
                          <div className="mt-1 font-medium text-sm text-foreground">
                            {action.title}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {action.description}
                          </p>
                        </div>
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${action.iconClass}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        바로 열기
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[0.82fr_1.18fr] gap-4 items-start">
              <div className="h-fit self-start rounded-3xl border border-primary/15 bg-background/25 p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <UserCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-muted-foreground">
                      내 사주 요약
                    </div>
                    <div className="text-xl font-semibold text-foreground mt-1">
                      {profile?.name ?? user?.firstName ?? "회원님"}
                    </div>
                    {profile ? (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-3">
                          <div className="text-[11px] text-muted-foreground mb-1">
                            생년월일
                          </div>
                          <div className="font-medium">
                            {profile.birthYear}.
                            {String(profile.birthMonth).padStart(2, "0")}.
                            {String(profile.birthDay).padStart(2, "0")}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-3">
                          <div className="text-[11px] text-muted-foreground mb-1">
                            현재 나이
                          </div>
                          <div className="font-medium">
                            {getCurrentAge(
                              profile.birthYear,
                              profile.birthMonth,
                              profile.birthDay,
                            )}
                            세
                          </div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-3">
                          <div className="text-[11px] text-muted-foreground mb-1">
                            일주
                          </div>
                          <div className="font-medium">
                            {profile.dayMasterStem && profile.dayMasterBranch
                              ? `${profile.dayMasterStem}${profile.dayMasterBranch}`
                              : "미등록"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-3">
                          <div className="text-[11px] text-muted-foreground mb-1">
                            성별 · 달력
                          </div>
                          <div className="font-medium">
                            {profile.gender === "male" ? "남성" : "여성"} ·{" "}
                            {profile.calendarType === "solar" ? "양력" : "음력"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/6 p-4 text-sm text-muted-foreground">
                        아직 저장된 사주 없음. 등록하면 개인화 메뉴가 훨씬
                        편해집니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="contents">
                <div className="rounded-3xl border border-primary/15 bg-background/25 p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-foreground">
                        오늘의 흐름
                      </h3>
                    </div>
                    <Link
                      href="/daily-fortune"
                      className="text-xs text-primary hover:underline"
                    >
                      전체 보기
                    </Link>
                  </div>

                  {dailyFortuneLoading ? (
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-4 text-sm text-muted-foreground">
                      오늘 운세 불러오는 중.
                    </div>
                  ) : dailyFortune ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-primary/15 bg-primary/8 p-3 md:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              {todayDate}
                            </div>
                            <div className="text-lg font-semibold text-foreground mt-1">
                              {dailyFortune.dayGanzi} ·{" "}
                              {dailyFortune.dayElement}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-muted-foreground">
                              흐름 지수
                            </div>
                            <div
                              className={`text-2xl font-bold ${todayScoreTone.textClass}`}
                            >
                              {dailyFortune.overallScore}점
                            </div>
                            <div
                              className={`text-[11px] font-medium ${todayScoreTone.textClass}`}
                            >
                              {todayScoreTone.label}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-background/70 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${todayScoreTone.barClass}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, dailyFortune.overallScore ?? 0))}%`,
                            }}
                          />
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed mt-3 line-clamp-1">
                          {dailyFortune.overallFortune}
                        </p>
                        {todayRelation && (
                          <div
                            className={`mt-2 inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${todayRelation.borderClass}`}
                          >
                            <span
                              className={`font-medium truncate ${todayRelation.colorClass}`}
                            >
                              {profile?.name ?? "내"} 일간과{" "}
                              {todayRelation.label}
                            </span>
                            <span className="text-muted-foreground shrink-0">
                              {todayRelation.score}/10
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                        <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-2 py-2 text-center">
                          <div className="text-muted-foreground">재물</div>
                          <div className="font-semibold text-foreground mt-0.5">
                            {dailyFortune.moneyScore}
                          </div>
                        </div>
                        <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-2 py-2 text-center">
                          <div className="text-muted-foreground">애정</div>
                          <div className="font-semibold text-foreground mt-0.5">
                            {dailyFortune.loveScore}
                          </div>
                        </div>
                        <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-2 py-2 text-center">
                          <div className="text-muted-foreground">직업</div>
                          <div className="font-semibold text-foreground mt-0.5">
                            {dailyFortune.careerScore}
                          </div>
                        </div>
                        <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-2 py-2 text-center">
                          <div className="text-muted-foreground">건강</div>
                          <div className="font-semibold text-foreground mt-0.5">
                            {dailyFortune.healthScore}
                          </div>
                        </div>
                      </div>

                      {todayScoreFocus && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              가장 밀어볼 분야
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {todayScoreFocus.best.label} · {todayScoreFocus.best.value}점
                            </p>
                          </div>
                          <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 mb-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              가장 조심할 분야
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {todayScoreFocus.caution.label} · {todayScoreFocus.caution.value}점
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        <div className="rounded-xl border border-primary/15 bg-background/45 px-2.5 py-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            행운 시간
                          </div>
                          <div className="font-medium text-foreground truncate">
                            {dailyFortune.luckyHours?.slice(0, 2).join(" · ") ||
                              "오늘 안에서 조율"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-primary/15 bg-background/45 px-2.5 py-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                            <Palette className="w-3.5 h-3.5 text-primary" />
                            보완 색상
                          </div>
                          <div className="font-medium text-foreground truncate">
                            {(dailyFortune.luckyColors ?? [])
                              .slice(0, 3)
                              .join(" · ") || "보완 색상"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-primary/15 bg-background/45 px-2.5 py-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                            <Hash className="w-3.5 h-3.5 text-primary" />
                            참고 숫자
                          </div>
                          <div className="font-medium text-foreground truncate">
                            {(dailyFortune.luckyNumbers ?? [])
                              .slice(0, 3)
                              .join(" · ") || "오늘 안에서 조율"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-primary/15 bg-background/45 px-2.5 py-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                            <Compass className="w-3.5 h-3.5 text-primary" />
                            방향
                          </div>
                          <div className="font-medium text-foreground truncate">
                            {dailyFortune.luckyDirection}
                            {dailyFortune.avoidDirection && (
                              <span className="text-xs font-normal text-muted-foreground">
                                {" "}
                                · 주의 {dailyFortune.avoidDirection}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            하면 좋은 일
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-1">
                            {
                              (
                                dailyFortune.goodThings ?? [dailyFortune.advice]
                              ).slice(0, 1)[0]
                            }
                          </p>
                        </div>
                        <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 mb-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            피해야 할 일
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-1">
                            {
                              (
                                dailyFortune.avoidThings ?? [
                                  dailyFortune.advice,
                                ]
                              ).slice(0, 1)[0]
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-4 text-sm text-muted-foreground">
                      오늘 운세를 아직 불러오지 못함.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-primary/15 bg-background/25 p-4 md:p-5 xl:col-span-2">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-foreground">
                        이번 달 월운
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {monthlyFortune && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowMonthlyDetailsMobile((current) => !current)
                          }
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground lg:hidden"
                        >
                          {showMonthlyDetailsMobile ? (
                            <>
                              간단히 보기
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              자세히 보기
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                      <Link
                        href="/monthly-fortune"
                        className="text-xs text-primary hover:underline"
                      >
                        전체 보기
                      </Link>
                    </div>
                  </div>

                  {!profile ? (
                    <div className="rounded-2xl border border-primary/15 bg-primary/6 px-4 py-3 text-sm text-muted-foreground">
                      사주를 등록하면 이번 달 재물·직업·관계 흐름을 바로 볼 수
                      있습니다.
                    </div>
                  ) : monthlyFortuneLoading ? (
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm text-muted-foreground">
                      이번 달 월운 불러오는 중.
                    </div>
                  ) : monthlyFortune ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.78fr_1.22fr]">
                      <div className="rounded-2xl border border-primary/15 bg-primary/8 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              {monthlyFortune.monthName}
                            </div>
                            <div className="text-lg font-semibold text-foreground mt-1">
                              {monthlyFortune.wun.stemHanja}
                              {monthlyFortune.wun.branchHanja} ·{" "}
                              {monthlyFortune.wun.tenGod}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-muted-foreground">
                              월운 지수
                            </div>
                            <div
                              className={`text-2xl font-bold ${monthlyScoreTone.textClass}`}
                            >
                              {monthlyFortune.scores.overall}점
                            </div>
                            <div
                              className={`text-[11px] font-medium ${monthlyScoreTone.textClass}`}
                            >
                              {monthlyScoreTone.label}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-background/70 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${monthlyScoreTone.barClass}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, monthlyFortune.scores.overall))}%`,
                            }}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-primary/20 bg-background/45 px-2 py-0.5 text-xs text-muted-foreground">
                            세운 {monthlyFortune.seun.stemHanja}
                            {monthlyFortune.seun.branchHanja}
                          </span>
                          <span className="rounded-full border border-primary/20 bg-background/45 px-2 py-0.5 text-xs text-muted-foreground">
                            월건 {monthlyFortune.wun.stem}
                            {monthlyFortune.wun.branch}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`${showMonthlyDetailsMobile ? "block" : "hidden"} space-y-2 lg:block`}
                      >
                        <p className="rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-foreground/80 leading-relaxed line-clamp-2">
                          {monthlyFortune.summary}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-2 py-2 text-center">
                            <TrendingUp className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-600" />
                            <div className="text-muted-foreground">재물</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              {monthlyFortune.scores.wealth}
                            </div>
                          </div>
                          <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-2 py-2 text-center">
                            <Briefcase className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-600" />
                            <div className="text-muted-foreground">직업</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              {monthlyFortune.scores.career}
                            </div>
                          </div>
                          <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-2 py-2 text-center">
                            <Heart className="w-3.5 h-3.5 mx-auto mb-0.5 text-rose-600" />
                            <div className="text-muted-foreground">관계</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              {monthlyFortune.scores.love}
                            </div>
                          </div>
                          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-2 py-2 text-center">
                            <Activity className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-600" />
                            <div className="text-muted-foreground">건강</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              {monthlyFortune.scores.health}
                            </div>
                          </div>
                        </div>
                        {monthlyScoreFocus && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-3 py-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                이번 달 밀어볼 분야
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {monthlyScoreFocus.best.label} · {monthlyScoreFocus.best.value}점
                              </p>
                            </div>
                            <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 px-3 py-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 mb-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                이번 달 조심할 분야
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {monthlyScoreFocus.caution.label} · {monthlyScoreFocus.caution.value}점
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="rounded-xl border border-primary/15 bg-background/45 px-3 py-2 text-sm text-muted-foreground leading-relaxed line-clamp-1">
                          {monthlyFortune.hapChungNotes[0] ??
                            `이번 달은 ${monthlyFortune.wun.tenGod} 기운을 중심으로 움직입니다.`}
                        </div>
                      </div>
                    </div>
                  ) : monthlyFortuneError ? (
                    <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">
                      이번 달 월운을 불러오지 못했습니다.
                    </div>
                  ) : null}
                </div>

                <div className="xl:col-span-2 grid grid-cols-[repeat(4,minmax(180px,1fr))] gap-3 overflow-x-auto pb-1 lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0">
                  <div className="rounded-3xl border border-primary/15 bg-background/25 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-foreground">
                          최근 리포트
                        </h3>
                      </div>
                      <Link
                        href="/account"
                        className="text-xs text-primary hover:underline"
                      >
                        마이페이지
                      </Link>
                    </div>

                    {reportsLoading ? (
                      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-muted-foreground">
                        리포트 확인 중.
                      </div>
                    ) : latestReport ? (
                      <div className="space-y-2.5">
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {latestReport.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDashboardDate(latestReport.createdAt)}
                                {latestReport.fileName
                                  ? ` · ${latestReport.fileName}`
                                  : ""}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${latestReportStatus.className}`}
                            >
                              {latestReportStatus.label}
                            </span>
                          </div>
                          {latestReport.previewText && (
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-1">
                              {latestReport.previewText}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                            <ReceiptText className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">
                              {latestOrder
                                ? `${getOrderStatusLabel(latestOrder.status)} · ${latestOrder.amount.toLocaleString("ko-KR")}원`
                                : "주문 내역 없음"}
                            </span>
                          </div>
                          {latestReport.status === "ready" ? (
                            <button
                              type="button"
                              onClick={() => {
                                void downloadReportFile(
                                  latestReport.id,
                                  latestReport.fileName ?? latestReport.title,
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/12 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          ) : latestReport.status === "failed" ||
                            latestReport.status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => regenerateReport.mutate(latestReport.id)}
                              disabled={regenerateReport.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/8 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-500/12 transition-colors disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {regenerateReport.isPending
                                ? "재생성 중"
                                : "다시 생성"}
                            </button>
                          ) : (
                            <Link
                              href="/account"
                              className="text-xs text-primary hover:underline shrink-0"
                            >
                              상태 보기
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-muted-foreground">
                        아직 구매한 리포트 없음.
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-primary/15 bg-background/25 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <MessageCircleQuestion className="w-4 h-4 text-sky-600" />
                        <h3 className="font-medium text-foreground">
                          AI 질문
                        </h3>
                      </div>
                      <Link
                        href="/saju"
                        className="text-xs text-primary hover:underline"
                      >
                        질문하기
                      </Link>
                    </div>

                    {aiQuestionsLoading ? (
                      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-muted-foreground">
                        이용 현황 확인 중.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] text-muted-foreground">
                                현재 플랜
                              </div>
                              <div className="mt-1 font-medium text-sm text-foreground">
                                {aiPlanLabel} · {aiUsageLabel}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full border border-sky-500/25 bg-sky-500/8 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                              {hasUnlimitedAiAccess ? "무제한" : "월간"}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            최근 저장된 질문 {aiQuestionCount}개
                          </div>
                        </div>

                        {latestAiQuestion ? (
                          <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-2.5">
                            <div className="text-[11px] text-sky-700/80">
                              최근 질문
                            </div>
                            <p className="mt-1 text-xs text-foreground/80 leading-relaxed line-clamp-2">
                              {latestAiQuestion.question}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-muted-foreground">
                            아직 AI 질문 기록 없음.
                          </div>
                        )}

                        <div className="rounded-xl border border-primary/15 bg-background/45 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] text-primary/75">
                              추천 질문
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopyRecommendedAiPrompt();
                              }}
                              className="text-[11px] text-primary hover:underline"
                            >
                              {aiPromptCopied ? "복사됨" : "질문 복사"}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-foreground/80 leading-relaxed line-clamp-2">
                            {recommendedAiPrompt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">
                              {latestAiQuestion
                                ? `${formatDashboardDate(latestAiQuestion.createdAt)} 마지막 질문`
                                : "사주 해석 뒤 바로 이어서 물어볼 수 있어요"}
                            </span>
                          </div>
                          <Link
                            href="/saju"
                            className="text-xs text-primary hover:underline shrink-0"
                          >
                            {aiQuestionsExhausted ? "사주 보기" : "질문하러 가기"}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-primary/15 bg-background/25 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <BookmarkPlus className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-foreground">
                          저장한 길일
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {bookmarks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              void handleClearBookmarks();
                            }}
                            disabled={bookmarksClearing}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {bookmarksClearing ? "비우는 중" : "전체 비우기"}
                          </button>
                        )}
                        <Link
                          href="/lucky-calendar"
                          className="text-xs text-primary hover:underline"
                        >
                          길일 달력
                        </Link>
                      </div>
                    </div>
                    {bookmarks.length > 0 ? (
                      <div className="space-y-2">
                        {upcomingBookmarkSummary && (
                          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] text-emerald-700/80">
                                  가장 가까운 길일
                                </div>
                                <div className="mt-1 text-sm font-medium text-foreground">
                                  {upcomingBookmarkSummary.description}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-semibold text-emerald-700">
                                  {upcomingBookmarkSummary.label}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {upcomingBookmarkSummary.grade}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {sortedBookmarks.slice(0, 2).map((bookmark) => {
                          const diffDays = getDateDiffFromToday(
                            bookmark,
                            todayDate,
                          );
                          const countdownLabel =
                            diffDays === null
                              ? ""
                              : diffDays === 0
                                ? "오늘"
                                : diffDays === 1
                                  ? "내일"
                                  : diffDays > 1
                                    ? `D-${diffDays}`
                                    : "";

                          return (
                            <Link
                              key={bookmark.id}
                              href={bookmark.href}
                              className="block rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-3 hover:bg-foreground/8 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium text-sm text-foreground truncate">
                                  {bookmark.title}
                                </div>
                                <div className="text-xs text-primary shrink-0">
                                  {bookmark.grade}
                                  {countdownLabel ? ` · ${countdownLabel}` : ""}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatBookmarkDate(bookmark)} ·{" "}
                                {bookmark.purposeLabel}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-muted-foreground">
                        아직 저장한 길일 없음.
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-primary/15 bg-background/25 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-foreground">
                          최근 본 분석
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {recentActivities.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              void handleClearRecentActivities();
                            }}
                            disabled={recentActivitiesClearing}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {recentActivitiesClearing ? "비우는 중" : "기록 비우기"}
                          </button>
                        )}
                        <Link
                          href="/account"
                          className="text-xs text-primary hover:underline"
                        >
                          전체 보기
                        </Link>
                      </div>
                    </div>
                    {recentActivities.length > 0 ? (
                      <div className="space-y-2.5">
                        {latestRecentActivity && (
                          <Link
                            href={latestRecentActivity.href}
                            className="block rounded-2xl border border-primary/15 bg-primary/6 px-3 py-3 hover:bg-primary/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getRecentActivityMeta(latestRecentActivity.kind).className}`}
                                  >
                                    {getRecentActivityMeta(latestRecentActivity.kind).label}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatDashboardDate(
                                      latestRecentActivity.createdAt,
                                    )}
                                  </span>
                                </div>
                                <div className="mt-2 font-medium text-sm text-foreground">
                                  {latestRecentActivity.title}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                  {latestRecentActivity.subtitle ??
                                    "바로 이어서 다시 볼 수 있습니다."}
                                </p>
                              </div>
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${getRecentActivityMeta(latestRecentActivity.kind).className}`}
                              >
                                {(() => {
                                  const Icon = getRecentActivityMeta(
                                    latestRecentActivity.kind,
                                  ).icon;
                                  return <Icon className="w-4 h-4" />;
                                })()}
                              </div>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                              이어서 보기
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </Link>
                        )}

                        {recentActivities.slice(1, 3).map((activity) => (
                          <Link
                            key={activity.id}
                            href={activity.href}
                            className="block rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-3 hover:bg-foreground/8 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-foreground truncate">
                                  {activity.title}
                                </div>
                                {activity.subtitle && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {activity.subtitle}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getRecentActivityMeta(activity.kind).className}`}
                              >
                                {getRecentActivityMeta(activity.kind).label}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-sm text-muted-foreground">
                        아직 최근 기록 없음.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 메인 기능 카드 */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <Link href="/saju" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                사주팔자 (四柱八字)
              </h3>
              <p className="text-muted-foreground mb-8">
                태어난 연월일시를 바탕으로 당신의 평생 운의 흐름과 오행의 조화를
                분석합니다.
              </p>
              <div className="flex items-center text-primary font-medium group-hover:gap-3 transition-all gap-2">
                분석하기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/daily-fortune" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 border border-accent/30 group-hover:scale-110 transition-transform">
                <Sun className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                오늘의 일진 (日辰)
              </h3>
              <p className="text-muted-foreground mb-8">
                오늘의 천간지지가 내 사주와 어떻게 맞물리는지 풀어드립니다.
                재물·애정·건강·직업 운은 물론, 오늘 특히 조심해야 할 것과
                적극적으로 나서면 좋은 분야까지 구체적으로 안내합니다.
              </p>
              <div className="flex items-center text-accent font-medium group-hover:gap-3 transition-all gap-2">
                확인하기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/manseryok" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                만세력 (萬年曆)
              </h3>
              <p className="text-muted-foreground mb-8">
                한 달의 날마다 깃든 오행 기운과 운세 점수를 달력 위에 펼칩니다.
                길일·흉일을 한눈에 파악해 이사, 계약, 중요한 만남 등 결정적인
                날을 현명하게 고르세요.
              </p>
              <div className="flex items-center text-emerald-600 font-medium group-hover:gap-3 transition-all gap-2">
                달력보기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/gungap" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(251,113,133,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-3xl group-hover:bg-rose-400/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-rose-400/20 flex items-center justify-center mb-6 border border-rose-400/30 group-hover:scale-110 transition-transform">
                <Heart className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                궁합 &amp; 연애운
              </h3>
              <p className="text-muted-foreground mb-8">
                솔로라면 언제 인연을 만날지 월별 흐름으로, 연인이 있다면 두
                사람의 오행 궁합을 종합 점수와 지지 관계로 풀어드립니다.
              </p>
              <div className="flex items-center text-rose-600 font-medium group-hover:gap-3 transition-all gap-2">
                분석하기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* 전체 기능 미리보기 (비로그인 방문자용 — 발견성) */}
      {!isAuthenticated && (
        <motion.div
          className="w-full max-w-5xl mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">
              all features
            </p>
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
              명해원의 모든 분석
            </h2>
            <p className="text-muted-foreground text-sm">
              로그인하면 아래 분석을 모두 이용할 수 있습니다
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {PREVIEW_FEATURES.map((f) => (
              <Link key={f.href} href={f.href} className="block group h-full">
                <div className="h-full flex items-start gap-3 rounded-2xl border border-foreground/10 bg-card/30 backdrop-blur-xl p-4 transition-all duration-300 hover:bg-card/50 hover:border-primary/30 hover:-translate-y-0.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${f.iconClass}`}
                  >
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {f.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {isAuthenticated && (
        <motion.div
          className="w-full max-w-5xl mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">
              member only
            </p>
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
              회원 전용 서비스
            </h2>
            <p className="text-muted-foreground text-sm">
              로그인한 회원만 볼 수 있는 분석 화면만 따로 모았습니다
            </p>
          </div>

          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] tracking-[0.18em] uppercase text-primary/65">
                지금 추천 분석
              </p>
            </div>
            <div className="grid grid-cols-[repeat(3,minmax(220px,1fr))] gap-3 overflow-x-auto pb-1 lg:grid-cols-3 lg:overflow-visible lg:pb-0">
              {memberServiceRecommendations.map((service) => {
                const Icon = service.icon;

                return (
                  <Link
                    key={`${service.badge}-${service.href}`}
                    href={service.href}
                    className="block rounded-2xl border border-primary/15 bg-background/35 px-3 py-3 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">
                          {service.badge}
                        </div>
                        <div className="mt-1 font-medium text-sm text-foreground">
                          {service.title}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${service.toneClass}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      바로 열기
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] tracking-[0.18em] uppercase text-primary/65">
                  주제별 바로가기
                </p>
              </div>
              <div className="grid grid-cols-[repeat(6,minmax(140px,1fr))] gap-2 overflow-x-auto pb-1 lg:grid-cols-6 lg:overflow-visible lg:pb-0">
                {memberTopicShortcuts.map((shortcut) => (
                  <Link
                    key={`${shortcut.label}-${shortcut.href}`}
                    href={shortcut.href}
                    className="block rounded-2xl border border-primary/10 bg-background/30 px-3 py-3 hover:bg-background/45 transition-colors"
                  >
                    <div
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${shortcut.toneClass}`}
                    >
                      {shortcut.label}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {shortcut.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[11px] tracking-[0.18em] uppercase text-primary/65">
                    분석 좁혀보기
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {filteredMemberServiceCards.length}/{MEMBER_SERVICE_CARDS.length}
                  개 표시 중
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {MEMBER_SERVICE_FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMemberServiceFocus(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      memberServiceFocus === option.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-foreground/10 bg-background/35 text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-foreground/10 bg-background/35 px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={memberServiceQuery}
                  onChange={(event) =>
                    setMemberServiceQuery(event.target.value)
                  }
                  placeholder="예: 연애, 대운, 이름, 길일"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {memberServiceQuery && (
                  <button
                    type="button"
                    onClick={() => setMemberServiceQuery("")}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredMemberServiceCards.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {filteredMemberServiceCards.map((card) => {
                const Icon = card.icon;
                const insight = memberServiceInsightByHref[card.href];
                const isRecommended = recommendedMemberServiceHrefs.has(card.href);

                return (
                  <motion.div key={card.href} variants={item}>
                    <Link href={card.href} className="block group h-full">
                      <div
                        className={`h-full rounded-3xl border bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:-translate-y-2 relative overflow-hidden ${card.cardClass} ${card.shadowClass}`}
                      >
                        <div
                          className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors ${card.orbClass}`}
                        />
                        {(insight || isRecommended) && (
                          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
                            {insight && (
                              <div
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${insight.className}`}
                              >
                                {insight.label}
                              </div>
                            )}
                            {isRecommended && (
                              <div className="rounded-full border border-primary/20 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-primary backdrop-blur-sm">
                                추천 분석
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border group-hover:scale-110 transition-transform ${insight || isRecommended ? "mt-8" : ""} ${card.iconBoxClass}`}
                        >
                          <Icon className={`w-7 h-7 ${card.textClass}`} />
                        </div>
                        <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                          {card.title}
                        </h3>
                        <p className="text-muted-foreground mb-8">{card.desc}</p>
                        <div
                          className={`flex items-center font-medium group-hover:gap-3 transition-all gap-2 ${card.textClass}`}
                        >
                          {card.action} <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="rounded-3xl border border-foreground/10 bg-background/35 px-4 py-5 text-sm text-muted-foreground">
              검색 결과가 없습니다. 다른 키워드나 주제를 선택해보세요.
            </div>
          )}
        </motion.div>
      )}

      {/* 사주 자료실 (전체 공개) */}
      <motion.div
        className="w-full max-w-5xl mt-16"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">
            reference
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            사주 자료실
          </h2>
          <p className="text-muted-foreground text-sm">
            사주를 더 깊이 이해하고 싶다면 — 누구나 볼 수 있는 무료 해설
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            <Link href="/sinsal-guide" className="block group h-full">
              <div className="h-full rounded-3xl border border-amber-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(251,191,36,0.15)] hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl group-hover:bg-amber-400/20 transition-colors" />
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 flex items-center justify-center mb-6 border border-amber-400/30 group-hover:scale-110 transition-transform">
                  <Star className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                  신살(神殺) 안내
                </h3>
                <p className="text-muted-foreground mb-8">
                  천을귀인·도화살·역마살·12신살·백호살·괴강살 등 23종 신살의
                  의미, 긍정적 활용법, 주의사항을 상세히 해설합니다.
                </p>
                <div className="flex items-center text-amber-600 font-medium group-hover:gap-3 transition-all gap-2">
                  알아보기 <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/glossary" className="block group h-full">
              <div className="h-full rounded-3xl border border-sky-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-3xl group-hover:bg-sky-400/20 transition-colors" />
                <div className="w-14 h-14 rounded-2xl bg-sky-400/20 flex items-center justify-center mb-6 border border-sky-400/30 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-sky-600" />
                </div>
                <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                  사주 용어 사전
                </h3>
                <p className="text-muted-foreground mb-8">
                  천간·지지·오행·십신·격국·합충형 등 사주 핵심 용어 77가지를
                  카테고리별로 쉽고 정확하게 정리했습니다.
                </p>
                <div className="flex items-center text-sky-600 font-medium group-hover:gap-3 transition-all gap-2">
                  찾아보기 <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

      {isAdmin && (
        <motion.div
          className="w-full max-w-5xl mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">
              admin only
            </p>
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
              관리자 전용 자료실
            </h2>
            <p className="text-muted-foreground text-sm">
              일반 회원에게는 숨겨진 내부 참고 화면만 따로 분리했습니다
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Link href="/saju-tables" className="block group h-full">
                <div className="h-full rounded-3xl border border-orange-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(251,146,60,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl group-hover:bg-orange-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-orange-400/20 flex items-center justify-center mb-6 border border-orange-400/30 group-hover:scale-110 transition-transform">
                    <TableProperties className="w-7 h-7 text-orange-700" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                    이론 조견표
                  </h3>
                  <p className="text-muted-foreground mb-8">
                    합충형·삼재·귀문살·장간처럼 자주 찾는 이론 표를 관리자
                    화면에서 빠르게 확인합니다.
                  </p>
                  <div className="flex items-center text-orange-700 font-medium group-hover:gap-3 transition-all gap-2">
                    열어보기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/day-pillar-analysis" className="block group h-full">
                <div className="h-full rounded-3xl border border-cyan-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl group-hover:bg-cyan-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-cyan-400/20 flex items-center justify-center mb-6 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <Search className="w-7 h-7 text-cyan-700" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">
                    일주 분석 검색
                  </h3>
                  <p className="text-muted-foreground mb-8">
                    계묘·癸卯처럼 60갑자 일주를 직접 검색해서 다른 사람의 일주
                    해석도 바로 찾아봅니다.
                  </p>
                  <div className="flex items-center text-cyan-700 font-medium group-hover:gap-3 transition-all gap-2">
                    검색하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* 문의하기 섹션 */}
      <motion.div
        className="w-full max-w-5xl mt-16"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">
            consultation
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            상담 문의
          </h2>
          <p className="text-muted-foreground text-sm">
            궁금하신 사항을 문의해 주시면 정성껏 답변해 드립니다
          </p>
        </div>

        {suggestedInquiry && (
          <button
            type="button"
            onClick={() =>
              openInquiry(suggestedInquiry.type, {
                message: suggestedInquiry.message,
                person1: inquiryProfileDraft,
              })
            }
            className="mb-4 w-full rounded-2xl border border-primary/20 bg-primary/6 px-4 py-4 text-left transition-colors hover:bg-primary/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary/70">
                    추천 문의
                  </span>
                </div>
                <div className="mt-2 font-semibold text-foreground">
                  {suggestedInquiry.title}
                </div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {suggestedInquiry.description}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background/50 px-2.5 py-1 text-xs font-medium text-primary shrink-0">
                초안 열기
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 사주 문의 */}
          <button
            onClick={() =>
              openInquiry(
                "saju",
                inquiryProfileDraft ? { person1: inquiryProfileDraft } : undefined,
              )
            }
            className="group text-left rounded-2xl border border-primary/25 bg-card/30 backdrop-blur-xl p-6 transition-all duration-400 hover:bg-card/50 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/8 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-4 border border-primary/25 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-1.5 text-foreground">
              사주 문의
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              생년월일시를 바탕으로 사주·운세·적성 등 궁금한 점을 상담하세요.
            </p>
            <div className="flex items-center gap-1 mt-4 text-primary text-xs font-medium group-hover:gap-2 transition-all">
              문의하기 <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 궁합 문의 */}
          <button
            onClick={() => openInquiry("gungap")}
            className="group text-left rounded-2xl border border-rose-400/25 bg-card/30 backdrop-blur-xl p-6 transition-all duration-400 hover:bg-card/50 hover:border-rose-400/50 hover:shadow-[0_0_30px_rgba(251,113,133,0.12)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-400/8 rounded-full blur-2xl group-hover:bg-rose-400/15 transition-colors" />
            <div className="w-11 h-11 rounded-xl bg-rose-400/15 flex items-center justify-center mb-4 border border-rose-400/25 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-semibold text-base mb-1.5 text-foreground">
              궁합 문의
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              연인·배우자·비즈니스 파트너와의 궁합을 전문가에게 직접 물어보세요.
            </p>
            <div className="flex items-center gap-1 mt-4 text-rose-600 text-xs font-medium group-hover:gap-2 transition-all">
              문의하기 <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 일반 문의 */}
          <button
            onClick={() => openInquiry("general")}
            className="group text-left rounded-2xl border border-sky-400/25 bg-card/30 backdrop-blur-xl p-6 transition-all duration-400 hover:bg-card/50 hover:border-sky-400/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.12)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/8 rounded-full blur-2xl group-hover:bg-sky-400/15 transition-colors" />
            <div className="w-11 h-11 rounded-xl bg-sky-400/15 flex items-center justify-center mb-4 border border-sky-400/25 group-hover:scale-110 transition-transform">
              <FileQuestion className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="font-semibold text-base mb-1.5 text-foreground">
              일반 문의
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              서비스 이용이나 기타 궁금한 점을 자유롭게 남겨주세요.
            </p>
            <div className="flex items-center gap-1 mt-4 text-sky-600 text-xs font-medium group-hover:gap-2 transition-all">
              문의하기 <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </motion.div>

      <HomeInquiryModal
        open={inquiryOpen}
        type={inquiryType}
        initialMessage={inquiryDraft.message}
        initialPerson1={inquiryDraft.person1}
        initialPerson2={inquiryDraft.person2}
        onClose={() => {
          setInquiryOpen(false);
          setInquiryDraft({});
        }}
      />
    </div>
  );
}
