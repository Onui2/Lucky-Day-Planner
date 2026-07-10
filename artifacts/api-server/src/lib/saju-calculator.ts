// Korean Saju (Four Pillars of Destiny) Calculator
// Based on traditional Korean/Chinese astrology

export const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const HEAVENLY_STEMS_EN = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const EARTHLY_BRANCHES_EN = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
export const ZODIAC_KR = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const HEAVENLY_STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

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

// Month-starting solar term times (KST, minute precision).
// Same-day boundaries compare actual birth time; unknown time uses noon.
type MonthTermTime = [number, number, number, number];

// KST [month, day, hour, minute] for month-starting solar terms.
// Order: ipchun, gyeongchip, cheongmyeong, ipha, mangjong, soseo, ipchu, baengno, hanno, ipdong, daeseol, sohan.
// Ipchun 1990-2026 uses published anchor values; other terms use the Meeus generator (within +/-13 minutes).
const MONTH_TERM_TIMES: Record<number, MonthTermTime[]> = {
  1990: [[2, 4, 11, 14], [3, 6, 5, 14], [4, 5, 10, 8], [5, 6, 3, 31], [6, 6, 7, 44], [7, 7, 18, 2], [8, 8, 3, 48], [9, 8, 6, 39], [10, 8, 22, 13], [11, 8, 1, 19], [12, 7, 18, 6], [1, 6, 5, 18]],
  1991: [[2, 4, 17, 8], [3, 6, 11, 2], [4, 5, 15, 55], [5, 6, 9, 18], [6, 6, 13, 31], [7, 7, 23, 48], [8, 8, 9, 35], [9, 8, 12, 27], [10, 9, 4, 0], [11, 8, 7, 7], [12, 7, 23, 55], [1, 6, 11, 7]],
  1992: [[2, 4, 22, 48], [3, 5, 16, 51], [4, 4, 21, 43], [5, 5, 15, 6], [6, 5, 19, 19], [7, 7, 5, 36], [8, 7, 15, 23], [9, 7, 18, 15], [10, 8, 9, 49], [11, 7, 12, 56], [12, 7, 5, 44], [1, 5, 16, 57]],
  1993: [[2, 4, 4, 37], [3, 5, 22, 40], [4, 5, 3, 32], [5, 5, 20, 55], [6, 6, 1, 7], [7, 7, 11, 24], [8, 7, 21, 12], [9, 8, 0, 4], [10, 8, 15, 38], [11, 7, 18, 46], [12, 7, 11, 34], [1, 5, 22, 47]],
  1994: [[2, 4, 10, 31], [3, 6, 4, 30], [4, 5, 9, 22], [5, 6, 2, 44], [6, 6, 6, 56], [7, 7, 17, 13], [8, 8, 3, 1], [9, 8, 5, 53], [10, 8, 21, 28], [11, 8, 0, 36], [12, 7, 17, 25], [1, 6, 4, 38]],
  1995: [[2, 4, 16, 13], [3, 6, 10, 21], [4, 5, 15, 13], [5, 6, 8, 34], [6, 6, 12, 46], [7, 7, 23, 3], [8, 8, 8, 51], [9, 8, 11, 43], [10, 9, 3, 19], [11, 8, 6, 27], [12, 7, 23, 16], [1, 6, 10, 30]],
  1996: [[2, 4, 22, 8], [3, 5, 16, 12], [4, 4, 21, 3], [5, 5, 14, 25], [6, 5, 18, 36], [7, 7, 4, 53], [8, 7, 14, 41], [9, 7, 17, 34], [10, 8, 9, 10], [11, 7, 12, 18], [12, 7, 5, 8], [1, 5, 16, 21]],
  1997: [[2, 4, 4, 2], [3, 5, 22, 4], [4, 5, 2, 55], [5, 5, 20, 15], [6, 6, 0, 27], [7, 7, 10, 43], [8, 7, 20, 31], [9, 7, 23, 25], [10, 8, 15, 1], [11, 7, 18, 10], [12, 7, 11, 0], [1, 5, 22, 13]],
  1998: [[2, 4, 9, 57], [3, 6, 3, 55], [4, 5, 8, 46], [5, 6, 2, 6], [6, 6, 6, 17], [7, 7, 16, 34], [8, 8, 2, 22], [9, 8, 5, 15], [10, 8, 20, 52], [11, 8, 0, 1], [12, 7, 16, 51], [1, 6, 4, 5]],
  1999: [[2, 4, 15, 57], [3, 6, 9, 47], [4, 5, 14, 36], [5, 6, 7, 56], [6, 6, 12, 7], [7, 7, 22, 24], [8, 8, 8, 11], [9, 8, 11, 5], [10, 9, 2, 42], [11, 8, 5, 52], [12, 7, 22, 42], [1, 6, 9, 56]],
  2000: [[2, 4, 21, 40], [3, 5, 15, 37], [4, 4, 20, 27], [5, 5, 13, 46], [6, 5, 17, 57], [7, 7, 4, 13], [8, 7, 14, 1], [9, 7, 16, 55], [10, 8, 8, 32], [11, 7, 11, 42], [12, 7, 4, 33], [1, 5, 15, 47]],
  2001: [[2, 4, 3, 28], [3, 5, 21, 27], [4, 5, 2, 16], [5, 5, 19, 35], [6, 5, 23, 45], [7, 7, 10, 1], [8, 7, 19, 49], [9, 7, 22, 44], [10, 8, 14, 21], [11, 7, 17, 32], [12, 7, 10, 23], [1, 5, 21, 36]],
  2002: [[2, 4, 9, 24], [3, 6, 3, 17], [4, 5, 8, 5], [5, 6, 1, 24], [6, 6, 5, 33], [7, 7, 15, 49], [8, 8, 1, 37], [9, 8, 4, 32], [10, 8, 20, 10], [11, 7, 23, 20], [12, 7, 16, 12], [1, 6, 3, 25]],
  2003: [[2, 4, 15, 5], [3, 6, 9, 5], [4, 5, 13, 53], [5, 6, 7, 11], [6, 6, 11, 20], [7, 7, 21, 36], [8, 8, 7, 24], [9, 8, 10, 19], [10, 9, 1, 57], [11, 8, 5, 8], [12, 7, 22, 0], [1, 6, 9, 14]],
  2004: [[2, 4, 20, 56], [3, 5, 14, 53], [4, 4, 19, 41], [5, 5, 12, 58], [6, 5, 17, 7], [7, 7, 3, 22], [8, 7, 13, 10], [9, 7, 16, 5], [10, 8, 7, 44], [11, 7, 10, 56], [12, 7, 3, 48], [1, 5, 15, 1]],
  2005: [[2, 4, 2, 43], [3, 5, 20, 40], [4, 5, 1, 27], [5, 5, 18, 44], [6, 5, 22, 53], [7, 7, 9, 8], [8, 7, 18, 56], [9, 7, 21, 52], [10, 8, 13, 31], [11, 7, 16, 43], [12, 7, 9, 35], [1, 5, 20, 49]],
  2006: [[2, 4, 8, 27], [3, 6, 2, 27], [4, 5, 7, 14], [5, 6, 0, 31], [6, 6, 4, 38], [7, 7, 14, 54], [8, 8, 0, 42], [9, 8, 3, 37], [10, 8, 19, 17], [11, 7, 22, 30], [12, 7, 15, 22], [1, 6, 2, 36]],
  2007: [[2, 4, 14, 18], [3, 6, 8, 14], [4, 5, 13, 0], [5, 6, 6, 17], [6, 6, 10, 24], [7, 7, 20, 39], [8, 8, 6, 27], [9, 8, 9, 23], [10, 9, 1, 4], [11, 8, 4, 17], [12, 7, 21, 9], [1, 6, 8, 24]],
  2008: [[2, 4, 20, 0], [3, 5, 14, 1], [4, 4, 18, 47], [5, 5, 12, 3], [6, 5, 16, 10], [7, 7, 2, 25], [8, 7, 12, 13], [9, 7, 15, 10], [10, 8, 6, 51], [11, 7, 10, 4], [12, 7, 2, 57], [1, 5, 14, 11]],
  2009: [[2, 4, 1, 50], [3, 5, 19, 49], [4, 5, 0, 34], [5, 5, 17, 49], [6, 5, 21, 56], [7, 7, 8, 11], [8, 7, 18, 0], [9, 7, 20, 57], [10, 8, 12, 38], [11, 7, 15, 52], [12, 7, 8, 45], [1, 5, 20, 0]],
  2010: [[2, 4, 7, 48], [3, 6, 1, 37], [4, 5, 6, 22], [5, 5, 23, 37], [6, 6, 3, 44], [7, 7, 13, 58], [8, 7, 23, 47], [9, 8, 2, 44], [10, 8, 18, 26], [11, 7, 21, 40], [12, 7, 14, 34], [1, 6, 1, 49]],
  2011: [[2, 4, 13, 33], [3, 6, 7, 26], [4, 5, 12, 11], [5, 6, 5, 25], [6, 6, 9, 31], [7, 7, 19, 46], [8, 8, 5, 35], [9, 8, 8, 32], [10, 9, 0, 15], [11, 8, 3, 30], [12, 7, 20, 24], [1, 6, 7, 39]],
  2012: [[2, 4, 19, 22], [3, 5, 13, 15], [4, 4, 18, 0], [5, 5, 11, 14], [6, 5, 15, 20], [7, 7, 1, 35], [8, 7, 11, 24], [9, 7, 14, 22], [10, 8, 6, 4], [11, 7, 9, 20], [12, 7, 2, 14], [1, 5, 13, 30]],
  2013: [[2, 4, 1, 13], [3, 5, 19, 6], [4, 4, 23, 50], [5, 5, 17, 4], [6, 5, 21, 10], [7, 7, 7, 24], [8, 7, 17, 13], [9, 7, 20, 11], [10, 8, 11, 55], [11, 7, 15, 10], [12, 7, 8, 5], [1, 5, 19, 21]],
  2014: [[2, 4, 7, 3], [3, 6, 0, 57], [4, 5, 5, 40], [5, 5, 22, 54], [6, 6, 3, 0], [7, 7, 13, 14], [8, 7, 23, 3], [9, 8, 2, 2], [10, 8, 17, 45], [11, 7, 21, 2], [12, 7, 13, 57], [1, 6, 1, 12]],
  2015: [[2, 4, 12, 58], [3, 6, 6, 48], [4, 5, 11, 32], [5, 6, 4, 44], [6, 6, 8, 50], [7, 7, 19, 4], [8, 8, 4, 54], [9, 8, 7, 52], [10, 8, 23, 36], [11, 8, 2, 53], [12, 7, 19, 48], [1, 6, 7, 4]],
  2016: [[2, 4, 18, 46], [3, 5, 12, 40], [4, 4, 17, 23], [5, 5, 10, 35], [6, 5, 14, 40], [7, 7, 0, 54], [8, 7, 10, 44], [9, 7, 13, 43], [10, 8, 5, 27], [11, 7, 8, 44], [12, 7, 1, 40], [1, 5, 12, 56]],
  2017: [[2, 4, 0, 34], [3, 5, 18, 31], [4, 4, 23, 14], [5, 5, 16, 26], [6, 5, 20, 31], [7, 7, 6, 44], [8, 7, 16, 34], [9, 7, 19, 33], [10, 8, 11, 18], [11, 7, 14, 36], [12, 7, 7, 32], [1, 5, 18, 47]],
  2018: [[2, 4, 6, 28], [3, 6, 0, 22], [4, 5, 5, 4], [5, 5, 22, 16], [6, 6, 2, 20], [7, 7, 12, 34], [8, 7, 22, 24], [9, 8, 1, 23], [10, 8, 17, 8], [11, 7, 20, 26], [12, 7, 13, 22], [1, 6, 0, 38]],
  2019: [[2, 4, 12, 14], [3, 6, 6, 13], [4, 5, 10, 54], [5, 6, 4, 6], [6, 6, 8, 10], [7, 7, 18, 23], [8, 8, 4, 13], [9, 8, 7, 13], [10, 8, 22, 58], [11, 8, 2, 16], [12, 7, 19, 13], [1, 6, 6, 29]],
  2020: [[2, 4, 18, 3], [3, 5, 12, 2], [4, 4, 16, 44], [5, 5, 9, 54], [6, 5, 13, 58], [7, 7, 0, 11], [8, 7, 10, 1], [9, 7, 13, 1], [10, 8, 4, 47], [11, 7, 8, 5], [12, 7, 1, 2], [1, 5, 12, 18]],
  2021: [[2, 3, 23, 59], [3, 5, 17, 51], [4, 4, 22, 32], [5, 5, 15, 43], [6, 5, 19, 46], [7, 7, 5, 59], [8, 7, 15, 49], [9, 7, 18, 49], [10, 8, 10, 35], [11, 7, 13, 54], [12, 7, 6, 51], [1, 5, 18, 7]],
  2022: [[2, 4, 5, 51], [3, 5, 23, 40], [4, 5, 4, 20], [5, 5, 21, 30], [6, 6, 1, 33], [7, 7, 11, 45], [8, 7, 21, 35], [9, 8, 0, 36], [10, 8, 16, 22], [11, 7, 19, 41], [12, 7, 12, 39], [1, 5, 23, 55]],
  2023: [[2, 4, 11, 43], [3, 6, 5, 27], [4, 5, 10, 7], [5, 6, 3, 16], [6, 6, 7, 19], [7, 7, 17, 32], [8, 8, 3, 21], [9, 8, 6, 22], [10, 8, 22, 9], [11, 8, 1, 29], [12, 7, 18, 26], [1, 6, 5, 43]],
  2024: [[2, 4, 17, 27], [3, 5, 11, 15], [4, 4, 15, 54], [5, 5, 9, 3], [6, 5, 13, 5], [7, 6, 23, 17], [8, 7, 9, 7], [9, 7, 12, 8], [10, 8, 3, 56], [11, 7, 7, 16], [12, 7, 0, 13], [1, 5, 11, 30]],
  2025: [[2, 3, 23, 10], [3, 5, 17, 1], [4, 4, 21, 40], [5, 5, 14, 49], [6, 5, 18, 50], [7, 7, 5, 3], [8, 7, 14, 53], [9, 7, 17, 54], [10, 8, 9, 42], [11, 7, 13, 2], [12, 7, 6, 1], [1, 5, 17, 17]],
  2026: [[2, 4, 5, 2], [3, 5, 22, 48], [4, 5, 3, 27], [5, 5, 20, 35], [6, 6, 0, 36], [7, 7, 10, 48], [8, 7, 20, 38], [9, 7, 23, 40], [10, 8, 15, 28], [11, 7, 18, 49], [12, 7, 11, 48], [1, 5, 23, 5]],
  2027: [[2, 4, 10, 42], [3, 6, 4, 36], [4, 5, 9, 14], [5, 6, 2, 21], [6, 6, 6, 22], [7, 7, 16, 34], [8, 8, 2, 25], [9, 8, 5, 27], [10, 8, 21, 15], [11, 8, 0, 37], [12, 7, 17, 36], [1, 6, 4, 53]],
  2028: [[2, 4, 16, 30], [3, 5, 10, 23], [4, 4, 15, 1], [5, 5, 8, 8], [6, 5, 12, 9], [7, 6, 22, 21], [8, 7, 8, 11], [9, 7, 11, 14], [10, 8, 3, 3], [11, 7, 6, 25], [12, 6, 23, 24], [1, 5, 10, 42]],
  2029: [[2, 3, 22, 18], [3, 5, 16, 12], [4, 4, 20, 49], [5, 5, 13, 56], [6, 5, 17, 56], [7, 7, 4, 8], [8, 7, 13, 59], [9, 7, 17, 2], [10, 8, 8, 51], [11, 7, 12, 14], [12, 7, 5, 14], [1, 5, 16, 31]],
  2030: [[2, 4, 4, 8], [3, 5, 22, 1], [4, 5, 2, 38], [5, 5, 19, 44], [6, 5, 23, 44], [7, 7, 9, 56], [8, 7, 19, 47], [9, 7, 22, 50], [10, 8, 14, 41], [11, 7, 18, 3], [12, 7, 11, 4], [1, 5, 22, 21]],
  2031: [[2, 4, 9, 58], [3, 6, 3, 51], [4, 5, 8, 27], [5, 6, 1, 33], [6, 6, 5, 33], [7, 7, 15, 45], [8, 8, 1, 36], [9, 8, 4, 40], [10, 8, 20, 30], [11, 7, 23, 54], [12, 7, 16, 54], [1, 6, 4, 12]],
  2032: [[2, 4, 15, 49], [3, 5, 9, 41], [4, 4, 14, 18], [5, 5, 7, 23], [6, 5, 11, 23], [7, 6, 21, 35], [8, 7, 7, 26], [9, 7, 10, 30], [10, 8, 2, 21], [11, 7, 5, 45], [12, 6, 22, 45], [1, 5, 10, 3]],
  2033: [[2, 3, 21, 40], [3, 5, 15, 33], [4, 4, 20, 9], [5, 5, 13, 14], [6, 5, 17, 13], [7, 7, 3, 25], [8, 7, 13, 16], [9, 7, 16, 20], [10, 8, 8, 12], [11, 7, 11, 36], [12, 7, 4, 37], [1, 5, 15, 55]],
  2034: [[2, 4, 3, 32], [3, 5, 21, 24], [4, 5, 2, 0], [5, 5, 19, 4], [6, 5, 23, 3], [7, 7, 9, 15], [8, 7, 19, 6], [9, 7, 22, 11], [10, 8, 14, 3], [11, 7, 17, 27], [12, 7, 10, 29], [1, 5, 21, 47]],
  2035: [[2, 4, 9, 24], [3, 6, 3, 16], [4, 5, 7, 51], [5, 6, 0, 55], [6, 6, 4, 54], [7, 7, 15, 5], [8, 8, 0, 57], [9, 8, 4, 1], [10, 8, 19, 54], [11, 7, 23, 19], [12, 7, 16, 20], [1, 6, 3, 39]],
};

// Returns [month (1-12 solar), day] of the month-starting term for given saju month branch
// branchIdx: 2=인(입춘/Feb), 3=묘(경칩/Mar), 4=진(청명/Apr), 5=사(입하/May),
//            6=오(망종/Jun), 7=미(소서/Jul), 8=신(입추/Aug), 9=유(백로/Sep),
//            10=술(한로/Oct), 11=해(입동/Nov), 0=자(대설/Dec), 1=축(소한/Jan)
function getTermIndex(branchIdx: number): number {
  return branchIdx === 0 ? 10 : branchIdx === 1 ? 11 : branchIdx - 2;
}

function getMonthTermDateTime(year: number, branchIdx: number): { month: number; day: number; hour: number; minute: number } {
  const termIdx = getTermIndex(branchIdx);
  const approxTerms: MonthTermTime[] = [
    [2, 4, 12, 0], [3, 6, 12, 0], [4, 5, 12, 0], [5, 6, 12, 0],
    [6, 6, 12, 0], [7, 7, 12, 0], [8, 7, 12, 0], [9, 8, 12, 0],
    [10, 8, 12, 0], [11, 7, 12, 0], [12, 7, 12, 0], [1, 6, 12, 0],
  ];
  const [month, day, hour, minute] = MONTH_TERM_TIMES[year]?.[termIdx] ?? approxTerms[termIdx];
  return { month, day, hour, minute };
}

function getMonthTermDay(year: number, branchIdx: number): { month: number; day: number } {
  const { month, day } = getMonthTermDateTime(year, branchIdx);
  return { month, day };
}

// Find the saju year for a given date.
// The saju year resets ONLY at ipchun (branch 2, ~Feb 4).
// birthHour: -1 = unknown, 0-23 = KST hour
export function getSajuYear(year: number, month: number, day: number, birthHour: number = -1, birthMinute: number = 0): number {
  const targetDate = new Date(year, month - 1, day, birthHour === -1 ? 12 : birthHour, birthMinute);
  let sajuYear = year - 1;

  for (const ty of [year - 1, year]) {
    const { month: tm, day: td, hour: th, minute: tmin } = getMonthTermDateTime(ty, 2);
    const ipchunDate = new Date(ty, tm - 1, td, th, tmin);
    if (ipchunDate <= targetDate) {
      sajuYear = ty;
    }
  }

  return sajuYear;
}

// Determine which saju month branch a date belongs to, plus the saju year for stem calculation
function getSajuMonthBranch(year: number, month: number, day: number, birthHour: number = -1, birthMinute: number = 0): { branchIdx: number; sajuYear: number } {
  const targetDate = new Date(year, month - 1, day, birthHour === -1 ? 12 : birthHour, birthMinute);

  const terms: Array<{ branch: number; date: Date }> = [];
  for (const termYear of [year - 1, year, year + 1]) {
    for (let b = 0; b < 12; b++) {
      const { month: tm, day: td, hour: th, minute: tmin } = getMonthTermDateTime(termYear, b);
      const actualYear = tm === 1 ? termYear + 1 : termYear;
      terms.push({ branch: b, date: new Date(actualYear, tm - 1, td, th, tmin) });
    }
  }
  terms.sort((a, b) => a.date.getTime() - b.date.getTime());

  let currentBranch = 1;
  for (const term of terms) {
    if (term.date <= targetDate) {
      currentBranch = term.branch;
    }
  }

  const sajuYear = getSajuYear(year, month, day, birthHour, birthMinute);

  return { branchIdx: currentBranch, sajuYear };
}

export function getMonthPillar(year: number, month: number, day: number, birthHour: number = -1, birthMinute: number = 0) {
  const { branchIdx, sajuYear } = getSajuMonthBranch(year, month, day, birthHour, birthMinute);

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

type DayPillarElementRelation =
  | 'same'
  | 'stem_generates_branch'
  | 'stem_controls_branch'
  | 'branch_generates_stem'
  | 'branch_controls_stem';

const ELEMENT_GENERATES: Record<string, string> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};

const ELEMENT_CONTROLS: Record<string, string> = {
  목: '토',
  화: '금',
  토: '수',
  금: '목',
  수: '화',
};

function getDayPillarCycleIndex(dayStem: string, dayBranch: string): number {
  for (let i = 0; i < 60; i += 1) {
    if (HEAVENLY_STEMS[i % 10] === dayStem && EARTHLY_BRANCHES[i % 12] === dayBranch) {
      return i;
    }
  }

  return 0;
}

function getDayPillarElementRelation(
  stemElement: string,
  branchElement: string,
): DayPillarElementRelation {
  if (stemElement === branchElement) return 'same';
  if (ELEMENT_GENERATES[stemElement] === branchElement) return 'stem_generates_branch';
  if (ELEMENT_CONTROLS[stemElement] === branchElement) return 'stem_controls_branch';
  if (ELEMENT_GENERATES[branchElement] === stemElement) return 'branch_generates_stem';
  return 'branch_controls_stem';
}

function softenInterpretationText(text: string): string {
  return text
    .replace(/천생연분\(天生緣分\)/g, '상호 보완 강함')
    .replace(/천생연분에 가까운/g, '상호 보완성이 강한')
    .replace(/최고조에 달/g, '강해지')
    .replace(/최고의/g, '강한')
    .replace(/최상의/g, '안정적인')
    .replace(/최적의/g, '비교적 맞는')
    .replace(/반드시/g, '상황에 따라')
    .replace(/놀라운/g, '의미 있는')
    .replace(/폭발적인/g, '강한')
    .replace(/눈부신/g, '뚜렷한')
    .replace(/최강/g, '좋은')
    .replace(/매우 좋은/g, '양호한')
    .replace(/좋은 결과/g, '무난한 결과')
    .replace(/좋은 성과/g, '성과 가능성')
    .replace(/좋은 시기/g, '활용할 만한 시기')
    .replace(/최고/g, '강점')
    .replace(/대길/g, '강한 길조');
}

const PERSONALITY_BY_STEM: Record<string, string> = {
  갑: '큰 방향을 먼저 세우고 사람들을 이끄는 개척형 기질이 강합니다.',
  을: '부드럽게 스며들며 판을 바꾸는 조율형 감각이 뛰어납니다.',
  병: '존재감과 추진력을 앞세워 분위기를 주도하는 리더형입니다.',
  정: '작은 차이도 놓치지 않는 섬세함과 집중력이 강점입니다.',
  무: '흔들려도 중심을 지키는 묵직한 책임감이 두드러집니다.',
  기: '세부를 정리하고 사람 마음을 살피는 실무형 감각이 탁월합니다.',
  경: '원칙과 결단을 중시하며 어려운 상황에서도 칼같이 판단합니다.',
  신: '정교함, 미감, 완성도를 중시하는 전문가형 성향이 짙습니다.',
  임: '넓은 시야로 흐름을 읽고 크게 움직이는 전략형입니다.',
  계: '겉보다 속이 깊고 직관으로 핵심을 꿰뚫는 내면형입니다.',
};

const PERSONALITY_BY_BRANCH: Record<string, string> = {
  자: '일지의 자수는 감정을 깊게 저장해 두었다가 결정적 순간에 한 번에 움직이는 면을 더합니다.',
  축: '일지의 축토는 속을 단단히 다진 뒤 천천히 결과를 만드는 인내심을 보태 줍니다.',
  인: '일지의 인목은 판을 넓히고 새 길을 열고자 하는 모험심을 키웁니다.',
  묘: '일지의 묘목은 세련된 감각과 인간관계의 미묘한 온도차를 읽는 힘을 더합니다.',
  진: '일지의 진토는 겉으론 유연해 보여도 속으론 쉽게 물러서지 않는 버팀목 역할을 합니다.',
  사: '일지의 사화는 머리 회전과 순발력을 높여 빠르게 상황을 읽게 만듭니다.',
  오: '일지의 오화는 자존감과 승부욕을 키워 존재감을 크게 드러내게 합니다.',
  미: '일지의 미토는 배려와 현실 감각을 섞어 사람을 품으면서도 손익을 계산하게 합니다.',
  신: '일지의 신금은 재치와 계산력을 더해 필요할 때는 냉정하게 선을 긋게 합니다.',
  유: '일지의 유금은 완성도와 체면 의식을 강하게 만들어 스스로 기준을 높입니다.',
  술: '일지의 술토는 의리와 신념을 끝까지 지키려는 강한 버팀성을 만듭니다.',
  해: '일지의 해수는 상상력과 공감력을 넓혀 보이지 않는 기류까지 민감하게 읽게 합니다.',
};

const DOMINANT_REACTION: Record<string, string> = {
  same: '사주 전체도 같은 오행이 힘을 실어주면 장점이 과장되기 쉬우니 균형 감각이 중요합니다.',
  different: '사주 전체의 주도 오행이 다르면 성격의 겉과 속이 달라 보여, 초반에는 오해를 사도 시간이 갈수록 진가가 드러납니다.',
};

const RELATION_PERSONALITY: Record<DayPillarElementRelation, string> = {
  same: '천간과 지지의 결이 같아 자기 색이 선명하고 일관성이 강한 편입니다.',
  stem_generates_branch: '내 안의 에너지가 밖으로 흘러나가는 구조라 베풀고 책임지는 쪽으로 성향이 기울기 쉽습니다.',
  stem_controls_branch: '내 의지로 환경을 제어하려는 힘이 커서 주도권 다툼에 예민할 수 있습니다.',
  branch_generates_stem: '주변 환경이 자신을 살려주는 구조라 귀인운과 배움운을 잘 활용하면 성장 속도가 빨라집니다.',
  branch_controls_stem: '내면과 현실이 자주 충돌해도 그 긴장이 오히려 사람을 단단하게 만드는 편입니다.',
};

const FORTUNE_BY_STEM: Record<string, string> = {
  갑: '초년에는 스스로 길을 만들고 중년부터 영향력이 커지는 흐름이 많습니다.',
  을: '처음엔 조용히 축적하다가 어느 순간 관계와 평판이 자산으로 돌아오는 흐름이 강합니다.',
  병: '한번 무대가 열리면 빠르게 치고 올라가며, 대외 활동이 인생의 분수령이 되기 쉽습니다.',
  정: '속도보다 축적이 중요하며, 한 분야를 깊게 파고든 뒤 빛을 보는 경우가 많습니다.',
  무: '인생의 고비마다 기반을 다지는 능력이 뛰어나 큰 흔들림 후에도 다시 일어나는 힘이 좋습니다.',
  기: '큰 한 방보다 꾸준한 축적에서 결실이 나며, 생활력과 운영력이 복으로 연결됩니다.',
  경: '결단해야 할 시기에 칼같이 움직일수록 길이 열리고, 망설일수록 운이 답답해집니다.',
  신: '실력과 완성도가 쌓일수록 평판 운이 강해지고, 전문성이 곧 재복으로 이어집니다.',
  임: '넓게 움직일수록 운이 살아나며, 한곳에만 갇히면 기회가 줄어드는 구조입니다.',
  계: '겉으로 조용한 시기에도 내면 축적이 이어져 뒤늦게 크게 평가받는 경우가 많습니다.',
};

const FORTUNE_BY_BRANCH: Record<string, string> = {
  자: '삶의 전환점이 감정, 인간관계, 이동 문제와 함께 찾아오는 편입니다.',
  축: '늦게 피더라도 오래 가는 운이라 조급함만 줄이면 결실이 단단합니다.',
  인: '새 출발, 확장, 독립이 반복되는 패턴이 강해 움직일수록 운이 살아납니다.',
  묘: '사람과 평판이 운의 핵심 자원이 되므로 관계의 온도를 잘 관리하는 것이 중요합니다.',
  진: '큰 기회가 오기 전 정리와 재구축 과정이 먼저 오는 구조가 많습니다.',
  사: '빠른 판단이 복이 되기도 하지만, 과열되면 관계 피로가 쌓이기 쉽습니다.',
  오: '성공과 노출이 함께 커지는 대신 자존심 문제도 같이 커지기 쉬운 흐름입니다.',
  미: '생활 기반, 가족, 재정 안정이 곧 운의 방향을 좌우하는 경우가 많습니다.',
  신: '기회가 왔을 때 순발력 있게 잡으면 크게 올라가고, 의심이 길어지면 놓치기 쉽습니다.',
  유: '브랜드, 전문성, 완성도, 평판 관리가 곧 운의 상승폭을 결정합니다.',
  술: '한 번 책임진 일에서 신뢰를 쌓을수록 후반 운이 강해지는 패턴이 많습니다.',
  해: '눈에 안 보이는 인연과 흐름이 중요해 직감과 공부가 함께 갈 때 운이 열립니다.',
};

const RELATION_FORTUNE: Record<DayPillarElementRelation, string> = {
  same: '안과 밖의 방향이 같아 자기 확신이 강한 대신 고집이 세질 때가 숙제입니다.',
  stem_generates_branch: '내가 먼저 움직여야 판이 열리는 구조라 주도적 선택이 중요합니다.',
  stem_controls_branch: '환경을 다루는 능력은 좋지만 힘 조절을 못 하면 피로가 빨리 쌓입니다.',
  branch_generates_stem: '주변의 도움, 배움, 인맥을 활용할수록 운이 빠르게 증폭됩니다.',
  branch_controls_stem: '초반에는 제약처럼 느껴져도 결국은 큰 내공으로 바뀌는 구조입니다.',
};

const FORTUNE_ENDING = [
  '급하게 크게 벌이기보다 시기마다 핵심 하나를 정확히 잡는 것이 평생 운을 안정시킵니다.',
  '사람을 잘 골라 곁에 두는 순간 운의 효율이 크게 올라갑니다.',
  '운이 들어올 때보다 정리할 때 실력이 드러나는 일주라 마무리 습관이 중요합니다.',
  '내가 잘하는 방식 하나를 오래 밀어붙일수록 복이 늦지 않게 따라옵니다.',
  '감정적 결정보다 구조를 먼저 만들면 큰 굴곡 없이 길게 강한 흐름을 탑니다.',
  '인생의 복은 대개 관계, 실력, 타이밍이 함께 맞을 때 크게 열립니다.',
];

const CAREER_BY_STEM: Record<string, string> = {
  갑: '방향을 정하고 조직을 이끄는 역할',
  을: '조율과 기획으로 흐름을 만드는 역할',
  병: '전면에 서서 성과를 끌어내는 역할',
  정: '연구·콘텐츠·정밀 실무를 깊게 파는 역할',
  무: '기반을 세우고 운영을 안정시키는 역할',
  기: '세부 관리와 지원 시스템을 완성하는 역할',
  경: '판단, 규율, 기술 집행을 맡는 역할',
  신: '품질, 감각, 전문 디테일을 책임지는 역할',
  임: '전략, 네트워크, 확장을 설계하는 역할',
  계: '분석, 통찰, 기획안을 깊게 다듬는 역할',
};

const CAREER_BY_BRANCH: Record<string, string> = {
  자: '데이터, 기획, 상담, 연구, 유통처럼 흐름을 읽는 분야',
  축: '재무, 행정, 제조, 운영처럼 축적과 관리가 중요한 분야',
  인: '교육, 창업, 영업, 기획 리드처럼 새 판을 여는 분야',
  묘: '브랜딩, 디자인, 서비스, 인사처럼 관계 감각이 필요한 분야',
  진: '개발, 건설, 프로젝트 매니지먼트처럼 복합 조정이 필요한 분야',
  사: '마케팅, 미디어, 협상, 프레젠테이션처럼 속도와 전달력이 중요한 분야',
  오: '리더십, 홍보, 퍼포먼스, 대외 활동처럼 존재감이 중요한 분야',
  미: '복지, 교육지원, 생활 서비스, 조직 운영처럼 사람을 돌보는 분야',
  신: '금융, 기술영업, 법률 보조, 분석처럼 계산력이 필요한 분야',
  유: '품질관리, 뷰티, 정밀 디자인, 브랜드 운영처럼 완성도가 중요한 분야',
  술: '공공, 법무, 보안, 자산관리처럼 책임성과 신뢰가 중요한 분야',
  해: '콘텐츠, 심리, 예술, 해외업무, 연구처럼 깊이와 상상력이 필요한 분야',
};

const RELATION_CAREER: Record<DayPillarElementRelation, string> = {
  same: '자기 스타일이 분명해 프리랜스나 오너십이 있는 포지션에서 강합니다.',
  stem_generates_branch: '내가 아이디어와 에너지를 계속 내보내야 성과가 나는 구조입니다.',
  stem_controls_branch: '관리자, 총괄, 조정자 포지션에서 특히 강점이 드러납니다.',
  branch_generates_stem: '멘토, 팀, 조직의 도움을 받으면 성장 속도가 눈에 띄게 빨라집니다.',
  branch_controls_stem: '압박이 있는 환경일수록 실력이 정교해져 위기 대응형 전문가로 성장하기 쉽습니다.',
};

const CAREER_CAUTION: Record<string, string> = {
  자: '감정 소모가 큰 팀에 오래 있으면 집중력이 흐려질 수 있습니다.',
  축: '속도가 지나치게 느리면 기회를 놓치니 의사결정 마감선을 두는 것이 좋습니다.',
  인: '시작은 빠른데 마무리가 늦어질 수 있어 후반 관리자를 곁에 두면 좋습니다.',
  묘: '관계에 에너지를 너무 쓰면 정작 핵심 성과가 늦어질 수 있습니다.',
  진: '여러 일을 동시에 떠안아 과로로 가기 쉬우니 우선순위 관리가 중요합니다.',
  사: '즉흥적 확장이 잦으면 조직 피로가 커질 수 있습니다.',
  오: '성과를 급히 증명하려다 소진이 빨라질 수 있습니다.',
  미: '거절을 못 해 잡무가 늘어나는 구조를 조심해야 합니다.',
  신: '기회가 와도 계산이 길어 타이밍을 놓치지 않도록 해야 합니다.',
  유: '완벽주의 때문에 출시나 공개가 늦어질 수 있습니다.',
  술: '책임감이 강한 대신 융통성이 부족하다는 평가를 조심해야 합니다.',
  해: '생각이 깊은 만큼 실행 시점을 미루는 습관을 경계해야 합니다.',
};

const LOVE_BY_STEM: Record<string, string> = {
  갑: '사랑에서도 방향성과 신의를 먼저 보는 편이라 함부로 마음을 주지 않습니다.',
  을: '정서적 호흡과 세심한 배려가 맞을 때 깊이 열리는 타입입니다.',
  병: '좋아하면 분명히 표현하고 관계의 온도를 빠르게 끌어올립니다.',
  정: '천천히 스며들지만 한번 마음이 열리면 헌신의 깊이가 큽니다.',
  무: '말은 적어도 오래 지키는 관계를 선호하는 안정형입니다.',
  기: '상대의 생활과 감정을 챙기며 현실적인 사랑을 만들어 갑니다.',
  경: '관계에서도 원칙과 신뢰를 중요하게 여겨 애매한 상황을 싫어합니다.',
  신: '감각적 교감과 수준 높은 대화를 중요하게 여기는 편입니다.',
  임: '서로의 자유와 성장 공간을 인정할 때 사랑이 오래 갑니다.',
  계: '겉으론 조용해도 내면적 유대와 진정성을 가장 깊게 봅니다.',
};

const LOVE_BY_BRANCH: Record<string, string> = {
  자: '감정이 깊어지면 집착처럼 보일 만큼 몰입할 수 있으니 거리 조절이 중요합니다.',
  축: '관계의 속도는 느려도 한번 신뢰가 쌓이면 오래 가는 편입니다.',
  인: '설렘과 도전이 있어야 사랑이 살아나며, 정체된 관계를 답답해합니다.',
  묘: '대화의 결, 예의, 분위기를 중요하게 보며 미묘한 감정 변화에 민감합니다.',
  진: '현실 조건과 감정의 균형을 같이 보려 해 관계 판단이 신중한 편입니다.',
  사: '끌리면 빠르게 가까워지지만 식는 속도도 빨라질 수 있어 진정성이 중요합니다.',
  오: '자존심과 애정 표현이 동시에 강해 관계의 온도차가 크게 드러날 수 있습니다.',
  미: '돌봄과 생활의 안정감이 사랑의 핵심 기준이 되기 쉽습니다.',
  신: '재치와 두뇌전이 통하는 관계에 강하게 끌리며 권태를 싫어합니다.',
  유: '연애에서도 품격, 센스, 세련된 태도를 중요하게 봅니다.',
  술: '의리와 책임을 먼저 보는 편이라 가벼운 만남엔 쉽게 마음이 열리지 않습니다.',
  해: '감성 교류와 정신적 연결이 맞을 때 관계가 급격히 깊어집니다.',
};

const RELATION_LOVE: Record<DayPillarElementRelation, string> = {
  same: '자기 방식이 뚜렷해 잘 맞는 사람과는 강하지만 안 맞으면 조정이 어렵습니다.',
  stem_generates_branch: '내가 더 많이 주는 연애가 되기 쉬우니 감정 균형을 의식하는 것이 좋습니다.',
  stem_controls_branch: '주도권을 잡으려는 마음이 강해 상대의 속도를 존중하는 연습이 필요합니다.',
  branch_generates_stem: '좋은 파트너를 만나면 잠재력이 크게 살아나는 구조입니다.',
  branch_controls_stem: '상처를 통해 성숙하는 사랑이 많아 초반보다 후반 연애운이 더 안정적입니다.',
};

const LOVE_CAUTION: Record<string, string> = {
  자: '말하지 않고 쌓아두는 습관만 줄이면 관계가 훨씬 편안해집니다.',
  축: '표현이 늦어 오해받기 쉬우니 좋은 마음은 조금 빨리 전하는 편이 낫습니다.',
  인: '관계 안에서도 독주하지 않고 상대 의견을 중간중간 확인하는 것이 중요합니다.',
  묘: '분위기만 읽다가 핵심 질문을 놓치지 않도록 솔직한 확인이 필요합니다.',
  진: '현실 문제를 혼자 다 책임지려 하지 말고 분담 구조를 만드는 것이 좋습니다.',
  사: '감정이 달아오른 순간의 말이 오래 남으니 언어 조절이 중요합니다.',
  오: '자존심 싸움으로 번지지 않게 먼저 웃고 풀 줄 아는 힘이 필요합니다.',
  미: '돌보는 역할만 하다 보면 서운함이 쌓일 수 있어 욕구 표현이 중요합니다.',
  신: '테스트하듯 밀고 당기기보다 분명한 신뢰 신호를 주는 편이 좋습니다.',
  유: '상대의 작은 실수까지 채점하듯 보지 않으면 훨씬 편안한 관계가 됩니다.',
  술: '한번 실망했다고 바로 문을 닫기보다 복구 여지를 남겨 두는 편이 좋습니다.',
  해: '환상만 키우지 말고 생활 리듬과 책임감도 함께 보는 눈이 필요합니다.',
};

const HEALTH_BY_STEM: Record<string, string> = {
  갑: '간장·담낭·목·허리 라인을 꾸준히 관리해야 오래 강합니다.',
  을: '근육 긴장, 눈 피로, 두통처럼 예민함이 몸으로 번지기 쉬운 편입니다.',
  병: '심혈관, 열 조절, 수면 부족 누적에 특히 민감합니다.',
  정: '심장 리듬, 혈관, 수면의 질이 무너지면 컨디션이 크게 흔들립니다.',
  무: '위장, 비장, 소화계와 관절 피로가 먼저 신호를 보냅니다.',
  기: '장 건강, 면역, 스트레스성 소화장애를 조심해야 합니다.',
  경: '호흡기, 폐, 피부 건조, 과한 긴장성 통증에 주의가 필요합니다.',
  신: '기관지, 코, 피부, 자율신경이 예민하게 반응하기 쉽습니다.',
  임: '신장, 방광, 허리, 관절 냉증 관리가 핵심입니다.',
  계: '호르몬, 수면, 냉기, 부종 관리가 컨디션 유지의 핵심입니다.',
};

const HEALTH_BY_BRANCH: Record<string, string> = {
  자: '야행성 패턴과 감정 과몰입이 누적되면 회복력이 크게 떨어질 수 있습니다.',
  축: '움직임이 적고 몸이 굳기 쉬워 순환을 자주 열어 주는 습관이 필요합니다.',
  인: '무리해서 앞당기려는 습관이 근육 피로와 사고성 부상으로 이어지기 쉽습니다.',
  묘: '예민한 신경과 불규칙한 식사가 피부와 소화에 바로 반영되는 편입니다.',
  진: '과로와 복합 스트레스가 쌓이면 위장과 어깨, 턱 라인으로 드러나기 쉽습니다.',
  사: '열이 위로 몰리는 패턴이 있어 수면과 심박 조절이 중요합니다.',
  오: '흥분과 과열이 반복되면 체력 소모가 커 휴식 루틴이 필수입니다.',
  미: '먹는 것과 생활 리듬이 무너지면 체중·부종·소화가 함께 흔들릴 수 있습니다.',
  신: '신경을 많이 쓰는 날엔 호흡이 짧아지고 어깨와 목이 쉽게 굳습니다.',
  유: '건조함과 과도한 긴장이 피부, 기관지, 장 기능에 영향을 주기 쉽습니다.',
  술: '버티는 습관이 강해 통증 신호를 늦게 인정하는 편이라 조기 점검이 중요합니다.',
  해: '찬 기운, 수면 부족, 감정 침잠이 신장과 면역을 같이 약하게 만들 수 있습니다.',
};

const RELATION_HEALTH: Record<DayPillarElementRelation, string> = {
  same: '체질의 장단점이 또렷하니 좋을 때와 무너질 때의 폭이 큰 편입니다.',
  stem_generates_branch: '에너지를 계속 바깥으로 쓰는 구조라 회복 시간을 의식적으로 확보해야 합니다.',
  stem_controls_branch: '버티는 힘은 강하지만 긴장성 통증과 만성 피로로 이어지기 쉽습니다.',
  branch_generates_stem: '환경을 잘 맞추면 회복 속도가 빠른 편이라 생활 세팅이 중요합니다.',
  branch_controls_stem: '몸이 보내는 작은 신호를 무시하면 한 번에 무너질 수 있으니 조기 관리가 핵심입니다.',
};

const HEALTH_RECOVERY = [
  '따뜻한 식사, 충분한 수면, 가벼운 땀 배출만 꾸준히 해도 컨디션 차이가 크게 납니다.',
  '운동 강도보다 리듬을 일정하게 유지하는 편이 몸을 오래 살립니다.',
  '스트레스가 몸으로 바로 오는 구조라 명상, 산책, 호흡 루틴을 생활화하면 좋습니다.',
  '몸을 혹사한 뒤 회복하는 방식보다 미리 쉬는 습관이 훨씬 중요합니다.',
  '차가움과 과로, 불규칙한 생활만 줄여도 건강운이 빠르게 안정됩니다.',
  '증상이 커진 뒤 치료하기보다 생활 루틴을 먼저 바로잡는 편이 효과적입니다.',
];

const SHADOW_BY_STEM: Record<string, string> = {
  갑: '자기 방향이 맞다고 느끼면 고집과 독주가 강해져 주변 조언을 늦게 받아들일 수 있습니다.',
  을: '상황을 맞추는 능력이 장점이지만, 지나치면 눈치를 보느라 자기 결정을 미루기 쉽습니다.',
  병: '표현력과 추진력이 과해질 때 과시, 성급한 판단, 말실수로 평판이 흔들릴 수 있습니다.',
  정: '섬세함이 예민함으로 기울면 사소한 신호에도 마음이 닳고 혼자 소진되기 쉽습니다.',
  무: '버티는 힘이 강한 만큼 변화가 필요한 순간에도 제자리에 머무르려는 완고함이 생길 수 있습니다.',
  기: '챙기는 마음이 과하면 걱정과 간섭이 늘고, 정작 자기 경계선은 흐려질 수 있습니다.',
  경: '판단이 빠른 만큼 표현이 차갑거나 단정적으로 들려 관계에서 불필요한 마찰을 만들 수 있습니다.',
  신: '완성도를 중시하는 태도가 심해지면 타인과 자신을 계속 평가해 편안함을 잃기 쉽습니다.',
  임: '크게 보는 눈이 장점이지만, 관심사가 분산되면 책임과 마무리가 약해 보일 수 있습니다.',
  계: '직관과 신중함이 지나치면 의심, 침잠, 결정 지연으로 기회를 놓치기 쉽습니다.',
};

const SHADOW_BY_BRANCH: Record<string, string> = {
  자: '감정을 말하지 않고 저장해 두다가 한 번에 터뜨리는 패턴을 조심해야 합니다.',
  축: '참는 힘은 좋지만 속도가 너무 늦어져 관계와 기회를 답답하게 만들 수 있습니다.',
  인: '시작은 빠른데 마무리가 흐려지면 신뢰를 잃을 수 있어 끝맺음 관리가 필요합니다.',
  묘: '분위기와 시선을 많이 읽다 보면 핵심보다 관계 온도에 끌려갈 수 있습니다.',
  진: '여러 문제를 혼자 떠안고 버티다가 정작 도움 요청 시점을 놓치기 쉽습니다.',
  사: '열이 오르면 말과 판단이 빨라져, 나중에 수습해야 할 상황을 만들 수 있습니다.',
  오: '자존심과 노출 욕구가 커질 때 경쟁심, 허세, 감정적 대립이 커질 수 있습니다.',
  미: '돌봄과 배려가 지나치면 희생감과 서운함이 쌓여 뒤늦게 관계가 흔들릴 수 있습니다.',
  신: '계산과 검증이 길어지면 좋은 기회도 의심하다가 놓칠 수 있습니다.',
  유: '체면과 완벽함에 묶이면 작은 흠도 크게 느껴져 사람을 피곤하게 만들 수 있습니다.',
  술: '원칙과 의리가 강한 만큼 한번 마음이 닫히면 복구가 어려운 편입니다.',
  해: '상상과 감정에 오래 머물면 현실 처리와 생활 리듬이 뒤로 밀릴 수 있습니다.',
};

const ELEMENT_EXCESS_SHADOW: Record<string, string> = {
  목: '목 기운이 강하면 성장 욕구가 고집으로 바뀌어 타협이 늦어질 수 있습니다.',
  화: '화 기운이 강하면 감정과 표현이 앞서 관계 피로, 구설, 과열을 만들 수 있습니다.',
  토: '토 기운이 강하면 안정 욕구가 집착과 정체로 변해 변화 대응이 늦어질 수 있습니다.',
  금: '금 기운이 강하면 판단과 기준이 날카로워져 차갑다는 인상을 주기 쉽습니다.',
  수: '수 기운이 강하면 생각과 감정이 깊어지는 대신 실행이 늦고 마음이 가라앉기 쉽습니다.',
};

const ELEMENT_LACK_SHADOW: Record<string, string> = {
  목: '목 기운이 부족하면 장기 방향, 성장 계획, 꾸준한 확장성이 약해질 수 있습니다.',
  화: '화 기운이 부족하면 표현력, 자신감, 드러나는 존재감이 약해져 좋은 기회를 숨길 수 있습니다.',
  토: '토 기운이 부족하면 생활 기반, 신뢰감, 마무리 안정성이 흔들리기 쉽습니다.',
  금: '금 기운이 부족하면 결단, 정리, 기준 세우기가 약해져 애매한 상태가 길어질 수 있습니다.',
  수: '수 기운이 부족하면 유연성, 휴식, 깊은 사고가 부족해 무리하게 밀어붙이기 쉽습니다.',
};

const RELATION_SHADOW: Record<DayPillarElementRelation, string> = {
  same: '자기 색이 선명한 대신 반대 의견을 받아들이는 폭이 좁아질 수 있습니다.',
  stem_generates_branch: '밖으로 주는 에너지가 많아 정작 본인 회복과 보상이 뒤로 밀릴 수 있습니다.',
  stem_controls_branch: '통제하려는 힘이 강해질수록 주변이 압박을 느끼고 협력이 줄어들 수 있습니다.',
  branch_generates_stem: '도움받는 구조에 익숙해지면 스스로 결정해야 할 때 흔들릴 수 있습니다.',
  branch_controls_stem: '내면과 현실의 긴장이 강해 스트레스가 쌓이면 회피나 폭발로 나타날 수 있습니다.',
};

// Get personality description based on day pillar
export function getPersonality(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  branchElement: string,
  dominantElement: string,
): string {
  const relation = getDayPillarElementRelation(dayElement, branchElement);
  return `${dayStem}${dayBranch} 일주는 ${PERSONALITY_BY_STEM[dayStem] ?? '자기 색이 분명한 편입니다.'} ${PERSONALITY_BY_BRANCH[dayBranch] ?? '상황 판단이 빠른 편입니다.'} ${RELATION_PERSONALITY[relation]} ${dominantElement === dayElement ? DOMINANT_REACTION.same : DOMINANT_REACTION.different}`;
}

export function getFortuneText(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  branchElement: string,
): string {
  const relation = getDayPillarElementRelation(dayElement, branchElement);
  const cycleIndex = getDayPillarCycleIndex(dayStem, dayBranch);
  return `${dayStem}${dayBranch} 일주의 큰 흐름은 ${FORTUNE_BY_STEM[dayStem] ?? '시간이 갈수록 진가가 드러나는 편입니다.'} ${FORTUNE_BY_BRANCH[dayBranch] ?? '삶의 리듬 변화가 분명한 편입니다.'} ${RELATION_FORTUNE[relation]} ${FORTUNE_ENDING[cycleIndex % FORTUNE_ENDING.length]}`;
}

// 10천간별 직업 적성 (일간 기준)
export function getCareerText(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  branchElement: string,
): string {
  const relation = getDayPillarElementRelation(dayElement, branchElement);
  return `${dayStem}${dayBranch} 일주는 일에서 ${CAREER_BY_STEM[dayStem] ?? '자기 방식으로 성과를 만드는 힘'}이 강하고, ${CAREER_BY_BRANCH[dayBranch] ?? '현장 감각이 필요한 분야'}와 특히 결이 맞습니다. ${RELATION_CAREER[relation]} ${CAREER_CAUTION[dayBranch] ?? '한 번에 너무 많은 일을 벌이지 않는 것이 중요합니다.'}`;
}

export function getLoveText(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  branchElement: string,
): string {
  const relation = getDayPillarElementRelation(dayElement, branchElement);
  return `${dayStem}${dayBranch} 일주는 연애에서 ${LOVE_BY_STEM[dayStem] ?? '신뢰와 진정성을 중시하는 편입니다.'} ${LOVE_BY_BRANCH[dayBranch] ?? '감정 표현의 속도 조절이 중요합니다.'} ${RELATION_LOVE[relation]} ${LOVE_CAUTION[dayBranch] ?? '마음을 쌓아두지 말고 그때그때 나누는 연습이 필요합니다.'}`;
}

export function getHealthText(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  branchElement: string,
): string {
  const relation = getDayPillarElementRelation(dayElement, branchElement);
  const cycleIndex = getDayPillarCycleIndex(dayStem, dayBranch);
  return `${dayStem}${dayBranch} 일주는 ${HEALTH_BY_STEM[dayStem] ?? '기초 체력과 수면 관리가 중요합니다.'} ${HEALTH_BY_BRANCH[dayBranch] ?? '생활 리듬이 흐트러지지 않게 관리해야 합니다.'} ${RELATION_HEALTH[relation]} ${HEALTH_RECOVERY[cycleIndex % HEALTH_RECOVERY.length]}`;
}

export function getShadowReading(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  branchElement: string,
  dominantElement: string,
  lackingElement: string,
) {
  const relation = getDayPillarElementRelation(dayElement, branchElement);
  const pitfalls = [
    SHADOW_BY_STEM[dayStem] ?? '장점이 과해지면 자기 방식만 고집하는 패턴을 조심해야 합니다.',
    SHADOW_BY_BRANCH[dayBranch] ?? '감정과 생활 리듬이 흐트러질 때 판단이 약해질 수 있습니다.',
    ELEMENT_EXCESS_SHADOW[dominantElement] ?? '강한 기운이 한쪽으로 쏠리면 사고와 행동도 편향될 수 있습니다.',
    ELEMENT_LACK_SHADOW[lackingElement] ?? '부족한 기운은 평소에는 작게 보이다가 중요한 순간 약점으로 드러날 수 있습니다.',
  ];

  return {
    title: '그림자와 주의점',
    summary: `${dayStem}${dayBranch} 일주는 장점이 분명한 만큼, 무너질 때도 패턴이 뚜렷합니다. ${RELATION_SHADOW[relation]}`,
    pitfalls,
    advice: `강한 ${dominantElement} 기운은 속도를 낮추고, 부족한 ${lackingElement} 기운은 생활 속에서 의식적으로 보완해야 균형이 잡힙니다.`,
  };
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

type SajuCorePillar = ReturnType<typeof getYearPillar>;

// ──────────── 납음오행 (納音五行) ────────────
export interface NayinInfo {
  name: string;
  hanja: string;
  element: string;
  image: string;
}

const NAYIN_TABLE: readonly NayinInfo[] = [
  { name: '해중금', hanja: '海中金', element: '금', image: '깊은 물속 금처럼 재능이 겉보다 늦게 드러나며, 안전한 기반을 얻을수록 가치가 선명해집니다.' },
  { name: '노중화', hanja: '爐中火', element: '화', image: '화로 안의 불처럼 집중력과 열기가 강합니다. 분명한 목표가 있을 때 오래 타오르는 힘을 냅니다.' },
  { name: '대림목', hanja: '大林木', element: '목', image: '큰 숲의 나무처럼 성장 폭이 크고 여러 사람을 품습니다. 혼자보다 조직과 환경 속에서 영향력이 커집니다.' },
  { name: '노방토', hanja: '路傍土', element: '토', image: '길가의 흙처럼 사람과 기회를 이어 줍니다. 다양한 경험을 쌓아야 자기 쓸모와 방향이 또렷해집니다.' },
  { name: '검봉금', hanja: '劍鋒金', element: '금', image: '칼날의 금처럼 판단과 결단이 빠릅니다. 날카로움을 전문성으로 쓰면 강점이 되고, 말로 쓰면 마찰이 됩니다.' },
  { name: '산두화', hanja: '山頭火', element: '화', image: '산 위의 불빛처럼 멀리 드러나는 존재감이 있습니다. 명분과 방향이 분명할수록 사람을 모으는 힘이 생깁니다.' },
  { name: '간하수', hanja: '澗下水', element: '수', image: '골짜기를 흐르는 물처럼 섬세하고 유연합니다. 작은 흐름을 꾸준히 이어 큰 결과로 만드는 타입입니다.' },
  { name: '성두토', hanja: '城頭土', element: '토', image: '성벽의 흙처럼 기준과 방어력이 강합니다. 책임질 영역이 생길 때 안정감과 관리 능력이 빛납니다.' },
  { name: '백랍금', hanja: '白蠟金', element: '금', image: '정련 중인 금처럼 다듬을수록 빛납니다. 초반 완성도보다 반복 학습과 피드백이 성취를 키웁니다.' },
  { name: '양류목', hanja: '楊柳木', element: '목', image: '버드나무처럼 부드럽고 적응력이 좋습니다. 관계 감각이 뛰어나지만 자기 기준을 잃지 않는 것이 중요합니다.' },
  { name: '천중수', hanja: '泉中水', element: '수', image: '샘물처럼 안에서 지식과 감각이 솟습니다. 조용히 축적한 것을 밖으로 나눌 때 운이 활발해집니다.' },
  { name: '옥상토', hanja: '屋上土', element: '토', image: '지붕의 흙처럼 보호하고 마무리하는 힘이 있습니다. 가정·조직·프로젝트의 구조를 완성하는 역할에 강합니다.' },
  { name: '벽력화', hanja: '霹靂火', element: '화', image: '번개 불처럼 변화가 빠르고 돌파력이 큽니다. 순간 추진력을 계획과 연결하면 큰 전환을 만들 수 있습니다.' },
  { name: '송백목', hanja: '松柏木', element: '목', image: '소나무와 잣나무처럼 원칙과 지속력이 강합니다. 느려도 흔들리지 않는 축적이 신뢰와 성과를 만듭니다.' },
  { name: '장류수', hanja: '長流水', element: '수', image: '긴 강물처럼 흐름을 읽고 멀리 갑니다. 단기 승부보다 장기 기획·연결·이동에서 장점이 살아납니다.' },
  { name: '사중금', hanja: '沙中金', element: '금', image: '모래 속 금처럼 가능성이 환경에 묻혀 있습니다. 좋은 스승과 기준을 만나면 숨은 실력이 빠르게 드러납니다.' },
  { name: '산하화', hanja: '山下火', element: '화', image: '산 아래 불처럼 생활 가까이 온기를 전합니다. 실용적인 표현과 꾸준한 관계 관리가 평판을 키웁니다.' },
  { name: '평지목', hanja: '平地木', element: '목', image: '들판의 나무처럼 현실적인 성장력이 있습니다. 기반을 넓게 잡고 반복 가능한 일을 만들 때 안정적으로 커집니다.' },
  { name: '벽상토', hanja: '壁上土', element: '토', image: '벽의 흙처럼 경계와 질서를 세웁니다. 규칙·문서·관리 체계를 만들 때 보호력과 실무력이 강해집니다.' },
  { name: '금박금', hanja: '金箔金', element: '금', image: '금박처럼 섬세한 완성도와 감각이 돋보입니다. 겉모양만 좇지 않고 내용까지 채울 때 평가가 오래갑니다.' },
  { name: '복등화', hanja: '覆燈火', element: '화', image: '등잔불처럼 가까운 곳을 정확히 밝힙니다. 연구·교육·상담처럼 한 사람에게 깊이 닿는 일에 강합니다.' },
  { name: '천하수', hanja: '天河水', element: '수', image: '하늘의 강물처럼 시야와 상상력이 큽니다. 큰 생각을 일정과 결과물로 내려놓는 과정이 성패를 가릅니다.' },
  { name: '대역토', hanja: '大驛土', element: '토', image: '큰 역참의 땅처럼 이동과 교류의 기반이 됩니다. 사람·정보·자원을 연결하고 운영하는 역할에 적합합니다.' },
  { name: '차천금', hanja: '釵釧金', element: '금', image: '비녀와 팔찌의 금처럼 품질과 세련미가 강점입니다. 관계와 결과물의 디테일을 다듬을수록 가치가 높아집니다.' },
  { name: '상자목', hanja: '桑柘木', element: '목', image: '뽕나무처럼 생활을 먹여 살리는 생산력이 있습니다. 실용 기술과 꾸준한 돌봄이 재물과 신뢰로 이어집니다.' },
  { name: '대계수', hanja: '大溪水', element: '수', image: '큰 계곡물처럼 추진과 변화의 폭이 큽니다. 막히면 방향을 바꾸되 최종 목적지는 놓치지 않아야 합니다.' },
  { name: '사중토', hanja: '沙中土', element: '토', image: '모래 속 흙처럼 유연한 현실 감각이 있습니다. 흩어진 자원과 경험을 하나의 기반으로 묶는 힘이 중요합니다.' },
  { name: '천상화', hanja: '天上火', element: '화', image: '태양처럼 넓게 비추는 공개성과 추진력이 있습니다. 영향력이 커질수록 과열보다 책임 있는 표현이 필요합니다.' },
  { name: '석류목', hanja: '石榴木', element: '목', image: '석류나무처럼 단단한 껍질 안에 많은 결실을 품습니다. 전문성을 깊게 파고 결과를 다양하게 확장하는 힘이 있습니다.' },
  { name: '대해수', hanja: '大海水', element: '수', image: '큰 바다처럼 포용력과 잠재력이 큽니다. 경계를 정하고 방향을 세워야 넓은 가능성이 실제 성취로 모입니다.' },
];

export function getNayin(stemIndex: number, branchIndex: number): NayinInfo {
  const ganziIndex = getGanziIdx(stemIndex, branchIndex);
  return NAYIN_TABLE[Math.floor(ganziIndex / 2)] ?? NAYIN_TABLE[0];
}

export interface NayinPillarReading extends NayinInfo {
  pillar: '년주' | '월주' | '일주' | '시주';
  ganzi: string;
  reading: string;
}

export interface AuxiliaryPalaceReading {
  key: 'taewon' | 'minggung' | 'shingung';
  name: '태원' | '명궁' | '신궁';
  hanja: '胎元' | '命宮' | '身宮';
  stem: string;
  branch: string;
  stemHanja: string;
  branchHanja: string;
  stemElement: string;
  branchElement: string;
  tenGod: TenGodName;
  unseong: UnseongStage;
  nayin: NayinInfo;
  summary: string;
  advice: string;
  basis: string;
}

export interface AuxiliaryAnalysis {
  nayinPillars: NayinPillarReading[];
  taewon: AuxiliaryPalaceReading;
  minggung: AuxiliaryPalaceReading | null;
  shingung: AuxiliaryPalaceReading | null;
  requiresBirthTime: boolean;
  methodNote: string;
}

const NAYIN_PILLAR_CONTEXT: Record<NayinPillarReading['pillar'], string> = {
  년주: '년주의 납음은 집안에서 물려받은 분위기와 초년의 적응 방식을 비춥니다.',
  월주: '월주의 납음은 부모·사회 환경과 직업에서 능력을 펼치는 방식을 비춥니다.',
  일주: '일주의 납음은 자신이 중요하게 여기는 내적 기준과 가까운 관계의 결을 비춥니다.',
  시주: '시주의 납음은 장기 목표, 자녀·후배와의 관계, 말년의 관심사를 비춥니다.',
};

const AUXILIARY_BRANCH_READING: Record<string, string> = {
  자: '정보를 깊이 모으고 다음 수를 준비하는 힘',
  축: '서두르지 않고 자원과 실력을 축적하는 힘',
  인: '새 길을 열고 먼저 움직이는 개척력',
  묘: '관계의 결을 읽고 조화롭게 확장하는 감각',
  진: '서로 다른 자원을 묶어 전환점을 만드는 힘',
  사: '상황을 빠르게 읽고 표현과 전략으로 풀어내는 힘',
  오: '사람 앞에 서서 에너지를 확산하는 추진력',
  미: '생활과 관계를 세심하게 돌보며 기반을 완성하는 힘',
  신: '기술과 변화에 민첩하게 대응하는 실무 감각',
  유: '기준을 세우고 결과물의 완성도를 높이는 힘',
  술: '원칙과 책임을 지키며 마지막까지 버티는 힘',
  해: '보이지 않는 흐름을 읽고 배움과 상상으로 넓히는 힘',
};

const AUXILIARY_TEN_GOD_ADVICE: Record<TenGodName, string> = {
  비견: '독립성은 살리되 역할과 책임 범위를 먼저 합의하세요.',
  겁재: '사람을 움직이는 힘은 크지만 돈·지분·약속은 문서로 남기세요.',
  식신: '꾸준히 만든 결과물을 공개하면 복과 기회가 자연스럽게 연결됩니다.',
  상관: '날카로운 표현을 개선안과 작품으로 바꾸면 재능이 더 높게 평가됩니다.',
  편재: '기회를 넓게 보되 현금흐름과 손실 한도를 먼저 정하세요.',
  정재: '반복 가능한 수입 구조와 생활 루틴을 만들수록 안정감이 커집니다.',
  편관: '압박을 혼자 견디기보다 규칙·운동·전문가 도움으로 관리하세요.',
  정관: '자격과 책임을 차근차근 쌓으면 평판과 직위가 함께 올라갑니다.',
  편인: '독특한 통찰을 현실에서 검증하고, 배운 내용을 결과물로 정리하세요.',
  정인: '자료·자격·스승의 도움을 활용하되 실행 시점을 계속 미루지 마세요.',
};

function getYearBasedPalaceStemIndex(yearStemIndex: number, branchIndex: number): number {
  const offsetFromIn = (branchIndex - 2 + 12) % 12;
  return (yearStemIndex * 2 + 2 + offsetFromIn) % 10;
}

function makeAuxiliaryPalace(
  key: AuxiliaryPalaceReading['key'],
  stemIndex: number,
  branchIndex: number,
  dayStem: string,
  basis: string,
): AuxiliaryPalaceReading {
  const names = {
    taewon: { name: '태원' as const, hanja: '胎元' as const },
    minggung: { name: '명궁' as const, hanja: '命宮' as const },
    shingung: { name: '신궁' as const, hanja: '身宮' as const },
  }[key];
  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];
  const tenGod = getTenGod(dayStem, stem);
  const unseong = getUnseong(dayStem, branchIndex);
  const nayin = getNayin(stemIndex, branchIndex);
  const branchReading = AUXILIARY_BRANCH_READING[branch];
  const summary = key === 'taewon'
    ? `태원은 태어나기 전부터 이어진 선천적 바탕과 초기 적응 습관을 봅니다. ${branch}(${EARTHLY_BRANCHES_HANJA[branchIndex]})의 ${branchReading}이 기본 리듬이고, ${tenGod}의 방식으로 자원을 받아들입니다. ${unseong.stage}의 생명력 위에 ${nayin.name}의 물상인 “${nayin.image}”가 더해집니다.`
    : key === 'minggung'
      ? `명궁은 여러 선택 앞에서 끝내 돌아오는 삶의 중심 기준을 봅니다. ${branch}(${EARTHLY_BRANCHES_HANJA[branchIndex]})가 주는 ${branchReading}이 내적 지향을 만들고, 일간과 맺은 ${tenGod} 관계가 목표를 고르는 방식을 보여 줍니다. 12운성 ${unseong.stage}와 납음 ${nayin.name}은 그 기준이 강해지는 장면을 보완합니다.`
      : `신궁은 생각이 실제 일·관계·생활 습관으로 드러나는 후천적 방식을 봅니다. 행동에서는 ${branch}(${EARTHLY_BRANCHES_HANJA[branchIndex]})의 ${branchReading}이 먼저 나타나며, ${tenGod}의 역할을 맡을 때 실행력이 살아납니다. ${unseong.stage}의 속도와 ${nayin.name}의 물상을 함께 보면 지속 가능한 행동 방식을 잡을 수 있습니다.`;
  const roleAdvice = key === 'taewon'
    ? '익숙한 성장 환경에서 생긴 자동 반응을 살피고, 생활 리듬부터 안정시키세요.'
    : key === 'minggung'
      ? '중요한 선택은 남의 기대보다 오래 지킬 수 있는 자기 기준과 맞는지 확인하세요.'
      : '계획을 말로만 두지 말고 일정·역할·반복 행동으로 구체화하세요.';

  return {
    key,
    name: names.name,
    hanja: names.hanja,
    stem,
    branch,
    stemHanja: HEAVENLY_STEMS_HANJA[stemIndex],
    branchHanja: EARTHLY_BRANCHES_HANJA[branchIndex],
    stemElement: STEM_ELEMENTS[stemIndex],
    branchElement: BRANCH_ELEMENTS[branchIndex],
    tenGod,
    unseong: unseong.stage,
    nayin,
    summary,
    advice: `${roleAdvice} ${AUXILIARY_TEN_GOD_ADVICE[tenGod]}`,
    basis,
  };
}

export function getAuxiliaryAnalysis(
  yearPillar: SajuCorePillar,
  monthPillar: SajuCorePillar,
  dayPillar: SajuCorePillar,
  hourPillar: SajuCorePillar | null,
): AuxiliaryAnalysis {
  const sourcePillars: Array<{ name: NayinPillarReading['pillar']; pillar: SajuCorePillar | null }> = [
    { name: '년주', pillar: yearPillar },
    { name: '월주', pillar: monthPillar },
    { name: '일주', pillar: dayPillar },
    { name: '시주', pillar: hourPillar },
  ];
  const nayinPillars = sourcePillars.flatMap(({ name, pillar }) => {
    if (!pillar) return [];
    const nayin = getNayin(pillar.stemIndex, pillar.branchIndex);
    return [{
      ...nayin,
      pillar: name,
      ganzi: `${pillar.stem}${pillar.branch}`,
      reading: `${NAYIN_PILLAR_CONTEXT[name]} ${nayin.image}`,
    }];
  });

  const taewonStemIndex = (monthPillar.stemIndex + 1) % 10;
  const taewonBranchIndex = (monthPillar.branchIndex + 3) % 12;
  const taewon = makeAuxiliaryPalace(
    'taewon',
    taewonStemIndex,
    taewonBranchIndex,
    dayPillar.stem,
    `월주 ${monthPillar.stem}${monthPillar.branch}에서 천간 1위·지지 3위 순행`,
  );

  if (!hourPillar) {
    return {
      nayinPillars,
      taewon,
      minggung: null,
      shingung: null,
      requiresBirthTime: true,
      methodNote: '태원은 월주 순행법, 명궁·신궁은 월지·시지 지장법을 사용합니다. 명궁·신궁은 출생시간이 있어야 계산됩니다.',
    };
  }

  const monthNumber = ((monthPillar.branchIndex - 2 + 12) % 12) + 1;
  const hourNumber = ((hourPillar.branchIndex - 2 + 12) % 12) + 1;
  let minggungNumber = 26 - (monthNumber + hourNumber);
  while (minggungNumber > 12) minggungNumber -= 12;
  while (minggungNumber < 1) minggungNumber += 12;
  const minggungBranchIndex = (minggungNumber + 1) % 12;
  const minggungStemIndex = getYearBasedPalaceStemIndex(yearPillar.stemIndex, minggungBranchIndex);

  const shingungMonthPosition = (monthNumber - 1) % 12;
  const stepsFromHourToYou = (9 - hourPillar.branchIndex + 12) % 12;
  const shingungBranchIndex = (shingungMonthPosition - stepsFromHourToYou + 12) % 12;
  const shingungStemIndex = getYearBasedPalaceStemIndex(yearPillar.stemIndex, shingungBranchIndex);

  return {
    nayinPillars,
    taewon,
    minggung: makeAuxiliaryPalace(
      'minggung',
      minggungStemIndex,
      minggungBranchIndex,
      dayPillar.stem,
      `월지수 ${monthNumber} + 시지수 ${hourNumber}, 26 감산 지장법·년상기월법`,
    ),
    shingung: makeAuxiliaryPalace(
      'shingung',
      shingungStemIndex,
      shingungBranchIndex,
      dayPillar.stem,
      '자상기정월 순행 후 생시에서 유(酉)까지 역산·년상기월법',
    ),
    requiresBirthTime: false,
    methodNote: '태원·명궁·신궁은 보조 해석입니다. 월주 순행법과 월지·시지 지장법을 적용했으며, 학파별 중기·진태양시 보정에 따라 결과가 달라질 수 있습니다.',
  };
}

export interface SajuSpecialSummaryBranchInfo {
  branches: string[];
  branchesHanja: string[];
  label: string;
  foundIn: string[];
}

export interface SajuSpecialSummary {
  elementLine: string;
  detailLine: string;
  gongmang: {
    year: SajuSpecialSummaryBranchInfo;
    day: SajuSpecialSummaryBranchInfo;
  };
  cheoneulGuin: SajuSpecialSummaryBranchInfo;
  monthCommand: {
    stem: string;
    stemHanja: string;
    branch: string;
    branchHanja: string;
    elapsedDays: number;
    label: string;
  };
}

const PILLAR_BRANCH_LABELS = ['년지', '월지', '일지', '시지'] as const;

const MONTH_COMMAND_STEMS: Record<number, Array<{ stemIndex: number; days: number }>> = {
  0: [{ stemIndex: 8, days: 10 }, { stemIndex: 9, days: 20 }],
  1: [{ stemIndex: 9, days: 9 }, { stemIndex: 7, days: 3 }, { stemIndex: 5, days: 18 }],
  2: [{ stemIndex: 4, days: 7 }, { stemIndex: 2, days: 7 }, { stemIndex: 0, days: 16 }],
  3: [{ stemIndex: 0, days: 10 }, { stemIndex: 1, days: 20 }],
  4: [{ stemIndex: 1, days: 9 }, { stemIndex: 9, days: 3 }, { stemIndex: 4, days: 18 }],
  5: [{ stemIndex: 4, days: 7 }, { stemIndex: 6, days: 7 }, { stemIndex: 2, days: 16 }],
  6: [{ stemIndex: 2, days: 10 }, { stemIndex: 5, days: 9 }, { stemIndex: 3, days: 11 }],
  7: [{ stemIndex: 3, days: 9 }, { stemIndex: 1, days: 3 }, { stemIndex: 5, days: 18 }],
  8: [{ stemIndex: 4, days: 7 }, { stemIndex: 8, days: 7 }, { stemIndex: 6, days: 16 }],
  9: [{ stemIndex: 6, days: 10 }, { stemIndex: 7, days: 20 }],
  10: [{ stemIndex: 7, days: 9 }, { stemIndex: 3, days: 3 }, { stemIndex: 4, days: 18 }],
  11: [{ stemIndex: 4, days: 7 }, { stemIndex: 0, days: 7 }, { stemIndex: 8, days: 16 }],
};

function getBranchInfo(
  branchIndexes: number[],
  allPillars: Array<SajuCorePillar | null>,
): SajuSpecialSummaryBranchInfo {
  const branches = branchIndexes.map((idx) => EARTHLY_BRANCHES[idx] ?? '');
  const branchesHanja = branchIndexes.map((idx) => EARTHLY_BRANCHES_HANJA[idx] ?? '');
  const foundIn: string[] = [];

  allPillars.forEach((pillar, index) => {
    if (pillar && branchIndexes.includes(pillar.branchIndex)) {
      foundIn.push(PILLAR_BRANCH_LABELS[index]);
    }
  });

  return {
    branches,
    branchesHanja,
    label: branchesHanja.join(''),
    foundIn,
  };
}

function getGongmangInfo(
  pillar: SajuCorePillar,
  allPillars: Array<SajuCorePillar | null>,
): SajuSpecialSummaryBranchInfo {
  const ganziIdx = getGanziIdx(pillar.stemIndex, pillar.branchIndex);
  return getBranchInfo(getGongmangBranches(ganziIdx), allPillars);
}

function getMonthCommandStem(
  year: number,
  month: number,
  day: number,
  birthHour: number = -1,
  birthMinute: number = 0,
) {
  const birthDate = new Date(
    year,
    month - 1,
    day,
    birthHour === -1 ? 12 : birthHour,
    birthMinute,
  );
  const terms: Array<{ branchIndex: number; date: Date }> = [];

  for (const termYear of [year - 1, year, year + 1]) {
    for (let branchIndex = 0; branchIndex < 12; branchIndex++) {
      const term = getMonthTermDateTime(termYear, branchIndex);
      const actualYear = term.month === 1 ? termYear + 1 : termYear;
      terms.push({
        branchIndex,
        date: new Date(actualYear, term.month - 1, term.day, term.hour, term.minute),
      });
    }
  }

  terms.sort((a, b) => a.date.getTime() - b.date.getTime());

  let currentTerm = terms[0] ?? { branchIndex: 0, date: birthDate };
  for (const term of terms) {
    if (term.date <= birthDate) {
      currentTerm = term;
    } else {
      break;
    }
  }

  const elapsedDays = Math.max(
    1,
    Math.floor((birthDate.getTime() - currentTerm.date.getTime()) / 86400000) + 1,
  );
  const commands = MONTH_COMMAND_STEMS[currentTerm.branchIndex] ?? [];
  let chosen = commands[commands.length - 1] ?? { stemIndex: -1, days: 0 };
  let cumulativeDays = 0;

  for (const command of commands) {
    cumulativeDays += command.days;
    if (elapsedDays <= cumulativeDays) {
      chosen = command;
      break;
    }
  }

  return {
    stem: HEAVENLY_STEMS[chosen.stemIndex] ?? '',
    stemHanja: HEAVENLY_STEMS_HANJA[chosen.stemIndex] ?? '',
    branch: EARTHLY_BRANCHES[currentTerm.branchIndex] ?? '',
    branchHanja: EARTHLY_BRANCHES_HANJA[currentTerm.branchIndex] ?? '',
    elapsedDays,
    label: HEAVENLY_STEMS_HANJA[chosen.stemIndex] ?? '',
  };
}

export function getSajuSpecialSummary(
  year: number,
  month: number,
  day: number,
  birthHour: number,
  birthMinute: number,
  yearPillar: SajuCorePillar,
  monthPillar: SajuCorePillar,
  dayPillar: SajuCorePillar,
  hourPillar: SajuCorePillar | null,
  elementBalance: { wood: number; fire: number; earth: number; metal: number; water: number },
): SajuSpecialSummary {
  const allPillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const yearGongmang = getGongmangInfo(yearPillar, allPillars);
  const dayGongmang = getGongmangInfo(dayPillar, allPillars);
  const cheoneulTargets = CHEONEUL[dayPillar.stem] ?? [];
  const cheoneulGuin = getBranchInfo(cheoneulTargets, allPillars);
  const monthCommand = getMonthCommandStem(year, month, day, birthHour, birthMinute);
  const elementLine = [
    `木${elementBalance.wood}`,
    `火${elementBalance.fire}`,
    `土${elementBalance.earth}`,
    `金${elementBalance.metal}`,
    `水${elementBalance.water}`,
  ].join(', ');
  const detailLine = [
    `空亡:[年]${yearGongmang.label || '-'} [日]${dayGongmang.label || '-'}`,
    `天乙貴人:${cheoneulGuin.label || '-'}`,
    `월령:${monthCommand.label || '-'}`,
  ].join(', ');

  return {
    elementLine,
    detailLine,
    gongmang: {
      year: yearGongmang,
      day: dayGongmang,
    },
    cheoneulGuin,
    monthCommand,
  };
}

// ──────────── 대운 (大運) ────────────
export function getDaeun(
  birthYear: number, birthMonth: number, birthDay: number,
  gender: 'male' | 'female',
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getMonthPillar>,
  birthHour: number = -1,
  birthMinute: number = 0
) {
  // 대운 순행/역행은 년간(年干) 기준 (전통 사주 표준)
  // 양년간(갑·병·무·경·임) + 男 or 음년간 + 女 → 순행
  // 음년간(을·정·기·신·계) + 男 or 양년간 + 女 → 역행
  const isYangYear = yearPillar.stemIndex % 2 === 0;
  const isForward = (gender === 'male') === isYangYear;

  const birthDate = new Date(birthYear, birthMonth - 1, birthDay, birthHour === -1 ? 12 : birthHour, birthMinute);

  // 주변 3년치 절기 수집 (12개 월령 절기만)
  // 소한(b=1, month=1)은 해당 데이터 연도의 다음 해 1월이므로 ty+1 사용
  const terms: Date[] = [];
  for (const ty of [birthYear - 1, birthYear, birthYear + 1]) {
    for (let b = 0; b < 12; b++) {
      const { month: tm, day: td, hour: th, minute: tmin } = getMonthTermDateTime(ty, b);
      const termYear = tm === 1 ? ty + 1 : ty;
      terms.push(new Date(termYear, tm - 1, td, th, tmin));
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
  const startMonths = Math.max(1, Math.round(diffDays * 4));
  const startAge = Math.max(1, Math.round(startMonths / 12));

  const addMonths = (date: Date, months: number) => {
    const result = new Date(date.getTime());
    const originalDay = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(originalDay, lastDay));
    return result;
  };
  const formatDate = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const monthGanziIdx = getGanziIdx(monthPillar.stemIndex, monthPillar.branchIndex);

  const periods = [];
  for (let i = 1; i <= 8; i++) {
    const offset = isForward ? i : -i;
    const idx = ((monthGanziIdx + offset) % 60 + 60) % 60;
    const ganzi = getGanzi(idx);
    const age = startAge + (i - 1) * 10;
    const periodStart = addMonths(birthDate, startMonths + (i - 1) * 120);
    const nextPeriodStart = addMonths(birthDate, startMonths + i * 120);
    const periodEnd = new Date(nextPeriodStart.getTime() - 86400000);
    periods.push({
      idx: i,
      startAge: age,
      endAge: age + 9,
      startYear: periodStart.getFullYear(),
      endYear: periodEnd.getFullYear(),
      startDate: formatDate(periodStart),
      endDate: formatDate(periodEnd),
      stem: ganzi.stem,
      branch: ganzi.branch,
      stemElement: ganzi.stemElement,
      branchElement: ganzi.branchElement,
      fortune: getDaeunFortune(ganzi)
    });
  }
  return {
    isForward,
    startAge,
    startMonths,
    differenceDays: Math.round(diffDays * 100) / 100,
    referenceTermDate: formatDate(refDate),
    periods,
  };
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
  return softenInterpretationText(
    fortunes[key] ?? '변화와 성장이 교차하는 시기입니다. 자신의 내면에 귀를 기울이며 한 걸음씩 나아가세요.',
  );
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
  if (compound[key]) return softenInterpretationText(compound[key]);
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
  return softenInterpretationText(byBranch[branch] || '변화와 성장의 해입니다.');
}

// ──────────── 대운·세운 종합 흐름 ────────────
export interface LuckFlowInteraction {
  type: '천간합' | '천간충' | '지지육합' | '지지충' | '지지형' | '지지자형' | '지지파' | '지지해';
  target: '연주' | '월주' | '일주' | '시주' | '대운';
  targetDomain: string;
  positive: boolean;
  score: number;
  description: string;
}

export interface DaeunPeriodAnalysis {
  idx: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  stem: string;
  branch: string;
  score: number;
  level: string;
  stemTenGod: TenGodName;
  branchTenGod: TenGodName;
  themes: string[];
  interactions: LuckFlowInteraction[];
  summary: string;
  advice: string;
}

export interface AnnualLuckFlow {
  year: number;
  age: number;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  daeunIndex: number | null;
  daeunLabel: string | null;
  score: number;
  level: string;
  headline: string;
  stemTenGod: TenGodName;
  branchTenGod: TenGodName;
  themes: string[];
  interactions: LuckFlowInteraction[];
  summary: string;
  advice: string;
}

export interface LuckFlowAnalysis {
  startYear: number;
  endYear: number;
  currentDaeunIndex: number | null;
  periods: DaeunPeriodAnalysis[];
  annual: AnnualLuckFlow[];
  methodNote: string;
}

type LuckFlowPillar = Pick<SajuCorePillar, 'stem' | 'branch' | 'stemIndex' | 'branchIndex' | 'stemElement' | 'branchElement'>;
type LuckFlowDaeun = {
  periods: Array<{
    idx: number;
    startAge: number;
    endAge: number;
    startYear: number;
    endYear: number;
    stem: string;
    branch: string;
    stemElement: string;
    branchElement: string;
  }>;
};

const LUCK_TARGET_DOMAINS: Record<LuckFlowInteraction['target'], string> = {
  연주: '집안·초년·사회 기반',
  월주: '직업·조직·부모 형제',
  일주: '자기 중심·배우자·가까운 관계',
  시주: '자녀·후배·장기 목표·말년',
  대운: '현재 10년 환경',
};

const LUCK_TEN_GOD_THEME: Record<TenGodName, string> = {
  비견: '자립·동료',
  겁재: '경쟁·협업',
  식신: '생산·창작',
  상관: '표현·변화',
  편재: '사업·기회',
  정재: '재정·생활',
  편관: '도전·압박',
  정관: '직장·책임',
  편인: '통찰·전환',
  정인: '학습·문서',
};

const LUCK_TEN_GOD_ADVICE: Record<TenGodName, string> = {
  비견: '주도권은 잡되 혼자 결정하지 말고 역할을 분명히 나누세요.',
  겁재: '동업·경쟁·금전 거래에서 조건과 책임을 문서로 남기세요.',
  식신: '꾸준히 만든 결과물을 공개하고 생활 리듬을 안정적으로 유지하세요.',
  상관: '비판보다 대안을 먼저 제시하고 재능을 작품·성과로 증명하세요.',
  편재: '기회를 넓게 보되 손실 한도와 현금흐름을 먼저 확인하세요.',
  정재: '수입·지출·계약을 숫자로 관리하며 반복 가능한 기반을 만드세요.',
  편관: '압박을 정면 돌파하기 전에 일정·안전·건강 관리 장치를 마련하세요.',
  정관: '절차와 책임을 지키고 자격·직함·공식 성과를 챙기세요.',
  편인: '직감은 자료로 검증하고 고립되지 않도록 중간 결과를 공유하세요.',
  정인: '배움과 문서 준비를 실제 지원·시험·계약 행동으로 연결하세요.',
};

const LUCK_BRANCH_MAIN_STEM: Record<number, string> = {
  0: '계', 1: '기', 2: '갑', 3: '을', 4: '무', 5: '병',
  6: '정', 7: '기', 8: '경', 9: '신', 10: '무', 11: '임',
};

function normalizePair(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function collectLuckInteractions(
  transit: LuckFlowPillar,
  targets: Array<{ name: LuckFlowInteraction['target']; pillar: LuckFlowPillar | null }>,
): LuckFlowInteraction[] {
  const stemHap: Record<string, { name: string; result: string }> = {
    '0-5': { name: '갑기합(甲己合)', result: '토' },
    '1-6': { name: '을경합(乙庚合)', result: '금' },
    '2-7': { name: '병신합(丙辛合)', result: '수' },
    '3-8': { name: '정임합(丁壬合)', result: '목' },
    '4-9': { name: '무계합(戊癸合)', result: '화' },
  };
  const stemChung: Record<string, string> = {
    '0-6': '갑경충(甲庚冲)', '1-7': '을신충(乙辛冲)',
    '2-8': '병임충(丙壬冲)', '3-9': '정계충(丁癸冲)',
  };
  const branchHap: Record<string, { name: string; result: string }> = {
    '0-1': { name: '자축합(子丑合)', result: '토' },
    '2-11': { name: '인해합(寅亥合)', result: '목' },
    '3-10': { name: '묘술합(卯戌合)', result: '화' },
    '4-9': { name: '진유합(辰酉合)', result: '금' },
    '5-8': { name: '사신합(巳申合)', result: '수' },
    '6-7': { name: '오미합(午未合)', result: '토' },
  };
  const branchChung: Record<string, string> = {
    '0-6': '자오충(子午冲)', '1-7': '축미충(丑未冲)',
    '2-8': '인신충(寅申冲)', '3-9': '묘유충(卯酉冲)',
    '4-10': '진술충(辰戌冲)', '5-11': '사해충(巳亥冲)',
  };
  const branchHyeong: Record<string, string> = {
    '0-3': '자묘형(子卯刑)',
    '1-7': '축미형(丑未刑)', '1-10': '축술형(丑戌刑)', '7-10': '미술형(未戌刑)',
    '2-5': '인사형(寅巳刑)', '2-8': '인신형(寅申刑)', '5-8': '사신형(巳申刑)',
  };
  const branchPa: Record<string, string> = {
    '0-9': '자유파(子酉破)', '1-4': '축진파(丑辰破)', '2-11': '인해파(寅亥破)',
    '3-6': '묘오파(卯午破)', '5-8': '사신파(巳申破)', '7-10': '미술파(未戌破)',
  };
  const branchHae: Record<string, string> = {
    '0-7': '자미해(子未害)', '1-6': '축오해(丑午害)', '2-5': '인사해(寅巳害)',
    '3-4': '묘진해(卯辰害)', '8-11': '신해해(申亥害)', '9-10': '유술해(酉戌害)',
  };
  const selfHyeong = new Set([4, 6, 9, 11]);
  const interactions: LuckFlowInteraction[] = [];

  const add = (
    type: LuckFlowInteraction['type'],
    target: LuckFlowInteraction['target'],
    positive: boolean,
    score: number,
    description: string,
  ) => interactions.push({
    type,
    target,
    targetDomain: LUCK_TARGET_DOMAINS[target],
    positive,
    score,
    description,
  });

  for (const { name: target, pillar } of targets) {
    if (!pillar) continue;
    const stemKey = normalizePair(transit.stemIndex, pillar.stemIndex);
    const branchKey = normalizePair(transit.branchIndex, pillar.branchIndex);
    const hap = stemHap[stemKey];
    if (hap) add('천간합', target, true, 5, `${hap.name}으로 ${target}의 ${LUCK_TARGET_DOMAINS[target]} 흐름이 ${hap.result} 기운으로 묶입니다.`);
    const chung = stemChung[stemKey];
    if (chung) add('천간충', target, false, -6, `${chung}이 ${target}에 걸려 계획·판단 방식의 조정이 필요합니다.`);
    const yukHap = branchHap[branchKey];
    if (yukHap) add('지지육합', target, true, 7, `${yukHap.name}으로 ${target}의 ${LUCK_TARGET_DOMAINS[target]} 영역에 협력과 연결이 생깁니다.`);
    const yukChung = branchChung[branchKey];
    if (yukChung) add('지지충', target, false, -9, `${yukChung}이 ${target}를 흔들어 ${LUCK_TARGET_DOMAINS[target]} 영역의 이동·교체 가능성이 커집니다.`);
    const hyeong = branchHyeong[branchKey];
    if (hyeong) add('지지형', target, false, -6, `${hyeong}이 ${target}에 작용해 반복 갈등과 무리한 추진을 조심해야 합니다.`);
    if (transit.branchIndex === pillar.branchIndex && selfHyeong.has(transit.branchIndex)) {
      add('지지자형', target, false, -5, `${transit.branch}${pillar.branch} 자형이 ${target}에 겹쳐 같은 고민이나 행동을 반복하기 쉽습니다.`);
    }
    const pa = branchPa[branchKey];
    if (pa) add('지지파', target, false, -4, `${pa}가 ${target}의 기존 약속·구조를 느슨하게 만들 수 있습니다.`);
    const hae = branchHae[branchKey];
    if (hae) add('지지해', target, false, -4, `${hae}가 ${target}에 걸려 겉으로 드러나지 않는 서운함과 지연을 관리해야 합니다.`);
  }

  return interactions;
}

function getLuckElementScore(
  element: string,
  yongsin: { yongsin: string; heegsin: string; geesin: string },
): number {
  if (element === yongsin.yongsin) return 10;
  if (element === yongsin.heegsin) return 6;
  if (element === yongsin.geesin) return -8;
  return 0;
}

function clampLuckScore(score: number): number {
  return Math.max(15, Math.min(90, Math.round(score)));
}

function getLuckLevel(score: number): string {
  if (score >= 75) return '기회 확장';
  if (score >= 60) return '상승';
  if (score >= 45) return '균형';
  if (score >= 30) return '조정';
  return '신중';
}

function getElementFitText(
  stemElement: string,
  branchElement: string,
  yongsin: { yongsin: string; heegsin: string; geesin: string },
): string {
  const elements = new Set([stemElement, branchElement]);
  if (elements.has(yongsin.yongsin) && elements.has(yongsin.heegsin)) {
    return `용신 ${yongsin.yongsin}과 희신 ${yongsin.heegsin}이 함께 들어와 부족한 기운을 채웁니다.`;
  }
  if (elements.has(yongsin.yongsin)) return `용신 ${yongsin.yongsin}이 들어와 균형 회복과 기회 포착에 힘을 보탭니다.`;
  if (elements.has(yongsin.heegsin)) return `희신 ${yongsin.heegsin}이 들어와 주변 도움과 실행 여건을 부드럽게 만듭니다.`;
  if (elements.has(yongsin.geesin)) return `기신 ${yongsin.geesin}이 강해져 과욕과 익숙한 패턴의 반복을 조절해야 합니다.`;
  return '용희기신 어느 한쪽으로 크게 치우치지 않아 선택과 실행이 결과를 좌우합니다.';
}

function summarizeLuckInteractions(interactions: LuckFlowInteraction[]): string {
  if (interactions.length === 0) return '원국과 직접 부딪히는 큰 합충형파해는 적어 계획한 흐름을 유지하기 좋습니다.';
  const positive = interactions.filter((item) => item.positive);
  const negative = interactions.filter((item) => !item.positive);
  if (positive.length > 0 && negative.length > 0) {
    return `${positive[0].description} 동시에 ${negative[0].description}`;
  }
  if (positive.length > 0) return positive[0].description;
  return negative[0].description;
}

function getLuckHeadline(level: string, theme: string, year: number): string {
  const action: Record<string, string> = {
    '기회 확장': '크게 펼칠', 상승: '성과로 연결할', 균형: '안정적으로 다질',
    조정: '우선순위를 다시 잡을', 신중: '기반을 지키며 준비할',
  };
  return `${theme} 중심으로 ${action[level] ?? '점검할'} ${year}년`;
}

export function getLuckFlowAnalysis(
  birthYear: number,
  dayStem: string,
  yearPillar: SajuCorePillar,
  monthPillar: SajuCorePillar,
  dayPillar: SajuCorePillar,
  hourPillar: SajuCorePillar | null,
  daeun: LuckFlowDaeun,
  yongsin: { yongsin: string; heegsin: string; geesin: string },
  startYear = new Date().getFullYear(),
  yearCount = 10,
): LuckFlowAnalysis {
  const natalTargets: Array<{ name: LuckFlowInteraction['target']; pillar: LuckFlowPillar | null }> = [
    { name: '연주', pillar: yearPillar },
    { name: '월주', pillar: monthPillar },
    { name: '일주', pillar: dayPillar },
    { name: '시주', pillar: hourPillar },
  ];

  const periods = daeun.periods.map((period): DaeunPeriodAnalysis => {
    const transit = {
      ...period,
      stemIndex: HEAVENLY_STEMS.indexOf(period.stem),
      branchIndex: EARTHLY_BRANCHES.indexOf(period.branch),
    };
    const stemTenGod = getTenGod(dayStem, period.stem);
    const branchTenGod = getTenGod(dayStem, LUCK_BRANCH_MAIN_STEM[transit.branchIndex]);
    const interactions = collectLuckInteractions(transit, natalTargets);
    const score = clampLuckScore(
      50 +
      getLuckElementScore(period.stemElement, yongsin) +
      getLuckElementScore(period.branchElement, yongsin) +
      interactions.reduce((sum, item) => sum + item.score, 0),
    );
    const level = getLuckLevel(score);
    const themes = [...new Set([LUCK_TEN_GOD_THEME[stemTenGod], LUCK_TEN_GOD_THEME[branchTenGod]])];
    return {
      ...period,
      score,
      level,
      stemTenGod,
      branchTenGod,
      themes,
      interactions,
      summary: `${period.startAge}~${period.endAge}세 ${period.stem}${period.branch} 대운은 천간 ${stemTenGod}, 지지 본기 ${branchTenGod}의 주제가 중심입니다. ${getElementFitText(period.stemElement, period.branchElement, yongsin)} ${summarizeLuckInteractions(interactions)}`,
      advice: `${LUCK_TEN_GOD_ADVICE[stemTenGod]} ${interactions.find((item) => !item.positive)?.targetDomain ? `${interactions.find((item) => !item.positive)!.targetDomain} 영역은 변화를 한 번에 키우지 마세요.` : '10년 목표를 해마다 확인하며 속도를 조절하세요.'}`,
    };
  });

  const annual = Array.from({ length: Math.max(1, Math.min(yearCount, 20)) }, (_, offset): AnnualLuckFlow => {
    const year = startYear + offset;
    const age = year - birthYear;
    const yearTransit = getYearPillar(year);
    const period = periods.find((item) => age >= item.startAge && age <= item.endAge) ?? null;
    const stemTenGod = getTenGod(dayStem, yearTransit.stem);
    const branchTenGod = getTenGod(dayStem, LUCK_BRANCH_MAIN_STEM[yearTransit.branchIndex]);
    const natalInteractions = collectLuckInteractions(yearTransit, natalTargets);
    const daeunInteractions = period
      ? collectLuckInteractions(yearTransit, [{
          name: '대운',
          pillar: {
            stem: period.stem,
            branch: period.branch,
            stemIndex: HEAVENLY_STEMS.indexOf(period.stem),
            branchIndex: EARTHLY_BRANCHES.indexOf(period.branch),
            stemElement: STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(period.stem)],
            branchElement: BRANCH_ELEMENTS[EARTHLY_BRANCHES.indexOf(period.branch)],
          },
        }])
      : [];
    const interactions = [...natalInteractions, ...daeunInteractions];
    const periodCarry = period ? (period.score - 50) * 0.35 : 0;
    const score = clampLuckScore(
      50 +
      getLuckElementScore(yearTransit.stemElement, yongsin) +
      getLuckElementScore(yearTransit.branchElement, yongsin) +
      periodCarry +
      interactions.reduce((sum, item) => sum + item.score, 0),
    );
    const level = getLuckLevel(score);
    const themes = [...new Set([LUCK_TEN_GOD_THEME[stemTenGod], LUCK_TEN_GOD_THEME[branchTenGod]])];
    const periodText = period
      ? `${period.stem}${period.branch} 대운의 ${period.level} 흐름 안에서 작동합니다.`
      : '첫 대운 전후의 전환 구간이라 원국의 기본 기운을 우선 봅니다.';

    return {
      year,
      age,
      stem: yearTransit.stem,
      branch: yearTransit.branch,
      stemElement: yearTransit.stemElement,
      branchElement: yearTransit.branchElement,
      daeunIndex: period?.idx ?? null,
      daeunLabel: period ? `${period.stem}${period.branch}` : null,
      score,
      level,
      headline: getLuckHeadline(level, themes[0], year),
      stemTenGod,
      branchTenGod,
      themes,
      interactions,
      summary: `${year}년 ${yearTransit.stem}${yearTransit.branch} 세운은 천간 ${stemTenGod}, 지지 본기 ${branchTenGod}의 해입니다. ${periodText} ${getElementFitText(yearTransit.stemElement, yearTransit.branchElement, yongsin)} ${summarizeLuckInteractions(interactions)}`,
      advice: `${LUCK_TEN_GOD_ADVICE[stemTenGod]} ${interactions.find((item) => !item.positive)?.targetDomain ? `특히 ${interactions.find((item) => !item.positive)!.targetDomain} 영역은 일정과 선택지를 여유 있게 두세요.` : '좋은 흐름도 한 번에 확대하지 말고 분기마다 결과를 확인하세요.'}`,
    };
  });

  const currentAge = startYear - birthYear;
  const currentDaeunIndex = periods.find((item) => currentAge >= item.startAge && currentAge <= item.endAge)?.idx ?? null;
  return {
    startYear,
    endYear: startYear + annual.length - 1,
    currentDaeunIndex,
    periods,
    annual,
    methodNote: '용신·희신·기신, 대운, 세운 십신과 원국·대운의 천간합충 및 지지 육합·충·형·자형·파·해를 함께 반영한 참고 흐름입니다.',
  };
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

// ──────────── 조후 (調候) ────────────
export function getJohuAnalysis(
  monthPillar: ReturnType<typeof getMonthPillar>,
  dayPillar: ReturnType<typeof getDayPillar>,
  elementCount: { wood: number; fire: number; earth: number; metal: number; water: number },
) {
  const monthBranch = monthPillar.branchIndex;
  const hotScore =
    elementCount.fire * 2 +
    elementCount.wood +
    ([5, 6, 7].includes(monthBranch) ? 3 : [2, 3, 4].includes(monthBranch) ? 1 : 0);
  const coldScore =
    elementCount.water * 2 +
    elementCount.metal +
    ([11, 0, 1].includes(monthBranch) ? 3 : [8, 9, 10].includes(monthBranch) ? 1 : 0);
  const dryScore =
    elementCount.fire +
    elementCount.earth * 1.5 +
    ([5, 6, 7, 10].includes(monthBranch) ? 2 : 0);
  const dampScore =
    elementCount.water +
    elementCount.earth * 0.5 +
    ([11, 0, 1, 4].includes(monthBranch) ? 2 : 0);

  const temperature = hotScore - coldScore >= 3 ? '조열'
    : coldScore - hotScore >= 3 ? '한습'
    : hotScore > coldScore ? '온조'
    : coldScore > hotScore ? '냉습'
    : '중화';
  const moisture = dryScore - dampScore >= 2.5 ? '건조'
    : dampScore - dryScore >= 2.5 ? '습함'
    : '보통';

  const needElements = new Set<string>();
  if (temperature === '조열' || temperature === '온조' || moisture === '건조') needElements.add('수');
  if (temperature === '한습' || temperature === '냉습' || moisture === '습함') needElements.add('화');
  if (elementCount.wood === 0) needElements.add('목');
  if (elementCount.metal === 0) needElements.add('금');
  if (elementCount.earth === 0) needElements.add('토');

  const seasonText = [2, 3, 4].includes(monthBranch) ? '봄생이라 목(木)의 성장성이 바탕입니다.'
    : [5, 6, 7].includes(monthBranch) ? '여름생이라 화(火)의 열기가 바탕입니다.'
    : [8, 9, 10].includes(monthBranch) ? '가을생이라 금(金)의 수렴성이 바탕입니다.'
    : '겨울생이라 수(水)의 차고 깊은 기운이 바탕입니다.';

  const status = temperature === '중화' && moisture === '보통' ? '균형'
    : needElements.size >= 2 ? '보완 필요'
    : '주의';
  const summary = `${seasonText} 현재 조후는 ${temperature}${moisture !== '보통' ? `·${moisture}` : ''} 쪽으로 기울어 있습니다.`;
  const advice = needElements.has('수') && needElements.has('화')
    ? '수와 화를 동시에 쓰기보다 생활에서는 수면·수분으로 과열을 내리고, 중요한 실행은 햇빛·운동으로 화기를 살리는 식의 시간 분리가 좋습니다.'
    : needElements.has('수')
      ? '수(水) 보완이 우선입니다. 충분한 수면, 물 가까운 환경, 차분한 공부·기획 시간이 과열을 식힙니다.'
      : needElements.has('화')
        ? '화(火) 보완이 우선입니다. 햇빛, 운동, 발표, 따뜻한 음식처럼 몸을 데우고 밖으로 표현하는 습관이 좋습니다.'
        : '큰 한난조습 치우침은 약합니다. 계절 리듬을 지키고 오행 부족분만 생활에서 가볍게 보완하면 됩니다.';

  return {
    status,
    temperature,
    moisture,
    hotScore: Math.round(hotScore * 10) / 10,
    coldScore: Math.round(coldScore * 10) / 10,
    dryScore: Math.round(dryScore * 10) / 10,
    dampScore: Math.round(dampScore * 10) / 10,
    needElements: Array.from(needElements),
    monthBranch: monthPillar.branch,
    dayMaster: `${dayPillar.stem}${dayPillar.branch}`,
    summary,
    advice,
    cautions: [
      temperature === '조열' ? '성급함·과열·염증성 피로를 조심하세요.' : '',
      temperature === '한습' ? '무기력·냉증·결정 지연을 조심하세요.' : '',
      moisture === '건조' ? '관계와 감정 표현이 메마르지 않게 수분과 휴식을 챙기세요.' : '',
      moisture === '습함' ? '생각이 무겁게 고이지 않도록 움직임과 햇빛을 늘리세요.' : '',
    ].filter(Boolean),
  };
}

// ──────────── 십성 과다/부족 분석 ────────────
export function getTenGodDistribution(
  dayStem: string,
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getYearPillar>,
  dayPillar: ReturnType<typeof getYearPillar>,
  hourPillar: ReturnType<typeof getYearPillar> | null,
) {
  const { counts, groups, sources } = collectTenGodCounts(dayStem, [yearPillar, monthPillar, dayPillar, hourPillar]);
  const groupEntries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const dominant = groupEntries[0]?.[0] ?? '비겁';
  const lacking = [...groupEntries].reverse().filter(([, value]) => value <= 0.5).map(([name]) => name);
  const weak = lacking.length > 0 ? lacking : [...groupEntries].reverse().slice(0, 1).map(([name]) => name);

  const details = Object.entries(TEN_GOD_GROUP_INFO).map(([key, info]) => {
    const score = groups[key] ?? 0;
    const level = score >= 3 ? '과다'
      : score >= 1.5 ? '충분'
      : score >= 0.5 ? '약함'
      : '부족';
    const interpretation = level === '과다' ? info.excess
      : level === '부족' || level === '약함' ? info.lack
      : `${info.domain} 영역이 적당히 살아 있어 과하지도 비지도 않은 편입니다.`;
    return {
      key,
      label: info.label,
      domain: info.domain,
      score,
      level,
      interpretation,
      advice: info.advice,
      gods: TEN_GOD_GROUPS[key].map((god) => ({ name: god, count: counts[god], info: TEN_GOD_INFO[god] })),
    };
  });

  const dominantInfo = TEN_GOD_GROUP_INFO[dominant];
  const weakLabels = weak.map((key) => TEN_GOD_GROUP_INFO[key]?.label ?? key).join('·');

  return {
    counts,
    groups,
    dominant,
    dominantLabel: dominantInfo?.label ?? dominant,
    lacking: weak,
    summary: `${dominantInfo?.label ?? dominant} 기운이 가장 강하고, ${weakLabels} 쪽은 보완이 필요합니다.`,
    advice: `${dominantInfo?.advice ?? '강한 십성의 장점을 살리세요'} 부족한 십성은 직업·관계·생활 습관으로 보완하는 것이 좋습니다.`,
    details,
    sources,
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
    content: getHealthText(
      dayPillar.stem,
      dayPillar.branch,
      dayPillar.stemElement,
      dayPillar.branchElement,
    ),
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
  p1: { year: number; month: number; day: number; hour: number; gender: 'male' | 'female'; yearPillarYear?: number },
  p2: { year: number; month: number; day: number; hour: number; gender: 'male' | 'female'; yearPillarYear?: number }
) {
  const d1 = getDayPillar(p1.year, p1.month, p1.day);
  const d2 = getDayPillar(p2.year, p2.month, p2.day);
  const y1 = getYearPillar(p1.yearPillarYear ?? p1.year);
  const y2 = getYearPillar(p2.yearPillarYear ?? p2.year);

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
    score >= 88 ? '상호 보완 강함' :
    score >= 75 ? '궁합 양호' :
    score >= 60 ? '보통 궁합' :
    score >= 45 ? '노력이 필요한 궁합' : '어려운 궁합';

  const advice =
    score >= 88 ? '상호 보완성이 강한 관계입니다. 다만 장점이 큰 만큼 기대치도 커질 수 있어 균형이 필요합니다.' :
    score >= 75 ? '궁합 흐름은 양호합니다. 서로 존중하면 안정적인 관계를 만들 수 있습니다.' :
    score >= 60 ? '보통 궁합입니다. 차이를 인정하고 소통하면 충분히 안정될 수 있습니다.' :
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
    grade: softenInterpretationText(grade),
    advice: softenInterpretationText(advice),
    details: details.map(detail => ({ ...detail, content: softenInterpretationText(detail.content) })),
    summary: softenInterpretationText(dyn.summary),
    strengthsTogether: dyn.strengthsTogether.map(softenInterpretationText),
    challengesTogether: dyn.challengesTogether,
    tips: dyn.tips.map(softenInterpretationText),
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
  // 원국은 자기 용신 기준으로 채점되므로 기신(이미 가진 과다 오행)이 과하게 낮으면
  // 자기 일주 점수까지 바닥친다. 바닥을 올리되(기신 4, 중립 6) 최고점(용신 10)은 유지.
  if (elem === yongsin)  return 10;
  if (elem === heegsin)  return 8;
  if (elem === geesin)   return 4;
  return 6;
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

export const JIJANGGAN: Record<string, {stem:string; element:string}[]> = {
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

const TEN_GOD_GROUPS: Record<string, TenGodName[]> = {
  비겁: ['비견', '겁재'],
  식상: ['식신', '상관'],
  재성: ['정재', '편재'],
  관성: ['정관', '편관'],
  인성: ['정인', '편인'],
};

const TEN_GOD_GROUP_INFO: Record<string, { label: string; domain: string; excess: string; lack: string; advice: string }> = {
  비겁: {
    label: '비겁(比劫)',
    domain: '자아·독립·동료·경쟁',
    excess: '자기주장과 경쟁심이 강해 재물 분산, 동업 갈등, 고집으로 나타나기 쉽습니다.',
    lack: '자기 힘으로 버티는 기운이 약해 결단이 늦고 주변 분위기에 휘둘리기 쉽습니다.',
    advice: '역할·지분·돈 문제를 문서로 분명히 하고, 혼자 감당할 일과 함께할 일을 나누세요.',
  },
  식상: {
    label: '식상(食傷)',
    domain: '표현·재능·말·생산성',
    excess: '말과 표현이 앞서 관성과 충돌하기 쉽고, 규칙보다 자유를 택하려는 힘이 강합니다.',
    lack: '생각은 있어도 표현·홍보·실행으로 꺼내는 힘이 부족해 성과가 묻히기 쉽습니다.',
    advice: '글쓰기, 발표, 콘텐츠, 결과물 정리를 습관화하면 운이 밖으로 드러납니다.',
  },
  재성: {
    label: '재성(財星)',
    domain: '돈·현실감·거래·배우자 인연',
    excess: '돈과 성과 압박이 커져 무리한 투자, 소비, 관계 계산으로 흐르기 쉽습니다.',
    lack: '현실 감각과 현금흐름 관리가 약해 좋은 아이디어가 돈으로 연결되기 어렵습니다.',
    advice: '수입·지출·계약 조건을 숫자로 관리하고, 큰돈은 검토 시간을 둔 뒤 움직이세요.',
  },
  관성: {
    label: '관성(官星)',
    domain: '직장·규칙·명예·책임',
    excess: '책임과 압박이 과해 불안, 눈치, 권위와의 마찰 또는 건강 스트레스로 나타납니다.',
    lack: '규칙·직함·책임 구조가 약해 자유롭지만 지속성과 사회적 인정이 흔들릴 수 있습니다.',
    advice: '규칙을 적으로 보지 말고, 자격·직함·절차를 내 보호막으로 쓰세요.',
  },
  인성: {
    label: '인성(印星)',
    domain: '공부·문서·보호·귀인',
    excess: '생각과 준비가 많아 실행이 늦어지고, 의존성이나 명분 싸움으로 흐르기 쉽습니다.',
    lack: '보호막과 문서운이 약해 계약·학습·자격에서 기본기를 더 챙겨야 합니다.',
    advice: '배운 것을 현실 결과물로 바꾸고, 중요한 결정은 자료와 문서 근거를 남기세요.',
  },
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
  status: '성격' | '보통' | '혼잡' | '파격';
  statusLabel: string;
  statusDescription: string;
  successFactors: string[];
  riskFactors: string[];
}

function collectTenGodCounts(
  dayStem: string,
  pillars: Array<ReturnType<typeof getYearPillar> | null>,
) {
  const counts = Object.fromEntries(
    (Object.keys(TEN_GOD_INFO) as TenGodName[]).map((name) => [name, 0]),
  ) as Record<TenGodName, number>;
  const sources: Array<{ pillar: string; layer: string; stem: string; god: TenGodName }> = [];
  const labels = ['년주', '월주', '일주', '시주'];

  pillars.forEach((pillar, index) => {
    if (!pillar) return;
    const stemGod = getTenGod(dayStem, pillar.stem);
    counts[stemGod] += 1;
    sources.push({ pillar: labels[index] ?? `${index + 1}주`, layer: '천간', stem: pillar.stem, god: stemGod });

    for (const hidden of JIJANGGAN[pillar.branch] ?? []) {
      const hiddenGod = getTenGod(dayStem, hidden.stem);
      counts[hiddenGod] += 0.5;
      sources.push({ pillar: labels[index] ?? `${index + 1}주`, layer: '지장간', stem: hidden.stem, god: hiddenGod });
    }
  });

  const groups = Object.fromEntries(
    Object.entries(TEN_GOD_GROUPS).map(([group, gods]) => [
      group,
      gods.reduce((sum, god) => sum + counts[god], 0),
    ]),
  ) as Record<string, number>;

  return { counts, groups, sources };
}

export function getGeokguk(
  dayStem: string,
  monthPillar: { branch: string },
  elementBalance: { wood: number; fire: number; earth: number; metal: number; water: number },
  allPillars?: Array<ReturnType<typeof getYearPillar> | null>,
): GeokgukResult {
  const jeonggi = MONTH_JEONGGI[monthPillar.branch];
  if (!jeonggi) return {
    name: '미정', tenGod: '비견', power: '중', status: '보통',
    statusLabel: '판단 보류',
    statusDescription: '월지 정기를 확인하기 어려워 격국 성패를 판단하지 않았습니다.',
    successFactors: [],
    riskFactors: ['월지 정기 확인 필요'],
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

  const tenGodCounts = allPillars ? collectTenGodCounts(dayStem, allPillars) : null;
  const group = (name: string) => tenGodCounts?.groups[name] ?? 0;
  const successFactors: string[] = [];
  const riskFactors: string[] = [];

  const addSupport = (label: string, value: number, reason: string) => {
    if (value >= 1.5) successFactors.push(reason);
  };
  const addRisk = (label: string, value: number, reason: string) => {
    if (value >= 2) riskFactors.push(reason);
  };

  if (tg === '정관' || tg === '편관') {
    addSupport('인성', group('인성'), '인성이 관성을 받아 주어 책임·직위·자격으로 성패가 살아납니다.');
    addSupport('재성', group('재성'), '재성이 관성을 생해 현실 성과와 사회적 역할이 연결됩니다.');
    addRisk('식상', group('식상'), '식상이 강하면 관성을 치는 구조라 말·자유성·규정 충돌이 격을 흔듭니다.');
  } else if (tg === '정재' || tg === '편재') {
    addSupport('식상', group('식상'), '식상이 재성을 생해 재능과 생산성이 돈으로 이어집니다.');
    addSupport('관성', group('관성'), '관성이 있으면 재물이 책임·직위·신뢰로 정리됩니다.');
    addRisk('비겁', group('비겁'), '비겁이 강하면 재물을 나누거나 빼앗기는 흐름이 생깁니다.');
  } else if (tg === '정인' || tg === '편인') {
    addSupport('관성', group('관성'), '관성이 인성을 생해 자격·문서·명예가 안정됩니다.');
    addSupport('비겁', group('비겁'), '비겁이 있으면 배운 것을 자기 힘으로 밀고 갈 수 있습니다.');
    addRisk('재성', group('재성'), '재성이 강하면 인성을 깨뜨려 공부·보호·문서운이 흔들립니다.');
  } else if (tg === '식신' || tg === '상관') {
    addSupport('재성', group('재성'), '재성이 있으면 표현과 재능이 실제 돈·성과로 연결됩니다.');
    addSupport('비겁', group('비겁'), '비겁이 있으면 생산할 체력과 자기 추진력이 받쳐 줍니다.');
    addRisk('인성', group('인성'), '인성이 강하면 생각과 보호가 식상을 눌러 실행이 늦어집니다.');
  } else {
    addSupport('식상', group('식상'), '식상이 있으면 강한 자아를 결과물과 표현으로 배출할 수 있습니다.');
    addSupport('관성', group('관성'), '관성이 있으면 경쟁심이 규율과 책임으로 정리됩니다.');
    addRisk('재성', group('재성'), '재성이 강한 비겁격에서는 돈과 경쟁이 함께 커져 들어와도 흩어지기 쉽습니다.');
  }

  if (power === '강') successFactors.push('일간이 강해 격국의 역할을 감당할 체력이 있습니다.');
  if (power === '약') riskFactors.push('일간이 약해 격국의 요구를 감당하려면 인성·비겁 보완이 필요합니다.');
  if (successFactors.length === 0) successFactors.push('월령이 분명해 삶의 주제가 한 방향으로 잡힙니다.');

  const status: GeokgukResult['status'] =
    riskFactors.length >= 2 && successFactors.length <= 1 ? '파격'
    : riskFactors.length >= 2 ? '혼잡'
    : successFactors.length >= 2 ? '성격'
    : '보통';
  const statusLabel = {
    성격: '성격(成格) — 격이 살아남',
    보통: '보통 — 격은 있으나 보완 필요',
    혼잡: '혼잡 — 장점과 방해가 함께 큼',
    파격: '파격(破格) — 격이 흔들림',
  }[status];
  const statusDescription = {
    성격: '월령의 격이 다른 요소의 도움을 받아 사회적 역할로 잘 드러나는 편입니다.',
    보통: '격의 방향은 보이지만 보조 오행과 생활 선택에 따라 체감 차이가 큽니다.',
    혼잡: '성공 요소와 방해 요소가 함께 있어 환경 선택, 직업 구조, 관계 관리가 중요합니다.',
    파격: '격을 흔드는 요소가 강하므로 무리한 정면 승부보다 보완 오행과 안정 장치를 먼저 세워야 합니다.',
  }[status];

  return {
    name: nameMap[tg] ?? `${tg}격`,
    tenGod: tg,
    power,
    status,
    statusLabel,
    statusDescription,
    successFactors,
    riskFactors,
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
  category?: string;
  basis?: string;
  description: string;
  advice?: string;
}

type SinsalTarget =
  | { kind: 'branch'; index: number }
  | { kind: 'stem'; index: number };

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
// 12신살: 申子辰/寅午戌/巳酉丑/亥卯未 기준
const GEOPSAL_RESULT = [5, 11, 2, 8];
const JAESAL_RESULT = [6, 0, 3, 9]; // 수옥살
const CHEONSAL_RESULT = [7, 1, 4, 10];
const JISAL_RESULT = [8, 2, 5, 11];
const WOLSAL_RESULT = [10, 4, 7, 1];
const MANGSIN_RESULT = [11, 5, 8, 2];
const JANGSEONG_RESULT = [0, 6, 9, 3];
const BANAN_RESULT = [1, 7, 10, 4];
const YUKHAE_RESULT = [3, 9, 0, 6];

// 천을귀인: 일간 → [지지 인덱스 배열]
const CHEONEUL: Record<string, number[]> = {
  '갑': [1, 7], '무': [1, 7], '경': [1, 7], // 丑·未
  '을': [0, 8], '기': [0, 8],               // 子·申
  '병': [11, 9], '정': [11, 9],              // 亥·酉
  '신': [6, 2],                              // 午·寅
  '임': [5, 3], '계': [5, 3],                // 巳·卯
};
// 문창귀인: 일간 → 지지 인덱스
const MUNCHANG: Record<string, number> = {
  '갑':5, '을':6, '병':8, '정':9, '무':8, '기':9, '경':11, '신':0, '임':2, '계':3
};
// 양인살: 양간(陽干)만 해당 → 지지 인덱스
const YANGIN: Record<string, number> = {
  '갑':3, '병':6, '무':6, '경':9, '임':0
};
// 홍염살: 일간 기준
const HONGYEOM: Record<string, number> = {
  '갑':6, '을':6, '병':2, '정':7, '무':4, '기':4, '경':10, '신':9, '임':0, '계':8
};
const HAKDANG: Record<string, number> = {
  '갑':11, '을':6, '병':2, '정':9, '무':2, '기':9, '경':5, '신':0, '임':8, '계':3
};
const MUNGOK: Record<string, number> = {
  '갑':11, '을':0, '병':2, '정':3, '무':2, '기':3, '경':5, '신':6, '임':8, '계':9
};
const GEUMYEO: Record<string, number> = {
  '갑':4, '을':5, '병':7, '정':8, '무':7, '기':8, '경':10, '신':11, '임':1, '계':2
};
const AMROK: Record<string, number> = {
  '갑':11, '을':10, '병':8, '정':7, '무':8, '기':7, '경':5, '신':4, '임':2, '계':1
};
// 천덕귀인: 월지 기준. 일부는 천간, 일부는 지지로 찾는다.
const CHEONDEOK: Record<number, SinsalTarget> = {
  2: { kind: 'stem', index: 3 },   // 寅月 丁
  3: { kind: 'branch', index: 8 }, // 卯月 申
  4: { kind: 'stem', index: 8 },   // 辰月 壬
  5: { kind: 'stem', index: 7 },   // 巳月 辛
  6: { kind: 'branch', index: 11 },// 午月 亥
  7: { kind: 'stem', index: 0 },   // 未月 甲
  8: { kind: 'stem', index: 9 },   // 申月 癸
  9: { kind: 'branch', index: 2 }, // 酉月 寅
  10:{ kind: 'stem', index: 2 },   // 戌月 丙
  11:{ kind: 'stem', index: 1 },   // 亥月 乙
  0: { kind: 'branch', index: 5 }, // 子月 巳
  1: { kind: 'stem', index: 6 },   // 丑月 庚
};
// 월덕귀인: 월지 삼합 기준 → 천간
const WOLDEOK_STEM_BY_GROUP = [8, 2, 6, 0]; // 壬/丙/庚/甲
const BAEKHO_GANZI = [
  [0, 4], [1, 7], [2, 10], [3, 1], [4, 4], [8, 10], [9, 1],
] as const;
const GOEGANG_GANZI = [
  [6, 4], [6, 10], [8, 4], [4, 10],
] as const;
const GWIMUN_PAIRS = [
  [0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10],
] as const;
const WONJIN_PAIRS = [
  [0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10],
] as const;
const CHEONRA_JIMANG_PAIRS = [
  [10, 11], [4, 5],
] as const;
const HYEONCHIM_STEMS = [0, 7]; // 甲·辛
const HYEONCHIM_BRANCHES = [3, 6, 8]; // 卯·午·申
const GOSIN_GWASUK_BY_GROUP = [
  { gosin: 2, gwasuk: 10 }, // 亥子丑
  { gosin: 5, gwasuk: 1 },  // 寅卯辰
  { gosin: 8, gwasuk: 4 },  // 巳午未
  { gosin: 11, gwasuk: 7 }, // 申酉戌
] as const;

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
  dayStem: string,
  gender?: 'male' | 'female',
): ShinsalItem[] {
  const pillarNames = ['연지', '월지', '일지', '시지'];
  const stemPillarNames = ['연간', '월간', '일간', '시간'];
  const ganziPillarNames = ['년주', '월주', '일주', '시주'];
  const allPillarsFull = [yearPillar, monthPillar, dayPillar, hourPillar];

  const branchLabel = (idx: number) => `${EARTHLY_BRANCHES[idx]}(${EARTHLY_BRANCHES_HANJA[idx]})`;
  const stemLabel = (idx: number) => `${HEAVENLY_STEMS[idx]}(${HEAVENLY_STEMS_HANJA[idx]})`;
  const formatBranches = (indexes: number[]) => indexes.map(branchLabel).join('·');
  const unique = <T,>(values: T[]) => Array.from(new Set(values));

  function findBranchTargets(targets: number[]): string[] {
    const targetSet = new Set(targets);
    const found: string[] = [];
    allPillarsFull.forEach((p, i) => {
      if (p && targetSet.has(p.branchIndex)) found.push(pillarNames[i]);
    });
    return found;
  }

  function findBranchTargetsAt(targets: number[], pillarIndexes: number[]): string[] {
    const targetSet = new Set(targets);
    const found: string[] = [];
    pillarIndexes.forEach((i) => {
      const p = allPillarsFull[i];
      if (p && targetSet.has(p.branchIndex)) found.push(pillarNames[i]);
    });
    return found;
  }

  function findStemTargets(targets: number[]): string[] {
    const targetSet = new Set(targets);
    const found: string[] = [];
    allPillarsFull.forEach((p, i) => {
      if (p && targetSet.has(p.stemIndex)) found.push(stemPillarNames[i]);
    });
    return found;
  }

  function findTarget(target: SinsalTarget): string[] {
    return target.kind === 'branch'
      ? findBranchTargets([target.index])
      : findStemTargets([target.index]);
  }

  function targetLabel(target: SinsalTarget): string {
    return target.kind === 'branch' ? branchLabel(target.index) : stemLabel(target.index);
  }

  function findGanziTargets(targets: ReadonlyArray<readonly [number, number]>): string[] {
    const found: string[] = [];
    allPillarsFull.forEach((p, i) => {
      if (!p) return;
      if (targets.some(([stemIdx, branchIdx]) => p.stemIndex === stemIdx && p.branchIndex === branchIdx)) {
        found.push(ganziPillarNames[i]);
      }
    });
    return found;
  }

  function formatGanziTargets(targets: ReadonlyArray<readonly [number, number]>): string {
    return targets
      .map(([stemIdx, branchIdx]) => `${HEAVENLY_STEMS_HANJA[stemIdx]}${EARTHLY_BRANCHES_HANJA[branchIdx]}`)
      .join('·');
  }

  function findBranchPairs(pairs: ReadonlyArray<readonly [number, number]>): string[] {
    const found: string[] = [];
    for (let i = 0; i < allPillarsFull.length; i += 1) {
      const left = allPillarsFull[i];
      if (!left) continue;
      for (let j = i + 1; j < allPillarsFull.length; j += 1) {
        const right = allPillarsFull[j];
        if (!right) continue;
        const matched = pairs.some(([a, b]) =>
          (left.branchIndex === a && right.branchIndex === b) ||
          (left.branchIndex === b && right.branchIndex === a),
        );
        if (matched) found.push(`${pillarNames[i]}·${pillarNames[j]}`);
      }
    }
    return found;
  }

  function item(params: {
    name: string;
    hanja: string;
    icon: string;
    category: string;
    foundIn: string[];
    basis: string;
    foundText: string;
    absentText: string;
    foundAdvice: string;
    absentAdvice: string;
  }): ShinsalItem {
    const foundIn = unique(params.foundIn);
    const found = foundIn.length > 0;
    const location = found ? `${foundIn.join('·')}에서 확인됩니다` : '원국에 직접 드러나지 않습니다';
    return {
      name: params.name,
      hanja: params.hanja,
      icon: params.icon,
      category: params.category,
      found,
      foundIn,
      basis: params.basis,
      description: `${params.name}(${params.hanja})은 ${location}. ${found ? params.foundText : params.absentText}`,
      advice: found ? params.foundAdvice : params.absentAdvice,
    };
  }

  function samhapTargets(results: number[]): number[] {
    const targets: number[] = [];
    const baseIdxYear = getSamhapGroup(yearPillar.branchIndex);
    const baseIdxDay  = getSamhapGroup(dayPillar.branchIndex);
    if (baseIdxYear >= 0) targets.push(results[baseIdxYear]);
    if (baseIdxDay >= 0) targets.push(results[baseIdxDay]);
    return unique(targets);
  }

  function branchSinsal(params: {
    name: string;
    hanja: string;
    icon: string;
    category: string;
    results: number[];
    foundText: string;
    absentText: string;
    foundAdvice: string;
    absentAdvice: string;
  }): ShinsalItem {
    const targets = samhapTargets(params.results);
    const foundIn = findBranchTargets(targets);
    return item({
      ...params,
      foundIn,
      basis: `연지 ${branchLabel(yearPillar.branchIndex)}·일지 ${branchLabel(dayPillar.branchIndex)} 삼합 기준 → ${formatBranches(targets)}`,
    });
  }

  // 일주 간지 인덱스
  const dayGanziIdx = getGanziIdx(dayPillar.stemIndex, dayPillar.branchIndex);

  // 공망 (일주 기준)
  const gongmangBranches = getGongmangBranches(dayGanziIdx);
  const gongmangFound: string[] = [];
  allPillarsFull.forEach((p, i) => {
    if (p && gongmangBranches.includes(p.branchIndex)) gongmangFound.push(pillarNames[i]);
  });

  // 천을귀인 (일간 기준)
  const cheoneulTargets = CHEONEUL[dayStem] ?? [];
  const cheoneulFound = findBranchTargets(cheoneulTargets);

  // 문창귀인 (일간 기준)
  const munchangTarget = MUNCHANG[dayStem];
  const munchangFound = munchangTarget !== undefined ? findBranchTargets([munchangTarget]) : [];
  const hakdangTarget = HAKDANG[dayStem];
  const hakdangFound = hakdangTarget !== undefined ? findBranchTargets([hakdangTarget]) : [];
  const mungokTarget = MUNGOK[dayStem];
  const mungokFound = mungokTarget !== undefined ? findBranchTargets([mungokTarget]) : [];
  const geumyeoTarget = GEUMYEO[dayStem];
  const geumyeoFound = geumyeoTarget !== undefined ? findBranchTargets([geumyeoTarget]) : [];
  const amrokTarget = AMROK[dayStem];
  const amrokFound = amrokTarget !== undefined ? findBranchTargets([amrokTarget]) : [];

  // 양인살 (일간 기준, 양간만)
  const yanginTarget = YANGIN[dayStem];
  const yanginFound = yanginTarget !== undefined ? findBranchTargets([yanginTarget]) : [];

  const hongyeomTarget = HONGYEOM[dayStem];
  const hongyeomFound = hongyeomTarget !== undefined ? findBranchTargets([hongyeomTarget]) : [];
  const cheonuiTarget = (monthPillar.branchIndex + 11) % 12;
  const cheonuiFound = findBranchTargetsAt([cheonuiTarget], [2, 3]);
  const cheondeokTarget = CHEONDEOK[monthPillar.branchIndex];
  const cheondeokFound = cheondeokTarget ? findTarget(cheondeokTarget) : [];
  const woldeokStem = WOLDEOK_STEM_BY_GROUP[getSamhapGroup(monthPillar.branchIndex)];
  const woldeokFound = woldeokStem !== undefined ? findStemTargets([woldeokStem]) : [];
  const baekhoFound = findGanziTargets(BAEKHO_GANZI);
  const goegangFound = findGanziTargets(GOEGANG_GANZI);
  const gwimunFound = findBranchPairs(GWIMUN_PAIRS);
  const wonjinFound = findBranchPairs(WONJIN_PAIRS);
  const cheonraJimangFound = findBranchPairs(CHEONRA_JIMANG_PAIRS);
  const hyeonchimFound = unique([
    ...findStemTargets(HYEONCHIM_STEMS),
    ...findBranchTargets(HYEONCHIM_BRANCHES),
  ]);

  const geupgakTargets = [2, 3, 4].includes(monthPillar.branchIndex) ? [11, 0]
    : [5, 6, 7].includes(monthPillar.branchIndex) ? [3, 7]
    : [8, 9, 10].includes(monthPillar.branchIndex) ? [2, 10]
    : [1, 4];
  const geupgakFound = findBranchTargetsAt(geupgakTargets, [2, 3]);

  const yearSeasonGroup =
    [11, 0, 1].includes(yearPillar.branchIndex) ? 0 :
    [2, 3, 4].includes(yearPillar.branchIndex) ? 1 :
    [5, 6, 7].includes(yearPillar.branchIndex) ? 2 : 3;
  const lonelyTargets = GOSIN_GWASUK_BY_GROUP[yearSeasonGroup];
  const gosinFound = findBranchTargets([lonelyTargets.gosin]);
  const gwasukFound = findBranchTargets([lonelyTargets.gwasuk]);
  const lonelyFound = unique([...gosinFound.map((p) => `고신 ${p}`), ...gwasukFound.map((p) => `과숙 ${p}`)]);
  const lonelyFocus = gender === 'female'
    ? '여성 사주에서는 과숙 쪽 외로움·배우자 거리감이 더 민감하게 해석됩니다.'
    : '남성 사주에서는 고신 쪽 독립성·가족 거리감이 더 민감하게 해석됩니다.';

  return [
    item({
      name: '천을귀인', hanja: '天乙貴人', icon: '⭐', category: '길신',
      foundIn: cheoneulFound,
      basis: `일간 ${dayStem} 기준 → ${formatBranches(cheoneulTargets)}`,
      foundText: '위기 때 조언자·후원자·제도적 도움을 만나기 쉬운 구조입니다. 특히 발견된 기둥이 맡는 관계 영역에서 보호성이 살아납니다.',
      absentText: '타고난 귀인성이 전면에 서기보다, 신뢰와 실력으로 귀인 인연을 직접 만들어가는 구조입니다.',
      foundAdvice: '부탁할 사람을 미리 쌓고, 도움받은 만큼 돌려주는 방식이 길합니다.',
      absentAdvice: '인맥보다 전문성·기록·약속 이행을 앞세우면 귀인운이 후천적으로 열립니다.',
    }),
    item({
      name: '문창귀인', hanja: '文昌貴人', icon: '📚', category: '길신',
      foundIn: munchangFound,
      basis: `일간 ${dayStem} 기준 → ${munchangTarget !== undefined ? branchLabel(munchangTarget) : '해당 없음'}`,
      foundText: '학습·문서·언어 감각이 사주 안에서 바로 작동합니다. 시험, 자격, 기획, 글쓰기처럼 정리해서 드러내는 일에 강점이 있습니다.',
      absentText: '문창이 직접 드러나지는 않지만 반복 학습과 기록 습관으로 문서운을 보완할 수 있습니다.',
      foundAdvice: '배운 내용을 말이나 글로 남기면 운이 더 선명해집니다.',
      absentAdvice: '중요한 시험·계약은 초안과 검토 시간을 따로 두는 편이 좋습니다.',
    }),
    item({
      name: '학당귀인', hanja: '學堂貴人', icon: '🎓', category: '길신',
      foundIn: hakdangFound,
      basis: `일간 ${dayStem} 기준 장생지 → ${hakdangTarget !== undefined ? branchLabel(hakdangTarget) : '해당 없음'}`,
      foundText: '배움의 공간과 인연이 깊습니다. 공부, 자격증, 교육, 강의, 멘토링처럼 지식을 쌓고 전하는 흐름이 좋습니다.',
      absentText: '학당귀인이 직접 드러나진 않습니다. 타고난 학문복보다 환경 설계와 반복 학습이 더 중요합니다.',
      foundAdvice: '자격 과정, 커리큘럼 있는 공부, 가르치는 역할을 잡으면 운이 살아납니다.',
      absentAdvice: '혼자 감으로 공부하기보다 교재·강의·일정표를 만들어 학습운을 보완하세요.',
    }),
    item({
      name: '문곡귀인', hanja: '文曲貴人', icon: '✍️', category: '길신',
      foundIn: mungokFound,
      basis: `일간 ${dayStem} 기준 → ${mungokTarget !== undefined ? branchLabel(mungokTarget) : '해당 없음'}`,
      foundText: '문장력, 기억력, 예능적 감각이 살아납니다. 글·기획·디자인·음악·말재주처럼 감각을 구조화하는 능력이 강합니다.',
      absentText: '문곡의 예술적 보조성은 약합니다. 표현 재능을 믿기보다 연습량과 피드백으로 끌어올리는 쪽이 맞습니다.',
      foundAdvice: '기록물, 포트폴리오, 발표 자료처럼 보이는 산출물을 꾸준히 쌓으세요.',
      absentAdvice: '좋은 표현을 모방하고 수정하는 루틴을 만들면 문곡 부족이 보완됩니다.',
    }),
    item({
      name: '금여록', hanja: '金輿祿', icon: '💎', category: '길신',
      foundIn: geumyeoFound,
      basis: `일간 ${dayStem} 기준 → ${geumyeoTarget !== undefined ? branchLabel(geumyeoTarget) : '해당 없음'}`,
      foundText: '품격, 재물 안정, 배우자복을 돕는 길신입니다. 좋은 물건·좋은 사람·안정적 생활 기반과 인연이 생기기 쉽습니다.',
      absentText: '금여의 품격·재물 보조가 직접 드러나진 않습니다. 생활 안정은 계획과 관리로 만드는 구조입니다.',
      foundAdvice: '품질 높은 일, 신뢰 있는 관계, 장기 자산 관리에 힘을 쓰면 금여가 길하게 작동합니다.',
      absentAdvice: '소비보다 자산화, 감정보다 기준 있는 배우자·동업자 선택이 중요합니다.',
    }),
    item({
      name: '암록', hanja: '暗祿', icon: '🪙', category: '길신',
      foundIn: amrokFound,
      basis: `일간 ${dayStem} 기준 건록 합지 → ${amrokTarget !== undefined ? branchLabel(amrokTarget) : '해당 없음'}`,
      foundText: '숨어 있는 녹봉의 기운입니다. 막힐 때 뜻밖의 수입, 도움, 소개, 숨은 기회가 들어오기 쉽습니다.',
      absentText: '숨은 재물·뜻밖의 후원은 강하지 않습니다. 예상 가능한 수입 구조를 탄탄히 만드는 편이 좋습니다.',
      foundAdvice: '작은 인연과 부업성 기회를 가볍게 넘기지 말고 기록해 두세요.',
      absentAdvice: '비상금, 보험, 고정 수입처럼 보이는 안전망을 먼저 세우세요.',
    }),
    item({
      name: '천의성', hanja: '天醫星', icon: '🩺', category: '길신',
      foundIn: cheonuiFound,
      basis: `월지 ${branchLabel(monthPillar.branchIndex)} 기준 바로 앞 지지 → ${branchLabel(cheonuiTarget)}를 일지·시지에서 확인`,
      foundText: '치유, 건강관리, 상담, 봉사와 인연이 있습니다. 사람을 살피고 회복시키는 역할에서 재능이 드러납니다.',
      absentText: '천의성의 의료·치유성이 직접 드러나진 않습니다. 건강운은 생활 습관과 조후 균형을 더 중점으로 봅니다.',
      foundAdvice: '의료·상담·돌봄·운동·영양처럼 회복을 돕는 분야를 잘 활용하세요.',
      absentAdvice: '정기검진과 생활 리듬 관리로 건강 변수를 선제적으로 줄이세요.',
    }),
    branchSinsal({
      name: '겁살', hanja: '劫殺', icon: '⚡', category: '흉살',
      results: GEOPSAL_RESULT,
      foundText: '외부 변수로 재물·관계·계획이 갑자기 흔들릴 수 있습니다. 대신 위기 대응력과 승부 근성도 강하게 붙습니다.',
      absentText: '강탈·급변성은 약한 편입니다. 무리한 승부보다 안정적 축적이 더 잘 맞습니다.',
      foundAdvice: '투기·보증·비공식 거래를 피하고, 보험·백업·증빙을 준비하세요.',
      absentAdvice: '큰 리스크를 떠안기보다 느리게 쌓는 전략이 손실을 줄입니다.',
    }),
    branchSinsal({
      name: '재살(수옥살)', hanja: '災殺·囚獄殺', icon: '⛓️', category: '흉살',
      results: JAESAL_RESULT,
      foundText: '자유가 묶이는 기운이라 관재·송사·규정 위반·계약 문제에 민감합니다. 권력·통제·법적 구조를 다루는 힘으로 쓰면 강점이 됩니다.',
      absentText: '수옥살의 직접 압박은 약합니다. 다만 계약과 법적 책임은 기본적으로 꼼꼼히 보는 편이 좋습니다.',
      foundAdvice: '계약서, 세금, 교통법규, 직장 규정을 보수적으로 지키세요.',
      absentAdvice: '중요 문서는 구두 약속보다 서면으로 남기면 불필요한 분쟁을 줄입니다.',
    }),
    branchSinsal({
      name: '천살', hanja: '天殺', icon: '🌩️', category: '흉살',
      results: CHEONSAL_RESULT,
      foundText: '내 뜻 밖의 일정 변경, 환경 변수, 윗선의 결정에 흔들리기 쉽습니다. 정신성·신앙·큰 그림을 보는 감각도 함께 강해집니다.',
      absentText: '예측 불가한 외부 충격성은 비교적 약합니다. 계획을 세워 움직일수록 안정됩니다.',
      foundAdvice: '통제 불가한 일에는 예비 일정과 대안을 두고, 자존심 싸움은 피하세요.',
      absentAdvice: '계획형 장점을 살려 장기 목표를 세밀하게 쪼개면 좋습니다.',
    }),
    branchSinsal({
      name: '지살', hanja: '地殺', icon: '🧳', category: '동살',
      results: JISAL_RESULT,
      foundText: '스스로 움직여 기회를 만드는 이동운입니다. 출장·이사·전직·영업·외부 활동에서 활로가 열립니다.',
      absentText: '능동적 이동성은 약한 편이라, 한 영역을 오래 파고드는 방식이 더 맞습니다.',
      foundAdvice: '움직임을 산만하게 쓰지 말고 목표 있는 이동으로 설계하세요.',
      absentAdvice: '무리한 변화보다 익숙한 기반 안에서 확장하는 전략이 좋습니다.',
    }),
    branchSinsal({
      name: '도화살', hanja: '桃花殺', icon: '🌸', category: '반길반흉',
      results: DOHWA_RESULT,
      foundText: '사람의 시선과 호감을 끌어당기는 기운입니다. 예술·홍보·서비스·대중 활동에는 강점이나 관계 구설도 같이 관리해야 합니다.',
      absentText: '노출형 매력보다 신뢰와 실력으로 호감을 쌓는 흐름입니다.',
      foundAdvice: '매력은 일과 창작에 쓰고, 사적인 관계에서는 선을 분명히 두세요.',
      absentAdvice: '표현력·스타일·대화 빈도를 의식적으로 키우면 부족한 도화가 보완됩니다.',
    }),
    branchSinsal({
      name: '월살', hanja: '月殺', icon: '🍂', category: '흉살',
      results: WOLSAL_RESULT,
      foundText: '일이 빨리 피어나기보다 한 번 마르고 쉬어가는 흐름입니다. 인내·정리·수행에는 좋지만 확장 속도는 조절해야 합니다.',
      absentText: '메마름과 정체의 신살 압박은 약합니다. 흐름을 잡으면 추진이 비교적 곧게 나갑니다.',
      foundAdvice: '무리한 확장보다 체력, 현금흐름, 기본기를 먼저 회복하세요.',
      absentAdvice: '기회가 왔을 때 지나치게 늦추지 말고 실행력을 붙이세요.',
    }),
    branchSinsal({
      name: '망신살', hanja: '亡身殺', icon: '🎭', category: '흉살',
      results: MANGSIN_RESULT,
      foundText: '숨기고 싶은 일이 드러나거나 말실수로 체면이 상하기 쉬운 기운입니다. 반대로 공개 활동·발표·영업에는 존재감이 됩니다.',
      absentText: '구설과 노출 리스크는 약한 편입니다. 조용히 실속을 챙기는 흐름이 잘 맞습니다.',
      foundAdvice: '메시지, 게시글, 사적 관계를 투명하게 관리하세요.',
      absentAdvice: '필요한 순간에는 스스로를 드러내는 연습이 도움이 됩니다.',
    }),
    branchSinsal({
      name: '장성살', hanja: '將星殺', icon: '🎖️', category: '강맹살',
      results: JANGSEONG_RESULT,
      foundText: '중심을 잡고 사람을 이끄는 힘이 있습니다. 권위·책임·승진운이 붙지만 독선으로 흐르면 마찰이 커집니다.',
      absentText: '권위형 리더십보다 협업형·참모형으로 힘이 잘 납니다.',
      foundAdvice: '지시보다 책임을 먼저 지는 태도가 장성의 힘을 좋게 씁니다.',
      absentAdvice: '작은 프로젝트부터 맡아 리더십 경험을 쌓으세요.',
    }),
    branchSinsal({
      name: '반안살', hanja: '攀鞍殺', icon: '🐴', category: '길신',
      results: BANAN_RESULT,
      foundText: '안장에 올라타는 출세운입니다. 윗사람의 인정, 승진, 명예, 안정적 재물 관리에 유리합니다.',
      absentText: '후원에 기대는 출세운보다 직접 실력으로 자리 잡는 흐름입니다.',
      foundAdvice: '상사의 신뢰를 얻는 일, 자격·직함·공식 성과를 챙기세요.',
      absentAdvice: '성과를 수치와 기록으로 남기면 부족한 반안운을 보완합니다.',
    }),
    branchSinsal({
      name: '역마살', hanja: '驛馬殺', icon: '🐎', category: '동살',
      results: YEOKMA_RESULT,
      foundText: '한곳에 머무르기보다 이동·변화·외부 활동에서 운이 살아납니다. 해외, 물류, 영업, 여행, 이직 이슈와 연결됩니다.',
      absentText: '강한 이동 압박은 약합니다. 정착해서 깊이를 쌓는 방식이 더 안정적입니다.',
      foundAdvice: '이동을 충동이 아니라 커리어 확장 루트로 설계하세요.',
      absentAdvice: '필요한 변화만 선별하고, 한 기반을 오래 키우는 편이 좋습니다.',
    }),
    branchSinsal({
      name: '육해살', hanja: '六害殺', icon: '⏳', category: '흉살',
      results: YUKHAE_RESULT,
      foundText: '일이 더디고 주변 변수에 발목 잡히기 쉬운 기운입니다. 꼼꼼함과 인내가 쌓이면 오히려 장기전에서 강해집니다.',
      absentText: '지연·방해의 신살 압박은 약합니다. 결정한 일은 비교적 흐름을 타기 쉽습니다.',
      foundAdvice: '보증·동업·건강 방치를 피하고, 일정에는 여유분을 두세요.',
      absentAdvice: '속도를 낼 수 있을 때 주저하지 말고 실행하세요.',
    }),
    branchSinsal({
      name: '화개살', hanja: '華蓋殺', icon: '🎭', category: '예술살',
      results: HWAGAE_RESULT,
      foundText: '혼자 몰입하는 예술·연구·철학·종교성이 강합니다. 고독이 약점이 아니라 깊이를 만드는 재료가 됩니다.',
      absentText: '고독형 몰입보다 관계 속에서 에너지가 살아나는 편입니다.',
      foundAdvice: '창작, 공부, 신앙, 전문 연구처럼 혼자 깊어지는 시간을 확보하세요.',
      absentAdvice: '혼자 파고드는 시간과 사람 만나는 시간을 균형 있게 두세요.',
    }),
    item({
      name: '양인살', hanja: '羊刃殺', icon: '⚔️', category: '강맹살',
      foundIn: yanginFound,
      basis: `양간 일간 기준 → ${yanginTarget !== undefined ? branchLabel(yanginTarget) : `${dayStem} 일간은 양인 대상 없음`}`,
      foundText: '의지와 돌파력이 강하고 승부 상황에서 물러서지 않습니다. 과하면 급한 판단, 충돌, 수술·상처 이슈로 나타날 수 있습니다.',
      absentText: '칼날처럼 밀어붙이는 기운은 약합니다. 무리한 승부보다 균형 잡힌 추진이 맞습니다.',
      foundAdvice: '운동·훈련·규율로 힘을 쓰고, 분노한 상태에서 결정하지 마세요.',
      absentAdvice: '결단을 미루기 쉬울 때는 기한과 기준을 먼저 정하세요.',
    }),
    item({
      name: '백호살', hanja: '白虎殺', icon: '🐯', category: '흉살',
      foundIn: baekhoFound,
      basis: `간지 기준 → ${formatGanziTargets(BAEKHO_GANZI)}`,
      foundText: '기운이 거칠고 강해 사고·수술·출혈성 이슈를 조심해야 합니다. 의료·군경·응급·위기관리처럼 강한 현장성에는 힘이 됩니다.',
      absentText: '백호의 급격한 사고성은 직접 드러나지 않습니다. 안전운이 약하다는 뜻은 아니므로 기본 관리는 유지해야 합니다.',
      foundAdvice: '운전, 날카로운 도구, 과격한 운동, 건강검진을 특히 챙기세요.',
      absentAdvice: '위험을 과장하기보다 평소 안전 습관을 유지하면 충분합니다.',
    }),
    item({
      name: '괴강살', hanja: '魁罡殺', icon: '👑', category: '강맹살',
      foundIn: goegangFound,
      basis: `간지 기준 → ${formatGanziTargets(GOEGANG_GANZI)}`,
      foundText: `${goegangFound.includes('일주') ? '일주에 있어 작용이 강합니다.' : '일주 밖에 있어 보조적으로 작동합니다.'} 강한 자존심·통솔력·원칙성이 있고, 크게 올라가거나 크게 부딪히는 진폭이 있습니다.`,
      absentText: '괴강 특유의 극단적 강맹함은 약합니다. 부드러운 조율형 역량이 더 자연스럽게 나옵니다.',
      foundAdvice: '강한 판단력은 살리되, 독단으로 보이지 않게 검토자를 두세요.',
      absentAdvice: '원칙이 필요한 자리에서는 기준을 명확히 세워 카리스마를 보완하세요.',
    }),
    item({
      name: '홍염살', hanja: '紅艶殺', icon: '🌹', category: '반길반흉',
      foundIn: hongyeomFound,
      basis: `일간 ${dayStem} 기준 → ${hongyeomTarget !== undefined ? branchLabel(hongyeomTarget) : '해당 없음'}`,
      foundText: '도화보다 은근한 매력과 분위기가 살아납니다. 호감·예술성·감성 표현은 강점이지만 감정 관계의 선은 중요합니다.',
      absentText: '은근한 색기보다 담백한 신뢰감으로 사람을 끄는 편입니다.',
      foundAdvice: '매력을 일, 창작, 이미지 관리로 쓰고 관계는 느리게 확인하세요.',
      absentAdvice: '표현이 너무 건조해지지 않게 취향과 감정을 적당히 드러내세요.',
    }),
    item({
      name: '귀문관살', hanja: '鬼門關殺', icon: '🔮', category: '흉살',
      foundIn: gwimunFound,
      basis: '지지 조합 기준 → 子酉·丑午·寅未·卯申·辰亥·巳戌',
      foundText: '직관·몰입·예민함이 강합니다. 통찰력으로 쓰면 좋지만 불면, 의심, 강박처럼 신경이 과열될 때 조절이 필요합니다.',
      absentText: '귀문 특유의 예민한 문은 강하지 않습니다. 판단이 비교적 현실 기준으로 흐르기 쉽습니다.',
      foundAdvice: '수면, 명상, 기록, 상담처럼 생각을 배출하는 루틴을 두세요.',
      absentAdvice: '직감보다 자료와 확인 절차를 기반으로 움직이면 장점이 살아납니다.',
    }),
    item({
      name: '원진살', hanja: '怨嗔殺', icon: '🪞', category: '흉살',
      foundIn: wonjinFound,
      basis: '지지 조합 기준 → 子未·丑午·寅酉·卯申·辰亥·巳戌',
      foundText: '가깝지만 불편한 감정, 이유 없는 서운함, 관계 속 예민함이 생기기 쉽습니다. 예술·종교·상담 감수성으로도 바뀔 수 있습니다.',
      absentText: '원진 특유의 해소 어려운 감정 마찰은 약합니다. 관계 갈등은 다른 합충과 십성으로 더 봐야 합니다.',
      foundAdvice: '가까운 사람일수록 추측하지 말고 말로 확인하세요. 감정 기록이 도움이 됩니다.',
      absentAdvice: '관계가 편하더라도 감정 표현을 미루지 않으면 작은 오해를 줄입니다.',
    }),
    item({
      name: '천라지망', hanja: '天羅地網', icon: '🕸️', category: '흉살',
      foundIn: cheonraJimangFound,
      basis: '지지 조합 기준 → 戌亥(천라)·辰巳(지망)',
      foundText: '그물에 걸린 듯 활동 반경이 좁아지거나 일이 묶이는 느낌이 생길 수 있습니다. 반대로 사법·규정·치유·철학 분야에는 깊이가 됩니다.',
      absentText: '천라지망의 묶임은 원국에 직접 강하지 않습니다. 이동과 확장 판단은 역마·지살·충을 함께 봅니다.',
      foundAdvice: '막힘이 느껴질수록 절차, 법, 자격, 전문성 안에서 길을 찾으세요.',
      absentAdvice: '불필요하게 자신을 제한하지 말고, 움직일 수 있는 기회는 넓게 잡으세요.',
    }),
    item({
      name: '급각살', hanja: '急脚殺', icon: '🦴', category: '흉살',
      foundIn: geupgakFound,
      basis: `월지 계절 기준 → ${formatBranches(geupgakTargets)}를 일지·시지에서 확인`,
      foundText: '급하게 움직이다 다리·관절·허리·낙상 이슈가 생기기 쉬운 살입니다. 바쁘게 이동할수록 안전 루틴이 중요합니다.',
      absentText: '급각의 직접 신호는 약합니다. 다만 운동·이동 중 사고는 역마, 충, 백호와 함께 봐야 합니다.',
      foundAdvice: '운전, 계단, 등산, 과격한 운동 전후로 몸을 풀고 서두르는 습관을 줄이세요.',
      absentAdvice: '안전운이 자동으로 좋은 뜻은 아니니 기본 체력과 자세 관리는 유지하세요.',
    }),
    item({
      name: '현침살', hanja: '懸針殺', icon: '🪡', category: '반길반흉',
      foundIn: hyeonchimFound,
      basis: '천간 甲·辛, 지지 卯·午·申 기준',
      foundText: '바늘처럼 예리한 관찰력, 말, 손기술이 살아납니다. 의료·침술·디자인·수리·분석에는 장점이나 말이 날카로워질 수 있습니다.',
      absentText: '현침의 예리한 절단감은 약합니다. 부드러운 조율과 넓은 관점으로 풀리는 구조입니다.',
      foundAdvice: '정밀함은 기술로 쓰고, 비판은 바로 던지기보다 한 번 다듬어 말하세요.',
      absentAdvice: '정밀함이 필요한 일은 체크리스트와 도구로 보완하면 좋습니다.',
    }),
    item({
      name: '고신·과숙살', hanja: '孤神寡宿', icon: '🌑', category: '흉살',
      foundIn: lonelyFound,
      basis: `연지 ${branchLabel(yearPillar.branchIndex)} 기준 → 고신 ${branchLabel(lonelyTargets.gosin)}·과숙 ${branchLabel(lonelyTargets.gwasuk)}`,
      foundText: `혼자 감당하는 힘이 강하고 가족·배우자와 정서적 거리를 느끼기 쉽습니다. ${lonelyFocus}`,
      absentText: '고독살의 직접 작용은 약합니다. 관계가 끊기는 흐름보다 연결을 유지하는 힘이 더 자연스럽습니다.',
      foundAdvice: '혼자 버티기보다 감정을 말로 확인하고, 관계 시간을 일정에 넣으세요.',
      absentAdvice: '사람과의 연결을 당연하게 여기지 말고 꾸준히 관리하세요.',
    }),
    item({
      name: '천덕귀인', hanja: '天德貴人', icon: '🕊️', category: '길신',
      foundIn: cheondeokFound,
      basis: `월지 ${branchLabel(monthPillar.branchIndex)} 기준 → ${cheondeokTarget ? targetLabel(cheondeokTarget) : '해당 없음'}`,
      foundText: '하늘의 덕으로 흉을 누그러뜨리는 보호성이 있습니다. 어려운 일도 큰 화로 번지기 전에 도움이나 완충 장치가 생기기 쉽습니다.',
      absentText: '천덕의 보호가 전면에 드러나진 않습니다. 선행과 신뢰로 덕을 쌓는 방식이 중요합니다.',
      foundAdvice: '받은 도움을 베풀고, 공정한 태도를 유지하면 귀인운이 오래 갑니다.',
      absentAdvice: '규칙을 지키고 평판을 깨끗하게 관리하는 것이 가장 좋은 보완입니다.',
    }),
    item({
      name: '월덕귀인', hanja: '月德貴人', icon: '🌙', category: '길신',
      foundIn: woldeokFound,
      basis: `월지 삼합 기준 → ${woldeokStem !== undefined ? stemLabel(woldeokStem) : '해당 없음'}`,
      foundText: '사람의 덕, 온화함, 완충력이 살아납니다. 가족·동료·주변 사람에게 도움을 받거나 갈등이 부드럽게 풀릴 가능성이 큽니다.',
      absentText: '월덕의 완충이 강하게 드러나진 않습니다. 인간관계에서 먼저 배려하는 습관이 복을 만듭니다.',
      foundAdvice: '부드러운 말과 중재 역할을 맡으면 월덕의 힘이 커집니다.',
      absentAdvice: '갈등 상황에서는 즉답보다 시간을 두고 말하는 편이 좋습니다.',
    }),
    item({
      name: '공망', hanja: '空亡', icon: '🕳️', category: '공망',
      foundIn: gongmangFound,
      basis: `일주 ${HEAVENLY_STEMS_HANJA[dayPillar.stemIndex]}${EARTHLY_BRANCHES_HANJA[dayPillar.branchIndex]} 순공 기준 → ${formatBranches(gongmangBranches)}`,
      foundText: '해당 기둥의 인연과 역할이 허하게 작용하기 쉽습니다. 비어 있는 자리는 집착보다 내려놓음과 정신적 성장으로 풀 때 좋아집니다.',
      absentText: '일주 기준 공망 지지가 원국에 직접 걸리지 않아 각 기둥의 힘이 비교적 온전하게 드러납니다.',
      foundAdvice: '공망 자리의 관계·역할은 억지로 붙잡기보다 기대치를 조정하세요.',
      absentAdvice: '공망 부담이 적으니 가진 기둥의 장점을 실질 행동으로 밀어붙이세요.',
    }),
  ];
}

export interface ShinsalTransitActivation {
  scope: '대운' | '세운' | '향후세운';
  year?: number;
  age?: number;
  period?: string;
  pillar: string;
  name: string;
  category: string;
  impact: string;
  advice: string;
}

export function getShinsalTransitActivations(
  birthYear: number,
  yearPillar: ReturnType<typeof getYearPillar>,
  monthPillar: ReturnType<typeof getMonthPillar>,
  dayPillar: ReturnType<typeof getDayPillar>,
  hourPillar: ReturnType<typeof getHourPillar> | null,
  dayStem: string,
  daeun: ReturnType<typeof getDaeun>,
  seun: ReturnType<typeof getSeun>,
): ShinsalTransitActivation[] {
  const branchLabel = (idx: number) => `${EARTHLY_BRANCHES[idx]}(${EARTHLY_BRANCHES_HANJA[idx]})`;
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;
  const currentDaeun = daeun.periods.find((p) => currentAge >= p.startAge && currentAge <= p.endAge);
  const currentSeun = seun.find((s) => s.isCurrent);
  const nextSeun = seun.filter((s) => s.year > currentYear).slice(0, 3);
  const natalBranches = [yearPillar, monthPillar, dayPillar, hourPillar]
    .filter(Boolean)
    .map((p) => p!.branchIndex);

  function samhapTargets(results: number[]): number[] {
    const targets: number[] = [];
    const baseIdxYear = getSamhapGroup(yearPillar.branchIndex);
    const baseIdxDay = getSamhapGroup(dayPillar.branchIndex);
    if (baseIdxYear >= 0) targets.push(results[baseIdxYear]);
    if (baseIdxDay >= 0) targets.push(results[baseIdxDay]);
    return Array.from(new Set(targets));
  }

  const branchTargets: Array<{ name: string; category: string; targets: number[]; impact: string; advice: string }> = [
    { name: '겁살', category: '흉살', targets: samhapTargets(GEOPSAL_RESULT), impact: '외부 변수와 손실 이슈가 강해질 수 있습니다.', advice: '큰돈, 보증, 비공식 거래를 줄이세요.' },
    { name: '재살(수옥살)', category: '흉살', targets: samhapTargets(JAESAL_RESULT), impact: '관재·계약·규정 문제가 운에서 부각됩니다.', advice: '서류, 세금, 법규, 교통 규칙을 보수적으로 지키세요.' },
    { name: '도화살', category: '반길반흉', targets: samhapTargets(DOHWA_RESULT), impact: '인기·매력·노출 운이 강해집니다.', advice: '홍보와 창작에는 좋지만 관계 구설은 관리하세요.' },
    { name: '역마살', category: '동살', targets: samhapTargets(YEOKMA_RESULT), impact: '이동·이직·출장·확장 이슈가 켜집니다.', advice: '움직임을 계획화하고 안전·일정 여유를 두세요.' },
    { name: '화개살', category: '예술살', targets: samhapTargets(HWAGAE_RESULT), impact: '고독·몰입·예술·종교성이 강해집니다.', advice: '혼자 깊어지는 시간을 생산적 결과물로 바꾸세요.' },
    { name: '장성살', category: '강맹살', targets: samhapTargets(JANGSEONG_RESULT), impact: '리더십과 책임 자리가 커집니다.', advice: '권위보다 책임을 먼저 보여 주세요.' },
    { name: '반안살', category: '길신', targets: samhapTargets(BANAN_RESULT), impact: '승진·인정·윗사람 도움 운이 들어옵니다.', advice: '공식 성과와 자격을 챙기세요.' },
    { name: '육해살', category: '흉살', targets: samhapTargets(YUKHAE_RESULT), impact: '지연·방해·건강 관리 이슈가 생길 수 있습니다.', advice: '일정과 체력에 여유분을 두세요.' },
    { name: '천을귀인', category: '길신', targets: CHEONEUL[dayStem] ?? [], impact: '귀인·조력자·제도적 도움 운이 살아납니다.', advice: '도움받을 통로를 먼저 열어 두세요.' },
    { name: '문창귀인', category: '길신', targets: MUNCHANG[dayStem] !== undefined ? [MUNCHANG[dayStem]] : [], impact: '시험·문서·글쓰기 운이 살아납니다.', advice: '자격, 계약, 기록물을 정리하세요.' },
    { name: '학당귀인', category: '길신', targets: HAKDANG[dayStem] !== undefined ? [HAKDANG[dayStem]] : [], impact: '공부·강의·교육 인연이 강해집니다.', advice: '배우거나 가르치는 일을 잡으세요.' },
    { name: '금여록', category: '길신', targets: GEUMYEO[dayStem] !== undefined ? [GEUMYEO[dayStem]] : [], impact: '재물 안정·품격·배우자운 보조가 들어옵니다.', advice: '자산 관리와 관계 선택을 신중히 하세요.' },
    { name: '암록', category: '길신', targets: AMROK[dayStem] !== undefined ? [AMROK[dayStem]] : [], impact: '숨은 수입·뜻밖의 후원이 생기기 쉽습니다.', advice: '작은 소개와 부업성 기회를 기록하세요.' },
  ];

  const pairTargets: Array<{ name: string; category: string; pairs: ReadonlyArray<readonly [number, number]>; impact: string; advice: string }> = [
    { name: '원진살', category: '흉살', pairs: WONJIN_PAIRS, impact: '관계 속 서운함과 예민함이 운에서 켜집니다.', advice: '가까운 사람일수록 감정을 확인하고 넘기세요.' },
    { name: '귀문관살', category: '흉살', pairs: GWIMUN_PAIRS, impact: '직관과 예민함, 몰입이 강해집니다.', advice: '수면과 멘탈 루틴을 우선하세요.' },
    { name: '천라지망', category: '흉살', pairs: CHEONRA_JIMANG_PAIRS, impact: '일이 묶이거나 활동 반경이 좁아지는 느낌이 생길 수 있습니다.', advice: '절차·법·자격 안에서 풀어가세요.' },
  ];

  const geupgakTargets = [2, 3, 4].includes(monthPillar.branchIndex) ? [11, 0]
    : [5, 6, 7].includes(monthPillar.branchIndex) ? [3, 7]
    : [8, 9, 10].includes(monthPillar.branchIndex) ? [2, 10]
    : [1, 4];

  function makePillar(stem: string, branch: string) {
    return {
      stem,
      branch,
      stemIndex: HEAVENLY_STEMS.indexOf(stem),
      branchIndex: EARTHLY_BRANCHES.indexOf(branch),
    };
  }

  const transits: Array<{ scope: ShinsalTransitActivation['scope']; year?: number; age?: number; period?: string; stem: string; branch: string; stemIndex: number; branchIndex: number }> = [];
  if (currentDaeun) {
    transits.push({
      scope: '대운',
      period: `${currentDaeun.startAge}~${currentDaeun.endAge}세`,
      ...makePillar(currentDaeun.stem, currentDaeun.branch),
    });
  }
  if (currentSeun) {
    transits.push({
      scope: '세운',
      year: currentSeun.year,
      age: currentSeun.age,
      ...makePillar(currentSeun.stem, currentSeun.branch),
    });
  }
  nextSeun.forEach((s) => {
    transits.push({
      scope: '향후세운',
      year: s.year,
      age: s.age,
      ...makePillar(s.stem, s.branch),
    });
  });

  const activations: ShinsalTransitActivation[] = [];
  function addActivation(
    transit: (typeof transits)[number],
    pillar: string,
    name: string,
    category: string,
    impact: string,
    advice: string,
  ) {
    activations.push({
      scope: transit.scope,
      year: transit.year,
      age: transit.age,
      period: transit.period,
      pillar,
      name,
      category,
      impact,
      advice,
    });
  }

  for (const transit of transits) {
    const pillar = `${transit.stem}${transit.branch}(${HEAVENLY_STEMS_HANJA[transit.stemIndex] ?? ''}${EARTHLY_BRANCHES_HANJA[transit.branchIndex] ?? ''})`;
    branchTargets.forEach((target) => {
      if (target.targets.includes(transit.branchIndex)) {
        addActivation(transit, pillar, target.name, target.category, `${branchLabel(transit.branchIndex)} 운이 들어와 ${target.impact}`, target.advice);
      }
    });
    pairTargets.forEach((target) => {
      const matched = target.pairs.some(([a, b]) =>
        (transit.branchIndex === a && natalBranches.includes(b)) ||
        (transit.branchIndex === b && natalBranches.includes(a)),
      );
      if (matched) {
        addActivation(transit, pillar, target.name, target.category, `${branchLabel(transit.branchIndex)} 운이 원국 지지와 만나 ${target.impact}`, target.advice);
      }
    });
    if (geupgakTargets.includes(transit.branchIndex)) {
      addActivation(transit, pillar, '급각살', '흉살', `${branchLabel(transit.branchIndex)} 운이 월지 계절 기준 급각살을 자극합니다.`, '이동, 운전, 계단, 관절·허리 사용을 조심하세요.');
    }
    if (HYEONCHIM_STEMS.includes(transit.stemIndex) || HYEONCHIM_BRANCHES.includes(transit.branchIndex)) {
      addActivation(transit, pillar, '현침살', '반길반흉', '현침 글자가 운에서 들어와 말·손기술·정밀함이 예민해집니다.', '비판은 다듬고, 정밀 작업에는 집중력을 활용하세요.');
    }
  }

  const seen = new Set<string>();
  return activations.filter((item) => {
    const key = `${item.scope}-${item.year ?? item.period}-${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 18);
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

  return {
    year:  calcPillar(yearPillar),
    month: calcPillar(monthPillar),
    day:   calcPillar(dayPillar),
    hour:  calcPillar(hourPillar),
  };
}
