import assert from "node:assert/strict";
import test from "node:test";
import { checkTossPayRefundStatus, createTossPayCheckout, confirmTossPayPayment, getTossPayConfig, type TossPayOrder } from "./toss-pay.js";

const order: TossPayOrder = {
  orderId: "MHW_123", amount: 4900, currency: "KRW",
  metadata: { checkoutProvider: "toss_pay", tossPayMode: "TEST", tossPayToken: "test-token" },
};

function providerStatus(overrides: Record<string, unknown> = {}) {
  return {
    code: 0, mode: "TEST", orderNo: order.orderId, amount: 4900,
    payToken: "test-token", payStatus: "PAY_COMPLETE", payMethod: "CARD",
    paidTs: "2026-10-16 15:20:30", transactions: [{ stepType: "PAY" }],
    ...overrides,
  };
}

test("direct Toss Pay adapter with isolated provider responses (no live payments)", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = Object.fromEntries(
    ["TOSS_PAY_API_KEY", "NODE_ENV", "VERCEL_ENV", "APP_URL", "BASE_PATH"].map((key) => [key, process.env[key]]),
  );
  const calls: Array<{ url: string; body: Record<string, unknown>; options: RequestInit }> = [];
  let replies: Array<unknown | Error> = [];
  globalThis.fetch = (async (input: string | URL | Request, options: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(options.body)), options });
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    assert.notEqual(reply, undefined, "unexpected provider request");
    return new Response(JSON.stringify(reply), { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  function setup(values: unknown[]) {
    replies = [...values];
    calls.length = 0;
    process.env.TOSS_PAY_API_KEY = "sk_test_syntheticFixture";
    process.env.NODE_ENV = "test";
    process.env.VERCEL_ENV = "preview";
    process.env.APP_URL = "https://shop.example";
    process.env.BASE_PATH = "/";
  }
  try {
    await t.test("configuration has no default key; production rejects test keys", () => {
      setup([]);
      delete process.env.TOSS_PAY_API_KEY;
      assert.equal(getTossPayConfig(), null);
      process.env.TOSS_PAY_API_KEY = "invalid";
      assert.throws(getTossPayConfig, /API 키/);
      process.env.TOSS_PAY_API_KEY = "sk_test_syntheticFixture";
      process.env.VERCEL_ENV = "production";
      assert.throws(getTossPayConfig, /실거래/);
      process.env.VERCEL_ENV = "preview";
      process.env.NODE_ENV = "production";
      assert.throws(getTossPayConfig, /실거래/);
      process.env.TOSS_PAY_API_KEY = "sk_live_syntheticFixture";
      assert.equal(getTossPayConfig()?.mode, "LIVE");
    });
    await t.test("create sets manual approval and safe return paths for desktop/mobile redirect", async () => {
      setup([{ code: 0, payToken: "test-token", checkoutPage: "https://pay.toss.im/payfront?token=test-token" }]);
      process.env.BASE_PATH = "/fortune/";
      const result = await createTossPayCheckout(order, "정밀 사주 리포트");
      assert.equal(result.mode, "TEST");
      assert.equal(result.payToken, "test-token");
      assert.equal(calls[0].url, "https://pay.toss.im/api/v2/payments");
      assert.equal(calls[0].body.autoExecute, false);
      assert.equal(calls[0].body.amountTaxFree, 0);
      assert.equal(calls[0].body.amount, 4900);
      const success = new URL(String(calls[0].body.retUrl));
      const failure = new URL(String(calls[0].body.retCancelUrl));
      assert.equal(success.pathname, "/fortune/payments/success");
      assert.equal(success.searchParams.get("orderId"), order.orderId);
      assert.equal(success.searchParams.get("provider"), "toss_pay");
      assert.equal(failure.searchParams.get("code"), "USER_CANCEL");
      assert.ok(calls[0].options.signal);
      assert.equal(calls[0].options.redirect, "error");
      setup([{ code: 0, payToken: "test-token", checkoutPage: result.checkoutPage }]);
      process.env.BASE_PATH = "/fortune/";
      process.env.APP_URL = "https://shop.example/fortune/";
      await createTossPayCheckout(order, "리포트");
      assert.equal(new URL(String(calls[0].body.retUrl)).pathname, "/fortune/payments/success");
    });
    await t.test("unsafe return and checkout URLs fail closed", async () => {
      for (const bad of ["https://pay.toss.im.evil.example/", "javascript:alert(1)", "http://pay.toss.im/", "https://name@pay.toss.im/", "https://pay.toss.im:444/"]) {
        setup([{ code: 0, payToken: "test-token", checkoutPage: bad }]);
        await assert.rejects(createTossPayCheckout(order, "리포트"), /결제창 주소/);
      }
      for (const bad of ["", "https://user:pass@shop.example", "http://shop.example", "https://shop.example?x=1"]) {
        setup([]);
        process.env.APP_URL = bad;
        await assert.rejects(createTossPayCheckout(order, "리포트"), /APP_URL/);
        assert.equal(calls.length, 0);
      }
    });
    await t.test("order currency, amounts and identifiers are validated before network", async () => {
      for (const override of [{ currency: "USD" }, { amount: 0 }, { amount: 1.2 }, { orderId: "has spaces" }]) {
        setup([]);
        await assert.rejects(createTossPayCheckout({ ...order, ...override }, "리포트"), /주문번호/);
        assert.equal(calls.length, 0);
      }
    });
    await t.test("manual approval first verifies canonical status, then executes once and rechecks", async () => {
      setup([providerStatus({ payStatus: "PAY_APPROVED" }), providerStatus(), providerStatus()]);
      const paid = await confirmTossPayPayment(order, true);
      assert.equal(paid.provider, "toss_pay");
      assert.equal(paid.approvedAt.toISOString(), "2026-10-16T06:20:30.000Z");
      assert.deepEqual(calls.map((call) => call.url.split("/").pop()), ["status", "execute", "status"]);
      assert.equal(calls[0].body.orderNo, order.orderId);
      assert.equal(calls[1].body.payToken, "test-token");
      assert.equal(paid.amount, 4900);
    });
    await t.test("lookups cannot trigger approval; already complete payments are idempotent", async () => {
      setup([providerStatus({ payStatus: "PAY_APPROVED" })]);
      await assert.rejects(confirmTossPayPayment(order, false), /완료되지/);
      assert.equal(calls.length, 1);
      setup([providerStatus({ payStatus: "SETTLEMENT_COMPLETE" })]);
      assert.equal((await confirmTossPayPayment(order, true)).status, "paid");
      assert.equal(calls.length, 1);
    });
    await t.test("amount, order, token and mode mismatches prevent execute", async () => {
      for (const override of [{ amount: 1 }, { orderNo: "OTHER" }, { payToken: "OTHER" }, { mode: "LIVE" }, { currency: "USD" }]) {
        setup([providerStatus({ payStatus: "PAY_APPROVED", ...override })]);
        await assert.rejects(confirmTossPayPayment(order, true), /일치하지/);
        assert.equal(calls.length, 1);
      }
      for (const metadata of [{ ...order.metadata, tossPayMode: "LIVE" }, { ...order.metadata, tossPayToken: "" }, { ...order.metadata, checkoutProvider: "toss" }]) {
        setup([]);
        await assert.rejects(confirmTossPayPayment({ ...order, metadata }, true), /일치하지/);
        assert.equal(calls.length, 0);
      }
    });
    await t.test("timeout and duplicate execute recover only after verified completed status", async () => {
      for (const failure of [new Error("network timeout synthetic-key"), { code: -1, msg: "duplicate synthetic-key" }]) {
        setup([providerStatus({ payStatus: "PAY_APPROVED" }), failure, providerStatus()]);
        assert.equal((await confirmTossPayPayment(order, true)).status, "paid");
        assert.equal(calls.length, 3);
      }
      setup([providerStatus({ payStatus: "PAY_APPROVED" }), new Error("timeout"), providerStatus({ payStatus: "PAY_PROGRESS" })]);
      await assert.rejects(confirmTossPayPayment(order, true), /완료되지/);
      assert.equal(calls.length, 3);
    });
    await t.test("refunds, pending states and invalid timestamps cannot grant access", async () => {
      for (const state of ["PAY_STANDBY", "PAY_CANCEL", "PAY_PROGRESS", "REFUND_PROGRESS", "REFUND_SUCCESS", "SETTLEMENT_REFUND_COMPLETE"]) {
        setup([providerStatus({ payStatus: state })]);
        await assert.rejects(confirmTossPayPayment(order, true), /완료되지/);
        assert.equal(calls.length, 1);
      }
      for (const transactions of [[], undefined, [{ stepType: "PAY" }, { stepType: "REFUND" }]]) {
        setup([providerStatus({ transactions })]);
        await assert.rejects(confirmTossPayPayment(order, true), /거래 내역/);
      }
      for (const paidTs of ["invalid", "2026-02-30 12:00:00", "2026-10-16 24:00:00", undefined]) {
        setup([providerStatus({ paidTs })]);
        await assert.rejects(confirmTossPayPayment(order, true), /승인 시간/);
      }
    });
    await t.test("provider errors are sanitized and creation is never automatically retried", async () => {
      setup([{ code: -1, errorCode: "DUPLICATE", msg: "sk_test_syntheticFixture" }]);
      await assert.rejects(createTossPayCheckout(order, "리포트"), (error: Error) => {
        assert.equal(error.message.includes("sk_test_"), false);
        return true;
      });
      assert.equal(calls.length, 1);
    });
    await t.test("refund sync classifies only consistent full refunds as revocable", async () => {
      const refund = (amount: number) => ({ stepType: "REFUND", transactionAmount: -amount, paidAmount: amount });
      for (const payStatus of ["REFUND_SUCCESS", "SETTLEMENT_REFUND_COMPLETE"]) {
        setup([providerStatus({ payStatus, refundableAmount: 0, transactions: [{ stepType: "PAY", transactionAmount: 4900 }, refund(4900)] })]);
        const result = await checkTossPayRefundStatus(order);
        assert.equal(result.outcome, "full_refund");
        assert.equal(result.refundedAmount, 4900);
        assert.equal(result.payStatus, payStatus);
        assert.deepEqual(calls.map((call) => call.url.split("/").pop()), ["status"]);
      }
      // Two partial refunds that add up to the full amount are a full refund.
      setup([providerStatus({ payStatus: "REFUND_SUCCESS", refundableAmount: 0, transactions: [{ stepType: "PAY", transactionAmount: 4900 }, refund(900), refund(4000)] })]);
      assert.equal((await checkTossPayRefundStatus(order)).outcome, "full_refund");
    });
    await t.test("refund sync flags partial refunds and pending refunds without revoking", async () => {
      setup([providerStatus({ payStatus: "PAY_COMPLETE", refundableAmount: 3900, transactions: [{ stepType: "PAY", transactionAmount: 4900 }, { stepType: "REFUND", transactionAmount: -1000 }] })]);
      const partial = await checkTossPayRefundStatus(order);
      assert.equal(partial.outcome, "partial_refund");
      assert.equal(partial.refundedAmount, 1000);
      for (const payStatus of ["REFUND_PROGRESS", "REFUND_PENDING"]) {
        setup([providerStatus({ payStatus })]);
        assert.equal((await checkTossPayRefundStatus(order)).outcome, "refund_pending");
      }
      setup([providerStatus({ refundableAmount: 4900 })]);
      const kept = await checkTossPayRefundStatus(order);
      assert.equal(kept.outcome, "not_refunded");
      assert.equal(kept.refundedAmount, 0);
    });
    await t.test("refund sync treats contradictory or unknown provider data as unknown", async () => {
      const pay = { stepType: "PAY", transactionAmount: 4900 };
      for (const overrides of [
        { payStatus: "REFUND_SUCCESS", refundableAmount: 0, transactions: [pay] },
        { payStatus: "REFUND_SUCCESS", refundableAmount: 100, transactions: [pay, { stepType: "REFUND", transactionAmount: -4900 }] },
        { payStatus: "REFUND_SUCCESS", refundableAmount: 0, transactions: [pay, { stepType: "REFUND" }] },
        { payStatus: "REFUND_SUCCESS", refundableAmount: 0, transactions: [pay, { stepType: "REFUND", transactionAmount: 4900 }] },
        { payStatus: "REFUND_SUCCESS", refundableAmount: 0, transactions: [pay, { stepType: "REFUND", transactionAmount: -9900 }] },
        { payStatus: "PAY_COMPLETE", transactions: [pay, { stepType: "REFUND", transactionAmount: -4900 }] },
        { payStatus: "PAY_CANCEL" },
        { payStatus: "PAY_STANDBY" },
        { payStatus: "SOMETHING_NEW" },
        { payStatus: undefined },
        { transactions: undefined },
        { transactions: ["bad"] },
      ]) {
        setup([providerStatus(overrides)]);
        assert.equal((await checkTossPayRefundStatus(order)).outcome, "unknown", JSON.stringify(overrides));
      }
    });
    await t.test("refund sync never classifies on identity mismatch or provider failure", async () => {
      setup([providerStatus({ payStatus: "REFUND_SUCCESS", amount: 1 })]);
      await assert.rejects(checkTossPayRefundStatus(order), /일치하지/);
      setup([new Error("network down sk_test_syntheticFixture")]);
      await assert.rejects(checkTossPayRefundStatus(order), (error: Error) => {
        assert.equal(error.message.includes("sk_test_"), false);
        return true;
      });
      setup([{ code: -1, msg: "failure" }]);
      await assert.rejects(checkTossPayRefundStatus(order), /확인하지 못했습니다/);
      setup([]);
      await assert.rejects(checkTossPayRefundStatus({ ...order, metadata: { ...order.metadata, tossPayMode: "LIVE" } }), /일치하지/);
      assert.equal(calls.length, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
