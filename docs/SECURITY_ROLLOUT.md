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

The identity table has RLS enabled and no public policies. It is server-managed;
the API database role must have the required owner/service privileges. Do not grant
browser clients direct access to identity records or session contents.

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
