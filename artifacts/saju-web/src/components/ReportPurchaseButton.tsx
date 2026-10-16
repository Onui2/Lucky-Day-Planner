import { useId, useState } from "react";
import { createPortal } from "react-dom";
import type { MonetizationBirthInfo } from "@workspace/api-client-react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X } from "lucide-react";
import { ReportPurchaseOptions } from "./ReportPurchaseOptions";
import type { ReportFocus } from "@/lib/report-focus";

interface ReportPurchaseButtonProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  initialFocus?: ReportFocus;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportPurchaseButton({ birthInfo, isAuthenticated, isAdmin = false, initialFocus, externalOpen, onOpenChange }: ReportPurchaseButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const panelId = useId();
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (externalOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };
  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="사주 PDF 리포트 옵션 보기" title="사주 PDF 리포트" aria-expanded={open} aria-controls={panelId}
        className="flex min-h-10 items-center gap-2 rounded-2xl bg-amber-600/90 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-900/30 backdrop-blur transition-all hover:bg-amber-500 sm:px-4">
        <Crown className="h-4 w-4" /><span>PDF로 받기</span>
      </button>
      {createPortal(<AnimatePresence>
        {open && (
          <motion.div id={panelId} role="region" aria-label="사주 PDF 리포트 선택"
            initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.18 }}
            onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
            className="fixed bottom-24 right-4 z-[60] flex max-h-[calc(100dvh-12rem)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-amber-400/20 bg-white/95 shadow-2xl shadow-amber-900/15 backdrop-blur-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700"><Crown className="h-4 w-4" /> 사주 PDF 리포트</div>
              <button onClick={() => setOpen(false)} aria-label="리포트 옵션 닫기" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-400/10 hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
              <ReportPurchaseOptions key={`${JSON.stringify(birthInfo)}:${initialFocus ?? "career"}`} birthInfo={birthInfo} isAuthenticated={isAuthenticated} isAdmin={isAdmin} initialFocus={initialFocus} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}
