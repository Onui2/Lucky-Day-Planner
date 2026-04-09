// ─── 사주 이론 조견표 (참조 데이터) ─────────────────────────────

/** 천간 한글 순서 */
export const STEMS = ["갑","을","병","정","무","기","경","신","임","계"] as const;
/** 천간 한자 */
export const STEMS_HANJA: Record<string, string> = {
  갑:"甲", 을:"乙", 병:"丙", 정:"丁", 무:"戊",
  기:"己", 경:"庚", 신:"辛", 임:"壬", 계:"癸",
};
/** 지지 한글 순서 */
export const BRANCHES = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;
/** 지지 한자 */
export const BRANCHES_HANJA: Record<string, string> = {
  자:"子", 축:"丑", 인:"寅", 묘:"卯", 진:"辰", 사:"巳",
  오:"午", 미:"未", 신:"申", 유:"酉", 술:"戌", 해:"亥",
};
/** 지지 동물 */
export const BRANCHES_ANIMAL: Record<string, string> = {
  자:"쥐", 축:"소", 인:"호랑이", 묘:"토끼", 진:"용", 사:"뱀",
  오:"말", 미:"양", 신:"원숭이", 유:"닭", 술:"개", 해:"돼지",
};

// ══════════════════════════════════════════════════
// 1. 천간합 (天干合)
// ══════════════════════════════════════════════════
export interface StemCombination {
  stems: [string, string];
  result: string;
  element: string;
  desc: string;
}
export const STEM_COMBINATIONS: StemCombination[] = [
  { stems: ["갑","기"], result: "토(土)", element: "토", desc: "중정지합 — 인의(仁義)의 합, 안정을 추구" },
  { stems: ["을","경"], result: "금(金)", element: "금", desc: "인의지합 — 의리(義理)의 합, 결단력" },
  { stems: ["병","신"], result: "수(水)", element: "수", desc: "위제지합 — 위엄(威制)의 합, 지혜로움" },
  { stems: ["정","임"], result: "목(木)", element: "목", desc: "인수지합 — 인수(仁壽)의 합, 유연함" },
  { stems: ["무","계"], result: "화(火)", element: "화", desc: "무정지합 — 무정(無情)의 합, 정열적" },
];

// ══════════════════════════════════════════════════
// 2. 천간충 (天干沖)
// ══════════════════════════════════════════════════
export interface StemClash {
  stems: [string, string];
  elements: string;
  desc: string;
}
export const STEM_CLASHES: StemClash[] = [
  { stems: ["갑","경"], elements: "목↔금", desc: "木金 대립 — 결단 vs 성장의 충돌" },
  { stems: ["을","신"], elements: "목↔금", desc: "木金 대립 — 유연 vs 날카로움의 충돌" },
  { stems: ["병","임"], elements: "화↔수", desc: "火水 대립 — 열정 vs 이성의 충돌" },
  { stems: ["정","계"], elements: "화↔수", desc: "火水 대립 — 예의 vs 지혜의 충돌" },
  { stems: ["무","갑"], elements: "토↔목", desc: "土木 대립 — 안정 vs 성장의 충돌" },
];

// ══════════════════════════════════════════════════
// 3. 지지 육합 (地支六合)
// ══════════════════════════════════════════════════
export interface BranchCombination {
  branches: [string, string];
  result: string;
  element: string;
  desc: string;
}
export const BRANCH_SIX_COMBINATIONS: BranchCombination[] = [
  { branches: ["자","축"], result: "토(土)", element: "토", desc: "음수+음토 합 — 저축·안정 추구" },
  { branches: ["인","해"], result: "목(木)", element: "목", desc: "양목+음수 합 — 성장·진취적 기운" },
  { branches: ["묘","술"], result: "화(火)", element: "화", desc: "음목+양토 합 — 정열·변화 기운" },
  { branches: ["진","유"], result: "금(金)", element: "금", desc: "양토+음금 합 — 결단·수집 기운" },
  { branches: ["사","신"], result: "수(水)", element: "수", desc: "음화+양금 합 — 지혜·순환 기운" },
  { branches: ["오","미"], result: "토(土)", element: "토", desc: "양화+음토 합 — 화합·조화 기운" },
];

// ══════════════════════════════════════════════════
// 4. 지지 삼합 (地支三合)
// ══════════════════════════════════════════════════
export interface BranchTriple {
  branches: [string, string, string];
  result: string;
  element: string;
  desc: string;
}
export const BRANCH_TRIPLE_COMBINATIONS: BranchTriple[] = [
  { branches: ["인","오","술"], result: "화(火)", element: "화", desc: "화국(火局) — 활동·열정·적극성" },
  { branches: ["해","묘","미"], result: "목(木)", element: "목", desc: "목국(木局) — 성장·인자·발전" },
  { branches: ["신","자","진"], result: "수(水)", element: "수", desc: "수국(水局) — 지혜·유연·통찰" },
  { branches: ["사","유","축"], result: "금(金)", element: "금", desc: "금국(金局) — 결단·의리·수집" },
];

// ══════════════════════════════════════════════════
// 5. 지지 방합 (地支方合)
// ══════════════════════════════════════════════════
export interface BranchDirectional {
  branches: [string, string, string];
  direction: string;
  result: string;
  element: string;
  desc: string;
}
export const BRANCH_DIRECTIONAL: BranchDirectional[] = [
  { branches: ["인","묘","진"], direction: "동방(東方)", result: "목(木)", element: "목", desc: "봄 기운 — 생명·시작·성장의 에너지" },
  { branches: ["사","오","미"], direction: "남방(南方)", result: "화(火)", element: "화", desc: "여름 기운 — 열정·표현·번성의 에너지" },
  { branches: ["신","유","술"], direction: "서방(西方)", result: "금(金)", element: "금", desc: "가을 기운 — 수렴·결실·결단의 에너지" },
  { branches: ["해","자","축"], direction: "북방(北方)", result: "수(水)", element: "수", desc: "겨울 기운 — 저장·지혜·잠복의 에너지" },
];

// ══════════════════════════════════════════════════
// 6. 지지 충 (地支沖)
// ══════════════════════════════════════════════════
export interface BranchClash {
  branches: [string, string];
  elements: string;
  desc: string;
}
export const BRANCH_CLASHES: BranchClash[] = [
  { branches: ["자","오"], elements: "수↔화", desc: "子午충 — 감정 기복, 이사·이동 빈번" },
  { branches: ["축","미"], elements: "토↔토", desc: "丑未충 — 고집 충돌, 부동산 변동" },
  { branches: ["인","신"], elements: "목↔금", desc: "寅申충 — 갑작스러운 변화, 교통 주의" },
  { branches: ["묘","유"], elements: "목↔금", desc: "卯酉충 — 관계 갈등, 수술·부상 주의" },
  { branches: ["진","술"], elements: "토↔토", desc: "辰戌충 — 재물 변동, 건강 주의" },
  { branches: ["사","해"], elements: "화↔수", desc: "巳亥충 — 직업·환경 큰 변화" },
];

// ══════════════════════════════════════════════════
// 7. 형살 (刑殺)
// ══════════════════════════════════════════════════
export interface HyeongSal {
  type: string;
  branches: string[];
  name: string;
  desc: string;
}
export const HYEONG_SAL: HyeongSal[] = [
  {
    type: "삼형살",
    branches: ["인","사","신"],
    name: "무은지형 (無恩之刑)",
    desc: "은혜를 모르는 형살. 인간관계 배신, 법적 분쟁, 수술·부상 위험",
  },
  {
    type: "삼형살",
    branches: ["축","미","술"],
    name: "무세지형 (無勢之刑)",
    desc: "세력이 없는 형살. 고집으로 인한 갈등, 환경적 제약, 직업 어려움",
  },
  {
    type: "상형",
    branches: ["자","묘"],
    name: "무례지형 (無禮之刑)",
    desc: "예의 없는 형살. 언행 충돌, 예의 없는 관계, 소화기·간 관련 질환 주의",
  },
  {
    type: "자형",
    branches: ["진","진"],
    name: "자형 (自刑)",
    desc: "스스로를 해치는 형살. 내적 갈등, 고집으로 인한 자충수",
  },
  {
    type: "자형",
    branches: ["오","오"],
    name: "자형 (自刑)",
    desc: "강박적 조급함으로 문제 자초. 화기 과다, 조급증",
  },
  {
    type: "자형",
    branches: ["유","유"],
    name: "자형 (自刑)",
    desc: "고립·외로움을 자초. 금성 과다, 고독감",
  },
  {
    type: "자형",
    branches: ["해","해"],
    name: "자형 (自刑)",
    desc: "문제를 혼자 끌어안음. 수기 과다, 은둔 경향",
  },
];

// ══════════════════════════════════════════════════
// 8. 귀문살 (鬼門殺)
// ══════════════════════════════════════════════════
export interface GwimunSal {
  branches: [string, string];
  desc: string;
}
export const GWIMUN_SAL: GwimunSal[] = [
  { branches: ["자","유"], desc: "영적 감수성 강함, 신경이 예민해지고 심리적 불안 조장" },
  { branches: ["축","오"], desc: "집착·질투심 유발, 심한 경우 정신적 혼란" },
  { branches: ["인","미"], desc: "변덕과 충동적 행동, 예기치 않은 사건" },
  { branches: ["묘","신"], desc: "이중성·혼란, 거짓말이나 오해로 인한 갈등" },
  { branches: ["진","해"], desc: "귀신·이상한 일과 인연, 종교·철학 몰입" },
  { branches: ["사","술"], desc: "집착·망상, 강렬한 감정과 폭발적 행동" },
];

// ══════════════════════════════════════════════════
// 9. 삼재 (三災) — 띠별 삼재 해당 연도 지지
// ══════════════════════════════════════════════════
export interface SamjaeGroup {
  myBranches: [string, string, string];
  samjaeBranches: [string, string, string];
  direction: string;
  desc: string;
}
export const SAMJAE_GROUPS: SamjaeGroup[] = [
  {
    myBranches: ["인","오","술"],
    samjaeBranches: ["신","유","술"],
    direction: "서방 삼재",
    desc: "인·오·술 띠는 신년(申)·유년(酉)·술년(戌)에 삼재",
  },
  {
    myBranches: ["해","묘","미"],
    samjaeBranches: ["사","오","미"],
    direction: "남방 삼재",
    desc: "해·묘·미 띠는 사년(巳)·오년(午)·미년(未)에 삼재",
  },
  {
    myBranches: ["신","자","진"],
    samjaeBranches: ["인","묘","진"],
    direction: "동방 삼재",
    desc: "신·자·진 띠는 인년(寅)·묘년(卯)·진년(辰)에 삼재",
  },
  {
    myBranches: ["사","유","축"],
    samjaeBranches: ["해","자","축"],
    direction: "북방 삼재",
    desc: "사·유·축 띠는 해년(亥)·자년(子)·축년(丑)에 삼재",
  },
];

// ══════════════════════════════════════════════════
// 10. 신살 조견표 (일간·일지 기준)
// ══════════════════════════════════════════════════

/** 천을귀인 (天乙貴人) — 일간(日干) 기준 해당 지지 */
export const CHEONEUR_GWIIN: Record<string, string[]> = {
  갑: ["축","미"],
  무: ["축","미"],
  경: ["축","미"],
  을: ["자","신"],
  기: ["자","신"],
  병: ["해","유"],
  정: ["해","유"],
  신: ["오","인"],
  임: ["사","묘"],
  계: ["사","묘"],
};

/** 문창귀인 (文昌貴人) — 일간(日干) 기준 해당 지지 */
export const MUNCHANG_GWIIN: Record<string, string> = {
  갑: "사",
  을: "오",
  병: "신",
  정: "유",
  무: "신",
  기: "유",
  경: "해",
  신: "자",
  임: "인",
  계: "묘",
};

/** 양인살 (羊刃殺) — 양간(陽干) 일간 기준 */
export const YANGINSSAL: Record<string, string> = {
  갑: "묘",
  병: "오",
  무: "오",
  경: "유",
  임: "자",
};

/** 역마살 (驛馬殺) — 일지(또는 연지) 기준 삼합 그룹 → 역마 지지 */
export const YEOKMA_SAL: Record<string, string> = {
  인: "신", 오: "신", 술: "신",
  신: "인", 자: "인", 진: "인",
  사: "해", 유: "해", 축: "해",
  해: "사", 묘: "사", 미: "사",
};

/** 도화살 (桃花殺 / 咸池殺) — 일지(또는 연지) 기준 */
export const DOHWA_SAL: Record<string, string> = {
  인: "묘", 오: "묘", 술: "묘",
  사: "오", 유: "오", 축: "오",
  신: "유", 자: "유", 진: "유",
  해: "자", 묘: "자", 미: "자",
};

/** 화개살 (華蓋殺) — 일지(또는 연지) 기준 */
export const HWAGAE_SAL: Record<string, string> = {
  인: "술", 오: "술", 술: "술",
  사: "축", 유: "축", 축: "축",
  신: "진", 자: "진", 진: "진",
  해: "미", 묘: "미", 미: "미",
};

// ══════════════════════════════════════════════════
// 11. 지지 장간 (地支藏干)
// ══════════════════════════════════════════════════
export interface JangGan {
  branch: string;
  hanja: string;
  junggi: string;   // 정기 (주기)
  junki?: string;   // 중기 (부기)
  yeoki?: string;   // 여기 (부기2)
  element: string;
}
export const JANG_GAN: JangGan[] = [
  { branch: "자", hanja: "子", junggi: "계", element: "수", yeoki: undefined, junki: undefined },
  { branch: "축", hanja: "丑", junggi: "기", junki: "계", yeoki: "신", element: "토" },
  { branch: "인", hanja: "寅", junggi: "갑", junki: "병", yeoki: "무", element: "목" },
  { branch: "묘", hanja: "卯", junggi: "을", element: "목", yeoki: undefined, junki: undefined },
  { branch: "진", hanja: "辰", junggi: "무", junki: "을", yeoki: "계", element: "토" },
  { branch: "사", hanja: "巳", junggi: "병", junki: "경", yeoki: "무", element: "화" },
  { branch: "오", hanja: "午", junggi: "정", junki: "기", element: "화", yeoki: undefined },
  { branch: "미", hanja: "未", junggi: "기", junki: "을", yeoki: "정", element: "토" },
  { branch: "신", hanja: "申", junggi: "경", junki: "임", yeoki: "무", element: "금" },
  { branch: "유", hanja: "酉", junggi: "신", element: "금", yeoki: undefined, junki: undefined },
  { branch: "술", hanja: "戌", junggi: "무", junki: "정", yeoki: "신", element: "토" },
  { branch: "해", hanja: "亥", junggi: "임", junki: "갑", element: "수", yeoki: undefined },
];

// ══════════════════════════════════════════════════
// 오행 색상 헬퍼
// ══════════════════════════════════════════════════
export const ELEM_BADGE: Record<string, string> = {
  목: "bg-green-500/20 text-green-300 border-green-500/30",
  화: "bg-red-500/20 text-red-300 border-red-500/30",
  토: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  금: "bg-gray-400/20 text-gray-200 border-gray-400/30",
  수: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};
export const ELEM_TEXT: Record<string, string> = {
  목: "text-green-400",
  화: "text-red-400",
  토: "text-yellow-400",
  금: "text-gray-300",
  수: "text-blue-400",
};
