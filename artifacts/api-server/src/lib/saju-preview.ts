// Public responses use an allowlist, including nested objects. New fields in the
// full calculation must never become free content by accident.
function pick(value: Record<string, any> | undefined, keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, value?.[key]]));
}

const PILLAR_KEYS = ["heavenlyStem", "earthlyBranch", "heavenlyStemElement", "earthlyBranchElement",
  "heavenlyStemKorean", "earthlyBranchKorean", "zodiac", "stemIndex", "branchIndex"] as const;
const BIRTH_KEYS = ["year", "month", "day", "hour", "minute", "gender", "calendarType", "isLeapMonth",
  "birthPlace", "timeZone", "longitude", "latitude", "applyTrueSolarTime", "dayBoundary"] as const;

export function buildSajuPreview(result: Record<string, any>) {
  const text = typeof result.personality === "string" ? result.personality.trim() : "";
  const firstSentence = text.split(/(?<=[.!?。！？])\s+/)[0] ?? "";
  const previewSummary = firstSentence.length > 140
    ? `${firstSentence.slice(0, 137).trimEnd()}…` : firstSentence;
  return {
    accessLevel: "preview" as const,
    previewSummary,
    birthInfo: pick(result.birthInfo, BIRTH_KEYS),
    yearPillar: pick(result.yearPillar, PILLAR_KEYS),
    monthPillar: pick(result.monthPillar, PILLAR_KEYS),
    dayPillar: pick(result.dayPillar, PILLAR_KEYS),
    hourPillar: pick(result.hourPillar, PILLAR_KEYS),
    elementBalance: pick(result.elementBalance, ["wood", "fire", "earth", "metal", "water"]),
    dominantElement: result.dominantElement,
    lackingElement: result.lackingElement,
    dayMasterElement: result.dayMasterElement,
    zodiac: result.zodiac,
  };
}
