import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";
import {
  clearStoredSupabaseTokens,
  getStoredAccessToken,
  getSupabaseClient,
  isSupabaseEnabled,
  storeSupabaseSession,
} from "./supabase";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const BASE =
  typeof import.meta !== "undefined"
    ? (import.meta as unknown as Record<string, Record<string, string>>).env?.BASE_URL?.replace(
        /\/+$/,
        "",
      ) ?? ""
    : "";

function buildAuthHeaders(): HeadersInit | undefined {
  const accessToken = getStoredAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/api/auth/user`, {
    credentials: "include",
    headers: buildAuthHeaders(),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { user: AuthUser | null };
  return data.user ?? null;
}

function buildLoginUrl(): string {
  if (typeof window === "undefined") {
    return `${BASE}/api/login`;
  }

  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const params = new URLSearchParams();
  if (returnTo && returnTo !== "/") {
    params.set("returnTo", returnTo);
  }

  const qs = params.toString();
  // Always enter through the API auth route so OIDC can start when enabled.
  // When OIDC is disabled, the server redirects back to the local login page.
  return `${BASE}/api/login${qs ? `?${qs}` : ""}`;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      if (isSupabaseEnabled()) {
        const client = getSupabaseClient();
        const { data } = await client!.auth.getSession();
        storeSupabaseSession(data.session ?? null);
      }

      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void loadUser();

    if (!isSupabaseEnabled()) {
      return () => {
        isMounted = false;
      };
    }

    const client = getSupabaseClient();
    const {
      data: { subscription },
    } = client!.auth.onAuthStateChange(async (_event, session) => {
      storeSupabaseSession(session);
      try {
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const login = useCallback(() => {
    window.location.href = buildLoginUrl();
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      try {
        if (isSupabaseEnabled()) {
          const client = getSupabaseClient();
          await client!.auth.signOut();
        } else {
          await fetch(`${BASE}/api/logout`, {
            credentials: "include",
          });
        }
      } finally {
        clearStoredSupabaseTokens();

        try {
          await fetch(`${BASE}/api/logout`, {
            credentials: "include",
          });
        } catch {
          // Best-effort legacy session cleanup.
        }

        setUser(null);
        window.location.href = `${BASE}/`;
      }
    })();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      if (isSupabaseEnabled()) {
        const client = getSupabaseClient();
        const { data } = await client!.auth.getSession();
        storeSupabaseSession(data.session ?? null);
      }

      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };
}
