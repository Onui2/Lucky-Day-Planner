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
  setAuthenticatedUser: (user: AuthUser | null) => void;
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

class AuthRequestError extends Error {
  readonly status?: number;
  readonly isTransient: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      isTransient?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "AuthRequestError";
    this.status = options.status;
    this.isTransient = options.isTransient ?? false;
    this.cause = options.cause;
  }
}

function isTransientAuthStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  let res: Response;

  try {
    res = await fetch(`${BASE}/api/auth/user`, {
      credentials: "include",
      headers: buildAuthHeaders(),
    });
  } catch (error) {
    throw new AuthRequestError("Failed to reach auth endpoint.", {
      isTransient: true,
      cause: error,
    });
  }

  if (res.status === 401 || res.status === 403) {
    return null;
  }

  if (!res.ok) {
    throw new AuthRequestError(
      `Auth endpoint returned ${res.status}.`,
      {
        status: res.status,
        isTransient: isTransientAuthStatus(res.status),
      },
    );
  }

  const data = (await res.json()) as { user: AuthUser | null };
  return data.user ?? null;
}

async function fetchCurrentUserWithRetry(
  maxAttempts = 3,
): Promise<AuthUser | null> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchCurrentUser();
    } catch (error) {
      lastError = error;

      if (!(error instanceof AuthRequestError) || !error.isTransient || attempt >= maxAttempts) {
        throw error;
      }

      await delay(250 * attempt);
    }
  }

  throw lastError;
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

  const syncSupabaseSession = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      return;
    }

    try {
      const client = getSupabaseClient();
      const { data } = await client!.auth.getSession();
      if (data.session) {
        storeSupabaseSession(data.session);
      }
    } catch {
      // Keep existing local auth state when Supabase session sync is flaky.
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      await syncSupabaseSession();
      const currentUser = await fetchCurrentUserWithRetry();
      setUser(currentUser);
    } catch {
      // Avoid logging the user out on transient auth endpoint failures.
    } finally {
      setIsLoading(false);
    }
  }, [syncSupabaseSession]);

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
    } = client!.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        storeSupabaseSession(session);
      } else if (event === "SIGNED_OUT") {
        clearStoredSupabaseTokens();
      }

      try {
        const currentUser = await fetchCurrentUserWithRetry();
        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
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
      await syncSupabaseSession();
      const currentUser = await fetchCurrentUserWithRetry();
      setUser(currentUser);
    } catch {
      // Preserve the last known authenticated user on transient failures.
    }
  }, [syncSupabaseSession]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    setAuthenticatedUser: setUser,
  };
}
