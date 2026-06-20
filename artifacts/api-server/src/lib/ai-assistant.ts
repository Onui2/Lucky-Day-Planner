import { GoogleGenerativeAI } from "@google/generative-ai";

function oneLine(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildSajuContext(result: Record<string, any>): string {
  const bi = result.birthInfo ?? {};
  const birth = bi.year
    ? `${bi.year}년 ${bi.month}월 ${bi.day}일 ${bi.hour >= 0 ? bi.hour + "시" : "시간미상"} ${bi.gender === "male" ? "남성" : "여성"}`
    : "";

  const year = result.yearPillar ?? {};
  const month = result.monthPillar ?? {};
  const day = result.dayPillar ?? {};
  const hour = result.hourPillar ?? {};

  const pillars = [
    `년주: ${year.heavenlyStem ?? ""}${year.earthlyBranch ?? ""} (${year.heavenlyStemElement ?? ""}/${year.earthlyBranchElement ?? ""})`,
    `월주: ${month.heavenlyStem ?? ""}${month.earthlyBranch ?? ""} (${month.heavenlyStemElement ?? ""}/${month.earthlyBranchElement ?? ""})`,
    `일주: ${day.heavenlyStem ?? ""}${day.earthlyBranch ?? ""} (${day.heavenlyStemElement ?? ""}/${day.earthlyBranchElement ?? ""})`,
    hour.heavenlyStem
      ? `시주: ${hour.heavenlyStem}${hour.earthlyBranch} (${hour.heavenlyStemElement}/${hour.earthlyBranchElement})`
      : "",
  ].filter(Boolean).join("\n");

  const balance = result.elementBalance
    ? Object.entries(result.elementBalance as Record<string, number>)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ")
    : "";

  const daeun = Array.isArray(result.daeun?.periods)
    ? result.daeun.periods
        .slice(0, 4)
        .map((p: any) => `${p.stem}${p.branch}(${p.startAge}~${p.endAge}세)`)
        .join(" → ")
    : "";

  const lines = [
    birth ? `## 기본 정보\n${birth}` : "",
    pillars ? `## 사주팔자\n${pillars}` : "",
    balance ? `## 오행 분포\n${balance}` : "",
    result.dayMasterElement ? `## 일간 오행: ${result.dayMasterElement}` : "",
    result.sinGangYak?.type ? `## 신강/신약: ${result.sinGangYak.type}` : "",
    result.yongsin?.yongsin ? `## 용신: ${result.yongsin.yongsin}` : "",
    result.samjae?.isSamjae ? `## 삼재: ${result.samjae.advice ?? "해당"}` : "",
    daeun ? `## 대운 흐름\n${daeun}` : "",
    result.personality ? `## 성격/기질\n${oneLine(result.personality).slice(0, 200)}` : "",
    result.fortune ? `## 종합 운세\n${oneLine(result.fortune).slice(0, 200)}` : "",
    result.career ? `## 직업운\n${oneLine(result.career).slice(0, 150)}` : "",
    result.love ? `## 애정운\n${oneLine(result.love).slice(0, 150)}` : "",
    result.health ? `## 건강운\n${oneLine(result.health).slice(0, 150)}` : "",
  ].filter(Boolean).join("\n\n");

  return lines;
}

const SYSTEM_PROMPT = `당신은 명해원(命海苑)의 사주 전문 AI 상담사입니다.
사용자의 사주팔자 분석 결과를 바탕으로 질문에 구체적이고 실용적으로 답변합니다.

답변 원칙:
- 사주 데이터에 근거한 구체적인 해석을 제공합니다
- 일간 오행, 용신, 대운 흐름을 질문과 연결해서 설명합니다
- 전문 용어는 간단히 풀어서 설명합니다
- 350~600자 내외로 핵심만 전달하되, 실용적인 조언을 포함합니다
- 긍정적인 면과 주의할 점을 균형있게 제시합니다
- 시기(언제), 방향(어떻게)을 포함한 구체적 조언을 제공합니다
- 마지막 줄에 항상 추가: "※ 본 답변은 사주 해석 기반의 참고 정보이며, 중요한 결정은 전문가와 상담하세요."
- 질문이 사주와 무관한 경우 정중히 사주 관련 질문으로 안내합니다`;

interface SajuConversationTurn {
  question: string;
  answer: string;
}

function buildConversationContext(history: SajuConversationTurn[]): string {
  return history
    .slice(-6)
    .map((turn, index) => [
      `### 최근 대화 ${index + 1}`,
      `사용자: ${oneLine(turn.question).slice(0, 220)}`,
      `상담사: ${oneLine(turn.answer).slice(0, 420)}`,
    ].join("\n"))
    .join("\n\n");
}

function isTransientAiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\[(429|500|503)[^\]]*\]|overloaded|high demand|quota/i.test(message);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buildSajuQuestionAnswer(
  question: string,
  result: Record<string, any>,
  history: SajuConversationTurn[] = [],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI 서비스 키가 설정되지 않았습니다. GEMINI_API_KEY 환경변수를 확인하세요.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const fallbackModel =
    process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.5-flash-lite";
  const sajuContext = buildSajuContext(result);
  const conversationContext = buildConversationContext(history);
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  const prompt = [
    `오늘 날짜: ${today}`,
    `아래는 이 사용자의 사주 분석 데이터입니다:\n\n${sajuContext}`,
    conversationContext
      ? `아래는 같은 세션에서 방금까지 오간 최근 대화입니다:\n\n${conversationContext}`
      : "",
    `이번 질문: ${question}`,
    "필요하면 이전 대화 맥락을 자연스럽게 이어서 답변하세요.",
  ].filter(Boolean).join("\n\n");

  const attempts: Array<{ modelName: string; delayMs: number }> = [
    { modelName: primaryModel, delayMs: 0 },
    { modelName: primaryModel, delayMs: 1500 },
    { modelName: fallbackModel, delayMs: 1000 },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) await wait(attempt.delayMs);
    try {
      const model = genAI.getGenerativeModel({
        model: attempt.modelName,
        systemInstruction: SYSTEM_PROMPT,
      });
      const response = await model.generateContent(prompt);
      return response.response.text();
    } catch (error) {
      lastError = error;
      if (!isTransientAiError(error)) throw error;
      console.warn(
        `gemini ${attempt.modelName} transient error, retrying:`,
        error instanceof Error ? error.message.slice(0, 200) : error,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("AI 답변 생성에 실패했습니다.");
}
