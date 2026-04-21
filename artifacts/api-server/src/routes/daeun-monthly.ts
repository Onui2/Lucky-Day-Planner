import { Router } from "express";
import {
  getSajuYear, getYearPillar, getMonthPillar, getDayPillar, getHourPillar,
  countElements, getYongsin, getTenGod, HEAVENLY_STEMS, EARTHLY_BRANCHES,
  BRANCH_ELEMENTS, STEM_ELEMENTS, getGanzi,
} from "../lib/saju-calculator.js";

const router = Router();

// ─── 공통 상수 ───────────────────────────────────────────────────────────────
const STEM_HANJA: Record<string,string> = { 갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸' };
const BRANCH_HANJA: Record<string,string> = { 자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥' };
const ELEM_KOR = (e: string) => ({ 목:'木',화:'火',토:'土',금:'金',수:'水' }[e] ?? e);
const GENERATES: Record<string,string> = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const CONTROLS:  Record<string,string> = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };

// 지지 육합
const YUKAP: [number,number][] = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
// 지지 육충
const YUKCHUNG: [number,number][] = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
// 지지 삼합 (각 삼합 그룹)
const SAMHAP: number[][] = [[0,4,8],[1,5,9],[2,6,10],[3,7,11]];
// 지지 형
const HYEONG: [number,number][] = [[2,11],[3,10],[6,9],[4,7]]; // 인해, 묘술, 오유, 진미 (단독 형)

// 천간합 인덱스
const STEM_HAP: [number,number][] = [[0,5],[1,6],[2,7],[3,8],[4,9]];

function branchIdx(b: string) { return EARTHLY_BRANCHES.indexOf(b); }
function stemIdx(s: string)   { return HEAVENLY_STEMS.indexOf(s); }

function checkYukHap(a: number, b: number) {
  return YUKAP.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a));
}
function checkYukChung(a: number, b: number) {
  return YUKCHUNG.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a));
}
function checkStemHap(a: number, b: number) {
  return STEM_HAP.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a));
}
function checkHyeong(a: number, b: number) {
  return HYEONG.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a));
}

// ─── 십신 기반 월운 텍스트 ────────────────────────────────────────────────────
const MONGTH_FORTUNE_BY_TENGOD: Record<string, {
  fortune: number; wealth: number; career: number; love: number; health: number;
  summary: string; wealth_text: string; career_text: string; love_text: string; health_text: string;
}> = {
  '비견': {
    fortune:55, wealth:45, career:60, love:50, health:70,
    summary: '독립심과 활동력이 강해지는 달입니다. 경쟁자가 늘어나거나 나와 비슷한 관심사를 가진 이들과 부딪히는 상황이 생깁니다. 재물이 분산되기 쉬우니 충동적 지출에 주의하고, 혼자 독주하기보다 협력을 통해 더 큰 결과를 만드세요.',
    wealth_text: '지출이 늘기 쉽고 투자는 보수적으로. 경쟁으로 인한 이익 기회도 있으나 독주보다 협력이 유리합니다.',
    career_text: '주도적 역할 기회가 많아집니다. 팀 내 경쟁도 있지만 적극 어필하면 인정받을 수 있는 시기.',
    love_text: '독립심이 강해져 상대와 갈등이 생길 수 있습니다. 배려와 공감이 관계를 지키는 열쇠입니다.',
    health_text: '에너지가 넘치지만 무리하면 탈이 납니다. 적절한 휴식과 수면 관리가 중요합니다.',
  },
  '겁재': {
    fortune:48, wealth:35, career:55, love:45, health:60,
    summary: '강한 추진력이 살아나지만, 충동적 결정으로 재물 손실이 생기기 쉬운 달입니다. 새로운 사람과의 거래나 계약은 신중히 검토하세요. 투기나 도박성 투자는 절대 금물입니다. 대신 의지와 배짱으로 막힌 일을 뚫을 기회가 찾아옵니다.',
    wealth_text: '재물 분산·탈재(奪財) 위험. 타인에게 돈을 빌려주거나 보증 서는 것은 이 달에 피하세요.',
    career_text: '담대한 결단이 필요한 상황이 옵니다. 강한 추진력으로 어려운 국면을 돌파할 수 있습니다.',
    love_text: '감정 표현이 직설적으로 흘러 오해를 살 수 있습니다. 상대의 페이스도 배려해 주세요.',
    health_text: '과도한 에너지 소모로 피로 누적. 특히 수면의 질을 관리하는 것이 중요합니다.',
  },
  '식신': {
    fortune:75, wealth:70, career:65, love:72, health:78,
    summary: '풍요롭고 여유로운 기운이 흐르는 좋은 달입니다. 창의력과 표현력이 높아지고 입복(飮食福)이 따릅니다. 새로운 아이디어를 실행에 옮기기 좋은 시기이며, 대인관계에서도 매력이 빛납니다. 재물운이 안정적으로 들어오는 길한 달입니다.',
    wealth_text: '꾸준한 수입과 안정적 재물 흐름. 음식·창작·서비스업 관련 수입 기회가 생깁니다.',
    career_text: '창의적 업무에서 두각을 나타냅니다. 아이디어를 공유하면 인정과 성과가 따라옵니다.',
    love_text: '따뜻하고 여유로운 분위기로 연인·배우자와의 관계가 화목해집니다. 새 인연도 기대됩니다.',
    health_text: '전반적으로 건강하고 활력이 넘칩니다. 맛있는 음식을 즐기되 과식은 주의하세요.',
  },
  '상관': {
    fortune:62, wealth:60, career:50, love:65, health:68,
    summary: '뛰어난 언변과 재능이 빛나지만, 직장이나 공식적인 관계에서 마찰이 생기기 쉬운 달입니다. 규칙을 벗어나려는 욕구가 강해지니 직장인은 윗사람과의 갈등에 주의하세요. 창작·예술·프리랜서 활동은 오히려 날개를 달 수 있는 시기입니다.',
    wealth_text: '자신의 재능을 팔아 수익 창출 가능. 단 불필요한 지출이나 자존심으로 인한 손실 주의.',
    career_text: '관(官)을 상(傷)하게 하는 달. 직장인은 상사와의 갈등에 조심. 자유업자는 성과 기대.',
    love_text: '매력과 표현력이 상승해 이성에게 인기가 높아집니다. 기존 연인과는 솔직한 대화가 중요.',
    health_text: '신경계·호흡기에 주의. 스트레스 관리와 충분한 휴식이 건강을 지킵니다.',
  },
  '편재': {
    fortune:72, wealth:80, career:70, love:75, health:65,
    summary: '적극적인 활동으로 재물과 기회가 늘어나는 역동적인 달입니다. 사업 확장·투자·새로운 수입원 개척에 유리하나, 과욕은 금물입니다. 아버지 또는 윗 어른과의 관계도 재점검하세요. 이성 인연이 새롭게 등장하거나 기존 관계가 활성화됩니다.',
    wealth_text: '적극적 투자와 사업 활동으로 수입 증가. 단 한 번에 너무 크게 베팅하는 것은 위험합니다.',
    career_text: '활발한 비즈니스 활동과 인맥 확장의 시기. 영업·협상·기획에서 뛰어난 성과가 납니다.',
    love_text: '이성에게 매력적으로 보이는 달. 감정이 풍부해지고 새 인연과의 만남이 기대됩니다.',
    health_text: '과로나 스트레스로 체력이 떨어질 수 있습니다. 소화기·위장 건강에 특히 신경 쓰세요.',
  },
  '정재': {
    fortune:78, wealth:82, career:72, love:70, health:74,
    summary: '성실한 노력이 안정적인 수입과 결실로 돌아오는 달입니다. 계획한 일을 차분히 실행하면 예상보다 좋은 성과를 거둡니다. 서두르지 않고 정직하게 일한 것이 이번 달 보상받습니다. 재물 운이 탄탄하며, 남성에게는 배우자와의 관계도 안정됩니다.',
    wealth_text: '꾸준한 노력에 따른 안정적 수입. 저축·부동산·장기 투자에 유리한 달입니다.',
    career_text: '원칙을 지키는 성실한 업무가 상사에게 인정받습니다. 승진·이동 소식이 들려올 수도 있습니다.',
    love_text: '안정적이고 진지한 관계 발전. 이성을 진지하게 만날 기회도 있으며, 결혼 이야기도 가능합니다.',
    health_text: '전반적으로 건강. 규칙적인 생활 습관을 유지하면 더욱 탄탄한 체력을 얻습니다.',
  },
  '편관': {
    fortune:52, wealth:55, career:62, love:48, health:50,
    summary: '강한 압박과 도전이 밀려오는 달입니다. 직장에서 상사의 압박이나 경쟁자의 공격이 늘어날 수 있으며, 법적·관공서 관련 일에 주의가 필요합니다. 그러나 이 시련을 잘 견디면 오히려 능력을 인정받는 기회로 전환됩니다. 충동적 행동은 금물입니다.',
    wealth_text: '지출이 늘고 재물 관리에 긴장감이 요구됩니다. 불필요한 지출과 리스크 큰 투자를 피하세요.',
    career_text: '도전적 상황이 많지만 그 속에서 실력을 입증할 기회. 냉철한 판단으로 대처하면 성과가 납니다.',
    love_text: '감정 기복이 크고 갈등이 생기기 쉽습니다. 상대에게 지배적이거나 강압적이지 않도록 조심하세요.',
    health_text: '사고·부상·갑작스러운 질병에 주의. 무리한 운동이나 과로는 금물입니다.',
  },
  '정관': {
    fortune:80, wealth:72, career:88, love:78, health:76,
    summary: '명예와 직업운이 활짝 열리는 달입니다. 사회적 규범과 원칙을 잘 지키면 인정과 승진이 따라옵니다. 공식적인 자리나 공식 서류 업무에서 좋은 결과가 나옵니다. 대인관계도 원만하고 신뢰를 쌓기 좋은 시기입니다.',
    wealth_text: '안정적이고 합법적인 경로로 수입이 들어옵니다. 규정을 지키는 재테크가 장기적으로 유리합니다.',
    career_text: '가장 좋은 직업운의 달. 승진·인사 이동·중요한 프로젝트 수주 등 경력 전환점이 됩니다.',
    love_text: '성숙하고 진지한 만남이 이루어집니다. 이미 연인이 있다면 관계가 더욱 공식화될 수 있습니다.',
    health_text: '전반적으로 건강하고 안정적. 정기 검진을 받는다면 이달이 좋은 시기입니다.',
  },
  '편인': {
    fortune:60, wealth:55, career:58, love:52, health:64,
    summary: '독특한 직관과 학문적 통찰력이 높아지는 달입니다. 종교·철학·명상·전문 연구 분야에서 두각을 나타낼 수 있습니다. 그러나 식복(食福)과 자녀운이 다소 막힐 수 있으며, 주변의 도움이 갑자기 중단되거나 이상한 방향으로 흐를 수 있습니다. 냉철함을 잃지 마세요.',
    wealth_text: '예상치 않은 출처에서 소득이 생길 수 있습니다. 단 계획되지 않은 지출도 발생하기 쉽습니다.',
    career_text: '전문성과 직관이 빛나는 달. 연구·컨설팅·문서 작업에서 독보적 성과가 날 수 있습니다.',
    love_text: '감정보다 이성이 앞서 냉담해 보일 수 있습니다. 상대에게 따뜻함을 표현하는 노력이 필요합니다.',
    health_text: '신경계·불면증에 주의. 과도한 사색과 걱정을 줄이고 몸을 움직여 에너지를 발산하세요.',
  },
  '정인': {
    fortune:82, wealth:70, career:80, love:74, health:84,
    summary: '학문·문서·귀인의 도움이 풍부한 길한 달입니다. 자격증 시험·입학·이직 등 공식적인 결과가 좋게 나옵니다. 어머니나 스승 같은 윗어른의 지원이 힘이 됩니다. 서류 작업과 계약서 검토는 이달에 진행하면 좋습니다. 내실을 다지는 최적의 시기입니다.',
    wealth_text: '눈앞의 현금보다 미래 자산에 투자하는 것이 유리. 부동산·교육 투자가 좋은 결과를 가져옵니다.',
    career_text: '문서·자격·학위와 관련된 업무가 빛납니다. 중요한 계약이나 승인을 받기 좋은 달입니다.',
    love_text: '진지하고 신뢰 있는 사람과의 만남이 이루어집니다. 배우자나 연인과의 관계도 깊어집니다.',
    health_text: '전반적으로 건강 운이 좋습니다. 규칙적 식사와 적당한 운동으로 체력을 더욱 증진하세요.',
  },
};

// ─── 월운(月運) API ────────────────────────────────────────────────────────────
router.post("/saju/monthly", (req, res) => {
  try {
    const {
      birthYear, birthMonth, birthDay,
      birthHour = -1, gender, calendarType,
      targetYear, targetMonth
    } = req.body;

    if (!birthYear || !birthMonth || !birthDay || !gender) {
      return res.status(400).json({ error: "필수 입력 값이 누락되었습니다." });
    }

    const bYear = Number(birthYear), bMonth = Number(birthMonth), bDay = Number(birthDay);
    const bHour = Number(birthHour);
    const now = new Date();
    const tYear  = Number(targetYear)  || now.getFullYear();
    const tMonth = Number(targetMonth) || (now.getMonth() + 1);

    // 본인 사주
    const sajuYear  = getSajuYear(bYear, bMonth, bDay, Math.max(bHour, 0));
    const yearPillar  = getYearPillar(sajuYear);
    const monthPillar = getMonthPillar(bYear, bMonth, bDay, Math.max(bHour, 0));
    const dayPillar   = getDayPillar(bYear, bMonth, bDay);
    const hourPillar  = bHour >= 0 ? getHourPillar(dayPillar.stemIndex, bHour) : null;
    const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
    const elementBalance = countElements(pillars);
    const dayElement = dayPillar.stemElement;
    const dayStem   = dayPillar.stem;
    const { yongsin } = getYongsin(elementBalance, dayElement);

    // 세운(歲運) — 해당 연도의 년주
    const seunYear = getSajuYear(tYear, 2, 15, 12); // 2/15 — 항상 해당 년 절입 이후
    const seunPillar = getYearPillar(seunYear);

    // 월건(月建) — 해당 월의 월주 (15일 기준)
    const wunPillar = getMonthPillar(tYear, tMonth, 15, 12);

    // 십신 계산
    const seunTG  = getTenGod(dayStem, seunPillar.stem);
    const wunTG   = getTenGod(dayStem, wunPillar.stem);

    // 합충 체크: 세운/월건 지지 vs 일지
    const dayBranchIdx   = branchIdx(dayPillar.branch);
    const seunBranchIdx  = branchIdx(seunPillar.branch);
    const wunBranchIdx   = branchIdx(wunPillar.branch);

    const seunHap  = checkYukHap(dayBranchIdx, seunBranchIdx);
    const seunChung = checkYukChung(dayBranchIdx, seunBranchIdx);
    const wunHap   = checkYukHap(dayBranchIdx, wunBranchIdx);
    const wunChung = checkYukChung(dayBranchIdx, wunBranchIdx);

    // 천간 합충
    const stemHap  = checkStemHap(stemIdx(dayStem), stemIdx(wunPillar.stem));

    // 기본 운세 (십신 기반)
    const base = MONGTH_FORTUNE_BY_TENGOD[wunTG] ?? MONGTH_FORTUNE_BY_TENGOD['비견'];

    // 합충 보정
    let adjustment = 0;
    if (wunHap || stemHap) adjustment += 12;
    if (wunChung) adjustment -= 18;
    if (seunHap)  adjustment += 5;
    if (seunChung) adjustment -= 10;
    // 용신 오행인 날
    if (wunPillar.stemElement === yongsin || wunPillar.branchElement === yongsin) adjustment += 8;

    const clamp = (v: number) => Math.max(10, Math.min(98, v + adjustment));

    // 합충 추가 코멘트
    const hapChungNotes: string[] = [];
    if (wunHap)   hapChungNotes.push(`이번 달 월건 지지(${wunPillar.branch})가 일지(${dayPillar.branch})와 육합(六合)입니다. 협력자·귀인이 나타나 큰 도움을 줍니다.`);
    if (wunChung) hapChungNotes.push(`이번 달 월건 지지(${wunPillar.branch})가 일지(${dayPillar.branch})와 충(沖)입니다. 이동수·갑작스러운 변화에 대비하세요.`);
    if (stemHap)  hapChungNotes.push(`이번 달 월건 천간(${wunPillar.stem})이 일간(${dayStem})과 천간합(天干合)입니다. 조화로운 에너지로 계획이 순탄하게 흘러갑니다.`);
    if (seunChung) hapChungNotes.push(`올해 세운 지지(${seunPillar.branch})가 일지(${dayPillar.branch})와 충입니다. 전반적으로 급격한 변화가 많으니 안정에 집중하세요.`);

    // 용신 운 코멘트
    if (wunPillar.stemElement === yongsin) {
      hapChungNotes.push(`이달 월건 천간이 용신(用神) 오행 ${ELEM_KOR(yongsin)}(${yongsin})입니다. 운의 흐름이 특히 좋은 달입니다.`);
    }

    const monthName = `${tYear}년 ${tMonth}월`;

    return res.json({
      monthName,
      targetYear: tYear,
      targetMonth: tMonth,
      dayStem,
      dayElement,
      dayPillar: { stem: dayPillar.stem, branch: dayPillar.branch },
      seun: {
        stem: seunPillar.stem,
        branch: seunPillar.branch,
        stemHanja: STEM_HANJA[seunPillar.stem] ?? seunPillar.stem,
        branchHanja: BRANCH_HANJA[seunPillar.branch] ?? seunPillar.branch,
        tenGod: seunTG,
        element: seunPillar.stemElement,
        branchElement: seunPillar.branchElement,
      },
      wun: {
        stem: wunPillar.stem,
        branch: wunPillar.branch,
        stemHanja: STEM_HANJA[wunPillar.stem] ?? wunPillar.stem,
        branchHanja: BRANCH_HANJA[wunPillar.branch] ?? wunPillar.branch,
        tenGod: wunTG,
        element: wunPillar.stemElement,
        branchElement: wunPillar.branchElement,
      },
      scores: {
        overall: clamp(base.fortune),
        wealth:  clamp(base.wealth),
        career:  clamp(base.career),
        love:    clamp(base.love),
        health:  clamp(base.health),
      },
      summary: base.summary,
      wealthText: base.wealth_text,
      careerText: base.career_text,
      loveText:   base.love_text,
      healthText: base.health_text,
      hapChungNotes,
      interactions: {
        wunHap, wunChung, stemHap, seunHap, seunChung,
      }
    });
  } catch (err) {
    console.error("Monthly fortune error:", err);
    return res.status(500).json({ error: "월운 계산 중 오류가 발생했습니다." });
  }
});

// ─── 길일(吉日) 달력 API ───────────────────────────────────────────────────────
// 목적별 가중 설정
const PURPOSE_WEIGHTS: Record<string, { elemBonus: string[]; elemPenalty: string[]; hapBonus: number; chungPenalty: number; label: string }> = {
  '이사':    { elemBonus:['토'], elemPenalty:['수'], hapBonus: 15, chungPenalty: 25, label:'이사·입주' },
  '개업':    { elemBonus:['목','금'], elemPenalty:[], hapBonus: 20, chungPenalty: 20, label:'개업·창업' },
  '결혼':    { elemBonus:['화','금'], elemPenalty:[], hapBonus: 25, chungPenalty: 30, label:'결혼·약혼' },
  '계약':    { elemBonus:['금'], elemPenalty:['화'], hapBonus: 15, chungPenalty: 20, label:'계약·서류' },
  '공부':    { elemBonus:['수','목'], elemPenalty:[], hapBonus: 12, chungPenalty: 15, label:'학업·시험' },
  '여행':    { elemBonus:['목','수'], elemPenalty:[], hapBonus: 10, chungPenalty: 22, label:'여행·이동' },
  '건강':    { elemBonus:['토','금'], elemPenalty:['화'], hapBonus: 12, chungPenalty: 18, label:'병원·수술' },
  '투자':    { elemBonus:['금','목'], elemPenalty:[], hapBonus: 18, chungPenalty: 20, label:'투자·재무' },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

router.get("/fortune/lucky-days", (req, res) => {
  try {
    const {
      birthYear, birthMonth, birthDay, birthHour = '-1',
      gender, year, month, purpose = '이사'
    } = req.query as Record<string, string>;

    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).json({ error: "생년월일이 필요합니다." });
    }

    const bYear = Number(birthYear), bMonth = Number(birthMonth), bDay = Number(birthDay), bHour = Number(birthHour);
    const tYear  = Number(year)  || new Date().getFullYear();
    const tMonth = Number(month) || (new Date().getMonth() + 1);

    const sajuYear   = getSajuYear(bYear, bMonth, bDay, Math.max(bHour, 0));
    const yearPillar = getYearPillar(sajuYear);
    const bMonthPillar = getMonthPillar(bYear, bMonth, bDay, Math.max(bHour, 0));
    const dayPillar  = getDayPillar(bYear, bMonth, bDay);
    const hourPillar = bHour >= 0 ? getHourPillar(dayPillar.stemIndex, bHour) : null;
    const pillars    = [yearPillar, bMonthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
    const elementBalance = countElements(pillars);
    const dayElement = dayPillar.stemElement;
    const { yongsin, geesin } = getYongsin(elementBalance, dayElement);

    const pw = PURPOSE_WEIGHTS[purpose] ?? PURPOSE_WEIGHTS['이사'];
    const daysInMonth = getDaysInMonth(tYear, tMonth);

    const dayBranchIdx  = branchIdx(dayPillar.branch);
    const yearBranchIdx = branchIdx(yearPillar.branch);

    const results = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dp  = getDayPillar(tYear, tMonth, d);
      const dbIdx = branchIdx(dp.branch);
      const dsIdx = stemIdx(dp.stem);

      let score = 50;
      const tags: string[] = [];

      // 용신 오행 보너스
      if (dp.stemElement === yongsin || dp.branchElement === yongsin) { score += 18; tags.push(`용신(${ELEM_KOR(yongsin)})일`); }
      // 기신 오행 패널티
      if (dp.stemElement === geesin || dp.branchElement === geesin)   { score -= 15; tags.push(`기신(${ELEM_KOR(geesin)})일`); }

      // 지지 합 with 일지
      if (checkYukHap(dayBranchIdx, dbIdx)) { score += pw.hapBonus; tags.push('일지 육합'); }
      // 천간 합 with 일간
      if (checkStemHap(stemIdx(dayPillar.stem), dsIdx)) { score += 14; tags.push('일간 천간합'); }
      // 지지 충 with 일지
      if (checkYukChung(dayBranchIdx, dbIdx)) { score -= pw.chungPenalty; tags.push('일지 충'); }
      // 형
      if (checkHyeong(dayBranchIdx, dbIdx)) { score -= 12; tags.push('형(刑)'); }
      // 태세 충 (year pillar branch vs target day branch)
      if (checkYukChung(yearBranchIdx, dbIdx)) { score -= 15; tags.push('태세충'); }
      // 태세 합
      if (checkYukHap(yearBranchIdx, dbIdx)) { score += 8; tags.push('태세합'); }

      // 오행 생(生): target day element generates day master element
      if (GENERATES[dp.stemElement] === dayElement) { score += 10; tags.push(`${ELEM_KOR(dp.stemElement)} 생 ${ELEM_KOR(dayElement)}`); }
      // 오행 극(克): target day element克日干
      if (CONTROLS[dp.stemElement] === dayElement) { score -= 12; tags.push('일간 극'); }
      // 일간이 극하는 날
      if (CONTROLS[dayElement] === dp.stemElement) { score += 8; tags.push('일간이 극하는 날'); }

      // 목적별 보너스/패널티
      for (const e of pw.elemBonus) {
        if (dp.stemElement === e || dp.branchElement === e) { score += 12; tags.push(`${pw.label}에 좋은 ${ELEM_KOR(e)}일`); break; }
      }
      for (const e of pw.elemPenalty) {
        if (dp.stemElement === e || dp.branchElement === e) { score -= 10; break; }
      }

      // 같은 간지 (비견일) — 중립
      if (dp.stem === dayPillar.stem && dp.branch === dayPillar.branch) { score += 5; tags.push('일주 동일'); }

      score = Math.max(5, Math.min(99, score));

      // 길흉 등급
      let grade: '대길' | '길' | '보통' | '흉' | '대흉';
      if (score >= 80)       grade = '대길';
      else if (score >= 65)  grade = '길';
      else if (score >= 45)  grade = '보통';
      else if (score >= 30)  grade = '흉';
      else                   grade = '대흉';

      // 요일
      const dow = new Date(tYear, tMonth - 1, d).getDay();
      const dowKr = ['일','월','화','수','목','금','토'][dow];

      results.push({
        day: d,
        dayOfWeek: dowKr,
        ganzi: dp.stem + dp.branch,
        ganziHanja: (STEM_HANJA[dp.stem] ?? dp.stem) + (BRANCH_HANJA[dp.branch] ?? dp.branch),
        stemElement: dp.stemElement,
        branchElement: dp.branchElement,
        score,
        grade,
        tags: tags.slice(0, 3),
        isWeekend: dow === 0 || dow === 6,
      });
    }

    // 상위 5개 추천 날
    const topDays = [...results]
      .filter(r => r.grade === '대길' || r.grade === '길')
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.day);

    return res.json({
      year: tYear,
      month: tMonth,
      purpose,
      purposeLabel: pw.label,
      dayMasterStem: dayPillar.stem,
      dayMasterElement: dayElement,
      yongsin,
      days: results,
      topDays,
    });
  } catch (err) {
    console.error("Lucky days error:", err);
    return res.status(500).json({ error: "길일 계산 중 오류가 발생했습니다." });
  }
});

export default router;
