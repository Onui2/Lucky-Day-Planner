import crypto from "node:crypto";
import { Router } from "express";
import { createRateLimiter, rateLimitKeyByIp } from "../middlewares/rateLimit.js";
import { REVIEW_COOKIE, REVIEW_TTL, readReviewOrder, reviewSettings, sealReviewOrder } from "../lib/checkout-review.js";
import { getProductConfig } from "../lib/product-config.js";
import { createTossPayReviewCheckout, confirmTossPayReviewPayment } from "../lib/toss-pay.js";

const router = Router();
const product = getProductConfig("saju_basic")!;

router.get("/commerce/review", (_req, res) => {
  res.json({ enabled: Boolean(reviewSettings()), product });
});
router.use("/commerce/review", (req, res, next) => {
  const settings = reviewSettings();
  if (!settings) { res.status(503).json({ error: "심사용 테스트 결제가 준비되지 않았습니다." }); return; }
  if (req.headers.origin !== settings.origin) { res.status(403).json({ error: "상품 화면에서 다시 시작해 주세요." }); return; }
  next();
}, createRateLimiter({ name: "checkout-review-ip", max: 12, windowMs: 15 * 60_000, methods: ["POST"], keyGenerator: rateLimitKeyByIp, failClosed: true }),
createRateLimiter({ name: "checkout-review-global", max: 120, windowMs: 60 * 60_000, methods: ["POST"], keyGenerator: () => "all", failClosed: true }));

// This flow never creates commerce orders, payments, snapshots or entitlements.
// The encrypted HttpOnly cookie binds a test transaction to its initiating browser.
router.post("/commerce/review/checkout", async (req, res) => {
  if (req.body?.productType !== product.type) { res.status(400).json({ error: "심사 대상 상품을 확인해 주세요." }); return; }
  try {
    const order = { orderId: `MHW_REVIEW_${crypto.randomBytes(16).toString("hex")}`, amount: product.amount, currency: "KRW" };
    const checkout = await createTossPayReviewCheckout(order, product.title);
    res.cookie(REVIEW_COOKIE, sealReviewOrder({ ...order, metadata: { checkoutProvider: "toss_pay", tossPayMode: "TEST", tossPayToken: checkout.payToken } }), {
      httpOnly: true, secure: reviewSettings()!.secure, sameSite: "lax", path: "/api/commerce/review", maxAge: REVIEW_TTL,
    });
    res.json({ checkoutPage: checkout.checkoutPage });
  } catch { res.status(502).json({ error: "토스페이 테스트 결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요." }); }
});

router.post("/commerce/review/confirm", async (req, res) => {
  const order = readReviewOrder(req.cookies?.[REVIEW_COOKIE]);
  if (!order || req.body?.orderId !== order.orderId) { res.status(400).json({ error: "테스트 결제 확인 시간이 지났거나 다른 브라우저의 요청입니다. 상품 화면에서 다시 시작해 주세요." }); return; }
  try {
    await confirmTossPayReviewPayment(order);
    res.json({ status: "test_complete", amount: order.amount, title: product.title });
  } catch { res.status(409).json({ error: "토스페이 테스트 승인 완료를 확인하지 못했습니다. 토스 앱 인증 여부를 확인해 주세요." }); }
});

export default router;
