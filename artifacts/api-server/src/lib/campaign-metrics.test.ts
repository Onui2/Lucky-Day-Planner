import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRefundVerification } from "./campaign-metrics.js";

const row = (overrides: Record<string, unknown> = {}) => ({
  approved: 2, refund_checked: 2, refunded_orders: 1, partially_refunded_orders: 0,
  refund_synced_krw: "9900", oldest_refund_check_at: "2027-01-05T00:00:00.000Z", ...overrides,
});

test("refund status is verified only when every approved order has a conclusive Toss check", () => {
  const verified = summarizeRefundVerification([row(), row({ approved: 1, refund_checked: 1, refunded_orders: 0, partially_refunded_orders: 1, refund_synced_krw: "1000", oldest_refund_check_at: "2027-01-03T00:00:00.000Z" })]);
  assert.equal(verified.refundStatusVerified, true);
  assert.equal(verified.approvedOrders, 3);
  assert.equal(verified.refundCheckedOrders, 3);
  assert.equal(verified.refundedOrders, 1);
  assert.equal(verified.partiallyRefundedOrders, 1);
  assert.equal(verified.syncedRefundKrw, 10900);
  assert.equal(verified.oldestRefundCheckAt, "2027-01-03T00:00:00.000Z");

  const unchecked = summarizeRefundVerification([row({ refund_checked: 1 })]);
  assert.equal(unchecked.refundStatusVerified, false);
  assert.equal(unchecked.uncheckedApprovedOrders, 1);
});

test("an empty cohort has nothing to verify and no fabricated refund amounts", () => {
  const empty = summarizeRefundVerification([]);
  assert.equal(empty.refundStatusVerified, true);
  assert.equal(empty.approvedOrders, 0);
  assert.equal(empty.syncedRefundKrw, 0);
  assert.equal(empty.oldestRefundCheckAt, null);
  const noApproved = summarizeRefundVerification([row({ approved: 0, refund_checked: 0, refunded_orders: 0, refund_synced_krw: null, oldest_refund_check_at: null })]);
  assert.equal(noApproved.refundStatusVerified, true);
  assert.equal(noApproved.oldestRefundCheckAt, null);
});

test("malformed aggregate values fail closed as unverified", () => {
  assert.equal(summarizeRefundVerification([row({ refund_checked: "x" })]).refundStatusVerified, false);
  assert.equal(summarizeRefundVerification([row({ refund_checked: 3 })]).refundStatusVerified, false);
});
