import { lazy, Suspense } from "react";
import { useGetCommerceProducts } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

const NewYearSample = lazy(() => import("./NewYearSample"));
export function NewYearOffer({ onPurchase }: { onPurchase?: () => void }) {
  const { user } = useAuth();
  const catalog = useGetCommerceProducts(user?.id);
  const campaign = catalog.data?.campaign;
  return <section aria-label="2027 신년운세 안내" className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm">
    <h2 className="font-serif text-2xl font-semibold">2027 종합 신년운세 · 9,900원</h2>
    <p className="mt-2 leading-6">생년월일 입력 후 기본 성향·오행·핵심 풀이를 무료로 확인하세요. 유료 리포트는 웹 열람과 PDF 저장을 함께 제공합니다. 현재 2027 유료 분석은 출생시간 입력이 필요합니다.</p>
    {catalog.isPending && <p role="status" className="mt-3">제공 범위를 확인하고 있습니다.</p>}
    {catalog.isError && <p role="alert" className="mt-3">상품 정보를 불러오지 못했습니다. <button type="button" className="underline" onClick={() => void catalog.refetch()}>다시 확인</button></p>}
    {campaign && <>
      <p className="mt-3 font-medium">제공 목차: {campaign.scope.join(" · ")}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{campaign.monthBasis}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">월별 요약은 월주·참고 점수입니다. 월별 서술형 심화와 1:1 상담은 포함하지 않습니다.</p>
      <details className="mt-4 rounded-xl border border-foreground/10 bg-background/70 p-3">
        <summary className="cursor-pointer font-medium">구매 전 실제 서식 3쪽 확인</summary>
        {campaign.sampleStatus === "verified" && campaign.samplePath
          ? <Suspense fallback={<p role="status">샘플 불러오는 중</p>}><NewYearSample path={campaign.samplePath} /></Suspense>
          : <p className="mt-3 leading-6 text-muted-foreground">2027년용 실제 샘플을 검수 중입니다. 준비할 페이지: {campaign.samplePages.join(" / ")}. 샘플 확인 전에는 일반 판매를 열지 않습니다.</p>}
      </details>
      {!campaign.salesEnabled && <p role="status" className="mt-3 text-muted-foreground">2027 유료 리포트는 판매 준비 중입니다. 무료 요약은 이용할 수 있습니다.</p>}
      {onPurchase && <Button type="button" className="mt-4" onClick={onPurchase}>9,900원 상품·샘플 확인</Button>}
    </>}
  </section>;
}
