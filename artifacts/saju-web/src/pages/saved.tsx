import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetSavedSaju, useDeleteSavedSaju, useRenameSavedSaju, type SavedSajuItem } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Pencil, Check, X, BookMarked, LogIn, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";

const STEM_HANJA: Record<string, string> = {
  갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸',
};
const BRANCH_HANJA: Record<string, string> = {
  자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥',
};

const GENDER_MAP: Record<string, string> = { male: '남성', female: '여성' };
const CALENDAR_MAP: Record<string, string> = { solar: '양력', lunar: '음력' };

const HOUR_ENTRIES: [number, string][] = [
  [0,'자시(子)'],[2,'축시(丑)'],[4,'인시(寅)'],[6,'묘시(卯)'],[8,'진시(辰)'],
  [10,'사시(巳)'],[12,'오시(午)'],[14,'미시(未)'],[16,'신시(申)'],[18,'유시(酉)'],
  [20,'술시(戌)'],[22,'해시(亥)'],
];

function formatHour(h: number) {
  if (h < 0) return '시간 미입력';
  const norm = h % 2 === 1 ? (h === 23 ? 0 : h + 1) : h; // 홀수 구버전 데이터 정규화
  for (const [k, v] of HOUR_ENTRIES) {
    if (norm >= k && norm < k + 2) return v;
  }
  return `${h}시`;
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { data: saved, isLoading } = useGetSavedSaju(isAuthenticated);
  const deleteMut = useDeleteSavedSaju();
  const renameMut = useRenameSavedSaju();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function startEdit(item: SavedSajuItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
  }

  async function commitRename(id: number) {
    if (!editLabel.trim()) return;
    await renameMut.mutateAsync({ id, label: editLabel.trim() });
    setEditingId(null);
  }

  function goToAnalyze(item: SavedSajuItem) {
    const b = item.birthInfo;
    const params = new URLSearchParams({
      y: String(b.year), m: String(b.month), d: String(b.day),
      h: String(b.hour), g: b.gender, c: b.calendarType,
      label: item.label,
    });
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
        <Button onClick={() => login()} className="gap-2">
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

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !saved || saved.length === 0 ? (
        <div className="text-center py-20 space-y-5">
          <BookMarked className="w-16 h-16 text-primary/30 mx-auto" />
          <p className="text-muted-foreground text-lg">아직 저장된 사주가 없습니다.</p>
          <Link href="/saju">
            <Button variant="outline" className="gap-2">사주 분석하러 가기 <ChevronRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      ) : (
        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm text-muted-foreground text-right">{saved.length}/20개 저장됨</p>
          <AnimatePresence>
            {saved.map((item) => {
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
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(item.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-8 text-sm flex-1 max-w-[200px]"
                              maxLength={50}
                              autoFocus
                            />
                            <button onClick={() => commitRename(item.id)} className="text-emerald-400 hover:text-emerald-300">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-primary text-base">{item.label}</span>
                            <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-primary transition-colors ml-1">
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
                          {formatHour(b.hour)}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 text-foreground/80">
                          {GENDER_MAP[b.gender] ?? b.gender}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 text-foreground/60">
                          {CALENDAR_MAP[b.calendarType] ?? b.calendarType}
                        </span>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2 justify-end">
                        {isDeleting ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-rose-400">정말 삭제할까요?</span>
                            <button
                              onClick={async () => {
                                await deleteMut.mutateAsync(item.id);
                                setDeletingId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/30"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs hover:bg-muted/80"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 gap-1"
                              onClick={() => setDeletingId(item.id)}
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
                          </>
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
