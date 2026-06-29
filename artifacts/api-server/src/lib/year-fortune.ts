// 연간 운세 (Year Fortune) Calculator
// 사주팔자 전체(년·월·일·시 4주)를 기반으로 월별 점수 개인화
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES,
  getYearPillar, getDayPillar, getSajuYear, getMonthPillar, getHourPillar,
  STEM_ELEMENTS, BRANCH_ELEMENTS,
} from './saju-calculator.js';

const STEM_ELEMENT_MAP: Record<string, string> = {
  갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'
};
const BRANCH_ELEMENT_MAP: Record<string, string> = {
  자:'수',축:'토',인:'목',묘:'목',진:'토',사:'화',오:'화',미:'토',신:'금',유:'금',술:'토',해:'수'
};

// 오행 상생 상극
const GENERATES: Record<string, string> = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const DOMINATES: Record<string, string> = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };

function getRelation(dayElem: string, otherElem: string): 'same' | 'generates' | 'generated' | 'dominates' | 'dominated' {
  if (dayElem === otherElem) return 'same';
  if (GENERATES[dayElem] === otherElem) return 'generates';
  if (GENERATES[otherElem] === dayElem) return 'generated';
  if (DOMINATES[dayElem] === otherElem) return 'dominates';
  return 'dominated';
}

function getBaseScore(rel: ReturnType<typeof getRelation>): number {
  switch (rel) {
    case 'generated': return 85;
    case 'same':      return 78;
    case 'generates': return 72;
    case 'dominates': return 68;
    case 'dominated': return 55;
  }
}

// ─── 지지 합(合) / 충(沖) ───────────────────────────────
// 삼합 / 육합
const BRANCH_HARMONY: Record<string, string[]> = {
  자:['축','신','진'], 축:['자','사','유'], 인:['해','오','술'],
  묘:['술','해','미'], 진:['유','자','신'], 사:['신','축','유'],
  오:['미','인','술'], 미:['오','해','묘'], 신:['사','자','진'],
  유:['진','사','축'], 술:['묘','오','인'], 해:['인','묘','미'],
};
// 육충
const BRANCH_CLASH: Record<string, string> = {
  자:'오', 축:'미', 인:'신', 묘:'유', 진:'술', 사:'해',
  오:'자', 미:'축', 신:'인', 유:'묘', 술:'진', 해:'사',
};

function branchRelBonus(b1: string, b2: string): number {
  if (BRANCH_HARMONY[b1]?.includes(b2)) return 8;
  if (BRANCH_CLASH[b1] === b2)          return -10;
  return 0;
}

// ─── 천간 합(合) ───────────────────────────────────────
// 갑기합·을경합·병신합·정임합·무계합
const STEM_HARMONY: Record<string, string> = {
  갑:'기', 기:'갑', 을:'경', 경:'을', 병:'신', 신:'병', 정:'임', 임:'정', 무:'계', 계:'무'
};
function stemHarmonyBonus(s1: string, s2: string): number {
  return STEM_HARMONY[s1] === s2 ? 7 : 0;
}

// ─── 천간 인덱스별 미세 조정 (0~9 → -4~+4) ─────────────
//  갑(0) 을(1) 병(2) 정(3) 무(4) 기(5) 경(6) 신(7) 임(8) 계(9)
const STEM_BIAS = [3, 1, 4, 2, 0, -1, -2, 2, 3, -3];

// ─── 텍스트 풀 ────────────────────────────────────────────

const QUARTERLY_NAMES = ['봄 (1~3월)', '여름 (4~6월)', '가을 (7~9월)', '겨울 (10~12월)'];
const QUARTERLY_MONTHS = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];

const RELATION_OVERALL: Record<string, string> = {
  generated: '도움과 배움의 흐름이 있지만, 실제 성과는 준비된 영역에서만 드러납니다.',
  same:      '동료와 경쟁이 교차하므로 협력할 일과 지켜야 할 기준을 분리하는 것이 중요합니다.',
  generates: '베풀고 챙기는 일이 늘 수 있어 인덕은 쌓이지만 소진 관리가 필요합니다.',
  dominates: '추진력은 있으나 밀어붙이는 방식이 강해지면 갈등과 피로가 같이 커질 수 있습니다.',
  dominated: '외부 압박과 조정 요구가 느껴질 수 있어 확장보다 내실을 다지는 쪽이 맞습니다.',
};

const MONEY_BY_REL: Record<string, string[]> = {
  generated: ['수입 보완 흐름은 있으나 확장보다 검증된 자산 관리가 우선입니다.', '절약과 회수 관리가 실질 여유를 만드는 시기입니다.'],
  same:      ['수입과 지출이 비슷하게 움직이기 쉬워 무리한 투자보다 안정적 관리가 맞습니다.', '경쟁이나 체면성 지출이 늘 수 있으니 예산선을 먼저 정하세요.'],
  generates: ['베푸는 지출과 관계 비용이 늘 수 있어 한도를 정해야 합니다.', '미래 투자 성격의 지출은 가능하지만 회수 시점을 보수적으로 잡으세요.'],
  dominates: ['영업과 협상 기회는 있으나 리스크 한도를 넘기면 부담이 커질 수 있습니다.', '적극성은 도움이 되지만 고수익 제안은 숫자로 검증해야 합니다.'],
  dominated: ['지출이 수입을 앞설 수 있으니 비상금과 부채 관리가 우선입니다.', '재물 흐름이 답답할 수 있어 새 투자보다 손실 방어에 집중하세요.'],
};
const LOVE_BY_REL: Record<string, string[]> = {
  generated: ['도움이 되는 인연은 있으나 관계를 단정하기보다 천천히 확인하는 편이 좋습니다.', '기존 관계는 안정될 수 있지만 표현과 책임을 함께 맞춰야 합니다.'],
  same:      ['감정 기복과 자존심이 부딪힐 수 있어 솔직한 대화가 필요합니다.', '비슷한 사람에게 끌리더라도 경쟁심이 섞이지 않게 조절하세요.'],
  generates: ['내가 더 많이 챙기는 관계가 되기 쉬워 균형을 의식해야 합니다.', '인간관계가 넓어질 수 있지만 깊이는 선별이 필요합니다.'],
  dominates: ['관계를 이끌고 싶은 마음이 강해질 수 있으니 상대의 속도를 존중하세요.', '적극적 표현은 좋지만 결론을 재촉하면 부담이 됩니다.'],
  dominated: ['관계 스트레스가 쌓일 수 있어 혼자만 참는 방식은 피해야 합니다.', '억눌린 감정은 차분히 말로 풀어야 길게 갑니다.'],
};
const CAREER_BY_REL: Record<string, string[]> = {
  generated: ['상사의 지원이나 제도적 도움은 기대할 수 있으나 성과 기준을 명확히 해야 합니다.', '포지션 변화 가능성은 있지만 준비된 역량을 보여주는 과정이 필요합니다.'],
  same:      ['동료와의 경쟁이 치열해질 수 있어 자기 전문성을 좁고 깊게 다지는 편이 유리합니다.', '팀워크가 필요하지만 역할 경계가 흐려지지 않게 조율하세요.'],
  generates: ['후배나 구성원을 챙기는 일이 늘 수 있어 리더십과 소진 관리가 함께 필요합니다.', '가르치고 육성하는 역할은 맞지만 본인 업무 시간을 보호해야 합니다.'],
  dominates: ['추진력은 있으나 무리한 목표 설정은 부담으로 돌아올 수 있습니다.', '리더 역할은 맞지만 결정 전에 이해관계자를 설득하는 과정이 필요합니다.'],
  dominated: ['업무 부담이 커질 수 있어 일정과 책임 범위를 잘게 나누어야 합니다.', '조직 내 압박이 느껴질 수 있으니 실력 축적과 리스크 관리가 우선입니다.'],
};
const HEALTH_BY_REL: Record<string, string[]> = {
  generated: ['회복 흐름은 괜찮지만 규칙적인 생활을 놓치면 금방 흔들릴 수 있습니다.', '컨디션은 관리한 만큼 유지됩니다. 운동보다 수면과 식사가 우선입니다.'],
  same:      ['에너지 소모가 클 수 있습니다. 과로를 피하고 충분한 수면을 취하세요.', '신체 리듬이 평온합니다. 소화기 건강에 주의하세요.'],
  generates: ['체력 소모가 많은 시기입니다. 자신을 위한 휴식을 우선순위에 두세요.', '무리한 희생은 건강을 해칩니다. 자기 관리가 중요합니다.'],
  dominates: ['활동량이 많은 해입니다. 무리하지 않도록 체력 관리를 잘 해야 합니다.', '에너지가 넘치는 시기이지만 과로에 주의하세요.'],
  dominated: ['스트레스성 질환에 주의해야 하는 시기입니다. 마음의 안정이 건강의 핵심입니다.', '면역력 저하가 우려됩니다. 영양 섭취와 수면에 특별히 신경 쓰세요.'],
};

const QUARTER_THEMES = [
  ['계획 점검의 계절', '활동 조절의 계절', '정리와 수습의 계절', '휴식과 준비의 계절'],
  ['목표 수립에 집중하세요', '에너지를 쓰되 과속은 피하세요', '수확보다 마무리를 보세요', '내실을 다지는 계절'],
];
const QUARTER_ADVICE = [
  '새로운 계획은 작게 시험하고 관계는 속도보다 신뢰를 보세요.',
  '활동량이 늘 수 있으니 약속과 체력을 함께 관리하세요.',
  '그동안 벌인 일을 정리하고 미룬 약속을 마무리하세요.',
  '다음 흐름을 위해 휴식, 정산, 공부 시간을 확보하세요.',
];

function quarterScore(baseScore: number, q: number, rel: ReturnType<typeof getRelation>): number {
  const offsets: Record<string, number[]> = {
    generated: [5, 10, 5, -2],
    same:      [0, 5, 0, -5],
    generates: [-5, 5, 5, -2],
    dominates: [5, 10, -2, -5],
    dominated: [-10, -5, 5, 5],
  };
  const off = (offsets[rel] || [0,0,0,0])[q] ?? 0;
  return Math.max(30, Math.min(100, baseScore + off));
}

const YEAR_STEM_MEANING: Record<string, { name: string; energy: string; keyword: string }> = {
  갑: { name: '갑목(甲木)', energy: '봄의 나무처럼 상승하는 기운', keyword: '시작·도전·성장' },
  을: { name: '을목(乙木)', energy: '부드럽지만 꺾이지 않는 생명력', keyword: '유연·인내·결실' },
  병: { name: '병화(丙火)', energy: '태양처럼 밝고 강렬한 에너지', keyword: '열정·명성·사교' },
  정: { name: '정화(丁火)', energy: '촛불처럼 따뜻하고 섬세한 빛', keyword: '지혜·예술·배려' },
  무: { name: '무토(戊土)', energy: '산처럼 묵직하고 안정적인 대지', keyword: '안정·신뢰·포용' },
  기: { name: '기토(己土)', energy: '논밭처럼 생명을 품는 비옥한 토지', keyword: '내실·실용·협력' },
  경: { name: '경금(庚金)', energy: '바위처럼 단단하고 결단력 있는 금기', keyword: '결단·혁신·정의' },
  신: { name: '신금(辛金)', energy: '보석처럼 정제된 맑고 날카로운 기운', keyword: '정밀·심미·완벽' },
  임: { name: '임수(壬水)', energy: '큰 강처럼 힘차게 흐르는 물', keyword: '지혜·추진·자유' },
  계: { name: '계수(癸水)', energy: '이슬비처럼 조용히 스며드는 물', keyword: '직관·저력·끈기' },
};

type YearScoreBand = 'high' | 'good' | 'steady' | 'caution' | 'low';
type YearCategory = 'money' | 'love' | 'career' | 'health';

function getYearScoreBand(score: number): YearScoreBand {
  if (score >= 82) return 'high';
  if (score >= 70) return 'good';
  if (score >= 56) return 'steady';
  if (score >= 42) return 'caution';
  return 'low';
}

function pickYearText(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length];
}

const YEAR_SCORE_OPENING: Record<YearScoreBand, string[]> = {
  high: [
    '올해는 활용할 흐름이 비교적 분명합니다.',
    '기회가 보이지만 과장 없이 다루어야 오래 갑니다.',
    '성과를 낼 여지는 있으나 준비된 영역부터 움직이는 편이 맞습니다.',
  ],
  good: [
    '올해는 무난하게 밀고 갈 수 있는 흐름입니다.',
    '큰 무리 없이 전진할 수 있으나 선택과 집중이 필요합니다.',
    '상승 여지는 있지만 모든 영역이 동시에 열리는 해는 아닙니다.',
  ],
  steady: [
    '올해는 균형을 잡는 흐름에 가깝습니다.',
    '좋고 나쁨이 섞이므로 확장보다 관리가 중요합니다.',
    '기대치를 낮추고 꾸준히 쌓아야 실속이 남습니다.',
  ],
  caution: [
    '올해는 변수 관리가 중요한 흐름입니다.',
    '서두르면 부담이 커질 수 있어 속도 조절이 필요합니다.',
    '새로운 확장보다 현재 기반을 지키는 쪽이 우선입니다.',
  ],
  low: [
    '올해는 보수적인 운영이 필요한 흐름입니다.',
    '기운이 약하게 들어오므로 큰 승부보다 손실 방어가 먼저입니다.',
    '새 판을 벌리기보다 체력, 돈, 관계의 새는 곳을 막는 편이 낫습니다.',
  ],
};

const YEAR_SCORE_CLOSING: Record<YearScoreBand, string[]> = {
  high: [
    '다만 좋은 흐름일수록 계약, 일정, 책임 범위를 명확히 해야 합니다.',
    '무리한 확장만 피하면 실제 체감 성과로 이어질 수 있습니다.',
    '올해 얻은 기회는 기록과 시스템으로 남겨야 다음 해에도 이어집니다.',
  ],
  good: [
    '큰 욕심보다 실행 가능한 목표를 꾸준히 밀면 충분합니다.',
    '중요한 선택은 조건을 확인한 뒤 단계적으로 진행하세요.',
    '관계와 돈 문제에서 선을 분명히 하면 안정감이 커집니다.',
  ],
  steady: [
    '겉으로 큰 변화가 없어도 정리한 만큼 후반이 편해집니다.',
    '성과보다 루틴, 재정, 사람 관계의 균형을 맞추는 데 의미가 있습니다.',
    '무리한 비교를 줄이고 현재 가능한 범위를 지키는 것이 핵심입니다.',
  ],
  caution: [
    '중요한 결정은 한 번 늦춰 재검토하고, 감정적인 선택은 피하세요.',
    '돈, 건강, 관계에서 작게 새는 부분을 먼저 막는 것이 유리합니다.',
    '새로운 약속은 줄이고 이미 맡은 일을 정리하는 데 집중하세요.',
  ],
  low: [
    '올해는 지키는 선택이 공격적인 선택보다 낫습니다.',
    '큰 계약, 과도한 투자, 무리한 관계 회복은 충분히 시간을 두세요.',
    '회복과 재정비를 우선하면 다음 흐름을 위한 기반은 남길 수 있습니다.',
  ],
};

const YEAR_CATEGORY_TEXT: Record<YearCategory, Record<YearScoreBand, string[]>> = {
  money: {
    high: [
      '재물 흐름은 열려 있지만 큰돈보다 회수 가능한 구조에 집중해야 합니다.',
      '수입 기회는 보입니다. 다만 계약 조건과 세금, 수수료를 먼저 확인하세요.',
      '영업과 정산에는 유리하나 레버리지나 무리한 투자는 따로 검증이 필요합니다.',
    ],
    good: [
      '재물운은 양호합니다. 기존 수입원을 다듬고 고정비를 줄이면 실속이 납니다.',
      '새 투자보다 관리와 재배치가 더 잘 맞습니다.',
      '계획적인 소비와 회수 관리가 올해 재정 안정의 핵심입니다.',
    ],
    steady: [
      '재물운은 보통입니다. 큰 이익보다 손실을 줄이는 관리가 중요합니다.',
      '수입과 지출이 엇비슷하게 움직이므로 예산선을 미리 정하세요.',
      '투자 판단은 보수적으로 잡고 현금 흐름을 먼저 확인하세요.',
    ],
    caution: [
      '재물운은 주의가 필요합니다. 충동 투자, 보증, 고수익 제안은 피하세요.',
      '예상 밖 지출이 생길 수 있으니 비상금을 먼저 확보하세요.',
      '돈을 불리기보다 새는 돈을 막는 것이 올해의 우선순위입니다.',
    ],
    low: [
      '재물운이 약합니다. 큰 계약과 위험 자산은 충분히 미루는 편이 낫습니다.',
      '부채, 고정비, 미수금처럼 부담을 키우는 항목부터 정리하세요.',
      '올해는 벌기보다 지키는 운영이 맞습니다.',
    ],
  },
  love: {
    high: [
      '관계운은 열려 있습니다. 다만 빠른 확신보다 서로의 생활 리듬을 확인하세요.',
      '새 인연이나 관계 진전의 여지는 있지만 감정과 현실 조건을 같이 봐야 합니다.',
      '표현은 잘 통할 수 있습니다. 결론을 재촉하지 않으면 더 안정됩니다.',
    ],
    good: [
      '애정운은 양호합니다. 작은 배려와 꾸준한 연락이 관계를 안정시킵니다.',
      '새 만남은 가볍게 시작하고 기존 관계는 오해를 풀기에 적합합니다.',
      '감정을 숨기기보다 차분하게 말하면 관계 흐름이 좋아집니다.',
    ],
    steady: [
      '애정운은 보통입니다. 큰 변화보다 현재의 온도를 유지하는 쪽이 맞습니다.',
      '상대 반응을 급히 해석하지 말고 시간을 두고 확인하세요.',
      '관계의 깊이는 천천히 만들어지므로 기대치를 조절하는 편이 편합니다.',
    ],
    caution: [
      '애정운은 주의가 필요합니다. 추측과 감정적인 말이 관계를 흔들 수 있습니다.',
      '중요한 대화는 컨디션이 안정된 뒤에 하는 편이 좋습니다.',
      '관계에서 일방적으로 참거나 몰아붙이는 흐름을 피하세요.',
    ],
    low: [
      '관계운이 무겁습니다. 새 인연보다 자기 회복과 경계 설정이 먼저입니다.',
      '오래 쌓인 불만은 바로 터뜨리기보다 정리한 뒤 말하세요.',
      '올해는 관계를 늘리기보다 지킬 관계와 내려놓을 관계를 구분하는 때입니다.',
    ],
  },
  career: {
    high: [
      '직업운은 강하게 들어옵니다. 발표, 이동, 책임 확대는 준비된 범위에서 추진하세요.',
      '성과를 낼 여지가 있으나 역할과 권한을 명확히 해야 뒷말이 줄어듭니다.',
      '전문성을 드러내기 좋습니다. 결과물과 기록을 남기는 것이 중요합니다.',
    ],
    good: [
      '직업운은 양호합니다. 진행 중인 일을 한 단계 전진시키기 좋습니다.',
      '새 프로젝트는 작게 시험하고 반응을 보며 키우세요.',
      '상대가 원하는 기준을 먼저 확인하면 수정 비용이 줄어듭니다.',
    ],
    steady: [
      '직업운은 보통입니다. 성과보다 일정 관리와 누락 방지가 중요합니다.',
      '반복 업무와 문서 정리에 집중하면 후반 부담이 줄어듭니다.',
      '큰 승부수보다 정확한 마감이 평판을 지켜 줍니다.',
    ],
    caution: [
      '직업운은 주의가 필요합니다. 책임 범위를 넓히기 전에 리소스를 확인하세요.',
      '조직 내 변수나 일정 변경이 생길 수 있으니 문서로 남기는 습관이 필요합니다.',
      '무리한 약속은 줄이고 핵심 업무 하나에 집중하세요.',
    ],
    low: [
      '직업운이 답답할 수 있습니다. 이직, 투자, 확장은 충분히 검토한 뒤 움직이세요.',
      '평판 리스크가 생기지 않도록 말과 문서, 마감 관리를 우선하세요.',
      '올해는 성장보다 방어와 실력 축적에 무게를 두는 편이 낫습니다.',
    ],
  },
  health: {
    high: [
      '건강운은 비교적 안정적입니다. 활동량을 늘리되 회복 시간도 함께 잡으세요.',
      '컨디션은 괜찮은 편이나 과신하면 피로가 누적될 수 있습니다.',
      '운동과 식사 루틴을 일정하게 유지하면 좋은 흐름을 오래 가져갈 수 있습니다.',
    ],
    good: [
      '건강운은 양호합니다. 수면, 수분, 식사 시간을 지키는 것이 핵심입니다.',
      '몸을 움직이면 도움이 되지만 강도는 중간 정도가 맞습니다.',
      '무리하지 않는 생활 루틴이 컨디션을 안정시킵니다.',
    ],
    steady: [
      '건강운은 보통입니다. 피로를 쌓아두지 말고 일정을 미리 덜어내세요.',
      '큰 문제보다 생활 리듬의 흔들림을 조심해야 합니다.',
      '식사와 수면 시간이 무너지면 다른 영역까지 집중력이 떨어질 수 있습니다.',
    ],
    caution: [
      '건강운은 주의가 필요합니다. 통증, 피로, 수면 부족을 가볍게 넘기지 마세요.',
      '과로와 과음, 무리한 운동은 회복을 늦출 수 있습니다.',
      '올해는 체력을 쓰는 계획보다 아끼는 계획이 더 중요합니다.',
    ],
    low: [
      '건강운이 약합니다. 일정과 운동 강도를 낮추고 회복을 우선하세요.',
      '면역과 집중력이 떨어질 수 있으니 수면과 따뜻한 식사를 먼저 챙기세요.',
      '버티는 방식은 손해가 큽니다. 조기 휴식과 점검이 필요합니다.',
    ],
  },
};

function buildYearOverallText(score: number, rel: ReturnType<typeof getRelation>, seed: number): string {
  const band = getYearScoreBand(score);
  return [
    pickYearText(YEAR_SCORE_OPENING[band], seed),
    RELATION_OVERALL[rel] ?? '올해의 흐름은 한쪽으로 단정하기보다 균형 있게 보아야 합니다.',
    pickYearText(YEAR_SCORE_CLOSING[band], seed + 1),
  ].join(' ');
}

function buildYearCategoryText(
  category: YearCategory,
  score: number,
  rel: ReturnType<typeof getRelation>,
  seed: number,
): string {
  const band = getYearScoreBand(score);
  const categoryText = pickYearText(YEAR_CATEGORY_TEXT[category][band], seed);
  const relationText = category === 'money'
    ? MONEY_BY_REL[rel]?.[seed % 2]
    : category === 'love'
      ? LOVE_BY_REL[rel]?.[seed % 2]
      : category === 'career'
        ? CAREER_BY_REL[rel]?.[seed % 2]
        : HEALTH_BY_REL[rel]?.[seed % 2];
  return relationText ? `${categoryText} ${relationText}` : categoryText;
}

export interface YearFortuneData {
  targetYear: number;
  yearGanzi: string;
  yearStem: string;
  yearBranch: string;
  yearZodiac: string;
  yearStemMeaning: { name: string; energy: string; keyword: string };
  dayMasterElement: string;
  relation: string;
  overallScore: number;
  overallText: string;
  moneyScore: number;
  moneyText: string;
  loveScore: number;
  loveText: string;
  careerScore: number;
  careerText: string;
  healthScore: number;
  healthText: string;
  quarters: { name: string; score: number; theme: string; advice: string }[];
  monthlyScores: { month: number; score: number; monthStem?: string; monthBranch?: string }[];
  keyAdvice: string[];
}

// ────────────────────────────────────────────────────────
// 사주 4주 기반 개인화 월별 점수 계산
// ────────────────────────────────────────────────────────
function calcMonthScore(params: {
  dayElem: string;
  dayStemIdx: number;
  dayBranch: string;
  birthYearElem: string;
  birthYearStem: string;
  birthMonthElem: string;
  birthMonthBranch: string;
  birthHourElem: string;
  targetMonthStem: string;
  targetMonthBranch: string;
  targetYearBaseScore: number;  // 세운 기반 기준 점수
}): number {
  const {
    dayElem, dayStemIdx, dayBranch,
    birthYearElem, birthYearStem,
    birthMonthElem, birthMonthBranch,
    birthHourElem,
    targetMonthStem, targetMonthBranch,
    targetYearBaseScore,
  } = params;

  const mStemElem   = STEM_ELEMENT_MAP[targetMonthStem]   ?? '토';
  const mBranchElem = BRANCH_ELEMENT_MAP[targetMonthBranch] ?? '토';

  // ① 일간 vs 월간(천간) 오행 관계 — 가장 중요 (25%)
  const r1 = getBaseScore(getRelation(dayElem, mStemElem)) * 0.25;

  // ② 일간 vs 월지(지지) 오행 관계 (15%)
  const r2 = getBaseScore(getRelation(dayElem, mBranchElem)) * 0.15;

  // ③ 세운(년) 기준 점수 — 개인 사주에 따라 달라진 값 (20%)
  const r3 = targetYearBaseScore * 0.20;

  // ④ 출생 년주 vs 해당 월간 관계 (15%) — 출생 년도에 따라 개인화
  const r4 = getBaseScore(getRelation(birthYearElem, mStemElem)) * 0.15;

  // ⑤ 출생 월주 vs 해당 월간 관계 (10%) — 출생 월에 따라 개인화
  const r5 = getBaseScore(getRelation(birthMonthElem, mStemElem)) * 0.10;

  // ⑥ 출생 시주 vs 해당 월지 관계 (5%)
  const r6 = getBaseScore(getRelation(birthHourElem, mBranchElem)) * 0.05;

  // ⑦ 일지 vs 월지 합충 보너스/패널티 (개인마다 다름)
  const b1 = branchRelBonus(dayBranch, targetMonthBranch);

  // ⑧ 출생 월지 vs 타겟 월지 합충
  const b2 = branchRelBonus(birthMonthBranch, targetMonthBranch) * 0.5;

  // ⑨ 출생 년간 vs 타겟 월간 천간합
  const b3 = stemHarmonyBonus(birthYearStem, targetMonthStem) * 0.5;

  // ⑩ 일간 천간 인덱스별 미세 조정 (0~9, 10가지 다른 패턴)
  const stemBias = STEM_BIAS[dayStemIdx] ?? 0;

  const raw = r1 + r2 + r3 + r4 + r5 + r6 + b1 + b2 + b3 + stemBias;
  return Math.max(30, Math.min(100, Math.round(raw)));
}

// ────────────────────────────────────────────────────────
// 개인화 종합점수 (일간·년주·월주·시주 모두 반영)
// ────────────────────────────────────────────────────────
function calcOverallScore(params: {
  dayElem: string;
  dayStemIdx: number;
  dayBranch: string;
  birthYearElem: string;
  birthMonthElem: string;
  birthHourElem: string;
  yearStemElem: string;
  yearBranchElem: string;
  yearStem: string;
  dayStem: string;
}): number {
  const { dayElem, dayStemIdx, dayBranch, birthYearElem, birthMonthElem, birthHourElem,
          yearStemElem, yearBranchElem, yearStem, dayStem } = params;

  // 일간 vs 세운 천간 (가장 중요)
  const a = getBaseScore(getRelation(dayElem, yearStemElem)) * 0.40;
  // 일간 vs 세운 지지
  const b = getBaseScore(getRelation(dayElem, yearBranchElem)) * 0.20;
  // 출생 년주 vs 세운 천간 (출생 년도별 개인화)
  const c = getBaseScore(getRelation(birthYearElem, yearStemElem)) * 0.15;
  // 출생 월주 vs 세운 지지
  const d = getBaseScore(getRelation(birthMonthElem, yearBranchElem)) * 0.10;
  // 출생 시주 vs 세운 천간
  const e = getBaseScore(getRelation(birthHourElem, yearStemElem)) * 0.05;
  // 일지 vs 세운 지지 합충
  const f = branchRelBonus(dayBranch, EARTHLY_BRANCHES[HEAVENLY_STEMS.indexOf(yearStem)] ?? '자') * 0.3;
  // 일간 천간 인덱스 개인화
  const g = STEM_BIAS[dayStemIdx] ?? 0;
  // 천간합 보너스
  const h = stemHarmonyBonus(dayStem, yearStem) * 0.5;

  return Math.max(30, Math.min(100, Math.round(a + b + c + d + e + f + g + h)));
}

export function getYearFortune(
  birthYear: number, birthMonth: number, birthDay: number,
  birthHour: number = -1, targetYear?: number,
): YearFortuneData {
  const year = targetYear ?? new Date().getFullYear();
  const yearPillar  = getYearPillar(year);
  const sajuYearNum = getSajuYear(birthYear, birthMonth, birthDay, birthHour);
  const dayPillar   = getDayPillar(birthYear, birthMonth, birthDay);

  // ── 사주 4주 모두 계산 ──────────────────────────────
  const birthYearPillar  = getYearPillar(sajuYearNum);
  const birthMonthPillar = getMonthPillar(birthYear, birthMonth, birthDay, birthHour);
  const hourPillar       = birthHour >= 0
    ? getHourPillar(dayPillar.stemIndex, birthHour)
    : { stem: '무', branch: '자', stemElement: '토', branchElement: '수' };

  const dayElem       = STEM_ELEMENT_MAP[dayPillar.stem]         ?? '토';
  const yearStemElem  = STEM_ELEMENT_MAP[yearPillar.stem]         ?? '토';
  const yearBranchElem= BRANCH_ELEMENT_MAP[yearPillar.branch]     ?? '토';
  const birthYearElem = STEM_ELEMENT_MAP[birthYearPillar.stem]    ?? '토';
  const birthMonthElem= STEM_ELEMENT_MAP[birthMonthPillar.stem]   ?? '토';
  const birthHourElem = STEM_ELEMENT_MAP[hourPillar.stem]         ?? '토';

  // ── 전체 관계(일간 vs 세운 천간) — 텍스트 선택용 ──
  const rel = getRelation(dayElem, yearStemElem);

  // ── 개인화 종합 점수 ────────────────────────────────
  const overallScore = calcOverallScore({
    dayElem,
    dayStemIdx: dayPillar.stemIndex,
    dayBranch:  dayPillar.branch,
    birthYearElem,
    birthMonthElem,
    birthHourElem,
    yearStemElem,
    yearBranchElem,
    yearStem: yearPillar.stem,
    dayStem:  dayPillar.stem,
  });

  // ── 영역별 점수 (모두 개인화) ───────────────────────
  // 재물: 일간 vs 세운지지 + 출생년간 vs 세운천간 보정
  const branchRel       = getRelation(dayElem, yearBranchElem);
  const birthYearRelMS  = getRelation(birthYearElem, yearStemElem);
  const moneyBase       = overallScore * 0.50 + getBaseScore(branchRel) * 0.30 + getBaseScore(birthYearRelMS) * 0.20;
  const moneyScore      = Math.max(30, Math.min(100, Math.round(moneyBase + STEM_BIAS[dayPillar.stemIndex] * 0.5)));

  // 애정: 일간 vs 세운천간 + 출생월주 보정
  const birthMonthRelMS = getRelation(birthMonthElem, yearStemElem);
  const loveBase        = overallScore * 0.55 + getBaseScore(birthMonthRelMS) * 0.25 + branchRelBonus(dayPillar.branch, yearPillar.branch) * 0.5;
  const loveScore       = Math.max(30, Math.min(100, Math.round(loveBase + STEM_BIAS[(dayPillar.stemIndex + 3) % 10] * 0.5)));

  // 직업: 출생월주 + 시주 가중
  const hourRelMS       = getRelation(birthHourElem, yearStemElem);
  const careerBase      = overallScore * 0.50 + getBaseScore(birthMonthRelMS) * 0.30 + getBaseScore(hourRelMS) * 0.20;
  const careerScore     = Math.max(30, Math.min(100, Math.round(careerBase + stemHarmonyBonus(dayPillar.stem, yearPillar.stem))));

  // 건강: 일간 vs 세운지지 + 시주 오행
  const healthBase      = overallScore * 0.55 + getBaseScore(branchRel) * 0.25 + getBaseScore(getRelation(birthHourElem, yearBranchElem)) * 0.20;
  const healthScore     = Math.max(30, Math.min(100, Math.round(healthBase + STEM_BIAS[(dayPillar.stemIndex + 7) % 10] * 0.5)));

  // ── 분기별 점수 ─────────────────────────────────────
  const quarters = QUARTERLY_NAMES.map((name, q) => ({
    name,
    score: quarterScore(overallScore, q, rel),
    theme: QUARTER_THEMES[q % 2]?.[q] ?? QUARTER_THEMES[0][0],
    advice: QUARTER_ADVICE[q],
  }));

  // ── 월별 점수 — 사주 4주 전체 기반 개인화 ──────────
  const monthlyScores = Array.from({ length: 12 }, (_, i) => {
    const m  = i + 1;
    const mp = getMonthPillar(year, m, 15); // 각 월 15일 대표
    const score = calcMonthScore({
      dayElem,
      dayStemIdx:      dayPillar.stemIndex,
      dayBranch:       dayPillar.branch,
      birthYearElem,
      birthYearStem:   birthYearPillar.stem,
      birthMonthElem,
      birthMonthBranch: birthMonthPillar.branch,
      birthHourElem,
      targetMonthStem:   mp.stem,
      targetMonthBranch: mp.branch,
      targetYearBaseScore: overallScore,
    });
    return { month: m, score, monthStem: mp.stem, monthBranch: mp.branch };
  });

  const seed = yearPillar.stemIndex + yearPillar.branchIndex + dayPillar.stemIndex;
  const idx = seed % 2;
  const overallText = buildYearOverallText(overallScore, rel, seed);
  const moneyText = buildYearCategoryText('money', moneyScore, rel, seed);
  const loveText = buildYearCategoryText('love', loveScore, rel, seed + 1);
  const careerText = buildYearCategoryText('career', careerScore, rel, seed + 2);
  const healthText = buildYearCategoryText('health', healthScore, rel, seed + 3);
  const keyAdvice: string[] = [
    buildYearCategoryText('money', moneyScore, rel, idx + 4),
    buildYearCategoryText('career', careerScore, rel, idx + 5),
    buildYearCategoryText('health', healthScore, rel, idx + 6),
  ];

  return {
    targetYear: year,
    yearGanzi: yearPillar.stem + yearPillar.branch,
    yearStem: yearPillar.stem,
    yearBranch: yearPillar.branch,
    yearZodiac: yearPillar.zodiac,
    yearStemMeaning: YEAR_STEM_MEANING[yearPillar.stem] ?? { name: yearPillar.stem, energy: '', keyword: '' },
    dayMasterElement: dayElem,
    relation: rel,
    overallScore,
    overallText,
    moneyScore,
    moneyText,
    loveScore,
    loveText,
    careerScore,
    careerText,
    healthScore,
    healthText,
    quarters,
    monthlyScores,
    keyAdvice,
  };
}
