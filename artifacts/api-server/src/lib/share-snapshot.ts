export interface ShareVisibility {
  name: boolean;
  birthInfo: boolean;
  pillars: boolean;
  elements: boolean;
  summary: boolean;
}

const DEFAULT_VISIBILITY: ShareVisibility = {
  name: false,
  birthInfo: false,
  pillars: false,
  elements: true,
  summary: true,
};

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function cleanPillar(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const pillar = value as Record<string, unknown>;
  return {
    heavenlyStem: cleanText(pillar.heavenlyStem, 2) ?? "?",
    earthlyBranch: cleanText(pillar.earthlyBranch, 2) ?? "?",
    heavenlyStemElement: cleanText(pillar.heavenlyStemElement, 2),
    earthlyBranchElement: cleanText(pillar.earthlyBranchElement, 2),
  };
}

export function normalizeShareVisibility(value: unknown): ShareVisibility {
  if (!value || typeof value !== "object") return DEFAULT_VISIBILITY;
  const input = value as Record<string, unknown>;
  return {
    name: input.name === true,
    birthInfo: input.birthInfo === true,
    pillars: input.pillars === true,
    elements: input.elements !== false,
    summary: input.summary !== false,
  };
}

export function buildPublicSharePayload(input: unknown, visibilityInput: unknown) {
  const visibility = normalizeShareVisibility(visibilityInput);
  const source = input && typeof input === "object" ? input as Record<string, any> : {};
  const result = source.result && typeof source.result === "object" ? source.result : source;
  const payload: Record<string, unknown> = {
    version: 1,
    visibility,
    createdAt: new Date().toISOString(),
  };

  if (visibility.name) {
    payload.name = cleanText(source.name, 50);
  }

  if (visibility.birthInfo) {
    const birthInfo = result.birthInfo ?? {};
    payload.birthInfo = {
      year: Number(birthInfo.year) || null,
      month: Number(birthInfo.month) || null,
      day: Number(birthInfo.day) || null,
      hour: Number.isFinite(Number(birthInfo.hour)) ? Number(birthInfo.hour) : -1,
      gender: birthInfo.gender === "female" ? "female" : "male",
      calendarType: birthInfo.calendarType === "lunar" ? "lunar" : "solar",
    };
  }

  if (visibility.pillars) {
    payload.pillars = [
      { label: "시주", value: cleanPillar(result.hourPillar) },
      { label: "일주", value: cleanPillar(result.dayPillar) },
      { label: "월주", value: cleanPillar(result.monthPillar) },
      { label: "년주", value: cleanPillar(result.yearPillar) },
    ];
  }

  if (visibility.elements) {
    const balance = result.elementBalance ?? {};
    payload.elements = {
      wood: Number(balance.wood) || 0,
      fire: Number(balance.fire) || 0,
      earth: Number(balance.earth) || 0,
      metal: Number(balance.metal) || 0,
      water: Number(balance.water) || 0,
      dominant: cleanText(result.dominantElement, 2),
      lacking: cleanText(result.lackingElement, 2),
    };
  }

  if (visibility.summary) {
    payload.summary = {
      fortune: cleanText(result.fortune, 600),
      personality: cleanText(result.personality, 400),
      dayMasterElement: cleanText(result.dayMasterElement, 2),
      yongsin: cleanText(result.yongsin?.yongsin, 2),
    };
  }

  return payload;
}
