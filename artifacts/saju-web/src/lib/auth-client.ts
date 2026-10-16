import type { AuthUser } from "@workspace/replit-auth-web";
import { customFetch } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface AuthErrorShape {
  error?: unknown;
  message?: unknown;
}

interface ApiErrorLike {
  data?: unknown;
}

interface ResetTokenVerificationResult {
  valid: boolean;
  error?: string;
}

interface AuthUserPayload {
  user?: AuthUser | null;
}

export interface AuthSetupStatus {
  canSelfBootstrapAdmin: boolean;
  hasConfiguredPrivilegedEmails: boolean;
  databaseConfigured: boolean;
  localPasswordAuthEnabled: boolean;
  oidcEnabled: boolean;
}

export const SIGNUP_CONSENT_VERSION = "2026-10-16";
export type SocialProvider = "kakao" | "google";
export interface SignupConsent {
  terms: boolean;
  privacy: boolean;
  version: string;
}
export interface SocialAuthProvider {
  id: SocialProvider;
  name: string;
  enabled: boolean;
}
export interface PendingSocialSignup {
  pending: boolean;
  provider?: SocialProvider;
  returnTo?: string;
  consentVersion: string;
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

function isApiErrorShape(value: unknown): value is ApiErrorLike {
  return typeof value === "object" && value !== null && "data" in value;
}

function getRequestMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isApiErrorShape(error)) {
    return getErrorMessage(error.data as AuthErrorShape | null, fallbackMessage);
  }

  return fallbackMessage;
}

function withBasePath(path: string) {
  return `${BASE}${path}`;
}

async function postJson<TResponse>(
  path: string,
  body: Record<string, unknown>,
  fallbackMessage: string,
): Promise<TResponse> {
  try {
    return await customFetch<TResponse>(withBasePath(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
  } catch (error) {
    throw new Error(getRequestMessage(error, fallbackMessage));
  }
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  name?: string;
  consent: SignupConsent;
}): Promise<AuthUser | null> {
  const payload = await postJson<AuthUserPayload>(
    "/api/auth/register",
    input,
    "회원가입에 실패했습니다.",
  );

  return payload.user ?? null;
}

export async function getSocialAuthProviders(): Promise<SocialAuthProvider[]> {
  const result = await customFetch<{ providers: SocialAuthProvider[] }>(
    withBasePath("/api/auth/social/providers"),
    { credentials: "include" },
  );
  return result.providers.filter((provider) =>
    provider.enabled && (provider.id === "kakao" || provider.id === "google"),
  );
}

export async function startSocialLogin(provider: SocialProvider, returnTo: string): Promise<void> {
  const result = await postJson<{ authorizationUrl: string }>(
    `/api/auth/social/${provider}/start`,
    { returnTo },
    "간편 로그인을 시작하지 못했습니다. 다시 시도해 주세요.",
  );
  const url = new URL(result.authorizationUrl);
  const host = provider === "kakao" ? "kauth.kakao.com" : "accounts.google.com";
  if (url.protocol !== "https:" || url.hostname !== host || url.username || url.password || url.port) {
    throw new Error("로그인 연결 주소를 확인할 수 없습니다.");
  }
  window.location.assign(url.href);
}

export function getPendingSocialSignup(): Promise<PendingSocialSignup> {
  return customFetch<PendingSocialSignup>(withBasePath("/api/auth/social/pending"), {
    credentials: "include",
  });
}

export async function completeSocialSignup(consent: SignupConsent): Promise<AuthUser | null> {
  const result = await postJson<AuthUserPayload>(
    "/api/auth/social/complete",
    { consent },
    "간편 회원가입을 완료하지 못했습니다.",
  );
  return result.user ?? null;
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthUser | null> {
  const payload = await postJson<AuthUserPayload>(
    "/api/auth/login-local",
    input,
    "로그인에 실패했습니다.",
  );

  return payload.user ?? null;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await postJson(
    "/api/auth/forgot-password",
    { email },
    "비밀번호 재설정 메일 요청에 실패했습니다.",
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
  try {
    const payload = await customFetch<ResetTokenVerificationResult>(
      withBasePath(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`),
      {
        credentials: "include",
      },
    );

    return {
      valid: Boolean(payload.valid),
      error: typeof payload.error === "string" ? payload.error : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: getRequestMessage(error, "링크가 유효하지 않거나 만료되었습니다."),
    };
  }
}

export async function getAuthSetupStatus(): Promise<AuthSetupStatus> {
  const payload = await customFetch<AuthSetupStatus>(
    withBasePath("/api/auth/setup-status"),
    {
      credentials: "include",
    },
  );

  return {
    canSelfBootstrapAdmin: Boolean(payload.canSelfBootstrapAdmin),
    hasConfiguredPrivilegedEmails: Boolean(payload.hasConfiguredPrivilegedEmails),
    databaseConfigured: Boolean(payload.databaseConfigured),
    localPasswordAuthEnabled: Boolean(payload.localPasswordAuthEnabled),
    oidcEnabled: Boolean(payload.oidcEnabled),
  };
}
