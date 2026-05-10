import { useMemo, useState } from "react";
import {
  customFetch,
  downloadReportFile,
  useConfirmCommercePayment,
  useCreateCommerceOrder,
  useGetMyReports,
  type CreateCommerceOrderResponse,
  type MonetizationBirthInfo,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, FileText, Sparkles } from "lucide-react";
import { buildAuthHref } from "@/lib/auth-redirect";
import { startTossCardPayment, type TossCheckoutUser } from "@/lib/toss-payments";

interface ReportPurchaseCardProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}

export function ReportPurchaseCard({
  birthInfo,
  isAuthenticated,
  isAdmin = false,
}: ReportPurchaseCardProps) {
  const { setAuthenticatedUser } = useAuth();
  const createOrder = useCreateCommerceOrder();
  const confirmPayment = useConfirmCommercePayment();
  const { data: reportsData } = useGetMyReports(isAuthenticated);
  const loginHref = buildAuthHref("/login");
  const [message, setMessage] = useState<string | null>(null);
  const [latestReportId, setLatestReportId] = useState<number | null>(null);
  const [latestReportName, setLatestReportName] = useState<string | null>(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);

  const latestReadyReport = useMemo(
    () => reportsData?.reports.find((report) => report.status === "ready") ?? null,
    [reportsData],
  );

  const buildOrderLabel = () =>
    `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 정밀 사주 리포트`;

  async function handlePurchase() {
    setMessage(null);
    setIsVerifyingSession(true);

    try {
      const authState = await customFetch<{ user: TossCheckoutUser | null }>(
        "/api/auth/user",
      );

      if (!authState.user?.id) {
        setAuthenticatedUser(null);
        setMessage("로그인 세션이 만료되었습니다. 다시 로그인한 뒤 리포트를 요청해주세요.");
        return;
      }

      const created = await createOrder.mutateAsync({
        productType: "saju_pdf",
        birthInfo,
        label: buildOrderLabel(),
      }) as CreateCommerceOrderResponse;

      if (created.checkoutMode === "admin") {
        setLatestReportId(created.report.id);
        setLatestReportName(created.report.fileName ?? created.report.title);
        setMessage(
          created.report.status === "ready"
            ? "관리자 권한으로 무료 리포트가 즉시 생성되었습니다."
            : "관리자 무료 리포트 생성이 지연되고 있습니다. 다시 시도하거나 마이페이지에서 확인해주세요.",
        );

        if (created.report.status === "ready") {
          await downloadReportFile(
            created.report.id,
            created.report.fileName ?? created.report.title,
          );
        }
        return;
      }

      if (created.checkoutMode === "dev") {
        const confirmed = await confirmPayment.mutateAsync({
          orderId: created.order.orderId,
        });
        setLatestReportId(confirmed.report.id);
        setLatestReportName(confirmed.report.fileName ?? confirmed.report.title);
        setMessage(
          confirmed.report.status === "ready"
            ? "개발 모드 결제가 완료되어 PDF 리포트가 생성되었습니다."
            : "결제는 완료되었지만 PDF 생성이 지연되고 있습니다. 마이페이지에서 재생성할 수 있습니다.",
        );
        return;
      }

      setMessage("토스 결제창으로 이동합니다...");
      await startTossCardPayment({
        user: authState.user,
        orderId: created.order.orderId,
        amount: created.order.amount,
        orderName: created.report.fileName ?? created.report.title,
      });
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : null;

      if (status === 401 || status === 403) {
        setAuthenticatedUser(null);
        setMessage("로그인 인증이 만료되었습니다. 다시 로그인한 뒤 이용해주세요.");
        return;
      }

      setMessage(
        error instanceof Error ? error.message : "리포트 주문 생성에 실패했습니다.",
      );
    } finally {
      setIsVerifyingSession(false);
    }
  }

  return (
    <Card className="glass-panel border-amber-400/30 bg-amber-400/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-300">
          <Crown className="w-5 h-5" />
          정밀 사주 PDF 리포트
        </CardTitle>
        <CardDescription>
          핵심 요약, 성격, 직업운, 연애운, 건강운, 대운 조언까지 한 번에 정리한 유료 리포트입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">
                정밀 사주 PDF 리포트
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {isAdmin
                  ? "관리자 권한이면 결제 없이 즉시 생성되고, 마이페이지에서 다시 다운로드할 수 있습니다."
                  : "결제 후 즉시 생성되고, 마이페이지에서 다시 다운로드할 수 있습니다."}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-serif text-amber-300">
                {isAdmin ? "무료" : "4,900원"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isAdmin ? "관리자 무료 다운로드" : "PDF 재다운로드 포함"}
              </div>
            </div>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            리포트 구매와 저장은 로그인 후 사용할 수 있습니다.
            <div className="mt-3">
              <Link href={loginHref} className="text-primary hover:underline">
                로그인하러 가기
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handlePurchase}
              disabled={isVerifyingSession || createOrder.isPending || confirmPayment.isPending}
              className="gap-2"
            >
              {isVerifyingSession || createOrder.isPending || confirmPayment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isAdmin ? "관리자 무료 리포트 받기" : "정밀 리포트 구매하기"}
            </Button>

            {(latestReportId || latestReadyReport) && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  downloadReportFile(
                    latestReportId ?? latestReadyReport!.id,
                    latestReportName ?? latestReadyReport?.fileName ?? latestReadyReport?.title,
                  )
                }
              >
                <FileText className="w-4 h-4" />
                최근 리포트 다운로드
              </Button>
            )}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
