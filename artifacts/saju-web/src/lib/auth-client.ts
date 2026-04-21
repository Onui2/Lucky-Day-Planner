const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface AuthErrorShape {
  error?: unknown;
  message?: unknown;
}

interface ResetTokenVerificationResult {
  valid: boolean;
  error?: string;
}

export interface AuthSetupStatus {
  canSelfBootstrapAdmin: boolean;
  hasConfiguredPrivilegedEmails: boolean;
}

function getErrorMessage(
  payload: AuthErrorShape | null,
  fallback: string,
): string {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function postJson<TResponse>(
  path: string,
  body: Record<string, unknown>,
  fallbackMessage: string,
): Promise<TResponse> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  const payload = await parseJson<TResponse & AuthErrorShape>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  return (payload ?? ({} as TResponse)) as TResponse;
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<void> {
  await postJson("/api/auth/register", input, "회원가입에 실패했습니다.");
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<void> {
  await postJson("/api/auth/login-local", input, "로그인에 실패했습니다.");
}

export async function requestPasswordReset(email: string): Promise<void> {
  await postJson(
    "/api/auth/forgot-password",
    { email },
    "재설정 메일 요청에 실패했습니다.",
  );
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}): Promise<void> {
  await postJson(
    "/api/auth/reset-password",
    input,
    "비밀번호 변경에 실패했습니다.",
  );
}

export async function verifyResetPasswordToken(
  token: string,
): Promise<ResetTokenVerificationResult> {
  const response = await fetch(
    `${BASE}/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`,
    {
      credentials: "include",
    },
  );

  const payload =
    (await parseJson<ResetTokenVerificationResult & AuthErrorShape>(response)) ??
    { valid: false, error: "링크 확인 중 오류가 발생했습니다." };

  return {
    valid: Boolean(payload.valid),
    error: typeof payload.error === "string" ? payload.error : undefined,
  };
}

export async function getAuthSetupStatus(): Promise<AuthSetupStatus> {
  const response = await fetch(`${BASE}/api/auth/setup-status`, {
    credentials: "include",
  });

  const payload = await parseJson<AuthSetupStatus>(response);

  return {
    canSelfBootstrapAdmin: Boolean(payload?.canSelfBootstrapAdmin),
    hasConfiguredPrivilegedEmails: Boolean(payload?.hasConfiguredPrivilegedEmails),
  };
}
