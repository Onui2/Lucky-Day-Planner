import { useEffect, useMemo, useRef, useState } from "react";
import {
  AI_QUESTIONS_QUERY_KEY,
  useAskSajuQuestion,
  useGetMyAiQuestions,
  type MonetizationBirthInfo,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircleQuestion, Send, X, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { buildAuthHref } from "@/lib/auth-redirect";

interface AiChatPanelProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AiChatPanel({ birthInfo, isAuthenticated, isAdmin = false, externalOpen, onOpenChange }: AiChatPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  const [question, setQuestion] = useState("");
  const loginHref = buildAuthHref("/login");
  const [historyReady, setHistoryReady] = useState(!isAuthenticated);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const ask = useAskSajuQuestion();
  const { data, isLoading } = useGetMyAiQuestions(isAuthenticated && open);

  const hasUnlimitedAccess = Boolean(isAdmin || (data as any)?.unlimited);

  useEffect(() => {
    if (!open) return;
    setQuestion("");
    if (!isAuthenticated) { setHistoryReady(true); return; }
    let active = true;
    setHistoryReady(false);
    void queryClient
      .resetQueries({ queryKey: AI_QUESTIONS_QUERY_KEY, exact: true })
      .finally(() => { if (active) setHistoryReady(true); });
    return () => { active = false; };
  }, [
    open,
    birthInfo.year, birthInfo.month, birthInfo.day,
    birthInfo.hour, birthInfo.minute, birthInfo.gender, birthInfo.calendarType,
    isAuthenticated, queryClient,
  ]);

  const history = useMemo(
    () => [...(data?.questions ?? [])].reverse(),
    [data],
  );

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [open, history.length]);

  const remainingLabel = useMemo(() => {
    if (!data) return "확인 중";
    if (hasUnlimitedAccess || data.unlimited) return "무제한";
    return `${data.remaining ?? 0}/${data.limit ?? 0}회 남음`;
  }, [data, hasUnlimitedAccess]);

  async function handleAsk() {
    if (!question.trim() || ask.isPending) return;
    const q = question.trim();
    setQuestion("");
    try {
      await ask.mutateAsync({ question: q, birthInfo });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch {}
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-600/90 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-900/30 backdrop-blur transition-all"
      >
        <MessageCircleQuestion className="w-4 h-4" />
        AI 상담
        {!open && data && !hasUnlimitedAccess && (data.remaining ?? 0) > 0 && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
            {data.remaining}
          </span>
        )}
      </button>

      {/* 채팅 패널 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 right-4 z-50 w-[min(380px,calc(100vw-2rem))] flex flex-col rounded-2xl border border-violet-400/20 bg-[#16102a]/95 shadow-2xl shadow-violet-900/40 backdrop-blur-xl overflow-hidden"
            style={{ maxHeight: "70vh" }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-violet-500/10">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-violet-300" />
                <span className="text-sm font-medium text-violet-100">AI 사주 상담</span>
              </div>
              <div className="flex items-center gap-3">
                {isAuthenticated && (
                  <span className="text-[11px] text-violet-300/80">{isLoading ? "..." : remainingLabel}</span>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
              {!isAuthenticated ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <MessageCircleQuestion className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>로그인 후 사용할 수 있습니다.</p>
                  <Link href={loginHref} className="mt-3 inline-block text-primary hover:underline text-sm">
                    로그인하러 가기
                  </Link>
                </div>
              ) : !historyReady || isLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  불러오는 중...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <MessageCircleQuestion className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>아직 질문 기록이 없습니다.</p>
                  <p className="mt-1 text-xs opacity-70">아래에서 첫 질문을 보내보세요.</p>
                </div>
              ) : (
                <>
                  {history.map((item) => (
                    <div key={item.id} className="space-y-2">
                      {/* 사용자 질문 */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600/40 px-3.5 py-2.5 text-sm text-violet-50 leading-6">
                          {item.question}
                        </div>
                      </div>
                      {/* AI 답변 */}
                      <div className="flex justify-start">
                        <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-muted-foreground leading-7 whitespace-pre-line">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                  {ask.isPending && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI가 답변 중...
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* 에러 */}
            {ask.error && (
              <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
                {ask.error instanceof Error ? ask.error.message : "답변 생성에 실패했습니다."}
              </div>
            )}

            {/* 입력 영역 */}
            {isAuthenticated && (
              <div className="border-t border-white/10 bg-black/20 px-3 py-2.5 flex gap-2 items-end">
                <textarea
                  value={question}
                  onChange={e => {
                    setQuestion(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="질문 입력 (Shift+Enter 줄바꿈)"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none leading-6 overflow-y-auto py-1"
                  style={{ maxHeight: "112px" }}
                />
                <button
                  onClick={handleAsk}
                  disabled={ask.isPending || !question.trim()}
                  className="flex-shrink-0 p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {ask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
