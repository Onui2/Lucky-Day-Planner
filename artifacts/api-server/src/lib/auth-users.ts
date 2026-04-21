import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

interface IdentityUserInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const list = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(email.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(email.toLowerCase());
}

export function resolveRole(
  email: string | null | undefined,
  fallback = "user",
): string {
  if (isSuperAdminEmail(email)) return "superadmin";
  if (isAdminEmail(email)) return "admin";
  return fallback;
}

export async function syncUserFromIdentity(input: IdentityUserInput) {
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
  const role = resolveRole(normalizedEmail);

  const [existingUser] = normalizedEmail
    ? await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail))
    : [];

  if (existingUser) {
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        email: normalizedEmail,
        firstName: input.firstName ?? existingUser.firstName,
        lastName: input.lastName ?? existingUser.lastName,
        profileImageUrl: input.profileImageUrl ?? existingUser.profileImageUrl,
        role,
      })
      .where(eq(usersTable.id, existingUser.id))
      .returning();

    return updatedUser;
  }

  const [createdUser] = await db
    .insert(usersTable)
    .values({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      profileImageUrl: input.profileImageUrl ?? null,
      role,
    })
    .returning();

  return createdUser;
}
