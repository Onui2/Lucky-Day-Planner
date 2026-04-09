// 오늘의 띠별 운세 (Zodiac Fortune by Year Animal)
import { getDayPillar, EARTHLY_BRANCHES, ZODIAC_KR } from './saju-calculator.js';

// 지지 합충 관계
const HARMONIES: Record<string, string[]> = {
  자:['축','신','진'], 축:['자','사','유'], 인:['해','오','술'],
  묘:['술','해','미'], 진:['유','자','신'], 사:['신','축','유'],
  오:['미','인','술'], 미:['오','해','묘'], 신:['사','자','진'],
  유:['진','사','축'], 술:['묘','오','인'], 해:['인','묘','미'],
};
const CONFLICTS: Record<string, string[]> = {
  자:['오','묘','유'], 축:['미','진','술'], 인:['신','사','해'],
  묘:['유','자','오'], 진:['술','축','미'], 사:['해','인','신'],
  오:['자','묘','유'], 미:['축','진','술'], 신:['인','사','해'],
  유:['묘','자','오'], 술:['진','축','미'], 해:['사','인','신'],
};

function getDayRelation(dayBranch: string, zodiacBranch: string): 'harmony' | 'conflict' | 'neutral' {
  if (HARMONIES[dayBranch]?.includes(zodiacBranch)) return 'harmony';
  if (CONFLICTS[dayBranch]?.includes(zodiacBranch)) return 'conflict';
  return 'neutral';
}

// ─── 종합운 텍스트 (각 10개) ───────────────────────────────
const HARMONY_TEXTS: string[] = [
  '오늘은 하는 일마다 잘 풀리는 하루입니다. 귀인의 도움이 있고 기분 좋은 소식이 들려옵니다.',
  '운기가 상승하는 날입니다. 중요한 일을 추진하기 좋으며, 인간관계에서 좋은 결과를 얻습니다.',
  '재물과 인연이 함께 들어오는 길한 날입니다. 적극적으로 행동하면 더욱 큰 결실을 맺습니다.',
  '밝은 기운이 감도는 날입니다. 평소 망설이던 일에 용기를 내보세요. 주저한 만큼 기회가 지나갑니다.',
  '합(合)의 기운이 강한 날로, 협력과 동업이 빛나는 하루입니다. 혼자보다 함께하면 더 큰 성과가 납니다.',
  '행운의 기운이 주변을 감싸는 날입니다. 새로운 만남이나 기회를 놓치지 말고 적극적으로 잡으세요.',
  '주변 사람들과의 관계에서 특별한 행운이 찾아오는 날입니다. 진심 어린 소통이 큰 성과로 이어집니다.',
  '오늘 내리는 결정은 오래도록 좋은 방향으로 작용합니다. 중요한 사안을 처리하기에 최적인 날입니다.',
  '막혔던 것이 뚫리고 지체됐던 일이 순조롭게 풀리는 날입니다. 기다려온 결과가 드디어 빛을 발합니다.',
  '에너지가 넘치고 자신감이 충만한 날입니다. 큰 무대에 당당히 나서면 원하는 결과를 얻을 수 있습니다.',
];
const CONFLICT_TEXTS: string[] = [
  '오늘은 충(沖)의 기운으로 예상치 못한 변수가 생길 수 있습니다. 모든 결정에 신중함을 더하세요.',
  '마음이 분산되기 쉬운 날입니다. 중요한 결정은 내일로 미루고, 오늘은 준비에 집중하세요.',
  '다툼이나 오해가 생기기 쉬운 날입니다. 말을 아끼고 상대방의 의견을 먼저 경청하는 자세가 필요합니다.',
  '에너지 소모가 큰 날입니다. 무리하지 않고 충분한 휴식을 취하면 내일 더 강하게 도약할 수 있습니다.',
  '흐름이 역방향으로 향하는 날입니다. 서두르지 말고 기다리는 용기가 오히려 최선의 전략입니다.',
  '예상치 못한 상황이 발생할 수 있는 날입니다. 유연하게 대처하되, 핵심을 놓치지 않도록 집중하세요.',
  '감정적인 기복이 생기기 쉬운 날입니다. 중요한 소통보다는 혼자 정리하는 시간을 갖는 것이 낫습니다.',
  '계획대로 되지 않는 일이 생길 수 있습니다. 결과에 집착하기보다 과정에 충실하면 손해가 줄어듭니다.',
  '오늘은 새로운 도전보다 현재를 지키는 것이 더 현명합니다. 무리한 확장보다 안정을 우선시하세요.',
  '작은 실수가 커질 수 있는 날입니다. 평소보다 더 꼼꼼하게 확인하고 이중으로 점검하는 습관을 가지세요.',
];
const NEUTRAL_TEXTS: string[] = [
  '큰 기복 없이 평온하게 흐르는 하루입니다. 꾸준한 노력이 빛을 발하는 날입니다.',
  '차분한 기운의 날입니다. 내면을 정리하고 미래를 계획하기에 좋은 환경이 조성됩니다.',
  '안정적인 흐름의 날입니다. 기본에 충실하면 만족스러운 결과를 얻을 수 있습니다.',
  '평화로운 에너지가 흐르는 하루입니다. 주변 사람들과의 소통이 원활하고 도움이 됩니다.',
  '조용하지만 의미 있는 하루입니다. 소소한 성취를 인식하고 감사하는 마음을 갖는 것이 중요합니다.',
  '일상적인 흐름 속에서 귀한 인연이 숨어 있을 수 있습니다. 주변을 세심하게 살펴보세요.',
  '중립적인 기운의 날이지만, 태도에 따라 결과가 크게 달라질 수 있습니다. 긍정적 자세를 유지하세요.',
  '무리하지 않고 계획대로 움직이는 것이 최선인 날입니다. 욕심을 줄이면 오히려 더 얻습니다.',
  '흔들리지 않는 마음가짐이 오늘의 강점입니다. 외부 변수에 휘둘리지 않고 중심을 지키세요.',
  '새로운 자극보다 기존의 것을 성숙시키는 날입니다. 현재 진행 중인 일에 더 집중하면 좋습니다.',
];

// ─── 금전운 (각 6개) ─────────────────────────────────────
const MONEY_BY_REL: Record<string, string[]> = {
  harmony: [
    '재물이 들어오는 흐름입니다. 투자나 사업에 유리한 날입니다.',
    '예상치 못한 수입이 생기는 날입니다. 열린 마음으로 기회를 맞이하세요.',
    '지출보다 수입이 많은 날입니다. 장기 자산에 관심을 가져보세요.',
    '재물 운이 활발합니다. 적극적인 협상이나 영업에서 좋은 결과를 얻습니다.',
    '이전에 투자하거나 수고한 것들이 보상으로 돌아오는 날입니다.',
    '소소한 임시 수입부터 큰 계약까지 다양한 형태의 재물 기회가 찾아옵니다.',
  ],
  conflict: [
    '지출이 늘어날 수 있습니다. 불필요한 소비는 자제하는 것이 좋습니다.',
    '재물 분쟁에 주의하세요. 새로운 계약이나 투자는 오늘 결정하지 마세요.',
    '충동 구매나 감정적인 소비가 나중에 후회로 이어질 수 있는 날입니다.',
    '돈 관련 약속이나 보증은 피하고, 현금 흐름을 보수적으로 관리하세요.',
    '예상치 못한 지출이 발생할 수 있습니다. 비상 자금을 미리 확인해 두세요.',
    '대금 지연이나 미수금 문제가 생길 수 있는 날입니다. 거래에 앞서 꼼꼼히 확인하세요.',
  ],
  neutral: [
    '금전 운이 평온합니다. 계획적인 소비와 저축이 안정을 만들어 줍니다.',
    '저축과 안정적인 관리에 집중하면 좋은 날입니다. 작은 절약이 큰 자산이 됩니다.',
    '평범하지만 안정적인 재물 흐름의 날입니다. 기본 재무 계획을 점검해 보세요.',
    '새로운 재물 기회보다 현재 자산을 잘 관리하는 것이 더 중요한 날입니다.',
    '큰 이익도 큰 손실도 없는 날입니다. 꾸준한 노력이 장기적으로 빛납니다.',
    '지출 내역을 정리하고 불필요한 고정비를 줄이면 실질 자산이 늘어납니다.',
  ],
};

// ─── 애정운 (각 6개) ─────────────────────────────────────
const LOVE_BY_REL: Record<string, string[]> = {
  harmony: [
    '인연이 찾아오는 날입니다. 먼저 연락하거나 다가가는 용기를 내어보세요.',
    '관계가 깊어지는 기운입니다. 솔직한 마음 표현이 상대방의 마음을 열어줍니다.',
    '사랑하는 사람과 특별한 시간을 보내기 좋은 날입니다. 작은 이벤트가 큰 감동을 줍니다.',
    '새로운 인연의 가능성이 높은 날입니다. 낯선 만남에 열린 마음을 가지세요.',
    '파트너와의 오해가 자연스럽게 풀리고 신뢰가 깊어지는 흐름의 날입니다.',
    '감정을 솔직하게 나눌 수 있는 날입니다. 오래 묵혀두었던 말을 꺼내기 좋습니다.',
  ],
  conflict: [
    '오해가 생기기 쉬운 날입니다. 감정적인 대응보다 한 발짝 물러서는 자세가 중요합니다.',
    '혼자만의 시간을 갖는 것이 관계에 도움이 됩니다. 억지로 해결하려 하지 마세요.',
    '감정 기복이 커지는 날입니다. 중요한 대화는 마음이 안정된 후로 미루는 것이 현명합니다.',
    '상대방의 말을 오해하기 쉬운 기운의 날입니다. 먼저 의도를 확인하고 반응하세요.',
    '연인·가족 사이의 불필요한 마찰을 피하기 위해 말을 신중하게 선택하는 날입니다.',
    '관계에서 일방적으로 소모되는 느낌이 든다면 경계를 세우는 연습이 필요합니다.',
  ],
  neutral: [
    '잔잔한 감정의 흐름입니다. 일상의 소소한 행복에서 진정한 위로를 찾아보세요.',
    '상대를 배려하는 마음이 관계를 한 단계 발전시킵니다. 작은 친절이 큰 차이를 만듭니다.',
    '특별한 이벤트보다 일상을 함께하는 것에서 따뜻함을 나누는 날입니다.',
    '관계에 급격한 변화보다 현재의 유대를 소중히 여기는 것이 더 가치 있는 하루입니다.',
    '깊은 대화보다 함께 있는 시간 자체가 관계를 다지는 오늘입니다.',
    '파트너의 작은 노력을 알아주고 인정해주면 관계의 온도가 올라가는 날입니다.',
  ],
};

// ─── 조언 (각 8개) ───────────────────────────────────────
const ADVICE_BY_REL: Record<string, string[]> = {
  harmony: [
    '오늘의 좋은 기운을 활용해 적극적으로 나아가세요. 망설임이 기회를 놓치게 합니다.',
    '귀인이 곁에 있는 날입니다. 혼자 모든 것을 해결하려 하지 말고 도움을 받아보세요.',
    '오늘 시작하는 일은 탄탄한 결실로 이어집니다. 첫 발을 두려워하지 마세요.',
    '좋은 에너지가 흐를 때 중요한 결정을 내리세요. 타이밍이 결과의 절반입니다.',
    '자신의 강점을 최대한 발휘하는 날입니다. 자신감을 가지고 당당하게 행동하세요.',
    '주변의 긍정적인 기운을 그대로 받아들이세요. 감사하는 마음이 더 큰 복을 불러옵니다.',
    '기회가 여러 방향에서 동시에 찾아올 수 있습니다. 우선순위를 정해 집중하세요.',
    '오늘의 성공 경험을 기록해 두세요. 나중에 자신감의 원천이 되어줍니다.',
  ],
  conflict: [
    '신중함이 최선의 전략입니다. 한 걸음 물러서는 용기도 분명한 능력입니다.',
    '흐름에 역행하지 마세요. 지금은 준비하고 기다리는 것이 앞으로 나아가는 것보다 현명합니다.',
    '감정이 앞서는 날입니다. 중요한 결정은 내일 차분한 마음으로 다시 생각해보세요.',
    '오늘 겪는 어려움은 성장의 밑거름입니다. 조급하게 해결하려 하지 말고 배움을 찾으세요.',
    '말보다 행동을 줄이고 경청하는 날로 삼으세요. 침묵이 때로 가장 강한 응답입니다.',
    '예상치 못한 장애물이 생겨도 당황하지 마세요. 우회로가 오히려 더 좋은 길일 수 있습니다.',
    '에너지를 낭비하지 말고 핵심에 집중하세요. 오늘은 선택과 집중이 최선입니다.',
    '스트레스를 받는 상황에서도 평정심을 유지하는 것이 오늘의 가장 큰 과제입니다.',
  ],
  neutral: [
    '꾸준함과 성실함으로 임하면 원하는 결과를 얻을 수 있습니다.',
    '오늘은 특별한 변화보다 현재에 충실한 하루를 보내는 것이 최선입니다.',
    '작은 습관이 큰 변화를 만듭니다. 오늘 하루도 좋은 루틴을 지켜나가세요.',
    '평온한 날일수록 내면을 돌아볼 여유가 생깁니다. 자신에게 솔직해지세요.',
    '무리하지 않고 자신의 페이스를 지키는 것이 장기적으로 더 멀리 가는 방법입니다.',
    '주변 사람들에게 감사 한마디를 건네보세요. 관계가 더 따뜻해지는 날입니다.',
    '오늘의 고요함을 낭비하지 마세요. 집중해서 준비할 수 있는 소중한 시간입니다.',
    '기본을 지키는 사람이 결국 멀리 갑니다. 원칙과 루틴에 충실한 하루를 보내세요.',
  ],
};

// ─── 점수 ────────────────────────────────────────────────
const HARMONY_SCORES  = [82, 83, 85, 86, 87, 88, 89, 90, 84, 85];
const CONFLICT_SCORES = [38, 40, 42, 44, 45, 46, 47, 48, 39, 43];
const NEUTRAL_SCORES  = [60, 62, 63, 65, 66, 67, 68, 70, 71, 72];

function getDeterministicIndex(dateStr: string, branch: string, poolSize: number): number {
  const dateNum = parseInt(dateStr.replace(/-/g, ''), 10);
  const branchIdx = EARTHLY_BRANCHES.indexOf(branch);
  return (dateNum * 3 + branchIdx * 7) % poolSize;
}

function getRelationScore(rel: 'harmony' | 'conflict' | 'neutral', dateStr: string, branch: string): number {
  const i = getDeterministicIndex(dateStr, branch, 10);
  if (rel === 'harmony')  return HARMONY_SCORES[i];
  if (rel === 'conflict') return CONFLICT_SCORES[i];
  return NEUTRAL_SCORES[i];
}

// 띠별 오행 원소
const ZODIAC_ELEM: Record<string, string> = {
  자:'수', 축:'토', 인:'목', 묘:'목', 진:'토', 사:'화',
  오:'화', 미:'토', 신:'금', 유:'금', 술:'토', 해:'수',
};

const ZODIAC_EMOJI = ['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'];

export interface ZodiacDayFortune {
  zodiac: string;
  emoji: string;
  branch: string;
  element: string;
  relation: 'harmony' | 'conflict' | 'neutral';
  score: number;
  fortune: string;
  moneyFortune: string;
  loveFortune: string;
  advice: string;
  birthYears: number[]; // 대표 출생 연도 (최근 72년)
}

export interface ZodiacFortuneData {
  date: string;
  dayGanzi: string;
  dayBranch: string;
  zodiacs: ZodiacDayFortune[];
}

function getBirthYears(branchIdx: number): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  let y = currentYear;
  while (y > currentYear - 72) {
    if (((y - 4) % 12 + 12) % 12 === branchIdx) years.push(y);
    y--;
  }
  return years.slice(0, 6);
}

export function getZodiacFortune(year: number, month: number, day: number): ZodiacFortuneData {
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dayPillar = getDayPillar(year, month, day);
  const dayBranch = dayPillar.branch;

  const zodiacs: ZodiacDayFortune[] = ZODIAC_KR.map((zodiac, i) => {
    const branch = EARTHLY_BRANCHES[i];
    const rel = getDayRelation(dayBranch, branch);
    const score = getRelationScore(rel, dateStr, branch);

    const fortunePool  = rel === 'harmony' ? HARMONY_TEXTS  : rel === 'conflict' ? CONFLICT_TEXTS  : NEUTRAL_TEXTS;
    const moneyPool    = MONEY_BY_REL[rel];
    const lovePool     = LOVE_BY_REL[rel];
    const advicePool   = ADVICE_BY_REL[rel];

    const idxMain   = getDeterministicIndex(dateStr, branch, fortunePool.length);
    const idxMoney  = getDeterministicIndex(dateStr, branch + 'm', moneyPool.length);
    const idxLove   = getDeterministicIndex(dateStr, branch + 'l', lovePool.length);
    const idxAdvice = getDeterministicIndex(dateStr, branch + 'a', advicePool.length);

    return {
      zodiac,
      emoji: ZODIAC_EMOJI[i],
      branch,
      element: ZODIAC_ELEM[branch] ?? '토',
      relation: rel,
      score,
      fortune:      fortunePool[idxMain],
      moneyFortune: moneyPool[idxMoney],
      loveFortune:  lovePool[idxLove],
      advice:       advicePool[idxAdvice],
      birthYears:   getBirthYears(i),
    };
  });

  return { date: dateStr, dayGanzi: dayPillar.stem + dayPillar.branch, dayBranch, zodiacs };
}
