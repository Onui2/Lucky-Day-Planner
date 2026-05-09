import { useMemo, useState } from "react";
import {
  useAskSajuQuestion,
  useGetMyAiQuestions,
  type MonetizationBirthInfo,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircleQuestion, Send } from "lucide-react";

interface AiQuestionCardProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
}

export function AiQuestionCard({
  birthInfo,
  isAuthenticated,
}: AiQuestionCardProps) {
  const [question, setQuestion] = useState("");
  const ask = useAskSajuQuestion();
  const { data, isLoading } = useGetMyAiQuestions(isAuthenticated);

  const remainingLabel = useMemo(() => {
    if (!data) return "확인 중";
    return `${data.remaining}/${data.limit}`;
  }, [data]);

  async function handleAsk() {
    if (!question.trim()) return;

    try {
      await ask.mutateAsync({
        question: question.trim(),
        birthInfo,
      });
      setQuestion("");
    } catch {
      // message handled below from mutation error
    }
  }

  return (
    <Card className="glass-panel border-violet-400/30 bg-violet-400/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-violet-200">
          <MessageCircleQuestion className="w-5 h-5" />
          AI 질문하기
        </CardTitle>
        <CardDescription>
          현재 사주 결과를 바탕으로 추가 질문을 남길 수 있습니다. 무료 회원은 월 3회까지 사용 가능합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            AI 질문 기능은 로그인 후 사용할 수 있습니다.
            <div className="mt-3">
              <Link href="/login" className="text-primary hover:underline">
                로그인하러 가기
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-sm text-foreground">이번 달 남은 질문</div>
              <div className="text-sm font-semibold text-violet-200">
                {isLoading ? "불러오는 중..." : remainingLabel}
              </div>
            </div>

            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="예: 올해 이직운은 어떤가요? 지금 사업을 시작해도 괜찮나요?"
              className="min-h-[110px] bg-background/50"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleAsk}
                disabled={ask.isPending || !question.trim()}
                className="gap-2"
              >
                {ask.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                질문 보내기
              </Button>
            </div>

            {ask.error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {ask.error instanceof Error
                  ? ask.error.message
                  : "질문 답변 생성에 실패했습니다."}
              </div>
            )}

            <div className="space-y-3">
              {(data?.questions ?? []).slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-sm font-medium text-foreground">
                    Q. {item.question}
                  </div>
                  <div className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
