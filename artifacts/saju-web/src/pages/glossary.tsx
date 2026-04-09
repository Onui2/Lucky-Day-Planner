import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, Search, ChevronDown, ChevronUp } from "lucide-react";

interface Term {
  term: string; hanja: string; category: string;
  brief: string; detail: string; example?: string;
}

const TERMS: Term[] = [
  // ── 천간 ──────────────────────────────
  { term:'갑(甲)', hanja:'甲', category:'천간', brief:'봄의 시작, 새싹, 큰 나무',
    detail:'갑목(甲木)은 10천간의 첫 번째로 양목(陽木)입니다. 큰 나무처럼 위로 뻗어나가는 성질로 개척·도전·리더십을 상징합니다. 직선적이고 솔직하며, 새로운 것을 시작하는 힘이 강합니다.',
    example:'갑목이 강한 사람: 개척자, 리더, 선구자적 성품' },
  { term:'을(乙)', hanja:'乙', category:'천간', brief:'덩굴, 풀, 유연한 나무',
    detail:'을목(乙木)은 음목(陰木)으로 덩굴이나 풀처럼 유연하게 환경에 적응합니다. 부드럽고 섬세하며 끈기가 강합니다. 직접 맞서기보다 돌아가는 방식으로 목표를 달성하는 스타일입니다.',
    example:'을목이 강한 사람: 예술가, 교육자, 상담가' },
  { term:'병(丙)', hanja:'丙', category:'천간', brief:'태양, 빛, 열정',
    detail:'병화(丙火)는 양화(陽火)로 태양처럼 밝고 뜨거운 에너지입니다. 활발하고 사교적이며 주목받는 것을 좋아합니다. 솔직하고 개방적인 성격으로 리더십과 표현력이 뛰어납니다.',
    example:'병화가 강한 사람: 연예인, 정치인, 영업직' },
  { term:'정(丁)', hanja:'丁', category:'천간', brief:'촛불, 난로, 세심한 불',
    detail:'정화(丁火)는 음화(陰火)로 촛불이나 난로처럼 따뜻하고 지속적인 빛입니다. 내면이 풍부하고 섬세한 감성을 지닙니다. 예술적 재능과 학문적 깊이가 있으며, 주변을 따뜻하게 비추는 성품입니다.',
    example:'정화가 강한 사람: 교수, 예술가, 작가' },
  { term:'무(戊)', hanja:'戊', category:'천간', brief:'큰 산, 두터운 땅',
    detail:'무토(戊土)는 양토(陽土)로 큰 산처럼 묵직하고 포용력 있는 기운입니다. 신뢰와 안정을 상징하며, 주변을 든든하게 지지하는 역할을 합니다. 보수적이고 현실적인 성향이 강합니다.',
    example:'무토가 강한 사람: 공무원, 경영자, 부동산업' },
  { term:'기(己)', hanja:'己', category:'천간', brief:'논밭, 부드러운 흙',
    detail:'기토(己土)는 음토(陰土)로 논밭처럼 만물을 기르는 부드러운 흙입니다. 순응적이고 포용력 있으며, 세심한 돌봄이 필요한 분야에서 빛납니다. 융통성 있게 상황에 적응하는 능력이 뛰어납니다.',
    example:'기토가 강한 사람: 의사, 농업인, 식품업' },
  { term:'경(庚)', hanja:'庚', category:'천간', brief:'도끼, 원광석, 금속',
    detail:'경금(庚金)은 양금(陽金)으로 날카로운 도끼나 원광석처럼 강하고 결단력 있는 기운입니다. 원칙을 중시하고 의리가 강하며, 강직하고 솔직한 성격입니다.',
    example:'경금이 강한 사람: 군인, 법조인, 기술자' },
  { term:'신(辛)', hanja:'辛', category:'천간', brief:'보석, 예리한 칼날',
    detail:'신금(辛金)은 음금(陰金)으로 정제된 보석이나 예리한 칼날처럼 섬세하고 날카로운 기운입니다. 완벽주의 성향이 강하고 미적 감각이 뛰어납니다. 세밀한 분석력과 판단력이 빛납니다.',
    example:'신금이 강한 사람: 디자이너, 분석가, 외과의사' },
  { term:'임(壬)', hanja:'壬', category:'천간', brief:'바다, 큰 강',
    detail:'임수(壬水)는 양수(陽水)로 바다처럼 광대하고 흘러가는 기운입니다. 지혜롭고 유연하며, 넓은 시야와 통찰력이 강점입니다. 새로운 아이디어와 창의적 사고가 뛰어납니다.',
    example:'임수가 강한 사람: 학자, 연구자, 기획자' },
  { term:'계(癸)', hanja:'癸', category:'천간', brief:'비, 이슬, 지하수',
    detail:'계수(癸水)는 음수(陰水)로 이슬이나 빗물처럼 고요하고 깊은 기운입니다. 섬세한 직관력과 감수성이 뛰어나며, 내면적 깊이와 신비로운 매력을 지닙니다.',
    example:'계수가 강한 사람: 심리상담사, 예술가, 철학자' },

  // ── 지지 ──────────────────────────────
  { term:'자(子)', hanja:'子', category:'지지', brief:'쥐, 겨울 시작, 水',
    detail:'자수(子水)는 12지지 중 첫 번째로 수(水) 기운을 대표합니다. 방향으로는 북쪽(北), 시간으로는 밤 11시~새벽 1시에 해당합니다. 지혜·지식·생명의 근원을 상징하며, 겨울의 깊은 정지와 내면 충전의 에너지입니다.' },
  { term:'축(丑)', hanja:'丑', category:'지지', brief:'소, 겨울 마무리, 土',
    detail:'축토(丑土)는 소를 상징하는 지지로 인내·근면·안정을 나타냅니다. 새벽 1~3시, 한겨울에 해당하며 봄을 준비하는 에너지가 내부에 가득 쌓여 있습니다.' },
  { term:'인(寅)', hanja:'寅', category:'지지', brief:'호랑이, 봄 시작, 木',
    detail:'인목(寅木)은 봄의 시작과 함께 힘차게 솟아오르는 기운입니다. 새벽 3~5시에 해당하며 개척·도전·시작의 에너지를 가집니다. 역마살의 대표 지지이기도 합니다.' },
  { term:'묘(卯)', hanja:'卯', category:'지지', brief:'토끼, 봄 한가운데, 木',
    detail:'묘목(卯木)은 봄이 무르익은 시기로 성장·발전·교류를 상징합니다. 새벽 5~7시에 해당하며, 도화살(桃花殺)의 핵심 지지입니다. 인간관계가 풍부해지는 에너지입니다.' },
  { term:'진(辰)', hanja:'辰', category:'지지', brief:'용, 봄 마무리, 土',
    detail:'진토(辰土)는 봄의 마지막이자 여름의 시작을 알리는 변화의 에너지입니다. 아침 7~9시에 해당하며, 수기(水氣)가 담겨 있어 수고(水庫)라고도 불립니다. 화개살의 지지이기도 합니다.' },
  { term:'사(巳)', hanja:'巳', category:'지지', brief:'뱀, 여름 시작, 火',
    detail:'사화(巳火)는 여름의 시작으로 열정·활동·확장의 기운이 가득합니다. 오전 9~11시에 해당하며, 경금(庚金)·무토(戊土)·병화(丙火)가 지장간에 들어 있습니다.' },
  { term:'오(午)', hanja:'午', category:'지지', brief:'말, 여름 한가운데, 火',
    detail:'오화(午火)는 12지지 중 양기(陽氣)가 가장 강한 지지입니다. 낮 11시~오후 1시에 해당하며 명예·표현·활동력이 최고조에 달합니다. 도화살의 핵심 지지이기도 합니다.' },
  { term:'미(未)', hanja:'未', category:'지지', brief:'양, 여름 마무리, 土',
    detail:'미토(未土)는 여름이 끝나고 수렴이 시작되는 시기입니다. 오후 1~3시에 해당하며 풍요·감성·예술적 감각이 강합니다. 목기(木氣)의 창고 역할도 합니다.' },
  { term:'신(申)', hanja:'申', category:'지지', brief:'원숭이, 가을 시작, 金',
    detail:'신금(申金)은 가을의 시작으로 결단·수확·완성의 기운입니다. 오후 3~5시에 해당하며 역마살의 대표 지지입니다. 빠른 변화와 이동의 에너지가 강합니다.' },
  { term:'유(酉)', hanja:'酉', category:'지지', brief:'닭, 가을 한가운데, 金',
    detail:'유금(酉金)은 12지지 중 음금(陰金)의 정기가 가장 강한 지지입니다. 오후 5~7시에 해당하며 정밀함·예술·마무리의 에너지를 가집니다. 도화살의 대표 지지이기도 합니다.' },
  { term:'술(戌)', hanja:'戌', category:'지지', brief:'개, 가을 마무리, 土',
    detail:'술토(戌土)는 가을이 마무리되고 겨울을 준비하는 에너지입니다. 오후 7~9시에 해당하며 화기(火氣)의 창고 역할을 합니다. 화개살의 대표 지지이기도 합니다.' },
  { term:'해(亥)', hanja:'亥', category:'지지', brief:'돼지, 겨울 시작, 水',
    detail:'해수(亥水)는 겨울의 시작으로 내면 충전·수렴·지혜의 에너지입니다. 오후 9~11시에 해당하며 순수하고 맑은 수(水) 기운이 강합니다. 역마살의 대표 지지이기도 합니다.' },

  // ── 오행 ──────────────────────────────
  { term:'목(木)', hanja:'木', category:'오행', brief:'나무, 봄, 성장, 동쪽',
    detail:'오행(五行)의 첫 번째 기운으로 나무처럼 위로 솟아오르는 에너지입니다. 봄·동쪽·청색·간장(肝臟)·신맛(酸味)과 연결됩니다. 인자(仁慈)와 인내심, 학문·교육·성장과 관련이 깊습니다.',
    example:'목 기운이 강한 사람: 교육자, 작가, 환경운동가' },
  { term:'화(火)', hanja:'火', category:'오행', brief:'불, 여름, 열정, 남쪽',
    detail:'오행의 두 번째 기운으로 불처럼 위로 타오르는 에너지입니다. 여름·남쪽·적색·심장(心臟)·쓴맛(苦味)과 연결됩니다. 예(禮)와 명예심, 표현·예술·소통과 관련이 깊습니다.',
    example:'화 기운이 강한 사람: 연예인, 강사, 리더' },
  { term:'토(土)', hanja:'土', category:'오행', brief:'흙, 환절기, 중재, 중앙',
    detail:'오행의 세 번째 기운으로 중재·포용·안정의 에너지입니다. 환절기·중앙·황색·비위(脾胃)·단맛(甘味)과 연결됩니다. 신(信)과 신용, 부동산·농업·중개와 관련이 깊습니다.',
    example:'토 기운이 강한 사람: 공무원, 부동산업자, 요리사' },
  { term:'금(金)', hanja:'金', category:'오행', brief:'쇠, 가을, 결단, 서쪽',
    detail:'오행의 네 번째 기운으로 가을처럼 수렴하고 결단하는 에너지입니다. 가을·서쪽·백색·폐(肺)·매운맛(辛味)과 연결됩니다. 의(義)와 의리, 법·군사·의학과 관련이 깊습니다.',
    example:'금 기운이 강한 사람: 법조인, 군인, 의사' },
  { term:'수(水)', hanja:'水', category:'오행', brief:'물, 겨울, 지혜, 북쪽',
    detail:'오행의 다섯 번째 기운으로 물처럼 아래로 흐르고 지혜로운 에너지입니다. 겨울·북쪽·흑색·신장(腎臟)·짠맛(鹹味)과 연결됩니다. 지(智)와 지혜, 학문·철학·예술과 관련이 깊습니다.',
    example:'수 기운이 강한 사람: 철학자, 연구자, 예술가' },

  // ── 십신 ──────────────────────────────
  { term:'비견(比肩)', hanja:'比肩', category:'십신', brief:'나와 같은 오행·같은 음양',
    detail:'일간(日干)과 같은 오행이면서 음양도 같은 십신입니다. 형제·동료·경쟁자를 상징하며, 독립심과 자존심이 강합니다. 비견이 많으면 재물이 분산되기 쉽고, 경쟁자가 많아집니다.' },
  { term:'겁재(劫財)', hanja:'劫財', category:'십신', brief:'나와 같은 오행·다른 음양',
    detail:'일간과 같은 오행이지만 음양이 다른 십신입니다. 탈재(奪財)의 기운으로 타인의 재물을 탐내거나 빼앗기는 상황이 생깁니다. 강한 추진력과 배짱이 장점이지만 충동적 결정에 주의해야 합니다.' },
  { term:'식신(食神)', hanja:'食神', category:'십신', brief:'내가 생하는 오행·같은 음양',
    detail:'일간이 생(生)하는 오행이면서 음양도 같은 십신입니다. 창의력·표현력·복록(福祿)을 상징하며, 음식·예술·창작 분야에서 빛납니다. 여성에게는 자녀 복을 의미하기도 합니다.' },
  { term:'상관(傷官)', hanja:'傷官', category:'십신', brief:'내가 생하는 오행·다른 음양',
    detail:'일간이 생하는 오행이지만 음양이 다른 십신입니다. 재능과 언변이 뛰어나지만 정관(正官, 직장·규범)을 상하게 하는 기운입니다. 자유업·예술·창업에 적합하며 창의력이 폭발합니다.' },
  { term:'편재(偏財)', hanja:'偏財', category:'십신', brief:'내가 극하는 오행·같은 음양',
    detail:'일간이 극(克)하는 오행이면서 음양도 같은 십신입니다. 투기적·사업적 재물을 상징하며, 빠르게 벌고 빠르게 쓰는 성향이 있습니다. 남성에게는 애인이나 첩의 기운이기도 합니다.' },
  { term:'정재(正財)', hanja:'正財', category:'십신', brief:'내가 극하는 오행·다른 음양',
    detail:'일간이 극하는 오행이지만 음양이 다른 십신입니다. 성실한 노력으로 쌓는 안정적 재물을 상징합니다. 남성에게는 정처(正妻)의 기운이며, 꾸준한 저축과 재테크에 유리합니다.' },
  { term:'편관(偏官)', hanja:'偏官', category:'십신', brief:'나를 극하는 오행·같은 음양',
    detail:'일간을 극하는 오행이면서 음양도 같은 십신입니다. 칠살(七殺)이라고도 하며, 강한 압박과 도전, 권력과 위험을 동시에 상징합니다. 잘 제어되면 뛰어난 리더십과 권위로 발현됩니다.' },
  { term:'정관(正官)', hanja:'正官', category:'십신', brief:'나를 극하는 오행·다른 음양',
    detail:'일간을 극하지만 음양이 다른 십신입니다. 명예·직위·규범을 상징하며 가장 이상적인 관살(官殺)로 여겨집니다. 여성에게는 남편의 기운이며, 사회적 인정과 승진에 유리합니다.' },
  { term:'편인(偏印)', hanja:'偏印', category:'십신', brief:'나를 생하는 오행·같은 음양',
    detail:'일간을 생하는 오행이면서 음양도 같은 십신입니다. 효신(梟神)이라고도 하며 독특한 직관·종교·이단적 학문을 상징합니다. 과하면 식신(食神)을 제어하여 식복과 자녀 복이 줄어들 수 있습니다.' },
  { term:'정인(正印)', hanja:'正印', category:'십신', brief:'나를 생하는 오행·다른 음양',
    detail:'일간을 생하지만 음양이 다른 십신입니다. 학문·자격·귀인의 도움, 어머니와 스승을 상징합니다. 인성(印星)이 강하면 의존적인 성향이 생기지만 학문과 문서에서 탁월한 성과를 냅니다.' },

  // ── 격국·기타 ────────────────────────────
  { term:'격국(格局)', hanja:'格局', category:'분석', brief:'사주 전체의 구조와 패턴',
    detail:'사주팔자(四柱八字) 전체의 구조적 패턴을 분석하는 방법입니다. 월지(月支)의 정기(正氣) 지장간이 일간(日干)과 어떤 십신 관계인지를 기준으로 정관격·식신격·편재격 등 10가지 격으로 분류합니다. 격국은 그 사람의 사회적 역할과 삶의 방향성을 보여줍니다.' },
  { term:'12운성(十二運星)', hanja:'十二運星', category:'분석', brief:'일간의 생명력 단계',
    detail:'12운성은 일간(日干)이 각 지지(地支)에서 어느 정도의 힘을 갖는지를 나타내는 12단계 사이클입니다. 장생(長生)→목욕(沐浴)→관대(冠帶)→건록(建祿)→제왕(帝旺)→쇠(衰)→병(病)→사(死)→묘(墓)→절(絶)→태(胎)→양(養) 순으로 순환합니다.' },
  { term:'용신(用神)', hanja:'用神', category:'분석', brief:'가장 필요한 균형 오행',
    detail:'사주 내에서 부족한 오행을 보완하거나 과한 오행을 제어하여 균형을 맞추는 데 핵심적인 오행을 말합니다. 용신의 오행·색상·방향·음식을 가까이하면 운이 열린다고 합니다. 용신을 정확히 파악하는 것이 사주 풀이의 핵심입니다.' },
  { term:'합(合)', hanja:'合', category:'관계', brief:'두 간지가 결합하는 관계',
    detail:'사주 내 천간끼리(天干合) 또는 지지끼리(地支合) 결합하여 새로운 오행으로 변화하는 관계입니다. 합은 일반적으로 화합·연합·좋은 인연의 의미입니다. 천간합: 甲己合(토), 乙庚合(금), 丙辛合(수), 丁壬合(목), 戊癸合(화)' },
  { term:'충(沖)', hanja:'沖', category:'관계', brief:'두 지지가 충돌하는 관계',
    detail:'지지 육충(六沖)은 서로 반대 방향에 위치한 두 지지가 충돌하는 관계입니다. 子午沖·丑未沖·寅申沖·卯酉沖·辰戌沖·巳亥沖의 6쌍이 있습니다. 충은 변화·이동·갈등을 의미하며, 경우에 따라 막힌 것을 뚫는 긍정적 역할도 합니다.' },
  { term:'형(刑)', hanja:'刑', category:'관계', brief:'지지 간의 마찰과 문제',
    detail:'지지들 사이에서 서로 손상시키는 특수한 관계입니다. 寅巳申 삼형, 丑戌未 삼형, 子卯 자형(自刑), 辰午酉亥 자형이 대표적입니다. 형은 법적 문제, 수술, 갈등, 인간관계 문제를 나타냅니다.' },
  { term:'공망(空亡)', hanja:'空亡', category:'관계', brief:'힘이 빠져 효력이 없는 상태',
    detail:'60갑자 중에서 천간(10개)과 지지(12개)가 짝을 이룰 때 남는 2개의 지지가 공망(空亡)이 됩니다. 공망을 당한 지지는 힘이 약해지고 효력을 잃습니다. 사주에서 중요한 육친(六親)이 공망이면 그 인연이 희박해집니다.' },
  { term:'일주(日柱)', hanja:'日柱', category:'기본', brief:'태어난 날의 천간+지지',
    detail:'사주팔자(四柱八字) 중 태어난 날의 천간(日干)과 지지(日支)를 합친 것입니다. 일간(日干)은 그 사람의 본질적 성격·자아·에고를 대표하며, 일지(日支)는 내면의 감정과 배우자 자리를 나타냅니다. 사주 해석의 중심은 항상 일주입니다.' },
  { term:'대운(大運)', hanja:'大運', category:'기본', brief:'10년 단위 운의 흐름',
    detail:'10년마다 변화하는 큰 운의 흐름입니다. 사주의 월주(月柱)를 기준으로 남성 양년생·여성 음년생은 순행, 남성 음년생·여성 양년생은 역행하여 계산합니다. 대운이 용신(用神)과 합이 되면 좋은 시기, 기신(忌神)과 충이 되면 어려운 시기입니다.' },
  { term:'세운(歲運)', hanja:'歲運', category:'기본', brief:'해마다 바뀌는 운의 흐름',
    detail:'매년 변화하는 연간 운세입니다. 해당 연도의 년주(年柱)가 내 사주와 어떻게 상호작용하는지 분석합니다. 세운은 대운(大運) 안에서 작동하며, 대운과 세운이 모두 용신(用神)과 합이 되는 해가 최고의 운이 됩니다.' },
];

const CATEGORIES = ['전체', '천간', '지지', '오행', '십신', '분석', '관계', '기본'];

const CAT_STYLES: Record<string, string> = {
  천간:'bg-green-400/10 text-green-300 border-green-400/30',
  지지:'bg-blue-400/10 text-blue-300 border-blue-400/30',
  오행:'bg-amber-400/10 text-amber-300 border-amber-400/30',
  십신:'bg-purple-400/10 text-purple-300 border-purple-400/30',
  분석:'bg-indigo-400/10 text-indigo-300 border-indigo-400/30',
  관계:'bg-rose-400/10 text-rose-300 border-rose-400/30',
  기본:'bg-slate-400/10 text-slate-300 border-slate-400/30',
};

function TermCard({ term: t }: { term: Term }) {
  const [expanded, setExpanded] = useState(false);
  const cs = CAT_STYLES[t.category] ?? CAT_STYLES['기본'];
  return (
    <div className="glass-panel border border-white/10 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{t.term}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border", cs)}>{t.category}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t.brief}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm leading-relaxed text-foreground/80">{t.detail}</p>
              {t.example && (
                <p className="text-xs text-muted-foreground bg-white/5 px-3 py-2 rounded-lg">{t.example}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GlossaryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');

  const filtered = TERMS.filter(t => {
    const matchCat = category === '전체' || t.category === category;
    const matchSearch = !search || t.term.includes(search) || t.hanja.includes(search) || t.brief.includes(search) || t.detail.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary/70 text-sm font-medium mb-1">
          <BookOpen className="w-4 h-4" /><span>사주 용어</span>
        </div>
        <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
          사주 용어 사전
        </h1>
        <p className="text-muted-foreground text-sm">천간·지지·오행·십신 등 핵심 사주 용어를 쉽게 설명합니다</p>
      </motion.div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="용어 검색..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/8 border border-white/15 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-all",
              category === c
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-white/5 text-muted-foreground border-white/10 hover:border-white/20"
            )}>
            {c}
            {c !== '전체' && <span className="ml-1 text-muted-foreground">({TERMS.filter(t => t.category === c).length})</span>}
          </button>
        ))}
      </div>

      {/* 결과 수 */}
      <p className="text-xs text-muted-foreground">{filtered.length}개 용어</p>

      {/* 용어 카드 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">검색 결과가 없습니다.</p>
        ) : (
          filtered.map(t => <TermCard key={t.term} term={t} />)
        )}
      </div>
    </div>
  );
}
