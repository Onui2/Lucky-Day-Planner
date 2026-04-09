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
  generated: '올해는 도움의 손길이 사방에서 들어오는 해입니다. 귀인이 나타나 뜻하지 않은 기회를 안겨주며, 노력이 풍성한 결실로 이어집니다.',
  same:      '올해는 동료와 경쟁이 교차하는 해입니다. 협력과 경쟁을 슬기롭게 균형 잡아야 하며, 자신만의 강점을 살리는 것이 중요합니다.',
  generates: '올해는 아낌없이 베푸는 에너지가 강한 해입니다. 주변을 도우며 인덕을 쌓는 시기이나, 자신의 소진에 주의하세요.',
  dominates: '올해는 강한 추진력으로 원하는 것을 이루는 해입니다. 목표를 향해 적극 나아가되, 지나친 강행은 갈등을 부를 수 있습니다.',
  dominated: '올해는 인내와 수련의 해입니다. 외부의 압박이 있더라도 이를 성장의 자양분으로 삼으면 내년 도약을 위한 단단한 기반이 됩니다.',
};

const MONEY_BY_REL: Record<string, string[]> = {
  generated: ['예상치 못한 재물이 들어오는 흐름입니다. 투자와 사업 확장에 유리하며, 귀인의 도움으로 수익이 늘어납니다.', '수입이 안정적으로 유지되고, 절약한 노력이 결실을 맺는 시기입니다.'],
  same:      ['수입과 지출이 비슷하게 유지되는 평온한 재물운입니다. 무리한 투자보다 안정적 관리에 집중하세요.', '경쟁으로 인한 지출이 있을 수 있습니다. 계획적 소비가 중요합니다.'],
  generates: ['베푸는 지출이 많아지는 시기입니다. 인맥 투자는 장기적 이익이 될 수 있습니다.', '당장의 수익보다 미래를 위한 투자 성격의 지출이 늘어납니다.'],
  dominates: ['강한 재물 운이 따르는 시기입니다. 사업·영업에 좋은 성과를 기대할 수 있습니다.', '적극적인 행동이 재물을 부르는 해입니다. 기회가 오면 놓치지 마세요.'],
  dominated: ['지출이 수입을 앞설 수 있습니다. 불필요한 소비를 최소화하고 비상금을 지켜야 합니다.', '재물 운이 저조한 시기입니다. 검소한 생활과 부채 관리에 집중하세요.'],
};
const LOVE_BY_REL: Record<string, string[]> = {
  generated: ['귀인과의 만남이 기대되는 해입니다. 인연의 실이 자연스럽게 이어지며, 기존 관계도 깊어집니다.', '사랑이 풍요로운 시기입니다. 주변에서 좋은 소식이 들려올 가능성이 큽니다.'],
  same:      ['감정의 기복이 있을 수 있습니다. 솔직한 대화가 관계 유지의 핵심입니다.', '경쟁적 상황 속에서도 진심이 통하는 인연을 만날 수 있습니다.'],
  generates: ['내가 더 많이 사랑하는 상황이 생길 수 있습니다. 균형을 찾는 것이 중요합니다.', '주변을 챙기는 에너지가 강해 인간관계가 넓어집니다.'],
  dominates: ['자신의 의지대로 관계를 이끌어 나가는 해입니다. 상대방 존중을 잊지 마세요.', '주도적인 애정 표현이 관계를 발전시킵니다.'],
  dominated: ['감정적 스트레스가 있을 수 있습니다. 혼자만의 공간과 시간을 통해 내면을 다독이세요.', '관계에서 억눌린 감정이 쌓일 수 있습니다. 솔직한 표현이 필요합니다.'],
};
const CAREER_BY_REL: Record<string, string[]> = {
  generated: ['윗사람의 지지와 기회가 풍부한 해입니다. 승진이나 중요 프로젝트에서 두각을 나타냅니다.', '능력을 인정받고 좋은 포지션으로 이동할 수 있는 시기입니다.'],
  same:      ['동료와의 경쟁이 치열해질 수 있습니다. 자신만의 전문성을 높이는 것이 유리합니다.', '팀워크가 중요한 시기입니다. 협력으로 더 큰 성과를 낼 수 있습니다.'],
  generates: ['후배나 부하를 이끌며 리더십을 발휘하는 해입니다.', '가르치고 육성하는 역할에서 보람을 느끼는 시기입니다.'],
  dominates: ['적극적인 추진력으로 목표를 달성하기 좋은 해입니다. 새로운 도전에 나서세요.', '업무에서 강한 성취감을 느끼는 시기입니다. 리더 역할이 잘 맞습니다.'],
  dominated: ['업무 부담이 커지는 시기입니다. 체계적인 계획으로 하나씩 처리해 나가세요.', '조직 내 갈등이 있을 수 있습니다. 낮은 자세로 묵묵히 실력을 키우세요.'],
};
const HEALTH_BY_REL: Record<string, string[]> = {
  generated: ['건강 운이 좋습니다. 활력이 넘치며, 가벼운 운동으로 더욱 활기찬 한 해를 보내세요.', '면역력이 강한 시기입니다. 규칙적인 생활로 컨디션을 유지하세요.'],
  same:      ['에너지 소모가 클 수 있습니다. 과로를 피하고 충분한 수면을 취하세요.', '신체 리듬이 평온합니다. 소화기 건강에 주의하세요.'],
  generates: ['체력 소모가 많은 시기입니다. 자신을 위한 휴식을 우선순위에 두세요.', '무리한 희생은 건강을 해칩니다. 자기 관리가 중요합니다.'],
  dominates: ['활동량이 많은 해입니다. 무리하지 않도록 체력 관리를 잘 해야 합니다.', '에너지가 넘치는 시기이지만 과로에 주의하세요.'],
  dominated: ['스트레스성 질환에 주의해야 하는 시기입니다. 마음의 안정이 건강의 핵심입니다.', '면역력 저하가 우려됩니다. 영양 섭취와 수면에 특별히 신경 쓰세요.'],
};

const QUARTER_THEMES = [
  ['계획과 시작의 계절', '성장과 활동의 계절', '결실과 마무리의 계절', '휴식과 준비의 계절'],
  ['목표 수립에 집중하세요', '에너지를 발산하기 좋은 시기', '수확을 거두는 시기', '내실을 다지는 계절'],
];
const QUARTER_ADVICE = [
  '새로운 계획과 인간관계를 시작하기에 좋은 시기입니다.',
  '적극적인 행동과 도전이 좋은 결과를 가져오는 계절입니다.',
  '그동안의 노력이 결실을 맺으며, 마무리에 집중해야 합니다.',
  '다음 해를 위한 준비와 재충전의 시간을 갖으세요.',
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

  const idx = (yearPillar.stemIndex + yearPillar.branchIndex) % 2;
  const keyAdvice: string[] = [
    MONEY_BY_REL[rel]?.[idx]  ?? '',
    CAREER_BY_REL[rel]?.[idx] ?? '',
    HEALTH_BY_REL[rel]?.[idx] ?? '',
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
    overallText: RELATION_OVERALL[rel] ?? '',
    moneyScore,
    moneyText:  MONEY_BY_REL[rel]?.[idx]  ?? '',
    loveScore,
    loveText:   LOVE_BY_REL[rel]?.[idx]   ?? '',
    careerScore,
    careerText: CAREER_BY_REL[rel]?.[idx] ?? '',
    healthScore,
    healthText: HEALTH_BY_REL[rel]?.[idx] ?? '',
    quarters,
    monthlyScores,
    keyAdvice,
  };
}
