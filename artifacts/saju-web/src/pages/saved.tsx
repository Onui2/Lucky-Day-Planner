import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetSavedSaju, useDeleteSavedSaju, useRenameSavedSaju, type SavedSajuItem } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Pencil, Check, X, BookMarked, LogIn, ChevronRight, Sun, CalendarDays, HeartHandshake, Search, History } from "lucide-react";
import { Link, useLocation } from "wouter";
import { buildAuthHref } from "@/lib/auth-redirect";
import { createBirthProfileSearchParams } from "@/lib/birth-profile-query";

const GENDER_MAP: Record<string, string> = { male: '남성', female: '여성' };
const CALENDAR_MAP: Record<string, string> = { solar: '양력', lunar: '음력' };

type SortOrder = "recent" | "name" | "birth";

function formatHour(h: number, minute = 0) {
  if (h < 0) return '시간 미입력';
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeSearch(value: string) {
  const normalized = value.normalize("NFC").toLocaleLowerCase("ko-KR").trim();
  const date = normalized.match(/^(\d{4})[\s./년-]+(\d{1,2})[\s./월-]+(\d{1,2})일?$/);
  if (date) return `${date[1]}${date[2].padStart(2, "0")}${date[3].padStart(2, "0")}`;
  return normalized.replace(/[\s./-]/g, "");
}

function matchesSearch(item: SavedSajuItem, query: string) {
  const { year, month, day } = item.birthInfo;
  return [
    item.label,
    `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    `${year}${month}${day}`,
  ].some((value) => normalizeSearch(value).includes(query));
}

function buildSavedProfileHref(item: SavedSajuItem, pathname: string) {
  const params = createBirthProfileSearchParams(item.birthInfo, item.label);
  return `${pathname}?${params.toString()}`;
}

function appendSajuAnalysisParams(params: URLSearchParams, item: SavedSajuItem) {
  const b = item.birthInfo;
  params.set("min", String(b.minute ?? 0));
  if (b.isLeapMonth) params.set("leap", "1");
  if (b.birthPlace) params.set("bp", b.birthPlace);
  if (b.timeZone) params.set("tz", b.timeZone);
  if (typeof b.longitude === "number") params.set("lon", String(b.longitude));
  if (typeof b.latitude === "number") params.set("lat", String(b.latitude));
  if (b.applyTrueSolarTime) params.set("tst", "1");
  if (b.dayBoundary) params.set("db", b.dayBoundary);
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: saved, isLoading, isError, refetch, isFetching } = useGetSavedSaju(isAuthenticated);
  const deleteMut = useDeleteSavedSaju();
  const renameMut = useRenameSavedSaju();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [actionError, setActionError] = useState("");

  const query = normalizeSearch(search);
  const visibleItems = (saved ?? []).filter((item) => matchesSearch(item, query)).sort((a, b) => {
    if (sortOrder === "name") return a.label.localeCompare(b.label, "ko-KR") || a.id - b.id;
    if (sortOrder === "birth") {
      return a.birthInfo.year - b.birthInfo.year
        || a.birthInfo.month - b.birthInfo.month
        || a.birthInfo.day - b.birthInfo.day
        || a.label.localeCompare(b.label, "ko-KR");
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id;
  });

  function startEdit(item: SavedSajuItem) {
    setActionError("");
    setEditingId(item.id);
    setEditLabel(item.label);
  }

  async function commitRename(id: number) {
    if (!editLabel.trim() || renameMut.isPending) return;
    setActionError("");
    try {
      await renameMut.mutateAsync({ id, label: editLabel.trim() });
      setEditingId(null);
    } catch {
      setActionError("이름을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function deleteItem(id: number) {
    if (deleteMut.isPending) return;
    setActionError("");
    try {
      await deleteMut.mutateAsync(id);
      setDeletingId(null);
    } catch {
      setActionError("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  function goToAnalyze(item: SavedSajuItem) {
    const b = item.birthInfo;
    const params = new URLSearchParams({
      y: String(b.year), m: String(b.month), d: String(b.day),
      h: String(b.hour), g: b.gender, c: b.calendarType,
      label: item.label,
    });
    appendSajuAnalysisParams(params, item);
    navigate(`/saju?${params.toString()}`);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-6">
        <BookMarked className="w-16 h-16 text-primary/40 mx-auto" />
        <h2 className="text-2xl font-serif text-foreground">저장된 사주 목록</h2>
        <p className="text-muted-foreground">로그인하면 사주를 저장하고 언제든 다시 분석할 수 있습니다.</p>
        <Button onClick={() => navigate(buildAuthHref("/login"))} className="gap-2">
          <LogIn className="w-4 h-4" /> 로그인하기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold mb-4">
          저장된 사주
        </h1>
        <p className="text-muted-foreground text-lg">저장한 사주를 불러와 언제든 다시 분석하세요.</p>
      </div>

      {actionError && <p role="alert" className="mb-4 text-sm text-rose-600">{actionError}</p>}
      {isError && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/30 p-4 text-sm space-y-3">
          <p>{saved ? "목록을 새로 불러오지 못했습니다. 이전 목록을 표시합니다." : "저장된 사주를 불러오지 못했습니다."}</p>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
            {isFetching ? "불러오는 중…" : "다시 시도"}
          </Button>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isError && !saved ? null : !saved || saved.length === 0 ? (
        <div className="text-center py-20 space-y-5">
          <BookMarked className="w-16 h-16 text-primary/30 mx-auto" />
          <p className="text-muted-foreground text-lg">아직 저장된 사주가 없습니다.</p>
          <Link href="/saju">
            <Button variant="outline" className="gap-2">사주 분석하러 가기 <ChevronRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      ) : (
        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="saved-search" className="text-sm font-medium">이름·생년월일 검색</label>
                <div className="relative">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="saved-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="예: 홍길동, 1990-01-02" className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5 sm:w-40">
                <label htmlFor="saved-sort" className="text-sm font-medium">정렬</label>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                  <SelectTrigger id="saved-sort"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">최근 저장순</SelectItem>
                    <SelectItem value="name">이름순</SelectItem>
                    <SelectItem value="birth">생년월일순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {sortOrder === "birth" && <p className="text-xs text-muted-foreground">입력한 생년월일의 빠른 순입니다. 음력은 양력으로 변환하지 않습니다.</p>}
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <p role="status" aria-live="polite">{search ? `${visibleItems.length}개 검색됨 · ` : ""}{saved.length}/20개 저장됨</p>
              {search && <Button variant="ghost" size="sm" onClick={() => setSearch("")}>검색 초기화</Button>}
            </div>
          </div>
          {visibleItems.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <p className="text-muted-foreground">검색 결과가 없습니다. 이름이나 생년월일을 확인해 주세요.</p>
              <Button variant="outline" onClick={() => setSearch("")}>전체 목록 보기</Button>
            </div>
          )}
          <AnimatePresence>
            {visibleItems.map((item) => {
              const b = item.birthInfo;
              const isEditing = editingId === item.id;
              const isDeleting = deletingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="glass-panel border-primary/20 hover:border-primary/40 transition-colors">
                    <CardContent className="pt-5 pb-4">
                      {/* 레이블 행 */}
                      <div className="flex items-center gap-2 mb-3">
                        {isEditing ? (
                          <>
                            <Input
                              aria-label="저장된 사주 이름"
                              value={editLabel}
                              disabled={renameMut.isPending}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.nativeEvent.isComposing) void commitRename(item.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-8 text-sm flex-1 max-w-[200px]"
                              maxLength={50}
                              autoFocus
                            />
                            <button aria-label="이름 변경 저장" disabled={renameMut.isPending || !editLabel.trim()} onClick={() => void commitRename(item.id)} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40">
                              <Check className="w-4 h-4" />
                            </button>
                            <button aria-label="이름 변경 취소" disabled={renameMut.isPending} onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-primary text-base">{item.label}</span>
                            <button aria-label={`${item.label} 이름 변경`} disabled={renameMut.isPending} onClick={() => startEdit(item)} className="text-muted-foreground hover:text-primary transition-colors ml-1">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>

                      {/* 생년월일 정보 */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 text-foreground/80">
                          {b.year}년 {b.month}월 {b.day}일
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 text-foreground/80">
                          {formatHour(b.hour, b.minute ?? 0)}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 text-foreground/80">
                          {GENDER_MAP[b.gender] ?? b.gender}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 text-foreground/60">
                          {CALENDAR_MAP[b.calendarType] ?? b.calendarType}
                          {b.calendarType === "lunar" && b.isLeapMonth ? " · 윤달" : ""}
                        </span>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="border-t border-border/40 pt-3">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-rose-600">정말 삭제할까요?</span>
                            <button
                              disabled={deleteMut.isPending}
                              onClick={() => void deleteItem(item.id)}
                              className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 text-xs hover:bg-rose-500/30"
                            >
                              {deleteMut.isPending ? "삭제 중…" : "삭제"}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              disabled={deleteMut.isPending}
                              className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs hover:bg-muted/80"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="grid grid-cols-4 gap-1.5 sm:flex-1">
                              <Link href={buildSavedProfileHref(item, "/daily-fortune")}>
                                <Button variant="outline" size="sm" className="w-full gap-1 text-xs px-2">
                                  <Sun className="w-3.5 h-3.5" />
                                  오늘
                                </Button>
                              </Link>
                              <Link href={buildSavedProfileHref(item, "/lucky-calendar")}>
                                <Button variant="outline" size="sm" className="w-full gap-1 text-xs px-2">
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  길일
                                </Button>
                              </Link>
                              <Link href={buildSavedProfileHref(item, "/gungap")}>
                                <Button variant="outline" size="sm" className="w-full gap-1 text-xs px-2">
                                  <HeartHandshake className="w-3.5 h-3.5" />
                                  궁합
                                </Button>
                              </Link>
                              <Link href={buildSavedProfileHref(item, "/daeun")}>
                                <Button variant="outline" size="sm" className="w-full gap-1 text-xs px-2">
                                  <History className="w-3.5 h-3.5" />
                                  대운
                                </Button>
                              </Link>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-400/10 gap-1"
                                disabled={deleteMut.isPending}
                                onClick={() => { setActionError(""); setDeletingId(item.id); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                삭제
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => goToAnalyze(item)}
                              >
                                분석 보기 <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
