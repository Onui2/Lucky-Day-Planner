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
pending, without generating a report or granting an entitlement. Virtual-account
fulfillment is not supported by this card checkout flow; it requires a separate
verified deposit flow before it can grant access.

Report regeneration and download require an owned paid order and an active,
unexpired entitlement for that exact report and product. Revoked entitlements also
block the already-paid payment confirmation response. Existing paid reports without
entitlements must be reconciled from verified payment records, not automatically
granted access from report readiness alone.
