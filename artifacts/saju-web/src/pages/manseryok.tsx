import { useState, useMemo, useEffect, useRef } from "react";
import { useGetManseryokMonth } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { AdminPersonLookup, type AdminLookupTarget } from "@/components/AdminPersonLookup";
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, UserCircle2, Star, TrendingDown, Hash, Palette, Compass, Gem, ImageDown, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getElementRelation, getProfileRelationContext } from "@/lib/saju-relation";
import { Link } from "wouter";
import {
  getStemLucky,
  ELEM_KOR as SAJU_ELEM_KOR,
  ELEM_COLOR as SAJU_ELEM_COLOR_MAP,
  ELEM_BG as SAJU_ELEM_BG,
} from "@/lib/sajuLucky";
import { useResolvedProfile } from "@/lib/resolved-profile";
import { getMonthKey, getSeoulTodayString } from "@/lib/seoul-date";

const STEM_HANJA: Record<string, string> = {
  갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸',
};
const BRANCH_HANJA: Record<string, string> = {
  자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥',
};
const toGanziHanja = (stem: string, branch: string) =>
  (STEM_HANJA[stem] ?? stem) + (BRANCH_HANJA[branch] ?? branch);

function getDayRelation(
  dayData: any,
  myElem: string | null,
  myStem: string | null,
  myBranch: string | null,
  relationContext?: ReturnType<typeof getProfileRelationContext>,
) {
  if (dayData?.personalized?.relation) {
    return dayData.personalized.relation;
  }

  if (!myElem || !dayData?.dayElement) {
    return null;
  }

  return getElementRelation(
    myElem,
    dayData.dayElement,
    myStem,
    dayData.dayHeavenlyStem,
    myBranch,
    dayData.dayEarthlyBranch,
    relationContext,
  );
}

function calcDayScore(
  dayData: any,
  myElem: string | null,
  myStem: string | null,
  myBranch: string | null,
  relationContext?: ReturnType<typeof getProfileRelationContext>,
): number {
  if (typeof dayData?.personalized?.score === "number") {
    return dayData.personalized.score;
  }

  const relation = getDayRelation(dayData, myElem, myStem, myBranch, relationContext);

  if (!relation) {
    // 비개인화(프로필 없음) 기본 점수. 사주 기둥 점수 재조정과 같은 결로
    // 바닥을 올리고(흉4·중립6) 길일은 8로 유지 → 100점 환산 시 중심 ~65.
    let base = 6;
    if (dayData?.luckyDay)        base = 8;
    if (dayData?.inauspiciousDay) base = 4;
    return base;
  }

  let base = relation.score;
  if (dayData.luckyDay && relation.positive) {
    base = Math.min(10, base + 1);
  }
  if (dayData.inauspiciousDay && !relation.positive) {
    base = Math.max(1, base - 1);
  }
  return base;
}

const STRONG_POSITIVE_REL_TYPES = new Set([
  "인성",
  "식상",
  "재성",
  "천간합",
  "지지육합",
  "지지반합",
  "지지삼합",
  "지지방합",
  "지지암합",
]);

const STRONG_NEGATIVE_REL_TYPES = new Set([
  "관살",
  "천간충",
  "지지충",
  "지지형",
  "지지해",
  "지지원진",
  "지지귀문",
]);

function getDayBadges(
  dayData: any,
  score: number | null,
  rel: ReturnType<typeof getElementRelation> | null,
  personalized: boolean,
) {
  if (dayData?.personalized?.badges) {
    return dayData.personalized.badges;
  }

  if (!dayData || score == null) {
    return {
      lucky: false,
      inauspicious: false,
      caution: false,
      genericLucky: false,
      genericCaution: false,
    };
  }

  if (!personalized) {
    return {
      lucky: Boolean(dayData.luckyDay),
      inauspicious: Boolean(dayData.inauspiciousDay),
      caution: false,
      genericLucky: false,
      genericCaution: false,
    };
  }

  const strongPositive = Boolean(rel?.type && STRONG_POSITIVE_REL_TYPES.has(rel.type));
  const strongNegative = Boolean(rel?.type && STRONG_NEGATIVE_REL_TYPES.has(rel.type));
  const lucky = score >= 8 || (score >= 7 && Boolean(rel?.positive) && strongPositive);
  const inauspicious = score <= 2 || (score <= 3 && Boolean(rel && !rel.positive) && strongNegative);
  const caution = !lucky && !inauspicious && (score <= 4 || (Boolean(rel && !rel.positive) && score <= 5));

  return {
    lucky,
    inauspicious,
    caution,
    genericLucky: Boolean(dayData.luckyDay) && !lucky,
    genericCaution: Boolean(dayData.inauspiciousDay) && !inauspicious,
  };
}

function scoreLabel(score: number): string {
  if (score >= 9) return "대길";
  if (score >= 7) return "길";
  if (score >= 5) return "평";
  if (score >= 3) return "주의";
  return "흉";
}

function scoreDotColor(score: number): string {
  if (score >= 9) return "bg-amber-500";
  if (score >= 7) return "bg-emerald-500";
  if (score >= 5) return "bg-slate-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-rose-500";
}

function scoreTextColor(score: number): string {
  if (score >= 9) return "text-amber-700";
  if (score >= 7) return "text-emerald-700";
  if (score >= 5) return "text-slate-700";
  if (score >= 3) return "text-orange-700";
  return "text-rose-700";
}

function scoreBadgeClass(score: number): string {
  if (score >= 9) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 7) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 5) return "border-slate-200 bg-slate-50 text-slate-700";
  if (score >= 3) return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function scoreCardClass(score: number): string {
  if (score >= 9) return "border-amber-300 bg-amber-50/80";
  if (score >= 7) return "border-emerald-300 bg-emerald-50/80";
  if (score >= 5) return "border-slate-300 bg-slate-50/85";
  if (score >= 3) return "border-orange-300 bg-orange-50/80";
  return "border-rose-300 bg-rose-50/80";
}

function scoreBgColor(score: number): string {
  if (score >= 9) return "bg-amber-50 text-amber-900 border-amber-300";
  if (score >= 7) return "bg-emerald-50 text-emerald-900 border-emerald-300";
  if (score >= 5) return "bg-slate-50 text-slate-900 border-slate-300";
  if (score >= 3) return "bg-orange-50 text-orange-900 border-orange-300";
  return "bg-rose-50 text-rose-900 border-rose-300";
}

const ELEM_COLOR: Record<string, string> = {
  목:"text-emerald-700", 화:"text-rose-700",
  토:"text-amber-700", 금:"text-slate-600", 수:"text-blue-700",
};

function elementBadgeClass(element: string): string {
  if (element === "목") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (element === "화") return "border-rose-200 bg-rose-50 text-rose-700";
  if (element === "토") return "border-amber-200 bg-amber-50 text-amber-700";
  if (element === "금") return "border-slate-200 bg-slate-50 text-slate-600";
  if (element === "수") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

const ELEM_DIRECTION: Record<string, string> = {
  목:"동(東)", 화:"남(南)", 토:"중앙(中)", 금:"서(西)", 수:"북(北)",
};
const ELEM_LUCKY_COLORS: Record<string, string[]> = {
  목:["청색","녹색"], 화:["적색","주황"], 토:["황색","갈색"], 금:["흰색","금색"], 수:["검정","남색"],
};
const ELEM_DOMAIN_BOOST: Record<string, Record<string, number>> = {
  목:{ 직업:2, 건강:1, 애정:0, 재물:-1 },
  화:{ 애정:2, 직업:1, 건강:-1, 재물:0 },
  토:{ 재물:2, 건강:1, 직업:0, 애정:-1 },
  금:{ 재물:2, 직업:1, 건강:0, 애정:-1 },
  수:{ 직업:2, 건강:1, 재물:0, 애정:0 },
};
function getSubScores(base: number, elem: string) {
  const b = ELEM_DOMAIN_BOOST[elem] ?? { 재물:0, 애정:0, 건강:0, 직업:0 };
  return {
    재물: Math.min(10, Math.max(1, base + (b.재물 ?? 0))),
    애정: Math.min(10, Math.max(1, base + (b.애정 ?? 0))),
    건강: Math.min(10, Math.max(1, base + (b.건강 ?? 0))),
    직업: Math.min(10, Math.max(1, base + (b.직업 ?? 0))),
  };
}

// 10점 종합 점수 + 분야별(재물·애정·건강·직업) 편차를 합쳐 1~100 종합 점수로 환산한다.
// 색/라벨(대길·길·평…)과 정합하면서도 같은 밴드 안에서 날마다 값이 세밀하게 갈린다.
function calcDayScore100(base: number, elem: string): number {
  const s = getSubScores(base, elem);
  const mean = (s.재물 + s.애정 + s.건강 + s.직업) / 4;
  return Math.min(100, Math.max(1, Math.round(mean * 10)));
}

function score100TextColor(score100: number): string {
  if (score100 >= 85) return "text-amber-600";
  if (score100 >= 65) return "text-emerald-600";
  if (score100 >= 45) return "text-slate-600";
  if (score100 >= 25) return "text-orange-600";
  return "text-rose-600";
}

const STEM_DESC: Record<string, string> = {
  갑:"새로운 시작과 리더십의 기운",
  을:"유연함과 적응력의 기운",
  병:"밝음과 활기의 기운",
  정:"따뜻함과 섬세함의 기운",
  무:"안정과 중용의 기운",
  기:"꼼꼼함과 내실의 기운",
  경:"강인함과 개혁의 기운",
  신:"예리함과 정밀함의 기운",
  임:"포용과 지혜의 기운",
  계:"성숙과 정화의 기운",
};
const BRANCH_DESC: Record<string, string> = {
  자:"지혜로운 기운이 흐르는 날",
  축:"인내와 꼼꼼함이 빛나는 날",
  인:"활동적이고 도전적인 날",
  묘:"창의력과 표현력이 풍부한 날",
  진:"다재다능한 변화의 날",
  사:"통찰력과 집중력이 높은 날",
  오:"열정과 추진력이 넘치는 날",
  미:"따뜻함과 배려가 돋보이는 날",
  신:"명석함과 순발력이 뛰어난 날",
  유:"정교함과 심미안이 발휘되는 날",
  술:"의리와 책임감이 강한 날",
  해:"자유로움과 직관력이 살아있는 날",
};
const STEM_INDEX: Record<string, number> = {
  갑: 0, 을: 1, 병: 2, 정: 3, 무: 4, 기: 5, 경: 6, 신: 7, 임: 8, 계: 9,
};
const BRANCH_INDEX: Record<string, number> = {
  자: 0, 축: 1, 인: 2, 묘: 3, 진: 4, 사: 5, 오: 6, 미: 7, 신: 8, 유: 9, 술: 10, 해: 11,
};

const ACTION_GOOD_BY_LABEL: Record<string, string[]> = {
  대길: [
    "새 제안서 제출이나 중요한 발표",
    "프로젝트 킥오프와 역할 정리",
    "파트너십 제안이나 협업 미팅",
    "계약 조건 최종 조율",
    "브랜드 공개·런칭 공지",
    "고객 설득이나 영업 미팅",
    "오랫동안 준비한 안건 결정",
    "대외적으로 존재감을 드러내는 일",
  ],
  길: [
    "중요한 미팅 잡기",
    "계획 발표와 진행 공유",
    "작게라도 새 일 시작하기",
    "도움이 필요한 곳에 협력 요청하기",
    "실행 일정과 우선순위 정리",
    "고객·동료와 후속 연락 이어가기",
    "다음 단계 제안서나 기획안 보내기",
    "막혀 있던 일을 다시 추진하기",
  ],
  평: [
    "루틴 업무와 백로그 정리",
    "공부·복습·문서 읽기",
    "업무 환경 정비와 파일 정리",
    "작은 개선 작업과 유지보수",
    "예산·지출 점검",
    "회의 메모 정리와 후속 액션 적기",
    "반복 작업 자동화 아이디어 정리",
    "몸 상태 챙기며 꾸준히 밀기",
  ],
  주의: [
    "현황 점검과 리스크 체크",
    "서류 초안 검토와 오탈자 수정",
    "일정 완충 시간 확보",
    "중요 결정 전에 한 번 더 확인",
    "미뤄둔 백업·정리·청소",
    "상황 관찰과 데이터 수집",
    "조용한 준비와 사전 학습",
    "작은 단위 테스트와 검증",
  ],
  흉: [
    "휴식과 재충전",
    "불필요한 약속 줄이기",
    "마감보다 컨디션 회복 우선",
    "주변 정리와 마음 정돈",
    "혼자 조용히 생각 정리하기",
    "무리 없는 가벼운 루틴 유지",
    "지출 멈추고 현재 흐름 점검",
    "갈등 거리에서 한 발 물러나기",
  ],
};

const ACTION_AVOID_BY_LABEL: Record<string, string[]> = {
  대길: [
    "기세 좋다고 검토 없이 밀어붙이기",
    "한 번에 너무 많은 약속 잡기",
    "과한 자신감으로 세부 확인 생략",
    "충동적인 올인 투자",
    "과속 일정으로 체력 바닥내기",
  ],
  길: [
    "큰 지출을 즉흥적으로 결정하기",
    "조급한 판단으로 결론 서두르기",
    "검토 없이 당일 계약 확정하기",
    "사소한 말실수로 분위기 깨기",
    "한꺼번에 여러 일을 벌이기",
  ],
  평: [
    "무리한 확장이나 큰 승부",
    "준비 안 된 변화 강행",
    "실력보다 운에 기대는 선택",
    "당장 결과만 보고 방향 틀기",
    "감정 기복에 따라 일정 바꾸기",
  ],
  주의: [
    "중요 계약·서명",
    "큰돈 들어가는 구매",
    "감정 섞인 대립",
    "근거 부족한 투자 판단",
    "즉답을 강요하는 협상",
  ],
  흉: [
    "무리한 행동이나 승부수",
    "갈등이 큰 자리 정면돌파",
    "큰 지출·계약 체결",
    "체력 무시한 야근과 강행군",
    "홧김에 관계를 끊는 말",
  ],
};

const ACTION_GOOD_BY_STEM: Record<string, string[]> = {
  갑: ["첫 발을 떼는 실행", "미래 방향을 정하는 로드맵 작성", "주도권 잡는 제안"],
  을: ["관계 다듬는 조율", "부드러운 협상과 후속 연락", "함께하는 공동 작업"],
  병: ["발표·홍보·브랜딩", "새 사람 만나는 네트워킹", "팀 사기 올리는 커뮤니케이션"],
  정: ["집중력 필요한 깊은 작업", "세밀한 문장 다듬기", "창작·디자인 보정"],
  무: ["중장기 계획 재정비", "자산·시스템 구조 점검", "기반 다지는 의사결정"],
  기: ["문서·서류 정리", "예산과 일정 세부 조정", "꼼꼼한 체크리스트 실행"],
  경: ["미뤄둔 결단", "원칙 세우는 협상", "불필요한 것 정리·정돈"],
  신: ["품질 검수와 수정", "브랜딩·스타일 손보기", "정밀한 검토 작업"],
  임: ["정보 탐색과 시장 조사", "낯선 분야 공부", "시야 넓히는 외부 접촉"],
  계: ["조용한 전략 구상", "내면 정리와 메모", "은근히 준비하는 장기 플랜"],
};

const ACTION_AVOID_BY_BRANCH: Record<string, string[]> = {
  자: ["늦은 밤 감정적으로 연락 보내기", "피곤한 상태에서 중요한 결정하기", "야식·과음으로 리듬 깨기"],
  축: ["답답하다고 억지로 속도 올리기", "준비 없이 새 일 벌이기", "고집으로 조율 막기"],
  인: ["성급하게 결론 내리고 돌진하기", "승부욕으로 관계 거칠게 만들기", "검토 전 선공개하기"],
  묘: ["모호한 말로 기대만 키우기", "눈치만 보며 결정을 미루기", "가벼운 말로 신뢰 흔들기"],
  진: ["범위만 크게 벌리고 수습 못 하기", "지난 문제를 다시 끌고 오기", "완고하게 한 방향만 고집하기"],
  사: ["흥분해서 말 수위 높이기", "비밀·속내를 과하게 드러내기", "휴식 없이 스케줄 꽉 채우기"],
  오: ["과열된 논쟁에 들어가기", "자신감만 믿고 검증 건너뛰기", "위험한 소비나 투기 결정"],
  미: ["결정을 계속 미루기", "배려만 하다 내 일정 놓치기", "집중력 분산시키는 다중작업"],
  신: ["영리한 척 무리수 두기", "검증 안 된 제안을 크게 약속하기", "즉흥 이동·즉흥 투자"],
  유: ["완벽주의로 마감 늦추기", "타인 실수만 집요하게 지적하기", "체면 때문에 무리한 선택하기"],
  술: ["버티다 한 번에 폭발하기", "술자리에서 과한 말 하기", "홧김에 관계 정리 선언하기"],
  해: ["막연한 기대감으로 돈 쓰기", "불분명한 약속 여러 개 잡기", "중요 정보 관리 느슨하게 하기"],
};

const ACTION_GOOD_BY_REL: Record<string, string[]> = {
  인성: ["학습·자격 준비", "멘토와 상담", "중요 결정 전 자료 정리"],
  비겁: ["내 몫 명확히 정리하기", "경쟁 분석", "독립적으로 밀어붙일 일 처리"],
  식상: ["발표·콘텐츠 제작", "아이디어 제안", "피드백 주고받기"],
  재성: ["견적·매출·정산 챙기기", "실속 있는 협상", "수익화 포인트 점검"],
  관살: ["규정·리스크 점검", "보고 체계 정리", "우선순위 재정렬"],
  천간합: ["협업 제안", "관계 회복 대화", "조율이 필요한 미팅"],
  지지육합: ["파트너십 움직임", "실무 협의", "합의안 다듬기"],
  지지반합: ["인맥 연결", "중간자 역할", "함께하는 일정 조율"],
  지지삼합: ["팀플레이", "연합 제안", "여러 사람 모이는 자리"],
  지지방합: ["장기 협력 구조 설계", "조직 정비", "공동 목표 합의"],
  지지암합: ["조용한 협상", "비공개 조율", "속도보다 신뢰 쌓기"],
};

const ACTION_AVOID_BY_REL: Record<string, string[]> = {
  비겁: ["불필요한 비교 의식", "역할 경계 흐린 협업", "자존심 경쟁"],
  식상: ["말이 앞서는 과한 약속", "체력 이상으로 에너지 소모", "감정 섞인 직설"],
  재성: ["욕심 섞인 소비 결정", "단기 수익만 보는 선택", "가격만 보고 품질 무시"],
  관살: ["권위와 정면충돌", "규칙 무시한 강행", "압박감에 휩쓸린 즉답"],
  천간충: ["말 한마디로 판 키우기", "욱해서 결론 내리기", "일정 무리하게 당기기"],
  지지충: ["급한 이동·급한 계약", "갈등 자리 장시간 머물기", "불안정한 상태의 승부수"],
  지지형: ["고집과 집착으로 버티기", "사소한 일에 예민하게 반응하기", "스스로 압박 높이기"],
  지지해: ["오해를 방치하기", "애매한 표현 남기기", "뒤끝 남는 대화"],
  지지원진: ["감정 해석 과잉", "서운함 쌓아두기", "관계 시험하기"],
  지지귀문: ["부정적 상상에 빠지기", "혼자 결론내고 단절하기", "예민한 상태의 큰 결정"],
};

function pickActionItems(pool: string[], count: number, seed: number): string[] {
  if (pool.length <= count) return [...pool];

  const picked: string[] = [];
  for (let step = 0; step < pool.length && picked.length < count; step += 1) {
    const index = (seed + step * 3) % pool.length;
    const item = pool[index];
    if (!picked.includes(item)) {
      picked.push(item);
    }
  }
  return picked;
}

function mergeUniqueActionItems(...groups: string[][]): string[] {
  const merged: string[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (!merged.includes(item)) {
        merged.push(item);
      }
    }
  }
  return merged;
}

function buildScoreAdvice(label: string, stem: string, branch: string, relType?: string | null) {
  const stemIndex = STEM_INDEX[stem] ?? 0;
  const branchIndex = BRANCH_INDEX[branch] ?? 0;
  const relSeed = relType ? relType.length : 0;
  const seed = stemIndex * 11 + branchIndex * 7 + relSeed;

  const good = mergeUniqueActionItems(
    pickActionItems(ACTION_GOOD_BY_LABEL[label] ?? ACTION_GOOD_BY_LABEL["평"], 2, seed),
    pickActionItems(ACTION_GOOD_BY_STEM[stem] ?? ACTION_GOOD_BY_STEM["갑"], 2, seed + 2),
    relType ? pickActionItems(ACTION_GOOD_BY_REL[relType] ?? [], 1, seed + 4) : [],
  ).slice(0, 4);

  const avoid = mergeUniqueActionItems(
    pickActionItems(ACTION_AVOID_BY_LABEL[label] ?? ACTION_AVOID_BY_LABEL["평"], 2, seed + 1),
    pickActionItems(ACTION_AVOID_BY_BRANCH[branch] ?? ACTION_AVOID_BY_BRANCH["자"], 2, seed + 3),
    relType ? pickActionItems(ACTION_AVOID_BY_REL[relType] ?? [], 1, seed + 5) : [],
  ).slice(0, 4);

  return { good, avoid };
}

const REL_WHY: Record<string, string> = {
  인성: "오늘의 오행이 내 일간(日干)을 생(生)하는 구조로, 하늘의 기운이 나를 보호하고 뒷받침합니다. 주변의 도움을 받기 쉽고 심신이 안정되는 좋은 날입니다.",
  비겁: "오늘의 오행이 내 일간과 같은 기운으로 맞부딪힙니다. 경쟁·분산의 흐름이 생기고, 협력보다는 독립 욕구가 강해질 수 있습니다.",
  식상: "내 일간의 기운이 오늘의 오행을 생(生)하며 에너지를 밖으로 쏟아내는 형태입니다. 창의력과 표현력이 올라가지만, 그만큼 체력 소모도 큽니다.",
  재성: "내 일간이 오늘의 오행을 극(剋)하는 구조로, 에너지를 소비해 무언가를 얻으려는 흐름입니다. 재물·성과를 노릴 수 있지만 과욕은 피해야 합니다.",
  관살: "오늘의 오행이 내 일간을 극(剋)하는 구조입니다. 외부 압박·규제·경쟁이 강해지며, 무리하게 맞서기보다 순응하고 기다리는 자세가 유리합니다.",
};

interface SelectedDay {
  dayNum: number;
  dayData: any;
  score: number;
  rel: ReturnType<typeof getElementRelation> | null;
}

const TODAY = getSeoulTodayString();
const TODAY_MONTH = TODAY.slice(0, 7);
const TODAY_DATE = new Date(`${TODAY}T00:00:00`);

export default function ManseryokPage() {
  const today = TODAY_DATE;
  const [currentDate, setCurrentDate] = useState(TODAY_DATE);
  const [selected, setSelected] = useState<SelectedDay | null>(null);
  const { user } = useAuth();
  const { profile: resolvedProfile, profileReady, hasCachedProfile } = useResolvedProfile();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canAccessFutureDates = isAdmin;

  // 관리자 전용: 다른 사람 사주를 조회하면 그 프로필로 만세력을 렌더한다.
  const [adminTarget, setAdminTarget] = useState<AdminLookupTarget | null>(null);
  const [adminLookupOpen, setAdminLookupOpen] = useState(false);
  const activeAdminTarget = isAdmin ? adminTarget : null;
  const profile = activeAdminTarget ? activeAdminTarget.profile : resolvedProfile;

  // 달력 이미지 저장(관리자 전용). 매 렌더마다 재생성돼 현재 연/월을 그대로 읽는다.
  const calendarRef = useRef<HTMLDivElement>(null);
  const [savingImage, setSavingImage] = useState(false);
  const saveCalendarImage = async () => {
    if (!calendarRef.current || savingImage) return;
    setSavingImage(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(calendarRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        // 앱 전역 스타일시트(크로스오리진 웹폰트) 임베드 시 SecurityError가 나고
        // 캡처가 느려진다. 스크린샷은 브라우저 폰트로 충분하므로 폰트 임베드를 건너뛴다.
        skipFonts: true,
      });
      const link = document.createElement("a");
      const who = activeAdminTarget?.profile?.name || (activeAdminTarget ? "person" : "my");
      link.download = `manseryok-${who}-${yearStr}-${monthStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("만세력 이미지 저장 실패:", err);
    } finally {
      setSavingImage(false);
    }
  };

  const yearStr = format(currentDate, "yyyy");
  const monthStr = format(currentDate, "MM");
  const currentMonthKey = `${yearStr}-${monthStr}`;
  const isCurrentMonth = currentMonthKey === TODAY_MONTH;
  const accessScope = canAccessFutureDates ? "privileged" : "standard";
  const myElem = profile?.dayMasterElement ?? null;
  const myStem = profile?.dayMasterStem ?? null;
  const myBranch = profile?.dayMasterBranch ?? null;
  const relationContext = useMemo(() => getProfileRelationContext(profile), [profile]);
  const isPersonalized = Boolean(myElem);
  const personalizationParams = useMemo(() => (
    profile?.dayMasterElement
      ? {
          dayMasterElement: profile.dayMasterElement,
          dayMasterStem: profile.dayMasterStem,
          dayMasterBranch: profile.dayMasterBranch,
          yearStem: profile.yearStem,
          yearBranch: profile.yearBranch,
          monthStem: profile.monthStem,
          monthBranch: profile.monthBranch,
          hourStem: profile.hourStem,
          hourBranch: profile.hourBranch,
        }
      : {}
  ), [profile]);
  const personalizationKey = useMemo(() => (
    profile?.dayMasterElement
      ? [
          profile.dayMasterElement,
          profile.dayMasterStem ?? "",
          profile.dayMasterBranch ?? "",
          profile.yearStem ?? "",
          profile.yearBranch ?? "",
          profile.monthStem ?? "",
          profile.monthBranch ?? "",
          profile.hourStem ?? "",
          profile.hourBranch ?? "",
        ].join(":")
      : "no-profile"
  ), [profile]);
  const shouldLoadManseryok = Boolean(activeAdminTarget) || profileReady || Boolean(profile);

  const { data, isLoading, error } = useGetManseryokMonth(
    { year: yearStr, month: monthStr, ...personalizationParams },
    {
      query: {
        queryKey: ["/api/manseryok/month", { year: yearStr, month: monthStr, personalizationKey }, accessScope],
        enabled: shouldLoadManseryok,
      },
    },
  );

  useEffect(() => {
    if (!canAccessFutureDates && currentMonthKey > TODAY_MONTH) {
      setCurrentDate(TODAY_DATE);
      setSelected(null);
    }
  }, [canAccessFutureDates, currentMonthKey]);

  // 오늘 날짜 자동 선택 (데이터·프로필 로드 후, 현재 달일 때)
  useEffect(() => {
    if (!data?.days || !isCurrentMonth) return;
    const todayNum = today.getDate();
    // 아무것도 선택 안 됐거나, 오늘이 이미 선택돼 있으면 갱신 (다른 날 선택 시엔 덮어쓰지 않음)
    if (selected && selected.dayNum !== todayNum) return;
    const todayStr = `${yearStr}-${monthStr}-${todayNum.toString().padStart(2, "0")}`;
    const todayData = data.days.find((d: any) => d.solar === todayStr);
    if (!todayData) return;
    const score = calcDayScore(todayData, myElem, myStem, myBranch, relationContext);
    const rel = getDayRelation(todayData, myElem, myStem, myBranch, relationContext);
    setSelected({ dayNum: todayNum, dayData: todayData, score, rel });
  }, [
    data,
    isCurrentMonth,
    monthStr,
    selected?.dayNum,
    yearStr,
    myBranch,
    myElem,
    myStem,
    relationContext,
  ]);

  // 미래 '월'을 보고 있던 일반 회원이 접근을 잃으면 선택을 초기화한다.
  // (현재 달의 미래 날짜 선택은 허용하므로 날짜 단위로는 막지 않는다.)
  useEffect(() => {
    if (!selected || canAccessFutureDates) return;
    if (currentMonthKey > TODAY_MONTH) {
      setSelected(null);
    }
  }, [canAccessFutureDates, currentMonthKey]);

  const nextMonth = () => {
    const next = addMonths(currentDate, 1);
    if (!canAccessFutureDates && getMonthKey(next) > TODAY_MONTH) return;
    setCurrentDate(next);
    setSelected(null);
  };
  const prevMonth = () => { setCurrentDate(subMonths(currentDate, 1)); setSelected(null); };
  const nextMonthDisabled = !canAccessFutureDates && currentMonthKey >= TODAY_MONTH;

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getDay(startOfMonth(currentDate));

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const { dayScores, dayScores100 } = useMemo(() => {
    const map: Record<number, number> = {};
    const map100: Record<number, number> = {};
    if (!data) return { dayScores: map, dayScores100: map100 };
    days.forEach(dayNum => {
      const dayStr = dayNum.toString().padStart(2, "0");
      const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
      const dayData = data.days.find((d: any) => d.solar === fullDate);
      if (dayData) {
        const base = calcDayScore(dayData, myElem, myStem, myBranch, relationContext);
        map[dayNum] = base;
        map100[dayNum] = calcDayScore100(base, dayData.dayElement);
      }
    });
    return { dayScores: map, dayScores100: map100 };
  }, [data, monthStr, myBranch, myElem, myStem, relationContext, yearStr]);

  const score100Values = Object.values(dayScores100);
  const avgScore = score100Values.length > 0
    ? Math.round(score100Values.reduce((a, b) => a + b, 0) / score100Values.length)
    : null;
  const bestDay = score100Values.length > 0
    ? Object.entries(dayScores100).reduce((a, b) => Number(a[1]) >= Number(b[1]) ? a : b)
    : null;
  const worstDay = score100Values.length > 0
    ? Object.entries(dayScores100).reduce((a, b) => Number(a[1]) <= Number(b[1]) ? a : b)
    : null;

  function handleDayClick(dayNum: number, dayData: any) {
    if (!dayData) return;
    if (selected?.dayNum === dayNum) { setSelected(null); return; }
    const score = calcDayScore(dayData, myElem, myStem, myBranch, relationContext);
    const rel = getDayRelation(dayData, myElem, myStem, myBranch, relationContext);
    setSelected({ dayNum, dayData, score, rel });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold mb-3">만세력 (萬年曆)</h1>
        <p className="text-muted-foreground">날마다 깃든 우주의 기운과 운세를 달력으로 한눈에 파악하세요.</p>
      </div>

      {/* 내 사주 개인화 배너 */}
      {myElem ? (
        <div className="mb-5 p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center gap-3">
          <UserCircle2 className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="text-primary font-medium">{profile?.name ? `${profile.name}님의` : "내"} 사주 기반으로 분석합니다.</span>
            <span className="text-muted-foreground ml-2">일간 오행: <strong className="text-foreground">{profile?.dayMasterStem} ({myElem})</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <span className="text-yellow-600 font-medium">★ 대길</span>
            <span className="text-emerald-600 font-medium">● 길</span>
            <span className="text-orange-600 font-medium">▲ 주의</span>
          </div>
        </div>
      ) : profileReady ? (
        <div className="mb-5 p-4 rounded-2xl border border-primary/15 bg-primary/3 flex items-center gap-3 text-sm text-muted-foreground">
          <UserCircle2 className="w-5 h-5 shrink-0" />
          <span>{hasCachedProfile ? "최근 계산한 사주 기준으로 개인화 분석을 이어 볼 수 있습니다. 저장 프로필을 만들면 계속 유지됩니다." : "내 사주를 등록하거나 먼저 사주를 계산하면 오행 기운 분석이 달력에 표시됩니다."}</span>
          <Link href="/saju" className="ml-auto text-primary font-medium hover:underline shrink-0">사주 보기 →</Link>
        </div>
      ) : null}

      {/* 요약 카드 */}
      {data && !isLoading && avgScore !== null && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="glass-panel rounded-xl border border-primary/15 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">이달 평균 운세</p>
            <p className="text-2xl font-bold text-primary">{avgScore}</p>
            <p className="text-xs text-muted-foreground">/ 100점</p>
          </div>
          {bestDay && (
            <div className="glass-panel rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-center">
              <p className="text-xs text-yellow-600/70 mb-1 flex items-center justify-center gap-1"><Star className="w-3 h-3" />최고의 날</p>
              <p className="text-lg font-bold text-yellow-700">{monthStr}월 {bestDay[0]}일</p>
              <p className="text-xs text-yellow-600/70">{scoreLabel(Number(bestDay[1]) / 10)} ({bestDay[1]}점)</p>
            </div>
          )}
          {worstDay && (
            <div className="glass-panel rounded-xl border border-slate-400/20 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" />주의의 날</p>
              <p className="text-lg font-bold text-muted-foreground">{monthStr}월 {worstDay[0]}일</p>
              <p className="text-xs text-muted-foreground">{scoreLabel(Number(worstDay[1]) / 10)} ({worstDay[1]}점)</p>
            </div>
          )}
        </div>
      )}

      {/* 관리자 전용 액션 */}
      {isAdmin && (
        <div className="relative mb-3">
          <div className="flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={() => setAdminLookupOpen((open) => !open)}
              title="다른 사람 만세력 조회"
              aria-label="다른 사람 만세력 조회"
              className={cn(
                "h-9 w-9 rounded-full border shadow-sm transition-all flex items-center justify-center",
                adminLookupOpen || activeAdminTarget
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-700"
                  : "border-primary/25 bg-background/80 text-primary hover:bg-primary/10",
              )}
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            {data && (
              <Button variant="outline" size="sm" onClick={saveCalendarImage} disabled={savingImage} className="gap-1.5">
                {savingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
                달력 이미지 저장
              </Button>
            )}
          </div>

          <AnimatePresence>
            {adminLookupOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-12 z-50 w-[min(760px,calc(100vw-2rem))] max-h-[calc(100vh-7rem)] overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => setAdminLookupOpen(false)}
                  title="닫기"
                  aria-label="닫기"
                  className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full border border-amber-500/25 bg-white/85 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
                <AdminPersonLookup
                  active={activeAdminTarget}
                  onLoad={(target) => { setAdminTarget(target); setSelected(null); }}
                  onClear={() => { setAdminTarget(null); setSelected(null); }}
                  className="mb-0 !bg-white shadow-2xl"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Card ref={calendarRef} className="glass-panel border-primary/20 p-4 md:p-6">
        {/* 월 이동 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="text-center">
            {activeAdminTarget && (
              <p className="text-xs text-amber-700 font-medium mb-1">{activeAdminTarget.label}</p>
            )}
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              {yearStr}년 {monthStr}월
            </h2>
            {data && (
              <p className="text-primary mt-1 text-base font-serif tracking-widest">
                {toGanziHanja(data.yearGanzi[0], data.yearGanzi[1])} {toGanziHanja(data.monthGanzi[0], data.monthGanzi[1])}
              </p>
            )}
            {!isCurrentMonth && (
              <button
                onClick={() => { setCurrentDate(TODAY_DATE); setSelected(null); }}
                className="mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              >
                이번달로 이동
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            disabled={nextMonthDisabled}
            className="rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {!canAccessFutureDates && (
          <p className="mb-4 text-center text-xs text-muted-foreground">일반 회원은 다음 달 이후 만세력을 볼 수 없습니다.</p>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">만세력을 펼치는 중입니다...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[240px] rounded-2xl border border-destructive/20 bg-destructive/10 text-center text-destructive">
            <p>{error instanceof Error ? error.message : "만세력을 불러오지 못했습니다."}</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={yearStr + monthStr}
          >
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-2">
              {weekDays.map((day, i) => (
                <div key={day} className={cn(
                  "text-center font-medium pb-2 border-b border-border/50 text-sm",
                  i === 0 ? "text-rose-600" : i === 6 ? "text-blue-600" : "text-slate-500"
                )}>
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="min-h-[94px] md:min-h-[112px]" />
              ))}

              {days.map(dayNum => {
                const dayStr = dayNum.toString().padStart(2, "0");
                const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
                const dayData = data?.days.find((d: any) => d.solar === fullDate);
                const dayOfWeek = (firstDayOfMonth + dayNum - 1) % 7;
                const dateColor = dayOfWeek === 0 ? "text-rose-600" : dayOfWeek === 6 ? "text-blue-600" : "text-slate-900";
                const isTodayDate = fullDate === TODAY;
                // 일반 회원도 현재 달은 미래 날짜까지 전부 조회 가능. 미래 '월'만 관리자 전용.
                const isBlockedFutureDate = !canAccessFutureDates && currentMonthKey > TODAY_MONTH;
                const rel = getDayRelation(dayData, myElem, myStem, myBranch, relationContext);
                const score = dayData ? dayScores[dayNum] : null;
                const score100 = (dayData && score != null) ? calcDayScore100(score, dayData.dayElement) : null;
                const badges = getDayBadges(dayData, score, rel, isPersonalized);
                const isSelected = selected?.dayNum === dayNum;
                const canSelectDay = Boolean(dayData) && !isBlockedFutureDate;

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      if (!canSelectDay) return;
                      handleDayClick(dayNum, dayData);
                    }}
                    disabled={!canSelectDay}
                    className={cn(
                      "min-h-[88px] md:min-h-[112px] p-1.5 rounded-xl border flex flex-col gap-1 md:gap-0 transition-all text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
                      canSelectDay
                        ? "cursor-pointer hover:-translate-y-[1px] hover:shadow-md"
                        : isBlockedFutureDate
                        ? "cursor-not-allowed opacity-55 border-slate-200 bg-slate-50"
                        : "cursor-default opacity-0",
                      isSelected && "ring-2 ring-emerald-500/65",
                      isTodayDate ? "border-amber-400 bg-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.14)]"
                        : canSelectDay && score != null ? scoreCardClass(score)
                        : canSelectDay ? "border-slate-200 bg-white hover:border-slate-300"
                        : undefined,
                    )}
                  >
                    {dayData ? (
                      <>
                        {/* 날짜 */}
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={cn(
                            "text-xs md:text-sm font-semibold leading-none",
                            dateColor,
                            isTodayDate && "bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full"
                          )}>
                            {dayNum}
                          </span>
                        </div>

                        {/* 음력 — 모바일에선 숨김(탭하면 상세에 표시) */}
                        <span className="hidden md:inline text-[9px] text-slate-500 leading-none mb-0.5">
                          {dayData.lunar}
                        </span>

                        {/* 한자 간지 */}
                        <div className={cn(
                          "text-xs md:text-sm font-serif px-1 py-1 rounded-md border text-center tracking-widest leading-none w-full font-semibold",
                          elementBadgeClass(dayData.dayElement)
                        )}>
                          {toGanziHanja(dayData.dayHeavenlyStem, dayData.dayEarthlyBranch)}
                        </div>

                        {score100 != null && (
                          <div className="mt-1 flex w-full items-baseline justify-center gap-0.5 rounded-md bg-white/65 px-0.5 py-0.5 shadow-sm tabular-nums sm:px-1">
                            <span className={cn("text-sm sm:text-base md:text-xl font-black leading-none", score100TextColor(score100))}>
                              {score100}
                            </span>
                            <span className="hidden text-[9px] font-semibold leading-none text-slate-500 sm:inline md:text-[10px]">
                              점
                            </span>
                          </div>
                        )}

                        {/* 절기 */}
                        {dayData.solarTerm && (
                          <div className="text-[8px] md:text-[9px] text-emerald-600 font-semibold leading-none mt-0.5 text-center">
                            {dayData.solarTerm}
                          </div>
                        )}

                        {/* 운세 레이블 + 관계 심볼 */}
                        <div className="flex items-center justify-between gap-0.5 mt-auto pt-0.5">
                          {/* 운세 레이블 — 모바일에선 숨김(점수 색상이 같은 정보 전달) */}
                          {score != null && (
                            <span className={cn("hidden md:inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none whitespace-nowrap shrink-0", scoreBadgeClass(score))}>
                              {scoreLabel(score)}
                            </span>
                          )}
                          {rel && (
                            <span className={cn("text-[9px] md:text-[10px] font-bold ml-auto shrink-0 opacity-90", rel.colorClass)} title={rel.fortune}>
                              {rel.emoji}
                            </span>
                          )}
                        </div>

                        {/* 길일/흉일 점 */}
                        {(badges.lucky || badges.inauspicious || badges.caution || badges.genericLucky || badges.genericCaution) && (
                          <div className="flex gap-0.5">
                            {badges.lucky && <span className="w-1 h-1 rounded-full bg-primary" title={isPersonalized ? "개인 길일" : "길일"} />}
                            {badges.inauspicious && <span className="w-1 h-1 rounded-full bg-destructive" title={isPersonalized ? "개인 흉일" : "흉일"} />}
                            {badges.caution && <span className="w-1 h-1 rounded-full bg-orange-400" title="개인 주의일" />}
                            {badges.genericLucky && <span className="w-1 h-1 rounded-full bg-primary/60" title="공통 길 흐름" />}
                            {badges.genericCaution && <span className="w-1 h-1 rounded-full bg-slate-400" title="공통 주의 흐름" />}
                          </div>
                        )}
                      </>
                    ) : isBlockedFutureDate ? (
                      <>
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={cn("text-xs md:text-sm font-semibold leading-none", dateColor)}>
                            {dayNum}
                          </span>
                        </div>
                        <div className="mt-auto text-[9px] md:text-[10px] text-slate-500 font-medium">
                          미래 날짜
                        </div>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-5">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />대길</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />길</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" />평</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" />주의</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />흉</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />{isPersonalized ? "개인 길일" : "길일"}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />{isPersonalized ? "개인 흉일" : "흉일"}</div>
              {isPersonalized && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />개인 주의일</div>}
              {isPersonalized && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" />공통 주의 흐름</div>}
              {myElem && (
                <>
                  <div className="flex items-center gap-1"><span className="text-emerald-600 font-bold text-xs">★</span> 인성</div>
                  <div className="flex items-center gap-1"><span className="text-rose-600 font-bold text-xs">▲</span> 관살</div>
                  <div className="flex items-center gap-1"><span className="text-amber-600 font-bold text-xs">◆</span> 재성</div>
                  <div className="flex items-center gap-1"><span className="text-blue-600 font-bold text-xs">◎</span> 식상</div>
                  <div className="flex items-center gap-1"><span className="text-yellow-600 font-bold text-xs">◈</span> 비겁</div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </Card>

      {/* 선택한 날 상세 */}
      <AnimatePresence>
        {selected && (() => {
          const sub = getSubScores(selected.score, selected.dayData.dayElement);
          const label = scoreLabel(selected.score);
          const badges = getDayBadges(selected.dayData, selected.score, selected.rel, isPersonalized);
          const actionAdvice = buildScoreAdvice(
            label,
            selected.dayData.dayHeavenlyStem,
            selected.dayData.dayEarthlyBranch,
            selected.rel?.type,
          );
          const direction = ELEM_DIRECTION[selected.dayData.dayElement];
          const luckyColors = ELEM_LUCKY_COLORS[selected.dayData.dayElement] ?? [];
          const branchDesc = BRANCH_DESC[selected.dayData.dayEarthlyBranch] ?? "";
          const stemDesc = STEM_DESC[selected.dayData.dayHeavenlyStem] ?? "";
          const subEntries: { name: string; icon: string; key: keyof typeof sub }[] = [
            { name: "재물운", icon: "💰", key: "재물" },
            { name: "애정운", icon: "💕", key: "애정" },
            { name: "건강운", icon: "🌿", key: "건강" },
            { name: "직업운", icon: "⚡", key: "직업" },
          ];
          return (
            <motion.div
              key={selected.dayNum}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className={cn("mt-4 rounded-2xl border p-5 space-y-4", scoreBgColor(selected.score))}
            >
              {/* ── 헤더: 날짜·간지·점수 ── */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {yearStr}년 {monthStr}월 {selected.dayNum}일
                    {selected.dayData.solarTerm && (
                      <span className="ml-2 text-emerald-600 font-semibold">{selected.dayData.solarTerm}</span>
                    )}
                  </p>
                  <h3 className="font-serif text-2xl font-bold text-foreground leading-tight">
                    {toGanziHanja(selected.dayData.dayHeavenlyStem, selected.dayData.dayEarthlyBranch)}일
                    <span className={cn("text-lg ml-2", ELEM_COLOR[selected.dayData.dayElement] ?? "text-muted-foreground")}>
                      {selected.dayData.dayElement}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{branchDesc}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-3xl font-bold text-foreground leading-none">
                    {calcDayScore100(selected.score, selected.dayData.dayElement)}<span className="text-base text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">종합 점수</p>
                  <p className={cn("text-sm font-bold mt-0.5", scoreTextColor(selected.score))}>
                    {label}
                  </p>
                </div>
              </div>

              {/* ── 전체 점수 바 ── */}
              <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selected.score * 10}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", scoreDotColor(selected.score))}
                />
              </div>

              {/* ── 음력·길흉일·관계 ── */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-3">
                  {badges.lucky && <span className="text-primary font-medium">✦ {isPersonalized ? "개인 길일" : "길일"}</span>}
                  {badges.inauspicious && <span className="text-destructive font-medium">✦ {isPersonalized ? "개인 흉일" : "흉일"}</span>}
                  {badges.caution && <span className="text-orange-700 font-semibold">✦ 개인 주의일</span>}
                  {badges.genericLucky && <span className="text-primary/80 font-semibold">✦ 공통 길 흐름</span>}
                  {badges.genericCaution && <span className="text-slate-600 font-semibold">✦ 공통 주의 흐름</span>}
                  <span>음력 {selected.dayData.lunar}</span>
                </div>
                {selected.rel && (
                  <div className={cn("flex items-center gap-1 font-medium", selected.rel.colorClass)}>
                    <span>{selected.rel.emoji}</span>
                    <span>{selected.rel.label}</span>
                  </div>
                )}
              </div>

              {/* ── 운세 해설 (왜 이런 점수인가) ── */}
              <div className="rounded-xl bg-white/65 px-4 py-3 border border-white/70 space-y-2 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">운세 해설</p>
                {selected.rel ? (
                  <>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {badges.lucky
                        ? "원국과 오늘 일진을 함께 보면 조화와 추진력이 살아나는 개인 길일에 가깝습니다."
                        : badges.inauspicious
                        ? "원국과 오늘 일진의 충돌이 크게 체감되어 개인 흉일로 보는 편이 맞습니다."
                        : badges.caution
                        ? "원국과 오늘 일진을 합쳐 보면 흉일까지는 아니지만, 압박과 꼬임이 섞인 개인 주의일에 가깝습니다."
                        : "원국과 오늘 일진을 함께 보면 공통 길흉보다 개인 체감은 중립에 가깝습니다."}
                      {badges.genericCaution && !badges.inauspicious
                        ? " 전통 분류상으로는 공통 주의 흐름이 있지만, 개인 사주 기준으로는 흉일까지는 아닙니다."
                        : ""}
                      {badges.genericLucky && !badges.lucky
                        ? " 전통 분류상 공통 길 흐름은 있으나, 개인 사주와 합치면 체감은 보통권에 머물 수 있습니다."
                        : ""}
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {selected.rel.why || REL_WHY[selected.rel.type] || ""}
                    </p>
                    <p className={cn("text-xs font-medium leading-relaxed border-t border-slate-200 pt-2", selected.rel.colorClass)}>
                      {selected.rel.emoji} {selected.rel.fortune}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {selected.dayData.luckyDay
                      ? "오늘은 길일(吉日)로 지정된 날입니다. 하늘의 기운이 순조롭게 흘러 중요한 일을 진행하기 좋은 날입니다."
                      : selected.dayData.inauspiciousDay
                      ? "오늘은 흉일(凶日)로 지정된 날입니다. 하늘의 기운이 거스르는 방향으로 흘러 중요한 결정·계약·이사 등은 피하는 것이 좋습니다."
                      : "내 사주를 등록하면 오행 상호작용에 따른 맞춤 운세 해설을 확인할 수 있습니다."}
                  </p>
                )}
                {badges.inauspicious && (
                  <p className="text-[11px] text-rose-700 border-t border-slate-200 pt-2">
                    ※ 개인 흉일 — 중요한 행사·계약·이사·수술 등은 미루고, 충돌 가능성이 큰 결정은 한 박자 늦추세요.
                  </p>
                )}
                {badges.caution && (
                  <p className="text-[11px] text-orange-700 border-t border-slate-200 pt-2">
                    ※ 개인 주의일 — 크게 나쁜 날은 아니지만, 서두르기보다 확인과 조율을 먼저 두는 편이 안전합니다.
                  </p>
                )}
                {badges.lucky && (
                  <p className="text-[11px] text-primary border-t border-slate-200 pt-2">
                    ※ 개인 길일 — 계약·협의·런칭·중요 일정처럼 결과를 만들어야 하는 일을 잡기 좋은 날입니다.
                  </p>
                )}
                {badges.genericCaution && !badges.inauspicious && (
                  <p className="text-[11px] text-slate-600 border-t border-slate-200 pt-2">
                    ※ 공통 주의 흐름 — 전통 만세력상 조심하라는 신호는 있으나, 개인 사주 기준으로는 보조 참고 정도로 보는 편이 맞습니다.
                  </p>
                )}
              </div>

              {/* ── 오늘의 기운 ── */}
              <div className="rounded-xl bg-white/65 px-4 py-3 border border-white/70 shadow-sm">
                <p className="text-xs font-semibold text-slate-700 mb-1">오늘의 기운</p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  <span className={cn("font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{selected.dayData.dayHeavenlyStem}({STEM_HANJA[selected.dayData.dayHeavenlyStem] ?? selected.dayData.dayHeavenlyStem})</span>의 {stemDesc}이 흐르고,{" "}
                  <span className={cn("font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{selected.dayData.dayEarthlyBranch}({BRANCH_HANJA[selected.dayData.dayEarthlyBranch] ?? selected.dayData.dayEarthlyBranch})</span>의 기운으로 {branchDesc.replace("날", "하루입니다")}
                </p>
              </div>

              {/* ── 분야별 운세 ── */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">분야별 운세</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {subEntries.map(({ name, icon, key }) => {
                    const val = sub[key];
                    const pct = val * 10;
                    const barCls = val >= 8 ? "bg-yellow-400" : val >= 6 ? "bg-emerald-400" : val >= 4 ? "bg-slate-400" : "bg-orange-400";
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-700">{icon} {name}</span>
                          <span className="text-xs font-bold text-foreground">{val}/10</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                            className={cn("h-full rounded-full", barCls)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 오늘 일진 기준 길한 방향·색상 ── */}
              <div>
                <p className="text-[10px] text-slate-500 mb-1.5">오늘 일진 기준</p>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl bg-white/65 border border-white/70 px-3 py-2.5 text-center shadow-sm">
                    <p className="text-[10px] text-slate-500 mb-1">길한 방향</p>
                    <p className={cn("text-sm font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{direction}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-white/65 border border-white/70 px-3 py-2.5 text-center shadow-sm">
                    <p className="text-[10px] text-slate-500 mb-1">길한 색상</p>
                    <p className={cn("text-sm font-bold", ELEM_COLOR[selected.dayData.dayElement])}>{luckyColors.join(" · ")}</p>
                  </div>
                </div>
              </div>

              {/* ── 내 사주 기반 행운 (프로필 있는 경우) ── */}
              {profile?.dayMasterElement && (() => {
                const dm = profile.dayMasterElement!;
                const lucky = getStemLucky(profile.dayMasterStem, dm);
                const lnums = lucky.numbers;
                const lcolors = lucky.luckyColors;
                const acolors = lucky.avoidColors;
                const ldir = lucky.luckyDirection;
                const adir = lucky.avoidDirection;
                const litems = lucky.luckyItems;
                return (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 space-y-3">
                    <p className="text-[10px] font-semibold text-primary flex items-center gap-1">
                      <Gem className="w-3 h-3" />
                      {profile.name ? `${profile.name}님` : "내"} 일간 <span className={SAJU_ELEM_COLOR_MAP[dm]}>{profile.dayMasterStem}({SAJU_ELEM_KOR[dm]})</span> 기반 보완 정보
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 참고 숫자 */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" /> 참고 숫자</p>
                        <div className="flex gap-1.5">
                          {lnums.map((n, i) => (
                            <span key={i} className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">{n}</span>
                          ))}
                        </div>
                      </div>
                      {/* 방향 */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Compass className="w-2.5 h-2.5" /> 길방·흉방</p>
                        <p className="text-xs">
                          <span className="text-emerald-600 font-medium">{ldir}</span>
                          <span className="text-muted-foreground mx-1">·</span>
                          <span className="text-rose-600 font-medium">{adir}</span>
                        </p>
                      </div>
                      {/* 색상 */}
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Palette className="w-2.5 h-2.5" /> 보완·주의 색상</p>
                        <div className="flex flex-wrap gap-1">
                          {lcolors.map((c, i) => (
                            <span key={i} className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", SAJU_ELEM_BG[dm], SAJU_ELEM_COLOR_MAP[dm])}>✓ {c}</span>
                          ))}
                          {acolors.map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-full border border-rose-400/30 bg-rose-400/10 text-[10px] text-rose-600">✗ {c}</span>
                          ))}
                        </div>
                      </div>
                      {/* 보완 물건 */}
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-0.5"><Gem className="w-2.5 h-2.5" /> 보완 물건</p>
                        <div className="flex flex-wrap gap-1">
                          {litems.map((item, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-full border border-primary/25 bg-card/60 text-[10px] text-foreground/80">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 추천 / 피할 것 ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-emerald-600 mb-1.5">✔ 하면 좋은 일</p>
                  <ul className="space-y-1">
                    {actionAdvice.good.map(item => (
                      <li key={item} className="text-[11px] text-foreground/80 leading-snug">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-red-600 mb-1.5">✗ 피할 것</p>
                  <ul className="space-y-1">
                    {actionAdvice.avoid.map(item => (
                      <li key={item} className="text-[11px] text-foreground/80 leading-snug">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
