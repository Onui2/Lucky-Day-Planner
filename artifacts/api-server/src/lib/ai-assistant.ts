import type { ReportBirthInfo } from "@workspace/db";

function oneLine(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function pickFocus(question: string) {
  const normalized = question.toLowerCase();
  if (/연애|궁합|결혼|사랑/.test(normalized)) return "love";
  if (/돈|재물|수입|투자|매출/.test(normalized)) return "money";
  if (/직업|이직|사업|커리어|회사|취업/.test(normalized)) return "career";
  if (/건강|몸|컨디션|질병/.test(normalized)) return "health";
  return "general";
}

function safeJoin(parts: string[]) {
  return parts.filter(Boolean).join(" ");
}

function formatBirthInfo(birthInfo?: Partial<ReportBirthInfo> | null) {
  if (!birthInfo?.year || !birthInfo?.month || !birthInfo?.day) {
    return "";
  }

  return `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일`;
}

export function buildSajuQuestionAnswer(
  question: string,
  result: Record<string, any>,
) {
  const focus = pickFocus(question);
  const title = formatBirthInfo(result.birthInfo);
  const yongsinAdvice = oneLine(result.yongsin?.advice);
  const samjaeAdvice = oneLine(result.samjae?.advice);
  const generalFortune = oneLine(result.fortune);
  const career = oneLine(result.career);
  const love = oneLine(result.love);
  const health = oneLine(result.health);
  const personality = oneLine(result.personality);
  const careful = Array.isArray(result.carefulThings)
    ? result.carefulThings
        .map((item) => oneLine(item))
        .filter(Boolean)
        .slice(0, 2)
        .join(", ")
    : "";

  let lead = `${title ? `${title} 기준으로 보면 ` : ""}${question.trim()}에 대한 흐름은 `;
  let body = "";

  if (focus === "career") {
    body = safeJoin([
      career || generalFortune,
      yongsinAdvice ? `실무적으로는 ${yongsinAdvice}` : "",
      careful ? `특히 ${careful} 같은 조급한 선택은 한 번 더 점검하는 편이 좋습니다.` : "",
    ]);
  } else if (focus === "love") {
    body = safeJoin([
      love || personality,
      yongsinAdvice ? `관계에서는 ${yongsinAdvice}` : "",
      careful ? `감정이 급해질 때는 ${careful} 흐름을 조심하세요.` : "",
    ]);
  } else if (focus === "health") {
    body = safeJoin([
      health || personality,
      careful ? `생활 리듬에서는 ${careful}를 줄이는 쪽이 안정적입니다.` : "",
      samjaeAdvice ? `또한 ${samjaeAdvice}` : "",
    ]);
  } else if (focus === "money") {
    body = safeJoin([
      generalFortune || career,
      yongsinAdvice ? `금전 판단은 ${yongsinAdvice}` : "",
      careful ? `충동성으로 이어질 수 있는 ${careful}는 피하는 편이 좋습니다.` : "",
    ]);
  } else {
    body = safeJoin([
      generalFortune,
      personality ? `기본 성향으로는 ${personality}` : "",
      yongsinAdvice,
      samjaeAdvice,
    ]);
  }

  if (!body) {
    body = "현재 흐름은 한쪽으로 단정하기보다 강점과 주의 지점을 함께 보면서 움직이는 편이 좋습니다.";
  }

  return `${lead}${body}\n\n참고용 안내: 명해원 답변은 사주 해석 기반의 참고 콘텐츠이며, 의료·법률·투자·진로·결혼 등의 최종 판단을 대신하지 않습니다.`;
}
