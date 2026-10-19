import { useEffect, useId, useState } from "react";
import { Link, useSearch } from "wouter";
import { customFetch, useGetCommerceProducts } from "@workspace/api-client-react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReviewProducts, ReviewCheckout, useReviewCatalog } from "@/components/ReviewCheckout";
import { REPORT_ACCESS_NOTICE, REPORT_DELIVERY_NOTICE, REPORT_STORAGE_NOTICE } from "@/lib/report-policy";

export default function ReportProductsPage() {
  const id = useId();
  const search = useSearch();
  const catalog = useReviewCatalog();
  const commerce = useGetCommerceProducts();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [productType, setProductType] = useState("saju_basic");
  const products = getReviewProducts(catalog.data);
  const product = products.find(item => item.type === productType);
  const sample = product && `${import.meta.env.BASE_URL}report-samples/${product.type.replaceAll("_", "-")}.pdf`;
  const live = Boolean(commerce.data?.salesEnabled && commerce.data.checkoutMode !== "disabled");

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("review") === "cancelled") { setMessage("테스트 결제를 취소했습니다. 실제 청구된 금액은 없습니다."); return; }
    if (params.get("review") !== "return") return;
    let active = true;
    setBusy(true);
    setMessage("토스페이 테스트 승인 결과를 확인하고 있습니다.");
    void customFetch<{ status: "test_complete"; productType: string; title: string; amount: number }>("/api/commerce/review/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: params.get("orderId") }),
    }).then(result => { if (active) {
      setProductType(result.productType);
      setMessage(`${result.title} ${result.amount.toLocaleString("ko-KR")}원 테스트 결제가 완료되었습니다. 실제 청구와 유료 리포트 발급은 없으며, 공개 샘플을 확인할 수 있습니다.`);
    } })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : "테스트 결과를 확인하지 못했습니다."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [search]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">명해원 · 맞춤 해석</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">사주 리포트 선택</h1>
        <p className="mt-3 leading-7 text-muted-foreground">내 성향과 지금의 고민을 읽고, 한 권의 PDF로 보관하세요.</p>
      </header>
      <section className="rounded-2xl border bg-card p-5 sm:p-7" aria-label="상품 상세 및 결제">
        {catalog.isPending ? <p role="status">상품 정보를 불러오고 있습니다.</p> : catalog.isError ? (
          <div role="alert">상품을 불러오지 못했습니다. <Button variant="outline" onClick={() => void catalog.refetch()}>다시 시도</Button></div>
        ) : product && <>
          <fieldset disabled={busy} className="mb-6">
            <legend className="mb-3 text-sm font-medium">필요한 리포트 범위를 선택하세요</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {products.map(item => <label key={item.type} className={`cursor-pointer rounded-xl border p-4 ${item.type === product.type ? "border-primary bg-primary/5" : "border-foreground/10"}`}>
                <span className="flex items-center gap-2 text-sm font-medium"><input type="radio" name={`${id}-product`} value={item.type} checked={item.type === product.type} onChange={() => setProductType(item.type)} className="accent-primary" />{item.title}</span>
                <span className="mt-2 block text-xl font-semibold">{item.amount.toLocaleString("ko-KR")}원</span>
              </label>)}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <h2 className="text-lg font-semibold">{product.title}</h2>
            <p className="text-2xl font-semibold">{product.amount.toLocaleString("ko-KR")}원 <span className="text-xs font-normal text-muted-foreground">부가세 포함</span></p>
          </div>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>선택한 고민의 해석 근거 · 현실 점검 · 다음 행동</li>
            <li>{product.description}</li>
            <li>구매한 해석의 웹 열람과 PDF 다운로드</li>
          </ul>
          <a href={sample} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"><FileText className="h-4 w-4" />실제 PDF 샘플 보기<span className="sr-only">(새 탭)</span></a>
          <div className="mt-5 space-y-2 border-y py-5 text-sm leading-7 text-muted-foreground">
            <p>{REPORT_DELIVERY_NOTICE}</p><p>{REPORT_ACCESS_NOTICE}</p><p>{REPORT_STORAGE_NOTICE}</p>
            <p>1회 결제 · 자동 결제 없음</p>
            <Link href="/refund-policy" className="inline-flex min-h-11 items-center underline">환불 및 취소 정책</Link>
          </div>
          {catalog.data.enabled && !live && !commerce.isPending && !commerce.isError && <div className="mt-5"><ReviewCheckout key={product.type} product={product} disabled={busy} /></div>}
          {commerce.isError && <p role="alert" className="mt-5">결제수단을 불러오지 못했습니다. <button type="button" className="underline" onClick={() => void commerce.refetch()}>다시 불러오기</button></p>}
          {live ? <Link href="/saju" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-foreground">내 사주 입력하고 구매하기</Link>
            : !catalog.data.enabled && <p className="mt-5 text-sm text-muted-foreground">결제 서비스를 준비 중입니다. 무료 요약과 PDF 샘플을 먼저 확인해 주세요.</p>}
        </>}
        {message && <p role="status" aria-live="polite" className="mt-5 rounded-xl border p-4 text-sm leading-7">{message}</p>}
      </section>
      <p className="text-sm leading-7 text-muted-foreground">사주 풀이는 참고용 콘텐츠이며 실제 사건이나 결과를 보장하지 않습니다.</p>
    </div>
  );
}
