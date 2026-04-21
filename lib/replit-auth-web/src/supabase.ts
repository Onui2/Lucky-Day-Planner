import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const env =
  typeof import.meta !== "undefined"
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
    : {};

const rawUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
const rawPublishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  env.VITE_SUPABASE_ANON_KEY?.trim() ??
  "";

export const SUPABASE_ACCESS_TOKEN_STORAGE_KEY = "lucky_day_supabase_access_token";
export const SUPABASE_REFRESH_TOKEN_STORAGE_KEY = "lucky_day_supabase_refresh_token";

export function isSupabaseEnabled(): boolean {
  return rawUrl.length > 0 && rawPublishableKey.length > 0;
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseEnabled()) return null;

  if (!supabaseClient) {
    supabaseClient = createClient(rawUrl, rawPublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
}

export function clearStoredSupabaseTokens(): void {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SUPABASE_REFRESH_TOKEN_STORAGE_KEY);
}

export function storeSupabaseSession(session: Session | null): void {
  if (!canUseStorage()) return;

  if (!session?.access_token) {
    clearStoredSupabaseTokens();
    return;
  }

  window.localStorage.setItem(
    SUPABASE_ACCESS_TOKEN_STORAGE_KEY,
    session.access_token,
  );

  if (session.refresh_token) {
    window.localStorage.setItem(
      SUPABASE_REFRESH_TOKEN_STORAGE_KEY,
      session.refresh_token,
    );
  } else {
    window.localStorage.removeItem(SUPABASE_REFRESH_TOKEN_STORAGE_KEY);
  }
}

export async function updateSupabasePassword(
  password: string,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message);
  }
}
