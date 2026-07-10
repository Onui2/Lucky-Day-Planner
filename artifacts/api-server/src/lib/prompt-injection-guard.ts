export type PromptInjectionRiskLevel = "none" | "low" | "medium" | "high";

export interface PromptInjectionAssessment {
  blocked: boolean;
  guardVersion: string;
  riskLevel: PromptInjectionRiskLevel;
  score: number;
  reasons: string[];
  matchedPatternIds: string[];
}

interface GuardRule {
  id: string;
  label: string;
  weight: number;
  pattern: RegExp;
}

export const PROMPT_GUARD_VERSION = "2026-07-08.2";
const BLOCK_THRESHOLD = 2;
const HIGH_RISK_THRESHOLD = 4;
const MAX_QUESTION_LENGTH = 1800;

const RULES: GuardRule[] = [
  {
    id: "ignore-instructions-en",
    label: "기존 지시 무시 요청",
    weight: 4,
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b[\s\S]{0,80}\b(previous|prior|above|all|system|developer)?[\s\S]{0,40}\b(instructions?|rules?|prompts?|messages?)\b/i,
  },
  {
    id: "ignore-instructions-ko",
    label: "기존 지시 무시 요청",
    weight: 4,
    pattern:
      /(?:이전|위|앞선|모든|기존|시스템|개발자)[\s\S]{0,40}(?:지시|명령|규칙|프롬프트|메시지)[\s\S]{0,40}(?:무시|잊어|삭제|폐기|덮어|우회|따르지)/i,
  },
  {
    id: "prompt-exfiltration-en",
    label: "내부 프롬프트 공개 요청",
    weight: 4,
    pattern:
      /\b(reveal|print|show|display|dump|leak|exfiltrate|tell me)\b[\s\S]{0,80}\b(system|developer|hidden|internal|initial)\b[\s\S]{0,40}\b(prompt|instruction|message|policy|rules?)\b/i,
  },
  {
    id: "prompt-exfiltration-ko",
    label: "내부 프롬프트 공개 요청",
    weight: 4,
    pattern:
      /(?:시스템|개발자|숨겨진|내부|초기)[\s\S]{0,40}(?:프롬프트|지시|메시지|정책|규칙)[\s\S]{0,40}(?:보여|출력|공개|노출|덤프|알려|말해)/i,
  },
  {
    id: "role-override",
    label: "역할 변경/탈옥 시도",
    weight: 3,
    pattern:
      /(?:\b(act as|you are now|roleplay as|pretend to be)\b|(?:너는 이제|지금부터|역할극으로))[\s\S]{0,60}(?:system|developer|admin|root|unrestricted|DAN|관리자|개발자|제약 없는|규칙 없는)/i,
  },
  {
    id: "secret-exfiltration",
    label: "비밀 정보 공개 요청",
    weight: 4,
    pattern:
      /(?:api[_\s-]?key|gemini_api_key|token|secret|password|cookie|환경변수|토큰|비밀|키값|쿠키)[\s\S]{0,60}(?:show|print|reveal|dump|leak|알려|보여|출력|공개|노출|덤프)/i,
  },
  {
    id: "tool-or-server-exfiltration",
    label: "도구/서버 정보 탈취 시도",
    weight: 3,
    pattern:
      /(?:tool|function|server|database|schema|system file|도구|함수|서버|데이터베이스|스키마|파일)[\s\S]{0,70}(?:list|call|execute|print|dump|show|목록|호출|실행|출력|덤프|보여)/i,
  },
  {
    id: "encoding-bypass",
    label: "인코딩/형식 우회 시도",
    weight: 2,
    pattern:
      /(?:base64|rot13|hex|unicode|markdown|html|json|암호화|인코딩)[\s\S]{0,80}(?:system|developer|prompt|instruction|시스템|개발자|프롬프트|지시|우회|숨겨)/i,
  },
  {
    id: "jailbreak-keyword",
    label: "탈옥 키워드",
    weight: 2,
    pattern: /(?:\b(?:jailbreak|DAN|do anything now|developer mode)\b|탈옥|제약\s*해제)/i,
  },
  {
    id: "prompt-injection-topic",
    label: "프롬프트 인젝션 관련 문구",
    weight: 1,
    pattern: /(?:prompt injection|프롬프트\s*인젝션|프롬프트\s*주입)/i,
  },
];

function normalizeInput(value: string) {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRiskLevel(score: number): PromptInjectionRiskLevel {
  if (score >= HIGH_RISK_THRESHOLD) return "high";
  if (score >= BLOCK_THRESHOLD) return "medium";
  if (score >= 1) return "low";
  return "none";
}

export function assessPromptInjection(question: string): PromptInjectionAssessment {
  const normalized = normalizeInput(question);
  const reasons: string[] = [];
  const matchedPatternIds: string[] = [];
  let score = 0;

  for (const rule of RULES) {
    if (!rule.pattern.test(normalized)) {
      continue;
    }

    score += rule.weight;
    matchedPatternIds.push(rule.id);
    if (!reasons.includes(rule.label)) {
      reasons.push(rule.label);
    }
  }

  if (normalized.length > MAX_QUESTION_LENGTH) {
    score += HIGH_RISK_THRESHOLD;
    matchedPatternIds.push("question-too-long");
    reasons.push("질문 길이 제한 초과");
  }

  const riskLevel = getRiskLevel(score);

  return {
    blocked: score >= BLOCK_THRESHOLD,
    guardVersion: PROMPT_GUARD_VERSION,
    riskLevel,
    score,
    reasons,
    matchedPatternIds,
  };
}

export function buildPromptGuardAnswer(assessment: PromptInjectionAssessment) {
  const reasonText = assessment.reasons.slice(0, 3).join(", ");
  const suffix = reasonText ? ` 감지 항목: ${reasonText}.` : "";

  return [
    `요청에 AI 안전 지시를 우회하거나 내부 프롬프트/비밀 정보를 요구하는 문구가 포함되어 답변을 생성하지 않았습니다.${suffix}`,
    "사주 상담을 원하시면 직업, 관계, 건강, 시기처럼 사주 해석과 관련된 질문으로 다시 작성해주세요.",
  ].join("\n\n");
}
