import { useState } from "react";
import type { MonetizationBirthInfo } from "@workspace/api-client-react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, X } from "lucide-react";
import { ReportPurchaseOptions } from "./ReportPurchaseOptions";
import type { ReportFocus } from "@/lib/report-focus";
import { cn } from "@/lib/utils";

interface ReportPurchaseButtonProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  initialFocus?: ReportFocus;
  reportEdition?: "new-year-2027";
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function ReportPurchaseButton({ birthInfo, isAuthenticated, isAdmin = false, initialFocus, reportEdition, externalOpen, onOpenChange, className }: ReportPurchaseButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (externalOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" aria-label="맞춤 해석 리포트 옵션 보기"
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", className)}>
          맞춤 해석 보기<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-foreground/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-[61] flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(560px,calc(100vw-3rem))] sm:max-h-[calc(100dvh-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-foreground/10 px-5 py-4 sm:px-6">
            <div className="pt-1">
              <Dialog.Title className="font-serif text-xl">맞춤 해석 선택</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">1회 결제 · 자동 결제 없음</Dialog.Description>
            </div>
            <Dialog.Close aria-label="리포트 옵션 닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
            <ReportPurchaseOptions key={`${JSON.stringify(birthInfo)}:${initialFocus ?? "career"}:${reportEdition ?? "standard"}`} birthInfo={birthInfo} isAuthenticated={isAuthenticated} isAdmin={isAdmin} initialFocus={initialFocus} reportEdition={reportEdition} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
