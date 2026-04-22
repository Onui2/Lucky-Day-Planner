import type { UserProfile } from "@/contexts/UserContext";

const GENERATES: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<string, string> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
const STEM_ELEMENT_MAP: Record<string, string> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토",
  기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};
const BRANCH_ELEMENT_MAP: Record<string, string> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};
const ELEMENT_SEASON_BRANCHES: Record<string, string[]> = {
  목: ["인", "묘", "진"],
  화: ["사", "오", "미"],
  토: ["진", "술", "축", "미"],
  금: ["신", "유", "술"],
  수: ["해", "자", "축"],
};

const STEM_HAPS = [
  { pair: ["갑", "기"] as const, name: "갑기합(甲己合)", element: "토" },
  { pair: ["을", "경"] as const, name: "을경합(乙庚合)", element: "금" },
  { pair: ["병", "신"] as const, name: "병신합(丙辛合)", element: "수" },
  { pair: ["정", "임"] as const, name: "정임합(丁壬合)", element: "목" },
  { pair: ["무", "계"] as const, name: "무계합(戊癸合)", element: "화" },
] as const;

const STEM_CHUNGS = [
  { pair: ["갑", "경"] as const, name: "갑경충(甲庚沖)" },
  { pair: ["을", "신"] as const, name: "을신충(乙辛沖)" },
  { pair: ["병", "임"] as const, name: "병임충(丙壬沖)" },
  { pair: ["정", "계"] as const, name: "정계충(丁癸沖)" },
  { pair: ["무", "갑"] as const, name: "무갑충(戊甲沖)" },
] as const;

const BRANCH_YUKHAPS = [
  { pair: ["자", "축"] as const, name: "자축합(子丑合)", element: "토" },
  { pair: ["인", "해"] as const, name: "인해합(寅亥合)", element: "목" },
  { pair: ["묘", "술"] as const, name: "묘술합(卯戌合)", element: "화" },
  { pair: ["진", "유"] as const, name: "진유합(辰酉合)", element: "금" },
  { pair: ["사", "신"] as const, name: "사신합(巳申合)", element: "수" },
  { pair: ["오", "미"] as const, name: "오미합(午未合)", element: "토" },
] as const;

const BRANCH_BANHAPS = [
  { pair: ["신", "자"] as const, name: "신자반합(申子半合)", group: "신자진(申子辰) 수국", element: "수" },
  { pair: ["자", "진"] as const, name: "자진반합(子辰半合)", group: "신자진(申子辰) 수국", element: "수" },
  { pair: ["신", "진"] as const, name: "신진반합(申辰同氣)", group: "신자진(申子辰) 수국 성분", element: "수" },
  { pair: ["인", "오"] as const, name: "인오반합(寅午半合)", group: "인오술(寅午戌) 화국", element: "화" },
  { pair: ["오", "술"] as const, name: "오술반합(午戌半合)", group: "인오술(寅午戌) 화국", element: "화" },
  { pair: ["인", "술"] as const, name: "인술반합(寅戌同氣)", group: "인오술(寅午戌) 화국 성분", element: "화" },
  { pair: ["사", "유"] as const, name: "사유반합(巳酉半合)", group: "사유축(巳酉丑) 금국", element: "금" },
  { pair: ["유", "축"] as const, name: "유축반합(酉丑半合)", group: "사유축(巳酉丑) 금국", element: "금" },
  { pair: ["사", "축"] as const, name: "사축반합(巳丑同氣)", group: "사유축(巳酉丑) 금국 성분", element: "금" },
  { pair: ["해", "묘"] as const, name: "해묘반합(亥卯半合)", group: "해묘미(亥卯未) 목국", element: "목" },
  { pair: ["묘", "미"] as const, name: "묘미반합(卯未半合)", group: "해묘미(亥卯未) 목국", element: "목" },
  { pair: ["해", "미"] as const, name: "해미반합(亥未同氣)", group: "해묘미(亥卯未) 목국 성분", element: "목" },
] as const;

const BRANCH_FULL_SAMHAPS = [
  { trio: ["신", "자", "진"] as const, name: "신자진(申子辰) 수국", element: "수" },
  { trio: ["인", "오", "술"] as const, name: "인오술(寅午戌) 화국", element: "화" },
  { trio: ["사", "유", "축"] as const, name: "사유축(巳酉丑) 금국", element: "금" },
  { trio: ["해", "묘", "미"] as const, name: "해묘미(亥卯未) 목국", element: "목" },
] as const;

const BRANCH_DIRECTIONALS = [
  { trio: ["인", "묘", "진"] as const, name: "인묘진(寅卯辰) 동방합", element: "목" },
  { trio: ["사", "오", "미"] as const, name: "사오미(巳午未) 남방합", element: "화" },
  { trio: ["신", "유", "술"] as const, name: "신유술(申酉戌) 서방합", element: "금" },
  { trio: ["해", "자", "축"] as const, name: "해자축(亥子丑) 북방합", element: "수" },
] as const;

const BRANCH_CHUNGS = [
  { pair: ["자", "오"] as const, name: "자오충(子午沖)" },
  { pair: ["축", "미"] as const, name: "축미충(丑未沖)" },
  { pair: ["인", "신"] as const, name: "인신충(寅申沖)" },
  { pair: ["묘", "유"] as const, name: "묘유충(卯酉沖)" },
  { pair: ["진", "술"] as const, name: "진술충(辰戌沖)" },
  { pair: ["사", "해"] as const, name: "사해충(巳亥沖)" },
] as const;

const BRANCH_HAES = [
  { pair: ["자", "미"] as const, name: "자미해(子未害)" },
  { pair: ["축", "오"] as const, name: "축오해(丑午害)" },
  { pair: ["인", "사"] as const, name: "인사해(寅巳害)" },
  { pair: ["묘", "진"] as const, name: "묘진해(卯辰害)" },
  { pair: ["신", "해"] as const, name: "신해해(申亥害)" },
  { pair: ["유", "술"] as const, name: "유술해(酉戌害)" },
] as const;

const BRANCH_HYEONGS = [
  { pair: ["인", "사"] as const, name: "인사형(寅巳刑)" },
  { pair: ["인", "신"] as const, name: "인신형(寅申刑)" },
  { pair: ["사", "신"] as const, name: "사신형(巳申刑)" },
  { pair: ["축", "술"] as const, name: "축술형(丑戌刑)" },
  { pair: ["축", "미"] as const, name: "축미형(丑未刑)" },
  { pair: ["술", "미"] as const, name: "술미형(戌未刑)" },
  { pair: ["자", "묘"] as const, name: "자묘형(子卯刑)" },
] as const;

const BRANCH_AMHAPS = [
  { pair: ["자", "술"] as const, name: "자술암합(子戌暗合)" },
  { pair: ["축", "인"] as const, name: "축인암합(丑寅暗合)" },
  { pair: ["묘", "신"] as const, name: "묘신암합(卯申暗合)" },
  { pair: ["오", "해"] as const, name: "오해암합(午亥暗合)" },
  { pair: ["인", "미"] as const, name: "인미암합(寅未暗合)" },
] as const;

const BRANCH_WONJINS = [
  { pair: ["자", "미"] as const, name: "자미원진(子未怨嗔)" },
  { pair: ["축", "오"] as const, name: "축오원진(丑午怨嗔)" },
  { pair: ["인", "유"] as const, name: "인유원진(寅酉怨嗔)" },
  { pair: ["묘", "신"] as const, name: "묘신원진(卯申怨嗔)" },
  { pair: ["진", "해"] as const, name: "진해원진(辰亥怨嗔)" },
  { pair: ["사", "술"] as const, name: "사술원진(巳戌怨嗔)" },
] as const;

const BRANCH_GWIMUNS = [
  { pair: ["자", "유"] as const, name: "자유귀문(子酉鬼門)" },
  { pair: ["축", "오"] as const, name: "축오귀문(丑午鬼門)" },
  { pair: ["인", "미"] as const, name: "인미귀문(寅未鬼門)" },
  { pair: ["묘", "신"] as const, name: "묘신귀문(卯申鬼門)" },
  { pair: ["진", "해"] as const, name: "진해귀문(辰亥鬼門)" },
  { pair: ["사", "술"] as const, name: "사술귀문(巳戌鬼門)" },
] as const;

export type RelationType =
  | "천간합"
  | "천간충"
  | "지지육합"
  | "지지반합"
  | "지지삼합"
  | "지지방합"
  | "지지충"
  | "지지해"
  | "지지형"
  | "지지암합"
  | "지지원진"
  | "지지귀문"
  | "인성"
  | "비겁"
  | "식상"
  | "재성"
  | "관살";

export interface ElementRelation {
  type: RelationType;
  label: string;
  fortune: string;
  why: string;
  colorClass: string;
  borderClass: string;
  emoji: string;
  score: number;
  positive: boolean;
}

interface RelationRef {
  label: string;
  value: string;
  weight: number;
}

export interface RelationContext {
  stemRefs: RelationRef[];
  branchRefs: RelationRef[];
  monthBranch?: string | null;
}

type SpecialRelation = ElementRelation & { priority: number };

function samePair(left: string, right: string, pair: readonly [string, string]) {
  return (left === pair[0] && right === pair[1]) || (left === pair[1] && right === pair[0]);
}

function clampScore(score: number) {
  return Math.max(1, Math.min(10, score));
}

function hasValue(values: readonly string[], target: string) {
  return values.some((value) => value === target);
}

function makeRef(label: string, value: string | null | undefined, weight: number): RelationRef | null {
  return value ? { label, value, weight } : null;
}

function compactRefs(refs: Array<RelationRef | null>) {
  return refs.filter((ref): ref is RelationRef => Boolean(ref));
}

export function getProfileRelationContext(profile?: UserProfile | null): RelationContext {
  return {
    stemRefs: compactRefs([
      makeRef("년간", profile?.yearStem, 1.0),
      makeRef("월간", profile?.monthStem, 1.2),
      makeRef("일간", profile?.dayMasterStem, 1.6),
      makeRef("시간", profile?.hourStem, 1.0),
    ]),
    branchRefs: compactRefs([
      makeRef("년지", profile?.yearBranch, 1.0),
      makeRef("월지", profile?.monthBranch, 1.4),
      makeRef("일지", profile?.dayMasterBranch, 1.6),
      makeRef("시지", profile?.hourBranch, 1.0),
    ]),
    monthBranch: profile?.monthBranch ?? null,
  };
}

function getStemRefs(myStem?: string | null, context?: RelationContext) {
  if (context?.stemRefs?.length) return context.stemRefs;
  return compactRefs([makeRef("일간", myStem, 1.6)]);
}

function getBranchRefs(myBranch?: string | null, context?: RelationContext) {
  if (context?.branchRefs?.length) return context.branchRefs;
  return compactRefs([makeRef("일지", myBranch, 1.6)]);
}

function formatLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "핵심축";
  if (labels.length === 2) return `${labels[0]}·${labels[1]}`;
  return `${labels.slice(0, -1).join("·")}·${labels[labels.length - 1]}`;
}

function scoreFromWeight(base: number, weight: number) {
  return clampScore(base + Math.max(0, Math.round(weight - 1)));
}

function getSeasonSupport(element: string, monthBranch?: string | null) {
  if (!monthBranch) return 0;
  return ELEMENT_SEASON_BRANCHES[element]?.includes(monthBranch) ? 2 : 0;
}

function getElementSupport(
  element: string,
  stemRefs: RelationRef[],
  branchRefs: RelationRef[],
  dayElem: string,
) {
  let score = dayElem === element ? 1 : 0;

  for (const ref of stemRefs) {
    if (STEM_ELEMENT_MAP[ref.value] === element) score += ref.weight;
  }
  for (const ref of branchRefs) {
    if (BRANCH_ELEMENT_MAP[ref.value] === element) score += ref.weight;
  }

  return score;
}

function getResistance(
  dayStem: string | null | undefined,
  dayBranch: string | null | undefined,
  stemRefs: RelationRef[],
  branchRefs: RelationRef[],
) {
  let score = 0;

  if (dayStem) {
    for (const ref of stemRefs) {
      if (STEM_CHUNGS.some((item) => samePair(ref.value, dayStem, item.pair))) {
        score += ref.weight;
      }
    }
  }

  if (dayBranch) {
    for (const ref of branchRefs) {
      if (BRANCH_CHUNGS.some((item) => samePair(ref.value, dayBranch, item.pair))) {
        score += ref.weight;
      }
    }
  }

  return score;
}

function getTransformCondition(
  resultElement: string | undefined,
  dayElem: string,
  dayStem: string | null | undefined,
  dayBranch: string | null | undefined,
  stemRefs: RelationRef[],
  branchRefs: RelationRef[],
  monthBranch?: string | null,
  bonus = 0,
) {
  if (!resultElement) {
    return { text: "", scoreAdj: 0 };
  }

  const support =
    getElementSupport(resultElement, stemRefs, branchRefs, dayElem)
    + getSeasonSupport(resultElement, monthBranch)
    + bonus;
  const resistance = getResistance(dayStem, dayBranch, stemRefs, branchRefs);

  if (support >= 5 && resistance < 1.5) {
    return {
      text: ` ${resultElement} 기운과 계절 뒷받침이 붙어 성립이 강한 편입니다.`,
      scoreAdj: 1,
    };
  }

  if (support >= 2) {
    return {
      text: ` 합 자체는 맞지만 ${resultElement} 기운 뒷받침은 중간 정도라 조건부 성립으로 보는 편이 안전합니다.`,
      scoreAdj: 0,
    };
  }

  return {
    text: ` 합은 보이지만 ${resultElement} 기운 뒷받침이 약해 실제로는 조율·완화 작용 위주로 보는 편이 낫습니다.`,
    scoreAdj: -1,
  };
}

function getCoreHitNote(labels: string[], positive: boolean) {
  if (labels.length >= 2) {
    return positive
      ? " 원국 두 자리 이상이 함께 물려 작용 폭이 큽니다."
      : " 원국 두 자리 이상을 동시에 건드려 체감 강도가 커집니다.";
  }

  if (labels.includes("일간") || labels.includes("일지")) {
    return positive
      ? " 내 핵심축에 직접 닿아 체감이 빠릅니다."
      : " 내 핵심축에 직접 닿아 예민하게 체감될 수 있습니다.";
  }

  if (labels.includes("월간") || labels.includes("월지")) {
    return positive
      ? " 월주까지 걸려 현실 일정과 환경 쪽 반응이 빠를 수 있습니다."
      : " 월주까지 걸려 현실 일정과 환경 쪽 파동이 먼저 느껴질 수 있습니다.";
  }

  return "";
}

function createSpecialRelation(params: {
  type: RelationType;
  name: string;
  matchLabels: string[];
  weight: number;
  priority: number;
  positive: boolean;
  baseScore: number;
  colorClass: string;
  borderClass: string;
  emoji: string;
  fortuneLead: string;
  whyLead: string;
  dayElem: string;
  dayStem?: string | null;
  dayBranch?: string | null;
  stemRefs: RelationRef[];
  branchRefs: RelationRef[];
  monthBranch?: string | null;
  resultElement?: string;
  conditionBonus?: number;
}): SpecialRelation {
  const matchText = `원국 ${formatLabels(params.matchLabels)}와`;
  const focusText = getCoreHitNote(params.matchLabels, params.positive);
  const transform = params.positive
    ? getTransformCondition(
        params.resultElement,
        params.dayElem,
        params.dayStem,
        params.dayBranch,
        params.stemRefs,
        params.branchRefs,
        params.monthBranch,
        params.conditionBonus ?? 0,
      )
    : { text: "", scoreAdj: 0 };

  return {
    type: params.type,
    label: `${params.type} (${params.name})`,
    fortune: `${matchText} ${params.fortuneLead}${focusText}${transform.text}`,
    why: `${params.whyLead}${focusText}${transform.text}`,
    colorClass: params.colorClass,
    borderClass: params.borderClass,
    emoji: params.emoji,
    score: scoreFromWeight(params.baseScore + transform.scoreAdj, params.weight),
    positive: params.positive,
    priority: params.priority,
  };
}

function getBaseElementRelation(myElem: string, dayElem: string): ElementRelation {
  if (!myElem || !dayElem) {
    return {
      type: "비겁",
      label: "비겁",
      fortune: "정보가 부족해 기본 기운으로만 봅니다.",
      why: "내 일간 오행 또는 오늘 오행 정보가 부족하면 세부 합충보다 기본 기운만 볼 수 있습니다.",
      colorClass: "text-muted-foreground",
      borderClass: "border-muted",
      emoji: "○",
      score: 5,
      positive: false,
    };
  }

  if (GENERATES[dayElem] === myElem) {
    return {
      type: "인성",
      label: "인성 (생조)",
      fortune: "나를 돕는 기운의 날. 학습·계획·새 시작에 유리합니다.",
      why: "오늘의 오행이 내 일간을 생(生)하는 구조라 보호·지원·회복의 흐름이 강합니다.",
      colorClass: "text-emerald-400",
      borderClass: "border-emerald-500/60",
      emoji: "★",
      score: 9,
      positive: true,
    };
  }

  if (dayElem === myElem) {
    return {
      type: "비겁",
      label: "비겁 (비화)",
      fortune: "같은 기운끼리 경쟁하는 날. 독립적으로 움직이세요.",
      why: "같은 오행이 겹치면 힘은 강해지지만 경쟁·분산도 함께 커집니다.",
      colorClass: "text-yellow-400",
      borderClass: "border-yellow-500/40",
      emoji: "◈",
      score: 7,
      positive: false,
    };
  }

  if (GENERATES[myElem] === dayElem) {
    return {
      type: "식상",
      label: "식상 (설기)",
      fortune: "에너지가 밖으로 흐르는 날. 창작·표현·소통에 집중하세요.",
      why: "내 일간이 오늘의 오행을 생(生)하므로 내 기운이 밖으로 빠져나가 결과물로 바뀌기 쉽습니다.",
      colorClass: "text-blue-400",
      borderClass: "border-blue-500/40",
      emoji: "◎",
      score: 6,
      positive: true,
    };
  }

  if (CONTROLS[myElem] === dayElem) {
    return {
      type: "재성",
      label: "재성 (극일)",
      fortune: "내가 통제하는 기운의 날. 재물·성과를 노릴 수 있습니다.",
      why: "내 일간이 오늘의 오행을 극(剋)하는 구조라 성과·재물·실전 감각이 살아납니다.",
      colorClass: "text-amber-400",
      borderClass: "border-amber-500/40",
      emoji: "◆",
      score: 5,
      positive: true,
    };
  }

  if (CONTROLS[dayElem] === myElem) {
    return {
      type: "관살",
      label: "관살 (극아)",
      fortune: "압박과 도전의 날. 신중하게 행동하고 과욕을 피하세요.",
      why: "오늘의 오행이 내 일간을 극(剋)하는 구조라 외부 압박·경쟁·규칙의 힘이 강해집니다.",
      colorClass: "text-rose-400",
      borderClass: "border-rose-500/60",
      emoji: "▲",
      score: 3,
      positive: false,
    };
  }

  return {
    type: "비겁",
    label: "비겁",
    fortune: "보통의 날입니다.",
    why: "특별한 상생·상극 포인트가 약한 날이라 무난하게 흘러갑니다.",
    colorClass: "text-muted-foreground",
    borderClass: "border-muted",
    emoji: "○",
    score: 5,
    positive: false,
  };
}

export function getElementRelation(
  myElem: string,
  dayElem: string,
  myStem?: string | null,
  dayStem?: string | null,
  myBranch?: string | null,
  dayBranch?: string | null,
  context?: RelationContext,
): ElementRelation {
  const base = getBaseElementRelation(myElem, dayElem);
  const specials: SpecialRelation[] = [];
  const stemRefs = getStemRefs(myStem, context);
  const branchRefs = getBranchRefs(myBranch, context);
  const monthBranch = context?.monthBranch ?? null;

  if (dayStem) {
    for (const ref of stemRefs) {
      for (const item of STEM_HAPS) {
        if (!samePair(ref.value, dayStem, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "천간합",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 100,
          positive: true,
          baseScore: 8,
          colorClass: "text-emerald-300",
          borderClass: "border-emerald-500/60",
          emoji: "🤝",
          fortuneLead: `오늘 천간이 ${item.name}으로 묶여 상극보다 조율·협력·전환 쪽이 먼저 움직입니다.`,
          whyLead: `${item.name}은 서로 다른 천간이 맞물려 새 흐름을 만드는 관계입니다.`,
          resultElement: item.element,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of STEM_CHUNGS) {
        if (!samePair(ref.value, dayStem, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "천간충",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 95,
          positive: false,
          baseScore: 3,
          colorClass: "text-rose-300",
          borderClass: "border-rose-500/60",
          emoji: "⚔",
          fortuneLead: `오늘 천간이 ${item.name}으로 부딪혀 말·결정·관계에서 정면충돌 성향이 강해집니다.`,
          whyLead: `${item.name}은 표면 의사결정과 행동 방식이 서로 어긋나는 구조입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }
    }
  }

  if (dayBranch) {
    for (const item of BRANCH_FULL_SAMHAPS) {
      if (!hasValue(item.trio, dayBranch)) continue;
      const others = item.trio.filter((branch) => branch !== dayBranch);
      const matchedRefs = others
        .map((branch) => branchRefs.find((ref) => ref.value === branch))
        .filter((ref): ref is RelationRef => Boolean(ref));
      if (matchedRefs.length !== others.length) continue;
      specials.push(createSpecialRelation({
        type: "지지삼합",
        name: item.name,
        matchLabels: matchedRefs.map((ref) => ref.label),
        weight: matchedRefs.reduce((sum, ref) => sum + ref.weight, 0),
        priority: 92,
        positive: true,
        baseScore: 9,
        colorClass: "text-teal-300",
        borderClass: "border-teal-500/55",
        emoji: "🌀",
        fortuneLead: `오늘 지지가 ${item.name}을 완성해 ${item.element} 국(局)이 크게 살아납니다.`,
        whyLead: `${item.name}은 세 지지가 한 국으로 모여 오행 흐름을 크게 증폭하는 구조입니다.`,
        resultElement: item.element,
        conditionBonus: monthBranch && hasValue(item.trio, monthBranch) ? 1 : 0,
        dayElem,
        dayStem,
        dayBranch,
        stemRefs,
        branchRefs,
        monthBranch,
      }));
    }

    for (const item of BRANCH_DIRECTIONALS) {
      if (!hasValue(item.trio, dayBranch)) continue;
      const others = item.trio.filter((branch) => branch !== dayBranch);
      const matchedRefs = others
        .map((branch) => branchRefs.find((ref) => ref.value === branch))
        .filter((ref): ref is RelationRef => Boolean(ref));
      if (matchedRefs.length !== others.length) continue;
      specials.push(createSpecialRelation({
        type: "지지방합",
        name: item.name,
        matchLabels: matchedRefs.map((ref) => ref.label),
        weight: matchedRefs.reduce((sum, ref) => sum + ref.weight, 0),
        priority: 90,
        positive: true,
        baseScore: 8,
        colorClass: "text-sky-300",
        borderClass: "border-sky-500/55",
        emoji: "🧭",
        fortuneLead: `오늘 지지가 ${item.name}을 이뤄 계절성 기운이 뚜렷하게 모입니다.`,
        whyLead: `${item.name}은 같은 방위·계절의 기운이 집결해 환경 전체 분위기를 바꾸는 구조입니다.`,
        resultElement: item.element,
        conditionBonus: monthBranch && hasValue(item.trio, monthBranch) ? 1 : 0,
        dayElem,
        dayStem,
        dayBranch,
        stemRefs,
        branchRefs,
        monthBranch,
      }));
    }

    for (const ref of branchRefs) {
      for (const item of BRANCH_YUKHAPS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지육합",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 82,
          positive: true,
          baseScore: 8,
          colorClass: "text-emerald-300",
          borderClass: "border-emerald-500/50",
          emoji: "✦",
          fortuneLead: `오늘 지지가 ${item.name}으로 묶여 사람·일·환경이 비교적 자연스럽게 맞물립니다.`,
          whyLead: `${item.name}은 현실 영역에서 관계와 상황을 부드럽게 엮는 육합입니다.`,
          resultElement: item.element,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_BANHAPS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지반합",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 76,
          positive: true,
          baseScore: 7,
          colorClass: "text-cyan-300",
          borderClass: "border-cyan-500/45",
          emoji: "△",
          fortuneLead: `오늘 지지가 ${item.group} 쪽으로 기운을 끌어당겨 부분 합 작용을 만듭니다.`,
          whyLead: `${item.name}은 완전 합국 전 단계지만 방향성이 뚜렷한 반합 성분입니다.`,
          resultElement: item.element,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_CHUNGS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지충",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 86,
          positive: false,
          baseScore: 3,
          colorClass: "text-rose-300",
          borderClass: "border-rose-500/60",
          emoji: "↔",
          fortuneLead: `오늘 지지가 ${item.name}으로 맞부딪혀 일정·관계·감정선이 크게 흔들리기 쉽습니다.`,
          whyLead: `${item.name}은 현실 생활에서 이동·변동·충돌을 일으키기 쉬운 관계입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_HYEONGS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지형",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 74,
          positive: false,
          baseScore: 4,
          colorClass: "text-orange-300",
          borderClass: "border-orange-500/50",
          emoji: "⚠",
          fortuneLead: `오늘 지지가 ${item.name}에 걸려 예민함·마찰·꼬임이 은근하게 쌓일 수 있습니다.`,
          whyLead: `${item.name}은 겉보기 충돌보다 피로와 신경전을 만드는 형(刑) 관계입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_HAES) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지해",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 64,
          positive: false,
          baseScore: 4,
          colorClass: "text-orange-300",
          borderClass: "border-orange-500/45",
          emoji: "☁",
          fortuneLead: `오늘 지지가 ${item.name}에 닿아 오해·섭섭함·잔손실이 생기기 쉬운 흐름입니다.`,
          whyLead: `${item.name}은 크게 부딪히진 않아도 뒤에서 기운을 깎는 해(害) 관계입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_AMHAPS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지암합",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 72,
          positive: true,
          baseScore: 6,
          colorClass: "text-cyan-200",
          borderClass: "border-cyan-400/40",
          emoji: "⋯",
          fortuneLead: `오늘 지지가 ${item.name}으로 겉보다 속에서 조율·은밀한 연결을 만들 수 있습니다.`,
          whyLead: `${item.name}은 드러난 합보다 숨은 이해관계·내면 교감 쪽으로 작용하는 암합입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_WONJINS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지원진",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 80,
          positive: false,
          baseScore: 3,
          colorClass: "text-amber-300",
          borderClass: "border-amber-500/50",
          emoji: "〰",
          fortuneLead: `오늘 지지가 ${item.name}에 걸려 감정적 서운함·까칠함·묘한 불편이 올라오기 쉽습니다.`,
          whyLead: `${item.name}은 겉으론 작아 보여도 감정선에 앙금을 남기기 쉬운 원진 관계입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }

      for (const item of BRANCH_GWIMUNS) {
        if (!samePair(ref.value, dayBranch, item.pair)) continue;
        specials.push(createSpecialRelation({
          type: "지지귀문",
          name: item.name,
          matchLabels: [ref.label],
          weight: ref.weight,
          priority: 68,
          positive: false,
          baseScore: 4,
          colorClass: "text-slate-200",
          borderClass: "border-slate-400/40",
          emoji: "◐",
          fortuneLead: `오늘 지지가 ${item.name}에 닿아 직감·예민함·몰입이 강해질 수 있습니다.`,
          whyLead: `${item.name}은 감수성과 집착, 심리적 예민함을 키우기 쉬운 귀문 성향입니다.`,
          dayElem,
          dayStem,
          dayBranch,
          stemRefs,
          branchRefs,
          monthBranch,
        }));
      }
    }
  }

  if (specials.length === 0) {
    return base;
  }

  specials.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return right.score - left.score;
  });

  const [primary, ...rest] = specials;
  const extras = rest.slice(0, 4);
  let score = Math.round((primary.score * 2 + base.score) / 3);

  for (const extra of extras) {
    score += extra.positive ? 1 : -1;
  }

  const extrasText =
    extras.length > 0
      ? ` 추가로 ${extras.map((item) => item.label).join(", ")} 흐름도 함께 보입니다.`
      : "";
  const baseText =
    primary.type !== base.type
      ? ` 기본 오행상으로는 ${base.label} 기운도 함께 깔려 있습니다.`
      : "";

  return {
    ...primary,
    fortune: `${primary.fortune}${baseText}${extrasText}`,
    why: `${primary.why}${baseText}${extrasText}`,
    score: clampScore(score),
  };
}
