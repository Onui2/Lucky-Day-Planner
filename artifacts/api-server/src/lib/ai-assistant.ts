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
    result.sinGangYak?.label ? `## 신강/신약: ${result.sinGangYak.label}` : "",
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
- 300~500자 내외로 핵심만 전달합니다
- 마지막에 항상 한 줄 추가: "※ 본 답변은 사주 해석 기반의 참고 정보이며, 중요한 결정은 전문가와 상담하세요."`;

export async function buildSajuQuestionAnswer(
  question: string,
  result: Record<string, any>,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI 서비스가 설정되지 않았습니다.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const sajuContext = buildSajuContext(result);
  const prompt = `아래는 이 사용자의 사주 분석 데이터입니다:\n\n${sajuContext}\n\n질문: ${question}`;

  const response = await model.generateContent(prompt);
  return response.response.text();
}
