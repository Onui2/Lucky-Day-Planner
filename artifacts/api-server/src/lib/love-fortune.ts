// 연애운 / 인연 운세 (Love Fortune Calculator)
import {
  getDayPillar, getYearPillar, getMonthPillar,
  HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_ELEMENTS, BRANCH_ELEMENTS,
} from './saju-calculator.js';

const STEM_ELEM: Record<string, string> = {
  갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'
};
const BRANCH_ELEM: Record<string, string> = {
  자:'수',축:'토',인:'목',묘:'목',진:'토',사:'화',오:'화',미:'토',신:'금',유:'금',술:'토',해:'수'
};

const GENERATES: Record<string, string> = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const DOMINATES: Record<string, string> = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };

// 재성(남성 인연): 내가 극하는 오행  / 관성(여성 인연): 나를 극하는 오행
const LOVE_ELEM_M: Record<string, string> = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };
const LOVE_ELEM_F: Record<string, string> = { 목:'금', 화:'수', 토:'목', 금:'화', 수:'토' };

function getLoveElem(myElem: string, gender: string) {
  return gender === 'male' ? LOVE_ELEM_M[myElem] : LOVE_ELEM_F[myElem];
}

type Rel = 'same' | 'generates' | 'generated' | 'dominates' | 'dominated';
function getRelation(a: string, b: string): Rel {
  if (a === b) return 'same';
  if (GENERATES[a] === b) return 'generates';
  if (GENERATES[b] === a) return 'generated';
  if (DOMINATES[a] === b) return 'dominates';
  return 'dominated';
}

// 월별 연애 점수 (loveElem 이 그 달 오행에 얼마나 나타나는지)
function monthLoveScore(monthStemElem: string, monthBranchElem: string, loveElem: string, myElem: string): number {
  let score = 50;
  // 인연 오행이 월지/월간에 직접 나타나면 강력
  if (monthBranchElem === loveElem) score += 28;
  if (monthStemElem === loveElem) score += 18;
  // 인연 오행을 생하는 오행이 나타나면 간접 호재
  if (GENERATES[monthBranchElem] === loveElem) score += 10;
  if (GENERATES[monthStemElem] === loveElem) score += 7;
  // 내 일간을 생해주는 달: 자신감·매력 상승
  if (monthBranchElem === GENERATES[myElem] || monthStemElem === GENERATES[myElem]) score += 8;
  // 내 일간을 극하는 달: 스트레스, 인연운 하락
  if (DOMINATES[monthBranchElem] === myElem) score -= 12;
  if (DOMINATES[monthStemElem] === myElem) score -= 8;
  return Math.min(100, Math.max(20, score));
}

// 인연 타입 설명
const LOVE_ELEM_DESC: Record<string, { name: string; partnerTraits: string[]; meetWhere: string }> = {
  목: { name: '목(木)', partnerTraits: ['인자하고 따뜻한 성격', '성장 지향적이며 꿈이 뚜렷함', '자연·예술·교육 분야에 관심 많음'], meetWhere: '문화·예술 공간, 야외 활동, 교육 관련 모임' },
  화: { name: '화(火)', partnerTraits: ['활발하고 카리스마 넘치는 성격', '열정적이며 리더십이 강함', '사교적이고 화술이 뛰어남'], meetWhere: '파티·행사, 소셜 모임, 밝은 에너지의 장소' },
  토: { name: '토(土)', partnerTraits: ['신뢰감 있고 안정적인 성격', '실용적이며 현실 감각이 뛰어남', '가족·집을 중시하는 가치관'], meetWhere: '일상적인 모임, 직장·비즈니스 네트워크, 지인 소개' },
  금: { name: '금(金)', partnerTraits: ['원칙적이고 의리 있는 성격', '결단력·추진력이 강함', '정의감이 투철하며 책임감이 높음'], meetWhere: '직장·업무 관련, 취미 동호회, 격식 있는 자리' },
  수: { name: '수(水)', partnerTraits: ['지적이고 감수성이 풍부한 성격', '유연하고 적응력이 뛰어남', '철학적·영적 관심이 깊음'], meetWhere: '온라인·SNS, 독서·강연 모임, 여행 중' },
};

// 솔로 연애운 월별 이유
const MONTH_LOVE_REASON: Record<string, string> = {
  '인연등장': '인연의 기운이 강하게 흐르는 달',
  '인연간접': '인연을 끌어당기는 에너지가 조용히 흐르는 달',
  '자신감상승': '매력과 자신감이 높아지는 달',
  '스트레스': '내면 집중이 필요한 달',
  '평범': '안정적이나 인연 기운은 약한 달',
};

function getMonthReason(stemElem: string, branchElem: string, loveElem: string, myElem: string): string {
  if (branchElem === loveElem || stemElem === loveElem) return '인연의 기운이 직접 흐르는 달';
  if (GENERATES[branchElem] === loveElem || GENERATES[stemElem] === loveElem) return '인연을 끌어당기는 에너지가 흐르는 달';
  if (branchElem === GENERATES[myElem] || stemElem === GENERATES[myElem]) return '매력·자신감이 높아지는 달';
  if (DOMINATES[branchElem] === myElem) return '자신에게 집중이 필요한 달';
  return '안정적이나 인연 기운은 조용한 달';
}

// 솔로 연애 전체 점수 계산
function calcSoloLoveScore(monthScores: number[]): number {
  const avg = monthScores.reduce((a, b) => a + b, 0) / 12;
  return Math.round(Math.min(95, Math.max(30, avg)));
}

// 연애운 전체 텍스트 (솔로)
const SOLO_LOVE_TEXT: Record<string, Record<string, string>> = {
  목: {
    male: '목(木) 일간 남성은 올해 이성을 만날 토(土)의 기운이 흐를 때 인연의 문이 열립니다. 봄철 새싹처럼 관계가 자연스럽게 싹트며, 자신의 따뜻함을 드러낼수록 좋은 인연을 끌어당깁니다.',
    female: '목(木) 일간 여성은 올해 금(金)의 기운이 강한 달에 매력적인 인연과 마주칩니다. 내면의 감수성을 표현하고 새로운 공간을 탐색하는 것이 인연을 앞당기는 열쇠입니다.',
  },
  화: {
    male: '화(火) 일간 남성은 금(金)의 기운이 흐를 때 진지한 인연이 찾아옵니다. 활발한 사교성을 살려 다양한 만남의 장에 적극 참여하면 올해 안에 특별한 사람과 연결될 가능성이 높습니다.',
    female: '화(火) 일간 여성은 수(水)의 기운이 강한 시기에 지적이고 감성적인 남성과의 인연이 이어집니다. 진솔한 대화와 깊은 교감이 관계를 이어주는 실마리가 됩니다.',
  },
  토: {
    male: '토(土) 일간 남성은 수(水)의 기운이 활발한 달에 지적 매력이 넘치는 인연과 마주칩니다. 성실하고 안정적인 면모가 이성에게 신뢰감을 주어 자연스러운 인연으로 발전합니다.',
    female: '토(土) 일간 여성은 목(木)의 기운이 강한 시기에 따뜻하고 꿈 많은 남성과의 인연이 생깁니다. 일상의 편안한 공간에서 친분이 사랑으로 이어지는 경우가 많습니다.',
  },
  금: {
    male: '금(金) 일간 남성은 목(木)의 기운이 흐를 때 인연의 파도가 밀려옵니다. 원칙과 의리를 중시하는 성격이 이성에게 믿음직스럽게 다가가며, 꾸준한 만남이 깊은 관계로 이어집니다.',
    female: '금(金) 일간 여성은 화(火)의 기운이 강한 달에 열정적이고 추진력 있는 남성과의 인연이 찾아옵니다. 자신의 가치관을 솔직히 표현할수록 진정성 있는 만남이 이루어집니다.',
  },
  수: {
    male: '수(水) 일간 남성은 화(火)의 기운이 흐를 때 밝고 에너지 넘치는 인연을 만납니다. 지적 대화와 공통 관심사를 나누는 것이 자연스러운 만남의 물꼬를 틉니다.',
    female: '수(水) 일간 여성은 토(土)의 기운이 강한 시기에 안정적이고 신뢰할 수 있는 남성과의 인연이 이어집니다. 깊이 있는 대화와 진심 어린 교감이 관계의 씨앗이 됩니다.',
  },
};

// 솔로 연애 팁
const SOLO_TIPS: Record<string, string[]> = {
  목: ['새로운 취미나 모임에 적극 참여하세요', '자연스러운 자신의 따뜻함을 표현하세요', '억지로 서두르지 말고 관계가 자라도록 여유를 주세요'],
  화: ['사교 모임, 행사, 파티에 참가 횟수를 늘려보세요', '열정을 솔직하게 드러내면 매력이 배가됩니다', '인연을 만나면 먼저 연락하는 적극성을 발휘하세요'],
  토: ['지인 소개나 직장 내 네트워크를 활용하세요', '꾸준하고 성실한 모습이 최고의 매력 포인트입니다', '너무 신중하게 분석하기보다 첫인상을 믿어보세요'],
  금: ['취미 동호회나 목표가 같은 그룹에 참여하세요', '진심이 담긴 작은 배려가 마음을 움직입니다', '완벽을 추구하기보다 있는 그대로 자신을 보여주세요'],
  수: ['온라인·SNS 활동을 늘리고 자신의 관심사를 공유하세요', '지적 대화가 시작되면 깊이 있게 이어나가세요', '감정을 좀 더 솔직하게 표현하는 연습을 해보세요'],
};

// 연애중 궁합 관계
const COMPAT_DESC: Record<Rel, { score: number; grade: string; summary: string; strengths: string[]; challenges: string[]; advice: string }> = {
  generated: {
    score: 90,
    grade: '천생연분 💛',
    summary: '상대가 나를 생(生)해주는 이상적인 관계입니다. 상대방에게서 끊임없이 영감과 힘을 받으며, 함께 있을수록 성장하는 특별한 인연입니다.',
    strengths: ['서로에게 긍정적 에너지를 주고받음', '어려울 때 상대가 든든한 버팀목이 됨', '함께하면 자연스럽게 발전하는 관계'],
    challenges: ['상대의 헌신을 당연히 여기지 않도록 주의', '받는 것에만 익숙해지지 않고 주는 연습 필요'],
    advice: '상대의 지지와 사랑에 진심 어린 감사를 표현하세요. 이 관계는 진심으로 아끼면 더욱 깊어집니다.',
  },
  generates: {
    score: 82,
    grade: '헌신의 인연 🌿',
    summary: '내가 상대를 생(生)해주는 헌신적인 관계입니다. 상대를 위해 아낌없이 베풀고 싶은 마음이 생기지만, 자신도 돌보는 균형이 필요합니다.',
    strengths: ['상대에게 안정감과 따뜻함을 줄 수 있음', '베푸는 사랑으로 신뢰 관계 형성', '관계에서 리더십을 자연스럽게 발휘'],
    challenges: ['일방적 헌신으로 소진될 위험', '상대가 나를 의존적으로 여길 수 있음'],
    advice: '베푸는 것도 중요하지만 당신의 감정과 필요도 솔직히 표현하세요. 건강한 경계선이 관계를 더 오래 이어줍니다.',
  },
  same: {
    score: 72,
    grade: '동류의 인연 🔄',
    summary: '같은 오행끼리의 관계입니다. 서로를 잘 이해하고 공감하지만, 경쟁심이나 비슷한 단점이 부딪힐 수 있습니다.',
    strengths: ['서로의 감정과 생각을 빠르게 이해', '공통 관심사가 많아 대화가 풍성함', '서로의 가치관이 비슷해 갈등이 적음'],
    challenges: ['비슷한 약점으로 서로 자극될 수 있음', '경쟁심이나 자존심 충돌 가능성'],
    advice: '서로의 강점을 칭찬하고 단점은 보완해주는 역할을 의식적으로 연습하세요. 차이를 인정하는 것이 더욱 단단한 관계를 만듭니다.',
  },
  dominates: {
    score: 65,
    grade: '긴장의 인연 ⚡',
    summary: '내가 상대를 극(剋)하는 강한 관계입니다. 내 에너지가 강하게 작용하여 상대를 이끌거나 압도할 수 있습니다.',
    strengths: ['관계에서 주도권을 자연스럽게 가짐', '상대방을 보호하고 싶은 마음이 강해짐', '강한 끌림과 열정이 생기는 관계'],
    challenges: ['상대가 위축되거나 눌릴 수 있음', '강압적이 되지 않도록 의식적 노력 필요'],
    advice: '상대의 의견을 충분히 경청하고 존중하세요. 관계에서 배려와 조율이 핵심입니다.',
  },
  dominated: {
    score: 60,
    grade: '도전의 인연 🌊',
    summary: '상대가 나를 극(剋)하는 도전적인 관계입니다. 강한 끌림이 있지만, 때로 상대방에게 압도당하는 느낌이 들 수 있습니다.',
    strengths: ['서로에 대한 강렬한 끌림', '상대가 나를 성장시키는 자극제 역할', '열정적이고 강렬한 관계'],
    challenges: ['상대에게 지나치게 의존하거나 맞추려는 경향', '자기 자신을 잃지 않도록 주의'],
    advice: '자신의 감정과 경계를 명확히 유지하세요. 상대를 사랑하되 자신도 사랑하는 균형이 이 관계의 핵심입니다.',
  },
};

// 연애중 팁
const DATING_TIPS: Record<Rel, string[]> = {
  generated: ['감사한 마음을 말과 행동으로 자주 표현하세요', '상대의 노력과 희생을 놓치지 말고 알아봐 주세요', '함께 성장하는 목표를 세워보세요'],
  generates: ['나의 감정과 필요를 솔직하게 말하는 연습을 하세요', '때로는 상대가 나를 도울 공간을 허용하세요', '과도한 희생보다 건강한 균형을 유지하세요'],
  same: ['서로의 다름을 의식적으로 찾아 보완하세요', '공통 관심사를 함께 발전시키는 프로젝트를 만들어보세요', '경쟁보다 협력이 이 관계를 꽃피웁니다'],
  dominates: ['상대의 말에 충분히 귀 기울이는 시간을 늘리세요', '결정을 함께 내리는 습관을 들여보세요', '상대의 공간과 독립성을 존중하세요'],
  dominated: ['자신의 의견과 감정을 당당하게 표현하세요', '관계에서 나의 가치와 역할을 명확히 하세요', '혼자 보내는 시간을 통해 자신을 재충전하세요'],
};

export interface LoveFortuneResult {
  status: 'solo' | 'dating';
  myElement: string;
  myStem: string;
  loveScore: number;
  loveGrade: string;
  loveText: string;
  // 솔로
  loveElement?: string;
  loveElementRole?: string;
  luckyMonths?: Array<{ month: number; score: number; reason: string }>;
  allMonthScores?: Array<{ month: number; score: number }>;
  partnerTraits?: string[];
  meetWhere?: string;
  soloAdvice?: string;
  tips: string[];
  // 연애중
  partnerElement?: string;
  partnerStem?: string;
  compatScore?: number;
  compatGrade?: string;
  compatSummary?: string;
  datingStrengths?: string[];
  datingChallenges?: string[];
  datingAdvice?: string;
}

export function getLoveFortune(
  birthYear: number, birthMonth: number, birthDay: number,
  birthHour: number = -1,
  gender: 'male' | 'female',
  status: 'solo' | 'dating',
  targetYear: number = new Date().getFullYear(),
  partnerYear?: number, partnerMonth?: number, partnerDay?: number,
  partnerHour: number = -1, partnerGender: 'male' | 'female' = 'female',
): LoveFortuneResult {
  const dayPillar = getDayPillar(birthYear, birthMonth, birthDay);
  const myElem = dayPillar.stemElement ?? '목';
  const myStem = dayPillar.stem;

  if (status === 'solo') {
    const loveElem = getLoveElem(myElem, gender);
    const loveRole = gender === 'male' ? '재성(財星)' : '관성(官星)';
    const loveElemInfo = LOVE_ELEM_DESC[loveElem] ?? LOVE_ELEM_DESC['목'];

    // 월별 점수 계산
    const monthScores: Array<{ month: number; score: number; reason: string }> = [];
    for (let m = 1; m <= 12; m++) {
      const mp = getMonthPillar(targetYear, m, 15, -1);
      const stemE = mp.stemElement ?? '목';
      const branchE = mp.branchElement ?? '목';
      const score = monthLoveScore(stemE, branchE, loveElem, myElem);
      const reason = getMonthReason(stemE, branchE, loveElem, myElem);
      monthScores.push({ month: m, score, reason });
    }

    const totalScore = calcSoloLoveScore(monthScores.map(m => m.score));
    const topMonths = [...monthScores].sort((a, b) => b.score - a.score).slice(0, 3);
    const grade =
      totalScore >= 85 ? '대길 ★★★' :
      totalScore >= 72 ? '길 ★★' :
      totalScore >= 60 ? '보통 ★' : '인내의 해';

    const loveText = SOLO_LOVE_TEXT[myElem]?.[gender] ?? '올해는 인연의 기운이 흐르는 특별한 시기입니다. 자신을 사랑하고 삶을 즐기는 모습이 가장 큰 매력이 됩니다.';
    const tips = SOLO_TIPS[myElem] ?? ['자신을 표현하는 데 더 적극적으로 임해보세요', '새로운 공간과 사람에게 마음을 열어보세요', '인연은 준비된 자에게 찾아옵니다'];

    return {
      status: 'solo',
      myElement: myElem,
      myStem,
      loveScore: totalScore,
      loveGrade: grade,
      loveText,
      loveElement: loveElem,
      loveElementRole: loveRole,
      luckyMonths: topMonths,
      allMonthScores: monthScores.map(({ month, score }) => ({ month, score })),
      partnerTraits: loveElemInfo.partnerTraits,
      meetWhere: loveElemInfo.meetWhere,
      soloAdvice: `올해 ${loveRole}인 ${loveElemInfo.name} 기운이 강한 달에 인연이 찾아올 가능성이 높습니다. ${topMonths.map(m => `${m.month}월`).join(', ')}을 주목하세요.`,
      tips,
    };
  }

  // 연애중
  const partYear = partnerYear ?? birthYear - 2;
  const partMonth = partnerMonth ?? birthMonth;
  const partDay = partnerDay ?? birthDay;
  const partnerDayPillar = getDayPillar(partYear, partMonth, partDay);
  const partElem = partnerDayPillar.stemElement ?? '화';
  const partStem = partnerDayPillar.stem;

  const rel = getRelation(myElem, partElem);
  const compat = COMPAT_DESC[rel];
  const tips = DATING_TIPS[rel];

  // 이 해의 기운이 관계에 미치는 영향
  const yearPillar = getYearPillar(targetYear);
  const yearElem = yearPillar.stemElement ?? '화';
  const yearRelToMe = getRelation(myElem, yearElem);
  let yearBonus = 0;
  if (yearRelToMe === 'generated') yearBonus = 5;
  else if (yearRelToMe === 'generates') yearBonus = 2;
  else if (yearRelToMe === 'dominated') yearBonus = -5;

  const finalScore = Math.min(98, Math.max(30, compat.score + yearBonus));
  const grade = finalScore >= 88 ? '천생연분 💛' : finalScore >= 78 ? '좋은 인연 💚' : finalScore >= 65 ? '보통 인연 💙' : '노력이 필요한 인연 ❤️';

  const loveText = `${myElem}(${myStem}) 일간과 ${partElem}(${partStem}) 일간의 만남입니다. ${compat.summary}`;

  return {
    status: 'dating',
    myElement: myElem,
    myStem,
    loveScore: finalScore,
    loveGrade: grade,
    loveText,
    partnerElement: partElem,
    partnerStem: partStem,
    compatScore: finalScore,
    compatGrade: compat.grade,
    compatSummary: compat.summary,
    datingStrengths: compat.strengths,
    datingChallenges: compat.challenges,
    datingAdvice: compat.advice,
    tips,
  };
}
