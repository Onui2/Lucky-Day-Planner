import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Star, Search } from "lucide-react";

interface SinsalInfo {
  name: string; hanja: string; icon: string; category: string;
  summary: string; description: string; positive: string; caution: string;
  careers: string[]; advice: string; myth: string;
}

const SINSALS: SinsalInfo[] = [
  {
    name: '천을귀인', hanja: '天乙貴人', icon: '⭐', category: '길신',
    summary: '하늘이 내린 최고의 귀인성(貴人星)',
    description: '천을귀인(天乙貴人)은 사주 십신성(十神星) 중에서도 최고의 길성(吉星)으로 꼽힙니다. 일간(日干)을 기준으로 특정 지지(地支)에 위치할 때 이 별이 작동하며, 어떤 어려운 상황에서도 귀인(貴人)이 나타나 도움을 주는 신비로운 인연의 힘입니다. 평생을 통해 위기 때마다 반드시 구원의 손길이 찾아온다고 전해집니다.',
    positive: '귀인과의 인연이 평생 지속됩니다. 사회적으로 도움을 주는 사람들을 자연스럽게 끌어당기며, 어려운 국면에서도 의외의 지원자가 나타납니다. 명예·진급·자격 취득에도 유리한 에너지가 흐릅니다.',
    caution: '천을귀인이 형(刑)·충(沖)·공망(空亡)을 당하면 귀인의 도움이 막히거나, 도움을 주는 척하다 배신하는 인물을 만날 수 있습니다. 지나친 의존보다는 스스로의 노력이 귀인의 힘을 더 크게 활성화합니다.',
    careers: ['정치인', '법조인', '교육자', '상담사', '의료인', '사회 지도자'],
    advice: '귀인 인연을 소중히 여기고, 자신도 주변에 귀인이 되어주는 사람이 되세요. 인맥 관리와 신뢰 쌓기에 집중하면 천을귀인의 힘이 더욱 강해집니다.',
    myth: '갑(甲)·무(戊) 일간은 축(丑)·미(未), 을(乙)·기(己) 일간은 자(子)·신(申), 병(丙)·정(丁) 일간은 해(亥)·유(酉), 경(庚)·신(辛) 일간은 오(午)·인(寅), 임(壬)·계(癸) 일간은 사(巳)·묘(卯)에 위치할 때 발동합니다.'
  },
  {
    name: '도화살', hanja: '桃花殺', icon: '🌸', category: '반길반흉',
    summary: '이성을 매혹시키는 복숭아꽃의 기운',
    description: '도화살(桃花殺)은 사주 내에서 타인을 매혹시키는 강렬한 매력의 기운입니다. 복숭아꽃처럼 아름답고 화사하여 주변 사람을 끌어당기는 힘을 의미합니다. 예술·연예·방송·서비스업에서 특히 빛나는 재능으로 작용하며, 인기를 끌고 대중의 사랑을 받는 에너지입니다.',
    positive: '사교적이고 매력적인 성품으로 어디서든 주목을 받습니다. 예술·패션·미용·방송 등 외모와 개성이 중요한 분야에서 큰 성공을 거둡니다. 인간관계가 풍부하고 대인관계에서 강점을 발휘합니다.',
    caution: '이성 관계에서 구설수와 색정살(色情殺)의 기운이 따를 수 있습니다. 이성에게 지나치게 의존하거나 방탕한 생활로 이어질 수 있으므로, 도화살이 강할수록 감정 관리와 절제가 필요합니다. 연예인 중 스캔들이 많은 경우 도화살이 과하게 발동되기도 합니다.',
    careers: ['연예인', '방송인', '패션 디자이너', '미용사', '서비스업', '모델', '배우', '가수'],
    advice: '도화살의 매력을 예술·창작 등 건강한 방향으로 승화시키면 큰 성공을 거둡니다. 이성 관계에서는 신중함을 유지하고, 외모와 매력을 사회적으로 유익한 방향으로 활용하세요.',
    myth: '년지(年支) 또는 일지(日支)가 삼합 그룹의 목욕(沐浴) 지지에 해당할 때 발동합니다. 申子辰 → 酉, 寅午戌 → 卯, 巳酉丑 → 午, 亥卯未 → 子'
  },
  {
    name: '역마살', hanja: '驛馬殺', icon: '🐎', category: '동살',
    summary: '끊임없이 움직이고 이동하는 역마의 기운',
    description: '역마살(驛馬殺)은 옛날 역마(驛馬), 즉 파발마(派撥馬)처럼 쉬지 않고 이동하는 에너지를 상징합니다. 한 곳에 정착하기 어렵고 새로운 곳을 향해 끊임없이 움직이는 성질이 있습니다. 현대에는 해외 여행·이민·출장·이사·무역·영업 등의 형태로 발현됩니다.',
    positive: '글로벌 감각과 광범위한 인맥을 바탕으로 해외 활동, 무역, 여행 관련 분야에서 두각을 나타냅니다. 새로운 환경에 빠르게 적응하는 능력이 탁월하며, 다양한 경험을 통해 폭넓은 시각을 갖게 됩니다. 역마살이 길신(吉神)과 결합하면 사업 확장과 성공적인 이동운이 됩니다.',
    caution: '잦은 이사, 직업 변경, 해외 출장으로 가정 생활이 불안정해질 수 있습니다. 역마살이 흉신(凶神)과 결합하면 사고·이별·유배 등 원치 않는 이동이 발생할 수 있습니다. 한 곳에 뿌리를 내리고 깊이 있는 관계를 맺는 노력이 필요합니다.',
    careers: ['무역업자', '여행 가이드', '항공 승무원', '외교관', '영업직', '운전직', '이민 컨설턴트', '해외 투자자'],
    advice: '역마살의 에너지를 자발적인 도전과 개척에 활용하세요. 정착을 두려워하지 말고, 이동과 탐험을 통해 더 큰 세계를 만나는 선물로 받아들이면 큰 성취를 이룹니다.',
    myth: '申子辰 → 寅, 寅午戌 → 申, 巳酉丑 → 亥, 亥卯未 → 巳. 년지(年支) 또는 일지(日支)를 기준으로 계산합니다.'
  },
  {
    name: '화개살', hanja: '華蓋殺', icon: '🎭', category: '예술살',
    summary: '예술·종교·철학을 향한 내면의 별',
    description: '화개살(華蓋殺)은 화려한 덮개(蓋)처럼 자신만의 독창적인 세계를 구축하고 싶어하는 에너지입니다. 예술적 감수성, 종교적 직관, 철학적 탐구심이 강하며, 고독을 통해 오히려 빛나는 성품을 지닙니다. 혼자 있는 시간을 통해 창의성이 꽃피는 유형입니다.',
    positive: '독창적인 예술 세계, 깊은 종교적 믿음, 철학적 사유 능력이 탁월합니다. 스스로의 세계에서 독보적인 경지를 이룰 수 있으며, 예술·학문·종교 분야에서 후대에 남을 업적을 쌓습니다. 직관력과 영감이 뛰어납니다.',
    caution: '화개살이 강하면 타인과의 관계가 원만하지 않을 수 있으며, 외로움과 고독감을 느끼기 쉽습니다. 세상과 단절된 채 자신만의 세계에 갇히는 경향이 있어, 사회성을 키우는 노력이 필요합니다. 연애·결혼 관계에서도 고독한 면이 나타날 수 있습니다.',
    careers: ['화가', '작가', '종교인', '철학자', '무속인', '명상 지도자', '골동품 전문가', '연구자'],
    advice: '화개살의 예술적 감수성과 철학적 깊이를 세상과 나누세요. 고독을 창작의 원천으로 삼되, 사회와의 연결 고리도 꾸준히 유지하면 더 큰 영향력을 발휘할 수 있습니다.',
    myth: '申子辰 → 辰, 寅午戌 → 戌, 巳酉丑 → 丑, 亥卯未 → 未. 화개살도 년지(年支) 또는 일지(日支)를 기준으로 계산합니다.'
  },
  {
    name: '양인살', hanja: '羊刃殺', icon: '⚔️', category: '강맹살',
    summary: '강렬한 의지와 저돌적 추진력의 칼날',
    description: '양인살(羊刃殺)은 문자 그대로 양(羊)의 칼날처럼 날카롭고 강렬한 에너지입니다. 양간(陽干, 甲·丙·戊·庚·壬)에만 해당하며, 일간의 건록(建祿)보다 한 단계 더 나아간 극강의 기운입니다. 군인·경찰·의사·운동선수처럼 강한 의지와 체력이 필요한 분야에서 빛나지만, 통제되지 않으면 사고·수술·충돌의 흉살이 됩니다.',
    positive: '강한 의지, 뛰어난 추진력, 담대한 결단력이 성공의 원천입니다. 위기 상황에서도 굴하지 않는 저력이 있으며, 경쟁이 치열한 분야에서 탁월한 성과를 냅니다. 군·경·의료 분야에서 특히 뛰어난 재능을 발휘합니다.',
    caution: '성미가 급하고 충동적이어서 갈등과 사고를 자초할 수 있습니다. 양인이 형·충을 만나면 사고·수술·구설의 위험이 높아집니다. 칼·예리한 도구 다루기와 무리한 운동을 조심하고, 감정 조절과 인내심을 키우는 것이 최우선입니다.',
    careers: ['군인', '경찰', '소방관', '외과 의사', '운동선수', '요리사', '목수', '스턴트맨'],
    advice: '양인의 강렬한 에너지를 규율과 훈련으로 다스리세요. 정신 수양과 명상을 통해 충동성을 줄이면, 이 강력한 에너지가 탁월한 성취의 원천이 됩니다.',
    myth: '갑(甲) → 묘(卯), 병(丙)·무(戊) → 오(午), 경(庚) → 유(酉), 임(壬) → 자(子). 음간에는 양인살이 없습니다.'
  },
  {
    name: '겁살', hanja: '劫殺', icon: '⚡', category: '흉살',
    summary: '강탈과 급변의 흉살',
    description: '겁살(劫殺)은 겁탈(劫奪), 즉 강제로 빼앗기거나 빼앗는 기운입니다. 삼합(三合)의 목욕지(沐浴支) 바로 앞 지지에 해당하며, 갑작스러운 변화, 외부의 공격, 강탈, 도난, 사기, 분쟁 등의 형태로 나타납니다. 흉살 중에서도 비교적 강력한 기운을 지닙니다.',
    positive: '겁살이 강한 사람은 그만큼 강인한 의지와 생존 본능을 지닙니다. 위기 상황에서 오히려 투지가 강해지고, 경쟁이 치열한 환경에서 탁월한 성과를 내기도 합니다. 무술·스포츠·군경 분야에서 강점이 있습니다.',
    caution: '재물·건강·인간관계에서 갑작스러운 탈취나 상실이 발생할 수 있습니다. 도박이나 투기, 비공식적 거래는 피하고, 법적·금전적 분쟁에 특히 조심하세요. 운전 중 사고, 폭력, 강도 등 외부의 위험에 대한 주의가 필요합니다.',
    careers: ['스턴트맨', '보안 전문가', '위기 관리자', '경호원', '특수부대'],
    advice: '겁살의 강인한 에너지를 방어적으로 활용하세요. 위기 대응 능력과 자기 보호 능력을 키우고, 비공식적이거나 무리한 거래는 철저히 피하면 겁살의 흉기운을 크게 줄일 수 있습니다.',
    myth: '申子辰 → 巳, 寅午戌 → 亥, 巳酉丑 → 寅, 亥卯未 → 申. 삼합의 마지막 지지에서 역행 2번째 지지입니다.'
  },
  {
    name: '삼재', hanja: '三災', icon: '🌊', category: '주기살',
    summary: '3년 연속 조심해야 할 시기의 주기',
    description: '삼재(三災)는 수재(水災)·화재(火災)·풍재(風災) 세 가지 재앙이 드는 3년 주기를 말합니다. 태어난 띠(年支)를 기준으로 특정 3년간이 삼재에 해당하며, 들삼재→묵삼재→날삼재의 흐름으로 진행됩니다. 인생에서 총 8~9번 삼재를 겪게 됩니다.',
    positive: '삼재는 재앙이 닥치는 기간이라기보다는 내면을 성찰하고 다음 도약을 준비하는 기간으로 이해하는 것이 바람직합니다. 삼재를 슬기롭게 넘기면 더 단단해지고 성숙해집니다.',
    caution: '삼재 기간에는 이사·이직·결혼·창업 등 큰 변화를 서두르는 것을 조심하세요. 건강 관리와 교통안전에 특히 주의하고, 중요한 결정은 신중하게 검토하세요.',
    careers: ['모든 직종에 해당 — 삼재는 직업과 관계없이 주기적으로 찾아옵니다.'],
    advice: '삼재 기간에는 새로운 도전보다 기존을 지키고 다지는 데 집중하세요. 종교적 기도나 명상, 적선(積善)을 쌓는 행동이 삼재의 흉운을 완화한다고 전해집니다.',
    myth: '돼지·쥐·소(亥子丑) 띠 → 寅卯辰년, 호랑이·토끼·용(寅卯辰) 띠 → 巳午未년, 뱀·말·양(巳午未) 띠 → 申酉戌년, 원숭이·닭·개(申酉戌) 띠 → 亥子丑년에 삼재가 들어옵니다.'
  },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  길신:    { bg: 'bg-amber-400/10',   text: 'text-amber-300',  border: 'border-amber-400/30' },
  반길반흉: { bg: 'bg-purple-400/10', text: 'text-purple-300', border: 'border-purple-400/30' },
  동살:    { bg: 'bg-sky-400/10',    text: 'text-sky-300',    border: 'border-sky-400/30' },
  예술살:  { bg: 'bg-indigo-400/10', text: 'text-indigo-300', border: 'border-indigo-400/30' },
  강맹살:  { bg: 'bg-rose-400/10',   text: 'text-rose-300',   border: 'border-rose-400/30' },
  흉살:    { bg: 'bg-red-400/10',    text: 'text-red-300',    border: 'border-red-400/30' },
  주기살:  { bg: 'bg-orange-400/10', text: 'text-orange-300', border: 'border-orange-400/30' },
};

function SinsalCard({ sinsal }: { sinsal: SinsalInfo }) {
  const [expanded, setExpanded] = useState(false);
  const cs = CATEGORY_STYLES[sinsal.category] ?? CATEGORY_STYLES['흉살'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-panel border rounded-2xl overflow-hidden transition-all duration-200", cs.border)}
    >
      <button
        className="w-full p-5 flex items-center justify-between text-left hover:bg-white/3 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{sinsal.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">{sinsal.name}</h3>
              <span className="text-sm text-muted-foreground">{sinsal.hanja}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border", cs.bg, cs.text, cs.border)}>
                {sinsal.category}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{sinsal.summary}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">설명</h4>
                <p className="text-sm leading-relaxed">{sinsal.description}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-400/8 border border-emerald-400/20 rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-1.5">✅ 긍정적 작용</h4>
                  <p className="text-sm text-foreground/80 leading-relaxed">{sinsal.positive}</p>
                </div>
                <div className="bg-rose-400/8 border border-rose-400/20 rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-rose-400 mb-1.5">⚠️ 주의 사항</h4>
                  <p className="text-sm text-foreground/80 leading-relaxed">{sinsal.caution}</p>
                </div>
              </div>
              <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-primary mb-1.5">💡 활용 조언</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{sinsal.advice}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">적합 직업:</span>
                {sinsal.careers.map((c, i) => (
                  <span key={i} className="text-xs bg-white/8 border border-white/10 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">📐 계산 방법</h4>
                <p className="text-xs text-foreground/60 leading-relaxed font-mono">{sinsal.myth}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SinsalGuidePage() {
  const [search, setSearch] = useState('');
  const filtered = SINSALS.filter(s =>
    s.name.includes(search) || s.hanja.includes(search) || s.category.includes(search) || s.summary.includes(search)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary/70 text-sm font-medium mb-1">
          <Star className="w-4 h-4" /><span>神殺 해설</span>
        </div>
        <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
          신살(神殺) 상세 안내
        </h1>
        <p className="text-muted-foreground text-sm">사주에 나타나는 특수 기운들의 의미와 활용법</p>
      </motion.div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="신살 이름으로 검색..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/8 border border-white/15 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-colors"
        />
      </div>

      {/* 분류 설명 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_STYLES).map(([cat, cs]) => (
          <span key={cat} className={cn("text-xs px-2.5 py-1 rounded-full border", cs.bg, cs.text, cs.border)}>
            {cat}
          </span>
        ))}
      </div>

      {/* 신살 카드 목록 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">검색 결과가 없습니다.</p>
        ) : (
          filtered.map(s => <SinsalCard key={s.name} sinsal={s} />)
        )}
      </div>

      {/* 안내 */}
      <div className="glass-panel border border-white/10 rounded-2xl p-5 text-sm text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/70 mb-2">신살(神殺)이란?</p>
        <p>신살(神殺)은 사주 팔자(四柱八字)의 년·월·일·시지(支)의 조합에서 특정 패턴을 발견하여 추가로 분석하는 보조 지표입니다. 길성(吉星, 神)은 좋은 기운, 흉성(凶星, 殺)은 주의가 필요한 기운이지만, 어떤 신살도 절대적이지 않습니다. 다른 사주 요소들과 종합적으로 판단해야 하며, 흉살이 있다고 해서 반드시 불행한 것은 아닙니다.</p>
      </div>
    </div>
  );
}
