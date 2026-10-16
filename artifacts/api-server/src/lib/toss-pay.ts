// Direct Toss Pay contract API. This is separate from the Toss Payments PG SDK.
// References: https://docs-pay.toss.im/reference/normal/create,
// /normal/execute and /common/status (checked 2026-10-16).
export type TossPayMode = "TEST" | "LIVE";

export interface TossPayOrder {
  orderId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
}

interface TossPayConfig {
  apiKey: string;
  mode: TossPayMode;
}

export interface TossPayConfirmedPayment {
  provider: "toss_pay";
  paymentKey: string;
  method: string;
  status: "paid";
  amount: number;
  rawResponse: Record<string, unknown>;
  approvedAt: Date;
}

const API_BASE = "https://pay.toss.im/api/v2/";
const REQUEST_TIMEOUT_MS = 15_000;

function production() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function getTossPayConfig(): TossPayConfig | null {
  const apiKey = process.env.TOSS_PAY_API_KEY?.trim();
  if (!apiKey) return null;
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(apiKey) || apiKey.length > 30) {
    throw new Error("토스페이 서버 API 키 설정을 확인해 주세요.");
  }
  const mode = apiKey.startsWith("sk_test_") ? "TEST" : "LIVE";
  if (production() && mode !== "LIVE") {
    throw new Error("운영 환경에는 토스페이 실거래용 API 키가 필요합니다.");
  }
  return { apiKey, mode };
}

function requireConfig(): TossPayConfig {
  const config = getTossPayConfig();
  if (!config) throw new Error("토스페이 결제 설정이 준비되지 않았습니다.");
  return config;
}

function validateOrder(order: TossPayOrder) {
  if (!/^[\w:.^@-]{1,50}$/.test(order.orderId)
    || !Number.isSafeInteger(order.amount) || order.amount < 1 || order.amount > 1_000_000_000
    || order.currency !== "KRW") {
    throw new Error("토스페이 주문번호, 결제 금액 또는 통화를 확인해 주세요.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function request(
  endpoint: "payments" | "status" | "execute",
  config: TossPayConfig,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, apiKey: config.apiKey }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "error",
    });
    const data: unknown = await response.json();
    if (!response.ok || !isRecord(data) || data.code !== 0) throw new Error("invalid response");
    return data;
  } catch {
    // Never include provider messages, request bodies or fetch errors: they may
    // contain the server API key or payment/customer information.
    throw new Error("토스페이 처리 결과를 확인하지 못했습니다. 구매 내역에서 다시 확인해 주세요.");
  }
}

function returnUrl(page: "success" | "fail", orderId: string): string {
  let url: URL;
  try {
    url = new URL(process.env.APP_URL?.trim() || "");
  } catch {
    throw new Error("토스페이 결제를 위한 APP_URL 설정이 필요합니다.");
  }
  if (url.username || url.password || url.search || url.hash
    || (url.protocol !== "https:" && !(url.protocol === "http:" && !production()
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("토스페이 APP_URL은 신뢰할 수 있는 HTTPS 사이트 주소여야 합니다.");
  }
  const basePath = (process.env.BASE_PATH || "/").trim();
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]*\/?$/.test(basePath)) {
    throw new Error("토스페이 BASE_PATH 설정을 확인해 주세요.");
  }
  const existingPath = url.pathname.replace(/\/+$/, "");
  const configuredPath = basePath.replace(/\/+$/, "");
  // APP_URL may already include the deployed application's base path.
  if (existingPath && configuredPath && existingPath !== configuredPath) {
    throw new Error("토스페이 APP_URL과 BASE_PATH 경로가 일치하지 않습니다.");
  }
  url.pathname = `${existingPath || configuredPath}/payments/${page}`;
  url.searchParams.set("provider", "toss_pay");
  url.searchParams.set("orderId", orderId);
  if (page === "fail") url.searchParams.set("code", "USER_CANCEL");
  if (url.href.length > 255) throw new Error("토스페이 결제 복귀 주소가 너무 깁니다.");
  return url.href;
}

function checkoutUrl(value: unknown): string {
  try {
    if (typeof value !== "string" || value.length > 255) throw new Error();
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "pay.toss.im"
      || url.username || url.password || url.port) throw new Error();
    return url.href;
  } catch {
    throw new Error("토스페이 결제창 주소를 확인하지 못했습니다.");
  }
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 50 && !/\s/.test(value);
}

export async function createTossPayCheckout(order: TossPayOrder, title: string): Promise<{
  payToken: string;
  checkoutPage: string;
  mode: TossPayMode;
}> {
  validateOrder(order);
  const config = requireConfig();
  if (!title.trim() || title.length > 255 || /[\\"']/.test(title)) {
    throw new Error("토스페이 상품 설명을 확인해 주세요.");
  }
  const data = await request("payments", config, {
    orderNo: order.orderId,
    productDesc: title,
    amount: order.amount,
    amountTaxFree: 0,
    autoExecute: false,
    retUrl: returnUrl("success", order.orderId),
    retCancelUrl: returnUrl("fail", order.orderId),
  });
  if (!validToken(data.payToken)) throw new Error("토스페이 결제 토큰을 확인하지 못했습니다.");
  return { payToken: data.payToken, checkoutPage: checkoutUrl(data.checkoutPage), mode: config.mode };
}

function verifyIdentity(order: TossPayOrder, config: TossPayConfig, data: Record<string, unknown>) {
  const metadata = order.metadata;
  if (metadata?.checkoutProvider !== "toss_pay" || metadata.tossPayMode !== config.mode
    || !validToken(metadata.tossPayToken) || data.payToken !== metadata.tossPayToken
    || data.orderNo !== order.orderId || data.amount !== order.amount || data.mode !== config.mode
    || (data.currency !== undefined && data.currency !== "KRW")) {
    throw new Error("토스페이 결제 정보가 저장된 주문과 일치하지 않습니다.");
  }
}

function approvalDate(value: unknown): Date {
  if (typeof value !== "string") throw new Error("토스페이 결제 승인 시간을 확인하지 못했습니다.");
  // Provider timestamps without an offset use Korean local time, never host time.
  const local = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(value);
  const normalized = local ? `${local[1]}T${local[2]}+09:00` : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)) {
    throw new Error("토스페이 결제 승인 시간을 확인하지 못했습니다.");
  }
  const result = new Date(normalized);
  // Reject JS's permissive normalization of invalid days such as February 30.
  const calendar = normalized.slice(0, 10);
  const calendarDate = new Date(`${calendar}T00:00:00Z`);
  if (!Number.isFinite(result.getTime()) || !Number.isFinite(calendarDate.getTime())
    || calendarDate.toISOString().slice(0, 10) !== calendar
    || Number(normalized.slice(11, 13)) > 23) {
    throw new Error("토스페이 결제 승인 시간을 확인하지 못했습니다.");
  }
  return result;
}

function paidPayment(order: TossPayOrder, data: Record<string, unknown>): TossPayConfirmedPayment {
  if (data.payStatus !== "PAY_COMPLETE" && data.payStatus !== "SETTLEMENT_COMPLETE") {
    throw new Error("토스페이 결제가 완료되지 않았습니다. 구매 내역에서 다시 확인해 주세요.");
  }
  // A completed-looking status must not restore access after a partial refund.
  if (!Array.isArray(data.transactions) || data.transactions.length === 0
    || !data.transactions.some((item) => isRecord(item) && item.stepType === "PAY")
    || data.transactions.some((item) => !isRecord(item) || item.stepType === "REFUND")) {
    throw new Error("토스페이 거래 내역 또는 환불 상태를 확인해 주세요.");
  }
  if (data.payMethod !== "CARD" && data.payMethod !== "TOSS_MONEY") {
    throw new Error("토스페이 결제 수단을 확인하지 못했습니다.");
  }
  return {
    provider: "toss_pay",
    paymentKey: data.payToken as string,
    method: data.payMethod,
    status: "paid",
    amount: order.amount,
    rawResponse: data,
    approvedAt: approvalDate(data.paidTs),
  };
}

export async function confirmTossPayPayment(
  order: TossPayOrder,
  allowExecute: boolean,
): Promise<TossPayConfirmedPayment> {
  validateOrder(order);
  const config = requireConfig();
  // Check the stored checkout binding before making any provider request.
  verifyIdentity(order, config, {
    orderNo: order.orderId, amount: order.amount, mode: config.mode,
    payToken: order.metadata?.tossPayToken,
  });
  let status = await request("status", config, { orderNo: order.orderId });
  verifyIdentity(order, config, status);
  if (status.payStatus === "PAY_APPROVED" && allowExecute) {
    try {
      const execution = await request("execute", config, {
        payToken: order.metadata!.tossPayToken, orderNo: order.orderId,
      });
      verifyIdentity(order, config, execution);
    } catch {
      // Includes timeout, duplicate approval and a racing request. Never retry
      // execute blindly: only the canonical status can prove money moved.
    }
    status = await request("status", config, { orderNo: order.orderId });
    verifyIdentity(order, config, status);
  }
  return paidPayment(order, status);
}
