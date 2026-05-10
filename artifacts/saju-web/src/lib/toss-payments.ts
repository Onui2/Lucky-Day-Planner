const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TossPaymentRequest = {
  method: "CARD";
  amount: {
    value: number;
    currency: "KRW";
  };
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
};

type TossPaymentInstance = {
  requestPayment(request: TossPaymentRequest): Promise<unknown>;
};

type TossPaymentsInstance = {
  payment(params: { customerKey: string }): TossPaymentInstance;
};

type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

export interface TossCheckoutUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface StartTossCardPaymentParams {
  user: TossCheckoutUser;
  orderId: string;
  amount: number;
  orderName: string;
}

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

let tossPaymentsPromise: Promise<TossPaymentsFactory> | null = null;

function getClientKey() {
  const clientKey =
    import.meta.env.VITE_TOSS_CLIENT_KEY?.trim() ??
    import.meta.env.VITE_TOSS_API_CLIENT_KEY?.trim() ??
    "";

  if (!clientKey) {
    throw new Error(
      "운영 결제 모드에는 `VITE_TOSS_CLIENT_KEY` 환경변수가 필요합니다.",
    );
  }

  return clientKey;
}

function buildAbsoluteAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${BASE}${normalizedPath}`, window.location.origin).toString();
}

function buildCustomerName(user: TossCheckoutUser) {
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  const joined = `${lastName}${firstName}`.trim();
  return joined || undefined;
}

function generateCustomerKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `customer_${crypto.randomUUID()}`.slice(0, 50);
  }

  return `customer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`.slice(0, 50);
}

function getStoredCustomerKey(userId: string) {
  const storageKey = `lucky_day_toss_customer_${userId}`;

  try {
    const cached = window.localStorage.getItem(storageKey);
    if (cached) {
      return cached;
    }
  } catch {
    // Ignore storage failures and fall back to an ephemeral key.
  }

  const nextKey = generateCustomerKey();

  try {
    window.localStorage.setItem(storageKey, nextKey);
  } catch {
    // Ignore storage failures and use the generated key for this session only.
  }

  return nextKey;
}

async function loadTossPayments() {
  if (typeof window === "undefined") {
    throw new Error("브라우저 환경에서만 결제를 시작할 수 있습니다.");
  }

  if (window.TossPayments) {
    return window.TossPayments;
  }

  if (!tossPaymentsPromise) {
    tossPaymentsPromise = new Promise<TossPaymentsFactory>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TOSS_SDK_URL}"]`,
      );

      if (existing) {
        existing.addEventListener("load", () => {
          if (window.TossPayments) {
            resolve(window.TossPayments);
            return;
          }

          reject(new Error("토스 결제 SDK 초기화에 실패했습니다."));
        });
        existing.addEventListener("error", () => {
          tossPaymentsPromise = null;
          reject(new Error("토스 결제 SDK를 불러오지 못했습니다."));
        });
        return;
      }

      const script = document.createElement("script");
      script.src = TOSS_SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.TossPayments) {
          resolve(window.TossPayments);
          return;
        }

        tossPaymentsPromise = null;
        reject(new Error("토스 결제 SDK 초기화에 실패했습니다."));
      };
      script.onerror = () => {
        tossPaymentsPromise = null;
        reject(new Error("토스 결제 SDK를 불러오지 못했습니다."));
      };
      document.head.appendChild(script);
    });
  }

  return tossPaymentsPromise;
}

export async function startTossCardPayment({
  user,
  orderId,
  amount,
  orderName,
}: StartTossCardPaymentParams) {
  const clientKey = getClientKey();
  const tossPayments = await loadTossPayments();
  const payment = tossPayments(clientKey).payment({
    customerKey: getStoredCustomerKey(user.id),
  });

  await payment.requestPayment({
    method: "CARD",
    amount: {
      value: amount,
      currency: "KRW",
    },
    orderId,
    orderName,
    successUrl: buildAbsoluteAppUrl("/payments/success"),
    failUrl: buildAbsoluteAppUrl("/payments/fail"),
    customerEmail: user.email ?? undefined,
    customerName: buildCustomerName(user),
  });
}
