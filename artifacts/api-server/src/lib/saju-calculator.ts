// Korean Saju (Four Pillars of Destiny) Calculator
// Based on traditional Korean/Chinese astrology

export const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const HEAVENLY_STEMS_EN = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const EARTHLY_BRANCHES_EN = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
export const ZODIAC_KR = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// Five elements for heavenly stems (pairs)
export const STEM_ELEMENTS = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
// Five elements for earthly branches
export const BRANCH_ELEMENTS = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

// Heavenly stems polarity (양/음)
export const STEM_POLARITY = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음'];
export const BRANCH_POLARITY = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음', '양', '음'];

// Sexagenary cycle (60간지)
export function getSexagenaryIndex(year: number): number {
  // Jia Zi year starts at 4 BC (or using 4 as base)
  return ((year - 4) % 60 + 60) % 60;
}

export function getGanzi(index: number): { stem: string; branch: string; stemElement: string; branchElement: string; zodiac: string; stemIndex: number; branchIndex: number } {
  const stemIndex = index % 10;
  const branchIndex = index % 12;
  return {
    stem: HEAVENLY_STEMS[stemIndex],
    branch: EARTHLY_BRANCHES[branchIndex],
    stemElement: STEM_ELEMENTS[stemIndex],
    branchElement: BRANCH_ELEMENTS[branchIndex],
    zodiac: ZODIAC_KR[branchIndex],
    stemIndex,
    branchIndex
  };
}

// Calculate year pillar
export function getYearPillar(year: number) {
  const idx = getSexagenaryIndex(year);
  return getGanzi(idx);
}

// Month pillar - based on solar terms (절기)
// The saju month changes at each month-starting solar term, NOT on the 1st of the month.
// Month branches: 인(2)=입춘, 묘(3)=경칩, 진(4)=청명, 사(5)=입하, 오(6)=망종,
//                 미(7)=소서, 신(8)=입추, 유(9)=백로, 술(10)=한로, 해(11)=입동,
//                 자(0)=대설, 축(1)=소한

// 입춘 정확 시각 (KST, 24시간제 정수 시)
// 같은 날 태어난 경우 이 시각 이전 → 전년도(이전 간지년), 이후 → 당해년도
const IPCHUN_HOUR: Record<number, number> = {
  1990: 13, 1991: 19, 1992: 1,  1993: 7,  1994: 13, 1995: 18,
  1996: 0,  1997: 5,  1998: 22, 1999: 17, 2000: 22, 2001: 5,
  2002: 10, 2003: 16, 2004: 22, 2005: 3,  2006: 9,  2007: 15,
  2008: 21, 2009: 3,  2010: 9,  2011: 14, 2012: 20, 2013: 2,
  2014: 8,  2015: 14, 2016: 20, 2017: 2,  2018: 7,  2019: 13,
  2020: 19, 2021: 1,  2022: 7,  2023: 13, 2024: 18, 2025: 0,
  2026: 6,  2027: 12, 2028: 17, 2029: 23, 2030: 5,  2031: 11,
  2032: 17, 2033: 23, 2034: 4,  2035: 10,
};

// Precise solar term days for month-starting terms (year → [입춘Feb, 경칩Mar, 청명Apr, 입하May, 망종Jun, 소서Jul, 입추Aug, 백로Sep, 한로Oct, 입동Nov, 대설Dec, 소한Jan_next])
const MONTH_TERM_DAYS: Record<number, number[]> = {
  1990: [4,6,5,5,6,7,8,8,8,8,7,6], 1991: [4,6,5,6,6,7,8,8,8,8,7,6],
  1992: [4,5,4,5,5,7,7,7,8,7,7,5], 1993: [4,6,5,5,6,7,7,8,8,8,7,6],
  1994: [4,6,5,5,6,7,8,8,8,8,7,6], 1995: [4,6,5,6,6,7,8,8,8,8,7,6],
  1996: [4,5,4,5,5,6,7,7,8,7,7,5], 1997: [4,6,5,5,6,7,7,8,8,8,7,6],
  1998: [4,6,5,5,6,7,8,8,8,8,7,6], 1999: [4,6,5,6,6,7,8,8,8,8,7,6],
  2000: [4,5,4,5,5,6,7,7,8,7,7,5], 2001: [4,5,5,5,5,7,7,7,8,7,7,5],
  2002: [4,6,5,5,6,7,7,8,8,8,7,6], 2003: [4,6,5,6,6,7,8,8,8,8,7,6],
  2004: [4,5,4,5,5,6,7,7,7,7,7,5], 2005: [4,5,5,5,5,7,7,7,8,7,7,6],
  2006: [4,6,5,5,6,7,7,8,8,8,7,6], 2007: [4,6,5,5,6,7,8,8,8,8,7,6],
  2008: [4,5,4,5,5,6,7,7,7,7,7,5], 2009: [4,5,4,5,5,7,7,7,8,7,7,5],
  2010: [4,6,5,5,6,7,7,8,8,8,7,6], 2011: [4,6,5,6,6,7,8,8,8,8,7,6],
  2012: [4,5,4,5,5,6,7,7,7,7,7,5], 2013: [4,5,5,5,5,7,7,7,8,7,7,5],
  2014: [4,6,5,5,6,7,7,8,8,8,7,6], 2015: [4,6,5,5,6,7,7,8,8,8,7,6],
  2016: [4,5,4,5,5,6,7,7,7,7,7,5], 2017: [3,5,4,5,5,7,7,7,8,7,7,5],
  2018: [4,6,5,5,6,7,7,8,8,8,7,6], 2019: [4,6,5,5,6,7,8,8,8,8,7,6],
  2020: [4,5,4,5,5,6,7,7,8,7,7,6], 2021: [3,5,4,5,5,7,7,7,8,7,7,5],
  2022: [4,6,5,5,6,7,7,8,8,8,7,6], 2023: [4,6,5,6,6,7,8,8,8,8,7,6],
  2024: [4,5,4,5,5,6,7,7,8,7,7,6], 2025: [3,5,4,5,5,7,7,7,8,7,7,5],
  2026: [4,6,5,5,6,7,7,8,8,8,7,6], 2027: [3,5,5,5,6,7,7,7,8,7,7,6],
  2028: [4,5,4,5,5,6,7,7,7,7,7,5], 2029: [3,5,4,5,5,7,7,7,8,7,7,5],
  2030: [4,6,5,5,6,7,7,8,8,8,7,6], 2031: [4,6,5,6,6,7,8,8,8,8,7,6],
  2032: [4,5,4,5,5,6,7,7,7,7,7,5], 2033: [3,5,4,5,5,7,7,7,8,7,7,5],
  2034: [4,6,5,5,6,7,7,8,8,8,7,6], 2035: [4,6,5,5,6,7,8,8,8,8,7,6],
};

// Returns [month (1-12 solar), day] of the month-starting term for given saju month branch
// branchIdx: 2=인(입춘/Feb), 3=묘(경칩/Mar), 4=진(청명/Apr), 5=사(입하/May),
//            6=오(망종/Jun), 7=미(소서/Jul), 8=신(입추/Aug), 9=유(백로/Sep),
//            10=술(한로/Oct), 11=해(입동/Nov), 0=자(대설/Dec), 1=축(소한/Jan)
function getMonthTermDay(year: number, branchIdx: number): { month: number; day: number } {
  const data = MONTH_TERM_DAYS[year];
  // Array index in MONTH_TERM_DAYS: 0=입춘(Feb,branch2), 1=경칩(Mar,branch3), ...
  // branch 2=index 0, branch 3=index 1, ..., branch 11=index 9, branch 0=index 10, branch 1=index 11
  const termIdx = branchIdx === 0 ? 10 : branchIdx === 1 ? 11 : branchIdx - 2;
  
  const TERM_MONTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]; // solar month for each term
  const termMonth = TERM_MONTHS[termIdx];
  
  // Use precise data if available, otherwise use approximate
  const APPROX_DAYS = [4, 6, 5, 6, 6, 7, 7, 8, 8, 7, 7, 6]; // approximate day per term
  const termDay = data ? data[termIdx] : APPROX_DAYS[termIdx];
  
  return { month: termMonth, day: termDay };
}

// Find the saju year for a given date.
// The saju year resets ONLY at 입춘 (branch 2, ~Feb 4).
// birthHour: -1 = unknown, 0-23 = KST hour
export function getSajuYear(year: number, month: number, day: number, birthHour: number = -1): number {
  const targetDate = new Date(year, month - 1, day);
  let sajuYear = year - 1; // default: before first ipchun we encounter

  // Check 입춘 in nearby years
  for (const ty of [year - 1, year]) {
    const { month: tm, day: td } = getMonthTermDay(ty, 2); // branch 2 = 입춘, Feb
    const ipchunDate = new Date(ty, tm - 1, td);

    if (ipchunDate < targetDate) {
      // 생일이 입춘일 이후 → 당해 사주년
      sajuYear = ty;
    } else if (ipchunDate.getTime() === targetDate.getTime()) {
      // 생일이 입춘과 같은 날 → 시각 비교 필요
      const ipchunHour = IPCHUN_HOUR[ty] ?? 4;
      if (birthHour !== -1) {
        // 출생 시각 알 때: 입춘 시각 이후면 새 간지년
        if (birthHour >= ipchunHour) sajuYear = ty;
      } else {
        // 출생 시각 모를 때: 입춘이 정오 이전이면 새 간지년(대부분 이후),
        // 정오 이후이면 구 간지년(대부분 이전)
        if (ipchunHour < 12) sajuYear = ty;
        // ipchunHour >= 12: 보수적으로 이전 간지년 유지
      }
    }
    // ipchunDate > targetDate: 아직 입춘 전 → 업데이트 안 함
  }
  return sajuYear;
}

// Determine which saju month branch a date belongs to, plus the saju year for stem calculation
function getSajuMonthBranch(year: number, month: number, day: number, birthHour: number = -1): { branchIdx: number; sajuYear: number } {
  const targetDate = new Date(year, month - 1, day);

  // Build chronological list of all month-starting terms around the target date
  const terms: Array<{ branch: number; year: number; month: number; day: number }> = [];
  for (const termYear of [year - 1, year, year + 1]) {
    for (let b = 0; b < 12; b++) {
      const { month: tm, day: td } = getMonthTermDay(termYear, b);
      terms.push({ branch: b, year: termYear, month: tm, day: td });
    }
  }
  terms.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });

  // Find the most recently passed month-starting term
  let currentBranch = 1; // fallback: 축월
  for (const term of terms) {
    const termDate = new Date(term.year, term.month - 1, term.day);
    if (termDate < targetDate) {
      currentBranch = term.branch;
    } else if (termDate.getTime() === targetDate.getTime()) {
      // 생일이 절기 당일 → 절기 발생 시각과 비교 필요
      if (term.branch === 2) {
        // 입춘: 정확한 KST 시각 테이블 사용
        const ipchunHour = IPCHUN_HOUR[term.year] ?? 4;
        if (birthHour !== -1) {
          if (birthHour >= ipchunHour) currentBranch = term.branch;
        } else {
          // 시각 모를 때: 입춘이 정오 이전이면 대부분 이후(새 월), 정오 이후면 이전(구 월)
          if (ipchunHour < 12) currentBranch = term.branch;
        }
      } else {
        // 다른 절기: 절기 당일부터 새 월 시작 (한국 사주 표준)
        // 출생 시각을 모를 때도 절기 당일은 새 월로 취급
        // (시각을 알 경우 실제 절기 발생 시각과 비교하면 더 정확하나, 데이터 미비)
        currentBranch = term.branch;
      }
    }
  }

  // The saju year is determined solely by 입춘, not by month boundaries
  const sajuYear = getSajuYear(year, month, day, birthHour);

  return { branchIdx: currentBranch, sajuYear };
}

export function getMonthPillar(year: number, month: number, day: number, birthHour: number = -1) {
  const { branchIdx, sajuYear } = getSajuMonthBranch(year, month, day, birthHour);

  // The month stem is determined by the saju year's heavenly stem.
  // 인월(寅月) always starts at stem = (yearStem * 2 + 2) % 10 (오호둔 규칙).
  // Each subsequent month adds 1 to the stem. Offset = (branch - 2 + 12) % 12.
  // Formula: monthStemIdx = (yearStem*2 + 2 + (branch-2+12)%12) % 10
  // Verification:
  //   갑(0) year: 인월(2)=(0*2+2+0)%10=2=병 ✓, 묘(3)=3=정 ✓
  //   을(1) year: 자월(0)=(1*2+2+10)%10=14%10=4=무 ✓(무자)
  //   병(2) year: 인월(2)=6=경 ✓, 묘(3)=7=신 ✓, 자월(0)=(6+10)%10=6=경 ✓
  const sajuYearStemIdx = getSexagenaryIndex(sajuYear) % 10;
  const monthStemIdx = (sajuYearStemIdx * 2 + 2 + (branchIdx - 2 + 12) % 12) % 10;

  return {
    stem: HEAVENLY_STEMS[monthStemIdx],
    branch: EARTHLY_BRANCHES[branchIdx],
    stemElement: STEM_ELEMENTS[monthStemIdx],
    branchElement: BRANCH_ELEMENTS[branchIdx],
    zodiac: ZODIAC_KR[branchIdx],
    stemIndex: monthStemIdx,
    branchIndex: branchIdx
  };
}

// Day pillar calculation (using Julian Day Number)
export function getDayPillar(year: number, month: number, day: number) {
  // Calculate Julian Day Number
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  const REF_JDN = 2451545; // JDN for Jan 1, 2000
  const REF_IDX = 54; // 무오 (戊午) - Jan 1, 2000 is index 54 in sexagenary cycle
  // Verification: Jan 1, 2024 (diff=8766) → (8766+54)%60 = 0 = 갑자 ✓
  // Verification: Mar 17, 2026 (diff=9572) → (9572+54)%60 = 26 = 경인 ✓
  
  const diff = jdn - REF_JDN;
  const idx = ((diff + REF_IDX) % 60 + 60) % 60;
  
  return getGanzi(idx);
}

// Hour pillar calculation
// Korean time periods (12 earthly branches for 24 hours, each 2 hours)
const HOUR_BRANCHES = [
  { start: 23, end: 1, branch: 0 },   // 자시 (23:00-01:00)
  { start: 1, end: 3, branch: 1 },    // 축시
  { start: 3, end: 5, branch: 2 },    // 인시
  { start: 5, end: 7, branch: 3 },    // 묘시
  { start: 7, end: 9, branch: 4 },    // 진시
  { start: 9, end: 11, branch: 5 },   // 사시
  { start: 11, end: 13, branch: 6 },  // 오시
  { start: 13, end: 15, branch: 7 },  // 미시
  { start: 15, end: 17, branch: 8 },  // 신시
  { start: 17, end: 19, branch: 9 },  // 유시
  { start: 19, end: 21, branch: 10 }, // 술시
  { start: 21, end: 23, branch: 11 }, // 해시
];

export function getHourBranchIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0; // 자시
  return Math.floor((hour + 1) / 2);
}

export function getHourPillar(dayStemIdx: number, hour: number) {
  const branchIdx = getHourBranchIndex(hour);
  
  // Hour stem base depends on day stem
  const hourStemBases = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]; // 갑기=갑, 을경=병, ...
  const baseStemIdx = hourStemBases[dayStemIdx % 10];
  const stemIdx = (baseStemIdx + branchIdx) % 10;
  
  return {
    stem: HEAVENLY_STEMS[stemIdx],
    branch: EARTHLY_BRANCHES[branchIdx],
    stemElement: STEM_ELEMENTS[stemIdx],
    branchElement: BRANCH_ELEMENTS[branchIdx],
    zodiac: ZODIAC_KR[branchIdx],
    stemIndex: stemIdx,
    branchIndex: branchIdx
  };
}

// Count elements in saju
export function countElements(pillars: Array<{ stemElement: string; branchElement: string }>) {
  const count = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const elemMap: Record<string, keyof typeof count> = {
    '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water'
  };
  
  for (const pillar of pillars) {
    if (elemMap[pillar.stemElement]) count[elemMap[pillar.stemElement]]++;
    if (elemMap[pillar.branchElement]) count[elemMap[pillar.branchElement]]++;
  }
  
  return count;
}

// Get dominant and lacking elements
export function getElementStats(count: { wood: number; fire: number; earth: number; metal: number; water: number }) {
  const elemNames: Record<string, string> = {
    wood: '목', fire: '화', earth: '토', metal: '금', water: '수'
  };
  
  let maxKey = 'wood', minKey = 'wood';
  let maxVal = 0, minVal = Infinity;
  
  for (const [key, val] of Object.entries(count)) {
    if (val > maxVal) { maxVal = val; maxKey = key; }
    if (val < minVal) { minVal = val; minKey = key; }
  }
  
  return {
    dominant: elemNames[maxKey] || '목',
    lacking: elemNames[minKey] || '수'
  };
}

// Get personality description based on day master element
export function getPersonality(dayStem: string, dayElement: string, dominantElement: string): string {
  const byStem: Record<string, string> = {
    '갑': '갑목(甲木) 일간입니다. 거목(巨木)처럼 하늘을 향해 곧게 뻗는 기상으로, 타고난 개척자입니다. 한번 방향을 정하면 굽히지 않는 강한 의지와 리더십이 있으며, 주변 사람들에게 든든한 기둥 같은 존재가 됩니다. 인자함과 고집이 공존하고, 명분과 원칙을 삶의 중심에 두는 성격입니다.',
    '을': '을목(乙木) 일간입니다. 넝쿨처럼 유연하게 환경에 적응하며 자신만의 길을 조용히 개척합니다. 섬세한 감수성과 높은 공감 능력을 지녔으며, 부드러운 겉모습 뒤에 강한 생명력이 숨어 있습니다. 인간관계에서 세심한 배려로 신뢰를 쌓고, 예술·문화적 감각이 뛰어납니다.',
    '병': '병화(丙火) 일간입니다. 대낮의 태양처럼 강렬한 존재감과 카리스마를 지닙니다. 빠른 판단력과 직선적인 표현이 특징이며, 대중 앞에서 자연스럽게 빛나는 타입입니다. 열정적이고 긍정적인 에너지로 주변을 환히 밝히지만, 지나치게 강렬해 독단적으로 보일 수 있습니다.',
    '정': '정화(丁火) 일간입니다. 은은하게 타오르는 촛불처럼 조용하지만 깊은 열정을 품고 있습니다. 집중력이 탁월하고 섬세한 통찰력으로 본질을 꿰뚫는 능력이 있습니다. 신중하고 예의 바른 외면 뒤에 강한 자아와 이상을 지니며, 한번 믿은 사람에게는 깊은 헌신을 아끼지 않습니다.',
    '무': '무토(戊土) 일간입니다. 거대한 산처럼 묵직하고 넓은 포용력을 지닌 대인(大人)형입니다. 배짱이 크고 실용적이며, 많은 사람들이 자연스럽게 의지하는 든든함이 있습니다. 변화보다 안정을 추구하고, 한번 약속한 것은 반드시 지키는 강한 책임감이 특징입니다.',
    '기': '기토(己土) 일간입니다. 비옥한 대지처럼 모든 것을 품어 기르는 세심함이 있습니다. 꼼꼼한 분석력과 현실 감각이 뛰어나며, 표면적으로는 조용하지만 내면에 강한 주관을 가지고 있습니다. 친절하고 포용적이지만 이용당하기 쉬우니 경계가 필요하고, 인내 끝에 성과를 내는 실무형입니다.',
    '경': '경금(庚金) 일간입니다. 단단하고 날카로운 금속처럼 원칙과 의리를 생명처럼 여깁니다. 결단력이 강하고 불의에 굽히지 않으며, 강자 앞에서도 자신의 소신을 굽히지 않는 강직한 성격입니다. 직설적인 표현 때문에 오해받기도 하지만, 말과 행동이 일치하는 믿음직한 사람입니다.',
    '신': '신금(辛金) 일간입니다. 정제된 보석처럼 예민한 감각과 완벽을 추구하는 성향을 지닙니다. 높은 심미안과 날카로운 분석력으로 세밀하게 파악하는 능력이 탁월합니다. 주관이 뚜렷하고 이상이 높아 스스로를 채찍질하는 경향이 있으며, 비판적 사고와 전문성으로 두각을 나타냅니다.',
    '임': '임수(壬水) 일간입니다. 거대한 강처럼 원대한 비전과 자유로운 기상을 지닌 스케일이 큰 사람입니다. 유연한 사고와 넓은 인간관계를 바탕으로 다양한 분야를 넘나들며, 전략적 판단력이 뛰어납니다. 새로운 것을 향한 끝없는 호기심과 도전 정신이 삶의 원동력입니다.',
    '계': '계수(癸水) 일간입니다. 맑고 깊은 샘물처럼 조용하지만 무궁한 잠재력을 품고 있습니다. 깊은 통찰력과 예민한 감수성으로 타인의 내면까지 읽어내는 능력이 있습니다. 창의적이고 직관적인 문제 해결 능력이 뛰어나며, 겉으로는 내성적이지만 내면의 감정세계는 매우 풍부합니다.',
  };
  if (byStem[dayStem]) return byStem[dayStem];
  const byElement: Record<string, string> = {
    '목': '성장과 발전을 추구하는 진취적인 성격으로, 리더십이 강하고 끈기가 뛰어납니다.',
    '화': '열정적이고 카리스마 넘치는 성격으로, 밝고 긍정적인 에너지로 주변을 환하게 만듭니다.',
    '토': '안정적이고 신뢰할 수 있는 성격으로, 성실함과 포용력이 뛰어납니다.',
    '금': '원칙을 중시하는 결단력 있는 성격으로, 의리와 책임감이 강합니다.',
    '수': '지혜롭고 유연한 성격으로, 깊은 통찰력과 공감 능력이 높습니다.',
  };
  return byElement[dayElement] || byElement['토'];
}

export function getFortuneText(dayElement: string, year: number, dayStem?: string): string {
  // 연도의 천간 인덱스 (갑=0, 을=1, ..., 계=9)
  const yearStemIdx = ((year - 4) % 10 + 10) % 10;
  const yearStemElem = ['목','목','화','화','토','토','금','금','수','수'][yearStemIdx];
  const yearStemName = ['갑','을','병','정','무','기','경','신','임','계'][yearStemIdx];

  // 오행 생극 관계로 운세 방향 결정
  const GEN: Record<string,string> = {'목':'화','화':'토','토':'금','금':'수','수':'목'};
  const CTR: Record<string,string> = {'목':'토','화':'금','토':'수','금':'목','수':'화'};

  let relation: 'self'|'gen'|'ctr'|'gened'|'ctred';
  if (yearStemElem === dayElement) relation = 'self';
  else if (GEN[dayElement] === yearStemElem) relation = 'gen';   // 내가 생하는 해
  else if (CTR[dayElement] === yearStemElem) relation = 'ctr';   // 내가 극하는 해
  else if (GEN[yearStemElem] === dayElement) relation = 'gened'; // 내가 생받는 해
  else relation = 'ctred'; // 내가 극받는 해

  const relTexts: Record<string, string> = {
    'self': `${yearStemName}년, 같은 오행의 해입니다. 비견·겁재 기운이 강해져 경쟁과 협력이 공존하는 해입니다. 동업이나 팀 활동에서 크게 빛날 수 있지만, 재물이 분산될 수 있으니 지출 관리에 신경 쓰세요.`,
    'gen': `${yearStemName}년, 내 에너지를 소모하는 식상(食傷) 운입니다. 활동량이 늘고 창의성과 표현력이 돋보이는 해입니다. 새로운 기술이나 분야에 도전하기 좋으나 건강 관리를 소홀히 하지 마세요.`,
    'ctr': `${yearStemName}년, 재성(財星) 운이 강한 해입니다. 노력한 만큼 재물 운이 따라오는 시기로, 투자·사업에 호기입니다. 단, 욕심이 과하면 득보다 실이 많아질 수 있으니 분수에 맞는 행동을 하세요.`,
    'gened': `${yearStemName}년, 인성(印星)이 강해지는 해입니다. 귀인의 도움을 받고, 학문·자격·정신적 성장에 유리한 시기입니다. 실력이 인정받고 신뢰가 쌓이며, 좋은 멘토를 만날 가능성이 높습니다.`,
    'ctred': `${yearStemName}년, 관성(官星) 운의 해입니다. 책임과 의무가 늘어나는 시기입니다. 직장이나 사회적 역할에서 인정을 받을 수 있지만, 스트레스와 부담도 커집니다. 건강 관리와 마음의 여유가 특히 중요합니다.`,
  };

  const addendum: Record<string, string> = {
    '목': ' 봄의 기운처럼 새로운 시작과 성장의 씨앗을 뿌리기 좋은 해입니다.',
    '화': ' 사교성과 명예 운이 함께 올라오며, 인간관계에서 좋은 기회가 옵니다.',
    '토': ' 꾸준한 실천이 탄탄한 기반으로 이어지며, 신뢰와 안정을 다지기 좋습니다.',
    '금': ' 결단력 있는 행동이 결실을 맺고, 원칙을 지킬수록 신뢰가 쌓입니다.',
    '수': ' 지혜와 학문의 운이 강해지며, 내면 성장과 창작 활동에서 빛납니다.',
  };

  // 천간별 맞춤 마무리 조언 (같은 오행이라도 천간에 따라 다름)
  const stemClose: Record<string, string> = {
    '갑': ' 갑목의 강한 의지로 새 길을 개척하기에 좋은 시기입니다. 단, 고집보다 유연함을 더하면 더 큰 성과를 얻을 수 있습니다.',
    '을': ' 을목의 섬세한 적응력이 빛을 발하는 해입니다. 작은 기회를 놓치지 않는 세심함이 큰 결실로 이어집니다.',
    '병': ' 병화의 강렬한 존재감으로 주목받기 좋은 시기입니다. 주변과의 소통에서 리더십을 자연스럽게 발휘하세요.',
    '정': ' 정화의 집중력과 통찰력이 빛을 발하는 해입니다. 한 분야를 깊이 파고드는 노력이 전문성으로 이어집니다.',
    '무': ' 무토의 묵직한 추진력으로 안정적인 기반을 다지기 좋은 해입니다. 서두르기보다 꾸준함으로 성과를 쌓으세요.',
    '기': ' 기토의 세심한 관리 능력이 빛나는 시기입니다. 신뢰를 바탕으로 한 인간관계가 좋은 기회를 가져다줍니다.',
    '경': ' 경금의 결단력이 빛을 발하는 해입니다. 원칙에 맞는 행동이 장기적인 신뢰와 명성을 쌓아줍니다.',
    '신': ' 신금의 완벽한 심미안이 강점이 되는 시기입니다. 전문성과 섬세함을 앞세우면 독보적인 위치를 확보할 수 있습니다.',
    '임': ' 임수의 넓은 시야와 전략적 사고가 주효한 해입니다. 큰 그림을 보되 세부 실행도 놓치지 않는 균형이 중요합니다.',
    '계': ' 계수의 깊은 직관과 창의력이 빛나는 시기입니다. 내면의 목소리에 귀 기울이며 꾸준히 나아가면 길이 열립니다.',
  };

  return relTexts[relation] + (addendum[dayElement] ?? '') + (dayStem ? (stemClose[dayStem] ?? '') : '');
}

// 10천간별 직업 적성 (일간 기준)
export function getCareerText(dayElement: string, dayStem: string = ''): string {
  const byStem: Record<string, string> = {
    '갑': '곧고 강하게 뻗어 나가는 큰 나무의 기운입니다. 새로운 길을 여는 개척자형 기질로, 교육·법률·의학·환경·NGO처럼 사회적 가치와 성장을 추구하는 분야에서 선구자적 역할을 할 수 있습니다. 조직에서는 리더십을 발휘하고, 자신만의 철학을 가진 전문가로 성장하는 경향이 강합니다.',
    '을': '넝쿨처럼 유연하게 자신의 길을 찾아가는 섬세한 목(木)의 기운입니다. 예술·디자인·상담·인테리어·의류·플로리스트처럼 감수성과 미적 감각이 요구되는 분야에서 두각을 나타냅니다. 사람의 마음을 읽고 부드럽게 다가가는 능력이 직업적 강점이 됩니다.',
    '병': '하늘 높이 빛나는 태양의 기운으로, 타고난 존재감과 카리스마가 특징입니다. 방송·연예·정치·군경·항공·교육 등 대중 앞에 서거나 조직을 이끄는 분야에서 강한 영향력을 발휘합니다. 빠른 판단력과 대담한 추진력이 큰 무대에서 빛납니다.',
    '정': '섬세하고 따뜻하게 타오르는 촛불의 기운입니다. 교육·작가·심리상담·요식업·뷰티·종교처럼 사람을 세심하게 돌보고 감동을 주는 분야가 천직입니다. 꼼꼼한 집중력과 예리한 통찰로 전문 분야를 깊이 파고드는 것이 성공의 열쇠입니다.',
    '무': '거대한 산처럼 묵직하고 포용력 있는 토(土)의 기운입니다. 건설·토목·부동산·공무원·군경·농업처럼 든든한 기반을 쌓고 오래 지속하는 분야에서 탁월한 능력을 발휘합니다. 큰 조직에서 버팀목 역할을 하며 신뢰받는 리더로 성장합니다.',
    '기': '모든 것을 품어 기르는 비옥한 대지의 기운입니다. 금융·세무·회계·의료행정·유통·요식업처럼 꼼꼼한 관리와 서비스 정신이 필요한 분야에서 실력을 발휘합니다. 세밀한 처리 능력과 포용적인 성품으로 주변의 신뢰를 얻습니다.',
    '경': '강하고 날카로운 쇳덩이의 기운으로, 결단력과 원칙이 강한 타입입니다. 법조·군경·의료(외과)·엔지니어링·IT보안·금속 분야처럼 강한 의지와 정밀함이 요구되는 직종에서 두각을 나타냅니다. 불의에 타협하지 않는 의리와 추진력이 가장 큰 무기입니다.',
    '신': '정제된 보석처럼 섬세하고 완벽을 추구하는 금(金)의 기운입니다. 의료(성형·치과·안과)·귀금속·패션·제약·정밀기기·뷰티 분야처럼 심미안과 정교함이 요구되는 분야가 적합합니다. 높은 심미적 기준과 완벽주의적 성향이 전문 분야에서 독보적 경쟁력이 됩니다.',
    '임': '큰 강처럼 원대한 비전과 유연한 지략이 특징입니다. 무역·외교·해운·물류·금융·첨단기술·여행·국제비즈니스 분야에서 넓은 시야와 전략적 사고로 두각을 나타냅니다. 다양한 사람을 연결하고 흐름을 읽는 능력이 핵심 강점입니다.',
    '계': '맑고 깊은 샘물처럼 지혜롭고 창의적인 수(水)의 기운입니다. 학술연구·철학·심리학·예술·음악·종교·데이터분석 분야처럼 내면의 깊이와 창의적 영감이 요구되는 분야에서 빛납니다. 직관과 통찰력으로 남들이 보지 못한 것을 발견하는 능력이 뛰어납니다.',
  };
  if (byStem[dayStem]) return byStem[dayStem];
  // 오행 기본 fallback
  const byElement: Record<string, string> = {
    '목': '성장과 개척을 향한 강한 의지가 특징입니다. 교육·의약·법률·환경·출판 분야에서 자신의 가치관을 실현하는 직업이 잘 맞습니다.',
    '화': '열정적인 표현력과 리더십이 돋보입니다. 방송·마케팅·연예·교육·요식업처럼 사람들 앞에 나서는 분야가 최적입니다.',
    '토': '꾸준함과 포용력이 강점입니다. 부동산·공무원·금융·경영·유통처럼 안정적 기반이 필요한 분야에서 성공합니다.',
    '금': '정밀함과 결단력이 뛰어납니다. 법조·군경·의료·IT·엔지니어링처럼 원칙과 분석력이 필요한 분야에서 두각을 나타냅니다.',
    '수': '깊은 통찰과 창의성이 특징입니다. 학술·연구·예술·상담·외교 분야에서 지혜를 발휘합니다.',
  };
  return byElement[dayElement] || byElement['토'];
}

export function getLoveText(dayStem: string, dayElement: string): string {
  const byStem: Record<string, string> = {
    '갑': '한번 마음을 정하면 변하지 않는 깊고 진지한 사랑을 합니다. 자신의 감정을 솔직하게 표현하는 것이 다소 서툴지만, 행동으로 든든하게 지원하는 타입입니다. 화(火) 기운의 파트너와 비전을 함께 키워가는 관계가 잘 맞습니다. 상대의 성장을 응원하되 지나친 통제는 피하세요.',
    '을': '섬세한 감수성으로 상대방의 마음을 잘 읽는 로맨티스트입니다. 직접 표현보다 작은 배려와 세심한 행동으로 사랑을 전달합니다. 수(水) 기운의 파트너와 깊은 감정적 교류가 이루어지며, 너무 맞춰주다가 자신을 잃지 않도록 주의하세요.',
    '병': '태양처럼 뜨겁고 솔직한 사랑을 합니다. 좋아하는 사람에게 숨김없이 표현하며 적극적으로 다가갑니다. 강한 존재감으로 이성에게 자연스럽게 인기를 얻습니다. 토(土) 기운의 파트너가 안정감을 주며, 감정이 식어도 꾸준히 이어갈 인내심을 기르세요.',
    '정': '한번 사랑에 빠지면 헌신적이고 깊이 있는 사랑을 합니다. 감정이 섬세하고 공감 능력이 높아 파트너를 세심하게 배려하지만, 지나친 기대로 상처받기도 합니다. 목(木) 기운의 파트너와 감성적인 교류를 나누고, 자신의 감정도 솔직히 표현하는 연습이 필요합니다.',
    '무': '표현은 많지 않지만 묵묵하게 곁을 지키는 신뢰형 연애를 합니다. 쉽게 마음을 열지 않지만, 한번 마음을 준 사람에게는 오래도록 변하지 않습니다. 금(金) 기운의 파트너와 조용히 신뢰를 쌓아가는 관계가 잘 맞습니다. 감정을 조금 더 적극적으로 표현해보세요.',
    '기': '상대에게 필요한 것을 미리 살펴 준비하는 조용한 헌신형입니다. 안정적이고 현실적인 사랑을 추구하며, 배려가 자연스럽게 배어 있습니다. 금(金) 기운의 파트너와 따뜻하고 실질적인 관계를 이룹니다. 자신의 필요도 표현할 줄 아는 균형이 중요합니다.',
    '경': '의리와 원칙을 중시하며, 말보다 행동으로 사랑을 표현합니다. 감정 표현이 직설적이어서 오해를 사기도 하지만, 진심은 누구보다 깊습니다. 수(水) 기운의 파트너와 깊은 신뢰를 쌓아가며, 상대의 감정에 좀 더 부드럽게 반응하는 연습을 해보세요.',
    '신': '완벽한 사랑을 추구하는 성향으로 이상형에 대한 기준이 높습니다. 세련되고 감각적인 연애를 즐기며, 파트너에게 섬세한 배려를 아끼지 않습니다. 수(水) 기운의 파트너와 지적이고 균형 잡힌 관계를 이룹니다. 완벽에 대한 기대를 낮추면 관계가 더 편안해집니다.',
    '임': '자유롭고 넓은 사랑을 추구합니다. 구속보다 서로 독립적인 공간을 인정하는 관계를 선호하며, 파트너를 전략적으로 이해하고 지원하는 데 뛰어납니다. 목(木) 기운의 파트너와 넓은 세계를 함께 탐험하며 성장합니다. 감정의 깊이도 함께 다져가는 것이 중요합니다.',
    '계': '내면 깊이 연결되는 정신적인 사랑을 추구합니다. 신뢰가 확인될 때 비로소 자신의 전부를 헌신하며, 한번 맺은 인연은 오래 이어갑니다. 목(木) 기운의 파트너와 감성적이고 깊은 연대를 형성합니다. 감정을 혼자 삭이지 말고 파트너와 솔직하게 나누세요.',
  };
  if (byStem[dayStem]) return byStem[dayStem];
  const byElement: Record<string, string> = {
    '목': '한번 마음을 정하면 깊이 있고 진지한 사랑을 합니다. 화(火) 기운의 파트너와 좋은 인연이 됩니다.',
    '화': '열정적으로 감정을 표현하는 사랑을 합니다. 토(土) 기운의 파트너와 안정적인 관계를 이룹니다.',
    '토': '신의와 안정을 중시하는 사랑을 합니다. 금(金) 기운의 파트너와 조화로운 관계를 이룹니다.',
    '금': '원칙적이고 진지한 사랑을 추구합니다. 수(水) 기운의 파트너와 좋은 인연이 됩니다.',
    '수': '깊고 정신적인 유대감을 중시합니다. 목(木) 기운의 파트너와 좋은 궁합을 이룹니다.',
  };
  return byElement[dayElement] || byElement['토'];
}

export function getHealthText(dayStem: string, dayElement: string): string {
  const byStem: Record<string, string> = {
    '갑': '갑목 일간은 간장·담낭·눈·신경계통이 취약합니다. 큰 나무처럼 강해 보이지만 무리한 일정이 쌓이면 갑자기 탈이 납니다. 목 디스크·허리 관리에 특히 신경 쓰고, 과음·과로는 간에 직접적 타격이 됩니다. 주기적인 스트레칭과 충분한 수면이 최고의 건강 비결입니다.',
    '을': '을목 일간은 근육·관절·눈·담계통이 약점입니다. 과도한 신경을 쓰면 피로가 빠르게 쌓이고 근육 경직과 두통으로 이어집니다. 규칙적인 스트레칭과 충분한 휴식이 필수이며, 장시간 스크린 사용은 눈 건강을 해칩니다. 신선한 채소·녹색 식품이 건강을 돕습니다.',
    '병': '병화 일간은 심장·혈압·혈액순환이 취약합니다. 과도한 흥분이나 갑작스러운 스트레스가 심장에 부담을 줍니다. 규칙적인 유산소 운동으로 심폐 기능을 관리하고, 여름철 더위와 탈수에 특히 주의하세요. 매운 음식보다 담백하고 촉촉한 식단이 좋습니다.',
    '정': '정화 일간은 심장 리듬·소장·혈관·수면이 약점입니다. 감정 기복이 심해지면 심장에 부담이 됩니다. 마음의 평정을 유지하는 것이 건강의 핵심이며, 불면이나 두근거림이 생기면 빠르게 대처하세요. 규칙적인 수면 습관과 명상이 큰 도움이 됩니다.',
    '무': '무토 일간은 위장·비장·근육·관절이 약합니다. 불규칙한 식사와 스트레스성 소화 불량이 가장 흔한 문제입니다. 규칙적인 식사와 과식·폭식을 삼가는 것이 중요합니다. 습한 날씨에 관절 통증이 심해질 수 있으니 보온에 신경 쓰세요.',
    '기': '기토 일간은 위장·비장·소화기·면역계통이 취약합니다. 스트레스를 받으면 소화 기능이 가장 먼저 영향을 받습니다. 규칙적인 식사와 소화에 좋은 따뜻한 음식을 선택하세요. 피부 트러블은 내장 건강의 신호일 수 있으니 장 건강도 함께 관리하세요.',
    '경': '경금 일간은 폐·대장·기관지·피부가 취약합니다. 환경이 바뀌거나 기온이 급변하면 호흡기 질환에 걸리기 쉽습니다. 금연과 깨끗한 공기 유지가 필수이며, 무리한 운동이나 갑작스러운 기온 변화에 주의하세요. 수분 섭취와 규칙적인 유산소 운동이 효과적입니다.',
    '신': '신금 일간은 폐·기관지·피부·코가 민감합니다. 대기 오염이나 건조한 환경에 특히 취약합니다. 마스크 착용과 충분한 수분 섭취로 호흡기를 보호하고, 피부 보습 관리도 함께 챙기세요. 지나친 완벽주의로 인한 만성 스트레스가 면역력을 떨어뜨릴 수 있습니다.',
    '임': '임수 일간은 신장·방광·관절·허리가 취약합니다. 찬 음식이나 냉기에 노출되면 몸이 빠르게 탈이 납니다. 충분한 수분 섭취와 따뜻한 식단을 유지하고, 장시간 앉아 있는 자세는 허리에 무리를 주니 자주 움직이세요. 체온 유지와 족욕이 건강에 도움이 됩니다.',
    '계': '계수 일간은 신장·방광·뼈·귀·호르몬계통이 약합니다. 과로나 수면 부족이 신장에 직접 영향을 미칩니다. 충분한 수면과 따뜻한 식단 유지가 필수이며, 냉기에 자주 노출되는 것을 피하세요. 짜고 차가운 음식보다 따뜻하고 검은색 식재료(검은콩, 흑임자 등)가 도움이 됩니다.',
  };
  if (byStem[dayStem]) return byStem[dayStem];
  const byElement: Record<string, string> = {
    '목': '간장·담낭·눈·신경계통에 주의가 필요합니다. 규칙적인 운동과 충분한 수면이 건강의 핵심입니다.',
    '화': '심장·혈압·혈액순환에 주의가 필요합니다. 유산소 운동과 충분한 수분 섭취를 권장합니다.',
    '토': '위장·비장·소화기관에 주의가 필요합니다. 규칙적인 식사와 과식을 피하는 것이 중요합니다.',
    '금': '폐·대장·기관지·피부에 주의가 필요합니다. 깨끗한 공기와 규칙적인 호흡 운동이 도움이 됩니다.',
    '수': '신장·방광·뼈·호르몬계통에 주의가 필요합니다. 충분한 수분 섭취와 따뜻한 식단이 중요합니다.',
  };
  return byElement[dayElement] || byElement['토'];
}

export function getLuckyNumbers(stemIdx: number, branchIdx: number): number[] {
  const nums = [((stemIdx + 1) % 9) + 1, ((branchIdx + 2) % 9) + 1, ((stemIdx + branchIdx) % 9) + 1];
  return [...new Set(nums)];
}

// 10천간별 행운 색상 — 양간은 선명한 색조, 음간은 은은한 색조
export function getLuckyColors(element: string, stem?: string): string[] {
  const byStem: Record<string, string[]> = {
    '갑': ['초록색', '청록색', '하늘색'],
    '을': ['연두색', '민트색', '옥색'],
    '병': ['빨간색', '주황색', '밝은 분홍'],
    '정': ['진분홍', '와인색', '자홍색'],
    '무': ['황색', '황토색', '크림색'],
    '기': ['베이지색', '아이보리', '연황색'],
    '경': ['흰색', '은색', '밝은 회색'],
    '신': ['진주색', '크리스탈 화이트', '연회색'],
    '임': ['남색', '짙은 파랑', '검은색'],
    '계': ['인디고', '보라빛 남색', '짙은 감색'],
  };
  if (stem && byStem[stem]) return byStem[stem];
  const byElem: Record<string, string[]> = {
    '목': ['초록색', '청색', '청록색'],
    '화': ['빨간색', '보라색', '주황색'],
    '토': ['황색', '갈색', '베이지색'],
    '금': ['흰색', '금색', '은색'],
    '수': ['검은색', '파란색', '남색'],
  };
  return byElem[element] || ['흰색', '금색'];
}

// 10천간별 행운 방위 — 양간은 정방위, 음간은 사방위(斜方位)
export function getLuckyDirections(element: string, stem?: string): string[] {
  const byStem: Record<string, string[]> = {
    '갑': ['동쪽', '동남쪽'],
    '을': ['동남쪽', '동쪽'],
    '병': ['남쪽', '동남쪽'],
    '정': ['남동쪽', '남쪽'],
    '무': ['중앙', '남서쪽'],
    '기': ['남서쪽', '중앙'],
    '경': ['서쪽', '북서쪽'],
    '신': ['북서쪽', '서쪽'],
    '임': ['북쪽', '북동쪽'],
    '계': ['북동쪽', '북쪽'],
  };
  if (stem && byStem[stem]) return byStem[stem];
  const byElem: Record<string, string[]> = {
    '목': ['동쪽', '동남쪽'],
    '화': ['남쪽', '남동쪽'],
    '토': ['중앙', '남서쪽'],
    '금': ['서쪽', '북서쪽'],
    '수': ['북쪽', '북동쪽'],
  };
  return byElem[element] || ['동쪽'];
}

// ─────────────────────────────────────────
// 새 기능들: 대운, 세운, 용신, 신강/신약, 궁합, 조심해야 할 것들
// ─────────────────────────────────────────

// 오행 생극 상수
const GENERATES: Record<string, string> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
const CONTROLS: Record<string, string>  = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };

// 간지 인덱스로부터 60갑자 인덱스 역산
// idx ≡ stemIdx (mod 10), idx ≡ branchIdx (mod 12)
// 해: idx = (6*stem - 5*branch + 60) % 60
export function getGanziIdx(stemIdx: number, branchIdx: number): number {
  return ((6 * stemIdx - 5 * branchIdx) % 60 + 60) % 60;
}

// ──────────── 대운 (大運) ────────────
export function getDaeun(
  birthYear: number, birthMonth: number, birthDay: number,
  gender: 'male' | 'female',
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getMonthPillar>
) {
  // 대운 순행/역행은 년간(年干) 기준 (전통 사주 표준)
  // 양년간(갑·병·무·경·임) + 男 or 음년간 + 女 → 순행
  // 음년간(을·정·기·신·계) + 男 or 양년간 + 女 → 역행
  const isYangYear = yearPillar.stemIndex % 2 === 0;
  const isForward = (gender === 'male') === isYangYear;

  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  // 주변 3년치 절기 수집 (12개 월령 절기만)
  const terms: Date[] = [];
  for (const ty of [birthYear - 1, birthYear, birthYear + 1]) {
    for (let b = 0; b < 12; b++) {
      const { month: tm, day: td } = getMonthTermDay(ty, b);
      terms.push(new Date(ty, tm - 1, td));
    }
  }
  terms.sort((a, b) => a.getTime() - b.getTime());

  let refDate: Date;
  if (isForward) {
    refDate = terms.find(t => t > birthDate) ?? new Date(birthYear + 1, 1, 4);
  } else {
    const before = [...terms].reverse().find(t => t < birthDate);
    refDate = before ?? new Date(birthYear - 1, 11, 7);
  }

  const diffDays = Math.abs(refDate.getTime() - birthDate.getTime()) / 86400000;
  const startAge = Math.max(1, Math.round(diffDays / 3));

  const monthGanziIdx = getGanziIdx(monthPillar.stemIndex, monthPillar.branchIndex);

  const periods = [];
  for (let i = 1; i <= 8; i++) {
    const offset = isForward ? i : -i;
    const idx = ((monthGanziIdx + offset) % 60 + 60) % 60;
    const ganzi = getGanzi(idx);
    const age = startAge + (i - 1) * 10;
    periods.push({
      idx: i,
      startAge: age,
      endAge: age + 9,
      startYear: birthYear + age,
      endYear: birthYear + age + 9,
      stem: ganzi.stem,
      branch: ganzi.branch,
      stemElement: ganzi.stemElement,
      branchElement: ganzi.branchElement,
      fortune: getDaeunFortune(ganzi)
    });
  }
  return { isForward, startAge, periods };
}

function getDaeunFortune(ganzi: ReturnType<typeof getGanzi>): string {
  // 60갑자별 고유 대운 해석
  const key = ganzi.stem + ganzi.branch;
  const fortunes: Record<string, string> = {
    '갑자': '수생목(水生木)의 기운이 강합니다. 지식과 아이디어가 풍부해지고 새로운 프로젝트를 시작하기 좋은 시기입니다. 지적 능력과 언어 감각이 빛을 발합니다.',
    '을축': '부드러운 목이 토 위에 뿌리내리는 형상입니다. 묵묵히 실력을 쌓고 기반을 다지는 시기로, 서두르지 않는 꾸준함이 가장 큰 자산이 됩니다.',
    '병인': '화와 목이 서로를 밝히는 강렬한 에너지의 시기입니다. 사교성이 높아지고 새로운 도전이 빠르게 결실을 맺습니다. 리더십과 추진력이 돋보입니다.',
    '정묘': '따뜻한 불빛이 무성한 봄 숲을 비추는 형상입니다. 섬세한 감성과 창의력이 살아나며, 예술·교육·소통 분야에서 두각을 나타내는 시기입니다.',
    '무진': '토가 겹쳐 두텁게 쌓이는 강한 안정의 시기입니다. 고집이 세질 수 있으니 유연함을 유지하되, 장기적인 계획을 실행하기엔 최적의 환경입니다.',
    '기사': '토 속에서 화가 피어오르는 형상으로, 끈기 있는 노력이 서서히 성과로 드러납니다. 내실을 다진 뒤 실력이 인정받는 시기가 찾아옵니다.',
    '경오': '금이 화를 만나 단련되는 시기입니다. 강한 의지와 결단력이 필요한 상황이 많지만, 단련될수록 더 빛나는 재능이 발휘됩니다.',
    '신미': '날카로운 금이 부드러운 토에 안착하는 형상입니다. 세심한 분석력으로 기회를 잡고, 재정 관리와 계획적 행동이 좋은 결과를 가져옵니다.',
    '임신': '물이 금속 위를 흐르듯 지혜가 풍부해지는 시기입니다. 학문·연구·기획 분야에서 성과가 두드러지고, 대인관계에서 신뢰를 쌓기 좋은 때입니다.',
    '계유': '수금(水金)이 상생하며 깊은 통찰력이 생깁니다. 냉철한 판단력으로 올바른 방향을 선택하고, 전문성을 인정받는 시기입니다.',
    '갑술': '목이 토 위에 단단히 뿌리를 내리는 시기입니다. 초반에는 장벽이 느껴질 수 있지만 끝까지 밀어붙이면 탄탄한 기반을 확보하게 됩니다.',
    '을해': '목이 수의 영양을 듬뿍 받는 형상으로, 재능과 감수성이 활짝 꽃피는 시기입니다. 창의적인 분야와 대인관계 모두에서 매력이 빛납니다.',
    '병자': '화수(火水)가 충돌하는 긴장의 시기입니다. 급하게 서두르기보다 속도를 조절하며 균형을 찾는 것이 중요하고, 역경 속에서 진짜 강함을 얻게 됩니다.',
    '정축': '화의 열기가 토 속에 천천히 스며드는 시기입니다. 겉으로 드러나지 않더라도 내면에서 단단한 실력이 쌓이고 있으며, 때를 기다리는 인내가 보상받습니다.',
    '무인': '토와 목이 만나 대지에 나무가 우뚝 서는 형상입니다. 책임감과 실행력이 강해지고 사회적 역할이 커지는 시기로, 넓은 인간관계가 성장을 돕습니다.',
    '기묘': '토 위에 풀이 무성하게 자라는 형상으로, 꾸준한 성실함이 눈에 보이는 성과를 만들어냅니다. 학업·기술 습득에 특히 좋은 에너지가 흐릅니다.',
    '경진': '금이 두터운 토의 지지를 받아 더욱 견고해지는 시기입니다. 원칙을 세우고 체계적으로 일을 추진하면 큰 결과를 얻을 수 있는 안정적인 시기입니다.',
    '신사': '금속이 화로에서 달궈지며 정제되는 강렬한 시기입니다. 고통스러운 과정을 통해 능력이 더욱 정교해지고, 이후 빛나는 성취가 기다립니다.',
    '임오': '수화(水火)가 교차하는 역동적인 시기입니다. 열정과 이성이 함께 발휘되어 창의적인 아이디어가 실용적 결과로 이어집니다. 사회적 활약의 시기입니다.',
    '계미': '수가 토에 스며들어 대지를 촉촉이 적시는 형상입니다. 조용하고 착실한 노력이 주변의 신뢰를 쌓고, 점진적으로 명성을 높이는 시기입니다.',
    '갑신': '목이 금의 제약을 받으며 더욱 단단해지는 시기입니다. 경쟁과 도전이 많지만 이를 통해 실력이 연마되고, 뚜렷한 자기 색깔이 생깁니다.',
    '을유': '부드러운 목이 금의 도전을 받는 시기입니다. 타인의 평가나 경쟁에 흔들리지 말고 자신만의 전문성을 키우면 독보적 위치를 점하게 됩니다.',
    '병술': '화가 토 위에서 밝게 타오르는 형상으로, 사회적 활동이 활발해지고 리더로서 주목받는 시기입니다. 다만 독단을 경계하고 주변 의견을 경청하세요.',
    '정해': '화수(火水)의 미묘한 균형 속에 감수성과 직관이 빛납니다. 예술·상담·연구 분야에서 뛰어난 통찰력을 발휘하며, 영적 성숙도 이루어지는 시기입니다.',
    '무자': '토수(土水)가 만나 탁해질 수 있는 시기입니다. 감정과 충동을 잘 다스리고, 무리한 확장보다는 내실을 다지는 쪽에 집중하는 것이 현명합니다.',
    '기축': '토가 두 겹으로 겹쳐 매우 안정적인 시기입니다. 꾸준함과 성실함이 최고의 무기이며, 부동산·저축·장기 투자처럼 기반을 다지는 일에서 성과가 납니다.',
    '경인': '금이 목을 제어하며 강한 의지가 돋보이는 시기입니다. 도전적인 상황에서도 결단력과 실행력으로 돌파구를 찾으며, 새로운 영역 개척에 강한 운이 따릅니다.',
    '신묘': '금이 목을 다듬는 형상으로, 재능이 정제되어 빛나는 시기입니다. 섬세한 감각과 전문 기술이 인정받고, 예술·의료·기술 분야에서 빼어난 성취가 기대됩니다.',
    '임진': '수가 토에 흡수되며 에너지가 쌓이는 시기입니다. 뒤에서 묵묵히 준비해온 것들이 서서히 드러나기 시작하고, 큰 변화의 전조가 감지되는 중요한 시기입니다.',
    '계사': '수화(水火)의 긴장 속에서 지혜가 탁월해지는 시기입니다. 냉철한 판단과 뜨거운 열정이 균형을 이룰 때 놀라운 성과가 나타납니다.',
    '갑오': '목화(木火)가 서로를 키우는 강렬한 에너지의 시기입니다. 창의성과 실행력이 최고조에 달하고, 대인관계와 사회적 명성이 크게 높아집니다.',
    '을미': '목이 토 위에 부드럽게 퍼지는 형상으로, 조화와 공감 능력이 뛰어난 시기입니다. 팀워크와 협업에서 빛을 발하며, 따뜻한 인간관계로 운이 열립니다.',
    '병신': '화금(火金)이 충돌하는 긴장의 시기입니다. 강한 자존심과 추진력이 장점이지만 충돌을 조심하세요. 도전이 많을수록 결과적으로 더 단단해지는 시기입니다.',
    '정유': '화가 금을 단련하는 형상으로, 반복되는 시련 속에서 진짜 능력이 만들어집니다. 냉정한 자기 점검이 결국 빛나는 미래를 가져다주는 시기입니다.',
    '무술': '토가 두 겹으로 쌓여 매우 견고한 시기입니다. 한 분야에 깊이 파고들어 전문가로 인정받을 수 있으며, 중장기 목표를 향한 끈기 있는 행보가 빛납니다.',
    '기해': '토수(土水)가 만나는 복잡한 시기입니다. 내면의 불안과 감정 기복이 생길 수 있으나, 이를 창의적 에너지로 전환하면 독창적인 성과를 이룹니다.',
    '경자': '금수(金水)가 상생하는 최고의 지혜와 실행력의 시기입니다. 분석력·판단력·추진력이 모두 살아나고, 전략적 접근으로 원하는 목표를 성취할 수 있습니다.',
    '신축': '금이 토의 품에 안겨 더욱 단단해지는 시기입니다. 체계적이고 계획적인 행동이 효과를 발휘하며, 재정과 건강 모두 안정적인 기반을 만들어갑니다.',
    '임인': '수가 목에 영양을 공급하는 성장의 시기입니다. 새로운 배움과 창의적 시도가 빠르게 결실을 맺고, 적극적인 도전이 예상보다 훨씬 큰 보상을 안겨줍니다.',
    '계묘': '수목(水木)이 서로를 키우는 풍요로운 성장의 시기입니다. 감수성·창의성·학습 능력이 모두 높아지고, 새로운 인연이 중요한 기회를 연결해줍니다.',
    '갑진': '목이 토 위에 힘차게 뿌리내리는 강한 시기입니다. 경쟁이 치열해질 수 있지만 진취적 기상으로 돌파구를 찾으면 크게 도약하는 분기점이 됩니다.',
    '을사': '목이 화를 만나 활짝 피어나는 형상입니다. 재능과 매력이 동시에 빛을 발하고, 오랫동안 준비해온 일들이 세상에 알려지는 화려한 시기입니다.',
    '병오': '화가 두 겹으로 겹치는 매우 뜨거운 에너지의 시기입니다. 열정·활력·사교성이 절정에 달하고 빠른 성공이 가능하지만, 과열을 주의하고 냉정함을 잃지 마세요.',
    '정미': '화의 온기가 토에 스며들어 풍요로움을 만드는 시기입니다. 인간관계와 커뮤니케이션이 원만해지고, 문화·예술·교육 분야에서 두각을 나타냅니다.',
    '무신': '토가 금을 생하는 안정 속 발전의 시기입니다. 자신의 분야에서 전문성을 높이고 결과물을 정리하기 좋으며, 꾸준한 노력이 사회적 인정으로 이어집니다.',
    '기유': '토가 금을 생하는 결실의 시기입니다. 그동안의 노력이 가시적인 성과로 드러나고, 재정적 안정과 사회적 위상이 함께 올라가는 안정적인 운기입니다.',
    '경술': '금토(金土)가 어우러지는 강한 의지와 안정의 시기입니다. 원칙을 지키며 묵묵히 자기 길을 걷는 사람에게 큰 보상이 따르는 시기입니다.',
    '신해': '금이 수를 생하며 지혜와 유연함이 빛나는 시기입니다. 고집보다 수용이, 경쟁보다 협력이 더 큰 결과를 가져다줍니다. 내면의 성찰과 새로운 비전이 싹틉니다.',
    '임자': '수가 두 겹으로 겹치는 깊고 고요한 에너지의 시기입니다. 겉으로 조용해 보이지만 내면에서 큰 변화가 준비되고 있으며, 학문·사색·창작 활동이 풍성해집니다.',
    '계축': '수가 토 위에 안착하는 시기로, 감정과 이성이 균형을 찾아갑니다. 섣불리 앞서나가기보다 상황을 면밀히 파악하며 최적의 타이밍을 기다리는 지혜가 필요합니다.',
    '갑인': '목이 두 겹으로 겹치는 강력한 성장 에너지의 시기입니다. 독립심·추진력·진취성이 폭발하고, 새로운 분야 개척이나 창업에 매우 유리한 운기가 흐릅니다.',
    '을묘': '부드러운 목의 기운이 두 겹으로 펼쳐지는 풍성한 시기입니다. 감수성·공감력·창의성이 모두 빛나고, 다양한 인연과 기회가 꽃처럼 피어납니다.',
    '병진': '화가 토 위에서 밝게 타오르며 존재감을 드러내는 시기입니다. 사회적 명성이 높아지고 큰 무대에서 활약할 기회가 찾아오지만, 과욕은 금물입니다.',
    '정사': '화가 두 겹으로 타오르는 열정의 절정기입니다. 뛰어난 직관과 표현력으로 주변을 이끌게 되며, 특히 예술·방송·교육 분야에서 눈부신 활약이 기대됩니다.',
    '무오': '토화(土火)가 서로를 밝히는 왕성한 활동의 시기입니다. 에너지가 넘치고 행동력이 강해지지만, 충동적 결정은 피하고 감정 관리에 신경 써야 합니다.',
    '기미': '토가 두 겹으로 안정되어 있는 매우 견고한 시기입니다. 변화보다는 유지와 발전에 적합하며, 장기적인 안목으로 꾸준히 한 우물을 파는 것이 성공의 열쇠입니다.',
    '경신': '금이 두 겹으로 겹치는 강하고 날카로운 에너지의 시기입니다. 결단력과 실행력이 최고조에 달하며, 구조조정·새 출발·계획 실행에 매우 유리한 환경입니다.',
    '신유': '정제된 금의 기운이 극도로 강해지는 시기입니다. 완벽주의적 성향이 두드러지고 전문성을 인정받지만, 주변과의 마찰을 조심하고 융통성을 발휘하세요.',
    '임술': '수가 토에 담기는 깊은 내면 성찰의 시기입니다. 화려한 성과보다 내실을 쌓는 데 집중하며, 조용히 준비한 것이 훗날 커다란 결실의 씨앗이 됩니다.',
    '계해': '수가 두 겹으로 깊고 광활하게 흐르는 시기입니다. 철학적 사유와 영적 성장이 이루어지며, 인생의 방향을 재정립하는 중요한 시기가 될 수 있습니다.',
  };
  return fortunes[key] ?? '변화와 성장이 교차하는 시기입니다. 자신의 내면에 귀를 기울이며 한 걸음씩 나아가세요.';
}

// ──────────── 세운 (歲運) ────────────
export function getSeun(birthYear: number, count = 30) {
  const currentYear = new Date().getFullYear();
  const seuns = [];
  for (let i = -3; i < count; i++) {
    const year = currentYear + i;
    const age = year - birthYear;
    if (age < 0) continue;
    const yp = getYearPillar(year);
    seuns.push({
      year,
      age,
      stem: yp.stem,
      branch: yp.branch,
      stemElement: yp.stemElement,
      branchElement: yp.branchElement,
      isCurrent: year === currentYear,
      fortune: getSeunFortune(yp.branch, yp.stemElement)
    });
  }
  return seuns;
}

function getSeunFortune(branch: string, stemElem: string): string {
  // 지지×천간 오행 조합 (60가지) — 핵심 키워드 + 구체적 조언
  const compound: Record<string, string> = {
    // 자(子)水 + 천간 오행
    '목자': '수생목(水生木)의 자년(子年)입니다. 지식과 아이디어가 풍부해지고, 새로운 공부·자격·도전이 결실을 맺습니다. 인간관계에서 귀인이 등장해 기회를 열어줍니다.',
    '화자': '수극화(水剋火)의 자년입니다. 계획을 철저히 세우고 감정 기복을 다스리는 것이 중요합니다. 서두르지 않고 준비를 단단히 하면 이듬해 큰 도약의 발판이 됩니다.',
    '토자': '수극토가 작용하는 자년입니다. 기반이 흔들릴 수 있으니 충동적 결정과 과도한 지출을 삼가세요. 내실을 다지는 데 집중하면 내년을 위한 좋은 씨앗이 됩니다.',
    '금자': '금생수(金生水)의 자년입니다. 분석력과 판단력이 최고조에 달하는 해입니다. 지식·학문·기획 분야에서 좋은 성과가 나오고, 신뢰 있는 조언자 역할로 인정받습니다.',
    '수자': '수기(水氣)가 가득한 자년입니다. 통찰력과 감수성이 절정에 달하나, 지나친 사색으로 실행이 늦어질 수 있습니다. 계획한 것을 적극적으로 실행에 옮기는 용기가 필요합니다.',

    // 축(丑)土 + 천간 오행
    '목축': '목극토(木剋土)의 축년(丑年)입니다. 새로운 도전과 기존 안정 사이에서 선택을 강요받는 해입니다. 급진적 변화보다 점진적 혁신이 더 좋은 결과를 만듭니다.',
    '화축': '화생토(火生土)의 축년입니다. 따뜻한 에너지가 땅 속에 쌓이는 형상입니다. 눈에 보이지 않더라도 실력이 단단히 쌓이는 중이며, 인내하면 반드시 보상받습니다.',
    '토축': '토기(土氣)가 두텁게 쌓인 축년입니다. 안정·실속·기반 다지기에 최적의 해입니다. 부동산·저축·장기 투자가 유리하며, 묵묵한 노력이 강력한 무기입니다.',
    '금축': '토생금(土生金)의 축년입니다. 전문성이 높아지고 자신의 분야에서 인정받는 해입니다. 체계적으로 실력을 쌓으면 탄탄한 경력과 재정 기반을 동시에 확보합니다.',
    '수축': '수극토(水剋土)의 축년입니다. 감정과 현실의 괴리를 조율하는 것이 과제입니다. 지나치게 이상적인 생각보다 현실적 계획에 집중하면 안정적인 성과를 냅니다.',

    // 인(寅)木 + 천간 오행
    '목인': '목기(木氣)가 넘치는 인년(寅年)입니다. 도전·개척·독립의 에너지가 충만합니다. 새로운 사업, 독립, 진학 등 큰 첫 걸음을 내딛기에 최적의 시기입니다.',
    '화인': '목생화(木生火)의 인년입니다. 창의성·활동력·사교성이 폭발하는 해입니다. 사람들과 활발히 교류하면서 새로운 기회와 인맥을 얻을 수 있습니다.',
    '토인': '목극토(木剋土)가 작용하는 인년입니다. 변화에 저항하면 에너지 낭비가 큽니다. 유연하게 흐름에 올라타면서 내 기반을 지키는 균형이 중요합니다.',
    '금인': '금극목(金剋木)의 인년입니다. 경쟁과 도전이 많지만 그 속에서 진짜 실력이 연마됩니다. 위기를 기회로 바꾸는 집중력과 결단력이 이 해의 핵심입니다.',
    '수인': '수생목(水生木)의 인년입니다. 지식과 감수성이 행동력과 결합해 빠른 성장을 이룹니다. 오랫동안 준비해온 것이 드디어 빛을 발하기 시작하는 시기입니다.',

    // 묘(卯)木 + 천간 오행
    '목묘': '목기(木氣)가 무성한 묘년(卯年)입니다. 대인관계가 풍성해지고 새로운 인연이 많이 들어옵니다. 창의적 프로젝트와 협업에서 두드러진 성과가 납니다.',
    '화묘': '목생화(木生火)의 묘년입니다. 표현력·매력·열정이 절정에 달하는 해입니다. 좋아하는 일에 올인하면 큰 성취와 인정이 함께 찾아옵니다.',
    '토묘': '목극토(木剋土)의 묘년입니다. 새로운 흐름이 기존 루틴을 흔들 수 있습니다. 너무 고집하지 말고 유연하게 방향을 조정하면 좋은 결과가 따릅니다.',
    '금묘': '금극목(金剋木)의 묘년입니다. 경쟁자나 비판이 많아질 수 있지만, 자신만의 전문성을 묵묵히 키우면 독보적인 위치를 얻게 됩니다.',
    '수묘': '수생목(水生木)의 묘년입니다. 귀인의 도움과 좋은 기회가 연이어 찾아오는 해입니다. 적극적으로 네트워크를 활용하면 예상보다 훨씬 큰 결과를 얻습니다.',

    // 진(辰)土 + 천간 오행
    '목진': '목극토(木剋土)의 진년(辰年)입니다. 강한 의지로 변화를 주도할 수 있지만, 주변과의 마찰을 줄이는 외교술도 필요합니다.',
    '화진': '화생토(火生土)의 진년입니다. 적극적인 행동이 안정적 결과로 이어집니다. 사회적 활동·네트워킹·자기 표현에 힘을 쏟으면 명성이 높아집니다.',
    '토진': '토기(土氣)가 강한 진년입니다. 큰 변화보다 현재에 충실한 것이 최선입니다. 재물·부동산·직장 안정을 다지기 좋은 해입니다.',
    '금진': '토생금(土生金)의 진년입니다. 전문 기술·자격·경력이 쌓이는 해입니다. 체계적인 학습과 실전 경험이 미래 경쟁력의 기반이 됩니다.',
    '수진': '수극토(水剋土)의 진년입니다. 감정과 현실 사이에서 균형을 잡는 것이 과제입니다. 과도한 걱정이나 망설임보다 실행이 더 중요한 해입니다.',

    // 사(巳)火 + 천간 오행
    '목사': '목생화(木生火)의 사년(巳年)입니다. 열정과 실행력이 동시에 솟구치는 드라마틱한 해입니다. 새로운 시작과 인연이 쏟아지고 사회적 활동이 빛납니다.',
    '화사': '화기(火氣)가 타오르는 사년입니다. 사교·명예·표현이 최고조에 달합니다. 지나친 과열에 주의하되, 자신의 강점을 세상에 알릴 절호의 기회입니다.',
    '토사': '화생토(火生土)의 사년입니다. 내실이 단단해지고 노력이 눈에 보이는 성과로 드러납니다. 재물 운과 사회적 신뢰가 함께 높아집니다.',
    '금사': '화극금(火剋金)의 사년입니다. 도전과 압박이 강하지만 그 속에서 진짜 능력이 단련됩니다. 포기하지 않으면 이 해의 시련이 평생 자산이 됩니다.',
    '수사': '수극화(水剋火)의 사년입니다. 이성과 감성의 균형을 잡는 것이 핵심입니다. 충동적 결정을 삼가고 냉철한 판단으로 나아가면 예상치 못한 기회를 잡습니다.',

    // 오(午)火 + 천간 오행
    '목오': '목생화(木生火)의 오년(午年)입니다. 창의적 아이디어가 강한 실행력을 만나 폭발적인 성과를 냅니다. 도전에 주저하지 마세요.',
    '화오': '화기(火氣)가 절정인 오년입니다. 사회적 인정·명성·활발한 교류의 해입니다. 에너지가 넘치는 만큼 과욕을 조심하고 건강 관리도 병행하세요.',
    '토오': '화생토(火生土)의 오년입니다. 오랜 노력이 가시적 성과로 결실을 맺는 해입니다. 재물 운이 상승하고 신뢰와 안정이 함께 올라옵니다.',
    '금오': '화극금(火剋金)의 오년입니다. 강한 외부 압력이 있지만 원칙을 지키면 오히려 빛이 납니다. 불필요한 갈등은 피하고 실력으로 말하는 해입니다.',
    '수오': '수극화(水剋火)의 오년입니다. 지나친 열정은 자제하고 냉정한 전략과 조화를 이루세요. 감정을 다스리는 사람이 이 해의 승자가 됩니다.',

    // 미(未)土 + 천간 오행
    '목미': '목극토(木剋土)의 미년(未年)입니다. 변화와 안정 사이에서 줄타기가 필요합니다. 융통성 있는 자세로 주변과 조화를 이루면 생각보다 좋은 한 해가 됩니다.',
    '화미': '화생토(火生土)의 미년입니다. 풍요로운 교류와 감성적인 행복이 가득한 해입니다. 문화·예술·교육 분야에서 특히 두각을 나타냅니다.',
    '토미': '토기(土氣)가 안정된 미년입니다. 현실적이고 꾸준한 행보로 삶의 기반을 다지기 좋습니다. 부동산이나 장기 저축이 이 시기에 특히 유리합니다.',
    '금미': '토생금(土生金)의 미년입니다. 전문성이 높아지고 사회적 인정이 뒤따르는 해입니다. 원칙을 지키면서 꾸준히 나아가면 목표를 달성합니다.',
    '수미': '수극토(水剋土)의 미년입니다. 감정의 파도에 흔들리지 않는 중심이 필요합니다. 무리한 확장보다 내실을 다지는 것이 훨씬 현명한 선택입니다.',

    // 신(申)金 + 천간 오행
    '목신': '금극목(金剋木)의 신년(申年)입니다. 경쟁이 치열해지고 뜻밖의 장벽이 생길 수 있습니다. 단 이 과정에서 자신만의 색깔이 더욱 선명해지고 실력이 연마됩니다.',
    '화신': '화극금(火剋金)의 신년입니다. 원칙 대 열정의 충돌이 많은 해입니다. 자신의 의지와 가치를 지키면서도 유연하게 소통하면 오히려 독보적 결과를 냅니다.',
    '토신': '토생금(土生金)의 신년입니다. 전문성·기술·경력을 쌓는 데 최적의 해입니다. 자격·연구·기획 등 미래 투자에 집중하면 장기적으로 강력한 경쟁력을 갖춥니다.',
    '금신': '금기(金氣)가 강한 신년입니다. 결단·원칙·완성의 에너지가 흐릅니다. 오랫동안 준비해온 프로젝트를 완성하고 수확하기에 최고의 시기입니다.',
    '수신': '금생수(金生水)의 신년입니다. 지혜·분석력·판단력이 정점에 달합니다. 학문·연구·전략 분야에서 두드러진 성과를 내고, 신뢰 있는 전문가로 인정받습니다.',

    // 유(酉)金 + 천간 오행
    '목유': '금극목(金剋木)의 유년(酉年)입니다. 주변의 평가나 경쟁이 자신감을 흔들 수 있습니다. 타인의 시선에 흔들리지 말고 자신만의 전문성에 집중하세요.',
    '화유': '화극금(火剋金)의 유년입니다. 열정과 원칙이 충돌하는 해입니다. 자신의 방식을 지키되 불필요한 대립은 피하고, 실력을 증명하는 데 집중하세요.',
    '토유': '토생금(土生金)의 유년입니다. 그동안 묵묵히 쌓아온 노력이 공식적으로 인정받는 해입니다. 재정적 안정과 사회적 위상이 함께 올라가는 시기입니다.',
    '금유': '금기(金氣)가 충만한 유년입니다. 마무리·정리·완성의 에너지가 강합니다. 새 시작보다 현재 하고 있는 일을 완성하고 다음 준비를 단단히 하는 해입니다.',
    '수유': '금생수(金生水)의 유년입니다. 통찰·지혜·분석이 빛나는 해입니다. 정보를 모으고 전략을 수립하면 이듬해 큰 도약의 발판을 완벽히 마련하게 됩니다.',

    // 술(戌)土 + 천간 오행
    '목술': '목극토(木剋土)의 술년(戌年)입니다. 기존 틀을 깨는 변화의 에너지가 강합니다. 과거에 집착하지 말고 새 방향을 적극적으로 개척하면 전환점이 됩니다.',
    '화술': '화생토(火生土)의 술년입니다. 열정적인 노력이 안정적 결과로 이어집니다. 사람과의 교류에서 중요한 기회가 생기므로 네트워크 관리에 신경 쓰세요.',
    '토술': '토기(土氣)가 두터운 술년입니다. 한 분야에 깊이 파고들어 전문가로 인정받는 해입니다. 중장기 목표를 끝까지 밀어붙이는 끈기가 빛납니다.',
    '금술': '토생금(土生金)의 술년입니다. 묵묵히 원칙을 지키는 사람에게 큰 보상이 따르는 해입니다. 체계적인 정리와 완성이 내년을 위한 탄탄한 기반을 만듭니다.',
    '수술': '수극토(水剋土)의 술년입니다. 감정과 논리의 균형이 중요합니다. 불안해도 행동하는 용기가 필요하며, 내면의 불안을 창의적 에너지로 전환하면 독창적 성과가 납니다.',

    // 해(亥)水 + 천간 오행
    '목해': '수생목(水生木)의 해년(亥年)입니다. 내면 충전과 창의적 영감이 풍부해집니다. 조용히 준비하는 시간이 내년 도약을 위한 최고의 투자가 됩니다.',
    '화해': '수극화(水剋火)의 해년입니다. 과도한 에너지 소비를 줄이고 내실을 다지는 해입니다. 쉬면서 충전하고 다음 행동을 위한 전략을 세우는 것이 현명합니다.',
    '토해': '수극토(水剋土)의 해년입니다. 감정적 변동이 크고 불안정한 느낌이 들 수 있습니다. 기본에 충실하고 충동적 결정을 삼가면 연말에는 안정을 되찾습니다.',
    '금해': '금생수(金生水)의 해년입니다. 깊은 통찰과 지혜가 빛나는 해입니다. 학문·연구·명상 등 내면의 성장에 투자하면 이듬해 강력한 경쟁력으로 돌아옵니다.',
    '수해': '수기(水氣)가 가득한 해년입니다. 직관과 감수성이 최고조에 달하는 해입니다. 창작·상담·연구에서 뛰어난 결과가 나오지만 실행력을 잃지 않도록 주의하세요.',
  };
  const key = stemElem + branch;
  if (compound[key]) return compound[key];
  // fallback: branch only
  const byBranch: Record<string, string> = {
    '자': '지혜와 계획의 해. 새로운 시작을 준비하기 좋습니다.',
    '축': '인내와 노력의 해. 묵묵히 쌓아온 것이 기반이 됩니다.',
    '인': '활동과 도전의 해. 새로운 시작에 좋은 에너지.',
    '묘': '성장과 발전의 해. 대인관계가 풍성해집니다.',
    '진': '변화와 전환의 해. 적극적 행동이 결실을 맺습니다.',
    '사': '열정과 성취의 해. 목표를 향해 강하게 나아가는 시기.',
    '오': '명예와 성공의 해. 사회적 활동이 빛납니다.',
    '미': '풍요와 안정의 해. 주변과의 조화가 중요합니다.',
    '신': '결실과 수확의 해. 노력의 결과가 드러납니다.',
    '유': '완성과 정리의 해. 마무리와 새 준비를 동시에.',
    '술': '변화와 도약의 해. 과거를 정리하고 새 방향을 잡으세요.',
    '해': '휴식과 준비의 해. 내면을 충전하고 계획을 세우세요.',
  };
  return byBranch[branch] || '변화와 성장의 해입니다.';
}

// ──────────── 용신 (用神) ────────────
export function getYongsin(
  elementCount: { wood: number; fire: number; earth: number; metal: number; water: number },
  dayElement: string
) {
  const ENG_KOR: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
  const entries = Object.entries(elementCount).map(([k, v]) => ({ eng: k, kor: ENG_KOR[k], count: v }));
  entries.sort((a, b) => a.count - b.count);

  const yongsin = entries[0].kor;   // 가장 부족 → 용신
  const heegsin = entries[1].kor;   // 두 번째 부족 → 희신
  const geesin  = entries[entries.length - 1].kor; // 가장 많음 → 기신

  const colorMap: Record<string, string[]> = {
    '목': ['초록색', '청색', '청록색'],
    '화': ['빨간색', '주황색', '보라색'],
    '토': ['황색', '갈색', '황금색'],
    '금': ['흰색', '금색', '은색'],
    '수': ['검정색', '파란색', '남색']
  };
  const dirMap: Record<string, string[]> = {
    '목': ['동쪽', '동남쪽'], '화': ['남쪽'],
    '토': ['중앙', '남서쪽', '북동쪽'],
    '금': ['서쪽', '북서쪽'], '수': ['북쪽', '북동쪽']
  };

  return {
    yongsin,
    heegsin,
    geesin,
    luckyColors: colorMap[yongsin] ?? ['금색'],
    luckyDirections: dirMap[yongsin] ?? ['동쪽'],
    advice: `${yongsin}(${yongsin}) 기운이 부족합니다. ${yongsin} 기운의 색상·방위·음식을 가까이하면 운이 열립니다.`,
    avoidAdvice: `${geesin} 기운이 과도합니다. ${geesin} 기운이 강한 것은 피하는 것이 좋습니다.`
  };
}

// ──────────── 신강/신약 (身强/身弱) ────────────
export function getSinGangYak(
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getMonthPillar>,
  dayPillar:   ReturnType<typeof getDayPillar>,
  hourPillar:  ReturnType<typeof getDayPillar> | null
) {
  const de = dayPillar.stemElement;
  // 인성(인성이 나를 생함): 일간을 생하는 오행
  const insung = Object.entries(GENERATES).find(([, v]) => v === de)?.[0];

  const others = [yearPillar, monthPillar, ...(hourPillar ? [hourPillar] : [])];
  let score = 0;
  for (const p of others) {
    for (const elem of [p.stemElement, p.branchElement]) {
      if (elem === de)      score += 2; // 비겁(比劫): 같은 오행
      else if (elem === insung) score += 3; // 인성(印星): 일간 생(生)
      else                  score -= 1; // 식상·재성·관살
    }
  }
  // 월지(月支)는 더 강한 영향
  if (monthPillar.branchElement === de)     score += 2;
  if (monthPillar.branchElement === insung) score += 2;

  if (score >= 8) return {
    type: '신강' as const, score,
    description: '사주가 신강(身强)합니다. 일간의 기운이 넘치고 강합니다.',
    advice: '활발하고 도전적인 활동에서 에너지를 발산하세요. 독립적인 사업이나 리더 역할에 적합합니다.',
    suitable: ['창업·경영', '스포츠', '군·경찰', '도전적 직무'],
    caution: '과도한 고집이나 독선이 인간관계를 해칠 수 있습니다.'
  };
  if (score <= 0) return {
    type: '신약' as const, score,
    description: '사주가 신약(身弱)합니다. 일간의 기운이 부족합니다.',
    advice: '지원과 협력이 있는 환경에서 능력이 발휘됩니다. 안정적인 직장이나 팀워크 중심 업무가 유리합니다.',
    suitable: ['공무원·직장인', '예술·창작', '봉사·의료', '연구직'],
    caution: '혼자 모든 것을 짊어지려 하지 말고, 주변의 도움을 적극 활용하세요.'
  };
  return {
    type: '중화' as const, score,
    description: '사주가 중화(中和)에 가깝습니다. 균형 잡힌 기운을 가지고 있습니다.',
    advice: '다양한 환경에 유연하게 적응할 수 있습니다. 어떤 분야든 꾸준함이 성공의 열쇠입니다.',
    suitable: ['어떤 분야든 가능', '관리직', '교육', '서비스직'],
    caution: '결단력이 부족해질 수 있으니 중요한 순간에는 과감하게 행동하세요.'
  };
}

// ──────────── 조심해야 할 것들 ────────────
export function getCarefulThings(
  dayPillar: ReturnType<typeof getDayPillar>,
  monthPillar: ReturnType<typeof getMonthPillar>,
  yearPillar: ReturnType<typeof getYearPillar>,
  elementCount: { wood: number; fire: number; earth: number; metal: number; water: number }
) {
  const de = dayPillar.stemElement;
  const mb = monthPillar.branchIndex;
  const warnings: { category: string; content: string; severity: 'high' | 'medium' | 'low' }[] = [];

  // 건강 경고 — 천간별 맞춤 텍스트 사용 (같은 오행이라도 갑/을 등에 따라 다른 내용)
  warnings.push({
    category: '건강',
    content: getHealthText(dayPillar.stem, dayPillar.stemElement),
    severity: 'medium'
  });

  // 지지 충(沖) 체크
  const CHUNG_PAIRS: [number, number][] = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
  const branchPairs = [
    { a: yearPillar.branchIndex, b: monthPillar.branchIndex, label: '년지-월지' },
    { a: monthPillar.branchIndex, b: dayPillar.branchIndex,  label: '월지-일지' },
    { a: yearPillar.branchIndex, b: dayPillar.branchIndex,   label: '년지-일지' },
  ];
  for (const pair of branchPairs) {
    if (CHUNG_PAIRS.some(([a, b]) => (a === pair.a && b === pair.b) || (a === pair.b && b === pair.a))) {
      warnings.push({
        category: '충(沖)',
        content: `사주 내 ${pair.label}이 충(沖) 관계입니다. 급격한 변화나 이동수가 생기기 쉬우니 중요한 결정은 신중히 하세요.`,
        severity: 'high'
      });
    }
  }

  // 오행 극단 불균형 경고
  const total = Object.values(elementCount).reduce((s, v) => s + v, 0);
  const ENG_KOR: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
  for (const [eng, val] of Object.entries(elementCount)) {
    const kor = ENG_KOR[eng];
    if (val === 0) {
      warnings.push({
        category: '오행 공망',
        content: `${kor} 기운이 완전히 없습니다. ${kor}과 관련된 분야(${getElementDomain(kor)})에서 약점이 나타날 수 있습니다.`,
        severity: 'high'
      });
    } else if (val >= 4) {
      warnings.push({
        category: '오행 과다',
        content: `${kor} 기운이 과도합니다. 이로 인한 고집·편향적 사고를 경계하고, ${CONTROLS[kor]} 기운을 보완하세요.`,
        severity: 'medium'
      });
    }
  }

  // 재물 관련 주의
  warnings.push({
    category: '재물',
    content: getMoneyAdvice(dayPillar.stem, de),
    severity: 'low'
  });

  // 인간관계 주의
  warnings.push({
    category: '인간관계',
    content: getRelationAdvice(dayPillar.stem, de),
    severity: 'low'
  });

  return warnings;
}

function getElementDomain(elem: string): string {
  const map: Record<string, string> = {
    '목': '교육·성장·인자함',
    '화': '명예·열정·표현',
    '토': '신뢰·안정·포용',
    '금': '의리·결단·추진력',
    '수': '지혜·유연성·감수성'
  };
  return map[elem] ?? '';
}

function getMoneyAdvice(dayStem: string, dayElem: string): string {
  const byStem: Record<string, string> = {
    '갑': '즉흥적 소비보다 사업·교육·인재 개발에 대한 장기 투자가 어울립니다. 명분 있는 곳에 지출이 커지는 경향이 있으니, 계획 없는 기부나 도움에 주의하세요.',
    '을': '유연한 재테크 감각으로 작은 기회를 놓치지 않는 편입니다. 충동 소비가 아닌 가치 있는 것에 집중 투자하면 꾸준히 재물이 늘어납니다.',
    '병': '화려함과 사회적 네트워크에 지출이 커질 수 있습니다. 이미지·브랜딩·대인관계 투자는 나중에 큰 수익으로 돌아오는 경우가 많으니 전략적으로 활용하세요.',
    '정': '감성적 소비(선물, 경험, 문화생활)에 지출이 많습니다. 세심한 가계부 작성과 비상금 확보 습관이 장기적 재정 안정의 핵심입니다.',
    '무': '안정적인 부동산·장기저축·적금이 잘 맞습니다. 큰 수익보다 안전하고 꾸준한 수익을 선호하며, 섣부른 투기보다 실물 자산 중심의 재테크가 어울립니다.',
    '기': '꼼꼼한 관리 능력 덕분에 재정 안정이 강점입니다. 다만 지나치게 아끼다가 기회를 놓치지 않도록, 가끔은 적절한 투자도 필요합니다.',
    '경': '분석적이고 원칙적인 투자 스타일입니다. 지나치게 계산적인 태도가 좋은 기회를 놓치게 할 수 있으니, 신뢰할 수 있는 파트너의 의견도 열린 마음으로 들어보세요.',
    '신': '수익보다 가치와 품질에 초점을 두는 소비 성향이 있습니다. 명품이나 전문 투자에 강하지만, 비용 대비 효과를 따지는 습관이 재물을 지키는 비결입니다.',
    '임': '큰 그림을 보는 투자 감각이 있으며, 금융·무역·부동산 등 스케일 큰 분야에서 재물 운이 열립니다. 다만 과도한 확장이 위험을 키울 수 있으니 리스크 관리에 신경 쓰세요.',
    '계': '지식·정보·창작에 대한 투자에서 높은 수익률을 냅니다. 흐름을 읽는 감각이 뛰어나지만, 결정이 느려 기회를 놓치기 쉬우니 행동의 타이밍을 놓치지 마세요.',
  };
  if (byStem[dayStem]) return byStem[dayStem];
  const byElem: Record<string, string> = {
    '목': '즉흥적 소비보다 장기 투자가 유리합니다. 사업·교육 투자가 맞습니다.',
    '화': '감정적 충동 소비를 조심하세요. 네트워크 투자로 수익을 높이세요.',
    '토': '안정적 재테크에 강합니다. 부동산·적금 등 장기적 저축이 유리합니다.',
    '금': '분석적 투자를 잘합니다. 너무 계산적인 태도가 기회를 놓치게 할 수 있습니다.',
    '수': '지식·정보 분야의 투자가 좋습니다. 흐름에 민감하게 반응해 재물이 유동적입니다.',
  };
  return byElem[dayElem] ?? '균형 잡힌 재무 계획을 세우세요.';
}

function getRelationAdvice(dayStem: string, dayElem: string): string {
  const byStem: Record<string, string> = {
    '갑': '리더십이 강해 자신도 모르게 독선적으로 보일 수 있습니다. 상대방의 의견을 먼저 경청하는 자세가 관계를 훨씬 풍요롭게 만듭니다.',
    '을': '상대에게 지나치게 맞추다 보면 자신을 잃을 수 있습니다. 자신의 의견을 더 적극적으로 표현하고, 거절할 줄 아는 용기도 필요합니다.',
    '병': '강렬한 에너지가 때로는 주변을 피곤하게 할 수 있습니다. 상대의 속도에 맞추는 여유를 갖고, 발언보다 청취의 비중을 높여보세요.',
    '정': '세심한 배려가 강점이지만 기대가 크면 상처받기 쉽습니다. 상대에게 원하는 것을 솔직하게 말하는 습관이 관계를 더 건강하게 합니다.',
    '무': '묵직하고 든든한 존재감이 신뢰를 줍니다. 다만 변화를 거부하면 주변이 답답해 할 수 있으니, 새로운 시도를 기꺼이 받아들이는 유연함을 기르세요.',
    '기': '누구에게나 친절해 이용당하기 쉽습니다. 건강한 경계선을 긋는 것이 관계를 더 오래, 더 건강하게 유지하는 방법입니다.',
    '경': '직설적인 표현이 오해를 사기 쉽습니다. 말의 내용은 같아도 방식을 부드럽게 바꾸면 훨씬 많은 사람이 귀를 기울입니다.',
    '신': '높은 기준이 주변에 압박감을 줄 수 있습니다. 완벽하지 않아도 괜찮다는 너그러움을 갖고, 상대의 노력을 먼저 인정해주세요.',
    '임': '폭넓은 인간관계가 장점이지만 깊이가 부족하다는 인상을 줄 수 있습니다. 중요한 관계에는 더 많은 시간과 에너지를 의식적으로 투자하세요.',
    '계': '혼자 모든 것을 고민하는 경향이 있습니다. 신뢰하는 사람에게 마음을 열어 공유하면, 관계도 깊어지고 해결책도 더 잘 보입니다.',
  };
  if (byStem[dayStem]) return byStem[dayStem];
  const byElem: Record<string, string> = {
    '목': '리더십이 강해 독선적으로 보일 수 있습니다. 경청하는 자세가 관계를 풍요롭게 합니다.',
    '화': '감정 기복이 크면 주변이 피곤할 수 있습니다. 냉정한 시각을 유지하는 연습이 필요합니다.',
    '토': '너무 포용적이면 이용당할 수 있습니다. 때로는 거절도 관계를 건강하게 합니다.',
    '금': '냉철한 태도가 차갑게 느껴질 수 있습니다. 감정 표현을 좀 더 적극적으로 해보세요.',
    '수': '혼자 고민하는 경향이 있습니다. 신뢰하는 사람에게 마음을 열어보세요.',
  };
  return byElem[dayElem] ?? '진정성 있는 소통을 유지하세요.';
}

// ──────────── 궁합 심층 분석 데이터 ────────────

const ELEM_TRAITS: Record<string, { strengths: string[]; weaknesses: string[] }> = {
  '목': {
    strengths: ['독창적인 아이디어와 비전 제시', '원칙과 신념에 충실한 모습', '성장·발전을 향한 강한 의지', '상대를 이끄는 자연스러운 리더십'],
    weaknesses: ['자신의 방식을 고집하는 경향', '타협이 어려울 때가 있음', '결정을 내리면 방향을 바꾸기 어려워함'],
  },
  '화': {
    strengths: ['따뜻한 열정으로 관계에 활기를 불어넣음', '감정을 솔직하고 풍부하게 표현', '사교적이고 다양한 경험 추구', '상대를 밝게 만드는 강한 에너지'],
    weaknesses: ['감정 기복이 크고 충동적일 수 있음', '지속적 안정보다 새로운 자극 추구', '한 번에 여러 방향으로 에너지를 분산'],
  },
  '토': {
    strengths: ['믿음직하고 한결같은 안정감 제공', '실용적이고 현실적인 판단력', '상대를 든든하게 받쳐주는 포용력', '오래 지속되는 깊은 신뢰 관계 형성'],
    weaknesses: ['변화와 새로운 시도를 꺼리는 경향', '속마음과 감정을 표현하기 어려워함', '고집이 강해 쉽게 물러서지 않음'],
  },
  '금': {
    strengths: ['원칙과 기준이 명확해 높은 신뢰감', '결단력 있게 문제를 해결하는 능력', '체계적이고 논리적인 접근', '관계에서 일관성과 책임감 유지'],
    weaknesses: ['감정 표현이 부족해 차갑게 느껴질 수 있음', '완벽주의적 성향으로 상대에게 압박감', '비판적으로 보일 때가 있음'],
  },
  '수': {
    strengths: ['깊은 감수성으로 상대를 공감하고 이해', '상황에 맞게 유연하게 대처하는 능력', '지혜롭고 통찰력 있는 조언 제공', '풍부한 내면으로 관계를 깊게 이끔'],
    weaknesses: ['결정이 느리고 우유부단한 면이 있음', '복잡한 감정을 표현하기 어려워함', '내면의 불안이 관계에 영향을 미칠 수 있음'],
  },
};

interface RelDynamic {
  summary: string;
  strengthsTogether: string[];
  challengesTogether: string[];
  tips: string[];
}
type ElemPairKey = string;

const REL_DYNAMICS: Record<ElemPairKey, RelDynamic> = {
  '목-목': {
    summary: '같은 목(木) 기운끼리 만나 서로를 깊이 이해하는 관계입니다. 가치관과 비전이 비슷해 공감대가 넓고, 함께 성장과 발전을 추구합니다. 단, 둘 다 주도권을 원할 수 있어 조율이 필요합니다.',
    strengthsTogether: ['공통된 가치관과 원칙으로 갈등이 적음', '서로의 성장 의지를 응원하며 함께 발전', '비전과 목표를 공유해 강한 팀워크 발휘'],
    challengesTogether: ['둘 다 주도권을 원해 리더십 충돌 가능', '변화에 유연하지 않아 관계가 정체될 수 있음'],
    tips: ['서로의 독립적인 공간과 의견을 인정하세요', '결정할 때 번갈아 양보하는 규칙을 만드세요', '함께 새로운 경험을 쌓아 관계에 활력을 더하세요'],
  },
  '화-화': {
    summary: '두 화(火) 기운이 만나 에너지 넘치고 활기찬 관계를 이룹니다. 서로의 열정을 이해하고 자극하지만, 감정의 파도가 클 때 조율이 중요합니다.',
    strengthsTogether: ['풍성한 감정 표현으로 사랑이 뜨겁고 생동감 있음', '함께 새로운 것을 도전하고 즐기는 것을 좋아함', '서로의 감정 기복을 누구보다 잘 이해함'],
    challengesTogether: ['둘 다 감정적일 때 충돌이 폭발적으로 커질 수 있음', '안정감보다 자극을 추구해 관계가 불안정해질 수 있음'],
    tips: ['감정이 격해졌을 때 잠시 쉬는 시간을 갖는 규칙을 만드세요', '둘 중 한 명이 이성적 역할을 맡는 연습을 해보세요', '안정적인 일상 루틴을 함께 만들어 균형을 잡으세요'],
  },
  '토-토': {
    summary: '두 토(土) 기운이 만나 안정적이고 믿음직한 관계를 형성합니다. 변함없는 신뢰와 편안함이 특징이지만, 역동성을 의식적으로 만들어줄 필요가 있습니다.',
    strengthsTogether: ['든든한 신뢰와 안정감으로 오래 지속되는 관계', '현실적이고 실용적인 결정으로 함께 기반을 다짐', '서로에 대한 깊은 배려와 포용력'],
    challengesTogether: ['변화와 도전을 꺼려 관계가 정체될 수 있음', '각자의 요구나 불만을 표현하지 않아 쌓일 수 있음'],
    tips: ['가끔 평소와 다른 특별한 데이트나 여행으로 활력을 더하세요', '서로의 속마음을 나누는 대화 시간을 의도적으로 만드세요', '새로운 취미를 함께 시작해 공동의 자극을 만드세요'],
  },
  '금-금': {
    summary: '두 금(金) 기운이 만나 원칙과 기준이 명확한 관계입니다. 체계적인 접근을 공유해 신뢰가 높지만, 감정적 온기를 의식적으로 채워줄 필요가 있습니다.',
    strengthsTogether: ['명확한 원칙과 약속으로 신뢰감이 매우 높음', '체계적인 계획으로 함께 목표를 달성하는 능력이 탁월', '일관성 있는 관계 유지'],
    challengesTogether: ['감정 표현이 서툴러 관계가 메마를 수 있음', '둘 다 양보하지 않아 타협이 어려울 수 있음'],
    tips: ['감정을 표현하는 노력을 의식적으로 해보세요 (말, 편지, 선물)', '상대의 감정을 먼저 물어보는 습관을 들이세요', '완벽하지 않아도 괜찮다는 여유를 서로에게 허용하세요'],
  },
  '수-수': {
    summary: '두 수(水) 기운이 만나 깊은 감수성과 통찰력으로 연결된 관계입니다. 서로의 복잡한 내면을 누구보다 잘 이해하지만, 결단력 있는 행동이 부족할 수 있습니다.',
    strengthsTogether: ['서로의 감정과 생각을 깊이 이해하는 탁월한 공감 능력', '지적인 대화와 깊은 교류로 풍성한 관계', '직관적으로 상대의 필요를 미리 파악'],
    challengesTogether: ['둘 다 결정이 느려 중요한 순간에 행동이 미뤄질 수 있음', '서로의 불안을 키워주는 악순환이 생길 수 있음'],
    tips: ['작은 결정부터 빠르게 실행하는 연습을 함께 하세요', '불안하거나 걱정될 때 서로를 다독이는 역할을 나눠가세요', '활동적인 취미를 추가해 정체된 에너지를 흘려보내세요'],
  },
  '목-화': {
    summary: '목(木)이 화(火)를 생해주는 이상적인 상생 관계입니다. 목의 안정적인 지원과 방향성이 화의 열정을 더욱 빛나게 하며, 함께 꿈을 이루어가는 강한 시너지가 있습니다.',
    strengthsTogether: ['목의 방향성이 화의 에너지를 집중시켜 놀라운 성취를 이룸', '목의 안정감 + 화의 추진력 = 강력한 행동력', '서로가 최고의 모습을 이끌어내는 최상의 파트너십'],
    challengesTogether: ['목이 너무 방향을 제한하면 화가 답답함을 느낄 수 있음', '화의 충동적 결정이 목의 계획을 흐트러뜨릴 수 있음'],
    tips: ['목은 화에게 자유롭게 표현할 공간을 충분히 허용하세요', '화는 목의 원칙을 존중하고 장기적인 목표를 함께 세우세요', '목은 전략, 화는 실행으로 역할을 나누면 최강 팀이 됩니다'],
  },
  '화-목': {
    summary: '화(火)의 뜨거운 열정이 목(木)의 성장을 응원하는 관계입니다. 목의 원칙 아래 화의 활기찬 에너지가 더 빛나고, 목은 화에게 든든한 기반이 됩니다.',
    strengthsTogether: ['화의 열정이 목의 비전을 현실로 만드는 원동력', '목의 안정감이 화에게 든든한 기반을 제공', '서로의 강점이 완벽하게 보완되는 관계'],
    challengesTogether: ['화가 충동적으로 행동하면 목이 걱정하고 제지할 수 있음', '목의 원칙에 화가 구속감을 느낄 수 있음'],
    tips: ['화는 중요한 결정 전에 목의 의견을 먼저 구하는 습관을 들이세요', '목은 화의 도전적 시도를 열린 마음으로 지지해주세요', '함께 큰 프로젝트나 여행을 계획해 시너지를 발휘하세요'],
  },
  '화-토': {
    summary: '화(火)가 토(土)를 생해주는 상생 관계입니다. 화의 열정과 아이디어가 토의 현실적인 토대 위에 꽃을 피우며, 서로의 장점이 자연스럽게 보완됩니다.',
    strengthsTogether: ['화의 창의적 아이디어를 토가 실용적으로 구현', '화의 따뜻함이 토에게 생동감 있는 활력을 불어넣음', '토의 안정감이 화에게 정서적 기반을 제공'],
    challengesTogether: ['화의 빠른 변화 요구와 토의 느린 적응 속도가 마찰을 일으킬 수 있음', '화가 과도하게 에너지를 쏟으면 토가 감당하기 어려울 수 있음'],
    tips: ['화는 변화를 요구할 때 토에게 충분한 시간을 주세요', '토는 화의 새로운 아이디어에 더 열린 자세를 취하세요', '화의 꿈과 토의 실행 계획을 함께 세우는 시간을 가지세요'],
  },
  '토-화': {
    summary: '토(土)의 든든함이 화(火)의 빛나는 에너지를 받쳐주는 관계입니다. 화의 열정이 토에게 활기를 주고, 토는 화에게 안전하고 따뜻한 기반을 제공합니다.',
    strengthsTogether: ['토의 변함없는 신뢰가 화에게 자유로운 날갯짓을 허용', '화의 생동감이 토의 일상에 풍부한 즐거움을 더함', '화가 실수해도 토가 안정적으로 받쳐줌'],
    challengesTogether: ['화의 변화 요구에 토가 방어적으로 반응할 수 있음', '토가 너무 수동적이면 화가 답답함을 느낄 수 있음'],
    tips: ['토는 화의 활기찬 에너지를 부담이 아닌 선물로 즐기려 노력하세요', '화는 토의 조용한 방식도 깊은 사랑 표현임을 이해하세요', '서로 다른 페이스를 인정하고 함께 즐길 수 있는 리듬을 찾으세요'],
  },
  '토-금': {
    summary: '토(土)가 금(金)을 생해주는 상생 관계입니다. 토의 든든한 기반 위에 금의 능력이 더욱 날카롭게 빛나며, 신뢰와 원칙이 결합된 강력한 파트너십을 이룹니다.',
    strengthsTogether: ['토의 안정된 지원 위에 금의 결단력이 빛을 발함', '토의 포용력이 금의 날카로움을 부드럽게 감쌈', '신뢰와 원칙이 결합된 강력한 파트너십'],
    challengesTogether: ['금의 비판적 성향이 토에게 상처를 줄 수 있음', '토가 변화에 느리면 금이 답답해 할 수 있음'],
    tips: ['금은 토의 노력에 구체적인 칭찬과 인정을 표현하세요', '토는 금의 직설적인 말을 비판이 아닌 솔직함으로 받아들이세요', '함께 장기적인 목표를 세우고 역할을 분담하면 강력한 팀이 됩니다'],
  },
  '금-토': {
    summary: '금(金)의 날카로운 원칙이 토(土)의 든든한 기반을 만나는 관계입니다. 토의 안정감이 금에게 소중한 정서적 지지가 되고, 금의 결단력이 토에게 방향을 제시합니다.',
    strengthsTogether: ['금의 명확한 결정력을 토가 충실히 지원', '토의 신뢰감이 금에게 부드러운 인간미를 더함', '체계적이면서도 따뜻한 관계 형성'],
    challengesTogether: ['금이 너무 원칙적이면 토가 지칠 수 있음', '토의 소극성이 금의 발전 속도를 방해할 수 있음'],
    tips: ['금은 결정 과정에 토의 의견을 충분히 반영하세요', '토는 금에게 감정적인 지지를 적극적으로 표현하세요', '서로의 다른 속도를 존중하며 공동의 목표를 향해 나아가세요'],
  },
  '금-수': {
    summary: '금(金)이 수(水)를 생해주는 상생 관계입니다. 금의 명확한 원칙이 수의 깊은 지혜를 더욱 풍성하게 하고, 수의 감수성이 금에게 따뜻한 인간미를 불어넣습니다.',
    strengthsTogether: ['금의 결단력과 수의 통찰력이 결합되면 탁월한 판단력 발휘', '금의 체계성이 수의 창의적인 생각을 현실로 구현', '서로의 깊이 있는 내면을 이해하며 함께 성장'],
    challengesTogether: ['금의 냉철함이 수의 섬세한 감정에 상처를 줄 수 있음', '수의 우유부단함이 금을 답답하게 할 수 있음'],
    tips: ['금은 수에게 감정적으로 따뜻하게 접근하는 연습을 하세요', '수는 금의 도움을 받아 결정을 빠르게 내리는 연습을 하세요', '함께 깊은 대화를 나누는 시간을 자주 만들어 친밀감을 쌓으세요'],
  },
  '수-금': {
    summary: '수(水)의 깊은 감수성이 금(金)의 단단한 원칙을 만나는 관계입니다. 금의 명확함이 수에게 방향을 제시해주고, 수의 공감 능력이 금에게 따뜻함을 더합니다.',
    strengthsTogether: ['수의 직관이 금의 논리를 만나 균형 잡힌 판단력을 발휘', '금의 안정감이 수의 불안을 잠재워줌', '깊이 있고 지적인 관계 형성'],
    challengesTogether: ['금의 냉정한 표현이 수를 서운하게 할 수 있음', '수가 너무 감정적이면 금이 거리를 둘 수 있음'],
    tips: ['금은 수의 감수성을 존중하고 따뜻한 말 한마디에 신경 써주세요', '수는 금에게 구체적으로 무엇이 필요한지 명확히 전달해보세요', '정기적으로 서로의 감정과 생각을 솔직히 나누는 시간을 가지세요'],
  },
  '수-목': {
    summary: '수(水)가 목(木)을 생해주는 아름다운 상생 관계입니다. 수의 깊은 지혜와 유연성이 목의 성장과 도전을 촉진하고, 목의 비전이 수에게 방향감을 줍니다.',
    strengthsTogether: ['수의 유연한 적응력이 목의 도전을 든든히 뒷받침', '목의 비전이 수의 지혜로 더욱 정교해짐', '서로를 성장시키는 발전적인 관계'],
    challengesTogether: ['수가 너무 흔들리면 목이 의지할 기반이 흔들릴 수 있음', '목의 고집이 수의 유연한 제안을 무시할 수 있음'],
    tips: ['수는 목에게 현명한 조언을 아끼지 마세요', '목은 수의 직관적인 충고를 진지하게 받아들이세요', '목이 도전하고 수가 지원하는 역할 분담으로 강력한 팀을 이루세요'],
  },
  '목-수': {
    summary: '목(木)이 수(水)의 깊은 지혜를 품어주는 관계입니다. 목의 원칙 아래 수의 풍부한 감수성이 더욱 아름답게 피어나고, 수는 목에게 따뜻한 정서적 안정을 줍니다.',
    strengthsTogether: ['목의 방향성이 수에게 흔들리지 않는 기준이 됨', '수의 공감 능력이 목에게 따뜻한 안정감을 줌', '논리와 감성이 균형 잡힌 아름다운 관계'],
    challengesTogether: ['목이 원칙에 너무 집착하면 수가 답답해할 수 있음', '수의 감정 기복에 목이 어떻게 반응할지 몰라 당황할 수 있음'],
    tips: ['목은 수의 감정 변화를 이해하려는 노력을 기울이세요', '수는 목에게 자신의 필요와 감정을 솔직히 표현하세요', '함께 창의적인 활동이나 여행으로 서로의 세계를 확장하세요'],
  },
  '목-토': {
    summary: '목(木)이 토(土)를 극하는 상극 관계입니다. 목의 직접적인 스타일이 토에게 자극이 될 수 있지만, 서로의 차이를 이해하고 배우면 충분히 아름다운 관계를 만들 수 있습니다.',
    strengthsTogether: ['목의 추진력이 토의 안정성을 자극해 발전을 이끌어냄', '토의 든든함이 목에게 안식처가 됨', '서로의 다른 방식을 배우며 폭넓게 성장'],
    challengesTogether: ['목의 직접적인 표현이 토에게 압박감으로 느껴질 수 있음', '토의 변화 거부가 목에게 벽처럼 느껴질 수 있음'],
    tips: ['목은 변화를 요구할 때 토의 페이스를 존중하고 천천히 접근하세요', '토는 목의 새로운 아이디어를 조금씩 받아들이는 연습을 하세요', '서로의 차이점이 오히려 성장의 원동력임을 함께 인식하세요'],
  },
  '토-목': {
    summary: '토(土)의 안정감이 목(木)의 도전 정신을 만나는 관계입니다. 목의 활기찬 에너지가 토에게 새로운 시각을 주고, 토의 기반이 목에게 든든한 후방이 됩니다.',
    strengthsTogether: ['토의 안정감이 목의 도전을 위한 든든한 후방이 됨', '목의 변화 추구가 토에게 새로운 시각을 제공', '서로의 상반된 강점으로 균형 있는 관계 형성'],
    challengesTogether: ['목의 급한 결정이 토를 불안하게 만들 수 있음', '토의 소극적 태도가 목의 의욕을 꺾을 수 있음'],
    tips: ['토는 목의 에너지를 수용하는 여유를 가지세요', '목은 토의 신중한 의견을 경청하고 반영하세요', '빠름과 느림의 리듬을 조율해 최적의 템포를 찾으세요'],
  },
  '토-수': {
    summary: '토(土)가 수(水)를 극하는 상극 관계입니다. 두 사람의 방식이 다르지만, 서로의 차이를 이해하면 놀라운 보완 관계가 됩니다. 노력이 관계를 풍성하게 만듭니다.',
    strengthsTogether: ['토의 현실감이 수의 추상적 아이디어를 실현 가능하게 만듦', '수의 유연성이 토의 경직된 사고를 넓혀줌', '서로 다른 시각으로 더 균형 잡힌 결정을 내림'],
    challengesTogether: ['토의 고집이 수의 흐름을 막아 답답함을 줄 수 있음', '수의 자유로운 방식이 토에게 혼란스럽게 느껴질 수 있음'],
    tips: ['토는 수의 유연한 방식을 통제하려 하지 말고 존중하세요', '수는 토에게 자신의 생각과 방향을 명확히 설명해주세요', '서로의 결정 방식을 이해하고 합의점을 찾는 대화를 늘리세요'],
  },
  '수-토': {
    summary: '수(水)의 깊은 흐름이 토(土)의 단단한 기반과 만나는 관계입니다. 수의 유연성이 토에게 새로운 시각을 주고, 토의 견고함이 수의 불안정한 감정을 잡아줍니다.',
    strengthsTogether: ['수의 통찰력이 토에게 미처 보지 못한 관점을 제시', '토의 견고함이 수의 감정을 안정시켜줌', '서로의 약점을 메워주는 상보적 관계'],
    challengesTogether: ['수가 지나치게 감정적이면 토가 이해하기 어려울 수 있음', '토의 보수적인 태도가 수의 변화 추구를 막을 수 있음'],
    tips: ['수는 토에게 감정보다 논리로 먼저 접근해보세요', '토는 수의 직관을 무시하지 말고 귀 기울여보세요', '각자의 방식을 비판하기보다 상호 보완적으로 활용하세요'],
  },
  '수-화': {
    summary: '수(水)가 화(火)를 극하는 관계입니다. 차가운 이성과 뜨거운 열정이 만나 강한 긴장감이 있지만, 이끌림도 강한 관계입니다. 서로의 반대되는 에너지가 매력이 될 수 있습니다.',
    strengthsTogether: ['수의 냉철함이 화의 충동을 조절해 더 나은 결정을 이끌어냄', '화의 열정이 수에게 삶의 활기를 불어넣음', '서로의 반대 에너지로 강한 이끌림과 깊은 보완 형성'],
    challengesTogether: ['수가 화의 감정 표현을 억누르면 화가 큰 폭발을 일으킬 수 있음', '화의 충동적 행동이 수의 계획을 뒤엎을 수 있음'],
    tips: ['수는 화의 감정을 꺼뜨리지 말고 긍정적으로 방향을 잡아주세요', '화는 수의 신중한 판단을 브레이크가 아닌 선물로 여기세요', '대화할 때 감정과 이성을 균형 있게 사용하는 연습을 함께 하세요'],
  },
  '화-수': {
    summary: '화(火)의 뜨거운 열정이 수(水)의 차가운 지혜를 만나는 관계입니다. 강한 대비 속에 깊은 매력이 있지만, 서로를 이해하는 노력이 특히 중요합니다.',
    strengthsTogether: ['화의 열정이 수에게 삶의 온기와 자극을 제공', '수의 지혜가 화의 에너지에 방향을 잡아줌', '극적인 대비가 오히려 깊은 끌림으로 작용'],
    challengesTogether: ['화의 즉흥성과 수의 신중함이 자주 충돌할 수 있음', '수가 화를 이해하지 못하면 화가 깊은 상처를 받을 수 있음'],
    tips: ['화는 중요한 결정 전 수의 의견을 구하는 습관을 들이세요', '수는 화에게 따뜻한 공감과 지지를 표현하는 노력을 하세요', '서로의 다름을 매력으로 여기고 배움의 기회로 삼으세요'],
  },
  '화-금': {
    summary: '화(火)가 금(金)을 극하는 관계입니다. 화의 열정적인 접근이 금의 원칙에 도전을 주고, 서로가 강한 자극이 됩니다. 이해와 존중이 바탕이 되면 큰 성과를 만들 수 있습니다.',
    strengthsTogether: ['화의 창의성이 금의 체계에 혁신을 더함', '금의 원칙이 화의 에너지를 효율적으로 이끌어냄', '서로가 자극이 되어 최고의 성과를 끌어냄'],
    challengesTogether: ['화의 감정적 접근이 금의 이성적 방식과 충돌할 수 있음', '금의 냉정한 비판이 화의 열정에 찬물을 끼얹을 수 있음'],
    tips: ['화는 금에게 감정을 담되 논리적으로 대화하는 연습을 하세요', '금은 화의 아이디어를 비판하기 전 먼저 칭찬하는 습관을 들이세요', '창의성과 체계성을 결합해 함께 큰 성과를 만들어보세요'],
  },
  '금-화': {
    summary: '금(金)의 날카로운 원칙이 화(火)의 뜨거운 열정을 만나는 관계입니다. 화의 따뜻함이 금의 딱딱한 면을 녹여주고, 금의 체계가 화의 에너지를 집중시킵니다.',
    strengthsTogether: ['금의 체계 위에 화의 열정이 더해져 강력한 실행력 발휘', '화의 따뜻함이 금에게 인간적인 온기를 줌', '원칙과 열정의 결합으로 높은 성과 달성'],
    challengesTogether: ['금의 냉철한 표현이 화에게 상처를 줄 수 있음', '화의 감정 기복이 금을 불편하게 만들 수 있음'],
    tips: ['금은 화에게 더 따뜻하고 감성적인 방식으로 표현해보세요', '화는 금의 직설적인 말을 개인적으로 받아들이지 않으려 노력하세요', '논리와 감성의 균형을 찾아 두 사람만의 대화법을 개발하세요'],
  },
  '금-목': {
    summary: '금(金)이 목(木)을 극하는 관계입니다. 서로 강한 자극을 주는 관계로, 이해와 존중이 바탕이 되면 서로를 크게 성장시키는 파트너가 됩니다.',
    strengthsTogether: ['금의 논리가 목의 감성적 결정에 균형을 맞춰줌', '목의 유연성이 금의 경직된 사고를 보완', '서로 배울 점이 많아 성장이 빠른 관계'],
    challengesTogether: ['금의 비판이 목에게 상처를 주고 의욕을 꺾을 수 있음', '목의 고집이 금의 원칙과 정면충돌할 수 있음'],
    tips: ['금은 목을 비판할 때 구체적이고 건설적인 방식을 택하세요', '목은 금의 의견을 방어적으로 받아들이지 말고 성장의 기회로 삼으세요', '서로의 강점을 인정하고 보완하는 팀워크를 키워나가세요'],
  },
  '목-금': {
    summary: '목(木)의 성장 지향적 에너지가 금(金)의 날카로운 원칙을 만나는 관계입니다. 금의 명확한 기준이 목에게 자극이 되고, 목의 비전이 금의 체계로 더욱 단단해집니다.',
    strengthsTogether: ['목의 비전을 금의 체계적인 실행력이 현실로 만듦', '금의 피드백이 목을 더욱 단단하게 성장시킴', '도전과 완성의 시너지로 높은 성취 달성'],
    challengesTogether: ['금의 날카로운 비판이 목의 자신감을 흔들 수 있음', '목의 감정적 접근이 금에게 비효율로 느껴질 수 있음'],
    tips: ['금은 목의 감정도 충분히 배려하는 리더십을 발휘하세요', '목은 금의 피드백을 성장의 선물로 받아들이는 연습을 하세요', '서로의 다른 강점을 존중하고 협력하는 방식을 함께 찾아보세요'],
  },
};

// ──────────── 궁합 (宮合) ────────────
export function calculateGungap(
  p1: { year: number; month: number; day: number; hour: number; gender: 'male' | 'female' },
  p2: { year: number; month: number; day: number; hour: number; gender: 'male' | 'female' }
) {
  const d1 = getDayPillar(p1.year, p1.month, p1.day);
  const d2 = getDayPillar(p2.year, p2.month, p2.day);
  const y1 = getYearPillar(p1.year);
  const y2 = getYearPillar(p2.year);

  const b1 = d1.branchIndex, b2 = d2.branchIndex;
  const e1 = d1.stemElement, e2 = d2.stemElement;

  // 삼합(三合): 인오술(2,6,10), 사유축(5,9,1), 신자진(8,0,4), 해묘미(11,3,7)
  const SAMHAP = [[2,6,10],[5,9,1],[8,0,4],[11,3,7]];
  // 육합(六合): 자축·인해·묘술·진유·사신·오미
  const YUKHAP = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
  // 충(沖)
  const CHUNG  = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
  // 형(刑)
  const HYUNG  = [[2,11],[5,8],[3,6,9],[0]]; // 인해, 사신, 축술미, 자자

  const isSamhap = SAMHAP.some(g => g.includes(b1) && g.includes(b2));
  const isYukhap = YUKHAP.some(([a, bb]) => (a===b1&&bb===b2)||(a===b2&&bb===b1));
  const isChung  = CHUNG.some(([a, bb]) => (a===b1&&bb===b2)||(a===b2&&bb===b1));
  const isHyung  = HYUNG.some(g => g.includes(b1) && g.includes(b2) && b1 !== b2);

  // 年支 띠 궁합
  const y1b = y1.branchIndex, y2b = y2.branchIndex;
  const isZodiacSamhap = SAMHAP.some(g => g.includes(y1b) && g.includes(y2b));
  const isZodiacChung  = CHUNG.some(([a, bb]) => (a===y1b&&bb===y2b)||(a===y2b&&bb===y1b));

  let score = 65;
  const details: { icon: string; label: string; content: string; positive: boolean }[] = [];

  if (isSamhap) {
    score += 18;
    details.push({ icon: '✨', label: '삼합(三合)', content: `일지가 삼합 관계로 깊은 유대감과 동료 의식을 형성합니다.`, positive: true });
  }
  if (isYukhap) {
    score += 14;
    details.push({ icon: '💞', label: '육합(六合)', content: `일지가 육합으로 자연스럽게 서로에게 끌리는 인연입니다.`, positive: true });
  }
  if (isZodiacSamhap) {
    score += 8;
    details.push({ icon: '🐉', label: '띠 삼합', content: `띠끼리 삼합 관계로 기본 성향이 잘 맞습니다.`, positive: true });
  }
  if (GENERATES[e1] === e2 || GENERATES[e2] === e1) {
    score += 10;
    details.push({ icon: '🌱', label: '오행 생(生)', content: `일간 오행이 서로를 돕는 생(生) 관계입니다. 자연스럽게 보완합니다.`, positive: true });
  } else if (e1 === e2) {
    score += 5;
    details.push({ icon: '🤝', label: '동일 오행', content: `일간 오행이 같아 서로를 잘 이해하고 공감대가 높습니다.`, positive: true });
  } else if (CONTROLS[e1] === e2 || CONTROLS[e2] === e1) {
    score -= 8;
    details.push({ icon: '⚔️', label: '오행 극(克)', content: `일간 오행이 상극 관계. 서로 강한 자극을 주지만 마찰이 생길 수 있습니다.`, positive: false });
  }
  if (isChung) {
    score -= 22;
    details.push({ icon: '💥', label: '일지 충(沖)', content: `일지가 충 관계입니다. 생활 방식과 가치관 충돌이 잦을 수 있습니다. 대화와 타협이 필수입니다.`, positive: false });
  }
  if (isZodiacChung) {
    score -= 10;
    details.push({ icon: '🌩️', label: '띠 충(沖)', content: `띠가 충 관계입니다. 기질 차이가 크니 서로를 이해하는 노력이 필요합니다.`, positive: false });
  }
  if (isHyung) {
    score -= 12;
    details.push({ icon: '⚠️', label: '형(刑)', content: `지지 형 관계로 사소한 갈등이 오해로 번질 수 있습니다. 언어에 주의하세요.`, positive: false });
  }

  score = Math.max(10, Math.min(99, score));
  const grade =
    score >= 88 ? '천생연분(天生緣分)' :
    score >= 75 ? '좋은 궁합' :
    score >= 60 ? '보통 궁합' :
    score >= 45 ? '노력이 필요한 궁합' : '어려운 궁합';

  const advice =
    score >= 88 ? '서로에게 천생연분에 가까운 관계입니다. 각자의 장점이 극대화됩니다.' :
    score >= 75 ? '좋은 궁합입니다. 서로 존중하면 매우 행복한 관계가 됩니다.' :
    score >= 60 ? '보통 궁합입니다. 차이를 인정하고 소통하면 충분히 행복할 수 있습니다.' :
    score >= 45 ? '다소 어려운 궁합이지만, 노력으로 극복 가능합니다. 상대방의 입장을 이해하려는 노력이 중요합니다.' :
    '상극의 기운이 강합니다. 서로의 차이를 인정하고 배우는 자세가 필요합니다.';

  const relKey = `${e1}-${e2}`;
  const dyn: RelDynamic = REL_DYNAMICS[relKey] ?? {
    summary: '두 사람의 기운이 만나 독특한 관계를 이룹니다. 서로의 차이를 이해하고 존중하는 노력이 관계를 아름답게 만듭니다.',
    strengthsTogether: ['서로 다른 강점이 보완적으로 작용할 수 있음', '차이에서 배우며 함께 성장하는 관계', '소통과 노력으로 더욱 단단해지는 인연'],
    challengesTogether: ['서로의 방식 차이가 오해를 만들 수 있음', '충분한 대화와 이해가 필요한 관계'],
    tips: ['서로의 다름을 인정하고 존중하는 것이 우선입니다', '규칙적인 대화로 감정을 나누는 습관을 들이세요', '상대방의 입장에서 생각하는 연습을 꾸준히 하세요'],
  };

  return {
    score,
    grade,
    advice,
    details,
    summary: dyn.summary,
    strengthsTogether: dyn.strengthsTogether,
    challengesTogether: dyn.challengesTogether,
    tips: dyn.tips,
    p1Strengths:  ELEM_TRAITS[e1]?.strengths  ?? [],
    p1Weaknesses: ELEM_TRAITS[e1]?.weaknesses ?? [],
    p2Strengths:  ELEM_TRAITS[e2]?.strengths  ?? [],
    p2Weaknesses: ELEM_TRAITS[e2]?.weaknesses ?? [],
    p1Element: e1,
    p2Element: e2,
    p1: { dayPillar: d1, yearPillar: y1 },
    p2: { dayPillar: d2, yearPillar: y2 },
    isSamhap, isYukhap, isChung, isHyung
  };
}

// ─── 삼재 (三災) ───────────────────────────────────────────────────────────────
// 삼재는 12년 주기에서 연속 3년간 찾아오는 재앙의 기운
// 해묘미(돼지·토끼·양) → 사오미년, 인오술(호랑이·말·개) → 신유술년
// 사유축(뱀·닭·소) → 해자축년, 신자진(원숭이·쥐·용) → 인묘진년
function getYearBranchIdx(year: number): number {
  // 2024=갑진(辰=4), (2024+8)%12=4 ✓
  return (year + 8) % 12;
}

export function getSamjae(birthBranchIdx: number, currentYear: number): {
  inSamjae: boolean;
  type: '들삼재' | '눌삼재' | '날삼재' | null;
  samjaeYears: number[];
  description: string;
  advice: string;
  nextSamjae: number | null;
} {
  const curBranch = getYearBranchIdx(currentYear);

  // [출생 지지들, 삼재 년도 지지: [들,눌,날]]
  const groups: { births: number[]; samjaeYears: number[] }[] = [
    { births: [11, 3, 7],  samjaeYears: [5, 6, 7]  }, // 해묘미 → 사오미
    { births: [2, 6, 10],  samjaeYears: [8, 9, 10] }, // 인오술 → 신유술
    { births: [5, 9, 1],   samjaeYears: [11, 0, 1] }, // 사유축 → 해자축
    { births: [8, 0, 4],   samjaeYears: [2, 3, 4]  }, // 신자진 → 인묘진
  ];

  const typeNames = ['들삼재', '눌삼재', '날삼재'] as const;
  const typeDescs = [
    '삼재가 시작되는 해입니다. 새로운 일을 시작하거나 큰 변화를 추진하기보다는 현상 유지에 집중하는 것이 좋습니다.',
    '삼재의 본격적인 해입니다. 가장 주의가 필요한 시기로, 건강·재물·인간관계 모든 면에서 신중함이 요구됩니다.',
    '삼재의 마지막 해입니다. 점차 기운이 회복되지만 아직 방심은 금물입니다. 마무리를 잘 지어야 합니다.',
  ];
  const typeAdvices = [
    '이사·결혼·투자·창업 등 중대한 결정은 신중하게 하세요. 부적이나 부정 타는 행동은 피하고, 긍정적인 마음가짐을 유지하세요.',
    '건강 검진을 꼭 받으세요. 금전 거래, 보증, 계약은 특히 주의가 필요합니다. 주변 사람과의 갈등을 최소화하고 덕을 쌓으세요.',
    '서서히 안정을 찾아가는 시기입니다. 무리하지 않고 꾸준히 실력을 쌓으며 도약을 준비하기 좋은 때입니다.',
  ];

  for (const group of groups) {
    if (group.births.includes(birthBranchIdx)) {
      const idx = group.samjaeYears.indexOf(curBranch);
      if (idx !== -1) {
        const startYear = currentYear - idx;
        return {
          inSamjae: true,
          type: typeNames[idx],
          samjaeYears: [startYear, startYear + 1, startYear + 2],
          description: typeDescs[idx],
          advice: typeAdvices[idx],
          nextSamjae: null,
        };
      }
      // 다음 삼재 시작 년도 계산
      const firstSamjaeBranch = group.samjaeYears[0];
      let diff = (firstSamjaeBranch - curBranch + 12) % 12;
      if (diff === 0) diff = 12;
      return {
        inSamjae: false, type: null, samjaeYears: [],
        description: '현재 삼재 기간이 아닙니다. 적극적으로 도전하기 좋은 시기입니다.',
        advice: '',
        nextSamjae: currentYear + diff,
      };
    }
  }
  return {
    inSamjae: false, type: null, samjaeYears: [],
    description: '현재 삼재 기간이 아닙니다.',
    advice: '', nextSamjae: null,
  };
}

// ─── 용신 보완 아이템 추천 ─────────────────────────────────────────────────────
export function getYongsinItems(yongsinElement: string): {
  foods: { icon: string; name: string; desc: string }[];
  crystals: { icon: string; name: string; desc: string }[];
  habits: string[];
  avoid: string[];
} {
  const items: Record<string, ReturnType<typeof getYongsinItems>> = {
    '목': {
      foods: [
        { icon: '🥦', name: '녹색 채소', desc: '시금치, 브로콜리, 쑥 — 간 기능을 강화합니다' },
        { icon: '🫐', name: '신맛 식품', desc: '블루베리, 식초, 레몬 — 목(木) 기운을 활성화합니다' },
        { icon: '🌿', name: '녹차·쑥차', desc: '간 해독과 목 기운 보충에 탁월합니다' },
      ],
      crystals: [
        { icon: '💚', name: '녹색 모스 아게이트', desc: '성장과 풍요의 돌. 목 기운을 강화합니다' },
        { icon: '🌿', name: '에메랄드', desc: '생명력과 균형을 가져다주는 보석입니다' },
        { icon: '🟢', name: '녹색 아벤투린', desc: '행운과 기회를 끌어당기는 돌입니다' },
      ],
      habits: ['이른 아침 산책 (나무 기운 흡수)', '식물 키우기·원예', '동쪽 방향 책상 배치', '녹색 계열 의류 착용'],
      avoid: ['금속성 도구 자주 사용 피하기', '과도한 매운 음식', '서쪽 방향 주력 활동'],
    },
    '화': {
      foods: [
        { icon: '🌶️', name: '붉은색 식품', desc: '토마토, 딸기, 석류 — 심장 기능을 강화합니다' },
        { icon: '☕', name: '계피·생강차', desc: '체내 열 기운을 높이고 순환을 촉진합니다' },
        { icon: '🥩', name: '쓴맛 식품', desc: '여주, 쌉싸름한 채소 — 화(火) 기운을 보충합니다' },
      ],
      crystals: [
        { icon: '🔴', name: '루비', desc: '열정과 생명력의 돌. 화 기운을 강하게 합니다' },
        { icon: '🧡', name: '카넬리안(홍옥수)', desc: '창의력과 활력을 불어넣는 보석입니다' },
        { icon: '🔥', name: '화염 오팔', desc: '자신감과 리더십을 강화합니다' },
      ],
      habits: ['밝고 따뜻한 조명의 공간 활용', '남쪽 방향 책상 배치', '빨강·주황 포인트 인테리어', '햇살 아래 활동 늘리기'],
      avoid: ['지나친 냉방·찬 음식 과다 섭취', '어두운 공간에 장시간 머물기', '북쪽 방향 주력'],
    },
    '토': {
      foods: [
        { icon: '🍠', name: '황색 식품', desc: '고구마, 호박, 된장 — 비위를 강화합니다' },
        { icon: '🌾', name: '잡곡·현미', desc: '토(土) 기운을 안정시키는 기본 식품입니다' },
        { icon: '🍯', name: '단맛 식품', desc: '꿀, 대추, 호두 — 토 기운을 보충합니다' },
      ],
      crystals: [
        { icon: '🟡', name: '황수정(시트린)', desc: '풍요와 안정의 돌. 토 기운을 채워줍니다' },
        { icon: '🤎', name: '타이거아이', desc: '의지력과 안정감을 강화하는 보석입니다' },
        { icon: '🟠', name: '재스퍼', desc: '대지의 기운을 담은 안정의 돌입니다' },
      ],
      habits: ['흙 밟기, 산행 (대지 기운 충전)', '중앙·사방 균형 잡힌 공간 배치', '노란색·베이지 인테리어', '규칙적인 식사 시간 유지'],
      avoid: ['불규칙한 식사', '과도한 목 기운 음식(신맛 과다)', '습한 환경 장기 노출'],
    },
    '금': {
      foods: [
        { icon: '🤍', name: '흰색 식품', desc: '배, 무, 도라지 — 폐 기능을 강화합니다' },
        { icon: '🥛', name: '매운맛 식품', desc: '무, 양파, 생강 — 금(金) 기운을 보충합니다' },
        { icon: '🍚', name: '견과류·백미', desc: '폐와 대장을 강화하는 식품입니다' },
      ],
      crystals: [
        { icon: '⬜', name: '백수정(화이트 쿼츠)', desc: '정화와 명료함의 돌. 금 기운을 강화합니다' },
        { icon: '🔵', name: '블루 레이스 아게이트', desc: '차분함과 결단력을 강화합니다' },
        { icon: '💎', name: '다이아몬드·수정', desc: '가장 강력한 금 기운의 보석입니다' },
      ],
      habits: ['이른 저녁 호흡 명상', '서쪽 방향 책상 배치', '흰색·금색·은색 의류 착용', '금속 장신구 착용'],
      avoid: ['지나친 붉은색·화기 음식', '남쪽 방향 주력 활동', '과도한 수다·소음 환경'],
    },
    '수': {
      foods: [
        { icon: '🐟', name: '해산물·생선', desc: '미역, 다시마, 생선 — 신장 기능을 강화합니다' },
        { icon: '🫘', name: '검은색 식품', desc: '흑미, 검은콩, 블랙 푸드 — 수(水) 기운을 보충합니다' },
        { icon: '💧', name: '짠맛 식품', desc: '천연 소금, 된장, 간장 — 신장과 방광을 강화합니다' },
      ],
      crystals: [
        { icon: '🔵', name: '아쿠아마린', desc: '직관력과 지혜를 강화하는 바다의 돌입니다' },
        { icon: '💙', name: '소달라이트', desc: '깊은 통찰과 내면의 평화를 가져다줍니다' },
        { icon: '🌊', name: '문스톤', desc: '직관력과 감수성을 높이는 달의 보석입니다' },
      ],
      habits: ['수영·목욕·족욕 (수 기운 충전)', '북쪽 방향 책상 배치', '검은색·남색 인테리어', '충분한 수분 섭취'],
      avoid: ['지나친 토 기운 음식(단맛 과다)', '무리한 야간 활동 자제', '남쪽·밝은 조명 과다 노출'],
    },
  };
  return items[yongsinElement] ?? items['토'];
}

// ──────────── 사주 점수 (柱 점수 1-10, 일주 점수 1-100) ────────────

function scoreElemVsYongsin(elem: string, yongsin: string, heegsin: string, geesin: string): number {
  if (elem === yongsin)  return 10;
  if (elem === heegsin)  return 7;
  if (elem === geesin)   return 2;
  return 5;
}

export function getPillarScore(
  stemElement: string,
  branchElement: string,
  yongsin: string,
  heegsin: string,
  geesin: string
): number {
  const s = scoreElemVsYongsin(stemElement, yongsin, heegsin, geesin);
  const b = scoreElemVsYongsin(branchElement, yongsin, heegsin, geesin);
  return Math.round(Math.max(1, Math.min(10, (s + b) / 2)));
}

export function getDayPillarScore(
  stemElement: string,
  branchElement: string,
  yongsin: string,
  heegsin: string,
  geesin: string,
  elementBalance: { wood: number; fire: number; earth: number; metal: number; water: number }
): number {
  const stemScore   = scoreElemVsYongsin(stemElement,   yongsin, heegsin, geesin);
  const branchScore = scoreElemVsYongsin(branchElement, yongsin, heegsin, geesin);

  // stem·branch 각각 최대 40점 (10 → 40, 7 → 28, 5 → 20, 2 → 8)
  let score = (stemScore * 4) + (branchScore * 4);

  // 오행 균형 보너스: 가장 많은 오행이 전체의 35% 이하면 균형잡힌 사주
  const vals = Object.values(elementBalance);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total > 0) {
    const maxRatio = Math.max(...vals) / total;
    if (maxRatio <= 0.35) score += 10;
    else if (maxRatio <= 0.45) score += 5;
  }

  // 일주 특수 보너스: 천간=지지 오행 일치 (강한 일주)
  if (stemElement === branchElement) score += 5;

  return Math.round(Math.max(5, Math.min(95, score)));
}

// ═══════════════════════════════════════════════════════════
// ██  고급 사주 분석  ██
// ═══════════════════════════════════════════════════════════

// ──────────── 12운성 (十二運星) ────────────
// 장생·목욕·관대·건록·제왕·쇠·병·사·묘·절·태·양
export const UNSEONG_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const;
export type UnseongStage = typeof UNSEONG_STAGES[number];

const UNSEONG_BASE: Record<string, { start: number; forward: boolean }> = {
  '갑': { start: 11, forward: true  }, // 장생=해
  '을': { start:  6, forward: false }, // 장생=오
  '병': { start:  2, forward: true  }, // 장생=인
  '정': { start:  9, forward: false }, // 장생=유
  '무': { start:  2, forward: true  }, // 장생=인 (병과 동일)
  '기': { start:  9, forward: false }, // 장생=유 (정과 동일)
  '경': { start:  5, forward: true  }, // 장생=사
  '신': { start:  0, forward: false }, // 장생=자
  '임': { start:  8, forward: true  }, // 장생=신
  '계': { start:  3, forward: false }, // 장생=묘
};

const UNSEONG_MEANINGS: Record<UnseongStage, { icon: string; desc: string }> = {
  '장생': { icon: '🌱', desc: '기운이 탄생하는 힘찬 시작 — 잠재력이 넘침' },
  '목욕': { icon: '🌊', desc: '순수하지만 감정 기복이 크고 예민함' },
  '관대': { icon: '🎓', desc: '성장기 — 욕심과 호기심이 왕성함' },
  '건록': { icon: '⚡', desc: '독립·실력 발휘 최고의 시기 — 건왕(建旺)' },
  '제왕': { icon: '👑', desc: '에너지 절정, 리더십·권위가 강함' },
  '쇠':   { icon: '🍂', desc: '힘이 수그러들고 지혜가 쌓이는 시기' },
  '병':   { icon: '🤕', desc: '기운이 약해지며 휴식이 필요함' },
  '사':   { icon: '🕯️', desc: '소멸·변환의 시기 — 새 국면의 씨앗' },
  '묘':   { icon: '🪦', desc: '에너지가 잠들어 축적되는 시기' },
  '절':   { icon: '✂️', desc: '단절·변환 — 새 출발 직전의 공허함' },
  '태':   { icon: '🌙', desc: '새 기운이 잉태되는 태동의 시기' },
  '양':   { icon: '🐣', desc: '양육·보호 받으며 성장 준비' },
};

export function getUnseong(stem: string, branchIdx: number): { stage: UnseongStage; stageIdx: number; icon: string; desc: string } {
  const base = UNSEONG_BASE[stem];
  if (!base) return { stage: '장생', stageIdx: 0, icon: '🌱', desc: '' };
  let diff = branchIdx - base.start;
  if (!base.forward) diff = -diff;
  const stageIdx = ((diff % 12) + 12) % 12;
  const stage = UNSEONG_STAGES[stageIdx];
  return { stage, stageIdx, ...UNSEONG_MEANINGS[stage] };
}

// ──────────── 십신 (十神) ────────────
export type TenGodName = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';

const STEM_POL = [0,1,0,1,0,1,0,1,0,1]; // 양=0, 음=1
const _GEN: Record<string,string> = {'목':'화','화':'토','토':'금','금':'수','수':'목'};
const _CTR: Record<string,string> = {'목':'토','화':'금','토':'수','금':'목','수':'화'};

export function getTenGod(dayStem: string, targetStem: string): TenGodName {
  const di = HEAVENLY_STEMS.indexOf(dayStem);
  const ti = HEAVENLY_STEMS.indexOf(targetStem);
  if (di < 0 || ti < 0) return '비견';
  const de = STEM_ELEMENTS[di];
  const te = STEM_ELEMENTS[ti];
  const sp = STEM_POL[di] === STEM_POL[ti]; // 같은 음양 = true

  if (de === te)              return sp ? '비견' : '겁재';
  if (_GEN[de] === te)       return sp ? '식신' : '상관';
  if (_CTR[de] === te)       return sp ? '편재' : '정재';
  if (_CTR[te] === de)       return sp ? '편관' : '정관';
  if (_GEN[te] === de)       return sp ? '편인' : '정인';
  return '비견';
}

// 십신 한자 & 설명
export const TEN_GOD_INFO: Record<TenGodName, { hanja: string; element: string; brief: string; longer: string }> = {
  '비견': { hanja:'比肩', element:'목↔목·화↔화 등', brief:'동료·형제·경쟁', longer:'나와 같은 오행·같은 음양. 독립심·경쟁심이 강하고 협력보다 자기주장이 셉니다. 비견이 많으면 재물 분산 위험.' },
  '겁재': { hanja:'劫財', element:'', brief:'의리·탈재(奪財)', longer:'같은 오행·다른 음양. 강한 의지와 추진력이 있으나 타인 재물을 빼앗는 기운. 사업 파트너 주의.' },
  '식신': { hanja:'食神', element:'', brief:'창의·복록', longer:'내가 생하는 오행·같은 음양. 표현력·창의력·음식복이 좋음. 여성에게 자녀 복. 식신제살(食神制殺) 패턴 주목.' },
  '상관': { hanja:'傷官', element:'', brief:'재능·반항', longer:'내가 생하는 오행·다른 음양. 뛰어난 재능과 언변, 관(정관)을 상하게 함. 직장보다 프리랜서·예술 적합.' },
  '편재': { hanja:'偏財', element:'', brief:'사업·투기·부친', longer:'내가 극하는 오행·같은 음양. 사업 확장, 투기적 재물 취득, 활동적 자금 흐름. 남성에게 애인·첩 기운.' },
  '정재': { hanja:'正財', element:'', brief:'안정 재산·배우자', longer:'내가 극하는 오행·다른 음양. 성실한 노력으로 쌓는 안정적 재물. 남성에게 정처(正妻).' },
  '편관': { hanja:'偏官', element:'칠살(七殺)', brief:'권위·도전·스트레스', longer:'나를 극하는 오행·같은 음양. 강한 권위와 도전적 상황. 편관이 과하면 건강·사고에 주의.' },
  '정관': { hanja:'正官', element:'', brief:'명예·책임·배우자', longer:'나를 극하는 오행·다른 음양. 명예·규범·사회적 직위. 여성에게 정부(正夫).' },
  '편인': { hanja:'偏印', element:'효신(梟神)', brief:'직관·종교·이변', longer:'나를 생하는 오행·같은 음양. 독특한 직관과 학문, 이단적 사고. 과하면 식신(식복·자녀)을 해침(효신탈식).' },
  '정인': { hanja:'正印', element:'', brief:'학문·명예·어머니', longer:'나를 생하는 오행·다른 음양. 학문·자격·귀인의 도움. 어머니·스승 역할. 인성이 강하면 의존적.' },
};

// ──────────── 격국 (格局) ────────────
// 월지 정기(正氣) 지장간
const MONTH_JEONGGI: Record<string, string> = {
  '자':'계','축':'기','인':'갑','묘':'을','진':'무','사':'병',
  '오':'정','미':'기','신':'경','유':'신','술':'무','해':'임',
};

export interface GeokgukResult {
  name: string;
  tenGod: TenGodName;
  description: string;
  advice: string;
  power: '강' | '중' | '약';
}

export function getGeokguk(
  dayStem: string,
  monthPillar: { branch: string },
  elementBalance: { wood: number; fire: number; earth: number; metal: number; water: number }
): GeokgukResult {
  const jeonggi = MONTH_JEONGGI[monthPillar.branch];
  if (!jeonggi) return {
    name: '미정', tenGod: '비견', power: '중',
    description: '격국을 판단하기 어렵습니다.', advice: '전문 역술인 상담을 권장합니다.'
  };

  const tg = getTenGod(dayStem, jeonggi);

  // 격국 이름 매핑
  const nameMap: Partial<Record<TenGodName, string>> = {
    '정관': '정관격(正官格)', '편관': '편관격(偏官格)',
    '정재': '정재격(正財格)', '편재': '편재격(偏財格)',
    '정인': '정인격(正印格)', '편인': '편인격(偏印格)',
    '식신': '식신격(食神格)', '상관': '상관격(傷官格)',
    '비견': '건록격(建祿格)', '겁재': '양인격(羊刃格)',
  };

  // 신강/신약에 따른 격국 강도 (단순화)
  const total = Object.values(elementBalance).reduce((a,b)=>a+b,0);
  const dayStemElem = STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(dayStem)];
  const selfElem = (dayStemElem === '목' ? elementBalance.wood
    : dayStemElem === '화' ? elementBalance.fire
    : dayStemElem === '토' ? elementBalance.earth
    : dayStemElem === '금' ? elementBalance.metal
    : elementBalance.water);
  const ratio = total > 0 ? selfElem / total : 0.2;
  const power: '강' | '중' | '약' = ratio >= 0.35 ? '강' : ratio >= 0.22 ? '중' : '약';

  const descs: Partial<Record<TenGodName, string>> = {
    '정관': '사회 규범과 책임을 중시하며 명예와 직위에서 성취하는 격입니다. 원칙을 지키는 삶에서 빛납니다.',
    '편관': '도전적 환경을 뚫고 권위를 쟁취하는 격입니다. 의지가 강하고 리더십이 탁월하나 스트레스 관리가 중요합니다.',
    '정재': '성실한 노력으로 안정적 재물을 축적하는 격입니다. 꾸준한 직업 활동과 저축이 인생의 기둥입니다.',
    '편재': '사업·투자·유통에서 큰 재물을 움직이는 격입니다. 활동적 자금 운용이 강점이나 투기 조심이 필요합니다.',
    '정인': '학문·지식·귀인의 도움으로 성장하는 격입니다. 평생 배움을 즐기고 교육·연구·공직에서 빛납니다.',
    '편인': '직관·종교·예술적 감수성이 뛰어난 격입니다. 독창적 분야에서 특수한 재능을 발휘합니다.',
    '식신': '창의력·표현력·음식복이 풍성한 격입니다. 여유롭고 복록 있는 삶, 예술·미식·교육 분야에서 두각을 냅니다.',
    '상관': '뛰어난 언변과 재능을 지닌 격입니다. 창의적 분야·프리랜서·예술 분야에서 독보적 능력을 발휘합니다.',
    '비견': '독립심이 강하고 자수성가하는 건록격입니다. 남에게 의지하지 않고 자신의 힘으로 일어서는 기상입니다.',
    '겁재': '강한 의지와 경쟁심으로 승부하는 양인격입니다. 군경·무술·경쟁 직종에서 두각을 나타냅니다.',
  };

  const advices: Partial<Record<TenGodName, string>> = {
    '정관': '공직·법조·교육·금융에서 탁월한 능력을 발휘합니다. 원칙과 신뢰가 성공의 열쇠입니다.',
    '편관': '군경·의료·법조·정치·스포츠 분야가 적합합니다. 건강과 감정 관리를 꾸준히 챙기세요.',
    '정재': '회계·금융·부동산·유통·공무원 등 안정적 분야가 좋습니다. 꾸준히 저축하고 무리한 투기를 피하세요.',
    '편재': '사업·무역·부동산·금융·엔터테인먼트가 적합합니다. 대담한 투자 능력이 있으나 리스크 관리를 병행하세요.',
    '정인': '학문·연구·교육·저술·상담 분야가 맞습니다. 평생 학습을 통해 전문성을 높이세요.',
    '편인': '종교·상담·예술·점술·연구 분야가 적합합니다. 독창적인 길을 개척하는 것이 행복의 열쇠입니다.',
    '식신': '요식업·교육·예술·방송·미용 분야가 좋습니다. 자신이 좋아하는 것을 직업으로 연결하면 복이 따릅니다.',
    '상관': '예술·방송·작가·컨설팅·IT 분야에서 빛납니다. 자유로운 환경에서 능력이 극대화됩니다.',
    '비견': '창업·자영업·자유직종이 적합합니다. 파트너와 재물·역할 분담을 명확히 정해야 합니다.',
    '겁재': '경쟁이 있는 분야에서 오히려 강해집니다. 투기·도박·단기 이익 추구는 조심해야 합니다.',
  };

  return {
    name: nameMap[tg] ?? `${tg}격`,
    tenGod: tg,
    power,
    description: descs[tg] ?? '개성 있는 격국입니다.',
    advice: advices[tg] ?? '자신의 강점을 파악하고 적합한 분야를 찾으세요.',
  };
}

// ──────────── 신살 (神煞) ────────────
export interface ShinsalItem {
  name: string;
  hanja: string;
  found: boolean;
  foundIn?: string[];
  icon: string;
  description: string;
  advice?: string;
}

// 4지지 그룹 → 신살 지지
const SAMHAP_GROUPS = [[8,0,4],[2,6,10],[5,9,1],[11,3,7]]; // 申子辰/寅午戌/巳酉丑/亥卯未
function getSamhapGroup(branchIdx: number): number {
  for (let i = 0; i < SAMHAP_GROUPS.length; i++) {
    if (SAMHAP_GROUPS[i].includes(branchIdx)) return i;
  }
  return -1;
}

// 도화살: 申子辰→酉(9), 寅午戌→卯(3), 巳酉丑→午(6), 亥卯未→子(0)
const DOHWA_RESULT = [9, 3, 6, 0];
// 역마살: 申子辰→寅(2), 寅午戌→申(8), 巳酉丑→亥(11), 亥卯未→巳(5)
const YEOKMA_RESULT = [2, 8, 11, 5];
// 화개살: 申子辰→辰(4), 寅午戌→戌(10), 巳酉丑→丑(1), 亥卯未→未(7)
const HWAGAE_RESULT = [4, 10, 1, 7];

// 천을귀인: 일간 → [지지 인덱스 배열]
const CHEONEUL: Record<string, number[]> = {
  '갑': [1, 7], '무': [1, 7], '경': [1, 7], // 丑·未
  '을': [0, 8], '기': [0, 8],               // 子·申
  '병': [11, 9], '정': [11, 9],              // 亥·酉
  '신': [6, 2],                              // 午·寅
  '임': [5, 3], '계': [5, 3],                // 巳·卯
};
// 문창성: 일간 → 지지 인덱스
const MUNCHANG: Record<string, number> = {
  '갑':5, '을':6, '병':8, '정':9, '무':8, '기':9, '경':11, '신':0, '임':2, '계':3
};
// 양인살: 양간(陽干)만 해당 → 지지 인덱스
const YANGIN: Record<string, number> = {
  '갑':3, '병':6, '무':6, '경':9, '임':0
};
// 공망(空亡): 일주 간지 인덱스 기준
function getGongmangBranches(ganziIdx: number): number[] {
  const cycleStart = Math.floor(ganziIdx / 10) * 10;
  const startBranchIdx = cycleStart % 12;
  return [(startBranchIdx + 10) % 12, (startBranchIdx + 11) % 12];
}

export function getShinsal(
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getYearPillar>,
  dayPillar: ReturnType<typeof getYearPillar>,
  hourPillar: ReturnType<typeof getYearPillar> | null,
  dayStem: string
): ShinsalItem[] {
  const BRANCH_NAMES = EARTHLY_BRANCHES;
  const pillarNames = ['연지', '월지', '일지', '시지'];
  const allPillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean) as ReturnType<typeof getYearPillar>[];
  const allPillarsFull = [yearPillar, monthPillar, dayPillar, hourPillar];

  // 일주 간지 인덱스
  const dayGanziIdx = getGanziIdx(dayPillar.stemIndex, dayPillar.branchIndex);

  // 공망 (일주 기준)
  const gongmangBranches = getGongmangBranches(dayGanziIdx);
  const gongmangFound: string[] = [];
  allPillarsFull.forEach((p, i) => {
    if (p && gongmangBranches.includes(p.branchIndex)) gongmangFound.push(pillarNames[i]);
  });

  // 도화살·역마살·화개살 (년지·일지 기준)
  const baseIdxYear = getSamhapGroup(yearPillar.branchIndex);
  const baseIdxDay  = getSamhapGroup(dayPillar.branchIndex);

  function findShinsal(results: number[]) {
    const targets = new Set<number>();
    if (baseIdxYear >= 0) targets.add(results[baseIdxYear]);
    if (baseIdxDay  >= 0) targets.add(results[baseIdxDay]);
    const found: string[] = [];
    allPillarsFull.forEach((p, i) => {
      if (p && targets.has(p.branchIndex)) found.push(pillarNames[i]);
    });
    return found;
  }

  const dohwaFound  = findShinsal(DOHWA_RESULT);
  const yeokmaFound = findShinsal(YEOKMA_RESULT);
  const hwagaeFound = findShinsal(HWAGAE_RESULT);

  // 천을귀인 (일간 기준)
  const cheoneulTargets = CHEONEUL[dayStem] ?? [];
  const cheoneulFound: string[] = [];
  allPillarsFull.forEach((p, i) => {
    if (p && cheoneulTargets.includes(p.branchIndex)) cheoneulFound.push(pillarNames[i]);
  });

  // 문창성 (일간 기준)
  const munchangTarget = MUNCHANG[dayStem];
  const munchangFound: string[] = [];
  if (munchangTarget !== undefined) {
    allPillarsFull.forEach((p, i) => {
      if (p && p.branchIndex === munchangTarget) munchangFound.push(pillarNames[i]);
    });
  }

  // 양인살 (일간 기준, 양간만)
  const yanginTarget = YANGIN[dayStem];
  const yanginFound: string[] = [];
  if (yanginTarget !== undefined) {
    allPillarsFull.forEach((p, i) => {
      if (p && p.branchIndex === yanginTarget) yanginFound.push(pillarNames[i]);
    });
  }

  return [
    {
      name: '천을귀인', hanja: '天乙貴人', icon: '⭐',
      found: cheoneulFound.length > 0, foundIn: cheoneulFound,
      description: '하늘이 내린 최고의 귀인성(貴人星). 어려운 상황에서도 반드시 구원의 손길이 나타나고, 평생 귀인을 만나 도움을 받습니다.',
      advice: cheoneulFound.length > 0 ? '귀인과의 인연을 소중히 여기고, 자신도 다른 이에게 귀인이 되어주세요.' : '대인관계를 넓히면 귀인 인연이 열립니다.',
    },
    {
      name: '문창성', hanja: '文昌星', icon: '📚',
      found: munchangFound.length > 0, foundIn: munchangFound,
      description: '학문·글쓰기·창의적 사고를 빛나게 하는 문성(文星). 지식을 다루는 직업에서 두각을 나타내고, 언변과 문재(文才)가 탁월합니다.',
      advice: munchangFound.length > 0 ? '교육·연구·저술·법조·방송 분야에서 탁월한 능력을 발휘합니다.' : '꾸준한 학습이 재능을 꽃피우는 열쇠입니다.',
    },
    {
      name: '도화살', hanja: '桃花殺', icon: '🌸',
      found: dohwaFound.length > 0, foundIn: dohwaFound,
      description: '이성에게 강한 매력을 발산하는 도화(桃花) 기운. 인기·예술 감각·사교성이 탁월하며, 연예·방송·서비스업에서 빛납니다. 단, 이성 관계에서 구설수를 주의해야 합니다.',
      advice: dohwaFound.length > 0 ? '매력을 긍정적으로 활용하되, 이성 관계는 신중하게 접근하세요.' : '자신의 매력을 자연스럽게 드러내는 연습을 해보세요.',
    },
    {
      name: '역마살', hanja: '驛馬殺', icon: '🐎',
      found: yeokmaFound.length > 0, foundIn: yeokmaFound,
      description: '끊임없이 움직이고 이동하는 역마(驛馬) 기운. 여행·무역·이사·출장이 잦고, 한 곳에 정착하기 어려울 수 있습니다. 해외 활동·물류·영업에서 강점을 발휘합니다.',
      advice: yeokmaFound.length > 0 ? '이동과 변화를 두려워하지 말고, 넓은 세상을 무대로 활용하세요.' : '가끔 새로운 환경에 뛰어드는 도전이 운을 열어줍니다.',
    },
    {
      name: '화개살', hanja: '華蓋殺', icon: '🎭',
      found: hwagaeFound.length > 0, foundIn: hwagaeFound,
      description: '예술·종교·철학적 감수성을 높이는 화개(華蓋) 기운. 고독을 즐기며 독창적 세계를 구축합니다. 예술·종교·연구 분야에서 독보적 경지를 이룹니다.',
      advice: hwagaeFound.length > 0 ? '자신만의 예술·철학적 세계를 발전시키면 독보적 전문가가 됩니다.' : '창의적 취미를 가꾸면 내면이 풍요로워집니다.',
    },
    {
      name: '양인살', hanja: '羊刃殺', icon: '⚔️',
      found: yanginFound.length > 0, foundIn: yanginFound,
      description: '강렬한 의지와 저돌적 추진력을 상징하는 양인(羊刃). 군경·의료·스포츠에서 두각을 나타내지만, 과하면 급한 성미와 사고·수술 위험이 따릅니다.',
      advice: yanginFound.length > 0 ? '강한 의지를 긍정적 방향으로 쏟고, 건강·안전 관리를 철저히 하세요.' : '결단력과 추진력을 기르면 큰 성취를 이룹니다.',
    },
    {
      name: '공망', hanja: '空亡', icon: '🕳️',
      found: gongmangFound.length > 0, foundIn: gongmangFound,
      description: `공망(空亡)은 힘이 빠지고 허(虛)하게 작용하는 지지를 의미합니다. 해당 기둥이 나타내는 인연(부모·형제·배우자·자녀 등)에서 결핍이나 이별 경험이 생길 수 있습니다. 공망된 ${gongmangBranches.map(b=>EARTHLY_BRANCHES[b]).join('·')}가 사주 내에 있습니다.`,
      advice: gongmangFound.length > 0 ? '공망의 영역에서 집착보다 내려놓음과 영적 성장으로 승화하면 오히려 좋은 운이 열립니다.' : '공망의 영향이 없어 해당 기둥이 온전하게 힘을 발휘합니다.',
    },
  ];
}

// ──────────── 합충형파해 (合冲刑破害) ────────────
export interface HapChungItem {
  type:
    | '천간합'
    | '천간충'
    | '지지삼합'
    | '지지육합'
    | '지지충'
    | '지지방합'
    | '지지형'
    | '삼형살'
    | '지지해';
  pillars: string[];
  result?: string;
  description: string;
  positive: boolean;
}

export function getHapChung(
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getYearPillar>,
  dayPillar: ReturnType<typeof getYearPillar>,
  hourPillar: ReturnType<typeof getYearPillar> | null
): HapChungItem[] {
  const stems   = ['연간','월간','일간','시간'];
  const branches= ['연지','월지','일지','시지'];
  const allPFull = [yearPillar, monthPillar, dayPillar, hourPillar];
  const allP = allPFull.filter(Boolean) as ReturnType<typeof getYearPillar>[];
  const n = allP.length;
  const items: HapChungItem[] = [];

  // ── 천간합 (天干合) ──
  // 甲己합(土), 乙庚합(金), 丙辛합(水), 丁壬합(木), 戊癸합(火)
  const STEM_HAP: [number,number,string,string][] = [
    [0,5,'토','갑기합(甲己合)'], [1,6,'금','을경합(乙庚合)'],
    [2,7,'수','병신합(丙辛合)'], [3,8,'목','정임합(丁壬合)'],
    [4,9,'화','무계합(戊癸合)'],
  ];
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const pi = allP[i]; const pj = allP[j];
      for (const [s1,s2,elem,name] of STEM_HAP) {
        if ((pi.stemIndex===s1&&pj.stemIndex===s2)||(pi.stemIndex===s2&&pj.stemIndex===s1)) {
          items.push({
            type:'천간합', pillars:[stems[i], stems[j]], result: elem,
            description: `${name} — ${stems[i]}과 ${stems[j]}의 천간이 합하여 ${elem}(${elem}) 기운으로 변화합니다. 두 기둥이 협력하고 통일되는 기운입니다.`,
            positive: true,
          });
        }
      }
    }
  }

  // ── 천간충 (天干冲) ──
  // 甲庚충, 乙辛충, 丙壬충, 丁癸충
  const STEM_CHUNG: [number,number,string][] = [
    [0,6,'갑경충(甲庚冲)'],[1,7,'을신충(乙辛冲)'],[2,8,'병임충(丙壬冲)'],[3,9,'정계충(丁癸冲)'],
  ];
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const pi = allP[i]; const pj = allP[j];
      for (const [s1,s2,name] of STEM_CHUNG) {
        if ((pi.stemIndex===s1&&pj.stemIndex===s2)||(pi.stemIndex===s2&&pj.stemIndex===s1)) {
          items.push({
            type:'천간충', pillars:[stems[i], stems[j]],
            description: `${name} — ${stems[i]}과 ${stems[j]}의 천간이 충돌합니다. 해당 기둥의 기운이 약해지고 갈등·변화가 생깁니다.`,
            positive: false,
          });
        }
      }
    }
  }

  // ── 지지삼합 (地支三合) ──
  // 申子辰(수), 寅午戌(화), 巳酉丑(금), 亥卯未(목)
  const SAMHAP_LIST: [number,number,number,string,string][] = [
    [8,0,4,'수','신자진(申子辰)합'], [2,6,10,'화','인오술(寅午戌)합'],
    [5,9,1,'금','사유축(巳酉丑)합'], [11,3,7,'목','해묘미(亥卯未)합'],
  ];
  for (const [b1,b2,b3,elem,name] of SAMHAP_LIST) {
    const f = [b1,b2,b3].map(b => {
      const idx = allPFull.findIndex(p => p && p.branchIndex === b);
      return idx >= 0 ? branches[idx] : null;
    }).filter(Boolean) as string[];
    if (f.length >= 2) {
      items.push({
        type:'지지삼합', pillars: f, result: elem,
        description: `${name} — ${f.join('·')}가 삼합하여 강한 ${elem} 기운을 형성합니다. 해당 오행이 크게 강화됩니다.`,
        positive: true,
      });
    }
  }

  // ── 지지육합 (地支六合) ──
  // 子丑합(토), 寅亥합(목), 卯戌합(화), 辰酉합(금), 巳申합(수), 午未합(토)
  const YUKHAP_LIST: [number,number,string,string][] = [
    [0,1,'토','자축(子丑)합'], [2,11,'목','인해(寅亥)합'],
    [3,10,'화','묘술(卯戌)합'], [4,9,'금','진유(辰酉)합'],
    [5,8,'수','사신(巳申)합'], [6,7,'토','오미(午未)합'],
  ];
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const bi = allP[i].branchIndex; const bj = allP[j].branchIndex;
      for (const [b1,b2,elem,name] of YUKHAP_LIST) {
        if ((bi===b1&&bj===b2)||(bi===b2&&bj===b1)) {
          items.push({
            type:'지지육합', pillars:[branches[i],branches[j]], result: elem,
            description: `${name} — ${branches[i]}과 ${branches[j]}의 지지가 육합하여 ${elem} 기운으로 변화합니다. 자연스럽게 어우러지는 조화입니다.`,
            positive: true,
          });
        }
      }
    }
  }

  // ── 지지충 (地支沖) ──
  // 子午충, 丑未충, 寅申충, 卯酉충, 辰戌충, 巳亥충
  const BRANCH_CHUNG_LIST: [number,number,string][] = [
    [0,6,'자오충(子午冲)'],[1,7,'축미충(丑未冲)'],[2,8,'인신충(寅申冲)'],
    [3,9,'묘유충(卯酉冲)'],[4,10,'진술충(辰戌冲)'],[5,11,'사해충(巳亥冲)'],
  ];
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const bi = allP[i].branchIndex; const bj = allP[j].branchIndex;
      for (const [b1,b2,name] of BRANCH_CHUNG_LIST) {
        if ((bi===b1&&bj===b2)||(bi===b2&&bj===b1)) {
          items.push({
            type:'지지충', pillars:[branches[i],branches[j]],
            description: `${name} — ${branches[i]}과 ${branches[j]}이 충돌합니다. 해당 기둥의 에너지가 흔들리고 변화와 불안정이 생깁니다.`,
            positive: false,
          });
        }
      }
    }
  }

  // ── 지지방합 (地支方合) ──
  // 인묘진(동방·목), 사오미(남방·화), 신유술(서방·금), 해자축(북방·수)
  const BANGHAP_LIST: [number,number,number,string,string,string][] = [
    [2,3,4, '목','인묘진(寅卯辰)','동방합 — 봄의 기운이 모여 강한 목(木) 에너지를 형성합니다. 성장·진취적 기운이 강합니다.'],
    [5,6,7, '화','사오미(巳午未)','남방합 — 여름의 기운이 모여 강한 화(火) 에너지를 형성합니다. 열정·표현이 강합니다.'],
    [8,9,10,'금','신유술(申酉戌)','서방합 — 가을의 기운이 모여 강한 금(金) 에너지를 형성합니다. 결단·수렴의 기운입니다.'],
    [11,0,1,'수','해자축(亥子丑)','북방합 — 겨울의 기운이 모여 강한 수(水) 에너지를 형성합니다. 지혜·저장의 기운입니다.'],
  ];
  for (const [b1,b2,b3,elem,name,desc] of BANGHAP_LIST) {
    const found = [b1,b2,b3].map(b => {
      const idx = allPFull.findIndex(p => p && p.branchIndex === b);
      return idx >= 0 ? branches[idx] : null;
    }).filter(Boolean) as string[];
    if (found.length >= 2) {
      items.push({
        type:'지지방합', pillars: found, result: elem,
        description:`${name} — ${desc}`,
        positive: true,
      });
    }
  }

  // ── 지지형 (地支刑) ──
  // 인사신(寅巳申) 무은지형, 축술미(丑戌未) 지세지형, 자묘(子卯) 무례지형
  const allBranches = allP.map(p => p.branchIndex);
  // 인사신 삼형살
  if ([2,5,8].every(b => allBranches.includes(b))) {
    items.push({ type:'삼형살', pillars:['연지','월지','일지','시지'].filter((_,i)=>allPFull[i]&&[2,5,8].includes(allPFull[i]!.branchIndex)),
      description:'인사신(寅巳申) 무은지형 — 의지와 의지의 충돌로 소송·수술·이별의 기운이 있습니다. 법적 분쟁과 대인관계에 주의하세요.', positive:false });
  } else {
    [[2,5],[2,8],[5,8]].forEach(([a,b]) => {
      if (allBranches.includes(a) && allBranches.includes(b)) {
        const fa = branches[allP.findIndex(p=>p.branchIndex===a)];
        const fb = branches[allP.findIndex(p=>p.branchIndex===b)];
        items.push({ type:'지지형', pillars:[fa,fb],
          description:`인사형/인신형/사신형 — ${fa}과 ${fb}의 형살로 의도치 않은 충돌과 사고의 기운이 있습니다.`, positive:false });
      }
    });
  }
  // 축술미 삼형살
  if ([1,7,10].every(b => allBranches.includes(b))) {
    items.push({ type:'삼형살', pillars:['연지','월지','일지','시지'].filter((_,i)=>allPFull[i]&&[1,7,10].includes(allPFull[i]!.branchIndex)),
      description:'축술미(丑戌未) 무세지형 — 고집과 아집의 충돌로 주변과 마찰이 생깁니다. 독선적 태도를 자제하고 유연함이 필요합니다.', positive:false });
  } else {
    [[1,7],[1,10],[7,10]].forEach(([a,b]) => {
      if (allBranches.includes(a) && allBranches.includes(b)) {
        const fa = branches[allP.findIndex(p=>p.branchIndex===a)];
        const fb = branches[allP.findIndex(p=>p.branchIndex===b)];
        items.push({ type:'지지형', pillars:[fa,fb],
          description:`축술형/축미형/술미형 — ${fa}과 ${fb}의 형살로 고집과 고집의 마찰이 생깁니다.`, positive:false });
      }
    });
  }
  // 자묘형
  if (allBranches.includes(0) && allBranches.includes(3)) {
    const fa = branches[allP.findIndex(p=>p.branchIndex===0)];
    const fb = branches[allP.findIndex(p=>p.branchIndex===3)];
    items.push({ type:'지지형', pillars:[fa,fb],
      description:'자묘형(子卯刑) — 무례지형으로 예의·도덕적 갈등과 감정적 충돌이 발생하기 쉽습니다.', positive:false });
  }

  // ── 지지해 (地支害) ──
  // 子未해, 丑午해, 寅巳해, 卯辰해, 申亥해, 酉戌해
  const BRANCH_HAE_LIST: [number,number,string][] = [
    [0,7,'자미해(子未害)'],[1,6,'축오해(丑午害)'],[2,5,'인사해(寅巳害)'],
    [3,4,'묘진해(卯辰害)'],[8,11,'신해해(申亥害)'],[9,10,'유술해(酉戌害)'],
  ];
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const bi = allP[i].branchIndex; const bj = allP[j].branchIndex;
      for (const [b1,b2,name] of BRANCH_HAE_LIST) {
        if ((bi===b1&&bj===b2)||(bi===b2&&bj===b1)) {
          items.push({
            type:'지지해', pillars:[branches[i],branches[j]],
            description: `${name} — ${branches[i]}과 ${branches[j]}의 지지가 해(害) 관계입니다. 해당 기둥이 나타내는 관계(부모·배우자·자녀)에서 갈등·피해가 생길 수 있습니다.`,
            positive: false,
          });
        }
      }
    }
  }

  return items;
}

// ──────────── 십신 분포 전체 계산 ────────────
export function getPillarTenGods(
  dayStem: string,
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getYearPillar>,
  dayPillar:   ReturnType<typeof getYearPillar>,
  hourPillar:  ReturnType<typeof getYearPillar> | null,
) {
  type PillarTG = {
    stemGod: TenGodName;
    branchHidden: { stem: string; god: TenGodName }[];
    unseong: ReturnType<typeof getUnseong>;
  };

  function calcPillar(p: ReturnType<typeof getYearPillar> | null): PillarTG | null {
    if (!p) return null;
    const stemGod = getTenGod(dayStem, p.stem);
    const jjg = JIJANGGAN[p.branch] ?? [];
    const branchHidden = jjg.map(j => ({ stem: j.stem, god: getTenGod(dayStem, j.stem) }));
    const unseong = getUnseong(dayStem, p.branchIndex);
    return { stemGod, branchHidden, unseong };
  }

  // 지장간 (일간 기준, 지지에 숨은 천간들)
  const JIJANGGAN: Record<string, {stem:string; element:string}[]> = {
    '자': [{stem:'임',element:'수'},{stem:'계',element:'수'}],
    '축': [{stem:'계',element:'수'},{stem:'신',element:'금'},{stem:'기',element:'토'}],
    '인': [{stem:'무',element:'토'},{stem:'병',element:'화'},{stem:'갑',element:'목'}],
    '묘': [{stem:'갑',element:'목'},{stem:'을',element:'목'}],
    '진': [{stem:'을',element:'목'},{stem:'계',element:'수'},{stem:'무',element:'토'}],
    '사': [{stem:'무',element:'토'},{stem:'경',element:'금'},{stem:'병',element:'화'}],
    '오': [{stem:'병',element:'화'},{stem:'기',element:'토'},{stem:'정',element:'화'}],
    '미': [{stem:'정',element:'화'},{stem:'을',element:'목'},{stem:'기',element:'토'}],
    '신': [{stem:'무',element:'토'},{stem:'임',element:'수'},{stem:'경',element:'금'}],
    '유': [{stem:'경',element:'금'},{stem:'신',element:'금'}],
    '술': [{stem:'신',element:'금'},{stem:'정',element:'화'},{stem:'무',element:'토'}],
    '해': [{stem:'무',element:'토'},{stem:'갑',element:'목'},{stem:'임',element:'수'}],
  };

  return {
    year:  calcPillar(yearPillar),
    month: calcPillar(monthPillar),
    day:   calcPillar(dayPillar),
    hour:  calcPillar(hourPillar),
  };
}
