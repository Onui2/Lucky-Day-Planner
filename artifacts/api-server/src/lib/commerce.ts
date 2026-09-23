import crypto from "node:crypto";
import {
  type AiQuestionRow,
  aiQuestionsTable,
  db,
  type InsertAiQuestion,
  type JsonObject,
  type OrderRow,
  ordersTable,
  type ReportBirthInfo,
  type UserSubscriptionRow,
  userSubscriptionsTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";

export type ProductType = "saju_pdf" | "gungap_premium" | "year_fortune_report";

export interface ProductConfig {
  type: ProductType;
  title: string;
  amount: number;
  description: string;
}

export interface ConfirmedPayment {
  provider: "toss" | "dev";
  paymentKey: string;
  method: string;
  status: "paid";
  amount: number;
  rawResponse: Record<string, unknown>;
  approvedAt: Date;
}

const PRODUCT_CATALOG: Record<ProductType, ProductConfig> = {
  saju_pdf: {
    type: "saju_pdf",
    title: "정밀 사주 PDF 리포트",
    amount: 4900,
    description: "개인 사주 종합 분석 PDF 리포트",
  },
  gungap_premium: {
    type: "gungap_premium",
    title: "궁합 심층 분석",
    amount: 9900,
    description: "두 사람의 관계와 궁합 흐름을 깊게 분석한 리포트",
  },
  year_fortune_report: {
    type: "year_fortune_report",
    title: "연간 운세 리포트",
    amount: 14900,
    description: "1년 운세 흐름과 주의 시기를 정리한 리포트",
  },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function getProductConfig(productType: string): ProductConfig | null {
  return PRODUCT_CATALOG[productType as ProductType] ?? null;
}

export function createMerchantOrderId(prefix = "MHW") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function getCheckoutMode() {
  if (process.env.TOSS_SECRET_KEY?.trim()) return "provider";
  return isDevelopmentPaymentMode() ? "dev" : "disabled";
}

export function isDevelopmentPaymentMode() {
  return process.env.NODE_ENV !== "production"
    && process.env.VERCEL_ENV !== "production"
    && process.env.PAYMENT_SIMULATION_ENABLED === "true"
    && !process.env.TOSS_SECRET_KEY?.trim();
}

export function getPlanQuestionLimit(planCode?: string | null): number {
  switch (planCode) {
    case "expert":
      return 200;
    case "pro":
      return 80;
    case "premium":
      return 20;
    default:
      return 3;
  }
}

export function getMonthlyBucket(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getActiveSubscription(userId: string): Promise<UserSubscriptionRow | null> {
  const now = new Date();
  const [subscription] = await db
    .select()
    .from(userSubscriptionsTable)
    .where(
      and(
        eq(userSubscriptionsTable.userId, userId),
        gte(userSubscriptionsTable.currentPeriodEnd, now),
      ),
    )
    .orderBy(desc(userSubscriptionsTable.currentPeriodEnd));

  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return null;
  }

  return subscription;
}

export async function getMonthlyQuestionUsage(userId: string, monthlyBucket: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiQuestionsTable)
    .where(
      and(
        eq(aiQuestionsTable.userId, userId),
        eq(aiQuestionsTable.monthlyBucket, monthlyBucket),
      ),
    );

  return row?.count ?? 0;
}

// Atomically checks the monthly quota and inserts the question row in one
// transaction, serialized per (userId, monthlyBucket) via an advisory lock.
// Without this, a plain "SELECT count(*) then INSERT" (as done previously)
// lets concurrent requests all read the same pre-insert count and all pass
// the quota check, which is exploitable because the real work between the
// check and the insert (the Gemini call) takes seconds — a wide window for
// concurrent requests to race past a quota of just a few questions/month.
// limit: null means unlimited (skips the lock/count and always inserts).
// Returns the inserted row, or null if the quota was already exhausted.
export async function reserveQuestionSlot(
  userId: string,
  monthlyBucket: string,
  limit: number | null,
  values: InsertAiQuestion,
): Promise<AiQuestionRow | null> {
  return db.transaction(async (tx) => {
    if (limit !== null) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${monthlyBucket}`}, 0))`,
      );

      const [{ used }] = await tx
        .select({ used: sql<number>`count(*)::int` })
        .from(aiQuestionsTable)
        .where(
          and(
            eq(aiQuestionsTable.userId, userId),
            eq(aiQuestionsTable.monthlyBucket, monthlyBucket),
          ),
        );

      if (used >= limit) {
        return null;
      }
    }

    const [row] = await tx.insert(aiQuestionsTable).values(values).returning();
    return row;
  });
}

// Fills in the real answer/saju result on a row inserted as a placeholder
// while the (slow) Gemini call was in flight.
export async function finalizeQuestionAnswer(
  id: number,
  answer: string,
  sajuResult: JsonObject,
): Promise<AiQuestionRow> {
  const [row] = await db
    .update(aiQuestionsTable)
    .set({ answer, sajuResult })
    .where(eq(aiQuestionsTable.id, id))
    .returning();
  return row;
}

// Releases a reserved slot when the Gemini call fails after reservation, so
// a failed generation does not consume the user's monthly quota.
export async function releaseQuestionSlot(id: number): Promise<void> {
  await db.delete(aiQuestionsTable).where(eq(aiQuestionsTable.id, id));
}

function tossAuthorization(): string {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("결제 설정이 준비되지 않았습니다.");
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function verifiedTossPayment(
  order: OrderRow,
  data: Record<string, unknown>,
  expectedPaymentKey?: string,
): ConfirmedPayment {
  // For virtual accounts, HTTP success may only issue an account. Never grant
  // access until the provider reports a completed deposit.
  if (data.status !== "DONE") {
    throw new Error("결제가 완료되지 않았습니다. 입금 대기 또는 미완료 결제는 승인할 수 없습니다.");
  }
  const providerPaymentKey = data.paymentKey;
  if (
    data.orderId !== order.orderId
    || typeof providerPaymentKey !== "string"
    || !providerPaymentKey.trim()
    || providerPaymentKey.length > 200
    || (expectedPaymentKey !== undefined && providerPaymentKey !== expectedPaymentKey)
    || data.totalAmount !== order.amount
    || !Number.isInteger(data.totalAmount)
    || data.currency !== order.currency
  ) {
    throw new Error("결제 승인 정보가 주문 정보와 일치하지 않습니다.");
  }
  const approvedAt = typeof data.approvedAt === "string"
    ? new Date(data.approvedAt)
    : new Date(NaN);
  if (!Number.isFinite(approvedAt.getTime())) {
    throw new Error("유효한 결제 승인 시간이 없습니다.");
  }

  return {
    provider: "toss",
    paymentKey: providerPaymentKey,
    method: typeof data.method === "string" ? data.method : "CARD",
    status: "paid",
    amount: order.amount,
    rawResponse: data,
    approvedAt,
  };
}

/** Read-only provider recovery when the checkout redirect/paymentKey was lost. */
export async function recoverPaymentByOrderId(order: OrderRow): Promise<ConfirmedPayment> {
  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(order.orderId)}`,
    { headers: { Authorization: tossAuthorization() } },
  );
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !data) {
    throw new Error("완료된 결제 내역을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  return verifiedTossPayment(order, data);
}

export async function confirmPaymentWithProvider(
  order: OrderRow,
  paymentKey?: string,
): Promise<ConfirmedPayment> {
  if (isDevelopmentPaymentMode()) {
    return {
      provider: "dev",
      paymentKey: paymentKey?.trim() || `dev_${order.orderId}`,
      method: "DEV_SIMULATION",
      status: "paid",
      amount: order.amount,
      rawResponse: {
        approvedAt: new Date().toISOString(),
        orderId: order.orderId,
        simulated: true,
      },
      approvedAt: new Date(),
    };
  }

  const authorization = tossAuthorization();

  if (!paymentKey?.trim()) {
    throw new Error("paymentKey가 필요합니다.");
  }

  const confirmedPaymentKey = paymentKey.trim();
  if (confirmedPaymentKey.length > 200) {
    throw new Error("paymentKey가 너무 깁니다.");
  }
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${order.orderId}:${confirmedPaymentKey}`)
    .digest("hex");
  let data: Record<string, unknown> | null = null;
  let confirmError: Error | null = null;

  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        // Stable per attempt. A new paymentKey must not inherit an old error.
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        paymentKey: confirmedPaymentKey,
        orderId: order.orderId,
        amount: order.amount,
      }),
    });

    const reply = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (response.ok && reply) {
      data = reply;
    } else {
      confirmError = new Error(
        (typeof reply?.message === "string" && reply.message) ||
        "토스 결제 승인에 실패했습니다.",
      );
    }
  } catch (error) {
    confirmError = error instanceof Error ? error : new Error("토스 결제 승인에 실패했습니다.");
  }

  if (!data || data.status !== "DONE") {
    // Older attempts lacked the idempotency header, and a network failure may
    // hide a successful approval. A cached WAITING_FOR_DEPOSIT response may
    // also be stale after a virtual-account deposit. Query current status.
    try {
      const lookup = await fetch(
        `https://api.tosspayments.com/v1/payments/${encodeURIComponent(confirmedPaymentKey)}`,
        { headers: { Authorization: authorization } },
      );
      if (lookup.ok) {
        data = (await lookup.json().catch(() => null)) as Record<string, unknown> | null;
      }
    } catch {
      // Preserve the original approval error when the provider is unavailable.
    }
  }

  if (!data) {
    throw confirmError ?? new Error("토스 결제 승인에 실패했습니다.");
  }

  return verifiedTossPayment(order, data, confirmedPaymentKey);
}

export function parseBirthInfo(input: unknown): ReportBirthInfo | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const value = input as Record<string, unknown>;
  const year = Number(value.year);
  const month = Number(value.month);
  const day = Number(value.day);
  const hour = value.hour == null ? -1 : Number(value.hour);
  const minute = value.minute == null ? 0 : Number(value.minute);
  const gender = value.gender === "female" ? "female" : value.gender === "male" ? "male" : null;
  const calendarType =
    value.calendarType === "lunar"
      ? "lunar"
      : value.calendarType === "solar"
        ? "solar"
      : null;

  const values = [year, month, day, hour, minute];
  if (
    values.some((item) => !Number.isInteger(item)) ||
    !gender ||
    !calendarType
  ) {
    return null;
  }

  if (
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    minute < 0 ||
    minute > 59 ||
    (hour !== -1 && (hour < 0 || hour > 23))
  ) {
    return null;
  }

  const maxDay =
    calendarType === "solar"
      ? new Date(Date.UTC(year, month, 0)).getUTCDate()
      : 30;

  if (day < 1 || day > maxDay) {
    return null;
  }

  return {
    year,
    month,
    day,
    hour,
    minute: hour === -1 ? 0 : minute,
    gender,
    calendarType,
  };
}
