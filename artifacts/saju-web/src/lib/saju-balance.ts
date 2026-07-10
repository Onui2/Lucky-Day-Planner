export const KOREAN_ELEMENTS = ["목", "화", "토", "금", "수"] as const;

export type KoreanElement = (typeof KOREAN_ELEMENTS)[number];

export function getHiddenElementScores(
  hiddenStemAnalysis: unknown,
): Record<KoreanElement, number> | null {
  if (!hiddenStemAnalysis || typeof hiddenStemAnalysis !== "object") return null;
  const scores = (hiddenStemAnalysis as Record<string, unknown>).elementScores;
  if (!scores || typeof scores !== "object") return null;

  const keyMap: Record<string, KoreanElement> = {
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
    목: "목",
    화: "화",
    토: "토",
    금: "금",
    수: "수",
  };

  const normalized = Object.fromEntries(
    KOREAN_ELEMENTS.map((element) => [element, 0]),
  ) as Record<KoreanElement, number>;

  let hasValue = false;
  Object.entries(scores as Record<string, unknown>).forEach(([rawKey, rawValue]) => {
    const element = keyMap[rawKey];
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!element || !Number.isFinite(value)) return;
    normalized[element] = value;
    hasValue = true;
  });

  return hasValue ? normalized : null;
}

export function getElementExtremes(scores: Record<KoreanElement, number> | null) {
  if (!scores) return null;

  let dominant: KoreanElement = "목";
  let lacking: KoreanElement = "목";
  let maxScore = -Infinity;
  let minScore = Infinity;

  KOREAN_ELEMENTS.forEach((element) => {
    const score = scores[element];
    if (score > maxScore) {
      maxScore = score;
      dominant = element;
    }
    if (score < minScore) {
      minScore = score;
      lacking = element;
    }
  });

  return {
    dominant,
    lacking,
  };
}
