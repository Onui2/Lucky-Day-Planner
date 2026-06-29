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
  {
    name: '백호살', hanja: '白虎殺', icon: '🐯', category: '흉살',
    summary: '피와 사고를 부르는 강렬한 흉살',
    description: '백호살(白虎大殺)은 60갑자 중 甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑의 일곱 간지에 해당하는 흉살입니다. 옛날 호환(虎患), 즉 호랑이에게 물리는 변을 상징했으며, 현대에는 사고·수술·유혈(流血)·급작스러운 질병처럼 피를 보는 일과 관련됩니다. 다만 그만큼 기운이 강해 잘 다스리면 큰 추진력이 됩니다.',
    positive: '에너지가 매우 강해 위기 상황에서 폭발적인 힘을 발휘합니다. 의료·군경처럼 생명을 다루는 분야에서는 백호의 강한 기운이 오히려 직업적 무기가 됩니다. 결단력과 카리스마가 뛰어납니다.',
    caution: '교통사고, 수술, 낙상, 출혈성 질환 등 몸을 다치는 일에 주의해야 합니다. 백호살이 형(刑)·충(沖)을 만나면 흉의 작용이 강해지므로 안전 관리와 정기 건강검진이 중요합니다.',
    careers: ['외과 의사', '군인', '경찰', '소방관', '수의사', '응급구조사'],
    advice: '백호의 강한 기운을 생명을 살리고 지키는 직업으로 승화시키세요. 안전 수칙을 철저히 지키고 과격한 활동을 절제하면 흉살이 오히려 큰 추진력으로 전환됩니다.',
    myth: '甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑 — 이 일곱 간지가 사주의 어느 기둥에든 있으면 백호살로 봅니다. 특히 일주(日柱)에 있을 때 작용이 강합니다.'
  },
  {
    name: '괴강살', hanja: '魁罡殺', icon: '👑', category: '강맹살',
    summary: '극단적 길흉을 오가는 우두머리의 별',
    description: '괴강살(魁罡殺)은 庚辰·庚戌·壬辰·戊戌의 네 간지에 해당하는 신살입니다. 괴(魁)는 우두머리, 강(罡)은 북두칠성의 자루 별을 뜻하여, 무리를 이끄는 강력한 통솔력과 총명함을 상징합니다. 길흉의 진폭이 매우 커서 크게 성공하거나 크게 무너지는 극단성을 지닙니다.',
    positive: '비범한 총명함과 강한 카리스마, 결단력으로 한 분야의 우두머리가 될 자질이 있습니다. 청렴하고 강직하며 불의를 보면 참지 못합니다. 학문·권력·전문직에서 두각을 나타냅니다.',
    caution: '성격이 지나치게 강하고 고집이 세어 대인관계에서 마찰이 잦습니다. 형·충을 만나면 극단적인 부침을 겪을 수 있으므로 겸손과 유연함을 의식적으로 갖춰야 합니다.',
    careers: ['군 지휘관', '법조인', '대기업 경영자', '정치인', '전문 연구직', '외과 의사'],
    advice: '강한 리더십을 독선이 아닌 포용으로 다스리세요. 감정을 절제하고 타인의 의견을 경청하는 훈련을 하면 괴강의 큰 그릇이 빛을 발합니다.',
    myth: '庚辰·庚戌·壬辰·戊戌 — 이 네 간지가 일주(日柱)에 있을 때 괴강살로 봅니다.'
  },
  {
    name: '문창귀인', hanja: '文昌貴人', icon: '📚', category: '길신',
    summary: '학문과 시험에 빛나는 총명의 별',
    description: '문창귀인(文昌貴人)은 학문·문장·시험에 큰 도움을 주는 길성입니다. 일간(日干)이 생(生)하는 오행의 건록(建祿)에 해당하는 지지에 위치하며, 머리가 총명하고 글재주가 뛰어나 학업과 시험에서 좋은 결과를 냅니다. 위기 때 지혜로 흉을 길로 바꾸는 힘도 있습니다.',
    positive: '기억력과 이해력이 뛰어나 학문·연구·문필 분야에서 두각을 나타냅니다. 각종 시험과 자격 취득에 유리하며, 표현력과 문장력이 좋아 글로 이름을 알립니다.',
    caution: '문창귀인이 형·충·공망(空亡)을 당하면 총명함이 흐트러지거나 시험운이 약해질 수 있습니다. 재능을 과신해 꾸준한 노력을 게을리하지 않도록 주의해야 합니다.',
    careers: ['학자', '교수', '작가', '연구원', '교사', '기자', '법조인'],
    advice: '타고난 총명함을 꾸준한 학습으로 갈고닦으세요. 글쓰기와 기록하는 습관을 들이면 문창의 기운이 더욱 활성화됩니다.',
    myth: '甲→巳, 乙→午, 丙·戊→申, 丁·己→酉, 庚→亥, 辛→子, 壬→寅, 癸→卯. 일간을 기준으로 해당 지지가 사주에 있으면 발동합니다.'
  },
  {
    name: '홍염살', hanja: '紅艶殺', icon: '🌹', category: '반길반흉',
    summary: '은근한 매력으로 사람을 끄는 별',
    description: '홍염살(紅艶殺)은 도화살(桃花殺)과 더불어 이성을 끌어당기는 매력의 기운입니다. 도화가 화사하게 드러나는 매력이라면, 홍염은 은근하고 묘한 분위기로 사람을 매혹시키는 색기(色氣)에 가깝습니다. 예술적 감각과 풍류를 즐기는 낭만적 기질을 동반합니다.',
    positive: '독특한 분위기와 매력으로 이성과 대중의 호감을 삽니다. 예술·연예·서비스·접객 분야에서 강점을 발휘하며, 패션 감각과 미적 표현력이 뛰어납니다.',
    caution: '이성 문제로 인한 구설과 감정의 기복에 주의해야 합니다. 매력이 지나치면 가정과 일에 소홀해지거나 삼각관계에 휘말릴 수 있어 절제가 필요합니다.',
    careers: ['연예인', '예술가', '디자이너', '뷰티·패션업', '상담사', '접객 서비스'],
    advice: '타고난 매력을 예술과 창작으로 승화시키세요. 이성 관계에서는 선을 지키고, 매력을 사회적 신뢰로 연결하면 큰 자산이 됩니다.',
    myth: '甲·乙→午, 丙→寅, 丁→未, 戊·己→辰, 庚→戌, 辛→酉, 壬→子, 癸→申. 일간을 기준으로 해당 지지가 있으면 발동합니다.'
  },
  {
    name: '귀문관살', hanja: '鬼門關殺', icon: '🔮', category: '흉살',
    summary: '예민한 직관과 신경과민의 두 얼굴',
    description: '귀문관살(鬼門關殺)은 특정 두 지지가 만날 때 형성되는 신살로, 정신적으로 극도로 예민하고 직관이 발달하는 기운입니다. 영감·예지력·집중력이 뛰어난 반면, 신경과민·강박·불면·의심 등 정신적 불안정으로 나타나기도 합니다.',
    positive: '직관력과 영적 감수성이 뛰어나 종교·예술·심리·연구 분야에서 남다른 통찰을 보입니다. 한 가지에 깊이 몰입하는 집중력이 탁월합니다.',
    caution: '신경이 예민하고 생각이 많아 불안·강박·불면에 시달리기 쉽습니다. 의심이 지나치거나 한 가지에 집착하면 대인관계가 어려워질 수 있어 마음을 비우는 수련이 필요합니다.',
    careers: ['종교인', '심리상담사', '예술가', '연구원', '역술인', '작가'],
    advice: '예민한 감수성을 창작과 탐구로 풀어내세요. 명상·운동으로 마음을 다스리고 생각을 글로 정리하면 귀문의 불안정을 직관의 힘으로 바꿀 수 있습니다.',
    myth: '子酉·丑午·寅未·卯申·辰亥·巳戌 — 이 두 지지가 사주에 함께 있을 때 발동합니다.'
  },
  {
    name: '망신살', hanja: '亡身殺', icon: '🎭', category: '흉살',
    summary: '체면과 비밀이 드러나는 살',
    description: '망신살(亡身殺)은 12신살 중 하나로, 말 그대로 몸(身)을 잃는(亡), 즉 체면이 깎이거나 숨기고 싶은 일이 드러나는 기운입니다. 안에서 비롯되는 구설·망신·실수와 관련되며, 밖에서 오는 재앙인 겁살(劫殺)과 짝을 이루는 살입니다.',
    positive: '자기 노출을 두려워하지 않는 솔직함과 추진력이 있습니다. 잘 다스리면 대중 앞에 자신을 드러내는 직업이나 승부의 세계에서 강점이 됩니다.',
    caution: '구설·망신·관재(官災)·이성 문제로 체면이 손상될 수 있습니다. 비밀이 새어 나가거나 충동적 언행으로 곤란을 겪기 쉬우니 언행과 처신을 신중히 해야 합니다.',
    careers: ['방송인', '정치인', '연예인', '영업직', '대중 활동가'],
    advice: '드러나는 기운을 떳떳한 공개 활동으로 전환하세요. 숨길 일을 만들지 않는 투명한 처신이 망신살의 흉을 막는 가장 좋은 방법입니다.',
    myth: '申子辰 → 亥, 寅午戌 → 巳, 巳酉丑 → 申, 亥卯未 → 寅. 년지(年支) 또는 일지(日支)를 기준으로 계산합니다.'
  },
  {
    name: '재살', hanja: '災殺', icon: '⛓️', category: '흉살',
    summary: '갇히고 막히는 수옥(囚獄)의 살',
    description: '재살(災殺)은 수옥살(囚獄殺)이라고도 하며, 감금·구속·송사(訟事)처럼 자유가 묶이는 일과 관련된 흉살입니다. 12신살에서 삼합 왕지(旺支)를 정면으로 충(沖)하는 자리에 해당하여, 권력 다툼이나 사고로 인한 구속을 상징합니다.',
    positive: '강한 정신력과 권력 지향성을 지녀, 잘 다스리면 법·권력·통제와 관련된 분야에서 두각을 나타냅니다. 위기 대응 능력과 승부 근성이 강합니다.',
    caution: '관재·송사·교통사고·감금 등 자유를 잃는 일에 주의해야 합니다. 법적 분쟁과 보증·계약에 신중하고, 권력 다툼에 휘말리지 않도록 처신해야 합니다.',
    careers: ['법조인', '교정직', '경찰', '군인', '권력기관 종사자'],
    advice: '재살의 통제 기운을 법과 질서를 다루는 직업으로 승화시키세요. 무리한 거래와 분쟁을 피하고 규칙을 지키면 갇히는 흉을 통솔하는 힘으로 바꿀 수 있습니다.',
    myth: '申子辰 → 午, 寅午戌 → 子, 巳酉丑 → 卯, 亥卯未 → 酉. 삼합 왕지(子·午·卯·酉)를 충하는 지지입니다.'
  },
  {
    name: '고신·과숙살', hanja: '孤神寡宿', icon: '🌑', category: '흉살',
    summary: '외로움과 고독을 부르는 살',
    description: '고신살(孤神殺)과 과숙살(寡宿殺)은 배우자·가족과의 인연이 옅어 외로움을 느끼기 쉬운 기운입니다. 남성에게 작용하는 고신살은 홀아비살, 여성에게 작용하는 과숙살은 과부살이라고도 불립니다. 띠(年支)를 기준으로 계절의 앞뒤 지지에 해당할 때 성립합니다.',
    positive: '혼자 있는 시간을 통해 깊이 사색하고 한 분야에 몰두하는 힘이 있습니다. 종교·학문·예술·수행처럼 고독을 자산으로 삼는 길에서 빛을 발합니다.',
    caution: '배우자·가족과 정서적 거리가 생기거나 만혼·독신 경향이 나타날 수 있습니다. 스스로 마음의 문을 닫지 않도록, 관계에 먼저 다가가고 감정을 표현하는 노력이 필요합니다.',
    careers: ['종교인', '수행자', '학자', '예술가', '1인 전문직'],
    advice: '고독을 성장의 시간으로 삼되 사람과의 따뜻한 교류를 의식적으로 이어가세요. 마음을 표현하는 작은 습관이 외로움의 살을 누그러뜨립니다.',
    myth: '亥子丑 띠 → 고신 寅·과숙 戌, 寅卯辰 띠 → 고신 巳·과숙 丑, 巳午未 띠 → 고신 申·과숙 辰, 申酉戌 띠 → 고신 亥·과숙 未. 년지(年支)를 기준으로 봅니다.'
  },
  {
    name: '천덕귀인', hanja: '天德貴人', icon: '🕊️', category: '길신',
    summary: '하늘의 덕이 지켜주는 길성',
    description: '천덕귀인(天德貴人)은 하늘(天)의 덕(德)이 깃든 길성으로, 천을귀인(天乙貴人)과 더불어 사주의 흉을 막고 복을 더해주는 대표적인 귀인성입니다. 월지(月支)를 기준으로 정해지며, 이 별이 있으면 위기 때 보이지 않는 도움을 받고 큰 화를 면한다고 전해집니다.',
    positive: '평생 알게 모르게 귀인의 도움과 하늘의 보살핌을 받습니다. 흉살(凶殺)이 있어도 그 작용을 누그러뜨리고, 마음이 어질고 덕이 있어 주변의 신망을 얻습니다. 관운(官運)과 명예에도 유리합니다.',
    caution: '천덕귀인이 형(刑)·충(沖)·공망(空亡)을 당하면 그 덕이 가려질 수 있습니다. 귀인의 보살핌에 안주해 노력을 게을리하면 복이 온전히 발현되지 않습니다.',
    careers: ['공직자', '교육자', '의료인', '종교인', '상담사', '사회사업가'],
    advice: '받은 덕을 주변에 베푸는 삶을 사세요. 선행과 적선(積善)을 쌓을수록 천덕의 보호가 더욱 두터워집니다.',
    myth: '월지(月支) 기준 — 寅月 丁, 卯月 申, 辰月 壬, 巳月 辛, 午月 亥, 未月 甲, 申月 癸, 酉月 寅, 戌月 丙, 亥月 乙, 子月 巳, 丑月 庚이 사주에 있을 때 발동합니다.'
  },
  {
    name: '월덕귀인', hanja: '月德貴人', icon: '🌙', category: '길신',
    summary: '땅의 덕이 지켜주는 길성',
    description: '월덕귀인(月德貴人)은 달(月), 즉 땅의 덕이 깃든 길성으로 천덕귀인과 짝을 이룹니다. 월지(月支)의 삼합 오행을 기준으로 정해지며, 마음이 너그럽고 자비로워 주변에 따르는 사람이 많고, 재난과 질병을 막아주는 힘이 있다고 전해집니다.',
    positive: '온화하고 자비로운 성품으로 인덕(人德)이 두텁습니다. 재난·질병·관재(官災)를 막아주며, 천덕귀인과 함께 있으면 그 길한 힘이 배가됩니다. 가정이 화목하고 안정적입니다.',
    caution: '월덕귀인 역시 형·충·공망을 당하면 작용이 약해집니다. 베푸는 마음을 잃고 이기적으로 흐르면 귀인의 덕이 멀어집니다.',
    careers: ['교육자', '의료인', '복지·돌봄직', '종교인', '공직자', '상담사'],
    advice: '너그러움과 자비를 삶의 중심에 두세요. 가족과 이웃을 보살피는 마음이 월덕의 복을 더욱 키웁니다.',
    myth: '월지(月支) 삼합 기준 — 寅午戌月 丙, 申子辰月 壬, 亥卯未月 甲, 巳酉丑月 庚이 천간에 드러날 때 발동합니다.'
  },
  {
    name: '장성살', hanja: '將星殺', icon: '🎖️', category: '강맹살',
    summary: '군대를 이끄는 장수의 별',
    description: '장성살(將星殺)은 12신살 중 하나로, 삼합(三合)의 왕지(旺支)에 해당하는 자리입니다. 군대를 이끄는 장수(將帥)의 별로, 강한 통솔력·권위·자존심을 상징합니다. 한 조직의 중심에 서서 무리를 이끄는 리더의 기운입니다.',
    positive: '강력한 리더십과 추진력으로 조직의 중심이 됩니다. 권력·명예·승진에 유리하며, 위기 상황에서 흔들림 없이 사람들을 통솔합니다. 군·경·관·기업의 수장으로 적합합니다.',
    caution: '자존심과 권위 의식이 지나쳐 독선적으로 흐르거나 주변과 마찰을 빚을 수 있습니다. 권력을 남용하지 않도록 겸손과 절제가 필요합니다.',
    careers: ['군 지휘관', '경찰 간부', '고위 공직자', '기업 경영자', '정치인', '조직 리더'],
    advice: '타고난 통솔력을 독선이 아닌 책임감으로 발휘하세요. 아랫사람을 아끼고 권력을 공정하게 쓰면 장성의 권위가 오래 빛납니다.',
    myth: '申子辰 → 子, 寅午戌 → 午, 巳酉丑 → 酉, 亥卯未 → 卯. 삼합의 왕지(旺支) 자리이며 년지·일지를 기준으로 봅니다.'
  },
  {
    name: '반안살', hanja: '攀鞍殺', icon: '🐴', category: '길신',
    summary: '말 안장에 올라타는 출세의 별',
    description: '반안살(攀鞍殺)은 12신살 중 하나로, 말 안장(鞍)에 오른다(攀)는 뜻입니다. 출세·승진·명예를 상징하는 비교적 길한 살로, 장성살(將星殺) 바로 다음 자리에 위치합니다. 윗사람의 인정을 받아 높은 자리로 올라가는 기운입니다.',
    positive: '윗사람의 후원과 인정을 받아 승진·출세에 유리합니다. 처세에 능하고 명예욕이 적절히 작동하여 사회적 지위를 높여갑니다. 저축·재물 관리에도 안정적입니다.',
    caution: '출세 욕심이 지나치면 아첨이나 처세에 치우쳐 진정성을 잃을 수 있습니다. 실력을 함께 쌓지 않으면 올라간 자리를 지키기 어렵습니다.',
    careers: ['공직자', '대기업 임원', '교육 행정가', '금융인', '관리직'],
    advice: '주어진 기회를 실력으로 뒷받침하세요. 처세에만 기대지 말고 실질적 역량을 쌓으면 반안의 출세운이 오래 이어집니다.',
    myth: '申子辰 → 丑, 寅午戌 → 未, 巳酉丑 → 戌, 亥卯未 → 辰. 장성살 다음 지지이며 년지·일지를 기준으로 봅니다.'
  },
  {
    name: '지살', hanja: '地殺', icon: '🧳', category: '동살',
    summary: '스스로 움직이는 이동·변동의 살',
    description: '지살(地殺)은 12신살 중 하나로, 삼합(三合)의 시작 지지인 생지(生支)에 해당합니다. 역마살(驛馬殺)과 더불어 이동·변동을 상징하지만, 역마가 분주히 떠밀리는 이동이라면 지살은 스스로 계획하고 움직이는 능동적 이동에 가깝습니다. 이사·전직·여행·해외 진출과 관련됩니다.',
    positive: '활동 반경이 넓고 환경 변화에 유연하게 적응합니다. 영업·홍보·무역·여행 등 발로 뛰는 분야에서 강점을 보이며, 스스로 길을 개척하는 추진력이 있습니다.',
    caution: '잦은 이동과 변동으로 안정감이 떨어지거나 한곳에 뿌리내리기 어려울 수 있습니다. 분주함 속에서 핵심을 놓치지 않도록 중심을 잡는 노력이 필요합니다.',
    careers: ['영업·마케팅', '무역업', '여행·항공업', '홍보 전문가', '현장 관리직'],
    advice: '이동의 에너지를 능동적인 기회 확장에 활용하세요. 움직임 속에서도 분명한 목표를 세우면 지살이 성장의 발판이 됩니다.',
    myth: '申子辰 → 申, 寅午戌 → 寅, 巳酉丑 → 巳, 亥卯未 → 亥. 삼합의 생지(生支) 자리이며 년지·일지를 기준으로 봅니다.'
  },
  {
    name: '천살', hanja: '天殺', icon: '🌩️', category: '흉살',
    summary: '사람의 힘 밖에서 오는 하늘의 재앙',
    description: '천살(天殺)은 12신살 중 하나로, 천재지변·급변·예측 불가한 변고처럼 사람의 힘으로 막기 어려운 하늘(天)의 재앙을 상징합니다. 자존심과 이상이 높고 하늘을 우러르는 기운이라 신앙심·명예욕이 강하지만, 그만큼 갑작스러운 시련을 겪기도 합니다.',
    positive: '이상이 높고 자존심이 강해 큰 그림을 그리는 안목이 있습니다. 신앙·정신세계에 대한 관심이 깊고, 시련을 통해 정신적으로 크게 성숙하는 저력이 있습니다.',
    caution: '천재지변·급작스러운 사고·예기치 못한 변고에 주의해야 합니다. 자존심이 지나치게 강해 윗사람과 충돌하거나 고집으로 일을 그르칠 수 있어 겸허함이 필요합니다.',
    careers: ['종교인', '연구직', '예술가', '기획·전략직', '정신·심리 분야'],
    advice: '통제할 수 없는 일에 집착하기보다 마음을 다스리는 데 힘쓰세요. 신앙이나 명상, 정신 수양이 천살의 불안정을 가라앉히는 데 도움이 됩니다.',
    myth: '申子辰 → 未, 寅午戌 → 丑, 巳酉丑 → 辰, 亥卯未 → 戌. 년지·일지를 기준으로 봅니다.'
  },
  {
    name: '월살', hanja: '月殺', icon: '🍂', category: '흉살',
    summary: '메마르고 막히는 고초(枯草)의 살',
    description: '월살(月殺)은 12신살 중 하나로 고초살(枯草殺)이라고도 합니다. 메마른 풀처럼 기운이 위축되고 일이 막히는 흉살로, 재물·건강·일이 시들고 정체되는 시기를 의미합니다. 씨앗이 싹트지 못하는 메마름의 기운입니다.',
    positive: '위축의 시기를 인내로 견디며 내실을 다지는 힘이 길러집니다. 종교·정신 수양과 인연이 깊어, 어려움을 통해 마음의 깊이를 더하는 계기가 되기도 합니다.',
    caution: '재물의 정체, 의욕 저하, 일의 지연, 건강 약화에 주의해야 합니다. 큰 투자나 새로운 시작은 신중히 하고, 무리하기보다 기존을 지키는 편이 안전합니다.',
    careers: ['종교인', '회계·관리직', '연구직', '꾸준함이 필요한 전문직'],
    advice: '메마름의 시기에는 확장보다 내실에 집중하세요. 조급함을 내려놓고 기본기를 다지면 다음 도약의 기반이 됩니다.',
    myth: '申子辰 → 戌, 寅午戌 → 辰, 巳酉丑 → 未, 亥卯未 → 丑. 년지·일지를 기준으로 봅니다.'
  },
  {
    name: '육해살', hanja: '六害殺', icon: '⏳', category: '흉살',
    summary: '더디고 발목 잡히는 장애의 살',
    description: '육해살(六害殺)은 12신살 중 하나로, 여섯 가지(六) 해로움(害)이라는 뜻입니다. 일이 더디게 진행되고 자주 발목이 잡히며, 질병·구설·방해로 인해 노력에 비해 결실이 더딘 기운입니다. 가까운 사람으로 인한 손해나 배신과도 관련됩니다.',
    positive: '인내심과 끈기가 길러지고, 작은 일도 꼼꼼히 챙기는 신중함이 생깁니다. 어려움 속에서 진짜 인연과 거짓 인연을 가려내는 안목이 키워집니다.',
    caution: '만성 질환, 일의 지연, 가까운 사람으로 인한 구설·손해에 주의해야 합니다. 건강 관리를 꾸준히 하고, 보증·동업 등 인간관계가 얽힌 거래는 신중히 결정해야 합니다.',
    careers: ['의료·요양직', '꼼꼼함이 필요한 관리직', '연구직', '서비스 전문직'],
    advice: '조급해하지 말고 한 걸음씩 꾸준히 나아가세요. 건강을 먼저 챙기고 사람 관계에 신중하면 육해의 더딤을 줄일 수 있습니다.',
    myth: '申子辰 → 卯, 寅午戌 → 酉, 巳酉丑 → 子, 亥卯未 → 午. 년지·일지를 기준으로 봅니다.'
  },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  길신:    { bg: 'bg-amber-400/10',   text: 'text-amber-700',  border: 'border-amber-400/30' },
  반길반흉: { bg: 'bg-purple-400/10', text: 'text-purple-700', border: 'border-purple-400/30' },
  동살:    { bg: 'bg-sky-400/10',    text: 'text-sky-700',    border: 'border-sky-400/30' },
  예술살:  { bg: 'bg-indigo-400/10', text: 'text-indigo-700', border: 'border-indigo-400/30' },
  강맹살:  { bg: 'bg-rose-400/10',   text: 'text-rose-700',   border: 'border-rose-400/30' },
  흉살:    { bg: 'bg-red-400/10',    text: 'text-red-700',    border: 'border-red-400/30' },
  주기살:  { bg: 'bg-orange-400/10', text: 'text-orange-700', border: 'border-orange-400/30' },
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
        className="w-full p-5 flex items-center justify-between text-left hover:bg-foreground/3 transition-colors"
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
            <div className="px-5 pb-5 space-y-4 border-t border-foreground/10 pt-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">설명</h4>
                <p className="text-sm leading-relaxed">{sinsal.description}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-400/8 border border-emerald-400/20 rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-emerald-600 mb-1.5">✅ 긍정적 작용</h4>
                  <p className="text-sm text-foreground/80 leading-relaxed">{sinsal.positive}</p>
                </div>
                <div className="bg-rose-400/8 border border-rose-400/20 rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-rose-600 mb-1.5">⚠️ 주의 사항</h4>
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
                  <span key={i} className="text-xs bg-foreground/8 border border-foreground/10 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
              <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-3">
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

const SINSAL_CATEGORIES = ['전체', ...Object.keys(CATEGORY_STYLES)];

export default function SinsalGuidePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const filtered = SINSALS.filter(s => {
    const matchCat = category === '전체' || s.category === category;
    const matchSearch = !search || s.name.includes(search) || s.hanja.includes(search) || s.category.includes(search) || s.summary.includes(search);
    return matchCat && matchSearch;
  });

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
          className="w-full pl-9 pr-4 py-2.5 bg-foreground/8 border border-foreground/10 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:bg-foreground/8 transition-colors"
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2">
        {SINSAL_CATEGORIES.map(cat => {
          const active = category === cat;
          const cs = cat === '전체' ? null : CATEGORY_STYLES[cat];
          const count = cat === '전체' ? SINSALS.length : SINSALS.filter(s => s.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-all",
                active
                  ? cs
                    ? cn(cs.bg, cs.text, cs.border, "ring-1 ring-inset ring-current")
                    : "bg-primary/20 text-primary border-primary/40"
                  : "bg-foreground/5 text-muted-foreground border-foreground/10 hover:border-foreground/20"
              )}
            >
              {cat}
              <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 결과 수 */}
      <p className="text-xs text-muted-foreground">{filtered.length}개 신살</p>

      {/* 신살 카드 목록 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">검색 결과가 없습니다.</p>
        ) : (
          filtered.map(s => <SinsalCard key={s.name} sinsal={s} />)
        )}
      </div>

      {/* 안내 */}
      <div className="glass-panel border border-foreground/10 rounded-2xl p-5 text-sm text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/70 mb-2">신살(神殺)이란?</p>
        <p>신살(神殺)은 사주 팔자(四柱八字)의 년·월·일·시지(支)의 조합에서 특정 패턴을 발견하여 추가로 분석하는 보조 지표입니다. 길성(吉星, 神)은 좋은 기운, 흉성(凶星, 殺)은 주의가 필요한 기운이지만, 어떤 신살도 절대적이지 않습니다. 다른 사주 요소들과 종합적으로 판단해야 하며, 흉살이 있다고 해서 반드시 불행한 것은 아닙니다.</p>
      </div>
    </div>
  );
}
