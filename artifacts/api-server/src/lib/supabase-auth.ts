import type { AuthUser } from "@workspace/api-zod";
import { syncUserFromIdentity } from "./auth-users.js";

interface SupabaseAuthUserResponse {
  id: string;
  email?: string | null;
  user_metadata?: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    picture?: string | null;
  } | null;
}

function getSupabaseUrl(): string | null {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? null;
}

function getSupabasePublishableKey(): string | null {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    null
  );
}

export function isSupabaseAuthEnabled(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

function splitFullName(fullName: string | null | undefined) {
  if (!fullName) {
    return { firstName: null, lastName: null };
  }

  const normalized = fullName.trim();
  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? null,
  };
}

export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<AuthUser | null> {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const authUser = (await response.json()) as SupabaseAuthUserResponse;
  const metadata = authUser.user_metadata ?? null;
  const splitName = splitFullName(metadata?.full_name);

  const dbUser = await syncUserFromIdentity({
    externalId: authUser.id,
    email: authUser.email ?? null,
    firstName: metadata?.first_name ?? splitName.firstName,
    lastName: metadata?.last_name ?? splitName.lastName,
    profileImageUrl: metadata?.avatar_url ?? metadata?.picture ?? null,
  });

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    profileImageUrl: dbUser.profileImageUrl,
    role: dbUser.role,
  };
}
