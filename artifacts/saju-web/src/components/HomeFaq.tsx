import { ChevronDown } from "lucide-react";
import { useGetCommerceProducts } from "@workspace/api-client-react";
import { REPORT_ACCESS_NOTICE, REPORT_DELIVERY_NOTICE, REPORT_STORAGE_NOTICE } from "@/lib/report-policy";

const QUESTIONS = [
  { question: "무료 요약과 유료 리포트는 어떻게 다른가요?", answer: "고민을 고르고 생년월일을 입력하면 핵심 요약을 무료로 볼 수 있습니다. 유료 리포트는 선택한 고민의 해석 근거와 실천 안내를 더하며, 상세·종합으로 갈수록 다루는 분야와 시기의 범위가 넓어집니다." },
  { question: "태어난 시간을 몰라도 볼 수 있나요?", answer: "네. 태어난 시간을 ‘모름’으로 선택하고 시작하세요. 다만 시주(태어난 시간에 해당하는 기둥) 관련 해석은 제한됩니다." },
  { question: "구매한 리포트는 어떻게 받나요?", answer: `${REPORT_DELIVERY_NOTICE} 구매한 계정으로 로그인한 뒤 ‘내 PDF · 구매 내역’에서 확인하세요.`, paymentNotice: true },
  { question: "PDF는 언제까지 다시 받을 수 있나요?", answer: `${REPORT_ACCESS_NOTICE} ${REPORT_STORAGE_NOTICE}` },
  { question: "자동으로 다시 결제되나요?", answer: "아니요. 리포트는 선택한 상품을 한 번 결제하는 방식이며, 구독이나 자동 정기결제는 없습니다." },
];

export default function HomeFaq() {
  const catalog = useGetCommerceProducts();
  const showTestNotice = catalog.data && (!catalog.data.salesEnabled || catalog.data.checkoutMode === "disabled");
  return (
    <section className="home-faq mt-14 w-full max-w-5xl sm:mt-20" aria-labelledby="home-faq-title">
      <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:gap-12">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary">이용 안내</p>
          <h2 id="home-faq-title" className="mt-3 text-2xl font-semibold sm:text-3xl">자주 묻는 질문</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">시작하기 전에<br className="hidden md:block" /> 궁금한 점을 확인하세요.</p>
        </div>
        <div className="border-t border-foreground/15">
          {QUESTIONS.map(item => <details key={item.question} className="group/faq border-b border-foreground/10">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/faq:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-2 pb-5 pr-5 text-sm leading-7 text-muted-foreground break-keep">
              <p>{item.answer}</p>
              {item.paymentNotice && showTestNotice && <p>테스트 결제는 실제 청구와 유료 리포트 발급이 없습니다.</p>}
            </div>
          </details>)}
        </div>
      </div>
    </section>
  );
}
