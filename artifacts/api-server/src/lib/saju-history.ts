import type { SajuHistoryEvidence, SajuHistoryResult, SajuHistoryYear } from "@workspace/api-zod";
import { BirthResolutionError, resolveBirthInput } from "./birth-resolution.js";
import type { SajuBirthInput } from "./saju-result.js";
import {
  countElements,
  getDaeun,
  getDayPillar,
  getHourPillar,
  getLuckFlowAnalysis,
  getMonthPillar,
  getSajuYear,
  getYearPillar,
  getYongsin,
  type AnnualLuckFlow,
  type LuckFlowInteraction,
  type TenGodName,
} from "./saju-calculator.js";

// Childhood readings describe home/school experience, never adult work or marriage.
const LIFE_THEMES: Record<TenGodName, [string, string, string]> = {
  비견: ["자기표현·또래", "자립·친구", "자립·동료"],
  겁재: ["또래 관계·양보", "경쟁·친구 관계", "경쟁·협업"],
  식신: ["놀이·생활 리듬", "재능·꾸준한 연습", "생산·창작"],
  상관: ["호기심·표현", "표현·규칙과의 마찰", "표현·변화"],
  편재: ["새로운 환경·경험", "새로운 활동·경험", "활동 범위·기회"],
  정재: ["생활 안정·습관", "생활 습관·목표 관리", "재정·생활 기반"],
  편관: ["규칙·긴장", "평가·학업 부담", "도전·책임 부담"],
  정관: ["규칙·적응", "학업·역할", "직업·사회적 역할"],
  편인: ["낯선 환경·민감함", "관심사 변화·혼자만의 시간", "관심사·방향 전환"],
  정인: ["돌봄·배움", "학습·주변의 도움", "학습·문서·지원"],
};

function themeFor(god: TenGodName, age: number): string {
  return LIFE_THEMES[god][age < 7 ? 0 : age < 20 ? 1 : 2];
}

function domainFor(target: LuckFlowInteraction["target"], age: number): string {
  const child = age < 20;
  switch (target) {
    case "연주": return child ? "가정·양육 환경" : "가족·사회적 기반";
    case "월주": return age < 7 ? "보호자·생활 규칙" : child ? "학교·학업·선생님" : "일·소속·사회적 역할";
    case "일주": return child ? "자기표현·친구 관계" : "자기 선택·가까운 관계";
    case "시주": return child ? "관심사·성장 과정" : "장기 목표·후배·가족 돌봄";
    case "대운": return "당시의 전반적인 생활환경";
  }
}

const INTERACTION_READING: Record<LuckFlowInteraction["type"], string> = {
  천간합: "생각을 맞추거나 도움을 주고받는 연결",
  천간충: "생각·계획의 충돌과 방향 조정",
  지지육합: "협력과 관계의 연결",
  지지충: "환경·관계의 이동이나 변화",
  지지형: "반복되는 긴장과 적응 부담",
  지지자형: "같은 고민이나 행동의 반복",
  지지파: "익숙한 약속·생활 구조의 재조정",
  지지해: "기대의 어긋남이나 지연",
};

function buildYearReading(
  flow: AnnualLuckFlow,
  birthYear: number,
  currentYear: number,
  daeun: ReturnType<typeof getDaeun>,
  yongsin: ReturnType<typeof getYongsin>,
): SajuHistoryYear {
  const age = flow.year - birthYear;
  const isCurrent = flow.year === currentYear;
  const themes = [...new Set([themeFor(flow.stemTenGod, age), themeFor(flow.branchTenGod, age)])];
  const pressure = flow.interactions.filter((item) => !item.positive).sort((a, b) => a.score - b.score)[0];
  const support = flow.interactions.find((item) => item.positive);
  const mainDomain = pressure ? domainFor(pressure.target, age) : themes[0];
  const difficult = flow.score < 45;
  const favorable = flow.score >= 60;
  const headline = isCurrent
    ? `${themes[0]} 흐름을 살펴보는 올해`
    : difficult ? `${mainDomain}에서 부담과 조정이 컸을 수 있는 해`
      : favorable ? `${themes[0]}에서 도움과 기회가 있었을 수 있는 해`
        : `${themes[0]}를 중심으로 경험을 쌓았을 수 있는 해`;

  const reading = difficult
    ? `${mainDomain}에서 기대와 현실의 차이를 느끼거나, 익숙한 방식에 적응 부담이 커졌을 수 있습니다.`
    : favorable
      ? `${themes.join(", ")} 쪽에서 주변의 도움을 받거나 시도한 일이 비교적 수월하게 이어졌을 수 있습니다.`
      : `${themes.join(", ")}를 중심으로 안정과 조정이 함께 나타났을 수 있습니다.`;
  const nuance = difficult && support
    ? `그 안에서도 ${domainFor(support.target, age)}에는 도움과 연결의 신호가 함께 있습니다.`
    : favorable && pressure
      ? `다만 ${mainDomain}에는 별도의 긴장 신호도 있어, 모든 영역이 편했음을 뜻하지는 않습니다.`
      : "같은 흐름도 실제 환경과 선택에 따라 다르게 경험할 수 있습니다.";

  const evidence: SajuHistoryEvidence[] = [
    {
      label: `세운 ${flow.stem}${flow.branch} · ${flow.stemTenGod}/${flow.branchTenGod}`,
      detail: `천간·지지 본기의 십신을 이 나이대의 ${themes.join(", ")} 주제로 해석했습니다.`,
      kind: "context",
    },
  ];
  for (const [label, element] of [["천간", flow.stemElement], ["지지", flow.branchElement]]) {
    const role = element === yongsin.yongsin ? "용신" : element === yongsin.heegsin ? "희신" : element === yongsin.geesin ? "기신" : null;
    if (!role) continue;
    evidence.push({
      label: `세운 ${label} ${element} · ${role}`,
      detail: role === "기신"
        ? `${element} 기운을 부담·조정의 참고 요인으로 반영했습니다.`
        : `${element} 기운을 균형 보완과 도움의 참고 요인으로 반영했습니다.`,
      kind: role === "기신" ? "caution" : "support",
    });
  }
  const period = daeun.periods.find((item) => item.idx === flow.daeunIndex);
  evidence.push({
    label: period ? `${period.stem}${period.branch} 대운` : "첫 대운 이전",
    detail: period
      ? `${period.startDate}~${period.endDate} 대운과 세운의 작용을 함께 반영했습니다.`
      : "첫 대운이 시작되기 전 구간으로, 원국과 세운 중심으로 읽습니다.",
    kind: "context",
  });
  for (const interaction of flow.interactions) {
    evidence.push({
      label: `${interaction.type} · ${interaction.target}`,
      detail: `${domainFor(interaction.target, age)}에서 ${INTERACTION_READING[interaction.type]} 신호로 해석했습니다.`,
      kind: interaction.positive ? "support" : "caution",
    });
  }

  const transitionPeriod = daeun.periods.find((item) => item.startYear === flow.year);
  const transition = transitionPeriod
    ? `${transitionPeriod.startDate} 전후 ${transitionPeriod.stem}${transitionPeriod.branch} ${transitionPeriod.idx === 1 ? "첫 대운 시작" : "대운 진입"}. 전환일 전후에는 앞뒤 흐름을 함께 비교합니다.`
    : null;
  const reviewPoints = age < 7
    ? ["당시 거주지·돌봄 방식·보호자와의 생활이 달라졌는지 가족 기록과 비교해보세요.", "놀이·생활 습관과 또래 관계에서 편했던 점과 어려웠던 점을 함께 살펴보세요."]
    : age < 20
      ? ["학교·학업·친구 관계의 실제 변화와 당시 기억을 비교해보세요.", "가족·선생님의 도움과 평가·경쟁에서 느낀 부담을 함께 살펴보세요."]
      : ["일·소속·거주지·가까운 관계에서 실제로 바뀐 점과 비교해보세요.", "성과나 도움을 받은 일과 부담·지연을 겪은 일을 함께 살펴보세요."];

  return {
    year: flow.year,
    age,
    isCurrent,
    ganzi: `${flow.stem}${flow.branch}`,
    daeunLabel: flow.daeunLabel,
    score: flow.score,
    level: isCurrent ? "진행 중" : difficult ? "부담·조정" : favorable ? "도움·기회" : "안정·혼재",
    headline,
    summary: isCurrent
      ? `올해는 아직 진행 중입니다. ${themes.join(", ")}가 주요 주제이며, 현재까지의 경험만 대조합니다. 연간 참고 흐름은 ${flow.level}입니다.`
      : `${reading} ${nuance}`,
    themes,
    reviewPoints,
    evidence,
    transition,
  };
}

export function buildSajuHistory(input: SajuBirthInput, now = new Date()): SajuHistoryResult {
  const today = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const currentYear = Number(today.year);
  const basis = resolveBirthInput(input);
  const solar = basis.solarDate;
  if (Date.UTC(solar.year, solar.month - 1, solar.day) > Date.UTC(currentYear, Number(today.month) - 1, Number(today.day))) {
    throw new BirthResolutionError("과거 흐름은 오늘 이전의 출생일로 분석해주세요.");
  }
  const { year, month, day, hour, minute } = basis.adjusted;
  const yearPillar = getYearPillar(getSajuYear(year, month, day, hour, minute));
  const monthPillar = getMonthPillar(year, month, day, hour, minute);
  const dayPillar = getDayPillar(basis.dayPillarDate.year, basis.dayPillarDate.month, basis.dayPillarDate.day);
  const hourPillar = hour >= 0 ? getHourPillar(dayPillar.stemIndex, hour) : null;
  const elements = countElements([yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])]);
  const yongsin = getYongsin(elements, dayPillar.stemElement);
  // Keep the existing eight-period default elsewhere; cover older people here too.
  const daeun = getDaeun(year, month, day, input.gender, yearPillar, monthPillar, hour, minute,
    Math.max(8, Math.ceil((currentYear - year + 1) / 10) + 1));
  const annual: AnnualLuckFlow[] = [];
  // Reuse the same scoring as the future reading, in its supported 20-year windows.
  for (let start = solar.year; start <= currentYear; start += 20) {
    const flow = getLuckFlowAnalysis(year, dayPillar.stem, yearPillar, monthPillar, dayPillar,
      hourPillar, daeun, yongsin, start, Math.min(20, currentYear - start + 1));
    annual.push(...flow.annual);
  }
  const years = annual.map((flow) => buildYearReading(flow, solar.year, currentYear, daeun, yongsin));
  const past = years.filter((item) => !item.isCurrent);
  const difficultYears = past.filter((item) => item.score < 45)
    .sort((a, b) => a.score - b.score || a.year - b.year).slice(0, 3).map((item) => item.year).sort((a, b) => a - b);
  const favorableYears = past.filter((item) => item.score >= 60)
    .sort((a, b) => b.score - a.score || a.year - b.year).slice(0, 3).map((item) => item.year).sort((a, b) => a - b);
  const transitionYears = past.filter((item) => item.transition).map((item) => item.year);
  const periods: SajuHistoryResult["periods"] = [];
  for (let offset = 0; offset < years.length; offset += 10) {
    const group = years.slice(offset, offset + 10);
    const completed = group.filter((item) => !item.isCurrent);
    const difficultCount = completed.filter((item) => item.score < 45).length;
    const favorableCount = completed.filter((item) => item.score >= 60).length;
    periods.push({
      startAge: group[0].age,
      endAge: group[group.length - 1].age,
      startYear: group[0].year,
      endYear: group[group.length - 1].year,
      title: offset === 0 ? "어린 시절" : offset === 10 ? "10대 · 성장기" : `${offset}대`,
      summary: completed.length
        ? `지난 ${completed.length}개 연도 중 부담·조정 신호 ${difficultCount}년, 도움·기회 신호 ${favorableCount}년입니다.${group.some((item) => item.isCurrent) ? " 올해는 진행 중으로 집계에서 제외했습니다." : ""}`
        : "출생한 해가 진행 중입니다. 아직 지난 연도는 없습니다.",
    });
  }

  return {
    birthYear: solar.year,
    currentYear,
    asOfDate: `${today.year}-${today.month}-${today.day}`,
    birthTimeKnown: hour >= 0,
    summary: `${solar.year}년 출생부터 ${currentYear}년 현재까지, 어린 시절과 성장 과정의 흐름을 연도별로 살펴봅니다. 당시 경험과 대조하기 위한 사주 해석이며, 실제 사건이 있었다고 단정하지 않습니다.`,
    ageNote: "나이는 해당 연도 − 양력 출생 연도로 표시합니다. 생일에 따른 만 나이와는 다를 수 있습니다.",
    methodNote: "기존 분석과 같은 용신·희신·기신, 대운·세운 십신, 원국·대운의 합충형파해를 반영했습니다. 점수는 해석용 참고값이며 실제 행복·불행의 측정값이 아닙니다. 연도별 대운은 기존 대운 나이 구간 기준이며 전환일 전후는 앞뒤 대운을 함께 봅니다. 세운은 입춘 기준이므로 연초 경험은 전년도 흐름과도 대조하세요.",
    years,
    periods,
    difficultYears,
    favorableYears,
    transitionYears,
  };
}
