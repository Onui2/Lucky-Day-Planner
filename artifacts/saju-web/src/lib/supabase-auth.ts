import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const rawPublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ??
  "";

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseEnabled(): boolean {
  return rawUrl.length > 0 && rawPublishableKey.length > 0;
}

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

export async function updateSupabasePassword(password: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await client.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message);
  }
}

export type { Session };
