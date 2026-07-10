import { Link, useLocation } from "wouter";

type LegalSection = {
  title: string;
  items: string[];
};

type LegalDocument = {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  "/terms": {
    title: "이용약관",
    description: "명해원 서비스 이용 조건과 회원의 기본 책임을 안내합니다.",
    updatedAt: "2026년 7월 7일",
    sections: [
      {
        title: "서비스 성격",
        items: [
          "명해원은 사주, 운세, 궁합, 길일 등 전통 명리 기반 참고용 콘텐츠를 제공합니다.",
          "분석 결과는 의료, 법률, 투자, 진로, 결혼 등 중요한 의사결정을 대신하지 않습니다.",
          "서비스 내용은 품질 개선, 운영 정책, 법령 변경에 따라 변경될 수 있습니다.",
        ],
      },
      {
        title: "회원 계정",
        items: [
          "회원은 정확한 계정 정보를 유지해야 하며, 계정 관리 책임은 회원에게 있습니다.",
          "타인의 계정을 무단으로 사용하거나 서비스 운영을 방해하는 행위는 제한될 수 있습니다.",
          "회원 탈퇴 시 관련 법령과 내부 보관 기준에 따라 일부 기록이 일정 기간 보관될 수 있습니다.",
        ],
      },
      {
        title: "유료 콘텐츠",
        items: [
          "유료 리포트, PDF, 추가 분석 등 결제 상품은 결제 전 화면에 표시된 조건에 따릅니다.",
          "결제 완료 후 제공되는 디지털 콘텐츠는 생성, 열람, 다운로드 상태에 따라 취소나 환불이 제한될 수 있습니다.",
          "중복 결제, 시스템 오류, 제공 실패가 확인되면 환불정책과 관련 법령에 따라 처리합니다.",
        ],
      },
      {
        title: "금지 행위",
        items: [
          "서비스 콘텐츠를 무단 복제, 배포, 판매하거나 자동화 도구로 대량 수집할 수 없습니다.",
          "허위 정보 입력, 비정상 결제 시도, 보안 우회 등 서비스 안정성을 해치는 행위는 금지됩니다.",
          "타인의 개인정보나 권리를 침해하는 문의, 게시, 요청은 제한될 수 있습니다.",
        ],
      },
      {
        title: "문의 및 분쟁 처리",
        items: [
          "서비스 이용, 결제, 환불 관련 문의는 하단 문의하기 경로로 접수합니다.",
          "본 약관에서 정하지 않은 사항은 관련 법령과 일반 상거래 관행을 따릅니다.",
        ],
      },
    ],
  },
  "/privacy": {
    title: "개인정보처리방침",
    description: "명해원이 처리하는 개인정보 항목과 이용 목적을 안내합니다.",
    updatedAt: "2026년 7월 7일",
    sections: [
      {
        title: "처리하는 개인정보",
        items: [
          "회원 기능 이용 시 이메일, 이름 또는 프로필 식별자, 인증 제공자 정보가 처리될 수 있습니다.",
          "사주 분석과 저장 기능 이용 시 생년월일, 출생시간, 성별, 이름 등 사용자가 입력한 정보가 처리될 수 있습니다.",
          "결제 기능 이용 시 주문번호, 결제 상태, 결제 금액, 리포트 제공 상태가 처리될 수 있으며 카드번호 등 결제수단 원문은 결제대행사가 관리합니다.",
        ],
      },
      {
        title: "이용 목적",
        items: [
          "회원 식별, 로그인 유지, 저장함 제공, 문의 응대 등 서비스 운영을 위해 사용합니다.",
          "사주, 운세, 궁합, 리포트 등 사용자가 요청한 분석 결과를 생성하고 보관하기 위해 사용합니다.",
          "결제 승인, 구매 내역 확인, 환불 처리, 부정 이용 방지를 위해 사용합니다.",
        ],
      },
      {
        title: "보관 및 파기",
        items: [
          "개인정보는 수집 목적 달성 후 지체 없이 파기하는 것을 원칙으로 합니다.",
          "관계 법령상 보관이 필요한 결제, 정산, 분쟁 처리 기록은 해당 법령에서 정한 기간 동안 보관될 수 있습니다.",
          "회원이 직접 삭제한 저장 정보는 복구가 어려울 수 있습니다.",
        ],
      },
      {
        title: "제3자 제공 및 처리 위탁",
        items: [
          "명해원은 법령상 근거가 있거나 사용자의 동의가 있는 경우를 제외하고 개인정보를 외부에 판매하지 않습니다.",
          "인증, 데이터 보관, 결제, 이메일 발송 등 서비스 운영에 필요한 범위에서 외부 서비스가 사용될 수 있습니다.",
          "결제 처리는 결제대행사의 정책과 보안 기준에 따라 진행됩니다.",
        ],
      },
      {
        title: "이용자 권리",
        items: [
          "이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
          "개인정보 관련 요청은 하단 문의하기 경로로 접수할 수 있습니다.",
          "요청 처리 시 본인 확인과 법령상 보관 의무 검토가 필요할 수 있습니다.",
        ],
      },
    ],
  },
  "/refund-policy": {
    title: "환불 및 취소 정책",
    description: "유료 리포트와 디지털 콘텐츠의 결제 취소 기준을 안내합니다.",
    updatedAt: "2026년 7월 7일",
    sections: [
      {
        title: "환불 가능 기준",
        items: [
          "결제 후 리포트 생성, 열람, 다운로드가 시작되지 않은 경우 취소 요청이 가능합니다.",
          "중복 결제, 결제 승인 오류, 서비스 장애로 콘텐츠가 제공되지 않은 경우 확인 후 환불합니다.",
          "관련 법령에서 보장하는 청약철회권은 본 정책보다 우선합니다.",
        ],
      },
      {
        title: "환불 제한 기준",
        items: [
          "사용자 입력 정보를 바탕으로 맞춤 생성된 PDF 리포트가 제공, 열람, 다운로드된 경우 환불이 제한될 수 있습니다.",
          "단순 변심, 입력 정보 오기재, 해석 결과에 대한 주관적 불만족은 콘텐츠 제공 상태에 따라 환불이 제한될 수 있습니다.",
          "부정 결제 시도나 약관 위반이 확인되면 환불 처리가 보류될 수 있습니다.",
        ],
      },
      {
        title: "요청 방법",
        items: [
          "환불 요청은 문의하기에서 주문번호, 결제일, 요청 사유를 함께 남겨주세요.",
          "접수 후 결제 상태, 리포트 제공 상태, 오류 여부를 확인해 처리합니다.",
          "카드 취소와 입금 시점은 결제대행사와 카드사 정책에 따라 달라질 수 있습니다.",
        ],
      },
    ],
  },
};

export default function LegalPage() {
  const [location] = useLocation();
  const document = LEGAL_DOCUMENTS[location] ?? LEGAL_DOCUMENTS["/terms"];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="glass-panel rounded-3xl border border-primary/15 p-6 md:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
          Legal
        </p>
        <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
          {document.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {document.description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground/70">
          시행일 및 최종 수정일: {document.updatedAt}
        </p>
      </section>

      <div className="grid gap-4">
        {document.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-primary/10 bg-card/35 p-5"
          >
            <h2 className="font-serif text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm leading-7 text-muted-foreground">
        <p className="font-medium text-foreground">참고용 콘텐츠 고지</p>
        <p className="mt-2">
          명해원의 사주 분석 결과는 참고용 콘텐츠이며, 의료·법률·투자·진로·결혼 등
          중요한 의사결정을 대신하지 않습니다.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/terms" className="text-primary hover:underline">
          이용약관
        </Link>
        <Link href="/privacy" className="text-primary hover:underline">
          개인정보처리방침
        </Link>
        <Link href="/refund-policy" className="text-primary hover:underline">
          환불 및 취소 정책
        </Link>
        <Link href="/inquiries" className="text-primary hover:underline">
          문의하기
        </Link>
      </div>
    </div>
  );
}
