# Payment and report access

Production payment confirmation requires a configured payment provider. Missing or
blank provider keys disable paid checkout; they never authorize simulated purchases.
Public free report issuance is closed: retired trial payloads return
`409 FREE_TRIAL_CLOSED`, and non-admin zero-amount orders are rejected. Historical
entitlements remain accessible. Privileged administrator grants still create paid
zero-amount orders and active report entitlements.

For isolated local development or tests, set `PAYMENT_SIMULATION_ENABLED=true`
without a Toss secret. Simulation is disabled whenever `NODE_ENV=production` or
`VERCEL_ENV=production`, even if the flag is set. A configured secret always selects
the provider flow. `checkoutMode` can now be `disabled`; paid order creation and
confirmation then return HTTP 503.

Provider confirmation grants access only for `status: DONE` and matching order ID,
payment key, integer amount, currency, and a valid approval timestamp. A successful
HTTP response with `WAITING_FOR_DEPOSIT` returns a clear error and leaves the order
pending, without generating a report or granting an entitlement. Approval requests
use a stable idempotency key per order and payment key. On a failed or duplicate
approval response, the server looks up the payment key at Toss and accepts only a
matching completed payment. This also lets a later retry recognize a virtual-account
deposit that has since reached `DONE`.

The paid order, payment record, and entitlement commit together before PDF generation.
If rendering fails, the report can be regenerated without charging again. Customers
can retry the success URL or regenerate a pending/failed report from their account.
If the success URL and payment key are lost before the local commit, the owner can
select "결제 상태 다시 확인" for a pending order in their account. The server looks
up that order ID at Toss without initiating another charge and applies the same
`DONE`, payment key, order ID, integer amount, currency, and timestamp checks.
Missing or incomplete provider payments leave the order pending.

Report web reading, regeneration and download require an owned paid order and an active,
unexpired entitlement for that exact report and product. Revoked entitlements also
block the already-paid payment confirmation response. Existing paid reports without
entitlements must be reconciled from verified payment records, not automatically
granted access from report readiness alone.

## Free preview and purchased reading

`POST /api/saju/calculate` returns only birth information, four pillars, surface
element counts and a personality excerpt of at most 140 characters for guests and
members. Nested fields are explicitly allowlisted. Only authenticated administrators
receive the full calculation. The browser discards old full-result caches and never
persists new administrator results. Account changes hide results from the prior user.

`GET /api/reports/:id/content` checks ownership, paid order, exact active entitlement
and report readiness before returning reading sections. The server selects the tier
from the stored product, using the same section generator as the PDF; client tier
parameters cannot unlock more content. Responses use `Cache-Control: private, no-store`.
An entitlement covers its purchased birth snapshot and tier, not arbitrary calculations.
Existing authorized purchases remain readable in both web and PDF formats.

New paid entitlements expire 365 days after the provider's approval timestamp.
Confirmation retries and report regeneration do not extend the period. Existing
entitlements and administrator grants keep their original terms. Account history
shows the expiry; content, download and regeneration enforce it on the server.

AI question responses expose only public answer fields, never their internal full
calculation snapshot. AI question quotas and separate tools such as compatibility,
daily fortune and calendar remain unchanged. Previously delivered or captured content
cannot be recalled. This change does not enable the report sales flag or alter prices.

## Merchant review checkout

The public `/reports` page and normal report purchase dialog can expose a separate,
explicitly labeled TEST checkout
when `TOSS_PAY_REVIEW_ENABLED`, a TEST-only `TOSS_PAY_REVIEW_API_KEY`, a dedicated
64-hex `TOSS_PAY_REVIEW_COOKIE_SECRET`, and a valid root `APP_URL` are configured.
The ordinary production checkout still rejects TEST keys. Review checkout never
creates commerce orders, payments, snapshots or entitlements and cannot issue PDFs.

The server accepts the basic, detail and full report products from `REPORT_PRODUCTS`
and uses their server-side prices (4,900, 9,900 and 19,900 KRW). Client-supplied amounts
and titles are ignored. It validates the provider checkout URL and binds the product
type and TEST order/token to an AES-256-GCM HttpOnly cookie for 20 minutes.
Mutations require the exact configured Origin and fail-closed shared IP/global
rate limits. Confirmation validates the cookie, order ID and provider status,
amount, currency, token, mode and approval timestamp before displaying completion.
The confirmed product type and title come from the encrypted cookie and server catalog.
Existing completed test payments are read without another execute request.

This route demonstrates the hosted payment flow before a live merchant contract.
It does not prove real payment acceptance or satisfy the merchant review by itself.
