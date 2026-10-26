export type ConsultationTopic = "career" | "money" | "relationship";
export type ConsultationMode = "concern" | "compare";

export interface ConsultationInput {
  topic: ConsultationTopic;
  mode: ConsultationMode;
  situation: string;
  concern: string;
  priority: string;
  optionA?: string;
  optionB?: string;
}

const TOPICS: Record<ConsultationTopic, string> = {
  career: "이직·직업",
  money: "돈·생활",
  relationship: "연애·관계",
};

type ConsultationValidation =
  | { success: true; value: ConsultationInput }
  | { success: false; error: string };

export function parseConsultationInput(raw: unknown): ConsultationValidation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { success: false, error: "상담 내용을 다시 확인해주세요." };
  }
  const input = raw as Record<string, unknown>;
  if (input.topic !== "career" && input.topic !== "money" && input.topic !== "relationship") {
    return { success: false, error: "상담할 고민 주제를 선택해주세요." };
  }
  if (input.mode !== "concern" && input.mode !== "compare") {
    return { success: false, error: "상담 또는 두 선택 비교를 선택해주세요." };
  }

  const limits = { situation: 120, concern: 600, priority: 120, optionA: 120, optionB: 120 } as const;
  const labels = { situation: "현재 상황", concern: "고민", priority: "중요한 기준", optionA: "선택 A", optionB: "선택 B" };
  const values: Partial<Record<keyof typeof limits, string>> = {};
  for (const field of Object.keys(limits) as Array<keyof typeof limits>) {
    const required = field !== "optionA" && field !== "optionB" || input.mode === "compare";
    const rawValue = input[field];
    if (!required) continue;
    if (typeof rawValue !== "string" || !rawValue.trim()) {
      return { success: false, error: `${labels[field]}을 입력해주세요.` };
    }
    if (rawValue.trim().length > limits[field]) {
      return { success: false, error: `${labels[field]}은 ${limits[field]}자 이내로 입력해주세요.` };
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(rawValue)) {
      return { success: false, error: `${labels[field]}에 사용할 수 없는 문자가 있습니다.` };
    }
    values[field] = rawValue.replace(/\s+/g, " ").trim();
  }

  if (input.mode === "compare" &&
      values.optionA!.normalize("NFKC").toLocaleLowerCase() === values.optionB!.normalize("NFKC").toLocaleLowerCase()) {
    return { success: false, error: "비교할 두 선택을 서로 다르게 입력해주세요." };
  }

  return {
    success: true,
    value: {
      topic: input.topic, mode: input.mode,
      situation: values.situation!, concern: values.concern!, priority: values.priority!,
      ...(input.mode === "compare" ? { optionA: values.optionA!, optionB: values.optionB! } : {}),
    },
  };
}

// One canonical question is used by the guard, provider and persisted history.
// No user-supplied text is promoted into the trusted system instruction.
export function buildConsultationQuestion(input: ConsultationInput): string {
  return [
    `${input.mode === "compare" ? "두 선택 비교" : "내 상황 상담"} · ${TOPICS[input.topic]}`,
    `현재 상황: ${input.situation}`,
    `내 고민: ${input.concern}`,
    `중요한 기준: ${input.priority}`,
    ...(input.mode === "compare" ? [`선택 A: ${input.optionA}`, `선택 B: ${input.optionB}`] : []),
  ].join("\n");
}

export function buildConsultationInstructions(mode: ConsultationMode): string {
  return [
    "이번 요청은 상황 맞춤 상담입니다. 아래 형식은 서버가 정한 답변 구성입니다.",
    "사용자가 적은 현재 상황·고민·중요한 기준·선택지는 검증된 사실이 아니라 사용자 제공 정보입니다. 정보가 부족하면 그 점과 확인할 질문을 밝히고, 없는 조건이나 사건을 만들지 마세요.",
    "사주 해석은 자기성찰용 참고로만 설명하고, 연봉·근무조건·수입·지출·상대의 실제 말과 행동 등 현실 조건과 분리하세요. 사주 점수로 선택의 정답, 성공 확률, 수익, 합격·이직 결과, 상대의 속마음을 단정하거나 계산하지 마세요.",
    "정보가 없는데 특정 선택을 권하거나 퇴사·투자·이별을 지시하지 마세요. 사용자가 중요하게 여기는 기준으로 확인할 조건을 정리하세요.",
    mode === "compare"
      ? "700~1,000자 내외로 다음 소제목을 순서대로 쓰세요: [고민 요약], [사주 해석(참고)], [선택 A], [선택 B], [현실에서 확인할 조건], [이번 주 행동]. 선택 A와 B에는 사용자가 입력한 선택 이름을 적고 각각 장점·부담·확인할 조건을 같은 기준으로 설명하세요. 현실 정보가 부족한 장단점은 조건부로 표현하세요. 승자·확률·점수 순위를 만들지 마세요."
      : "500~800자 내외로 다음 소제목을 순서대로 쓰세요: [고민 요약], [사주 해석(참고)], [현실에서 확인할 조건], [이번 주 행동]. 고민 요약은 사용자가 적은 내용으로 한두 문장, 현실 조건은 확인할 질문 2~3개, 이번 주 행동은 작고 실행 가능한 일 2~3개로 정리하세요.",
    "마크다운 표나 HTML을 쓰지 말고 소제목과 짧은 문단·목록으로 답하세요. 이전 상담과 이번 조건이 다르면 이번 요청에 적힌 조건을 우선하되 바뀐 사실을 단정하지 마세요.",
  ].join("\n");
}
