import { useId, useRef, useState } from "react";
import {
  customFetch, downloadReportFile, useConfirmCommercePayment,
  useCreateCommerceOrder, useGetCommerceProducts, type MonetizationBirthInfo,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { BookOpenText, FileText, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { buildAuthHref } from "@/lib/auth-redirect";
import { startCommercePayment, type TossCheckoutUser } from "@/lib/toss-payments";
import { NewYearOffer } from "./NewYearOffer";
import { ReviewCheckout, useReviewCatalog } from "./ReviewCheckout";
import { getCampaignVisit } from "@/lib/campaign-tracking";
import type { ReportFocus } from "@/lib/report-focus";
import { REPORT_ACCESS_NOTICE, REPORT_DELIVERY_NOTICE } from "@/lib/report-policy";

type Tier = "saju_basic" | "saju_detail" | "saju_full";
type Focus = "career" | "money" | "relationship";
const TIERS: Tier[] = ["saju_basic", "saju_detail", "saju_full"];
const FOCUSES: { value: Focus; label: string; description: string }[] = [
  { value: "career", label: "이직", description: "직무와 일하는 조건" },
  { value: "money", label: "돈", description: "수입·지출과 생활 관리" },
  { value: "relationship", label: "연애", description: "관계와 대화 방식" },
];
const DETAILS: Record<Tier, { audience: string; sections: string[]; sample: string }> = {
  saju_basic: {
    audience: "내 성향과 지금 고민을 짧게 정리하고 싶은 분",
    sections: ["선택한 고민: 해석 근거 · 현실 점검 · 다음 행동", "사주 원국 · 오행 차트 · 핵심 요약", "계산 기준 · 생활 점검 · 성격 분석"],
    sample: "saju-basic.pdf",
  },
  saju_detail: {
    audience: "직업·재물·관계와 현재 흐름을 함께 돌아보고 싶은 분",
    sections: ["기본 리포트의 모든 내용", "직업 · 재물 관리 · 연애 · 건강 참고 해석", "지장간 · 용신 · 천간합 · 육친과 주의점", "대운 타임라인 · 현재 대운 · 교운기와 월별 흐름"],
    sample: "saju-detail.pdf",
  },
  saju_full: {
    audience: "어린 시절부터 지금까지 돌아보고 앞으로의 흐름도 읽고 싶은 분",
    sections: ["상세 리포트의 모든 내용", "태어난 해부터 현재까지 연도별 회고", "각 해의 해석 근거와 돌아볼 질문", "올해와 앞으로의 연도별 흐름 · 참고 조언"],
    sample: "saju-full.pdf",
  },
};
const SAMPLE_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/report-samples`;

interface Props {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  initialFocus?: ReportFocus;
  reportEdition?: "new-year-2027";
}

export function ReportPurchaseOptions({ birthInfo, isAuthenticated, isAdmin = false, initialFocus = "career", reportEdition }: Props) {
  const isNewYear = reportEdition === "new-year-2027";
  const id = useId();
  const { user, setAuthenticatedUser } = useAuth();
  const catalog = useGetCommerceProducts(user?.id);
  const createOrder = useCreateCommerceOrder();
  const confirmPayment = useConfirmCommercePayment();
  const [tier, setTier] = useState<Tier>(isNewYear ? "saju_detail" : "saju_basic");
  const [focus, setFocus] = useState<Focus>(initialFocus);
  const [message, setMessage] = useState<string | null>(null);
  const [readyReport, setReadyReport] = useState<{ id: number; title: string; fileName?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const purchaseLock = useRef(false);
  const selectedProduct = catalog.data?.products.find((product) => product.type === tier);
  const adminAccess = isAdmin || catalog.data?.checkoutMode === "admin";
  const liveCheckout = Boolean(catalog.data?.salesEnabled && catalog.data.checkoutMode !== "disabled");
  const reviewEligible = !adminAccess && !isNewYear && tier === "saju_basic" && !liveCheckout;
  const review = useReviewCatalog(reviewEligible);
  const reviewPending = reviewEligible && !catalog.isError && (catalog.isPending || review.isPending);
  const reviewError = reviewEligible && !catalog.isPending && !catalog.isError && review.isError;
  const reviewAvailable = Boolean(reviewEligible && !catalog.isPending && !catalog.isError && !review.isError
    && review.data?.enabled && selectedProduct && review.data.product.type === selectedProduct.type
    && review.data.product.amount === selectedProduct.amount);
  const available = Boolean(selectedProduct && (!isNewYear || birthInfo.hour >= 0) && (!isNewYear || selectedProduct.amount === catalog.data?.campaign.amount) && (!isNewYear || adminAccess || catalog.data?.campaign.salesEnabled) && (adminAccess
    || (catalog.data?.salesEnabled && catalog.data.checkoutMode !== "disabled")));
  const details = DETAILS[tier];
  const focusLabel = FOCUSES.find((item) => item.value === focus)!.label;
  const birthDate = `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일`;
  const timeLabel = birthInfo.hour === -1 ? "출생시간 모름"
    : `${String(birthInfo.hour).padStart(2, "0")}:${String(birthInfo.minute ?? 0).padStart(2, "0")}`;

  async function downloadReadyReport(report: NonNullable<typeof readyReport>) {
    setDownloading(true);
    try {
      await downloadReportFile(report.id, report.fileName ?? report.title);
    } catch {
      setMessage("리포트는 생성되었지만 다운로드하지 못했습니다. 아래 다운로드 버튼이나 마이페이지에서 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  }

  async function handlePurchase() {
    if (purchaseLock.current || !available || !selectedProduct) return;
    purchaseLock.current = true;
    setBusy(true);
    setMessage(null);
    setReadyReport(null);
    try {
      const authState = await customFetch<{ user: TossCheckoutUser | null }>("/api/auth/user");
      if (!authState.user?.id) {
        setAuthenticatedUser(null);
        setMessage("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }
      const created = await createOrder.mutateAsync({
        productType: tier, birthInfo, reportFocus: focus,
        ...(isNewYear ? { reportEdition, campaignVisitId: catalog.data?.campaign.analyticsEnabled ? getCampaignVisit()?.visitId : undefined } : {}),
        expectedAmount: adminAccess ? 0 : selectedProduct.amount,
        label: isNewYear ? catalog.data?.campaign.title : `${birthDate} ${selectedProduct.title} · ${focusLabel}`,
      });
      if (created.checkoutMode === "admin" || created.checkoutMode === "dev") {
        const report = created.checkoutMode !== "dev" ? created.report
          : (await confirmPayment.mutateAsync({ orderId: created.order.orderId })).report;
        if (report.status !== "ready") {
          setMessage(report.status === "failed"
            ? "리포트 생성에 실패했습니다. 마이페이지에서 상태를 확인하고 다시 생성해 주세요."
            : "리포트를 준비하고 있습니다. 마이페이지에서 생성 상태를 확인해 주세요.");
          return;
        }
        setReadyReport(report);
        setMessage(created.checkoutMode === "admin" ? "관리자 무료 리포트가 생성되었습니다." : "리포트가 생성되었습니다.");
        if (!isNewYear) await downloadReadyReport(report);
        return;
      }
      if (created.checkoutMode !== "provider" && created.checkoutMode !== "toss_pay") {
        setMessage("판매 준비 중입니다. 잠시 후 다시 확인해 주세요.");
        return;
      }
      setMessage("결제창으로 이동합니다.");
      await startCommercePayment({
        user: authState.user, orderId: created.order.orderId,
        amount: created.order.amount, orderName: created.report.title,
        checkoutMode: created.checkoutMode,
      });
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
      if (status === 401) {
        setAuthenticatedUser(null);
        setMessage("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
      } else {
        setMessage(error instanceof Error ? error.message : "리포트 주문을 처리하지 못했습니다.");
        if (status === 409) void catalog.refetch();
      }
    } finally {
      purchaseLock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-xl bg-primary/5 p-3 leading-6 text-muted-foreground">무료 요약에서 이어지는 맞춤 해석입니다. 선택한 리포트의 내용을 웹에서 읽고 PDF로 보관할 수 있습니다.</p>
      <fieldset disabled={busy} className="space-y-2">
        <legend className="mb-2 font-medium">1. 지금 가장 궁금한 고민</legend>
        <div className="grid grid-cols-3 gap-2">
          {FOCUSES.map((item) => (
            <label key={item.value} className={`cursor-pointer rounded-xl border p-2.5 ${focus === item.value ? "border-amber-600 bg-amber-50" : "border-foreground/10"}`}>
              <span className="flex items-center gap-1.5 font-medium">
                <input type="radio" name={`${id}-focus`} value={item.value} checked={focus === item.value} onChange={() => setFocus(item.value)} className="accent-amber-700" />{item.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
            </label>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">선택한 고민을 리포트 첫머리에 담습니다. 해석 근거, 현실에서 확인할 조건, 다음 행동을 함께 정리합니다.</p>
      </fieldset>

      <fieldset disabled={busy || catalog.isPending} className="space-y-2">
        <legend className="mb-2 font-medium">2. 필요한 리포트 범위</legend>
        {catalog.isPending ? <p role="status" className="text-muted-foreground">리포트 정보를 불러오고 있습니다.</p> : (isNewYear ? ["saju_detail"] as Tier[] : TIERS).map((value) => {
          const product = catalog.data?.products.find((item) => item.type === value);
          if (!product) return null;
          return (
            <label key={value} className={`block cursor-pointer rounded-xl border p-3 ${tier === value ? "border-amber-600 bg-amber-50" : "border-foreground/10"}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 font-medium"><input type="radio" name={`${id}-tier`} value={value} checked={tier === value} onChange={() => setTier(value)} className="accent-amber-700" />{isNewYear ? catalog.data?.campaign.title : product.title}</span>
                <span className="shrink-0 font-semibold text-amber-800">{adminAccess ? "관리자 무료" : `${product.amount.toLocaleString("ko-KR")}원`}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{isNewYear ? "성향·관계·직업·재물과 2027 연간·월별 요약을 함께 확인할 분" : DETAILS[value].audience}</span>
            </label>
          );
        })}
      </fieldset>

      {catalog.isError && <div role="alert" className="rounded-xl border border-foreground/10 p-3">상품 정보를 불러오지 못했습니다.<button type="button" className="ml-2 text-primary underline" onClick={() => void catalog.refetch()}>다시 불러오기</button></div>}
      {isNewYear && <NewYearOffer />}
      {isNewYear && birthInfo.hour < 0 && <p role="status" className="rounded-xl border p-3">2027 유료 분석의 출생시간 미입력 처리는 검수 전입니다. 현재는 출생시간을 입력해야 구매할 수 있습니다. 무료 요약은 이용 가능합니다.</p>}
      {!isNewYear && selectedProduct && (
        <div className="rounded-xl border border-foreground/10 bg-white/50 p-3">
          <p className="font-medium">{selectedProduct.title}에 담긴 내용</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">{details.sections.map((section) => <li key={section}>{section}</li>)}</ul>
          <a href={`${SAMPLE_BASE}/${details.sample}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-primary underline underline-offset-4"><FileText className="h-4 w-4" />이 리포트 실제 샘플 보기 <span className="sr-only">(새 탭)</span></a>
          <p className="mt-1 text-xs text-muted-foreground">가상 인물의 이직 고민을 담은 샘플입니다.</p>
        </div>
      )}

      <p className="text-xs leading-5 text-muted-foreground">{isNewYear ? "무료 핵심 요약에 상세 해석과 2027년 흐름을 더합니다. 구매한 내용은 웹과 PDF에서 확인할 수 있습니다. 선택한 주제는 고민별 점검에 사용하며 개별 질문 상담은 제공하지 않습니다." : "무료 핵심 요약에 전체 성격 풀이와 고민별 점검을 더합니다. 상품에 따라 직업·관계·대운, 과거 회고와 앞으로의 연도별 흐름이 포함됩니다. 구매한 내용은 웹에서 읽고 PDF로 보관할 수 있습니다."} 실제 사건이나 결과를 보장하지 않습니다.</p>
      <div className="rounded-xl border border-foreground/10 p-3">
        <p className="font-medium">발급 전 출생정보를 확인해 주세요</p>
        <p className="mt-1.5 leading-6">{birthDate} · {birthInfo.calendarType === "lunar" ? `음력 ${birthInfo.isLeapMonth ? "윤달" : "평달"}` : "양력"}<br />{timeLabel} · {birthInfo.gender === "male" ? "남성" : "여성"}</p>
        {birthInfo.hour === -1 && <p className="mt-1 text-xs text-muted-foreground">시주 관련 해석은 제한됩니다.</p>}
        <p className="mt-1 text-xs text-muted-foreground">입력이 다르면 사주 입력 화면에서 수정한 뒤 다시 분석해 주세요.</p>
      </div>
      {!available && !reviewAvailable && !reviewPending && !reviewError && !catalog.isPending && !catalog.isError && <p className="rounded-xl bg-foreground/5 p-3 font-medium">판매 준비 중</p>}
      <section aria-label="상품 제공 안내" className="space-y-1.5 rounded-xl border border-foreground/10 p-3 text-xs leading-6 text-muted-foreground">
        <p className="text-sm font-medium text-foreground">제공 방식 · 이용 기간</p>
        <p>{REPORT_DELIVERY_NOTICE}</p>
        <p>{REPORT_ACCESS_NOTICE}</p>
        <p>생성에 실패하면 구매 내역에서 다시 생성하거나 문의하기로 재제공·환불을 요청할 수 있습니다.</p>
        <Link href="/refund-policy" className="inline-flex min-h-10 items-center text-primary underline underline-offset-4">환불 및 취소 정책</Link>
      </section>
      {!adminAccess && available && (
        <fieldset className="rounded-xl border border-foreground/10 p-3" disabled={busy}>
          <legend className="px-1 font-medium">3. 결제수단</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-2">
            <input type="radio" name={`${id}-payment`} value={catalog.data?.checkoutMode} defaultChecked className="accent-primary" />
            {catalog.data?.checkoutMode === "toss_pay" ? "토스페이" : catalog.data?.checkoutMode === "dev" ? "개발 테스트 결제" : "카드 · 간편결제"}
          </label>
          <p className="text-xs leading-5 text-muted-foreground">1회 결제 · 자동 결제 없음</p>
        </fieldset>
      )}
      {reviewAvailable ? <ReviewCheckout product={review.data!.product} /> : reviewPending ? (
        <p role="status" className="text-muted-foreground">결제수단을 확인하고 있습니다.</p>
      ) : reviewError ? (
        <div role="alert" className="rounded-xl border p-3">결제수단을 불러오지 못했습니다. <button type="button" className="text-primary underline" onClick={() => void review.refetch()}>다시 불러오기</button></div>
      ) : !isAuthenticated ? (
        <p className="text-muted-foreground">리포트 발급과 보관은 로그인 후 이용할 수 있습니다. <Link href={buildAuthHref("/login")} className="text-primary underline">로그인 후 상품 확인</Link></p>
      ) : (
        <div className="space-y-2">
          <Button onClick={handlePurchase} disabled={!available || busy || downloading} className="w-full gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "리포트 요청 중" : !available ? "판매 준비 중" : adminAccess ? "관리자 무료 발급" : `${selectedProduct!.amount.toLocaleString("ko-KR")}원 결제하기`}
          </Button>
          {readyReport && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link href={`/reports/${readyReport.id}/view`}>
                <Button type="button" variant="outline" disabled={busy} className="h-auto min-h-10 w-full gap-2 whitespace-normal">
                  <BookOpenText className="h-4 w-4 shrink-0" />웹에서 바로 읽기
                </Button>
              </Link>
              <Button variant="outline" disabled={downloading || busy} className="h-auto min-h-10 w-full gap-2 whitespace-normal" onClick={() => void downloadReadyReport(readyReport)}>
                {downloading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <FileText className="h-4 w-4 shrink-0" />}방금 발급한 리포트 다운로드
              </Button>
            </div>
          )}
          <Link href="/account" className="block py-1 text-center text-xs text-primary underline">마이페이지에서 구매·발급 내역 확인</Link>
        </div>
      )}
      {message && <p role="status" aria-live="polite" className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 leading-6 text-amber-800">{message}</p>}
    </div>
  );
}
