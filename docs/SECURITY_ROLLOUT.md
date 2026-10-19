# Security update rollout

This update closes the eight confirmed authentication, payment, database TLS,
and development-server findings from the 2026-09-22 code audit. Verification uses
isolated route/provider tests and local Host-header checks; it does not establish
the security of a deployed database, provider configuration, or existing accounts.

## Database and sessions

The auth schema adds `users.auth_version`, `users.auth_valid_after`, and
`auth_identities`. Apply the schema using the existing deployment workflow before
routing traffic to the new release. Runtime bootstrap also ensures these additions.
Deploy all API instances together: old instances do not enforce session versions
or the new account-linking rules.

Existing cookie sessions have no auth version and will require a fresh login.
Password changes, password resets, role changes, and account deletion invalidate
all app sessions in the same database transaction. Session reads consult current
database state on every request, without an instance-local authorization cache.
For Supabase tokens, a changed account also requires a new sign-in event; refreshing
an old token is insufficient. If prompted, sign out and sign in again.

All 19 application tables, including identities, shared snapshots, and rate-limit
buckets, have RLS enabled with no public policies. Bootstrap also revokes table and
owned-sequence privileges from `PUBLIC`, `anon`, and `authenticated`. These tables
are server-managed; the API database role must own them or have equivalent access
that bypasses RLS. Do not grant browser clients direct access to application data.

The 2026-09-23 production check found `share_snapshots` and `rate_limit_buckets`
without RLS and with direct `anon` grants. Both were protected in the live database;
the same controls now run during bootstrap for every application table. The shared
snapshot table held no rows at the time of that check. Database grants showed an
exposure path, but no direct Data API request or exploitation was confirmed.

## Account linking and recovery

Local signup never grants administrative roles. Email allowlists apply only to a
new external identity whose provider has verified the email. Existing identities
use the saved database role, so a later login cannot undo an administrator's demotion.

Provider and subject identify external accounts. Matching email addresses alone
never merge accounts. Legacy external accounts are adopted only when their stored
ID equals the provider subject, their email matches a verified provider email, and
they have no local password or conflicting identity binding. Ambiguous cases are
blocked instead of silently linking credentials.

If social login reports an existing account, use its original login method or the
email password-reset flow. Resetting the local password revokes previous sessions
and removes any attacker-planted password; it does not automatically link the
social identity. Explicit cross-provider account linking is not supported.

Deletion retains identity tombstones, including legacy subject-ID markers,
so a known external identity cannot recreate a deleted account. Restoring an
external identity requires operator verification of ownership and intentional
recovery; do not remove markers merely because a token or email address matches.

Old email-only merges did not save the external subject. Those historical subjects
cannot be identified or revoked by this patch; deleting a local account does not
delete the provider's account or its sessions. Provider-side recovery/revocation is
required for suspected historical compromise. Email addresses are not permanently
blocked by an unverified local account's deletion.

Existing elevated roles and previously merged accounts are not automatically
rewritten. Review existing administrators and suspicious account activity using
trusted ownership records; a code patch cannot determine which past registrations
were legitimate. No production account inspection or remediation was performed
as part of these local fixes.

## Environment and payment changes

- Remote Postgres requires certificate and hostname verification. Supabase
  database hosts use the bundled Supabase Root 2021 CA. For a private or rotated
  root CA, configure `DATABASE_SSL_CA_CERT` with its trusted PEM. An invalid or
  missing trust anchor fails closed.
- Missing `TOSS_SECRET_KEY` disables paid checkout. Simulation requires explicit
  `PAYMENT_SIMULATION_ENABLED=true` and is always disabled in production.
- Unpaid reports and revoked/expired entitlements cannot be regenerated,
  downloaded, or retrieved through repeated payment confirmation. Existing paid
  reports missing an entitlement need reconciliation from trusted payment records.
- Vite dev/preview defaults to loopback with Host-header validation. An intentional
  remote development session needs an explicit bind address and owned hostname.

See [deployment instructions](../DEPLOY_VERCEL.md) and
[payment access rules](PAYMENT_SECURITY.md) for configuration details.

Provider references: [Supabase JWT claims](https://supabase.com/docs/guides/auth/jwt-fields),
[Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres#connecting-with-ssl),
and [node-postgres TLS options](https://node-postgres.com/features/ssl).

## Free AI account-rotation protection (2026-10-19)

Local signup still does not verify email ownership. Account-level monthly quotas
remain unchanged. The API now applies additional shared limits using the existing
`rate_limit_buckets` table; no schema migration is required.

| Environment variable | Default | Scope |
| --- | ---: | --- |
| `AUTH_REGISTER_IP_HOURLY_LIMIT` | 8 | Local registration attempts per IP network per hour, independent of email |
| `AI_FREE_IP_DAILY_LIMIT` | 12 | Free AI generation attempts across accounts on one IP network per 24 hours |
| `AI_PROVIDER_DAILY_LIMIT` | 500 | Gemini attempts across all users and models per 24 hours, including retries and fallbacks |

Each window starts with the first request after the previous window expires, not
at midnight. Values accept integers from 0 through 1,000,000. Zero closes that
operation; missing or invalid values retain the default. Environment changes
require a redeploy. There is no production opt-out for the shared-store check.

The free AI network limit excludes administrators, recognized paid subscription
plans, and users with a current paid-report question bonus. Unknown plan codes
still receive the free limit. The global provider budget applies to everyone.
Prompt-guard replies do not call Gemini or consume the network/provider budgets.

New network buckets hash the IPv4 address or IPv6 /64 prefix. IPv4-mapped IPv6
addresses use the corresponding IPv4 key. Users behind the same public address
(offices, families, carrier NAT) share the network allowance. Rotating addresses
inside one IPv6 /64 does not create new allowances. The limiter now uses Express
`req.ip`, rather than directly trusting the leftmost forwarded-header value.
The existing one-hop proxy setting assumes the API is reachable through the
trusted hosting proxy only. Reassess that setting before hosting elsewhere; see
[Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/).

These new limits fail closed with `503 RATE_LIMIT_UNAVAILABLE` if shared storage
cannot be checked. Per-process memory is allowed only in local development, never
on Vercel. Ordinary endpoint limiters retain their prior fallback behavior.
Network exhaustion returns `429 AI_FREE_NETWORK_LIMIT`; the provider ceiling
returns `429 AI_SERVICE_CAPACITY_REACHED`. JSON responses include `Retry-After`;
an already-open SSE response sends an error event with `retryAfterSeconds`.
Denied or failed questions release the user's monthly reservation. The network
and provider attempt budgets are not refunded, since failures may still cost money.

Questions are limited to 2,000 JavaScript string code units. Each Gemini attempt
uses `maxOutputTokens: 2048`, including streamed responses and fallback models;
long answers can be truncated. See the [Gemini generation configuration](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig).
The ceiling bounds calls and output size, not an exact currency amount. Provider
pricing, input tokens, model-specific behavior, and any other use of the API key
remain outside this application's budget accounting.

Server logs emit `[ai-budget]` with `event: warning` at 80% and `event: exhausted`
on the first denied provider attempt per window. Entries contain count, limit,
and retry delay, without user IDs or IP addresses. External email/Slack alert
delivery is not configured. Operators should inspect these events and provider
usage before raising limits. Distributed IP rotation is still possible; the
global ceiling limits its impact but can temporarily stop legitimate AI requests.

Validation uses isolated route/provider/storage tests without billable Gemini
calls. A production deployment and live database/proxy check are separate steps.
