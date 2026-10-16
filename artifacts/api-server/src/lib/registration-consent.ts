import { db, registrationConsentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { AuthTransaction } from "./auth.js";

export const REGISTRATION_CONSENT_VERSION = "2026-10-16";
export interface RegistrationConsent { terms: true; privacy: true; version: string }

export function parseRegistrationConsent(value: unknown): RegistrationConsent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  return input.terms === true && input.privacy === true && input.version === REGISTRATION_CONSENT_VERSION
    ? { terms: true, privacy: true, version: REGISTRATION_CONSENT_VERSION } : null;
}

let ready: Promise<void> | undefined;
// Additive migration isolated from the shared database bootstrap. Execute before
// a signup transaction; failure must prevent account creation without evidence.
export function ensureRegistrationConsentSchema(): Promise<void> {
  if (!ready) ready = db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('registration-consent-schema-v1', 0))`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS registration_consents (
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version varchar(40) NOT NULL,
      source varchar(30) NOT NULL,
      terms_accepted boolean NOT NULL,
      privacy_notice_acknowledged boolean NOT NULL,
      accepted_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, version)
    )`);
    await tx.execute(sql`ALTER TABLE registration_consents ENABLE ROW LEVEL SECURITY`);
    await tx.execute(sql`REVOKE ALL ON registration_consents FROM PUBLIC`);
    await tx.execute(sql`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON registration_consents FROM anon;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON registration_consents FROM authenticated;
      END IF;
    END $$`);
  }).catch((error) => { ready = undefined; throw error; });
  return ready;
}

export async function recordRegistrationConsent(tx: AuthTransaction, userId: string, source: string, consent: RegistrationConsent) {
  if (!parseRegistrationConsent(consent)) throw new Error("Registration consent is missing or outdated.");
  await tx.insert(registrationConsentsTable).values({
    userId, source, version: REGISTRATION_CONSENT_VERSION,
    termsAccepted: true, privacyNoticeAcknowledged: true,
  }).onConflictDoNothing();
}
