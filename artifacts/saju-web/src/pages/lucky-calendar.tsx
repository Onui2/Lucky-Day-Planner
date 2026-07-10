import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearch } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useUser } from "@/contexts/UserContext";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Loader2, Sparkles, ChevronLeft, ChevronRight, Calendar, Star, Trophy, Home,
  Briefcase, Heart, FileText, BookOpen, Plane, Activity, TrendingUp, BookmarkPlus, Trash2, CheckCheck,
  Bell, BellOff, CalendarPlus, Clock3, ExternalLink,
} from "lucide-react";
import ProfileModal from "@/components/ProfileModal";
import { useResolvedProfile } from "@/lib/resolved-profile";
import {
  addRecentActivity,
  createLuckyDayBookmarkId,
  formatBookmarkDate,
} from "@/lib/member-insights";
import { useLuckyDayBookmarks } from "@/hooks/use-lucky-day-bookmarks";
import { appendBirthPrecisionParams } from "@/lib/birth-precision";
import {
  buildGoogleCalendarUrl,
  downloadIcs,
  parseRecommendedHour,
  type CalendarExportEvent,
} from "@/lib/calendar-export";
import { useLuckReminders } from "@/hooks/use-luck-reminders";

const ELEM_COLOR: Record<string,string> = { 목:'text-green-600', 화:'text-rose-600', 토:'text-amber-600', 금:'text-slate-700', 수:'text-blue-600' };
const STEM_HANJA: Record<string,string> = { 갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸' };
const BRANCH_HANJA: Record<string,string> = { 자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥' };

const GRADE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  대길: { bg:'bg-amber-400/20', text:'text-amber-700', border:'border-amber-400/50', label:'대길(大吉)' },
  길:   { bg:'bg-emerald-400/15', text:'text-emerald-600', border:'border-emerald-400/40', label:'길(吉)' },
  보통: { bg:'bg-foreground/5', text:'text-foreground/60', border:'border-foreground/10', label:'보통' },
  흉:   { bg:'bg-rose-400/10', text:'text-rose-600', border:'border-rose-400/20', label:'흉(凶)' },
  대흉: { bg:'bg-rose-600/15', text:'text-rose-700', border:'border-rose-600/40', label:'대흉(大凶)' },
};

const PURPOSES = [
  { key:'이사',  label:'이사', icon: Home, color:'text-amber-600' },
  { key:'개업',  label:'개업', icon: Briefcase, color:'text-emerald-600' },
  { key:'결혼',  label:'결혼', icon: Heart, color:'text-rose-600' },
  { key:'계약',  label:'계약', icon: FileText, color:'text-blue-600' },
  { key:'공부',  label:'공부', icon: BookOpen, color:'text-purple-600' },
  { key:'여행',  label:'여행', icon: Plane, color:'text-sky-600' },
  { key:'건강',  label:'병원', icon: Activity, color:'text-green-600' },
  { key:'투자',  label:'투자', icon: TrendingUp, color:'text-yellow-600' },
];

interface LuckyDay {
  day: number; dayOfWeek: string; ganzi: string; ganziHanja: string;
  stemElement: string; branchElement: string; score: number;
  grade: '대길' | '길' | '보통' | '흉' | '대흉'; tags: string[]; isWeekend: boolean;
  bestHours: Array<{ branch: string; ganzi: string; range: string; score: number; tenGod: string; tags: string[] }>;
}
interface LuckyData {
  year: number; month: number; purpose: string; purposeLabel: string;
  dayMasterStem: string; dayMasterElement: string; yongsin: string;
  days: LuckyDay[]; topDays: number[];
}

async function fetchLuckyDays(
  profile: ReturnType<typeof useUser>['profile'],
  year: number, month: number, purpose: string
): Promise<LuckyData> {
  if (!profile) throw new Error("프로필 없음");
  const params = new URLSearchParams({
    birthYear: String(profile.birthYear), birthMonth: String(profile.birthMonth),
    birthDay: String(profile.birthDay), birthHour: String(profile.birthHour),
    gender: profile.gender, year: String(year), month: String(month), purpose,
  });
  appendBirthPrecisionParams(params, profile);
  return customFetch<LuckyData>(`/api/fortune/lucky-days?${params}`);
}

const WEEKDAY_LABELS = ['일','월','화','수','목','금','토'];

function getDayOfWeekIndex(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

export default function LuckyCalendarPage() {
  const rawSearch = useSearch();
  const searchParams = new URLSearchParams(rawSearch);
  const { profile, hasCachedProfile } = useResolvedProfile();
  const { user } = useAuth();
  const { bookmarks, saveBookmark, removeBookmark, isSaving, isRemoving } = useLuckyDayBookmarks();
  const { isEnabled: isReminderEnabled, toggle: toggleReminder, message: reminderMessage } = useLuckReminders(user?.id);
  const [profileOpen, setProfileOpen] = useState(false);
  const now = new Date();
  const initialYear = Number(searchParams.get("y")) || now.getFullYear();
  const initialMonth = Number(searchParams.get("m")) || now.getMonth() + 1;
  const initialPurpose = PURPOSES.some((item) => item.key === searchParams.get("p")) ? searchParams.get("p") ?? "이사" : "이사";
  const initialDay = Number(searchParams.get("d")) || null;

  const [year, setYear]     = useState(initialYear);
  const [month, setMonth]   = useState(initialMonth);
  const [purpose, setPurpose] = useState(initialPurpose);
  const [selectedDay, setSelectedDay] = useState<LuckyDay | null>(null);
  const [requestedDay, setRequestedDay] = useState<number | null>(initialDay);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [saveDone, setSaveDone] = useState(false);
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null);

  const prevMonth = () => {
    setRequestedDay(null);
    setSelectedDay(null);
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setRequestedDay(null);
    setSelectedDay(null);
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['lucky-days', profile?.birthYear, profile?.birthMonth, profile?.birthDay, profile?.birthHour, profile?.birthMinute, profile?.gender, profile?.calendarType, profile?.isLeapMonth, profile?.timeZone, profile?.longitude, profile?.applyTrueSolarTime, profile?.dayBoundary, year, month, purpose],
    queryFn: () => fetchLuckyDays(profile, year, month, purpose),
    enabled: !!profile,
  });

  const selectedBookmarkId = selectedDay
    ? createLuckyDayBookmarkId(year, month, selectedDay.day, purpose)
    : null;
  const selectedBookmark = useMemo(
    () => bookmarks.find((item) => item.id === selectedBookmarkId) ?? null,
    [bookmarks, selectedBookmarkId],
  );

  useEffect(() => {
    if (!selectedDay || !data) {
      setBookmarkTitle("");
      setBookmarkNote("");
      return;
    }

    const defaultTitle = `${formatBookmarkDate({ year, month, day: selectedDay.day })} ${data.purposeLabel}`;
    setBookmarkTitle(selectedBookmark?.title ?? defaultTitle);
    setBookmarkNote(selectedBookmark?.note ?? "");
  }, [data, month, selectedBookmark, selectedDay, year]);

  useEffect(() => {
    if (!data || !requestedDay || selectedDay) return;
    const matched = data.days.find((item) => item.day === requestedDay) ?? null;
    if (matched) {
      setSelectedDay(matched);
    }
  }, [data, requestedDay, selectedDay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("y", String(year));
    url.searchParams.set("m", String(month));
    url.searchParams.set("p", purpose);

    if (selectedDay) {
      url.searchParams.set("d", String(selectedDay.day));
    } else {
      url.searchParams.delete("d");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [month, purpose, selectedDay, year]);

  // 달력 첫 날 요일
  const firstDow = getDayOfWeekIndex(year, month, 1);

  async function handleSaveBookmark() {
    if (!user?.id || !selectedDay || !data || !selectedBookmarkId) return;

    try {
      setBookmarkMessage(null);
      const bookmark = await saveBookmark({
        id: selectedBookmarkId,
        title: bookmarkTitle.trim() || `${formatBookmarkDate({ year, month, day: selectedDay.day })} ${data.purposeLabel}`,
        note: bookmarkNote.trim() || undefined,
        year,
        month,
        day: selectedDay.day,
        purpose,
        purposeLabel: data.purposeLabel,
        ganzi: selectedDay.ganzi,
        ganziHanja: selectedDay.ganziHanja,
        grade: selectedDay.grade,
        score: selectedDay.score,
        tags: selectedDay.tags,
      });

      void addRecentActivity(user.id, {
        id: `lucky-day:${bookmark.id}`,
        kind: "lucky-day",
        title: bookmark.title,
        subtitle: `${bookmark.purposeLabel} · ${bookmark.ganziHanja} · ${bookmark.grade}`,
        href: bookmark.href,
        createdAt: new Date().toISOString(),
      });

      setSaveDone(true);
      setBookmarkMessage(null);
      window.setTimeout(() => setSaveDone(false), 1800);
    } catch (error) {
      setSaveDone(false);
      setBookmarkMessage(error instanceof Error ? error.message : "길일 저장 실패");
    }
  }

  async function handleRemoveBookmark(bookmarkId: string) {
    try {
      setBookmarkMessage(null);
      await removeBookmark(bookmarkId);
      setSaveDone(false);
    } catch (error) {
      setBookmarkMessage(error instanceof Error ? error.message : "길일 삭제 실패");
    }
  }

  function selectedCalendarEvent(): CalendarExportEvent | null {
    if (!selectedDay || !data) return null;
    const recommended = parseRecommendedHour(selectedDay.bestHours[0]?.range);
    return {
      title: `${data.purposeLabel} 추천 길일`,
      description: `${selectedDay.ganziHanja}(${selectedDay.ganzi}) ${selectedDay.grade} ${selectedDay.score}점. ${selectedDay.tags.join(" · ")}`,
      location: profile?.birthPlace,
      year,
      month,
      day: selectedDay.day,
      startHour: recommended.hour,
      startMinute: recommended.minute,
      durationMinutes: 120,
      timeZone: profile?.timeZone ?? "Asia/Seoul",
    };
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary/70 text-sm font-medium mb-1">
          <Calendar className="w-4 h-4" /><span>吉日 선택</span>
        </div>
        <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
          길일 달력
        </h1>
        <p className="text-muted-foreground text-sm">내 사주에 맞는 좋은 날을 찾아드립니다</p>
      </motion.div>

      {/* 프로필 없음 */}
      {!profile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-panel border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary/50 mx-auto" />
          <p className="text-muted-foreground">길일을 계산하려면 먼저 사주를 계산하거나 프로필을 등록해주세요.</p>
          <Button onClick={() => setProfileOpen(true)} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40">
            내 사주 등록하기
          </Button>
        </motion.div>
      )}

      {profile && (
        <>
          {hasCachedProfile && (
            <div className="glass-panel border border-primary/20 rounded-2xl p-4 text-sm text-muted-foreground">
              최근 계산한 사주 기준으로 길일을 보여주고 있습니다. 프로필로 저장하면 다른 메뉴에서도 계속 이어집니다.
            </div>
          )}
          {/* 목적 선택 */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {PURPOSES.map(p => {
              const Icon = p.icon;
              const isActive = purpose === p.key;
              return (
                <button key={p.key} onClick={() => { setPurpose(p.key); setSelectedDay(null); setRequestedDay(null); }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-all",
                    isActive ? "border-primary/60 bg-primary/15 text-primary" : "border-foreground/10 bg-foreground/5 text-muted-foreground hover:border-foreground/10"
                  )}>
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : p.color)} />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* 월 선택 */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full border border-foreground/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-lg font-bold">{year}년 {month}월</p>
              {data && <p className="text-xs text-primary">{data.purposeLabel} 길일</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full border border-foreground/10">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="glass-panel border border-rose-400/20 rounded-2xl p-6 text-center text-rose-600">
              길일 계산 중 오류가 발생했습니다.
            </div>
          )}

          {data && (
            <motion.div key={`${year}-${month}-${purpose}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* 추천 날 */}
              {data.topDays.length > 0 && (
                <div className="glass-panel border border-amber-400/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <h3 className="font-medium text-sm">이달의 추천 날</h3>
                    <span className="text-xs text-muted-foreground">({data.purposeLabel}에 가장 좋은 날)</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {data.topDays.map(d => {
                      const day = data.days.find(dd => dd.day === d);
                      if (!day) return null;
                      return (
                        <button key={d} onClick={() => { setSelectedDay(day); setRequestedDay(day.day); }}
                          className="flex flex-col items-center bg-amber-400/15 border border-amber-400/40 rounded-xl px-3 py-2 hover:bg-amber-400/25 transition-colors">
                          <span className="text-amber-700 font-bold text-sm">{d}일</span>
                          <span className="text-xs text-muted-foreground">{day.dayOfWeek}요</span>
                          <span className={cn("text-xs font-serif mt-0.5", ELEM_COLOR[day.stemElement])}>{day.ganziHanja}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 달력 그리드 */}
              <div className="glass-panel border border-foreground/10 rounded-2xl p-4">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-2">
                  {WEEKDAY_LABELS.map(w => (
                    <div key={w} className={cn("text-center text-xs font-medium py-1", w === '일' ? 'text-rose-600' : w === '토' ? 'text-blue-600' : 'text-muted-foreground')}>
                      {w}
                    </div>
                  ))}
                </div>

                {/* 날짜 셀 */}
                <div className="grid grid-cols-7 gap-1">
                  {/* 앞 빈 칸 */}
                  {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}

                  {data.days.map(day => {
                    const gs = GRADE_STYLE[day.grade];
                    const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day.day === now.getDate();
                    const isSelected = selectedDay?.day === day.day;
                    return (
                      <motion.button
                        key={day.day}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedDay(isSelected ? null : day);
                          setRequestedDay(isSelected ? null : day.day);
                        }}
                        className={cn(
                          "relative rounded-lg p-1 border text-center transition-all min-h-[56px] flex flex-col items-center justify-center gap-0.5",
                          gs.bg, gs.border,
                          isSelected && "ring-2 ring-primary/60",
                          isToday && "ring-1 ring-white/40"
                        )}
                      >
                        <span className={cn("text-sm font-bold leading-none", gs.text,
                          day.dayOfWeek === '일' ? 'text-rose-700' : day.dayOfWeek === '토' ? 'text-blue-700' : gs.text
                        )}>
                          {day.day}
                        </span>
                        <span className={cn("text-[10px] font-serif leading-none", ELEM_COLOR[day.stemElement])}>
                          {day.ganziHanja}
                        </span>
                        {(day.grade === '대길' || day.grade === '길') && (
                          <Star className="w-2.5 h-2.5 text-amber-600/80 absolute top-1 right-1" />
                        )}
                        {isToday && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 선택된 날 상세 */}
              {selectedDay && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("glass-panel border rounded-2xl p-5", GRADE_STYLE[selectedDay.grade].border)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold">{year}년 {month}월 {selectedDay.day}일</span>
                        <span className="text-sm text-muted-foreground">({selectedDay.dayOfWeek}요일)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("font-serif font-bold text-2xl", ELEM_COLOR[selectedDay.stemElement])}>
                          {selectedDay.ganziHanja}
                        </span>
                        <span className="text-sm text-muted-foreground">({selectedDay.ganzi})</span>
                        <span className={cn("text-sm font-bold px-2 py-0.5 rounded-full border", GRADE_STYLE[selectedDay.grade].text, GRADE_STYLE[selectedDay.grade].bg, GRADE_STYLE[selectedDay.grade].border)}>
                          {GRADE_STYLE[selectedDay.grade].label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">길흉 점수</p>
                      <p className={cn("text-xl font-bold", GRADE_STYLE[selectedDay.grade].text)}>{selectedDay.score}점</p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">오행:</span>
                    <span className={cn("text-xs", ELEM_COLOR[selectedDay.stemElement])}>천간 {selectedDay.stemElement}</span>
                    <span className={cn("text-xs", ELEM_COLOR[selectedDay.branchElement])}>지지 {selectedDay.branchElement}</span>
                  </div>

                  {selectedDay.tags.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {selectedDay.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-foreground/8 border border-foreground/10 px-2 py-0.5 rounded-full text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedDay.bestHours.length > 0 && (
                    <div className="mt-4 border-y border-primary/15 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium mb-3">
                        <Clock3 className="w-4 h-4 text-primary" />추천 시간
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {selectedDay.bestHours.map((hour, index) => (
                          <div key={`${hour.ganzi}-${hour.range}`} className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">{index + 1}. {hour.range}</span>
                              <span className="text-xs font-bold text-primary">{hour.score}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{hour.ganzi} · {hour.tenGod}</div>
                            {hour.tags.length > 0 && <div className="text-[11px] text-foreground/60 mt-1">{hour.tags.join(" · ")}</div>}
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const event = selectedCalendarEvent();
                        if (!event) return null;
                        const reminderEnabled = isReminderEnabled(event);
                        return (
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => downloadIcs(event)}>
                              <CalendarPlus className="w-4 h-4" />일정 파일
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="w-4 h-4" />Google 캘린더
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void toggleReminder(event)}>
                              {reminderEnabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                              {reminderEnabled ? "알림 해제" : "브라우저 알림"}
                            </Button>
                          </div>
                        );
                      })()}
                      {reminderMessage && <p className="text-xs text-muted-foreground mt-2">{reminderMessage}</p>}
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">길일 저장</h3>
                        <p className="text-xs text-muted-foreground">자주 볼 날짜를 메모와 함께 저장</p>
                      </div>
                      {selectedBookmark && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveBookmark(selectedBookmark.id)}
                          disabled={isRemoving}
                          className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-700 transition-colors disabled:opacity-50"
                        >
                          {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          저장 취소
                        </button>
                      )}
                    </div>

                    <Input
                      value={bookmarkTitle}
                      onChange={(e) => setBookmarkTitle(e.target.value)}
                      placeholder="예) 계약하기 좋은 날"
                      className="bg-background/40 border-primary/15"
                    />
                    <Textarea
                      value={bookmarkNote}
                      onChange={(e) => setBookmarkNote(e.target.value)}
                      placeholder="메모를 남겨두면 홈/계정에서 다시 보기 좋음"
                      className="min-h-[84px] bg-background/40 border-primary/15 resize-none"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" onClick={() => void handleSaveBookmark()} className="gap-2" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveDone ? <CheckCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                        {selectedBookmark ? "저장 내용 업데이트" : "길일 저장"}
                      </Button>
                      {saveDone && (
                        <span className="text-xs text-emerald-600">저장 완료</span>
                      )}
                    </div>
                    {bookmarkMessage && (
                      <p className="text-xs text-rose-700">{bookmarkMessage}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {bookmarks.length > 0 && (
                <div className="glass-panel border border-primary/15 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">저장한 길일</h3>
                      <p className="text-xs text-muted-foreground">최근 저장한 일정 메모</p>
                    </div>
                    <span className="text-xs text-primary">{bookmarks.length}개</span>
                  </div>

                  <div className="space-y-2">
                    {bookmarks.slice(0, 4).map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-3 flex items-start justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setYear(bookmark.year);
                            setMonth(bookmark.month);
                            setPurpose(bookmark.purpose);
                            setSelectedDay(null);
                            setRequestedDay(bookmark.day);
                          }}
                          className="text-left min-w-0 flex-1"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{bookmark.title}</span>
                            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", GRADE_STYLE[bookmark.grade].text, GRADE_STYLE[bookmark.grade].bg, GRADE_STYLE[bookmark.grade].border)}>
                              {bookmark.grade}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatBookmarkDate(bookmark)} · {bookmark.purposeLabel} · {bookmark.ganziHanja}
                          </div>
                          {bookmark.note && (
                            <div className="text-xs text-foreground/70 mt-1.5 line-clamp-2">
                              {bookmark.note}
                            </div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRemoveBookmark(bookmark.id)}
                          disabled={isRemoving}
                          className="text-muted-foreground hover:text-rose-700 transition-colors disabled:opacity-50"
                        >
                          {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 범례 */}
              <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
                {Object.entries(GRADE_STYLE).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 rounded border", val.bg, val.border)} />
                    <span>{val.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {profileOpen && <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
