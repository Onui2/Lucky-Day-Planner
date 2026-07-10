import {
  HEAVENLY_STEMS,
  JIJANGGAN,
  STEM_ELEMENTS,
  countElements,
  getDaeun,
  getDayPillar,
  getHourPillar,
  getJohuAnalysis,
  getMonthPillar,
  getSajuYear,
  getTenGod,
  getYearPillar,
  getYongsin,
  type TenGodName,
} from "./saju-calculator.js";
import {
  resolveBirthInput,
  type BirthCalculationOptions,
} from "./birth-resolution.js";

type CorePillar = ReturnType<typeof getYearPillar>;
type OptionalPillar = CorePillar | null;
type ElementName = "목" | "화" | "토" | "금" | "수";
type Confidence = "high" | "medium" | "low";

const ELEMENTS: ElementName[] = ["목", "화", "토", "금", "수"];
const GENERATES: Record<ElementName, ElementName> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};
const CONTROLS: Record<ElementName, ElementName> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};
const PILLAR_NAMES = ["년주", "월주", "일주", "시주"] as const;
const STEM_WEIGHTS = [0.5, 1.5, 1, 1] as const;
const BRANCH_WEIGHTS = [0.5, 3, 1.5, 1] as const;
const TEN_GODS: TenGodName[] = [
  "비견", "겁재", "식신", "상관", "편재",
  "정재", "편관", "정관", "편인", "정인",
];

function resourceElement(element: ElementName): ElementName {
  return ELEMENTS.find((candidate) => GENERATES[candidate] === element) ?? "수";
}

function officerElement(element: ElementName): ElementName {
  return ELEMENTS.find((candidate) => CONTROLS[candidate] === element) ?? "금";
}

function controllingElement(element: ElementName): ElementName {
  return ELEMENTS.find((candidate) => CONTROLS[candidate] === element) ?? "금";
}

function round(value: number, digits = 1) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, value));
}

function qiWeights(length: number) {
  if (length <= 1) return [1];
  if (length === 2) return [0.3, 0.7];
  return [0.15, 0.3, 0.7];
}

function qiName(index: number, length: number) {
  if (length === 1 || index === length - 1) return "정기";
  if (length === 3 && index === 1) return "중기";
  return "여기";
}

function relationScore(element: string, useful: string, favorable: string, avoid: string) {
  if (element === useful) return 8;
  if (element === favorable) return 4;
  if (element === avoid) return -7;
  return 0;
}

const BRANCH_COMBINES = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]] as const;
const BRANCH_CLASHES = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]] as const;
const BRANCH_HARMS = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]] as const;
const STEM_COMBINES = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]] as const;
const STEM_CLASHES = [[0, 6], [1, 7], [2, 8], [3, 9]] as const;

function hasPair(pairs: ReadonlyArray<readonly [number, number]>, left: number, right: number) {
  return pairs.some(([a, b]) => (a === left && b === right) || (a === right && b === left));
}

function transitRelations(transit: CorePillar, natalPillars: OptionalPillar[]) {
  const evidence: string[] = [];
  let score = 0;

  natalPillars.forEach((pillar, index) => {
    if (!pillar) return;
    const label = PILLAR_NAMES[index];
    if (hasPair(STEM_COMBINES, transit.stemIndex, pillar.stemIndex)) {
      score += 5;
      evidence.push(`${label} 천간과 합`);
    }
    if (hasPair(STEM_CLASHES, transit.stemIndex, pillar.stemIndex)) {
      score -= 5;
      evidence.push(`${label} 천간과 충`);
    }
    if (hasPair(BRANCH_COMBINES, transit.branchIndex, pillar.branchIndex)) {
      score += 7;
      evidence.push(`${label} 지지와 육합`);
    }
    if (hasPair(BRANCH_CLASHES, transit.branchIndex, pillar.branchIndex)) {
      score -= 9;
      evidence.push(`${label} 지지와 충`);
    }
    if (hasPair(BRANCH_HARMS, transit.branchIndex, pillar.branchIndex)) {
      score -= 4;
      evidence.push(`${label} 지지와 해`);
    }
  });

  return { score, evidence };
}

export interface HiddenStemPowerAnalysis {
  pillars: Array<{
    pillar: string;
    stem: string;
    branch: string;
    branchWeight: number;
    hiddenStems: Array<{
      stem: string;
      element: string;
      tenGod: TenGodName;
      qi: string;
      weight: number;
      penetrated: boolean;
      explanation: string;
    }>;
  }>;
  visibleStems: Array<{
    pillar: string;
    stem: string;
    element: string;
    tenGod: TenGodName;
    roots: Array<{ pillar: string; branch: string; hiddenStem: string; weight: number }>;
    rootScore: number;
    level: "강근" | "중근" | "약근" | "무근";
    summary: string;
  }>;
  elementScores: Record<ElementName, number>;
  dayMaster: {
    element: ElementName;
    resourceElement: ElementName;
    supportScore: number;
    pressureScore: number;
    strengthPercent: number;
    type: "극신약" | "신약" | "중화" | "신강" | "극신강";
    deukryeong: boolean;
    deukji: boolean;
    deukse: boolean;
    summary: string;
  };
  confidence: Confidence;
  evidence: string[];
  method: string;
}

export function getHiddenStemPowerAnalysis(
  dayStem: string,
  yearPillar: CorePillar,
  monthPillar: CorePillar,
  dayPillar: CorePillar,
  hourPillar: OptionalPillar,
): HiddenStemPowerAnalysis {
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const visibleStemSet = new Set(pillars.filter(Boolean).map((pillar) => pillar!.stem));
  const elementScores = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<ElementName, number>;

  pillars.forEach((pillar, index) => {
    if (!pillar) return;
    elementScores[pillar.stemElement as ElementName] += STEM_WEIGHTS[index];
    const hidden = JIJANGGAN[pillar.branch] ?? [];
    const weights = qiWeights(hidden.length);
    hidden.forEach((item, hiddenIndex) => {
      elementScores[item.element as ElementName] += BRANCH_WEIGHTS[index] * weights[hiddenIndex];
    });
  });

  const pillarDetails = pillars.flatMap((pillar, index) => {
    if (!pillar) return [];
    const hidden = JIJANGGAN[pillar.branch] ?? [];
    const weights = qiWeights(hidden.length);
    return [{
      pillar: PILLAR_NAMES[index],
      stem: pillar.stem,
      branch: pillar.branch,
      branchWeight: BRANCH_WEIGHTS[index],
      hiddenStems: hidden.map((item, hiddenIndex) => {
        const weight = round(BRANCH_WEIGHTS[index] * weights[hiddenIndex], 2);
        const penetrated = visibleStemSet.has(item.stem);
        const qi = qiName(hiddenIndex, hidden.length);
        return {
          stem: item.stem,
          element: item.element,
          tenGod: getTenGod(dayStem, item.stem),
          qi,
          weight,
          penetrated,
          explanation: penetrated
            ? `${PILLAR_NAMES[index]} ${pillar.branch}의 ${qi} ${item.stem}이 천간에 투출해 숨은 기운이 행동과 역할로 드러납니다.`
            : `${PILLAR_NAMES[index]} ${pillar.branch}의 ${qi} ${item.stem}은 지지 안에서 배경 동기와 잠재력으로 작동합니다.`,
        };
      }),
    }];
  });

  const visibleStems = pillars.flatMap((pillar, index) => {
    if (!pillar) return [];
    const roots = pillars.flatMap((rootPillar, rootIndex) => {
      if (!rootPillar) return [];
      const hidden = JIJANGGAN[rootPillar.branch] ?? [];
      const weights = qiWeights(hidden.length);
      return hidden.flatMap((item, hiddenIndex) => {
        if (item.element !== pillar.stemElement) return [];
        const exactBonus = item.stem === pillar.stem ? 1 : 0.8;
        return [{
          pillar: PILLAR_NAMES[rootIndex],
          branch: rootPillar.branch,
          hiddenStem: item.stem,
          weight: round(BRANCH_WEIGHTS[rootIndex] * weights[hiddenIndex] * exactBonus, 2),
        }];
      });
    });
    const rootScore = round(roots.reduce((sum, root) => sum + root.weight, 0), 2);
    const level: HiddenStemPowerAnalysis["visibleStems"][number]["level"] = rootScore >= 2.2
      ? "강근" : rootScore >= 1 ? "중근" : rootScore > 0 ? "약근" : "무근";
    return [{
      pillar: PILLAR_NAMES[index],
      stem: pillar.stem,
      element: pillar.stemElement,
      tenGod: getTenGod(dayStem, pillar.stem),
      roots,
      rootScore,
      level,
      summary: roots.length > 0
        ? `${PILLAR_NAMES[index]} ${pillar.stem}은 ${roots.map((root) => `${root.pillar} ${root.branch}`).join("·")}에 뿌리를 둔 ${level}입니다.`
        : `${PILLAR_NAMES[index]} ${pillar.stem}은 원국 지장간에서 같은 오행의 뿌리를 찾기 어려운 무근입니다.`,
    }];
  });

  const dayElement = STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(dayStem)] as ElementName;
  const resource = resourceElement(dayElement);
  const monthHiddenElements = (JIJANGGAN[monthPillar.branch] ?? []).map((item) => item.element);
  const dayHiddenElements = (JIJANGGAN[dayPillar.branch] ?? []).map((item) => item.element);
  const deukryeong = monthHiddenElements.includes(dayElement) || monthHiddenElements.includes(resource);
  const deukji = dayHiddenElements.includes(dayElement) || dayHiddenElements.includes(resource);
  const supportScore = elementScores[dayElement] + elementScores[resource];
  const totalScore = Object.values(elementScores).reduce((sum, value) => sum + value, 0);
  const pressureScore = Math.max(0, totalScore - supportScore);
  const strengthPercent = round(totalScore > 0 ? supportScore / totalScore * 100 : 50);
  const deukse = supportScore >= pressureScore * 0.85;
  const type = strengthPercent < 25 ? "극신약"
    : strengthPercent < 42 ? "신약"
      : strengthPercent <= 58 ? "중화"
        : strengthPercent <= 75 ? "신강"
          : "극신강";
  const evidence = [
    deukryeong ? "월령에서 일간 또는 인성의 도움을 얻음" : "월령의 직접 지원이 약함",
    deukji ? "일지에서 일간의 뿌리 또는 인성을 얻음" : "일지의 직접 지원이 약함",
    deukse ? "원국 전체의 비겁·인성 지원이 충분함" : "재성·관성·식상의 소모와 압박이 더 큼",
  ];

  return {
    pillars: pillarDetails,
    visibleStems,
    elementScores: Object.fromEntries(
      Object.entries(elementScores).map(([key, value]) => [key, round(value, 2)]),
    ) as Record<ElementName, number>,
    dayMaster: {
      element: dayElement,
      resourceElement: resource,
      supportScore: round(supportScore, 2),
      pressureScore: round(pressureScore, 2),
      strengthPercent,
      type,
      deukryeong,
      deukji,
      deukse,
      summary: `${dayElement} 일간은 가중 세력 ${strengthPercent}%로 ${type}에 가깝습니다. ${evidence.join(". ")}.`,
    },
    confidence: hourPillar ? "high" : "medium",
    evidence,
    method: "월지 3.0·일지 1.5·시지 1.0·년지 0.5, 지장간 정기/중기/여기 가중치와 통근·투출을 함께 반영",
  };
}

export interface UsefulGodMethodResult {
  key: "eokbu" | "johu" | "tonggwan" | "byeongyak" | "balance";
  name: string;
  usefulElements: ElementName[];
  avoidElements: ElementName[];
  confidence: Confidence;
  summary: string;
  evidence: string[];
  school: string;
  alternativeInterpretation: string;
}

export interface MultiUsefulGodAnalysis {
  primary: ElementName;
  secondary: ElementName | null;
  avoid: ElementName;
  agreementScore: number;
  methods: UsefulGodMethodResult[];
  specialPattern: {
    type: "일반격" | "종격 후보" | "전왕격 후보";
    status: "해당 없음" | "검토 필요";
    summary: string;
    evidence: string[];
    conditions: Array<{ label: string; passed: boolean; detail: string }>;
    breakers: string[];
    alternativeInterpretation: string;
  };
  summary: string;
  confidence: Confidence;
  method: string;
}

export function getMultiUsefulGodAnalysis(
  hidden: HiddenStemPowerAnalysis,
  johu: ReturnType<typeof getJohuAnalysis>,
  simpleYongsin: ReturnType<typeof getYongsin>,
): MultiUsefulGodAnalysis {
  const dayElement = hidden.dayMaster.element;
  const resource = hidden.dayMaster.resourceElement;
  const output = GENERATES[dayElement];
  const wealth = CONTROLS[dayElement];
  const officer = officerElement(dayElement);
  const sortedElements = [...ELEMENTS].sort((a, b) => hidden.elementScores[a] - hidden.elementScores[b]);
  const isStrong = hidden.dayMaster.strengthPercent > 58;
  const isWeak = hidden.dayMaster.strengthPercent < 42;
  const eokbuCandidates = isStrong ? [output, wealth, officer] : isWeak ? [resource, dayElement] : sortedElements.slice(0, 2);
  const eokbuUseful = [...new Set(eokbuCandidates)].sort(
    (a, b) => hidden.elementScores[a] - hidden.elementScores[b],
  ) as ElementName[];
  const eokbuAvoid = isStrong ? [dayElement, resource] : [output, wealth, officer];

  const methods: UsefulGodMethodResult[] = [{
    key: "eokbu",
    name: "억부용신",
    usefulElements: eokbuUseful.slice(0, 2),
    avoidElements: [...new Set(eokbuAvoid)].slice(0, 2) as ElementName[],
    confidence: hidden.confidence,
    summary: isStrong
      ? `${hidden.dayMaster.type} 흐름을 누그러뜨리기 위해 설기·재성·관성 중 세력이 약한 ${eokbuUseful.slice(0, 2).join("·")}을 우선합니다.`
      : isWeak
        ? `${hidden.dayMaster.type} 일간을 돕는 인성 ${resource}와 비겁 ${dayElement}을 우선합니다.`
        : `중화에 가까워 과소한 ${eokbuUseful.slice(0, 2).join("·")}을 보완합니다.`,
    evidence: hidden.evidence,
    school: "억부·신강약 중심",
    alternativeInterpretation: "격국·조후를 더 강하게 보는 해석에서는 첫 용신 순위가 달라질 수 있습니다.",
  }];

  const johuElements = johu.needElements.filter((element): element is ElementName => ELEMENTS.includes(element as ElementName));
  methods.push({
    key: "johu",
    name: "조후용신",
    usefulElements: johuElements.length > 0 ? johuElements : [sortedElements[0]],
    avoidElements: johu.temperature.includes("조") ? ["화"] : johu.temperature.includes("습") ? ["수"] : [],
    confidence: johuElements.length > 0 ? "high" : "medium",
    summary: `${johu.temperature}·${johu.moisture} 조후를 기준으로 ${johuElements.join("·") || sortedElements[0]} 기운을 보완합니다.`,
    evidence: [johu.summary, johu.advice],
    school: "조후·계절 균형 중심",
    alternativeInterpretation: "한난조습보다 신강약을 우선하는 해석에서는 보조 용신으로만 볼 수 있습니다.",
  });

  const strongest = [...ELEMENTS].sort((a, b) => hidden.elementScores[b] - hidden.elementScores[a]);
  let controllingPair: [ElementName, ElementName] | null = null;
  for (const left of strongest.slice(0, 3)) {
    for (const right of strongest.slice(0, 3)) {
      if (left !== right && CONTROLS[left] === right) {
        controllingPair = [left, right];
        break;
      }
    }
    if (controllingPair) break;
  }
  const mediator = controllingPair ? GENERATES[controllingPair[0]] : sortedElements[0];
  methods.push({
    key: "tonggwan",
    name: "통관용신",
    usefulElements: [mediator],
    avoidElements: controllingPair ? [...controllingPair] : [],
    confidence: controllingPair ? "medium" : "low",
    summary: controllingPair
      ? `${controllingPair[0]}이 ${controllingPair[1]}을 극하는 긴장을 ${mediator} 기운으로 이어 흐르게 합니다.`
      : `뚜렷한 상극 대치가 약해 가장 부족한 ${mediator}을 보조 통관 기운으로 봅니다.`,
    evidence: controllingPair
      ? [`${controllingPair[0]} ${hidden.elementScores[controllingPair[0]]}점`, `${controllingPair[1]} ${hidden.elementScores[controllingPair[1]]}점`]
      : ["뚜렷한 양강 대치 없음"],
    school: "통관·상생 흐름 중심",
    alternativeInterpretation: "충돌 오행이 약하거나 통관 오행이 무근하면 실제 작용은 제한적으로 볼 수 있습니다.",
  });

  const excess = strongest[0];
  const average = Object.values(hidden.elementScores).reduce((sum, value) => sum + value, 0) / 5;
  const medicine = controllingElement(excess);
  const hasClearExcess = hidden.elementScores[excess] >= average * 1.4;
  methods.push({
    key: "byeongyak",
    name: "병약용신",
    usefulElements: [hasClearExcess ? medicine : sortedElements[0]],
    avoidElements: hasClearExcess ? [excess] : [],
    confidence: hasClearExcess ? "medium" : "low",
    summary: hasClearExcess
      ? `과다한 ${excess}을 병으로 보고 이를 제어하는 ${medicine}을 약으로 봅니다.`
      : `독주하는 오행이 약해 가장 부족한 ${sortedElements[0]}을 생활 보완의 약으로 봅니다.`,
    evidence: [`${excess} ${round(hidden.elementScores[excess], 2)}점`, `오행 평균 ${round(average, 2)}점`],
    school: "병약·과다오행 제어 중심",
    alternativeInterpretation: "과다 오행이 월령을 얻어 격을 이루면 병이 아니라 쓰임으로 해석될 수 있습니다.",
  });

  const simple = simpleYongsin.yongsin as ElementName;
  methods.push({
    key: "balance",
    name: "오행균형용신",
    usefulElements: ELEMENTS.includes(simple) ? [simple] : [sortedElements[0]],
    avoidElements: ELEMENTS.includes(simpleYongsin.geesin as ElementName) ? [simpleYongsin.geesin as ElementName] : [],
    confidence: "low",
    summary: `단순 오행 개수에서는 ${simple}이 가장 부족해 보완 후보가 됩니다.`,
    evidence: ["천간·지지 표면 오행 개수 기준"],
    school: "표면 오행 균형",
    alternativeInterpretation: "지장간·월령 가중치를 반영하지 않는 참고값이라 최종 용신으로 단정하지 않습니다.",
  });

  const confidenceWeight: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
  const votes = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<ElementName, number>;
  methods.forEach((method) => method.usefulElements.forEach((element, index) => {
    votes[element] += confidenceWeight[method.confidence] * (index === 0 ? 1 : 0.65);
  }));
  const ranked = [...ELEMENTS].sort((a, b) => votes[b] - votes[a]);
  const primary = ranked[0];
  const secondary = votes[ranked[1]] > 0 ? ranked[1] : null;
  const avoidVotes = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<ElementName, number>;
  methods.forEach((method) => method.avoidElements.forEach((element) => {
    avoidVotes[element] += confidenceWeight[method.confidence];
  }));
  const avoid = [...ELEMENTS].sort((a, b) => avoidVotes[b] - avoidVotes[a])[0];
  const totalVotes = Object.values(votes).reduce((sum, value) => sum + value, 0);
  const agreementScore = Math.round(totalVotes > 0 ? votes[primary] / totalVotes * 100 : 0);

  const dayRoot = hidden.visibleStems.find((item) => item.pillar === "일주")?.rootScore ?? 0;
  const nonSupportElements = ELEMENTS.filter((element) => element !== dayElement && element !== resource);
  const nonSupportTotal = nonSupportElements.reduce((sum, element) => sum + hidden.elementScores[element], 0);
  const dominantNonSupport = [...nonSupportElements].sort((a, b) => hidden.elementScores[b] - hidden.elementScores[a])[0];
  const dominantNonSupportShare = round(
    nonSupportTotal > 0 ? hidden.elementScores[dominantNonSupport] / nonSupportTotal * 100 : 0,
  );
  const outputScore = hidden.elementScores[output];
  const wealthScore = hidden.elementScores[wealth];
  const officerScore = hidden.elementScores[officer];
  const pressureOutletScore = outputScore + wealthScore + officerScore;
  const hasSeasonOrSeat = hidden.dayMaster.deukryeong || hidden.dayMaster.deukji;
  const jongConditions = [
    { label: "일간 통근 약함", passed: dayRoot < 0.45, detail: `${round(dayRoot, 2)}점` },
    { label: "비겁·인성 지원 18% 이하", passed: hidden.dayMaster.strengthPercent <= 18, detail: `${hidden.dayMaster.strengthPercent}%` },
    { label: "비지원 오행 한쪽 집중", passed: dominantNonSupportShare >= 45, detail: `${dominantNonSupport} ${dominantNonSupportShare}%` },
    { label: "득령·득지 약함", passed: !hasSeasonOrSeat, detail: `득령 ${hidden.dayMaster.deukryeong ? "있음" : "없음"} · 득지 ${hidden.dayMaster.deukji ? "있음" : "없음"}` },
  ];
  const jongBreakers = [
    ...(dayRoot >= 0.45 ? [`일간 통근 ${round(dayRoot, 2)}점이 남아 종격 파격 가능`] : []),
    ...(hidden.dayMaster.deukryeong ? ["월령에서 일간 또는 인성 지원이 있어 종격 파격 가능"] : []),
    ...(hidden.dayMaster.deukji ? ["일지에서 일간 또는 인성 지원이 있어 종격 파격 가능"] : []),
    ...(dominantNonSupportShare < 45 ? [`비지원 오행 집중도 ${dominantNonSupportShare}%로 한쪽 기세가 부족`] : []),
  ];
  const jeonwangConditions = [
    { label: "비겁·인성 지원 82% 이상", passed: hidden.dayMaster.strengthPercent >= 82, detail: `${hidden.dayMaster.strengthPercent}%` },
    { label: "월령 또는 일지 지원", passed: hasSeasonOrSeat, detail: `득령 ${hidden.dayMaster.deukryeong ? "있음" : "없음"} · 득지 ${hidden.dayMaster.deukji ? "있음" : "없음"}` },
    { label: "일간 뿌리 강함", passed: dayRoot >= 2.2, detail: `${round(dayRoot, 2)}점` },
    { label: "설기·재관 압력 약함", passed: pressureOutletScore <= average * 1.8, detail: `${round(pressureOutletScore, 2)}점` },
  ];
  const jeonwangBreakers = [
    ...(hidden.dayMaster.strengthPercent < 82 ? [`비겁·인성 지원 ${hidden.dayMaster.strengthPercent}%로 전왕격 기준 부족`] : []),
    ...(!hasSeasonOrSeat ? ["월령·일지 지원이 약해 전왕격 성립 약함"] : []),
    ...(outputScore > average * 1.2 ? [`식상 ${round(outputScore, 2)}점이 강해 설기 파격 가능`] : []),
    ...(wealthScore + officerScore > average * 1.4 ? [`재관 압력 ${round(wealthScore + officerScore, 2)}점으로 전왕 흐름 방해`] : []),
  ];
  let specialPattern: MultiUsefulGodAnalysis["specialPattern"] = {
    type: "일반격",
    status: "해당 없음",
    summary: "일간의 뿌리와 지원이 남아 있어 일반적인 신강약·격국 틀에서 판단합니다.",
    evidence: [`일간 통근 ${round(dayRoot, 2)}점`, `일간 지원 ${hidden.dayMaster.strengthPercent}%`],
    conditions: [
      { label: "종격 성립 부족", passed: jongConditions.filter((item) => item.passed).length < 3, detail: `${jongConditions.filter((item) => item.passed).length}/4 통과` },
      { label: "전왕격 성립 부족", passed: jeonwangConditions.filter((item) => item.passed).length < 3, detail: `${jeonwangConditions.filter((item) => item.passed).length}/4 통과` },
    ],
    breakers: [...jongBreakers, ...jeonwangBreakers].slice(0, 4),
    alternativeInterpretation: "특수격으로 확정할 근거가 약하므로 억부·조후 용신을 우선하되, 운에서 한쪽 기세가 극단화되면 별도 재검토합니다.",
  };
  if (hidden.dayMaster.strengthPercent <= 18 && dayRoot < 0.45 && dominantNonSupportShare >= 45) {
    specialPattern = {
      type: "종격 후보",
      status: "검토 필요",
      summary: `일간의 뿌리가 매우 약하고 ${dominantNonSupport} 기세가 집중돼 종격 가능성을 별도 검토해야 합니다. 자동 확정하지 않습니다.`,
      evidence: [`일간 지원 ${hidden.dayMaster.strengthPercent}%`, `일간 통근 ${round(dayRoot, 2)}점`, `${dominantNonSupport} 집중 ${dominantNonSupportShare}%`],
      conditions: jongConditions,
      breakers: jongBreakers,
      alternativeInterpretation: "득령·득지나 인성 뿌리가 확인되면 종격이 깨지고 약한 일반격으로 해석하는 쪽이 안전합니다.",
    };
  } else if (hidden.dayMaster.strengthPercent >= 82) {
    specialPattern = {
      type: "전왕격 후보",
      status: "검토 필요",
      summary: "비겁·인성의 지원이 극단적으로 모여 전왕격 가능성을 검토해야 합니다. 운에서 설기 여부까지 확인해야 확정할 수 있습니다.",
      evidence: [`일간 지원 ${hidden.dayMaster.strengthPercent}%`, `득령 ${hidden.dayMaster.deukryeong ? "성립" : "불성립"}`],
      conditions: jeonwangConditions,
      breakers: jeonwangBreakers,
      alternativeInterpretation: "식상·재성·관성이 강하게 투출하거나 운에서 설기가 열리면 전왕격보다 신강 일반격으로 봅니다.",
    };
  }

  const confidence: Confidence = agreementScore >= 42 && hidden.confidence === "high" ? "high"
    : agreementScore >= 28 ? "medium" : "low";
  return {
    primary,
    secondary,
    avoid,
    agreementScore,
    methods,
    specialPattern,
    summary: `${methods.filter((method) => method.usefulElements.includes(primary)).map((method) => method.name).join("·")}이 ${primary}을 공통 후보로 지지합니다. ${secondary ? `${secondary}은 보조 후보입니다.` : "보조 후보는 뚜렷하지 않습니다."}`,
    confidence,
    method: "억부·조후·통관·병약·표면 오행균형을 독립 계산한 뒤 신뢰도 가중 투표",
  };
}

export interface StemTransformationAnalysis {
  items: Array<{
    pair: string;
    pillars: string[];
    targetElement: ElementName;
    status: "합화 성립 가능" | "부분 합화" | "합화 방해" | "천간합·미성립";
    confidence: Confidence;
    summary: string;
    evidence: string[];
    blockers: string[];
  }>;
  summary: string;
  method: string;
}

const TRANSFORMATIONS: Array<{ stems: [string, string]; element: ElementName; label: string }> = [
  { stems: ["갑", "기"], element: "토", label: "갑기합토(甲己合土)" },
  { stems: ["을", "경"], element: "금", label: "을경합금(乙庚合金)" },
  { stems: ["병", "신"], element: "수", label: "병신합수(丙辛合水)" },
  { stems: ["정", "임"], element: "목", label: "정임합목(丁壬合木)" },
  { stems: ["무", "계"], element: "화", label: "무계합화(戊癸合火)" },
];

export function getStemTransformationAnalysis(
  hidden: HiddenStemPowerAnalysis,
  yearPillar: CorePillar,
  monthPillar: CorePillar,
  dayPillar: CorePillar,
  hourPillar: OptionalPillar,
): StemTransformationAnalysis {
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const average = Object.values(hidden.elementScores).reduce((sum, value) => sum + value, 0) / 5;
  const items = TRANSFORMATIONS.flatMap((rule) => {
    const found = rule.stems.map((stem) => pillars
      .map((pillar, index) => ({ pillar, index }))
      .filter(({ pillar }) => pillar?.stem === stem));
    if (found.some((matches) => matches.length === 0)) return [];

    const selected = [found[0][0], found[1][0]];
    const selectedIndices = selected.map((item) => item.index);
    const seasonSupport = monthPillar.branchElement === rule.element ||
      (JIJANGGAN[monthPillar.branch]?.at(-1)?.element === rule.element);
    const rooted = hidden.elementScores[rule.element] >= average * 0.9;
    const blockers: string[] = [];
    selected.forEach(({ pillar, index }) => {
      if (!pillar) return;
      pillars.forEach((other, otherIndex) => {
        if (!other || selectedIndices.includes(otherIndex)) return;
        if (hasPair(STEM_CLASHES, pillar.stemIndex, other.stemIndex)) {
          blockers.push(`${PILLAR_NAMES[index]} ${pillar.stem}이 ${PILLAR_NAMES[otherIndex]} ${other.stem}과 충`);
        }
      });
    });
    const status: StemTransformationAnalysis["items"][number]["status"] = blockers.length > 0 ? "합화 방해"
      : seasonSupport && rooted ? "합화 성립 가능"
        : seasonSupport || rooted ? "부분 합화"
          : "천간합·미성립";
    const evidence = [
      seasonSupport ? `월령이 ${rule.element} 기운을 지원` : `월령의 ${rule.element} 지원이 약함`,
      rooted ? `${rule.element} 가중 세력 ${round(hidden.elementScores[rule.element], 2)}점` : `${rule.element} 뿌리와 세력이 부족`,
      ...blockers,
    ];
    return [{
      pair: rule.label,
      pillars: selected.map(({ index }) => PILLAR_NAMES[index]),
      targetElement: rule.element,
      status,
      confidence: status === "합화 성립 가능" ? "medium" as const : "low" as const,
      summary: status === "합화 성립 가능"
        ? `${rule.label}은 월령과 뿌리 조건을 함께 얻어 ${rule.element}으로 변하는 힘이 비교적 분명합니다.`
        : status === "부분 합화"
          ? `${rule.label}은 서로 묶이지만 ${rule.element}으로 완전히 변할 조건은 일부만 갖췄습니다.`
          : status === "합화 방해"
            ? `${rule.label}이 있으나 다른 천간의 충이 개입해 합화가 흔들립니다.`
            : `${rule.label}은 관계를 묶는 합으로 작동하지만 월령·통근 조건이 약해 합화로 확정하지 않습니다.`,
      evidence,
      blockers,
    }];
  });

  return {
    items,
    summary: items.length > 0
      ? `${items.length}개의 천간합을 월령·통근·방해 조건까지 검사했습니다.`
      : "원국 천간에 직접 맞물리는 오합 조합이 없습니다.",
    method: "천간 오합 존재 후 목표 오행의 월령 지원·지장간 세력·천간 충 방해를 순서대로 검사",
  };
}

interface RelativeRoleConfig {
  key: string;
  name: string;
  pillars: number[];
  gods: TenGodName[];
  domain: string;
  strong: string;
  balanced: string;
  weak: string;
  adviceStrong: string;
  adviceWeak: string;
}

export interface FamilyRoleAnalysis {
  roles: Array<{
    key: string;
    name: string;
    domain: string;
    relatedGods: TenGodName[];
    score: number;
    level: "강함" | "적정" | "약함";
    palaces: string[];
    interactions: string[];
    summary: string;
    advice: string;
    confidence: Confidence;
    evidence: string[];
  }>;
  summary: string;
  method: string;
}

function getTenGodWeightedScores(dayStem: string, pillars: OptionalPillar[]) {
  const scores = Object.fromEntries(TEN_GODS.map((god) => [god, 0])) as Record<TenGodName, number>;
  pillars.forEach((pillar, index) => {
    if (!pillar) return;
    scores[getTenGod(dayStem, pillar.stem)] += STEM_WEIGHTS[index];
    const hidden = JIJANGGAN[pillar.branch] ?? [];
    const weights = qiWeights(hidden.length);
    hidden.forEach((item, hiddenIndex) => {
      scores[getTenGod(dayStem, item.stem)] += BRANCH_WEIGHTS[index] * weights[hiddenIndex];
    });
  });
  return scores;
}

function palaceInteractions(pillars: OptionalPillar[], palaceIndices: number[]) {
  const results = new Set<string>();
  palaceIndices.forEach((palaceIndex) => {
    const palace = pillars[palaceIndex];
    if (!palace) return;
    pillars.forEach((other, otherIndex) => {
      if (!other || otherIndex === palaceIndex) return;
      if (hasPair(BRANCH_COMBINES, palace.branchIndex, other.branchIndex)) {
        results.add(`${PILLAR_NAMES[palaceIndex]}와 ${PILLAR_NAMES[otherIndex]} 육합`);
      }
      if (hasPair(BRANCH_CLASHES, palace.branchIndex, other.branchIndex)) {
        results.add(`${PILLAR_NAMES[palaceIndex]}와 ${PILLAR_NAMES[otherIndex]} 충`);
      }
      if (hasPair(BRANCH_HARMS, palace.branchIndex, other.branchIndex)) {
        results.add(`${PILLAR_NAMES[palaceIndex]}와 ${PILLAR_NAMES[otherIndex]} 해`);
      }
    });
  });
  return [...results];
}

export function getFamilyRoleAnalysis(
  gender: "male" | "female",
  dayStem: string,
  yearPillar: CorePillar,
  monthPillar: CorePillar,
  dayPillar: CorePillar,
  hourPillar: OptionalPillar,
): FamilyRoleAnalysis {
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const scores = getTenGodWeightedScores(dayStem, pillars);
  const spouseGods: TenGodName[] = gender === "male" ? ["정재", "편재"] : ["정관", "편관"];
  const childGods: TenGodName[] = gender === "male" ? ["정관", "편관", "식신", "상관"] : ["식신", "상관"];
  const configs: RelativeRoleConfig[] = [
    {
      key: "parents", name: "부모·보호자", pillars: [0, 1], gods: ["정인", "편인", "정재", "편재"], domain: "양육 환경·보호·부모와의 현실적 연결",
      strong: "부모·보호자 자리가 강해 도움과 기대가 함께 크게 작동합니다.", balanced: "도움받는 힘과 독립하는 힘이 비교적 균형을 이룹니다.", weak: "가족 배경보다 스스로 기반을 만드는 경험이 중요하게 작동합니다.",
      adviceStrong: "도움은 받되 진로와 돈의 최종 결정권은 분리하세요.", adviceWeak: "가족 밖의 스승·제도·안정된 생활 기반을 의식적으로 만드세요.",
    },
    {
      key: "siblings", name: "형제·동료", pillars: [0, 1], gods: ["비견", "겁재"], domain: "형제·친구·동료·경쟁자와의 협력",
      strong: "동료와 경쟁의 기운이 강해 사람을 모으고 판을 키우는 힘이 큽니다.", balanced: "독립과 협업을 상황에 맞게 나눌 수 있습니다.", weak: "소수의 신뢰 관계와 명확한 역할 구조가 더 잘 맞습니다.",
      adviceStrong: "동업에서는 지분·돈·책임을 문서로 먼저 나누세요.", adviceWeak: "혼자 버티기 전에 정기적으로 도움을 요청할 사람을 정하세요.",
    },
    {
      key: "spouse", name: "배우자·가까운 관계", pillars: [2], gods: spouseGods, domain: "배우자 인연·친밀감·생활을 함께 꾸리는 방식",
      strong: "가까운 관계가 삶의 선택과 현실 계획에 큰 영향을 줍니다.", balanced: "관계와 자기 영역을 함께 지키기 좋은 구조입니다.", weak: "관계를 서두르기보다 생활 기준과 신뢰를 천천히 맞추는 편이 좋습니다.",
      adviceStrong: "상대에게 기대는 몫과 스스로 책임질 몫을 구체적으로 합의하세요.", adviceWeak: "감정의 강도보다 반복 가능한 약속과 생활 호흡을 확인하세요.",
    },
    {
      key: "children", name: "자녀·후배·결과물", pillars: [3], gods: childGods, domain: "자녀·후배·창작물·장기적으로 남기는 성과",
      strong: "돌보고 가르치거나 결과물을 남기는 일이 후반 삶의 중요한 동력이 됩니다.", balanced: "자기 성장과 후배·자녀를 돌보는 역할을 함께 가져갈 수 있습니다.", weak: "자녀·후배 문제는 정해진 모습보다 각자의 속도를 존중할수록 편안합니다.",
      adviceStrong: "대신 해주기보다 기준과 기회를 제공하는 방식으로 이끄세요.", adviceWeak: "장기 성취를 작은 창작·교육·기록 습관부터 쌓으세요.",
    },
    {
      key: "career", name: "직업·조직", pillars: [1], gods: ["정관", "편관", "정재", "편재"], domain: "직장·책임·성과·현실적 보상",
      strong: "직업과 성과가 삶의 중심축으로 강하게 작동합니다.", balanced: "책임과 보상의 균형을 비교적 현실적으로 맞출 수 있습니다.", weak: "고정된 직함보다 전문성·프로젝트·자율적 역할에서 강점이 살아납니다.",
      adviceStrong: "성과 압박이 건강과 관계를 잠식하지 않도록 경계를 정하세요.", adviceWeak: "자격·마감·수입 목표처럼 외부 구조를 일부러 만들어 지속성을 보완하세요.",
    },
  ];

  const roles = configs.map((config) => {
    const score = round(config.gods.reduce((sum, god) => sum + scores[god], 0), 2);
    const level: FamilyRoleAnalysis["roles"][number]["level"] = score >= 3.5 ? "강함" : score >= 1.4 ? "적정" : "약함";
    const interactions = palaceInteractions(pillars, config.pillars);
    const missingTime = config.pillars.includes(3) && !hourPillar;
    const summary = level === "강함" ? config.strong : level === "적정" ? config.balanced : config.weak;
    return {
      key: config.key,
      name: config.name,
      domain: config.domain,
      relatedGods: config.gods,
      score,
      level,
      palaces: config.pillars.map((index) => PILLAR_NAMES[index]),
      interactions,
      summary: `${summary}${interactions.length > 0 ? ` ${interactions.join("·")}이 관계의 변화를 키웁니다.` : ""}`,
      advice: level === "강함" ? config.adviceStrong : config.adviceWeak,
      confidence: missingTime ? "low" as const : hourPillar ? "high" as const : "medium" as const,
      evidence: [
        `${config.gods.join("·")} 가중치 ${score}`,
        `${config.pillars.map((index) => PILLAR_NAMES[index]).join("·")} 궁성 기준`,
        ...(missingTime ? ["출생시간 미상으로 시주 판단 제외"] : interactions),
      ],
    };
  });

  return {
    roles,
    summary: "십신만으로 가족을 단정하지 않고 관련 궁성, 지장간 세력, 합충을 함께 읽었습니다.",
    method: "년주·월주·일주·시주의 궁성 의미와 성별별 배우자성, 십신 가중치, 궁성 간 합충해를 교차",
  };
}

export interface DaeunTransitionAnalysis {
  transitions: Array<{
    from: string | null;
    to: string;
    transitionDate: string;
    windowStart: string;
    windowEnd: string;
    age: number;
    phase: "다가오는 교운기" | "교운기 진행" | "새 대운 정착" | "과거 교운기" | "먼 미래";
    summary: string;
    advice: string;
  }>;
  active: DaeunTransitionAnalysis["transitions"][number] | null;
  summary: string;
  method: string;
}

function shiftIsoDate(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export function getDaeunTransitionAnalysis(
  daeun: ReturnType<typeof getDaeun>,
  now = new Date(),
): DaeunTransitionAnalysis {
  const nowTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const transitions = daeun.periods.map((period, index) => {
    const transitionTime = Date.parse(`${period.startDate}T00:00:00Z`);
    const monthsAway = Math.round((transitionTime - nowTime) / (30.4375 * 86_400_000));
    const phase: DaeunTransitionAnalysis["transitions"][number]["phase"] = monthsAway > 18 ? "먼 미래"
      : monthsAway > 6 ? "다가오는 교운기"
        : monthsAway >= -6 ? "교운기 진행"
          : monthsAway >= -18 ? "새 대운 정착"
            : "과거 교운기";
    const previous = daeun.periods[index - 1];
    return {
      from: previous ? `${previous.stem}${previous.branch}` : null,
      to: `${period.stem}${period.branch}`,
      transitionDate: period.startDate,
      windowStart: shiftIsoDate(period.startDate, -12),
      windowEnd: shiftIsoDate(period.startDate, 12),
      age: period.startAge,
      phase,
      summary: previous
        ? `${period.startDate} 전후로 ${previous.stem}${previous.branch} 대운의 마무리와 ${period.stem}${period.branch} 대운의 새 주제가 겹칩니다.`
        : `${period.startDate} 전후로 첫 ${period.stem}${period.branch} 대운이 시작되며 성장 환경의 중심 주제가 바뀝니다.`,
      advice: "교운기에는 큰 결론을 한 번에 내리기보다 3개월 단위로 생활·관계·일의 변화를 기록하고 새 흐름이 반복되는지 확인하세요.",
    };
  });
  const active = transitions
    .filter((item) => ["다가오는 교운기", "교운기 진행", "새 대운 정착"].includes(item.phase))
    .sort((left, right) => Math.abs(Date.parse(left.transitionDate) - nowTime) - Math.abs(Date.parse(right.transitionDate) - nowTime))[0] ?? null;

  return {
    transitions,
    active,
    summary: active
      ? `현재는 ${active.to} 대운 기준 ${active.phase} 범위입니다.`
      : "현재는 대운 전환일에서 충분히 떨어진 정착 구간입니다.",
    method: `절입까지의 시간 차를 3일=1년, 1일=4개월로 환산해 첫 대운 시작일을 ${daeun.startMonths}개월 단위로 계산`,
  };
}

interface LuckFlowLike {
  periods: Array<{ idx: number; startAge: number; endAge: number; stem: string; branch: string; score: number; level: string }>;
  annual: Array<{ year: number; score: number; level: string; stem: string; branch: string }>;
}

export interface IntegratedLuckTimeline {
  targetYear: number;
  targetMonth: number;
  layers: {
    daeun: { label: string; score: number; level: string } | null;
    seun: { label: string; score: number; level: string };
  };
  months: Array<{
    month: number;
    label: string;
    stem: string;
    branch: string;
    score: number;
    level: string;
    tenGod: TenGodName;
    evidence: string[];
    summary: string;
  }>;
  selectedMonth: {
    month: number;
    topDays: Array<{
      date: string;
      day: number;
      stem: string;
      branch: string;
      score: number;
      level: string;
      evidence: string[];
      bestHours: Array<{ branch: string; range: string; score: number; tenGod: TenGodName; evidence: string[] }>;
    }>;
  };
  bestMonths: number[];
  cautionMonths: number[];
  summary: string;
  confidence: Confidence;
  method: string;
}

function luckLevel(score: number) {
  if (score >= 75) return "기회 확장";
  if (score >= 60) return "상승";
  if (score >= 45) return "균형";
  if (score >= 30) return "조정";
  return "신중";
}

function hourRange(branchIndex: number) {
  if (branchIndex === 0) return "23:00~00:59";
  const start = branchIndex * 2 - 1;
  return `${String(start).padStart(2, "0")}:00~${String(start + 1).padStart(2, "0")}:59`;
}

export function getIntegratedLuckTimeline(
  birthYear: number,
  dayStem: string,
  natalPillars: [CorePillar, CorePillar, CorePillar, OptionalPillar],
  useful: MultiUsefulGodAnalysis,
  luckFlow: LuckFlowLike,
  targetYear = new Date().getFullYear(),
  targetMonth = new Date().getMonth() + 1,
): IntegratedLuckTimeline {
  const age = targetYear - birthYear;
  const daeun = luckFlow.periods.find((period) => age >= period.startAge && age <= period.endAge) ?? null;
  const annual = luckFlow.annual.find((item) => item.year === targetYear);
  const seunPillar = getYearPillar(targetYear);
  const seunRelation = transitRelations(seunPillar, natalPillars);
  const seunScore = annual?.score ?? clamp(
    50 +
    relationScore(seunPillar.stemElement, useful.primary, useful.secondary ?? "", useful.avoid) +
    relationScore(seunPillar.branchElement, useful.primary, useful.secondary ?? "", useful.avoid) +
    seunRelation.score,
    15,
    90,
  );

  const months = Array.from({ length: 12 }, (_, offset) => {
    const month = offset + 1;
    const pillar = getMonthPillar(targetYear, month, 15, 12, 0);
    const relations = transitRelations(pillar, natalPillars);
    const elementFit = relationScore(pillar.stemElement, useful.primary, useful.secondary ?? "", useful.avoid) +
      relationScore(pillar.branchElement, useful.primary, useful.secondary ?? "", useful.avoid);
    const score = Math.round(clamp(
      45 + (daeun ? (daeun.score - 50) * 0.25 : 0) + (seunScore - 50) * 0.35 + elementFit + relations.score,
      12,
      92,
    ));
    const tenGod = getTenGod(dayStem, pillar.stem);
    const evidence = [
      daeun ? `${daeun.stem}${daeun.branch} 대운 ${daeun.level}` : "첫 대운 전 원국 중심",
      `${seunPillar.stem}${seunPillar.branch} 세운 ${luckLevel(seunScore)}`,
      `${pillar.stem}${pillar.branch} 월운 천간 ${tenGod}`,
      ...(elementFit > 0 ? [`용희신 오행 보완 +${elementFit}`] : elementFit < 0 ? [`기신 오행 중첩 ${elementFit}`] : []),
      ...relations.evidence.slice(0, 2),
    ];
    return {
      month,
      label: `${targetYear}년 ${month}월`,
      stem: pillar.stem,
      branch: pillar.branch,
      score,
      level: luckLevel(score),
      tenGod,
      evidence,
      summary: `${targetYear}년 ${month}월은 ${tenGod} 주제가 중심이며 ${luckLevel(score)} 흐름입니다. ${relations.evidence[0] ?? "원국과 큰 충돌 없이 선택과 실행의 영향이 큽니다."}`,
    };
  });

  const selected = months.find((item) => item.month === targetMonth) ?? months[0];
  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const dayCandidates = Array.from({ length: daysInMonth }, (_, offset) => {
    const day = offset + 1;
    const pillar = getDayPillar(targetYear, targetMonth, day);
    const relations = transitRelations(pillar, natalPillars);
    const elementFit = relationScore(pillar.stemElement, useful.primary, useful.secondary ?? "", useful.avoid) +
      relationScore(pillar.branchElement, useful.primary, useful.secondary ?? "", useful.avoid);
    const score = Math.round(clamp(selected.score * 0.65 + 18 + elementFit + relations.score, 8, 96));
    const bestHours = Array.from({ length: 12 }, (_, branchIndex) => {
      const representativeHour = branchIndex === 0 ? 0 : branchIndex * 2;
      const hourPillar = getHourPillar(pillar.stemIndex, representativeHour);
      const fit = relationScore(hourPillar.stemElement, useful.primary, useful.secondary ?? "", useful.avoid) +
        relationScore(hourPillar.branchElement, useful.primary, useful.secondary ?? "", useful.avoid);
      const hourRelations = transitRelations(hourPillar, natalPillars);
      return {
        branch: hourPillar.branch,
        range: hourRange(branchIndex),
        score: Math.round(clamp(score * 0.6 + 20 + fit + hourRelations.score * 0.5, 10, 98)),
        tenGod: getTenGod(dayStem, hourPillar.stem),
        evidence: [
          `${hourPillar.stem}${hourPillar.branch} 시운`,
          ...(fit > 0 ? ["용희신 보완"] : fit < 0 ? ["기신 중첩"] : []),
          ...hourRelations.evidence.slice(0, 1),
        ],
      };
    }).sort((left, right) => right.score - left.score).slice(0, 3);
    return {
      date: `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      stem: pillar.stem,
      branch: pillar.branch,
      score,
      level: luckLevel(score),
      evidence: [
        `${selected.stem}${selected.branch} 월운 ${selected.level}`,
        `${pillar.stem}${pillar.branch} 일진`,
        ...(elementFit > 0 ? [`용희신 보완 +${elementFit}`] : elementFit < 0 ? [`기신 중첩 ${elementFit}`] : []),
        ...relations.evidence.slice(0, 2),
      ],
      bestHours,
    };
  }).sort((left, right) => right.score - left.score);

  const sortedMonths = [...months].sort((left, right) => right.score - left.score);
  return {
    targetYear,
    targetMonth,
    layers: {
      daeun: daeun ? { label: `${daeun.stem}${daeun.branch}`, score: daeun.score, level: daeun.level } : null,
      seun: { label: `${seunPillar.stem}${seunPillar.branch}`, score: Math.round(seunScore), level: luckLevel(seunScore) },
    },
    months,
    selectedMonth: { month: targetMonth, topDays: dayCandidates.slice(0, 5) },
    bestMonths: sortedMonths.slice(0, 3).map((item) => item.month),
    cautionMonths: sortedMonths.slice(-3).reverse().map((item) => item.month),
    summary: `${targetYear}년은 ${daeun ? `${daeun.stem}${daeun.branch} 대운` : "원국"} 위에 ${seunPillar.stem}${seunPillar.branch} 세운이 놓입니다. ${sortedMonths[0].month}월·${sortedMonths[1].month}월의 중첩 점수가 상대적으로 높습니다.`,
    confidence: natalPillars[3] ? "high" : "medium",
    method: "대운 25%·세운 35%를 배경으로 월운·일진·시운의 용희기신 적합도와 원국 천간합충·지지합충해를 중첩",
  };
}

export interface BirthTimeEvent {
  year: number;
  type: "career" | "move" | "relationship" | "study" | "family" | "health";
}

export interface BirthTimeCandidateAnalysis {
  candidates: Array<{
    branch: string;
    representativeHour: number;
    hourPillar: string;
    tenGod: TenGodName;
    element: string;
    strengthType: string;
    primaryUsefulElement: string;
    eventScore: number | null;
    rank: number | null;
    eventEvidence: string[];
    summary: string;
  }>;
  stableFacts: string[];
  variableFacts: string[];
  eventApplied: boolean;
  summary: string;
  method: string;
}

const EVENT_GODS: Record<BirthTimeEvent["type"], TenGodName[]> = {
  career: ["정관", "편관", "정재", "편재"],
  move: ["편재", "상관", "겁재"],
  relationship: ["정재", "편재", "정관", "편관"],
  study: ["정인", "편인", "식신"],
  family: ["정인", "정재", "식신"],
  health: ["정인", "식신", "정관"],
};

export function getBirthTimeCandidateAnalysis(
  input: {
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthMinute?: number;
    gender: "male" | "female";
    calendarType: "solar" | "lunar";
  } & BirthCalculationOptions,
  events: BirthTimeEvent[] = [],
): BirthTimeCandidateAnalysis {
  const candidates = Array.from({ length: 12 }, (_, branchIndex) => {
    const representativeHour = branchIndex === 0 && input.dayBoundary === "late-zi" ? 23 : branchIndex * 2;
    const basis = resolveBirthInput({ ...input, birthHour: representativeHour, birthMinute: input.birthMinute ?? 0 });
    const yearPillar = getYearPillar(getYearForResolved(basis.adjusted));
    const monthPillar = getMonthPillar(
      basis.adjusted.year, basis.adjusted.month, basis.adjusted.day, basis.adjusted.hour, basis.adjusted.minute,
    );
    const dayPillar = getDayPillar(basis.dayPillarDate.year, basis.dayPillarDate.month, basis.dayPillarDate.day);
    const hourPillar = getHourPillar(dayPillar.stemIndex, basis.adjusted.hour);
    const hidden = getHiddenStemPowerAnalysis(dayPillar.stem, yearPillar, monthPillar, dayPillar, hourPillar);
    const elementBalance = countElements([yearPillar, monthPillar, dayPillar, hourPillar]);
    const useful = getMultiUsefulGodAnalysis(
      hidden,
      getJohuAnalysis(monthPillar, dayPillar, elementBalance),
      getYongsin(elementBalance, dayPillar.stemElement),
    );
    let eventDelta = 0;
    const eventEvidence: string[] = [];
    events.forEach((event) => {
      const transit = getYearPillar(event.year);
      const transitGod = getTenGod(dayPillar.stem, transit.stem);
      const hourGod = getTenGod(dayPillar.stem, hourPillar.stem);
      const relevant = EVENT_GODS[event.type];
      const relation = transitRelations(transit, [yearPillar, monthPillar, dayPillar, hourPillar]);
      const change = (relevant.includes(transitGod) ? 9 : 0) + (relevant.includes(hourGod) ? 5 : 0) + relation.score * 0.35;
      eventDelta += change;
      eventEvidence.push(`${event.year}년 ${event.type}: ${transitGod}·시주 ${hourGod}${relation.evidence[0] ? `·${relation.evidence[0]}` : ""}`);
    });
    return {
      branch: hourPillar.branch,
      representativeHour,
      hourPillar: `${hourPillar.stem}${hourPillar.branch}`,
      tenGod: getTenGod(dayPillar.stem, hourPillar.stem),
      element: hourPillar.stemElement,
      strengthType: hidden.dayMaster.type,
      primaryUsefulElement: useful.primary,
      eventScore: events.length === 0 ? null : Math.round(clamp(50 + eventDelta / events.length, 0, 100)),
      rank: null as number | null,
      eventEvidence,
      summary: `${hourPillar.stem}${hourPillar.branch} 시주는 ${getTenGod(dayPillar.stem, hourPillar.stem)} 방식으로 장기 목표와 후배·자녀 영역을 풀며, ${hidden.dayMaster.type} 판정과 ${useful.primary} 용신 후보를 만듭니다.`,
    };
  });

  if (events.length > 0) {
    [...candidates]
      .sort((left, right) => (right.eventScore ?? 0) - (left.eventScore ?? 0))
      .forEach((candidate, index) => {
        candidate.rank = index + 1;
      });
  }
  const strengthTypes = [...new Set(candidates.map((candidate) => candidate.strengthType))];
  const usefulElements = [...new Set(candidates.map((candidate) => candidate.primaryUsefulElement))];
  return {
    candidates,
    stableFacts: [
      "년주·월주·일주와 일간은 모든 시주 후보에서 동일",
      ...(strengthTypes.length === 1 ? [`신강약은 모든 후보에서 ${strengthTypes[0]}으로 동일`] : []),
      ...(usefulElements.length === 1 ? [`다중 용신 1순위는 모든 후보에서 ${usefulElements[0]}으로 동일`] : []),
    ],
    variableFacts: [
      "시주 간지와 시주 십신",
      "자녀·후배·말년·장기 결과물 해석",
      ...(strengthTypes.length > 1 ? [`신강약 후보: ${strengthTypes.join("·")}`] : []),
      ...(usefulElements.length > 1 ? [`용신 후보: ${usefulElements.join("·")}`] : []),
    ],
    eventApplied: events.length > 0,
    summary: events.length > 0
      ? "입력한 과거 사건과 각 시주·해당 세운의 십신 및 합충 적합도를 비교했습니다. 상위 후보는 확정값이 아니라 추가 확인 순서입니다."
      : "12개 시주 후보에서 변하지 않는 해석과 시간에 따라 달라지는 해석을 분리했습니다.",
    method: "12지지 대표 시각별 원국을 다시 계산하고 신강약·다중 용신·시주 십신을 비교; 사건 입력 시 해당 세운의 십신·합충을 보조 점수화",
  };
}

function getYearForResolved(value: { year: number; month: number; day: number; hour: number; minute: number }) {
  return getSajuYear(value.year, value.month, value.day, value.hour, value.minute);
}

export interface RelationshipTimingAnalysis {
  years: Array<{
    year: number;
    ganzi: string;
    commonScore: number;
    person1Score: number;
    person2Score: number;
    level: string;
    evidence: string[];
    summary: string;
  }>;
  bestYears: number[];
  selectedYear: number;
  bestMonths: Array<{ month: number; commonScore: number; evidence: string[] }>;
  summary: string;
  method: string;
}

interface RelationshipBirthInput extends BirthCalculationOptions {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  birthHour?: number;
  birthMinute?: number;
  gender: "male" | "female";
  calendarType?: "solar" | "lunar";
}

function buildTimingChart(input: RelationshipBirthInput) {
  const basis = resolveBirthInput({
    ...input,
    birthYear: Number(input.birthYear ?? input.year),
    birthMonth: Number(input.birthMonth ?? input.month),
    birthDay: Number(input.birthDay ?? input.day),
    birthHour: Number(input.birthHour ?? input.hour ?? -1),
    birthMinute: Number(input.birthMinute ?? input.minute ?? 0),
    calendarType: input.calendarType ?? "solar",
  });
  const yearPillar = getYearPillar(getYearForResolved(basis.adjusted));
  const monthPillar = getMonthPillar(
    basis.adjusted.year, basis.adjusted.month, basis.adjusted.day, basis.adjusted.hour, basis.adjusted.minute,
  );
  const dayPillar = getDayPillar(basis.dayPillarDate.year, basis.dayPillarDate.month, basis.dayPillarDate.day);
  const hourPillar = basis.adjusted.hour >= 0 ? getHourPillar(dayPillar.stemIndex, basis.adjusted.hour) : null;
  const pillars: [CorePillar, CorePillar, CorePillar, OptionalPillar] = [yearPillar, monthPillar, dayPillar, hourPillar];
  const balance = countElements(pillars.filter(Boolean) as CorePillar[]);
  const hidden = getHiddenStemPowerAnalysis(dayPillar.stem, yearPillar, monthPillar, dayPillar, hourPillar);
  const useful = getMultiUsefulGodAnalysis(hidden, getJohuAnalysis(monthPillar, dayPillar, balance), getYongsin(balance, dayPillar.stemElement));
  return { basis, pillars, dayPillar, useful };
}

function personTransitScore(chart: ReturnType<typeof buildTimingChart>, transit: CorePillar) {
  const fit = relationScore(transit.stemElement, chart.useful.primary, chart.useful.secondary ?? "", chart.useful.avoid) +
    relationScore(transit.branchElement, chart.useful.primary, chart.useful.secondary ?? "", chart.useful.avoid);
  const relations = transitRelations(transit, chart.pillars);
  return {
    score: Math.round(clamp(50 + fit + relations.score, 10, 92)),
    evidence: [
      ...(fit > 0 ? [`용희신 적합 +${fit}`] : fit < 0 ? [`기신 중첩 ${fit}`] : ["용희기신 중립"]),
      ...relations.evidence.slice(0, 2),
    ],
  };
}

export function getRelationshipTimingAnalysis(
  person1: RelationshipBirthInput,
  person2: RelationshipBirthInput,
  startYear = new Date().getFullYear(),
  count = 10,
): RelationshipTimingAnalysis {
  const first = buildTimingChart(person1);
  const second = buildTimingChart(person2);
  const years = Array.from({ length: Math.max(1, Math.min(count, 20)) }, (_, offset) => {
    const year = startYear + offset;
    const transit = getYearPillar(year);
    const left = personTransitScore(first, transit);
    const right = personTransitScore(second, transit);
    const disparityPenalty = Math.abs(left.score - right.score) * 0.35;
    const directHarmony = hasPair(BRANCH_COMBINES, transit.branchIndex, first.dayPillar.branchIndex) &&
      hasPair(BRANCH_COMBINES, transit.branchIndex, second.dayPillar.branchIndex) ? 6 : 0;
    const commonScore = Math.round(clamp((left.score + right.score) / 2 - disparityPenalty + directHarmony, 10, 95));
    const evidence = [
      `첫 사람 ${left.score}점: ${left.evidence.join("·")}`,
      `둘째 사람 ${right.score}점: ${right.evidence.join("·")}`,
      ...(directHarmony ? ["두 일지 모두와 조화 관계"] : []),
      ...(disparityPenalty >= 6 ? ["두 사람 체감 차이로 공통점수 조정"] : []),
    ];
    return {
      year,
      ganzi: `${transit.stem}${transit.branch}`,
      commonScore,
      person1Score: left.score,
      person2Score: right.score,
      level: luckLevel(commonScore),
      evidence,
      summary: `${year}년 ${transit.stem}${transit.branch} 세운은 두 사람 공통 ${commonScore}점입니다. ${Math.abs(left.score - right.score) <= 8 ? "서로 비슷한 속도로 움직이기 좋습니다." : "한쪽의 속도가 더 빨라 일정과 기대치를 맞춰야 합니다."}`,
    };
  });
  const sortedYears = [...years].sort((left, right) => right.commonScore - left.commonScore);
  const selectedYear = sortedYears[0].year;
  const bestMonths = Array.from({ length: 12 }, (_, offset) => {
    const month = offset + 1;
    const transit = getMonthPillar(selectedYear, month, 15, 12, 0);
    const left = personTransitScore(first, transit);
    const right = personTransitScore(second, transit);
    const commonScore = Math.round(clamp((left.score + right.score) / 2 - Math.abs(left.score - right.score) * 0.3, 10, 95));
    return {
      month,
      commonScore,
      evidence: [`첫 사람 ${left.score}점`, `둘째 사람 ${right.score}점`, ...left.evidence.slice(0, 1), ...right.evidence.slice(0, 1)],
    };
  }).sort((left, right) => right.commonScore - left.commonScore).slice(0, 4);

  return {
    years,
    bestYears: sortedYears.slice(0, 3).map((item) => item.year),
    selectedYear,
    bestMonths,
    summary: `${sortedYears[0].year}년·${sortedYears[1]?.year ?? sortedYears[0].year}년이 두 사람 모두에게 비교적 고른 공통 흐름입니다. 한 사람만 좋은 시기는 공통 추천에서 감점했습니다.`,
    method: "각 사람의 다중 용신 적합도와 원국 합충을 독립 채점한 뒤 평균에서 체감 격차를 감점; 최고 공통 연도의 12개월을 같은 방식으로 재평가",
  };
}
