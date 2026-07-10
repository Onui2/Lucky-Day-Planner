import { createElement, useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import type { AuthUser } from "@workspace/api-client-react";

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

const env =
  typeof import.meta !== "undefined"
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
    : {};

const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  env.VITE_SUPABASE_ANON_KEY?.trim() ??
  "";
const SUPABASE_ACCESS_TOKEN_STORAGE_KEY = "lucky_day_supabase_access_token";
const SUPABASE_REFRESH_TOKEN_STORAGE_KEY = "lucky_day_supabase_refresh_token";

function isSupabaseAuthEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
}

// ─── 인증 상태 스냅샷 ────────────────────────────────────
// /api/auth/user 첫 응답(콜드 스타트 시 수 초)까지 로그인 버튼·폼이 안 그려지는
// 문제를 줄이기 위해, 마지막으로 확인된 인증 상태를 저장해 두고 다음 방문에서
// 즉시 낙관적으로 렌더링한다. 백그라운드 재검증이 끝나면 실제 상태로 보정된다.
// UI 표시에만 쓰이고 권한 검사는 항상 서버가 한다.
const AUTH_SNAPSHOT_KEY = "lucky_day_auth_snapshot_v1";

function readAuthSnapshot(): { user: AuthUser | null } | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: AuthUser | null };
    return { user: parsed.user ?? null };
  } catch {
    return null;
  }
}

function writeAuthSnapshot(user: AuthUser | null): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({ user }));
  } catch {}
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hasStoredSupabaseSession(): boolean {
  if (!canUseStorage()) {
    return false;
  }

  return Boolean(
    window.localStorage.getItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY) ??
    window.localStorage.getItem(SUPABASE_REFRESH_TOKEN_STORAGE_KEY),
  );
}

function getStoredAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
}

function clearStoredSupabaseTokens(): void {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SUPABASE_REFRESH_TOKEN_STORAGE_KEY);
}

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
  return `${BASE}/api/login${qs ? `?${qs}` : ""}`;
}

// ─── Context (singleton — prevents duplicate /api/auth/user fetches) ─────────

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
  setAuthenticatedUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // 스냅샷이 있으면 그 상태로 즉시 렌더링하고(isLoading=false),
  // 최초 방문처럼 스냅샷이 없을 때만 첫 응답을 기다린다.
  const [initialSnapshot] = useState(() => readAuthSnapshot());
  const [user, setUser] = useState<AuthUser | null>(initialSnapshot?.user ?? null);
  const [isLoading, setIsLoading] = useState(initialSnapshot === null);

  const applyUser = useCallback((next: AuthUser | null) => {
    writeAuthSnapshot(next);
    setUser(next);
  }, []);

  const syncSupabaseSession = useCallback(async () => {
    if (!isSupabaseAuthEnabled() || !hasStoredSupabaseSession()) {
      return;
    }

    try {
      const { getSupabaseClient, storeSupabaseSession } = await import("./supabase");
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
      if (hasStoredSupabaseSession()) {
        await syncSupabaseSession();
      }
      const currentUser = await fetchCurrentUserWithRetry();
      applyUser(currentUser);
    } catch {
      // Avoid logging the user out on transient auth endpoint failures.
    } finally {
      setIsLoading(false);
    }
  }, [syncSupabaseSession, applyUser]);

  useEffect(() => {
    let isMounted = true;

    void loadUser();

    if (!isSupabaseAuthEnabled() || !hasStoredSupabaseSession()) {
      return () => {
        isMounted = false;
      };
    }

    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      try {
        const { getSupabaseClient, storeSupabaseSession } = await import("./supabase");
        if (!isMounted) return;

        const client = getSupabaseClient();
        const result = client!.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            storeSupabaseSession(session);
          } else if (event === "SIGNED_OUT") {
            clearStoredSupabaseTokens();
          }

          try {
            const currentUser = await fetchCurrentUserWithRetry();
            if (isMounted) {
              applyUser(currentUser);
              setIsLoading(false);
            }
          } catch {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        });

        subscription = result.data.subscription;
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUser]);

  const login = useCallback(() => {
    window.location.href = buildLoginUrl();
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      try {
        if (isSupabaseAuthEnabled()) {
          const { getSupabaseClient } = await import("./supabase");
          const client = getSupabaseClient();
          await client!.auth.signOut();
        }
        await fetch(`${BASE}/api/logout`, {
          credentials: "include",
        });
      } catch {
        // Best-effort logout cleanup.
      } finally {
        clearStoredSupabaseTokens();
        applyUser(null);
        window.location.href = `${BASE}/`;
      }
    })();
  }, [applyUser]);

  const refreshUser = useCallback(async () => {
    try {
      await syncSupabaseSession();
      const currentUser = await fetchCurrentUserWithRetry();
      applyUser(currentUser);
    } catch {
      // Preserve the last known authenticated user on transient failures.
    }
  }, [syncSupabaseSession, applyUser]);

  const value: AuthState = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    setAuthenticatedUser: applyUser,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
