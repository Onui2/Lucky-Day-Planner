import { authIdentitiesTable, db, hasDatabaseConfig, usersTable, type User } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { lockLegacyUserId } from "./auth.js";

export interface IdentityUserInput {
  provider: string;
  externalId: string;
  email?: string | null;
  emailVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export class IdentityAuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409) {
    super(message);
  }
}

function identityConflict(): IdentityAuthError {
  return new IdentityAuthError(
    "IDENTITY_ACCOUNT_CONFLICT",
    "같은 이메일로 가입된 계정이 있습니다. 기존 로그인 방법을 사용하거나 비밀번호 찾기로 계정을 복구해주세요. 소셜 계정은 자동 연결되지 않습니다.",
  );
}

function identityUnavailable(): IdentityAuthError {
  return new IdentityAuthError("IDENTITY_ACCOUNT_UNAVAILABLE", "이 로그인 계정은 사용할 수 없습니다. 계정 복구는 고객센터에 문의해주세요.", 403);
}

export function resolveInitialIdentityRole(email: string | null, emailVerified: boolean): string {
  if (!emailVerified || !email) return "user";
  const includes = (value: string | undefined) => (value ?? "").split(",")
    .some((entry) => entry.trim().toLowerCase() === email);
  if (includes(process.env.SUPER_ADMIN_EMAILS)) return "superadmin";
  if (includes(process.env.ADMIN_EMAILS)) return "admin";
  return "user";
}

export async function syncUserFromIdentity(input: IdentityUserInput): Promise<User> {
  if (!hasDatabaseConfig()) throw new Error("Identity authentication requires a database.");
  if (!input.provider || !input.externalId) {
    throw new IdentityAuthError("INVALID_IDENTITY", "로그인 제공자의 사용자 정보를 확인할 수 없습니다.", 401);
  }
  const normalizedEmail = input.email?.trim().toLowerCase() || null;

  return db.transaction(async (tx) => {
    // Serialize first use of one provider subject, including concurrent API calls.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([input.provider, input.externalId])}, 0))`);
    // Account deletion takes this same lock before touching a legacy user row.
    // A first login cannot read before deletion and provision after it commits.
    await lockLegacyUserId(tx, input.externalId);
    const [identity] = await tx.select().from(authIdentitiesTable).where(and(
      eq(authIdentitiesTable.provider, input.provider),
      eq(authIdentitiesTable.subject, input.externalId),
    ));

    if (identity) {
      if (!identity.userId) throw identityUnavailable();
      const [user] = await tx.select().from(usersTable)
        .where(eq(usersTable.id, identity.userId)).for("update");
      if (!user) throw identityUnavailable();
      // Identity attributes never overwrite a stored role or local login email.
      // In particular, an allowlisted email cannot reverse an admin demotion.
      return user;
    }

    const [deletedSubject] = await tx.select().from(authIdentitiesTable).where(and(
      eq(authIdentitiesTable.provider, "legacy-deleted"),
      eq(authIdentitiesTable.subject, input.externalId),
    ));
    if (deletedSubject) throw identityUnavailable();

    const [legacyUser] = await tx.select().from(usersTable)
      .where(eq(usersTable.id, input.externalId)).for("update");
    if (legacyUser) {
      const existingBindings = await tx.select().from(authIdentitiesTable)
        .where(eq(authIdentitiesTable.userId, legacyUser.id));
      // Legacy external accounts stored the provider subject directly as id.
      // Password-bearing or already-bound accounts require explicit recovery;
      // email equality by itself never proves ownership of a local account.
      if (legacyUser.passwordHash || existingBindings.length || !input.emailVerified ||
          !normalizedEmail || legacyUser.email?.trim().toLowerCase() !== normalizedEmail) {
        throw identityConflict();
      }
      await tx.insert(authIdentitiesTable).values({
        provider: input.provider, subject: input.externalId, userId: legacyUser.id,
      });
      return legacyUser;
    }

    if (normalizedEmail) {
      const [emailOwner] = await tx.select().from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${normalizedEmail}`);
      if (emailOwner) throw identityConflict();
    }

    const [user] = await tx.insert(usersTable).values({
      email: normalizedEmail,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      profileImageUrl: input.profileImageUrl ?? null,
      role: resolveInitialIdentityRole(normalizedEmail, input.emailVerified),
    }).returning();
    await tx.insert(authIdentitiesTable).values({
      provider: input.provider, subject: input.externalId, userId: user.id,
    });
    return user;
  });
}
