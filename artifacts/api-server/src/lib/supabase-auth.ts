import type { AuthUser } from "@workspace/api-zod";
import { IdentityAuthError, syncUserFromIdentity } from "./auth-users.js";

interface SupabaseAuthUserResponse {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
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
    signal: AbortSignal.timeout(10_000),
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      throw Object.assign(new Error("로그인 제공자에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요."), { status: 503 });
    }
    return null;
  }

  const authUser = (await response.json()) as SupabaseAuthUserResponse;
  if (!authUser || typeof authUser.id !== "string" || !authUser.id) return null;

  // Decode only after the Auth server has validated this exact token. Never
  // use editable user_metadata for ownership, roles, or revocation decisions.
  let claims: { sub?: unknown; amr?: Array<{ method?: unknown; timestamp?: unknown }> };
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!claims || claims.sub !== authUser.id) return null;
  } catch {
    return null;
  }
  const metadata = authUser.user_metadata ?? null;
  const splitName = splitFullName(metadata?.full_name);

  const dbUser = await syncUserFromIdentity({
    provider: `supabase:${new URL(supabaseUrl).origin}`,
    externalId: authUser.id,
    email: authUser.email ?? null,
    emailVerified: typeof authUser.email_confirmed_at === "string" &&
      Number.isFinite(Date.parse(authUser.email_confirmed_at)),
    firstName: metadata?.first_name ?? splitName.firstName,
    lastName: metadata?.last_name ?? splitName.lastName,
    profileImageUrl: metadata?.avatar_url ?? metadata?.picture ?? null,
  });

  if (dbUser.authValidAfter) {
    const loginMethods = new Set(["password", "oauth", "otp", "sso/saml", "magiclink", "recovery", "invite", "email/signup", "passkey"]);
    // iat changes during refresh and therefore cannot prove a new login.
    // Supabase amr timestamps retain the original authentication event.
    const freshLogin = Array.isArray(claims.amr) && claims.amr.some((entry) =>
      typeof entry?.method === "string" && loginMethods.has(entry.method) &&
      typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp) &&
      entry.timestamp * 1000 > dbUser.authValidAfter!.getTime() &&
      entry.timestamp * 1000 <= Date.now() + 30_000,
    );
    if (!freshLogin) {
      throw new IdentityAuthError("IDENTITY_REAUTH_REQUIRED", "계정 인증 정보가 변경되었습니다. 로그아웃 후 다시 로그인해주세요.", 401);
    }
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    profileImageUrl: dbUser.profileImageUrl,
    role: dbUser.role,
  };
}
