import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

function getFailureTitle(code: string) {
  switch (code) {
    case "PAY_PROCESS_CANCELED":
      return "결제를 취소했습니다";
    case "PAY_PROCESS_ABORTED":
      return "결제 중 오류가 발생했습니다";
    default:
      return "결제를 완료하지 못했습니다";
  }
}

function getFailureDescription(code: string, message: string) {
  switch (code) {
    case "PAY_PROCESS_CANCELED":
      return "결제창에서 취소하셨습니다. 준비되면 다시 시도하실 수 있습니다.";
    case "PAY_PROCESS_ABORTED":
      return message || "결제 처리 중 예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    default:
      return message || "결제 인증이 완료되지 않았습니다. 다시 시도하거나 다른 결제수단을 선택해주세요.";
  }
}

export default function PaymentFailPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const code = params.get("code")?.trim() ?? "";
  const message = params.get("message")?.trim() ?? "";
  const orderId = params.get("orderId")?.trim() ?? "";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="glass-panel w-full rounded-3xl border border-rose-400/20 p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10">
            <AlertCircle className="h-6 w-6 text-rose-300" />
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-rose-200/80">
              Toss Payments
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              {getFailureTitle(code)}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          <div>주문번호 {orderId || "-"}</div>
          {code && <div className="mt-2">오류 코드 {code}</div>}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
          {getFailureDescription(code, message)}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/saju">
            <Button className="gap-2">
              <RotateCcw className="h-4 w-4" />
              다시 시도하기
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="outline">마이페이지로 이동</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
