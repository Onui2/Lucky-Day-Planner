export interface DreamKeyword {
  keyword: string;
  category: string;
  fortune: "great" | "good" | "neutral" | "bad" | "warning";
  meaning: string;
  detail: string;
  lucky?: string;
}

const DREAM_DB: DreamKeyword[] = [
  // ─── 동물 ─────────────────────────────────────────────────
  { keyword: "뱀", category: "동물", fortune: "good", meaning: "재물과 지혜의 징조", detail: "뱀은 재물운을 상징합니다. 뱀이 집 안으로 들어오는 꿈은 큰 재물이 들어올 길몽입니다. 특히 금색이나 황색 뱀은 금전운이 크게 상승함을 예고합니다.", lucky: "숫자 6, 색상 황금색" },
  { keyword: "용", category: "동물", fortune: "great", meaning: "출세와 성공의 대길몽", detail: "용은 최고의 길몽 중 하나입니다. 승천하는 용을 보거나 용이 되는 꿈은 사업 성공, 승진, 큰 행운을 예고합니다. 하늘로 올라가는 용은 특히 길합니다.", lucky: "숫자 9, 색상 황금색·파란색" },
  { keyword: "호랑이", category: "동물", fortune: "good", meaning: "용기와 권위의 상징", detail: "호랑이는 강한 권위와 리더십을 상징합니다. 호랑이를 타는 꿈은 높은 지위를 얻거나 강한 조력자를 만날 징조입니다. 다만 호랑이에게 쫓기는 꿈은 강한 경쟁자가 나타날 수 있음을 경고합니다.", lucky: "숫자 3, 색상 황금색" },
  { keyword: "돼지", category: "동물", fortune: "great", meaning: "재물과 복의 대길몽", detail: "돼지는 재물과 풍요를 상징하는 최고의 길몽입니다. 돼지를 잡거나 살진 돼지를 보는 꿈은 큰 재물이 들어올 징조입니다. 돼지 꿈을 꾸면 복권을 구매해볼 만합니다.", lucky: "숫자 7, 색상 황금색" },
  { keyword: "곰", category: "동물", fortune: "good", meaning: "강한 수호와 임신의 상징", detail: "곰은 모성과 보호를 상징합니다. 여성이 곰 꿈을 꾸면 임신의 징조일 수 있습니다. 곰이 집을 지키는 꿈은 강한 조력자나 보호자가 나타날 길조입니다.", lucky: "숫자 8, 색상 갈색" },
  { keyword: "물고기", category: "동물", fortune: "good", meaning: "재물운과 풍요의 상징", detail: "물고기는 재물과 풍요를 상징합니다. 큰 물고기를 잡거나 물고기가 가득한 연못을 보는 꿈은 금전적 이득을 예고합니다. 잉어는 특히 출세운을 상징합니다.", lucky: "숫자 4, 색상 파란색" },
  { keyword: "새", category: "동물", fortune: "good", meaning: "희소식과 좋은 소식의 전령", detail: "새는 희소식과 좋은 기회를 상징합니다. 새가 집으로 날아드는 꿈은 좋은 소식이 찾아올 징조입니다. 흰 새는 특히 행운과 순수함을 상징합니다.", lucky: "숫자 1, 색상 흰색" },
  { keyword: "독수리", category: "동물", fortune: "great", meaning: "성공과 고귀한 목표 달성", detail: "독수리는 높은 이상과 성공을 상징합니다. 독수리가 하늘 높이 나는 꿈은 목표한 바를 이룰 대길몽입니다. 독수리가 먹이를 낚아채는 꿈은 기회를 잡을 징조입니다.", lucky: "숫자 5, 색상 황금색" },
  { keyword: "개", category: "동물", fortune: "neutral", meaning: "충성과 우정, 또는 갈등의 예고", detail: "개는 충실한 친구나 조력자를 상징합니다. 반갑게 달려드는 개 꿈은 좋은 인연을 만날 징조입니다. 개에게 물리는 꿈은 배신이나 갈등을 예고할 수 있으니 주의하세요.", lucky: "숫자 2, 색상 갈색" },
  { keyword: "고양이", category: "동물", fortune: "neutral", meaning: "직관과 독립심, 변화의 예고", detail: "고양이는 신비롭고 직관적인 에너지를 상징합니다. 흰 고양이는 행운, 검은 고양이는 변화나 주의가 필요함을 암시합니다. 고양이가 품으로 들어오는 꿈은 부드러운 행운을 상징합니다.", lucky: "숫자 6, 색상 흰색" },
  { keyword: "소", category: "동물", fortune: "good", meaning: "노력의 결실과 재물 증가", detail: "소는 근면과 재물을 상징합니다. 살찐 소를 보는 꿈은 재산이 늘고 사업이 번창할 징조입니다. 소가 밭을 가는 꿈은 꾸준한 노력이 결실을 맺을 것을 예고합니다.", lucky: "숫자 2, 색상 황토색" },
  { keyword: "말", category: "동물", fortune: "great", meaning: "속도와 성공, 진취적 기상", detail: "말은 빠른 성공과 전진을 상징합니다. 백마를 타는 꿈은 크게 성공할 대길몽입니다. 준마(준마)가 달리는 꿈은 사업이나 일이 빠르게 진전될 것을 예고합니다.", lucky: "숫자 7, 색상 흰색·빨간색" },
  { keyword: "닭", category: "동물", fortune: "good", meaning: "새로운 시작과 알림의 상징", detail: "닭의 울음소리를 듣는 꿈은 새로운 시작과 기회를 알리는 길조입니다. 닭이 알을 낳는 꿈은 새로운 아이디어나 프로젝트가 결실을 맺을 징조입니다.", lucky: "숫자 1, 색상 황금색" },
  { keyword: "나비", category: "동물", fortune: "good", meaning: "변화와 아름다운 인연", detail: "나비는 아름다운 변화와 새로운 인연을 상징합니다. 화려한 나비가 날아드는 꿈은 좋은 사람과의 만남이나 낭만적인 인연을 예고합니다.", lucky: "숫자 3, 색상 분홍색" },
  { keyword: "벌", category: "동물", fortune: "good", meaning: "근면과 재물 축적", detail: "벌은 부지런함과 재물을 상징합니다. 꿀벌이 주위를 맴돌거나 꿀을 모으는 꿈은 꾸준한 노력으로 재물이 쌓일 것을 예고합니다. 다만 벌에 쏘이는 꿈은 사소한 방해가 있을 수 있습니다.", lucky: "숫자 6, 색상 황금색" },
  { keyword: "거북이", category: "동물", fortune: "great", meaning: "장수와 행운, 느린 성공", detail: "거북이는 장수, 지혜, 꾸준한 성공을 상징합니다. 거북이가 물에서 육지로 올라오는 꿈은 서서히 하지만 확실하게 성공할 것을 예고하는 대길몽입니다.", lucky: "숫자 8, 색상 녹색" },
  { keyword: "쥐", category: "동물", fortune: "neutral", meaning: "재물 또는 도둑의 이중적 상징", detail: "쥐는 재물을 가져오기도 하고 잃게 하기도 하는 이중적 상징입니다. 흰 쥐는 길몽으로 재물을 상징하지만, 물건을 훔쳐가는 쥐 꿈은 금전적 손실을 경고합니다.", lucky: "숫자 1, 색상 흰색" },
  { keyword: "원숭이", category: "동물", fortune: "neutral", meaning: "영리함과 속임수의 경계", detail: "원숭이는 영리함을 상징하지만 때로는 속임수를 경고하기도 합니다. 원숭이와 친하게 지내는 꿈은 영리한 파트너를 만날 징조, 원숭이에게 속는 꿈은 사기를 주의해야 합니다.", lucky: "숫자 3, 색상 주황색" },
  { keyword: "사자", category: "동물", fortune: "great", meaning: "권위와 강력한 리더십", detail: "사자는 왕의 기운을 상징합니다. 사자가 당신 앞에서 고개를 숙이는 꿈은 높은 지위와 권위를 얻을 대길몽입니다. 사자를 타는 꿈은 강력한 힘을 얻을 것을 예고합니다.", lucky: "숫자 9, 색상 황금색" },
  { keyword: "여우", category: "동물", fortune: "warning", meaning: "교활함과 유혹의 경고", detail: "여우는 유혹과 속임수를 상징합니다. 여우 꿈을 꾸면 주변의 달콤한 말이나 유혹에 주의하세요. 특히 이성 관계에서 속임수를 조심해야 합니다.", lucky: "숫자 2, 색상 빨간색" },

  // ─── 자연 현상 ─────────────────────────────────────────────
  { keyword: "비", category: "자연", fortune: "neutral", meaning: "정화와 새로운 시작의 예고", detail: "비는 씻어내고 새로 시작함을 상징합니다. 세차게 내리는 비는 큰 변화가 올 것을 예고하며, 부드러운 봄비는 풍요롭고 좋은 일이 천천히 찾아올 것을 암시합니다.", lucky: "숫자 4, 색상 파란색" },
  { keyword: "눈", category: "자연", fortune: "good", meaning: "순수함과 새 출발의 길조", detail: "눈은 순수함과 새 출발을 상징합니다. 흰 눈이 소복이 쌓이는 꿈은 새로운 기회와 깨끗한 출발을 예고하는 길몽입니다. 다만 눈보라 속에 갇히는 꿈은 어려움을 암시할 수 있습니다.", lucky: "숫자 1, 색상 흰색" },
  { keyword: "번개", category: "자연", fortune: "great", meaning: "갑작스러운 행운과 깨달음", detail: "번개는 갑작스럽고 강렬한 변화를 상징합니다. 번개를 맞는 꿈은 놀라운 대박 행운이 갑자기 찾아올 대길몽입니다. 번개가 하늘을 밝히는 꿈은 중요한 깨달음이나 아이디어를 예고합니다.", lucky: "숫자 7, 색상 황금색·흰색" },
  { keyword: "무지개", category: "자연", fortune: "great", meaning: "희망과 꿈의 실현", detail: "무지개는 희망과 아름다운 미래를 상징하는 대길몽입니다. 화려한 무지개를 보는 꿈은 오랜 소원이 이루어지고 행복한 날이 찾아올 것을 예고합니다.", lucky: "숫자 7, 색상 다양한 색상" },
  { keyword: "태양", category: "자연", fortune: "great", meaning: "성공과 번영, 건강의 상징", detail: "태양은 생명력과 성공을 상징하는 대길몽입니다. 밝게 빛나는 태양을 보는 꿈은 사업 번창, 건강 회복, 명예 상승을 예고합니다. 태양이 떠오르는 꿈은 새로운 시작과 성공을 암시합니다.", lucky: "숫자 9, 색상 황금색·빨간색" },
  { keyword: "달", category: "자연", fortune: "good", meaning: "여성성과 직관, 감성의 상승", detail: "달은 여성성, 직관, 변화의 주기를 상징합니다. 보름달이 환하게 빛나는 꿈은 소원 성취와 풍요를 예고하는 길몽입니다. 특히 두 개의 달이 뜨는 꿈은 더블 행운을 상징합니다.", lucky: "숫자 3, 색상 은색·흰색" },
  { keyword: "별", category: "자연", fortune: "good", meaning: "희망과 안내, 꿈의 실현", detail: "별은 희망과 안내를 상징합니다. 밝게 빛나는 별을 보거나 별이 떨어지는 꿈은 소원이 이루어질 것을 예고합니다. 수많은 별이 빛나는 밤하늘 꿈은 많은 행운이 찾아올 길조입니다.", lucky: "숫자 5, 색상 황금색·은색" },
  { keyword: "산", category: "자연", fortune: "good", meaning: "안정과 목표 달성", detail: "산은 큰 목표와 안정을 상징합니다. 높은 산을 정복하거나 산 정상에 서는 꿈은 어려운 목표를 달성할 대길몽입니다. 웅장한 산을 바라보는 꿈은 강력한 조력자가 생길 것을 예고합니다.", lucky: "숫자 8, 색상 초록색·갈색" },
  { keyword: "바다", category: "자연", fortune: "neutral", meaning: "무한한 가능성과 깊은 감정", detail: "바다는 무한한 가능성을 상징합니다. 잔잔한 바다는 평화와 안정을, 거친 파도가 치는 바다는 감정의 격동이나 큰 변화를 예고합니다. 바다에서 헤엄치는 꿈은 도전과 가능성을 상징합니다.", lucky: "숫자 4, 색상 파란색" },
  { keyword: "강", category: "자연", fortune: "good", meaning: "흐름과 재물의 연속성", detail: "강은 삶의 흐름과 재물을 상징합니다. 맑고 잔잔한 강물을 보는 꿈은 재물운이 좋아질 길조입니다. 강을 건너는 꿈은 현재의 어려움을 극복하고 새로운 단계로 나아갈 것을 예고합니다.", lucky: "숫자 6, 색상 파란색" },
  { keyword: "불", category: "자연", fortune: "good", meaning: "정열과 변화, 정화의 에너지", detail: "불은 강렬한 에너지와 변화를 상징합니다. 활활 타오르는 불은 열정과 성공을 예고하는 길몽입니다. 다만 통제하기 어려운 큰 불은 감정이나 상황이 과열될 수 있음을 경고합니다.", lucky: "숫자 2, 색상 빨간색" },
  { keyword: "구름", category: "자연", fortune: "neutral", meaning: "변화와 일시적인 장애", detail: "구름은 변화와 불확실성을 상징합니다. 흰 구름이 유유히 흐르는 꿈은 좋은 변화를 예고하지만, 먹구름이 하늘을 덮는 꿈은 어려움이나 방해가 있을 수 있음을 암시합니다.", lucky: "숫자 5, 색상 흰색" },
  { keyword: "바람", category: "자연", fortune: "neutral", meaning: "변화와 소식의 전달", detail: "바람은 소식과 변화를 상징합니다. 부드러운 봄바람은 좋은 소식이 올 것을 예고하고, 강한 폭풍 바람은 큰 변화나 도전이 올 것을 암시합니다.", lucky: "숫자 3, 색상 하늘색" },
  { keyword: "홍수", category: "자연", fortune: "warning", meaning: "감정의 범람과 위기 경고", detail: "홍수는 감정의 통제 불능이나 외부 위기를 경고합니다. 홍수를 피하는 꿈은 위기를 잘 넘길 것을 예고하지만, 홍수에 휩쓸리는 꿈은 어려운 상황에 처할 수 있음을 암시합니다.", lucky: "숫자 1, 색상 파란색" },

  // ─── 사람·관계 ─────────────────────────────────────────────
  { keyword: "아기", category: "사람", fortune: "great", meaning: "새로운 시작과 순수한 행운", detail: "아기는 새로운 시작과 순수한 행운을 상징합니다. 건강하고 예쁜 아기를 보는 꿈은 새로운 프로젝트 성공, 임신 예고, 순수한 행운을 의미하는 대길몽입니다.", lucky: "숫자 1, 색상 흰색·분홍색" },
  { keyword: "결혼", category: "사람", fortune: "good", meaning: "새로운 연합과 행복한 결실", detail: "결혼 꿈은 새로운 관계나 파트너십, 중요한 계약의 성사를 상징합니다. 아름다운 결혼식 꿈은 행복한 인연이나 사업 파트너를 만날 징조입니다.", lucky: "숫자 2, 색상 흰색·빨간색" },
  { keyword: "죽음", category: "사람", fortune: "neutral", meaning: "변화와 재생, 새로운 시작", detail: "꿈에서 죽음은 현실의 죽음을 의미하지 않습니다. 오히려 낡은 것의 끝과 새로운 시작을 상징합니다. 자신이 죽는 꿈은 현재 상황에서 벗어나 새롭게 거듭날 것을 예고하기도 합니다.", lucky: "숫자 9, 색상 흰색" },
  { keyword: "임신", category: "사람", fortune: "great", meaning: "창조와 풍요, 새 생명의 탄생", detail: "임신 꿈은 새로운 창조와 풍요를 상징하는 대길몽입니다. 임신 꿈을 꾸면 새로운 아이디어, 사업, 관계가 풍요롭게 자라날 것을 예고합니다. 태몽일 경우 새로운 생명의 탄생을 알립니다.", lucky: "숫자 8, 색상 황금색" },
  { keyword: "싸움", category: "사람", fortune: "neutral", meaning: "내적 갈등 또는 경쟁의 예고", detail: "싸움 꿈은 내면의 갈등이나 현실에서의 경쟁을 반영합니다. 싸움에서 이기는 꿈은 어려운 경쟁에서 승리할 것을 예고하고, 지는 꿈은 현재 상황을 다시 점검해야 함을 암시합니다.", lucky: "숫자 5, 색상 빨간색" },
  { keyword: "유명인", category: "사람", fortune: "good", meaning: "성공에 대한 열망과 영향력", detail: "유명인이나 연예인과 함께하는 꿈은 성공에 대한 강한 열망과 사회적 인정에 대한 욕구를 반영합니다. 유명인과 친하게 지내는 꿈은 사회적 지위나 영향력이 상승할 것을 예고합니다.", lucky: "숫자 7, 색상 황금색" },
  { keyword: "조상", category: "사람", fortune: "good", meaning: "보호와 인도, 중요한 메시지", detail: "돌아가신 조상이나 할머니·할아버지가 꿈에 나타나면 보호와 인도를 의미합니다. 특히 편안한 표정으로 나타나면 행운과 보호를 뜻하고, 무언가 말씀하시면 그 내용에 귀를 기울이세요.", lucky: "숫자 8, 색상 흰색" },
  { keyword: "귀신", category: "사람", fortune: "warning", meaning: "두려움과 억압된 감정의 표출", detail: "귀신 꿈은 억압된 두려움이나 해결되지 않은 문제를 상징합니다. 귀신을 무찌르는 꿈은 어려운 상황을 극복할 의지를 상징하고, 귀신에게 쫓기는 꿈은 회피하고 있는 문제를 마주해야 함을 암시합니다.", lucky: "숫자 4, 색상 흰색" },

  // ─── 행동·상황 ─────────────────────────────────────────────
  { keyword: "날기", category: "행동", fortune: "great", meaning: "자유와 높은 목표 달성", detail: "하늘을 자유롭게 나는 꿈은 자유, 성공, 높은 목표 달성을 상징하는 대길몽입니다. 높이 날수록 더 큰 성공을 예고합니다. 새처럼 가볍게 나는 꿈은 현재 상황에서 훌쩍 벗어날 것을 암시합니다.", lucky: "숫자 9, 색상 하늘색" },
  { keyword: "떨어지다", category: "행동", fortune: "neutral", meaning: "불안감과 통제력 상실의 반영", detail: "높은 곳에서 떨어지는 꿈은 현실에서의 불안감이나 자신감 부족을 반영합니다. 그러나 무사히 착지하는 꿈은 현재의 어려움을 잘 헤쳐나갈 것을 예고합니다.", lucky: "숫자 5, 색상 파란색" },
  { keyword: "쫓기다", category: "행동", fortune: "warning", meaning: "회피하는 문제나 압박감 경고", detail: "무언가에 쫓기는 꿈은 현실에서 피하고 있는 문제나 강한 압박을 반영합니다. 쫓기는 것에서 무사히 탈출하는 꿈은 어려운 상황을 극복할 것을 예고하지만, 잡히는 꿈은 문제를 직면해야 함을 암시합니다.", lucky: "숫자 2, 색상 파란색" },
  { keyword: "물에 빠지다", category: "행동", fortune: "neutral", meaning: "감정의 깊은 곳과 압도감", detail: "물에 빠지는 꿈은 압도적인 감정이나 상황을 반영합니다. 구조되는 꿈은 누군가의 도움을 받을 것을 예고하고, 스스로 헤엄쳐 나오는 꿈은 혼자 힘으로 어려움을 극복할 것을 상징합니다.", lucky: "숫자 6, 색상 파란색" },
  { keyword: "시험", category: "행동", fortune: "neutral", meaning: "평가와 도전에 대한 불안", detail: "시험을 보는 꿈은 현실에서 중요한 평가나 도전에 직면해 있음을 반영합니다. 시험에서 좋은 성적을 받는 꿈은 앞으로의 도전에서 좋은 결과를 얻을 것을 예고합니다.", lucky: "숫자 1, 색상 파란색" },
  { keyword: "이사", category: "행동", fortune: "good", meaning: "새로운 환경과 변화의 시작", detail: "이사하는 꿈은 새로운 환경이나 큰 변화가 찾아올 것을 예고합니다. 좋은 집으로 이사하는 꿈은 생활 환경이나 처지가 나아질 것을 상징하는 길몽입니다.", lucky: "숫자 3, 색상 녹색" },
  { keyword: "여행", category: "행동", fortune: "good", meaning: "새로운 경험과 확장의 기회", detail: "여행 꿈은 새로운 경험과 지평을 넓힐 기회를 상징합니다. 즐거운 여행 꿈은 좋은 일이 생기거나 좋은 사람을 만날 것을 예고합니다. 해외여행 꿈은 특히 큰 기회나 성장을 암시합니다.", lucky: "숫자 7, 색상 하늘색" },
  { keyword: "도둑", category: "행동", fortune: "neutral", meaning: "손실 위험 또는 탈취의 두려움", detail: "도둑 꿈은 금전적 손실이나 중요한 것을 잃을 위험을 경고합니다. 도둑을 잡는 꿈은 그러한 위험을 미리 방어할 수 있음을 예고하고, 도둑에게 당하는 꿈은 지출 관리에 주의가 필요합니다.", lucky: "숫자 4, 색상 검은색" },

  // ─── 물건·공간 ─────────────────────────────────────────────
  { keyword: "돈", category: "물건", fortune: "great", meaning: "재물운 상승의 대길몽", detail: "꿈에서 돈을 줍거나 받는 것은 재물운 상승을 예고하는 대길몽입니다. 특히 지폐 뭉치나 금화를 받는 꿈은 큰 재물이 들어올 것을 강하게 암시합니다.", lucky: "숫자 8, 색상 황금색" },
  { keyword: "집", category: "물건", fortune: "good", meaning: "안정과 자아, 가정의 상징", detail: "집은 자아와 가정의 상징입니다. 크고 아름다운 집에 사는 꿈은 안정과 번영을 예고합니다. 새 집을 얻는 꿈은 새로운 기회나 좋은 환경을 얻게 될 것을 암시합니다.", lucky: "숫자 4, 색상 황토색" },
  { keyword: "자동차", category: "물건", fortune: "good", meaning: "목표를 향한 추진력과 진행", detail: "자동차는 삶의 방향과 추진력을 상징합니다. 새 차를 사거나 좋은 차를 타는 꿈은 하고자 하는 일이 순조롭게 진행될 것을 예고합니다. 차 사고 꿈은 무리하지 말라는 경고일 수 있습니다.", lucky: "숫자 5, 색상 흰색·검은색" },
  { keyword: "음식", category: "물건", fortune: "good", meaning: "풍요와 만족, 재물의 상징", detail: "맛있는 음식을 먹는 꿈은 풍요와 만족을 상징합니다. 푸짐한 상차림 꿈은 재물이 늘거나 즐거운 일이 생길 것을 예고합니다. 상한 음식은 건강을 주의해야 함을 암시할 수 있습니다.", lucky: "숫자 6, 색상 황금색" },
  { keyword: "반지", category: "물건", fortune: "great", meaning: "인연과 약속, 특별한 관계", detail: "반지를 받거나 끼는 꿈은 소중한 인연이나 중요한 약속이 생길 것을 예고하는 대길몽입니다. 금반지나 다이아몬드 반지를 받는 꿈은 특히 행복한 인연을 암시합니다.", lucky: "숫자 2, 색상 황금색" },
  { keyword: "보석", category: "물건", fortune: "great", meaning: "귀한 가치와 큰 행운", detail: "빛나는 보석이나 다이아몬드를 보거나 받는 꿈은 크고 귀한 행운이 찾아올 대길몽입니다. 보석을 잃어버리는 꿈은 소중한 것을 잃지 않도록 주의해야 함을 경고합니다.", lucky: "숫자 7, 색상 황금색·보라색" },
  { keyword: "책", category: "물건", fortune: "good", meaning: "지식과 학업 성취의 길조", detail: "책을 읽거나 받는 꿈은 지식의 습득이나 학업·시험 성공을 예고하는 길몽입니다. 두꺼운 책은 풍부한 지혜와 경험을 얻게 됨을 상징합니다.", lucky: "숫자 3, 색상 파란색" },
  { keyword: "황금", category: "물건", fortune: "great", meaning: "부귀영화와 최고의 재물운", detail: "황금은 부귀와 영화를 상징하는 최고의 대길몽입니다. 금괴나 황금 보화를 발견하거나 받는 꿈은 큰 재물이 쏟아질 것을 예고합니다. 황금빛으로 빛나는 모든 것은 길조입니다.", lucky: "숫자 9, 색상 황금색" },
  { keyword: "열쇠", category: "물건", fortune: "great", meaning: "기회의 문과 비밀의 해결", detail: "열쇠를 얻거나 문을 여는 꿈은 오랫동안 닫혀 있던 기회나 문제가 해결될 것을 예고하는 대길몽입니다. 황금 열쇠는 특히 큰 기회와 성공을 상징합니다.", lucky: "숫자 1, 색상 황금색" },
  { keyword: "꽃", category: "물건", fortune: "good", meaning: "아름다운 인연과 행복", detail: "아름다운 꽃이 만발한 꿈은 행복하고 아름다운 일이 생길 것을 예고하는 길몽입니다. 꽃을 받는 꿈은 좋은 인연이나 기쁜 소식을 암시합니다. 장미는 특히 낭만적인 사랑을 상징합니다.", lucky: "숫자 3, 색상 빨간색·분홍색" },
  { keyword: "무기", category: "물건", fortune: "good", meaning: "강한 의지와 문제 해결 능력", detail: "검이나 창 같은 무기를 드는 꿈은 강한 의지와 결단력을 상징합니다. 무기로 적을 물리치는 꿈은 어려운 문제를 해결하고 승리할 것을 예고합니다.", lucky: "숫자 7, 색상 은색" },

  // ─── 장소·공간 ─────────────────────────────────────────────
  { keyword: "학교", category: "장소", fortune: "neutral", meaning: "성장과 배움, 평가의 과정", detail: "학교 꿈은 배움과 성장의 과정을 상징합니다. 졸업하는 꿈은 중요한 단계를 마무리하고 새 출발을 할 것을 예고합니다. 시험에 임박한 학교 꿈은 현실의 중요한 평가를 앞두고 있음을 반영합니다.", lucky: "숫자 4, 색상 파란색" },
  { keyword: "교회", category: "장소", fortune: "good", meaning: "영적 위안과 도움의 손길", detail: "교회나 절, 성전 같은 신성한 장소 꿈은 영적 보호와 위안을 상징합니다. 기도하는 꿈은 어려운 상황에서 도움을 받게 될 것을 예고합니다.", lucky: "숫자 8, 색상 흰색" },
  { keyword: "병원", category: "장소", fortune: "neutral", meaning: "건강에 대한 경각심", detail: "병원 꿈은 건강에 주의를 기울여야 함을 암시합니다. 병원에서 치료를 잘 받는 꿈은 현재의 건강 문제가 해결될 것을 예고하고, 오랫동안 병원에 있는 꿈은 건강 관리를 소홀히 하지 말라는 경고입니다.", lucky: "숫자 1, 색상 흰색" },
  { keyword: "궁궐", category: "장소", fortune: "great", meaning: "높은 지위와 명예, 대성공", detail: "왕궁이나 화려한 궁궐에 들어가는 꿈은 사회적 지위가 크게 높아지거나 명예를 얻을 대길몽입니다. 임금이나 귀한 사람을 만나는 꿈도 함께 나타나면 더욱 길합니다.", lucky: "숫자 9, 색상 황금색·빨간색" },
  { keyword: "무덤", category: "장소", fortune: "neutral", meaning: "과거의 정리와 새 출발", detail: "무덤 꿈은 과거와의 정리나 새로운 시작을 상징합니다. 밝고 정돈된 무덤을 보는 꿈은 과거의 짐을 내려놓고 새로 시작할 것을 예고하고, 흉흉한 무덤은 주의가 필요한 변화를 암시합니다.", lucky: "숫자 5, 색상 흰색" },
];

export interface DreamSearchResult {
  matched: DreamKeyword[];
  partialMatched: DreamKeyword[];
  totalFound: number;
}

export function searchDream(query: string): DreamSearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { matched: [], partialMatched: [], totalFound: 0 };

  const tokens = q.split(/\s+/).filter(Boolean);
  const matched: DreamKeyword[] = [];
  const partialMatched: DreamKeyword[] = [];
  const seen = new Set<string>();

  for (const entry of DREAM_DB) {
    const kw = entry.keyword.toLowerCase();
    const detail = (entry.detail + entry.meaning).toLowerCase();

    const exactHit = tokens.some(t => kw === t || kw.includes(t));
    const partialHit = tokens.some(t => detail.includes(t));

    if (exactHit && !seen.has(entry.keyword)) {
      matched.push(entry);
      seen.add(entry.keyword);
    } else if (partialHit && !seen.has(entry.keyword)) {
      partialMatched.push(entry);
      seen.add(entry.keyword);
    }
  }

  return { matched, partialMatched, totalFound: matched.length + partialMatched.length };
}

export function getFortuneLabel(fortune: DreamKeyword["fortune"]): { label: string; color: string } {
  const map: Record<DreamKeyword["fortune"], { label: string; color: string }> = {
    great:   { label: "대길", color: "#D4AF37" },
    good:    { label: "길",   color: "#4ade80" },
    neutral: { label: "중립", color: "#94a3b8" },
    bad:     { label: "흉",   color: "#f97316" },
    warning: { label: "주의", color: "#ef4444" },
  };
  return map[fortune];
}

export const CATEGORIES = [...new Set(DREAM_DB.map(d => d.category))];
export const POPULAR_KEYWORDS = ["돼지", "뱀", "용", "물고기", "돈", "황금", "태양", "아기", "보석", "말"];
