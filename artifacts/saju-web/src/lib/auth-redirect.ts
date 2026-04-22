const AUTH_PAGES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

export function sanitizeReturnTo(returnTo?: string | null): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(returnTo, "https://local.invalid");
    const normalized = `${url.pathname}${url.search}${url.hash}`;
    return AUTH_PAGES.has(url.pathname) ? "/" : normalized;
  } catch {
    return "/";
  }
}

export function getCurrentReturnTo(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return sanitizeReturnTo(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function buildAuthHref(
  path: "/login" | "/register",
  returnTo = getCurrentReturnTo(),
): string {
  const params = new URLSearchParams({
    returnTo: sanitizeReturnTo(returnTo),
  });

  return `${path}?${params.toString()}`;
}
