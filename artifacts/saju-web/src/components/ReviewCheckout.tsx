import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch, type CommerceProduct } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReviewCatalog = { enabled: boolean; product: CommerceProduct };

export function useReviewCatalog(enabled = true) {
  return useQuery({
    queryKey: ["commerce", "review"],
    queryFn: () => customFetch<ReviewCatalog>("/api/commerce/review"),
    enabled,
  });
}

/** Isolated provider test flow: never creates paid orders or report access. */
export function ReviewCheckout({ product, disabled = false }: { product: CommerceProduct; disabled?: boolean }) {
  const id = useId();
  const checkoutLock = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function openCheckout() {
    if (disabled || checkoutLock.current) return;
    checkoutLock.current = true;
    setBusy(true);
    setMessage(null);
    const request = new AbortController();
    activeRequest.current = request;
    try {
      const result = await customFetch<{ checkoutPage: string }>("/api/commerce/review/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productType: product.type }),
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      const url = new URL(result.checkoutPage);
      if (url.origin !== "https://pay.toss.im" || url.username || url.password) throw new Error("결제창 주소를 확인하지 못했습니다.");
      window.location.assign(url.href);
    } catch (error) {
      if (request.signal.aborted) return;
      setMessage(error instanceof Error ? error.message : "테스트 결제창을 열지 못했습니다.");
      checkoutLock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div role="note" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">입점 심사용 테스트 결제</p>
        <p>토스페이 결제창과 인증 흐름을 확인할 수 있습니다. 실제 금액은 청구되지 않으며, 유료 리포트는 발급되지 않습니다.</p>
      </div>
      <fieldset disabled={disabled || busy}>
        <legend className="mb-2 text-sm font-medium">결제수단</legend>
        <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3">
          <input type="radio" name={`${id}-review-payment`} value="toss_pay" defaultChecked />토스페이
        </label>
      </fieldset>
      <Button className="min-h-12 w-full" disabled={disabled || busy} onClick={() => void openCheckout()}>
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />결제창 연결 중</> : `${product.amount.toLocaleString("ko-KR")}원 토스페이 테스트 결제`}
      </Button>
      {message && <p role="alert" className="rounded-xl border p-3 text-sm leading-6">{message}</p>}
    </div>
  );
}
