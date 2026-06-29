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
  '합(合)의 기운이 살아 있어 사람과 일이 맞물리기 쉽습니다. 혼자 밀기보다 함께 조율할수록 흐름이 안정됩니다.',
  '도움받을 여지는 있지만 저절로 풀리는 날은 아닙니다. 먼저 정리한 계획이 있어야 반응이 따라옵니다.',
  '관계와 실무가 함께 움직이는 날입니다. 약속, 숫자, 역할을 분명히 하면 실속이 남습니다.',
  '망설이던 일을 가볍게 건드려볼 만합니다. 다만 한 번에 크게 벌리기보다 작은 확인부터가 맞습니다.',
  '협력운이 좋게 들어옵니다. 상대의 요구를 먼저 읽으면 불필요한 마찰 없이 속도가 붙습니다.',
  '새로운 접점이 생길 수 있습니다. 우연처럼 보여도 기록하고 이어가야 실제 기회가 됩니다.',
  '소통의 문이 열리는 날입니다. 진심만 앞세우기보다 상대가 이해할 언어로 정리해보세요.',
  '결정운은 나쁘지 않습니다. 오래 끌던 사안은 조건을 다시 확인한 뒤 마무리하기 좋습니다.',
  '막힌 부분이 조금씩 풀립니다. 다만 해결의 실마리는 큰 승부보다 작은 수정에서 나옵니다.',
  '자신감이 올라오는 날입니다. 말과 행동이 커지기 쉬우니 책임질 수 있는 범위에서 움직이세요.',
];
const CONFLICT_TEXTS: string[] = [
  '충(沖)의 기운이 있어 변수가 먼저 드러나는 날입니다. 결정 전 전제 조건을 다시 확인하세요.',
  '마음이 흩어지기 쉽습니다. 중요한 판단은 미루고 자료 정리와 준비에 집중하는 편이 낫습니다.',
  '오해가 생기기 쉬운 날입니다. 반박보다 확인 질문을 먼저 던지면 일을 키우지 않습니다.',
  '에너지 소모가 큽니다. 오늘 무리해서 밀어붙이면 회복 비용이 더 커질 수 있습니다.',
  '흐름이 기대와 반대로 움직일 수 있습니다. 속도를 늦추고 빠져나갈 여지를 남기세요.',
  '예상 밖 요청이나 일정 변경이 생길 수 있습니다. 핵심 목표 하나만 남기고 나머지는 조정하세요.',
  '감정 기복이 판단에 섞이기 쉽습니다. 중요한 말은 바로 보내지 말고 한 번 저장해두세요.',
  '계획이 어긋날 수 있습니다. 결과를 강요하기보다 손실을 줄이는 쪽으로 방향을 바꾸세요.',
  '새 도전보다 현상 유지가 유리합니다. 무리한 확장은 다음 흐름을 보고 판단하세요.',
  '작은 누락이 커질 수 있습니다. 발송, 결제, 약속 시간은 이중으로 확인하세요.',
];
const NEUTRAL_TEXTS: string[] = [
  '큰 기복은 적지만 자동으로 풀리는 날도 아닙니다. 루틴을 지키는 만큼 안정됩니다.',
  '차분한 기운입니다. 새 결정보다 머릿속에 흩어진 일을 정리하기 좋습니다.',
  '기본기가 결과를 좌우합니다. 익숙한 일일수록 확인 절차를 생략하지 마세요.',
  '소통은 무난하지만 깊은 합의까지는 시간이 걸릴 수 있습니다. 서두르지 않는 편이 낫습니다.',
  '조용한 하루입니다. 눈에 띄는 성과보다 작은 마무리를 쌓는 데 의미가 있습니다.',
  '일상 속에서 실마리가 보일 수 있습니다. 평소 지나쳤던 연락이나 문서를 살펴보세요.',
  '중립적인 흐름입니다. 태도를 크게 바꾸기보다 현재 페이스를 유지하는 것이 안정적입니다.',
  '계획대로 움직이면 충분합니다. 욕심을 줄이면 일정과 컨디션을 지킬 수 있습니다.',
  '중심을 지키기 좋은 날입니다. 주변 말에 반응하기보다 자신의 기준을 확인하세요.',
  '새 자극보다 기존의 것을 다듬는 데 맞습니다. 진행 중인 일을 한 단계만 정리하세요.',
];

// ─── 금전운 (각 6개) ─────────────────────────────────────
const MONEY_BY_REL: Record<string, string[]> = {
  harmony: [
    '재물 흐름은 열려 있습니다. 다만 조건을 확인한 거래만 실속으로 남습니다.',
    '예상 밖 입금이나 제안이 있을 수 있습니다. 출처와 책임 범위를 먼저 보세요.',
    '지출보다 관리가 중요한 날입니다. 장기 자산은 검토까지만 해도 충분합니다.',
    '협상에는 유리하지만 숫자를 직접 확인해야 합니다. 말보다 계약 조건이 우선입니다.',
    '이전에 들인 수고가 일부 돌아올 수 있습니다. 바로 쓰기보다 정산부터 하세요.',
    '작은 수익 기회가 보입니다. 욕심을 키우지 않으면 부담 없이 챙길 수 있습니다.',
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
    '금전운은 평이합니다. 예정된 지출과 결제일을 맞추는 데 집중하세요.',
    '저축과 관리에 맞는 날입니다. 작은 절약은 체감 여유를 만듭니다.',
    '큰 변화보다 기본 재무 계획 점검에 적합합니다.',
    '새로운 수익보다 현재 자산을 흐트러뜨리지 않는 것이 중요합니다.',
    '큰 이익도 큰 손실도 적은 흐름입니다. 무리한 선택을 피하세요.',
    '고정비와 소액 결제를 정리하면 새는 돈을 줄일 수 있습니다.',
  ],
};

// ─── 애정운 (각 6개) ─────────────────────────────────────
const LOVE_BY_REL: Record<string, string[]> = {
  harmony: [
    '인연운은 열려 있습니다. 먼저 연락하되 상대의 반응을 보며 속도를 맞추세요.',
    '관계가 가까워질 여지가 있습니다. 감정 표현은 짧고 구체적일수록 잘 통합니다.',
    '함께 시간을 보내기 무난한 날입니다. 과한 이벤트보다 세심한 배려가 낫습니다.',
    '새 접점이 생길 수 있습니다. 낯선 만남도 천천히 알아가는 태도가 좋습니다.',
    '오해를 풀기 좋은 흐름입니다. 변명보다 사실과 마음을 나누는 대화가 맞습니다.',
    '묵혀둔 말을 꺼낼 수 있습니다. 단, 결론을 강요하지 않아야 관계가 편해집니다.',
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
    '감정 흐름은 잔잔합니다. 평소처럼 대하되 서운함은 쌓아두지 마세요.',
    '작은 배려가 관계를 안정시킵니다. 기대보다 확인이 먼저입니다.',
    '특별한 이벤트보다 편안한 일상을 함께하기에 맞는 날입니다.',
    '관계의 급격한 변화보다는 현재의 온도를 유지하는 것이 좋습니다.',
    '깊은 대화가 어렵다면 함께 있는 시간만으로도 충분합니다.',
    '상대의 작은 노력을 알아주면 분위기가 부드러워집니다.',
  ],
};

// ─── 조언 (각 8개) ───────────────────────────────────────
const ADVICE_BY_REL: Record<string, string[]> = {
  harmony: [
    '열린 흐름은 활용하되 한 번에 모두 잡으려 하지 마세요.',
    '도움받을 일이 있다면 구체적으로 요청하세요. 막연한 기대는 효과가 약합니다.',
    '시작은 작게, 확인은 빠르게 하는 방식이 맞습니다.',
    '중요한 결정은 조건을 적어본 뒤 진행하세요. 타이밍만큼 기준도 중요합니다.',
    '강점을 드러내되 상대가 받아들일 수 있는 속도를 살피세요.',
    '주변 분위기가 괜찮을수록 약속과 마감을 명확히 해야 합니다.',
    '여러 선택지가 보이면 우선순위 하나만 정해 집중하세요.',
    '오늘의 작은 성과를 기록해두면 다음 판단의 근거가 됩니다.',
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
    '꾸준함이 필요한 날입니다. 결과보다 반복 가능한 방식을 남기세요.',
    '특별한 변화보다 현재 해야 할 일을 정확히 처리하는 편이 낫습니다.',
    '작은 습관을 지키는 데 의미가 있습니다. 루틴을 무너뜨리지 마세요.',
    '평온한 날일수록 마음의 피로를 확인할 여지가 생깁니다.',
    '자신의 페이스를 지키세요. 남의 속도에 맞추다 보면 중심이 흔들립니다.',
    '감사 표현은 좋지만 과한 약속으로 이어지지 않게 조절하세요.',
    '조용한 시간을 준비에 쓰면 다음 흐름이 한결 가벼워집니다.',
    '기본을 지키는 것이 오늘의 핵심입니다. 원칙과 루틴을 확인하세요.',
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
