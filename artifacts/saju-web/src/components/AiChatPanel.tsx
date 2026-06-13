import { useEffect, useMemo, useRef, useState } from "react";
import {
  AI_QUESTIONS_QUERY_KEY,
  useAskSajuQuestion,
  useGetMyAiQuestions,
  type AiQuestionHistoryTurn,
  type AiQuestionItem,
  type MonetizationBirthInfo,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2,
  MessageCircleQuestion,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { buildAuthHref } from "@/lib/auth-redirect";
import {
  buildAiChatSessionTitle,
  createAiChatSessionRecord,
  getAiChatBirthInfoKey,
  loadAiChatSessions,
  saveAiChatSessions,
  sortAiChatSessions,
  type AiChatSessionRecord,
} from "@/lib/ai-chat-sessions";
import { cn } from "@/lib/utils";

interface AiChatPanelProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MAX_PROMPT_HISTORY = 6;

function buildSuggestedQuestions(birthInfo: MonetizationBirthInfo) {
  const currentYear = new Date().getFullYear();
  const age =
    Number.isFinite(birthInfo.year) && birthInfo.year > 0
      ? Math.max(0, currentYear - birthInfo.year)
      : null;
  const ageLabel = age ? `${age}세 전후` : "지금 시기";

  return [
    `${currentYear}년 직업운과 돈 흐름에서 가장 좋은 타이밍을 알려줘`,
    "앞으로 3년 대운 흐름에서 기회와 조심할 점을 요약해줘",
    "내 사주의 강점 3가지와 지금 바로 보완할 점 3가지를 알려줘",
    `${ageLabel} 연애운에서 반복되기 쉬운 패턴과 좋은 인연을 만나는 방법을 알려줘`,
    "건강운에서 생활습관으로 관리하면 좋은 부분을 알려줘",
  ];
}

function dedupeQuestionIds(ids: number[]) {
  return Array.from(
    new Set(ids.filter((value) => Number.isFinite(value) && value > 0)),
  );
}

function formatSessionTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiChatPanel({
  birthInfo,
  isAuthenticated,
  isAdmin = false,
  externalOpen,
  onOpenChange,
}: AiChatPanelProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
      return;
    }

    setInternalOpen(value);
  };
  const [question, setQuestion] = useState("");
  const [historyReady, setHistoryReady] = useState(!isAuthenticated);
  const [sessions, setSessions] = useState<AiChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const loginHref = buildAuthHref("/login");
  const bottomRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const ask = useAskSajuQuestion();
  const { data, isLoading } = useGetMyAiQuestions(isAuthenticated && open);

  const userId = user?.id ?? null;
  const hasUnlimitedAccess = Boolean(isAdmin || data?.unlimited);
  const suggestedQuestions = useMemo(
    () => buildSuggestedQuestions(birthInfo),
    [
      birthInfo.year,
      birthInfo.month,
      birthInfo.day,
      birthInfo.hour,
      birthInfo.minute,
      birthInfo.gender,
      birthInfo.calendarType,
    ],
  );
  const currentBirthInfoKey = useMemo(
    () => getAiChatBirthInfoKey(birthInfo),
    [
      birthInfo.year,
      birthInfo.month,
      birthInfo.day,
      birthInfo.hour,
      birthInfo.minute,
      birthInfo.gender,
      birthInfo.calendarType,
    ],
  );
  const importedSessionId = `imported:${currentBirthInfoKey}`;

  const questionHistory = useMemo(
    () =>
      [...(data?.questions ?? [])]
        .filter(
          (item) =>
            item.birthInfo &&
            getAiChatBirthInfoKey(item.birthInfo) === currentBirthInfoKey,
        )
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime(),
        ),
    [currentBirthInfoKey, data],
  );

  const questionMap = useMemo(
    () => new Map(questionHistory.map((item) => [item.id, item])),
    [questionHistory],
  );

  const activeSession = useMemo(
    () =>
      sessions.find((session) => session.id === activeSessionId) ??
      sessions[0] ??
      null,
    [activeSessionId, sessions],
  );

  const activeMessages = useMemo(() => {
    if (!activeSession) {
      return [];
    }

    return activeSession.questionIds
      .map((questionId) => questionMap.get(questionId))
      .filter((item): item is AiQuestionItem => Boolean(item));
  }, [activeSession, questionMap]);

  const promptHistory = useMemo<AiQuestionHistoryTurn[]>(
    () =>
      activeMessages.slice(-MAX_PROMPT_HISTORY).map((item) => ({
        question: item.question,
        answer: item.answer,
      })),
    [activeMessages],
  );

  const remainingLabel = useMemo(() => {
    if (!data) return "확인 중";
    if (hasUnlimitedAccess || data.unlimited) return "무제한";
    return `${data.remaining ?? 0}/${data.limit ?? 0}회 남음`;
  }, [data, hasUnlimitedAccess]);

  useEffect(() => {
    setSessions([]);
    setActiveSessionId(null);
    setPendingQuestion(null);
    setQuestion("");
  }, [currentBirthInfoKey, userId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuestion("");

    if (!isAuthenticated) {
      setHistoryReady(true);
      return;
    }

    let active = true;
    setHistoryReady(false);
    void queryClient
      .resetQueries({ queryKey: AI_QUESTIONS_QUERY_KEY, exact: true })
      .finally(() => {
        if (active) {
          setHistoryReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    open,
    birthInfo.year,
    birthInfo.month,
    birthInfo.day,
    birthInfo.hour,
    birthInfo.minute,
    birthInfo.gender,
    birthInfo.calendarType,
    isAuthenticated,
    queryClient,
  ]);

  useEffect(() => {
    if (!open || !historyReady || !isAuthenticated || !userId) {
      return;
    }

    const storedSessions = loadAiChatSessions(userId);
    const currentSessions = storedSessions
      .filter((session) => session.birthInfoKey === currentBirthInfoKey)
      .map((session) => ({
        ...session,
        questionIds: dedupeQuestionIds(session.questionIds),
      }));
    const otherSessions = storedSessions.filter(
      (session) => session.birthInfoKey !== currentBirthInfoKey,
    );

    let nextSessions = [...currentSessions];
    const mappedIds = new Set(
      nextSessions.flatMap((session) => session.questionIds),
    );
    const unmappedQuestions = questionHistory.filter(
      (item) => !mappedIds.has(item.id),
    );

    if (unmappedQuestions.length > 0) {
      const existingImported = nextSessions.find(
        (session) => session.id === importedSessionId,
      );
      const mergedIds = dedupeQuestionIds([
        ...(existingImported?.questionIds ?? []),
        ...unmappedQuestions.map((item) => item.id),
      ]);

      const importedSession: AiChatSessionRecord = {
        id: importedSessionId,
        birthInfoKey: currentBirthInfoKey,
        title: "이전 상담 기록",
        createdAt:
          existingImported?.createdAt ?? unmappedQuestions[0]!.createdAt,
        updatedAt: unmappedQuestions[unmappedQuestions.length - 1]!.createdAt,
        questionIds: mergedIds,
        imported: true,
      };

      nextSessions = [
        ...nextSessions.filter((session) => session.id !== importedSessionId),
        importedSession,
      ];
    }

    let nextActiveSessionId = activeSessionId;
    const hasActiveSession = nextActiveSessionId
      ? nextSessions.some((session) => session.id === nextActiveSessionId)
      : false;

    if (!hasActiveSession) {
      const emptyDraft = nextSessions.find(
        (session) => session.draft && session.questionIds.length === 0,
      );

      if (emptyDraft) {
        nextActiveSessionId = emptyDraft.id;
      } else {
        const freshSession = createAiChatSessionRecord(currentBirthInfoKey);
        nextSessions = [freshSession, ...nextSessions];
        nextActiveSessionId = freshSession.id;
      }
    }

    const sortedSessions = sortAiChatSessions(nextSessions);
    saveAiChatSessions(userId, [...otherSessions, ...sortedSessions]);
    setSessions(sortedSessions);

    if (nextActiveSessionId !== activeSessionId) {
      setActiveSessionId(nextActiveSessionId);
    }
  }, [
    activeSessionId,
    currentBirthInfoKey,
    historyReady,
    importedSessionId,
    isAuthenticated,
    open,
    questionHistory,
    userId,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [activeMessages.length, activeSessionId, open, pendingQuestion]);

  function persistSessions(
    nextSessions: AiChatSessionRecord[],
    nextActiveId: string | null,
  ) {
    const sortedSessions = sortAiChatSessions(nextSessions);
    setSessions(sortedSessions);
    setActiveSessionId(nextActiveId);

    if (!userId) {
      return;
    }

    const storedSessions = loadAiChatSessions(userId);
    const otherSessions = storedSessions.filter(
      (session) => session.birthInfoKey !== currentBirthInfoKey,
    );
    saveAiChatSessions(userId, [...otherSessions, ...sortedSessions]);
  }

  function ensureActiveSession() {
    if (activeSession) {
      return activeSession;
    }

    const freshSession = createAiChatSessionRecord(currentBirthInfoKey);
    persistSessions(
      [
        freshSession,
        ...sessions.filter((session) => session.questionIds.length > 0),
      ],
      freshSession.id,
    );
    return freshSession;
  }

  function handleCreateSession() {
    const freshSession = createAiChatSessionRecord(currentBirthInfoKey);
    persistSessions(
      [
        freshSession,
        ...sessions.filter((session) => session.questionIds.length > 0),
      ],
      freshSession.id,
    );
    setPendingQuestion(null);
    setQuestion("");
  }

  function resizeQuestionInput(element = questionInputRef.current) {
    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 112)}px`;
  }

  function handleQuestionChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setQuestion(event.target.value);
    resizeQuestionInput(event.target);
  }

  function handlePickSuggestion(nextQuestion: string) {
    setQuestion(nextQuestion);
    globalThis.requestAnimationFrame(() => {
      questionInputRef.current?.focus();
      resizeQuestionInput();
    });
  }

  async function handleAsk() {
    if (!question.trim() || ask.isPending) return;

    const currentSession = ensureActiveSession();
    const nextQuestion = question.trim();
    setQuestion("");
    setPendingQuestion(nextQuestion);

    try {
      const response = await ask.mutateAsync({
        question: nextQuestion,
        birthInfo,
        history: promptHistory,
      });
      const createdQuestion = response.question;
      const updatedSession: AiChatSessionRecord = {
        ...currentSession,
        title:
          currentSession.questionIds.length > 0
            ? currentSession.title
            : buildAiChatSessionTitle(nextQuestion),
        updatedAt:
          typeof createdQuestion.createdAt === "string"
            ? createdQuestion.createdAt
            : new Date().toISOString(),
        questionIds: dedupeQuestionIds([
          ...currentSession.questionIds,
          createdQuestion.id,
        ]),
        draft: false,
        imported: currentSession.imported,
      };

      persistSessions(
        sessions.some((session) => session.id === currentSession.id)
          ? sessions.map((session) =>
              session.id === currentSession.id ? updatedSession : session,
            )
          : [updatedSession, ...sessions],
        currentSession.id,
      );

      globalThis.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch {
      // mutation error message is rendered below
    } finally {
      setPendingQuestion(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleAsk();
    }
  }

  function renderSuggestedQuestions(compact = false) {
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-100/80">
          <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          추천 질문
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handlePickSuggestion(suggestion)}
              className={cn(
                "rounded-full border border-violet-300/25 bg-violet-400/10 text-left text-violet-50/90 transition-colors hover:border-violet-200/60 hover:bg-violet-400/20",
                compact
                  ? "px-2.5 py-1 text-[11px]"
                  : "px-3 py-1.5 text-xs leading-5",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 right-4 z-50 w-[min(420px,calc(100vw-2rem))] flex flex-col rounded-2xl border border-violet-400/20 bg-[#16102a]/95 shadow-2xl shadow-violet-900/40 backdrop-blur-xl overflow-hidden"
            style={{ maxHeight: "72vh" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-violet-500/10">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-violet-300" />
                <span className="text-sm font-medium text-violet-100">
                  AI 사주 상담
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isAuthenticated && (
                  <span className="text-[11px] text-violet-300/80">
                    {isLoading ? "..." : remainingLabel}
                  </span>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isAuthenticated && (
              <div className="border-b border-white/10 bg-black/15 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-violet-200/70">
                    세션별로 기록되고, 같은 세션 질문은 최근 대화를 이어서
                    답해요.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateSession}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-100 hover:bg-violet-500/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />새 세션
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSession?.id;
                    const messageCount = session.questionIds.length;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setActiveSessionId(session.id)}
                        className={cn(
                          "min-w-[150px] max-w-[200px] rounded-2xl border px-3 py-2 text-left transition-colors",
                          isActive
                            ? "border-violet-300/60 bg-violet-500/20"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <div className="truncate text-xs font-semibold text-violet-50">
                          {messageCount === 0 ? "새 세션" : session.title}
                        </div>
                        <div className="mt-1 text-[10px] text-violet-200/60">
                          {messageCount === 0
                            ? "질문 전"
                            : `${messageCount}개 질문`}
                          {" · "}
                          {formatSessionTimestamp(session.updatedAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[240px]">
              {!isAuthenticated ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <MessageCircleQuestion className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>로그인 후 사용할 수 있습니다.</p>
                  <Link
                    href={loginHref}
                    className="mt-3 inline-block text-primary hover:underline text-sm"
                  >
                    로그인하러 가기
                  </Link>
                </div>
              ) : !historyReady || isLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  기록을 불러오는 중...
                </div>
              ) : !activeSession ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-muted-foreground">
                  세션을 준비하는 중입니다.
                </div>
              ) : activeSession.questionIds.length === 0 && !pendingQuestion ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-4">
                    <div className="text-sm font-medium text-violet-50">
                      새 세션이 시작됐어요.
                    </div>
                    <div className="mt-1 text-xs leading-6 text-violet-100/70">
                      올해 이직운, 연애운, 건강운처럼 궁금한 주제를 이어서
                      물어보면 이 세션에 차곡차곡 기록됩니다.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    {renderSuggestedQuestions()}
                  </div>
                </div>
              ) : activeMessages.length === 0 && !pendingQuestion ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-muted-foreground">
                  이 세션의 이전 기록을 불러오는 중입니다. 잠시 후 다시
                  확인해주세요.
                </div>
              ) : (
                <>
                  {activeMessages.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600/40 px-3.5 py-2.5 text-sm text-violet-50 leading-6">
                          {item.question}
                          <div className="mt-2 text-[11px] text-violet-100/65">
                            {formatSessionTimestamp(item.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-muted-foreground leading-7 whitespace-pre-line">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingQuestion && (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600/40 px-3.5 py-2.5 text-sm text-violet-50 leading-6">
                          {pendingQuestion}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          AI가 이전 대화를 참고해서 답변 중...
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {ask.error && (
              <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
                {ask.error instanceof Error
                  ? ask.error.message
                  : "답변 생성에 실패했습니다."}
              </div>
            )}

            {isAuthenticated && (
              <div className="border-t border-white/10 bg-black/20 px-3 py-2.5">
                {activeSession &&
                  activeSession.questionIds.length > 0 &&
                  !pendingQuestion &&
                  !ask.isPending &&
                  !question.trim() && (
                    <div className="mb-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      {renderSuggestedQuestions(true)}
                    </div>
                  )}
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={questionInputRef}
                    value={question}
                    onChange={handleQuestionChange}
                    onKeyDown={handleKeyDown}
                    placeholder="질문 입력 (Shift+Enter 줄바꿈)"
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none leading-6 overflow-y-auto py-1"
                    style={{ maxHeight: "112px" }}
                  />
                  <button
                    onClick={() => void handleAsk()}
                    disabled={ask.isPending || !question.trim()}
                    className="flex-shrink-0 p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {ask.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
