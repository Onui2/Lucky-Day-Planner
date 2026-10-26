import { useEffect, useId, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  MessageCircleQuestion,
  Scale,
} from "lucide-react";
import {
  useAskSajuQuestion,
  useGetMyAiQuestions,
  type MonetizationBirthInfo,
  type SajuConsultationInput,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { buildAuthHref } from "@/lib/auth-redirect";
import { getAiChatBirthInfoKey } from "@/lib/ai-chat-sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Topic = SajuConsultationInput["topic"];
type Draft = Omit<SajuConsultationInput, "topic">;
type CompletedConsultation = { input: SajuConsultationInput; answer: string };

const TOPICS: Record<
  Topic,
  {
    label: string;
    situations: string[];
    concernPlaceholder: string;
    priorities: string[];
    options: [string, string];
  }
> = {
  career: {
    label: "이직·일",
    situations: [
      "현재 재직 중입니다",
      "구직 중입니다",
      "이직 제안을 받았습니다",
    ],
    concernPlaceholder:
      "예: 업무는 익숙하지만 성장 기회가 적어 이직 준비를 시작할지 고민됩니다.",
    priorities: ["연봉과 보상", "생활의 안정", "성장 기회"],
    options: ["현 직장 유지", "이직 준비 시작"],
  },
  money: {
    label: "돈·생활",
    situations: [
      "수입은 일정한 편입니다",
      "수입이 불규칙합니다",
      "큰 지출을 앞두고 있습니다",
    ],
    concernPlaceholder:
      "예: 월말마다 생활비가 부족해집니다. 어디부터 점검하면 좋을지 고민됩니다.",
    priorities: ["필수 생활비 확보", "지출 줄이기", "저축 습관 만들기"],
    options: ["현재 생활비 계획 유지", "지출 계획부터 조정"],
  },
  relationship: {
    label: "연애·관계",
    situations: [
      "연애 중입니다",
      "서로 알아가는 중입니다",
      "관계가 멀어진 상태입니다",
    ],
    concernPlaceholder:
      "예: 연락 빈도에 대한 기대가 달라 자주 서운합니다. 어떻게 대화를 시작할지 고민됩니다.",
    priorities: ["내 마음 정리", "대화 회복", "서로의 경계 존중"],
    options: ["먼저 대화 제안", "시간을 두고 생각 정리"],
  },
};

function emptyDraft(topic: Topic): Draft {
  return {
    mode: "concern",
    situation: "",
    concern: "",
    priority: "",
    optionA: TOPICS[topic].options[0],
    optionB: TOPICS[topic].options[1],
  };
}

function emptyDrafts(): Record<Topic, Draft> {
  return {
    career: emptyDraft("career"),
    money: emptyDraft("money"),
    relationship: emptyDraft("relationship"),
  };
}

function toInput(topic: Topic, draft: Draft): SajuConsultationInput {
  return {
    topic,
    mode: draft.mode,
    situation: draft.situation.trim(),
    concern: draft.concern.trim(),
    priority: draft.priority.trim(),
    ...(draft.mode === "compare"
      ? {
          optionA: draft.optionA?.trim() ?? "",
          optionB: draft.optionB?.trim() ?? "",
        }
      : {}),
  };
}

function normalizeChoice(value: string): string {
  // Match the server's whitespace normalization before its identity check.
  return value
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase();
}

function consultationErrorMessage(failure: unknown): string {
  const fallback =
    "상담을 완료하지 못했습니다. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.";
  const readUserMessage = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const message = value.trim().replace(/^HTTP\s+\d{3}[^:\r\n]*:\s*/i, "");
    // Provider errors, stack traces and infrastructure details are not user copy.
    if (
      !/[가-힣]/.test(message) ||
      message.length > 300 ||
      /[\r\n{}<>]|https?:\/\/|[A-Za-z]:\\|\b(?:Error|TypeError|SyntaxError|ReferenceError|FetchError|stack|traceback|request_id|authorization|Bearer)\b|\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/i.test(
        message,
      )
    )
      return null;
    return message;
  };
  if (!failure || typeof failure !== "object") return fallback;
  const detail = failure as { data?: unknown; message?: unknown };
  if (detail.data && typeof detail.data === "object") {
    const data = detail.data as { error?: unknown; message?: unknown };
    const message =
      readUserMessage(data.error) ?? readUserMessage(data.message);
    if (message) return message;
  }
  // SSE errors have no response data; keep their safe Korean explanation.
  return readUserMessage(detail.message) ?? fallback;
}

function validateStep(
  input: SajuConsultationInput,
  step: number,
): string | null {
  if (!input.situation || input.situation.length > 120)
    return "현재 상황을 120자 이내로 적어 주세요.";
  if (step >= 2 && (!input.concern || input.concern.length > 600))
    return "가장 고민되는 점을 600자 이내로 적어 주세요.";
  if (step >= 3) {
    if (!input.priority || input.priority.length > 120)
      return "가장 중요한 기준을 120자 이내로 적어 주세요.";
    if (input.mode === "compare") {
      if (
        !input.optionA ||
        !input.optionB ||
        input.optionA.length > 120 ||
        input.optionB.length > 120
      )
        return "비교할 두 선택을 각각 120자 이내로 적어 주세요.";
      if (normalizeChoice(input.optionA) === normalizeChoice(input.optionB))
        return "서로 다른 두 선택을 적어 주세요.";
    }
  }
  return null;
}

export default function ConcernConsultation({
  birthInfo,
  isAuthenticated,
  isAdmin = false,
  initialFocus = "career",
}: {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  initialFocus?: Topic;
}) {
  const { user } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>(initialFocus);
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [result, setResult] = useState<CompletedConsultation | null>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  const firstField = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const resultHeading = useRef<HTMLHeadingElement | null>(null);
  const ask = useAskSajuQuestion();
  const usage = useGetMyAiQuestions(isAuthenticated && open);
  const birthKey = getAiChatBirthInfoKey(birthInfo);
  const userId = user?.id;
  const draft = drafts[topic];
  const input = toInput(topic, draft);
  const unlimited = Boolean(isAdmin || usage.data?.unlimited);
  const exhausted = Boolean(
    usage.data && !unlimited && (usage.data.remaining ?? 0) <= 0,
  );
  const unchanged =
    result !== null && JSON.stringify(result.input) === JSON.stringify(input);

  useEffect(() => {
    generation.current += 1;
    submitting.current = false;
    setDrafts(emptyDrafts());
    setTopic(initialFocus);
    setStep(1);
    setError(null);
    setResult(null);
    setStreamingAnswer("");
    setBusy(false);
    return () => {
      generation.current += 1;
    };
    // A focus-link change must not discard a draft already being written.
  }, [birthKey, userId, isAuthenticated]);

  function updateDraft(update: Partial<Draft>) {
    if (submitting.current) return;
    setDrafts((current) => ({
      ...current,
      [topic]: { ...current[topic], ...update },
    }));
    setError(null);
  }

  function changeStep(next: number) {
    if (submitting.current) return;
    if (next > step) {
      const issue = validateStep(input, step);
      if (issue) {
        setError(issue);
        firstField.current?.focus();
        return;
      }
    }
    setError(null);
    setStep(next);
  }

  useEffect(() => {
    if (open && isAuthenticated) firstField.current?.focus();
  }, [step, open, isAuthenticated]);

  async function submit() {
    if (
      submitting.current ||
      !isAuthenticated ||
      !usage.data ||
      usage.isError ||
      exhausted ||
      unchanged
    )
      return;
    const issue = validateStep(input, 3);
    if (issue) {
      setError(issue);
      return;
    }
    const requestGeneration = generation.current;
    submitting.current = true;
    setBusy(true);
    setError(null);
    setStreamingAnswer("");
    try {
      const response = await ask.mutateAsync({
        question: "",
        birthInfo,
        consultation: input,
        onChunk: (answer) => {
          if (requestGeneration === generation.current)
            setStreamingAnswer(answer);
        },
      });
      if (requestGeneration !== generation.current) return;
      setResult({ input, answer: response.question.answer });
      requestAnimationFrame(() => resultHeading.current?.focus());
    } catch (failure) {
      if (requestGeneration !== generation.current) return;
      setError(consultationErrorMessage(failure));
      void usage.refetch();
    } finally {
      if (requestGeneration === generation.current) {
        submitting.current = false;
        setBusy(false);
        setStreamingAnswer("");
      }
    }
  }

  const fieldClass =
    "min-h-11 rounded-xl border border-input bg-background/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

  return (
    <section
      className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:p-6"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={`${id}-title`}
            className="flex items-center gap-2 text-lg font-semibold text-violet-900"
          >
            <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />내
            상황으로 상담받기
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-violet-900/75">
            지금의 상황, 고민, 중요한 기준을 알려주세요. 풀이와 현실에서 확인할
            조건을 나누어 정리해 드립니다.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 border-violet-200 bg-white text-violet-800"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen(!open)}
          disabled={busy}
        >
          {open ? "접기" : "3문항으로 시작"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </div>
      {open && (
        <div id={`${id}-body`} className="mt-5 border-t border-violet-200 pt-5">
          {!isAuthenticated ? (
            <div className="space-y-3 text-sm leading-6 text-violet-900/80">
              <p>
                로그인하면 상황 맞춤 상담과 두 선택 비교를 이용할 수 있습니다.
                상담 내용은 기존 AI 상담 기록에 저장됩니다.
              </p>
              <Link
                href={buildAuthHref("/login")}
                className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-4 font-medium text-white"
              >
                로그인하고 시작하기
              </Link>
            </div>
          ) : (
            <>
              <ol
                className="mb-5 grid grid-cols-3 gap-2"
                aria-label="상담 진행 단계"
              >
                {["현재 상황", "나의 고민", "중요한 기준"].map(
                  (label, index) => (
                    <li
                      key={label}
                      aria-current={step === index + 1 ? "step" : undefined}
                      className={cn(
                        "rounded-xl px-2 py-2 text-center text-xs sm:text-sm",
                        step === index + 1
                          ? "bg-violet-700 font-semibold text-white"
                          : "bg-white/70 text-violet-800",
                      )}
                    >
                      <span aria-hidden="true">{index + 1}. </span>
                      {label}
                    </li>
                  ),
                )}
              </ol>
              <p className="sr-only" role="status">
                3단계 중 {step}단계
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (step < 3) changeStep(step + 1);
                  else void submit();
                }}
              >
                <fieldset disabled={busy} className="min-w-0 space-y-4">
                  {step === 1 && (
                    <>
                      <div
                        role="group"
                        aria-label="고민 주제"
                        className="flex flex-wrap gap-2"
                      >
                        {(Object.keys(TOPICS) as Topic[]).map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={topic === value}
                            onClick={() => {
                              setTopic(value);
                              setError(null);
                            }}
                            className={cn(
                              "min-h-11 rounded-xl border px-4 text-sm font-medium",
                              topic === value
                                ? "border-violet-700 bg-violet-700 text-white"
                                : "border-violet-200 bg-white text-violet-800",
                            )}
                          >
                            {TOPICS[value].label}
                          </button>
                        ))}
                      </div>
                      <label
                        htmlFor={`${id}-situation`}
                        className="block text-sm font-semibold text-violet-950"
                      >
                        1. 지금 어떤 상황인가요?
                      </label>
                      <div
                        className="flex flex-wrap gap-2"
                        aria-label="현재 상황 예시"
                      >
                        {TOPICS[topic].situations.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="min-h-11 rounded-full border border-violet-200 bg-white px-3 text-left text-xs text-violet-800 hover:bg-violet-100"
                            onClick={() => updateDraft({ situation: value })}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <Input
                        ref={(element) => {
                          firstField.current = element;
                        }}
                        id={`${id}-situation`}
                        value={draft.situation}
                        onChange={(event) =>
                          updateDraft({ situation: event.target.value })
                        }
                        maxLength={120}
                        className={fieldClass}
                        placeholder="예시를 선택하거나 직접 적어 주세요"
                        autoComplete="off"
                        aria-describedby={`${id}-situation-help`}
                      />
                      <p
                        id={`${id}-situation-help`}
                        className="text-xs text-muted-foreground"
                      >
                        현재 상태만 짧게 적어 주세요. {draft.situation.length}
                        /120자
                      </p>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <p className="text-xs text-violet-800">
                        {TOPICS[topic].label} · {draft.situation}
                      </p>
                      <label
                        htmlFor={`${id}-concern`}
                        className="block text-sm font-semibold text-violet-950"
                      >
                        2. 가장 고민되는 점은 무엇인가요?
                      </label>
                      <textarea
                        ref={(element) => {
                          firstField.current = element;
                        }}
                        id={`${id}-concern`}
                        value={draft.concern}
                        onChange={(event) =>
                          updateDraft({ concern: event.target.value })
                        }
                        maxLength={600}
                        rows={5}
                        className={`${fieldClass} w-full resize-y leading-6`}
                        placeholder={TOPICS[topic].concernPlaceholder}
                        autoComplete="off"
                        aria-describedby={`${id}-concern-help`}
                      />
                      <p
                        id={`${id}-concern-help`}
                        className="text-xs leading-5 text-muted-foreground"
                      >
                        회사명·상대 실명·연락처 없이 설명해 주세요.{" "}
                        {draft.concern.length}/600자
                      </p>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <label
                        htmlFor={`${id}-priority`}
                        className="block text-sm font-semibold text-violet-950"
                      >
                        3. 지금 가장 중요한 기준은 무엇인가요?
                      </label>
                      <div
                        className="flex flex-wrap gap-2"
                        aria-label="중요한 기준 예시"
                      >
                        {TOPICS[topic].priorities.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="min-h-11 rounded-full border border-violet-200 bg-white px-3 text-xs text-violet-800 hover:bg-violet-100"
                            onClick={() => updateDraft({ priority: value })}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <Input
                        ref={(element) => {
                          firstField.current = element;
                        }}
                        id={`${id}-priority`}
                        value={draft.priority}
                        onChange={(event) =>
                          updateDraft({ priority: event.target.value })
                        }
                        maxLength={120}
                        className={fieldClass}
                        placeholder="예시를 선택하거나 나의 기준을 적어 주세요"
                        autoComplete="off"
                      />
                      <fieldset className="space-y-3 rounded-xl border border-violet-200 bg-white/70 p-3 sm:p-4">
                        <legend className="px-1 text-sm font-semibold text-violet-950">
                          어떤 방식으로 정리할까요?
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(["concern", "compare"] as const).map((mode) => (
                            <label
                              key={mode}
                              className={cn(
                                "flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                                draft.mode === mode
                                  ? "border-violet-500 bg-violet-50 text-violet-900"
                                  : "border-violet-100 bg-white text-violet-800",
                              )}
                            >
                              <input
                                type="radio"
                                name={`${id}-mode`}
                                checked={draft.mode === mode}
                                onChange={() => updateDraft({ mode })}
                                className="h-4 w-4 accent-violet-700"
                              />
                              {mode === "concern"
                                ? "내 고민 정리"
                                : "두 선택 A/B 비교"}
                            </label>
                          ))}
                        </div>
                        {draft.mode === "compare" && (
                          <>
                            <p className="text-xs leading-5 text-muted-foreground">
                              예시를 내 선택에 맞게 수정하세요. 장점·부담·확인할
                              조건을 나란히 살펴봅니다.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <label
                                  htmlFor={`${id}-a`}
                                  className="block text-sm font-medium"
                                >
                                  선택 A
                                </label>
                                <Input
                                  id={`${id}-a`}
                                  value={draft.optionA ?? ""}
                                  onChange={(event) =>
                                    updateDraft({ optionA: event.target.value })
                                  }
                                  maxLength={120}
                                  className={fieldClass}
                                  autoComplete="off"
                                />
                              </div>
                              <div className="space-y-2">
                                <label
                                  htmlFor={`${id}-b`}
                                  className="block text-sm font-medium"
                                >
                                  선택 B
                                </label>
                                <Input
                                  id={`${id}-b`}
                                  value={draft.optionB ?? ""}
                                  onChange={(event) =>
                                    updateDraft({ optionB: event.target.value })
                                  }
                                  maxLength={120}
                                  className={fieldClass}
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                              사주로 선택의 정답이나 성공 확률을 결정하지
                              않습니다. 현실 조건과 본인의 기준을 함께
                              확인합니다.
                            </p>
                          </>
                        )}
                      </fieldset>
                      <div className="rounded-xl bg-white/80 p-4 text-sm">
                        <h3 className="mb-2 font-semibold text-violet-950">
                          보내기 전 확인
                        </h3>
                        <dl className="space-y-2 break-words leading-6">
                          <div>
                            <dt className="font-medium">현재 상황</dt>
                            <dd className="text-muted-foreground">
                              {draft.situation}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium">나의 고민</dt>
                            <dd className="whitespace-pre-wrap text-muted-foreground">
                              {draft.concern}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium">중요한 기준</dt>
                            <dd className="text-muted-foreground">
                              {draft.priority || "위에서 기준을 적어 주세요."}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </>
                  )}
                </fieldset>
                <div className="mt-4 space-y-3">
                  {usage.isError ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
                    >
                      <p>
                        상담 가능 횟수를 확인하지 못했습니다. 입력한 내용은
                        유지됩니다.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 min-h-11"
                        onClick={() => void usage.refetch()}
                        disabled={usage.isFetching}
                      >
                        {usage.isFetching ? "확인 중..." : "횟수 다시 확인"}
                      </Button>
                    </div>
                  ) : (
                    <p
                      className="text-xs leading-5 text-violet-800"
                      role="status"
                    >
                      {!usage.data
                        ? "상담 가능 횟수 확인 중..."
                        : unlimited
                          ? "AI 상담 무제한 이용 가능"
                          : `AI 질문 ${usage.data.remaining ?? 0}회 남음 · 이번 상담에 1회 사용`}
                    </p>
                  )}
                  {exhausted && !usage.isError && (
                    <p role="alert" className="text-sm text-amber-900">
                      이번 달 이용 가능한 AI 질문을 모두 사용했습니다. 기존
                      상담은 AI 상담 기록에서 다시 볼 수 있습니다.
                    </p>
                  )}
                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800"
                    >
                      {error}
                    </p>
                  )}
                  {unchanged && !busy && (
                    <p className="flex items-start gap-2 text-xs leading-5 text-violet-800">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      같은 내용의 상담을 완료했습니다. 아래 답변을 다시 읽거나
                      입력을 수정해 주세요.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 gap-1"
                      onClick={() => changeStep(step - 1)}
                      disabled={step === 1 || busy}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      이전
                    </Button>
                    {step < 3 ? (
                      <Button
                        type="submit"
                        className="min-h-11 gap-1 bg-violet-700 text-white hover:bg-violet-800"
                        disabled={busy}
                      >
                        다음
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="min-h-11 gap-2 bg-violet-700 text-white hover:bg-violet-800"
                        disabled={
                          busy ||
                          !usage.data ||
                          usage.isError ||
                          exhausted ||
                          unchanged
                        }
                      >
                        {busy ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <MessageCircleQuestion
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        )}
                        {busy
                          ? "답변 정리 중..."
                          : "상담받기 · AI 질문 1회 사용"}
                      </Button>
                    )}
                  </div>
                  {step === 3 && (
                    <p className="text-xs leading-5 text-muted-foreground">
                      전송한 내용과 답변은 AI 상담 기록에 저장됩니다. 자동
                      결제는 없습니다.
                    </p>
                  )}
                </div>
              </form>
              {busy && (
                <div
                  className="mt-5 rounded-xl border border-violet-200 bg-white p-4"
                  aria-busy="true"
                >
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm font-medium text-violet-900"
                  >
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    입력한 내용을 바탕으로 답변을 정리하고 있습니다.
                  </p>
                  {streamingAnswer && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                      {streamingAnswer}
                    </p>
                  )}
                </div>
              )}
              {result && !busy && (
                <div className="mt-5 rounded-xl border border-violet-200 bg-white p-4 sm:p-5">
                  <h3
                    ref={resultHeading}
                    tabIndex={-1}
                    className="flex items-center gap-2 text-base font-semibold text-violet-950 outline-none"
                  >
                    {result.input.mode === "compare" && (
                      <Scale className="h-5 w-5" aria-hidden="true" />
                    )}
                    {TOPICS[result.input.topic].label} ·{" "}
                    {result.input.mode === "compare"
                      ? "두 선택 비교"
                      : "상담 결과"}
                  </h3>
                  {!unchanged && (
                    <p className="mt-2 text-xs leading-5 text-amber-900">
                      아래 답변은 이전에 보낸 내용의 결과입니다. 지금 수정한
                      내용은 아직 전송하지 않았습니다.
                    </p>
                  )}
                  <details className="mt-3 rounded-xl bg-violet-50/70 px-3 py-2 text-sm">
                    <summary className="min-h-9 cursor-pointer py-1 font-medium text-violet-900">
                      이 답변에 사용한 내용
                    </summary>
                    <dl className="space-y-2 pb-2 pt-2 text-xs leading-6">
                      <div>
                        <dt className="font-semibold">현재 상황</dt>
                        <dd className="break-words">
                          {result.input.situation}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">고민</dt>
                        <dd className="whitespace-pre-wrap break-words">
                          {result.input.concern}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">중요한 기준</dt>
                        <dd className="break-words">{result.input.priority}</dd>
                      </div>
                    </dl>
                  </details>
                  {result.input.mode === "compare" && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-violet-200 p-3 text-sm">
                        <p className="font-semibold text-violet-900">선택 A</p>
                        <p className="mt-1 break-words">
                          {result.input.optionA}
                        </p>
                      </div>
                      <div className="rounded-xl border border-violet-200 p-3 text-sm">
                        <p className="font-semibold text-violet-900">선택 B</p>
                        <p className="mt-1 break-words">
                          {result.input.optionB}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">
                    {result.answer}
                  </div>
                  <p className="mt-4 border-t border-violet-100 pt-3 text-xs leading-5 text-muted-foreground">
                    같은 사주의 ‘AI 상담’에서 질문과 답변을 다시 볼 수 있습니다.
                    사주 해석은 참고용이며 실제 조건을 확인한 뒤 판단해 주세요.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
