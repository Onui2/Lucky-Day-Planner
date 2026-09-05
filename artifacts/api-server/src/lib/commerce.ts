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
  return process.env.TOSS_SECRET_KEY ? "provider" : "dev";
}

export function isDevelopmentPaymentMode() {
  // Toss 키 없으면 항상 dev 시뮬레이션 — NODE_ENV 무관
  return !process.env.TOSS_SECRET_KEY;
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

  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("결제 설정이 준비되지 않았습니다.");
  }

  if (!paymentKey?.trim()) {
    throw new Error("paymentKey가 필요합니다.");
  }

  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: paymentKey.trim(),
      orderId: order.orderId,
      amount: order.amount,
    }),
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !data) {
    const message =
      (typeof data?.message === "string" && data.message) ||
      "토스 결제 승인에 실패했습니다.";
    throw new Error(message);
  }

  return {
    provider: "toss",
    paymentKey: String(data.paymentKey ?? paymentKey),
    method: typeof data.method === "string" ? data.method : "CARD",
    status: "paid",
    amount: Number(data.totalAmount ?? order.amount),
    rawResponse: data,
    approvedAt: data.approvedAt
      ? new Date(String(data.approvedAt))
      : new Date(),
  };
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
