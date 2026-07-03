import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
} from "lucide-react";
import {
  downloadReportFile,
  useConfirmCommercePayment,
  useGetMyOrders,
  type ConfirmCommercePaymentResponse,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

type ConfirmationState = "confirming" | "ready" | "processing" | "failed" | "error";

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function toErrorMessage(error: unknown) {
  const status = getErrorStatus(error);

  if (status === 401 || status === 403) {
    return "로그인이 만료되었거나 필요합니다. 다시 로그인한 뒤 마이페이지에서 결제 상태를 확인해주세요.";
  }

  if (error instanceof Error && error.message.trim()) {
    if (/HTTP\s+(401|403)\b/i.test(error.message)) {
      return "로그인이 만료되었거나 필요합니다. 다시 로그인한 뒤 마이페이지에서 결제 상태를 확인해주세요.";
    }

    return error.message;
  }

  return "결제 확인 중 문제가 발생했습니다.";
}

export default function PaymentSuccessPage() {
  const search = useSearch();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const confirmPayment = useConfirmCommercePayment();
  const [state, setState] = useState<ConfirmationState>("confirming");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmCommercePaymentResponse | null>(null);
  const startedRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const orderId = params.get("orderId")?.trim() ?? "";
  const paymentKey = params.get("paymentKey")?.trim() ?? "";
  const amount = Number(params.get("amount") ?? "");

  const { data: ordersData, isLoading: isLoadingOrders, error: ordersError } =
    useGetMyOrders(isAuthenticated && Boolean(orderId));

  const order = useMemo(
    () => ordersData?.orders.find((item) => item.orderId === orderId) ?? null,
    [ordersData, orderId],
  );

  useEffect(() => {
    if (!orderId || !paymentKey || !Number.isFinite(amount)) {
      setState("error");
      setErrorMessage("결제 확인에 필요한 정보가 누락되었습니다.");
      return;
    }

    if (authLoading || isLoadingOrders) {
      return;
    }

    if (!isAuthenticated) {
      setState("error");
      setErrorMessage(
        "로그인이 만료되었거나 필요합니다. 다시 로그인한 뒤 마이페이지에서 결제 상태를 확인해주세요.",
      );
      return;
    }

    if (ordersError) {
      setState("error");
      setErrorMessage(toErrorMessage(ordersError));
      return;
    }

    if (!order) {
      setState("error");
      setErrorMessage("주문 정보를 찾지 못했습니다. 마이페이지에서 결제 상태를 확인해주세요.");
      return;
    }

    if (order.amount !== amount) {
      setState("error");
      setErrorMessage("결제 금액 검증에 실패했습니다. 안전을 위해 결제 승인을 중단했습니다.");
      return;
    }

    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    void confirmPayment
      .mutateAsync({ orderId, paymentKey })
      .then((confirmed) => {
        setResult(confirmed);

        if (confirmed.report.status === "ready") {
          setState("ready");
          return;
        }

        if (confirmed.report.status === "failed") {
          setState("failed");
          setErrorMessage(
            confirmed.report.failedReason ??
              "결제는 완료되었지만 PDF 생성 중 문제가 발생했습니다.",
          );
          return;
        }

        setState("processing");
      })
      .catch((error) => {
        setState("error");
        setErrorMessage(toErrorMessage(error));
      });
  }, [
    amount,
    authLoading,
    confirmPayment,
    isAuthenticated,
    isLoadingOrders,
    order,
    orderId,
    ordersError,
    paymentKey,
  ]);

  const report = result?.report;
  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="glass-panel w-full rounded-3xl border border-primary/20 p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
            {state === "confirming" ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : state === "ready" ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-300" />
            )}
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-primary/70">
              Toss Payments
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              {state === "confirming" && "결제를 확인하고 있습니다"}
              {state === "ready" && "결제가 완료되었습니다"}
              {state === "processing" && "결제는 완료되었고 PDF를 준비 중입니다"}
              {state === "failed" && "결제는 완료되었지만 후처리가 필요합니다"}
              {state === "error" && "결제 확인이 중단되었습니다"}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-4 w-4 text-primary" />
            주문번호 {orderId || "-"}
          </div>
          <div className="mt-2">
            결제 금액 {Number.isFinite(amount) ? `${amount.toLocaleString()}원` : "-"}
          </div>
          {result?.alreadyPaid && (
            <div className="mt-2 text-emerald-300">
              이미 승인된 결제여서 기존 결제 결과를 다시 불러왔습니다.
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
          {state === "confirming" && "결제 승인과 PDF 생성 상태를 서버에서 확인하는 중입니다."}
          {state === "ready" && "정밀 사주 PDF가 준비되었습니다. 바로 다운로드하거나 마이페이지에서 다시 받을 수 있습니다."}
          {state === "processing" && "결제 승인까지는 끝났습니다. PDF 생성이 조금 더 걸릴 수 있으니 마이페이지에서 상태를 확인해주세요."}
          {state === "failed" && (errorMessage ?? "PDF 생성에 실패했습니다. 마이페이지에서 재생성을 시도해주세요.")}
          {state === "error" && (errorMessage ?? "결제 확인 중 문제가 발생했습니다.")}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {state === "ready" && report && (
            <Button
              className="gap-2"
              onClick={async () => {
                setIsDownloading(true);
                try {
                  await downloadReportFile(report.id, report.fileName ?? report.title);
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isDownloading ? "다운로드 중..." : "PDF 다운로드"}
            </Button>
          )}

          <Link href="/account">
            <Button variant="outline">마이페이지에서 확인</Button>
          </Link>

          <Link href="/saju">
            <Button variant="ghost">사주 페이지로 돌아가기</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
