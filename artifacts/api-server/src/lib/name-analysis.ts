// 이름 풀이 (Name Analysis) - 수리사주 · 오행 성명학

// 한글 초성 오행 분류 (성음오행)
const CHOSUNG_ELEM: Record<string, string> = {
  ㄱ:'목', ㅋ:'목',
  ㄴ:'화', ㄷ:'화', ㄹ:'화', ㅌ:'화',
  ㅇ:'토', ㅎ:'토',
  ㅅ:'금', ㅈ:'금', ㅊ:'금',
  ㅁ:'수', ㅂ:'수', ㅍ:'수',
};

// 중성(모음) 음양 분류
const JUNGSUNG_YANG = ['ㅏ','ㅗ','ㅑ','ㅛ','ㅐ','ㅒ'];
const JUNGSUNG_YIN  = ['ㅓ','ㅜ','ㅕ','ㅠ','ㅔ','ㅖ','ㅣ'];

// 수리사주 81수 의미 (원형이정 81수)
const SURI_MEANINGS: Record<number, { name: string; fortune: string; score: number }> = {
  1:  { name: '태초수(太初數)', fortune: '모든 것의 시작을 의미합니다. 지도자적 기질이 있으며 강한 의지와 추진력으로 성공을 이룹니다.', score: 88 },
  2:  { name: '분리수(分離數)', fortune: '둘이 나뉘는 기운으로 고독과 이별의 기운이 있습니다. 협력과 인내가 필요합니다.', score: 45 },
  3:  { name: '명예수(名譽數)', fortune: '문창성의 기운으로 문학·예술에 재능이 있으며, 명예와 인기를 얻는 이름입니다.', score: 82 },
  4:  { name: '파멸수(破滅數)', fortune: '변화와 파란의 기운이 강합니다. 혁신적 사고가 장점이지만 안정을 추구해야 합니다.', score: 42 },
  5:  { name: '대성수(大成數)', fortune: '오행이 조화를 이루는 기운으로 어떤 일이든 성사시키는 능력이 있습니다.', score: 90 },
  6:  { name: '천복수(天福數)', fortune: '하늘이 내린 복의 수입니다. 가정이 화목하고 풍요로운 삶을 누립니다.', score: 85 },
  7:  { name: '독립수(獨立數)', fortune: '강한 독립심과 의지력의 수입니다. 혼자 힘으로 길을 개척하는 능력이 뛰어납니다.', score: 78 },
  8:  { name: '발전수(發展數)', fortune: '꾸준한 노력으로 크게 발전하는 수입니다. 인내와 성실함이 성공의 열쇠입니다.', score: 83 },
  9:  { name: '고난수(苦難數)', fortune: '지혜는 뛰어나지만 고난이 따르는 수입니다. 인내하면 말년에 크게 성공합니다.', score: 52 },
  10: { name: '공허수(空虛數)', fortune: '화려하지만 내실이 부족할 수 있습니다. 겸손과 실속을 추구하는 것이 중요합니다.', score: 48 },
  11: { name: '중도수(中道數)', fortune: '중간에서 조화를 이루는 수입니다. 화합을 중시하며 안정적인 삶을 이끕니다.', score: 72 },
  12: { name: '고독수(孤獨數)', fortune: '고독과 시련의 수이지만, 내면의 성숙을 통해 인생 후반에 빛을 발합니다.', score: 50 },
  13: { name: '지혜수(智慧數)', fortune: '총명하고 지략이 뛰어납니다. 학문과 연구, 전문직에서 두각을 나타냅니다.', score: 80 },
  14: { name: '파란수(波瀾數)', fortune: '파란만장한 기운으로 변화가 많은 삶입니다. 안정적 기반 마련이 중요합니다.', score: 46 },
  15: { name: '복덕수(福德數)', fortune: '복과 덕이 함께하는 길한 수입니다. 인덕이 넘치고 주변의 도움을 받으며 성공합니다.', score: 88 },
  16: { name: '후덕수(厚德數)', fortune: '넓은 아량과 후덕한 인품으로 많은 사람에게 존경받습니다.', score: 82 },
  17: { name: '강건수(剛健數)', fortune: '강하고 건실한 기운으로 어떤 역경도 이겨냅니다. 체육·군·경 분야에 적합합니다.', score: 76 },
  18: { name: '발달수(發達數)', fortune: '꾸준히 발달하는 기운으로 사업이나 직장에서 안정적으로 성장합니다.', score: 80 },
  19: { name: '장애수(障礙數)', fortune: '성공을 향해 가는 길에 장애가 많은 수입니다. 불굴의 의지로 극복해야 합니다.', score: 48 },
  20: { name: '허무수(虛無數)', fortune: '허무와 무상함의 기운입니다. 실속을 차리고 현실에 집중하는 것이 필요합니다.', score: 42 },
  21: { name: '두령수(頭領數)', fortune: '으뜸이 되는 수로 리더십이 뛰어나며 조직을 이끄는 능력이 탁월합니다.', score: 90 },
  22: { name: '중절수(中折數)', fortune: '중간에 꺾이는 기운이 있어 인내가 필요합니다. 끈기로 완주하면 결실을 맺습니다.', score: 50 },
  23: { name: '공명수(功名數)', fortune: '이름을 날리는 수입니다. 공직이나 예술, 사업에서 명성을 얻습니다.', score: 85 },
  24: { name: '입신수(立身數)', fortune: '스스로 일어서는 기운입니다. 노력과 성실함으로 사회적으로 인정받습니다.', score: 80 },
  25: { name: '영달수(榮達數)', fortune: '영화롭게 발달하는 수입니다. 총명함과 성실함으로 사회 각 분야에서 성공합니다.', score: 83 },
  26: { name: '변란수(變亂數)', fortune: '변화와 혼란의 기운이 있습니다. 계획적 접근과 위기 관리가 중요합니다.', score: 46 },
  27: { name: '중절수(中絶數)', fortune: '좋은 시작이 중도에 막히는 기운입니다. 신중한 판단이 필요합니다.', score: 48 },
  28: { name: '파란수(波瀾數)', fortune: '강한 의지력이 있으나 파란이 많습니다. 안정적인 삶을 위해 신중함이 필요합니다.', score: 50 },
  29: { name: '지모수(智謀數)', fortune: '지략과 모략이 뛰어난 수입니다. 기획·전략·연구 분야에서 두각을 나타냅니다.', score: 82 },
  30: { name: '비상수(非常數)', fortune: '평범하지 않은 운명의 수입니다. 성패가 극단적으로 갈릴 수 있어 신중함이 필요합니다.', score: 60 },
  31: { name: '왕성수(旺盛數)', fortune: '기운이 왕성하게 솟아나는 수입니다. 적극적인 성격으로 사업이나 직장에서 성공합니다.', score: 86 },
  32: { name: '행운수(幸運數)', fortune: '행운이 따르는 수입니다. 뜻밖의 행운이 자주 찾아오며 주변의 도움을 받습니다.', score: 85 },
  33: { name: '창성수(昌盛數)', fortune: '크게 번창하는 수입니다. 리더십이 뛰어나고 사회적으로 크게 성공합니다.', score: 88 },
  34: { name: '파괴수(破壞數)', fortune: '파괴의 기운이 있는 수입니다. 강한 추진력이 있으나 갈등 관리가 필요합니다.', score: 44 },
  35: { name: '평화수(平和數)', fortune: '평화롭고 안정적인 수입니다. 예술이나 학문 분야에서 큰 성과를 거둡니다.', score: 80 },
  36: { name: '의협수(義俠數)', fortune: '의로움과 협기의 수입니다. 정의로운 성품으로 주변에서 신뢰를 받습니다.', score: 74 },
  37: { name: '인덕수(仁德數)', fortune: '어질고 덕스러운 수입니다. 인격이 고매하여 사람들에게 존경받으며 성공합니다.', score: 82 },
  38: { name: '문예수(文藝數)', fortune: '문학과 예술의 기운입니다. 창의적 재능이 뛰어나 예술 분야에서 빛을 발합니다.', score: 76 },
  39: { name: '장성수(長星數)', fortune: '밝은 별처럼 크게 빛나는 수입니다. 사회적 명성을 얻고 지도자가 됩니다.', score: 84 },
  40: { name: '무상수(無常數)', fortune: '무상한 변화의 기운입니다. 안정적인 삶의 기반을 다지는 것이 최우선입니다.', score: 46 },
  41: { name: '대공수(大功數)', fortune: '큰 공을 세우는 수입니다. 강한 리더십으로 큰 일을 이루어냅니다.', score: 86 },
  42: { name: '삼재수(三災數)', fortune: '삼재의 기운이 있는 수입니다. 무리한 욕심을 버리고 현실에 충실해야 합니다.', score: 44 },
  43: { name: '산란수(散亂數)', fortune: '분산되는 기운입니다. 집중력을 높이고 하나에 전념하는 것이 중요합니다.', score: 48 },
  44: { name: '마장수(魔障數)', fortune: '마장이 있는 수입니다. 어려움이 많지만 굴하지 않으면 뒤늦게 성공합니다.', score: 42 },
  45: { name: '대지수(大智數)', fortune: '큰 지혜의 수입니다. 풍부한 지식과 혜안으로 사회에 공헌하고 성공합니다.', score: 84 },
  46: { name: '고난수(苦難數)', fortune: '고난이 많은 수입니다. 역경을 딛고 일어서면 말년에 행복을 찾습니다.', score: 46 },
  47: { name: '출세수(出世數)', fortune: '세상에 이름을 알리는 수입니다. 관직이나 사업에서 크게 성공합니다.', score: 82 },
  48: { name: '종묘수(宗廟數)', fortune: '지혜와 덕망을 갖춘 수입니다. 주변을 이끄는 역할을 하며 성공합니다.', score: 80 },
  49: { name: '변전수(變轉數)', fortune: '변화와 전환의 수입니다. 유연하게 상황에 적응하면 성공할 수 있습니다.', score: 60 },
  50: { name: '성패수(成敗數)', fortune: '성공과 실패가 교차하는 수입니다. 신중한 판단과 지속적인 노력이 필요합니다.', score: 55 },
};

function getSuriMeaning(num: number): { name: string; fortune: string; score: number } {
  const n = ((num - 1) % 80) + 1;
  return SURI_MEANINGS[n] ?? { name: `${n}수`, fortune: '다양한 경험을 통해 성장하는 운명입니다.', score: 65 };
}

function decomposeHangul(char: string): { chosung: string; jungsung: string; jongsung: string | null } | null {
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  const CHOSUNGS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNGSUNGS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONGSUNGS = [null,'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const jong = code % 28;
  const jung = ((code - jong) / 28) % 21;
  const cho  = Math.floor(code / 28 / 21);
  return { chosung: CHOSUNGS[cho], jungsung: JUNGSUNGS[jung], jongsung: JONGSUNGS[jong] };
}

// 한자 획수 근사 (syllable 기반 대략적 수치)
const STROKE_APPROX: Record<string, number> = {
  ㄱ:2, ㄲ:4, ㄴ:2, ㄷ:3, ㄸ:6, ㄹ:5, ㅁ:4, ㅂ:4, ㅃ:8, ㅅ:2, ㅆ:4,
  ㅇ:1, ㅈ:3, ㅉ:6, ㅊ:4, ㅋ:3, ㅌ:4, ㅍ:4, ㅎ:3,
  ㅏ:2, ㅐ:3, ㅑ:3, ㅒ:4, ㅓ:2, ㅔ:3, ㅕ:3, ㅖ:4, ㅗ:2, ㅘ:4,
  ㅙ:5, ㅚ:3, ㅛ:3, ㅜ:2, ㅝ:4, ㅞ:5, ㅟ:3, ㅠ:3, ㅡ:1, ㅢ:2, ㅣ:1,
};

function getSyllableStrokes(char: string): number {
  const d = decomposeHangul(char);
  if (!d) return 3;
  let strokes = (STROKE_APPROX[d.chosung] ?? 2) + (STROKE_APPROX[d.jungsung] ?? 2);
  if (d.jongsung) strokes += (STROKE_APPROX[d.jongsung] ?? 1);
  return strokes;
}

function getSyllableElement(char: string): string {
  const d = decomposeHangul(char);
  if (!d) return '토';
  return CHOSUNG_ELEM[d.chosung] ?? '토';
}

function getSyllableYinYang(char: string): '양' | '음' | '중' {
  const d = decomposeHangul(char);
  if (!d) return '중';
  if (JUNGSUNG_YANG.includes(d.jungsung)) return '양';
  if (JUNGSUNG_YIN.includes(d.jungsung)) return '음';
  return '중';
}

const ELEM_TRAITS: Record<string, { positive: string; negative: string; career: string }> = {
  목: { positive: '성장·창의·인자함·진취성', negative: '우유부단·감정 기복', career: '교육·의료·환경·문화·예술·스포츠' },
  화: { positive: '열정·사교·명석함·리더십', negative: '충동·과장·급한 성격', career: '미디어·연예·마케팅·정치·금융' },
  토: { positive: '신뢰·성실·안정·포용력', negative: '고집·변화에 느림', career: '부동산·금융·농업·건축·행정' },
  금: { positive: '결단력·완벽주의·정의감·분석력', negative: '냉정함·완고함', career: '법률·군·경찰·IT·엔지니어링·금융' },
  수: { positive: '지혜·유연·통찰·인내', negative: '불안·우유부단·소극성', career: '연구·철학·심리·무역·외교·항해' },
};

const ELEM_HARMONY: Record<string, Record<string, string>> = {
  목: { 목:'비슷한 기운으로 경쟁도 있지만 서로를 이해합니다', 화:'목이 화를 생하여 활기와 열정이 넘칩니다', 토:'목이 토를 극하여 강인함이 드러납니다', 금:'금이 목을 극하여 절제와 인내가 필요합니다', 수:'수가 목을 생하여 지혜로운 성장을 합니다' },
  화: { 목:'목이 화를 생하여 응원과 지지를 받습니다', 화:'같은 열정끼리 시너지가 큽니다', 토:'화가 토를 생하여 안정을 도모합니다', 금:'화가 금을 극하여 추진력이 강합니다', 수:'수가 화를 극하여 균형을 찾는 노력이 필요합니다' },
  토: { 목:'목이 토를 극하여 자극을 받아 성장합니다', 화:'화가 토를 생하여 든든한 지원을 받습니다', 토:'같은 안정감으로 꾸준히 나아갑니다', 금:'토가 금을 생하여 현실적 성과를 냅니다', 수:'토가 수를 극하여 방향성을 제시합니다' },
  금: { 목:'금이 목을 극하여 리더십이 발휘됩니다', 화:'화가 금을 극하여 열정의 조절이 필요합니다', 토:'토가 금을 생하여 든든한 지원군이 됩니다', 금:'같은 결단력으로 강한 팀을 이룹니다', 수:'금이 수를 생하여 지혜와 결단이 만납니다' },
  수: { 목:'수가 목을 생하여 풍요로운 성장을 돕습니다', 화:'수가 화를 극하여 열정에 지혜를 더합니다', 토:'토가 수를 극하여 안정을 찾는 도전입니다', 금:'금이 수를 생하여 분석과 통찰이 빛납니다', 수:'같은 유연함으로 깊은 유대를 이룹니다' },
};

export interface NameAnalysisData {
  name: string;
  syllables: number;
  strokes: { char: string; strokes: number }[];
  wonGyeok: number; wonGyeokSuri: { name: string; fortune: string; score: number };
  hyeongGyeok: number; hyeongGyeokSuri: { name: string; fortune: string; score: number };
  iGyeok: number; iGyeokSuri: { name: string; fortune: string; score: number };
  jeongGyeok: number; jeongGyeokSuri: { name: string; fortune: string; score: number };
  overallScore: number;
  overallGrade: string;
  elements: string[];
  dominantElement: string;
  elementTrait: { positive: string; negative: string; career: string };
  yinYangBalance: string;
  personality: string;
  luckAreas: string[];
  careerSuggestions: string;
  caution: string;
  elementFlow: string;
}

export function analyzeName(name: string): NameAnalysisData {
  // 한글만 추출
  const cleaned = name.replace(/[^가-힣]/g, '');
  if (!cleaned) throw new Error('한글 이름을 입력해주세요.');

  const chars = Array.from(cleaned);
  const strokes = chars.map(c => ({ char: c, strokes: getSyllableStrokes(c) }));
  const sv = strokes.map(s => s.strokes);

  // 수리사주 4격 계산
  // 원격: 성의 획수 (첫 글자)
  const wonGyeok = sv[0] ?? 1;
  // 형격: 성 + 이름 첫 글자 (두 번째)
  const hyeongGyeok = (sv[0] ?? 0) + (sv[1] ?? 0);
  // 이격: 이름 첫 글자 + 이름 둘째 (2음절 이름은 이름 첫 + 성)
  const iGyeok = chars.length >= 3
    ? (sv[1] ?? 0) + (sv[2] ?? 0)
    : (sv[0] ?? 0) + (sv[1] ?? 0);
  // 정격: 전체 합
  const jeongGyeok = sv.reduce((a, b) => a + b, 0);

  const wonG = getSuriMeaning(wonGyeok);
  const hyeongG = getSuriMeaning(hyeongGyeok);
  const iG = getSuriMeaning(iGyeok);
  const jeongG = getSuriMeaning(jeongGyeok);

  const overallScore = Math.round((wonG.score * 0.2 + hyeongG.score * 0.3 + iG.score * 0.2 + jeongG.score * 0.3));
  const overallGrade =
    overallScore >= 85 ? '대길(大吉)' :
    overallScore >= 75 ? '길(吉)' :
    overallScore >= 60 ? '중길(中吉)' :
    overallScore >= 45 ? '보통(普通)' : '주의 필요';

  // 오행 분석
  const elements = chars.map(getSyllableElement);
  const elemCount: Record<string, number> = {};
  for (const e of elements) elemCount[e] = (elemCount[e] ?? 0) + 1;
  const dominantElement = Object.entries(elemCount).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '토';
  const elementTrait = ELEM_TRAITS[dominantElement] ?? ELEM_TRAITS['토'];

  // 음양 분석
  const yinYangs = chars.map(getSyllableYinYang);
  const yangCount = yinYangs.filter(y => y === '양').length;
  const yinCount  = yinYangs.filter(y => y === '음').length;
  const yinYangBalance =
    yangCount > yinCount + 1 ? '양기(陽氣)가 강합니다. 활동적이고 외향적인 성격이 두드러집니다.' :
    yinCount > yangCount + 1 ? '음기(陰氣)가 강합니다. 내성적이고 신중하며 사려 깊은 성격입니다.' :
    '음양이 조화롭습니다. 균형 잡힌 성격으로 어느 환경에나 잘 적응합니다.';

  // 성격 설명
  const personality =
    `이름의 주된 오행은 ${dominantElement}(${{'목':'木','화':'火','토':'土','금':'金','수':'水'}[dominantElement]})입니다. ` +
    `${elementTrait.positive}의 기운이 강하며, ${elementTrait.negative}에 주의가 필요합니다.`;

  // 행운 영역
  const luckAreas: string[] = [
    `총 획수 정격 ${jeongGyeok}획 — ${jeongG.name}`,
    `형격 ${hyeongGyeok}획의 ${hyeongG.name}이 직업운을 주관합니다`,
    `이격 ${iGyeok}획의 ${iG.name}이 대인관계운을 주관합니다`,
  ];

  // 오행 흐름
  const uniqueElems = [...new Set(elements)];
  const elemFlow =
    uniqueElems.length === 1
      ? `이름 전체가 ${uniqueElems[0]}의 기운으로 가득합니다. 집중력이 강하지만 다양성이 필요합니다.`
      : uniqueElems.length === 2
      ? `${uniqueElems[0]}과 ${uniqueElems[1]}의 기운이 어우러집니다. ${ELEM_HARMONY[uniqueElems[0]]?.[uniqueElems[1]] ?? '두 기운이 조화를 이룹니다.'}`
      : `${uniqueElems.join('·')}의 다양한 기운이 어우러져 풍부한 인생을 예고합니다.`;

  return {
    name: cleaned, syllables: chars.length, strokes,
    wonGyeok, wonGyeokSuri: wonG,
    hyeongGyeok, hyeongGyeokSuri: hyeongG,
    iGyeok, iGyeokSuri: iG,
    jeongGyeok, jeongGyeokSuri: jeongG,
    overallScore, overallGrade,
    elements, dominantElement, elementTrait,
    yinYangBalance, personality, luckAreas,
    careerSuggestions: elementTrait.career,
    caution: `${elementTrait.negative}에 유의하세요.`,
    elementFlow: elemFlow,
  };
}
