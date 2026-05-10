import { useMemo, useState } from "react";
import {
  downloadReportFile,
  useConfirmCommercePayment,
  useCreateCommerceOrder,
  useGetMyReports,
  type MonetizationBirthInfo,
} from "@workspace/api-client-react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, FileText, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "wouter";

interface ReportPurchaseButtonProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type OrderPayload = {
  checkoutMode?: string;
  order: { orderId: string };
  report: { id: number; status: string; title: string; fileName?: string | null };
};

export function ReportPurchaseButton({ birthInfo, isAuthenticated, isAdmin = false, externalOpen, onOpenChange }: ReportPurchaseButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  const [message, setMessage] = useState<string | null>(null);
  const [latestReportId, setLatestReportId] = useState<number | null>(null);
  const [latestReportName, setLatestReportName] = useState<string | null>(null);

  const createOrder = useCreateCommerceOrder();
  const confirmPayment = useConfirmCommercePayment();
  const { data: reportsData } = useGetMyReports(isAuthenticated && open);

  const latestReadyReport = useMemo(
    () => reportsData?.reports.find(r => r.status === "ready") ?? null,
    [reportsData],
  );

  const hasReport = latestReportId !== null || latestReadyReport !== null;

  async function handlePurchase() {
    setMessage(null);
    try {
      const created = (await createOrder.mutateAsync({
        productType: "saju_pdf",
        birthInfo,
        label: `${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 정밀 사주 리포트`,
      })) as OrderPayload;

      if (created.checkoutMode === "admin") {
        setLatestReportId(created.report.id);
        setLatestReportName(created.report.fileName ?? created.report.title);
        setMessage("PDF 리포트가 생성되었습니다.");
        return;
      }
      if (created.checkoutMode === "dev") {
        const confirmed = await confirmPayment.mutateAsync({ orderId: created.order.orderId });
        setLatestReportId(confirmed.report.id);
        setLatestReportName(confirmed.report.fileName ?? confirmed.report.title);
        setMessage(confirmed.report.status === "ready" ? "PDF 리포트가 생성되었습니다." : "PDF 생성 중입니다. 마이페이지에서 확인하세요.");
        return;
      }
      setMessage("주문이 생성되었습니다. 결제 연동 후 이용 가능합니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "주문 생성에 실패했습니다.");
    }
  }

  const busy = createOrder.isPending || confirmPayment.isPending;

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600/90 hover:bg-amber-500 text-white text-sm font-medium shadow-lg shadow-amber-900/30 backdrop-blur transition-all"
      >
        <Crown className="w-4 h-4" />
        {isAdmin ? "리포트 무료 발급" : "PDF 리포트 4,900원"}
      </button>

      {/* 팝업 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-28 right-4 z-50 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-amber-400/20 bg-[#1a1408]/95 shadow-2xl shadow-amber-900/30 backdrop-blur-xl overflow-hidden"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-amber-500/10">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-medium text-amber-100">정밀 사주 PDF 리포트</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* 설명 */}
              <p className="text-xs text-muted-foreground leading-5">
                핵심 요약, 성격, 직업운, 연애운, 건강운, 대운 조언까지 한 번에 정리한 리포트입니다.
                {isAdmin ? " 관리자는 무료로 즉시 발급됩니다." : " 결제 후 즉시 생성되고, 마이페이지에서 재다운로드 가능합니다."}
              </p>

              {/* 가격 */}
              {!isAdmin && (
                <div className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                  <span className="text-xs text-muted-foreground">정밀 사주 PDF</span>
                  <span className="text-lg font-serif text-amber-300 font-semibold">4,900원</span>
                </div>
              )}

              {!isAuthenticated ? (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-2">로그인 후 구매할 수 있습니다.</p>
                  <Link href="/login" className="text-xs text-primary hover:underline">로그인하러 가기</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handlePurchase}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isAdmin ? "무료 리포트 받기" : "리포트 구매하기"}
                  </button>

                  {hasReport && (
                    <button
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-amber-400/30 text-amber-200 text-sm hover:bg-amber-400/10 transition-colors"
                      onClick={() =>
                        downloadReportFile(
                          latestReportId ?? latestReadyReport!.id,
                          latestReportName ?? latestReadyReport?.fileName ?? latestReadyReport?.title,
                        )
                      }
                    >
                      <FileText className="w-4 h-4" />
                      최근 리포트 다운로드
                    </button>
                  )}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100 leading-5">
                  {message}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
