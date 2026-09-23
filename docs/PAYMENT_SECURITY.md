# Payment and report access

Production payment confirmation requires `TOSS_SECRET_KEY`. Missing or blank keys
disable paid checkout; they never authorize simulated purchases. The intentional
free `saju_pdf` offer and administrator grants remain available: they create paid
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

Report regeneration and download require an owned paid order and an active,
unexpired entitlement for that exact report and product. Revoked entitlements also
block the already-paid payment confirmation response. Existing paid reports without
entitlements must be reconciled from verified payment records, not automatically
granted access from report readiness alone.
