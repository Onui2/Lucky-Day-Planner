const env =
  typeof import.meta !== "undefined"
    ? ((import.meta as unknown as { env?: Record<string, string | undefined> })
        .env ?? {})
    : {};

const BASE = env.BASE_URL?.replace(/\/+$/, "") ?? "";
const CSRF_HEADER = "x-csrf-token";
const UNSAFE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

let cachedToken: string | null = null;
let inflightToken: Promise<string | null> | null = null;

function canUseBrowserFetch() {
  return typeof window !== "undefined" && typeof fetch === "function";
}

function isSameOriginApiUrl(rawUrl: string) {
  if (!canUseBrowserFetch()) {
    return false;
  }

  try {
    const url = new URL(rawUrl, window.location.origin);
    const apiBasePath = BASE ? `${BASE}/api/` : "/api/";
    return (
      url.origin === window.location.origin &&
      (url.pathname.startsWith("/api/") || url.pathname.startsWith(apiBasePath))
    );
  } catch {
    return false;
  }
}

function shouldAttachCsrf(method: string, rawUrl: string) {
  return UNSAFE_METHODS.has(method.toUpperCase()) && isSameOriginApiUrl(rawUrl);
}

export function clearCachedCsrfToken() {
  cachedToken = null;
  inflightToken = null;
}

export async function getCsrfToken(): Promise<string | null> {
  if (!canUseBrowserFetch()) {
    return null;
  }

  if (cachedToken) {
    return cachedToken;
  }

  if (!inflightToken) {
    inflightToken = fetch(`${BASE}/api/auth/csrf`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json().catch(() => null)) as {
          csrfToken?: unknown;
        } | null;
        return typeof payload?.csrfToken === "string" ? payload.csrfToken : null;
      })
      .finally(() => {
        inflightToken = null;
      });
  }

  cachedToken = await inflightToken;
  return cachedToken;
}

export async function appendCsrfHeader(
  headers: Headers,
  method: string,
  rawUrl: string,
) {
  if (!shouldAttachCsrf(method, rawUrl) || headers.has(CSRF_HEADER)) {
    return false;
  }

  const token = await getCsrfToken();
  if (!token) {
    return false;
  }

  headers.set(CSRF_HEADER, token);
  return true;
}
