import { Router, type Request, type Response } from "express";
import * as oidc from "openid-client";
import { createSession, SESSION_COOKIE, SESSION_TTL, toAuthUser } from "../lib/auth.js";
import { IdentityAuthError, syncUserFromIdentity } from "../lib/auth-users.js";
import { requireDatabase } from "../lib/database-guard.js";
import { ensureRegistrationConsentSchema, parseRegistrationConsent, REGISTRATION_CONSENT_VERSION } from "../lib/registration-consent.js";
import { isSocialProvider, readSocialCookie, safeSocialReturnTo, sealSocialCookie, socialAppUrl, socialIdentity,
  socialOidcConfig, socialProviderSettings, SOCIAL_FLOW_COOKIE, SOCIAL_FLOW_TTL, SOCIAL_PENDING_COOKIE,
  type PendingSocialSignup, type SocialFlow } from "../lib/social-auth.js";

const router = Router();
function cookieOptions() {
  return { httpOnly: true, secure: socialAppUrl()?.protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: SOCIAL_FLOW_TTL };
}
function sameOrigin(req: Request, res: Response): boolean {
  const origin = socialAppUrl()?.origin;
  if (!origin || req.headers.origin !== origin) {
    res.status(403).json({ error: "로그인 화면을 새로고침하고 다시 시도해주세요.", code: "SOCIAL_ORIGIN_INVALID" });
    return false;
  }
  return true;
}
async function login(res: Response, user: Awaited<ReturnType<typeof syncUserFromIdentity>>) {
  const sid = await createSession({ authVersion: user.authVersion, user: toAuthUser(user), access_token: "" });
  res.cookie(SESSION_COOKIE, sid, { ...cookieOptions(), maxAge: SESSION_TTL });
}
function redirectError(res: Response, code: string) {
  res.redirect(`/login?socialError=${encodeURIComponent(code)}`);
}
router.get("/auth/social/providers", (_req, res) => {
  res.json({ providers: (["kakao", "google"] as const).map(id => ({ id, name: id === "kakao" ? "카카오" : "Google", enabled: Boolean(socialProviderSettings(id)) })), consentVersion: REGISTRATION_CONSENT_VERSION });
});
router.post("/auth/social/:provider/start", async (req, res) => {
  const provider = req.params.provider;
  if (!isSocialProvider(provider) || !socialProviderSettings(provider)) {
    res.status(503).json({ error: "아직 준비 중인 로그인 방법입니다." }); return;
  }
  if (!sameOrigin(req, res) || !(await requireDatabase(res))) return;
  const settings = socialProviderSettings(provider)!;
  try {
    const config = await socialOidcConfig(provider);
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const authorizationUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: settings.callbackUrl,
      scope: provider === "google" ? "openid email" : "openid",
      state, nonce, code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256",
    });
    res.clearCookie(SOCIAL_PENDING_COOKIE, { path: "/" });
    res.cookie(SOCIAL_FLOW_COOKIE, sealSocialCookie("flow", { provider, state, nonce, verifier, returnTo: safeSocialReturnTo(req.body?.returnTo) }), cookieOptions());
    res.json({ authorizationUrl: authorizationUrl.href });
  } catch {
    res.status(503).json({ error: "소셜 로그인 연결을 시작하지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
});
router.get("/auth/social/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  const flow = readSocialCookie<SocialFlow>("flow", req.cookies?.[SOCIAL_FLOW_COOKIE]);
  res.clearCookie(SOCIAL_FLOW_COOKIE, { path: "/" });
  if (!isSocialProvider(provider) || !socialProviderSettings(provider)) { redirectError(res, "unavailable"); return; }
  if (!flow || flow.provider !== provider || typeof flow.state !== "string" || typeof flow.nonce !== "string" || typeof flow.verifier !== "string") {
    redirectError(res, "expired"); return;
  }
  const settings = socialProviderSettings(provider)!;
  try {
    const config = await socialOidcConfig(provider);
    const callbackUrl = new URL(settings.callbackUrl);
    // Trust only the fixed configured origin, never forwarded Host headers.
    callbackUrl.search = new URL(req.originalUrl, settings.appUrl).search;
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) throw new Error("Missing identity claims.");
    const identity = socialIdentity(provider, claims);
    if (!(await requireDatabase(res))) return;
    try {
      const user = await syncUserFromIdentity(identity);
      await login(res, user);
      res.clearCookie(SOCIAL_PENDING_COOKIE, { path: "/" });
      res.redirect(safeSocialReturnTo(flow.returnTo));
    } catch (error) {
      if (error instanceof IdentityAuthError && error.code === "REGISTRATION_CONSENT_REQUIRED") {
        res.cookie(SOCIAL_PENDING_COOKIE, sealSocialCookie("pending", { provider, identity, returnTo: safeSocialReturnTo(flow.returnTo) }), cookieOptions());
        res.redirect("/register?social=1"); return;
      }
      throw error;
    }
  } catch (error) {
    redirectError(res, error instanceof IdentityAuthError && error.code === "IDENTITY_ACCOUNT_CONFLICT" ? "conflict" : req.query.error === "access_denied" ? "cancelled" : "failed");
  }
});
router.get("/auth/social/pending", (req, res) => {
  const pending = readSocialCookie<PendingSocialSignup>("pending", req.cookies?.[SOCIAL_PENDING_COOKIE]);
  if (!pending || !isSocialProvider(pending.provider) || !socialProviderSettings(pending.provider)) { res.json({ pending: false, consentVersion: REGISTRATION_CONSENT_VERSION }); return; }
  res.json({ pending: true, provider: pending.provider, returnTo: safeSocialReturnTo(pending.returnTo), consentVersion: REGISTRATION_CONSENT_VERSION });
});
router.post("/auth/social/complete", async (req, res) => {
  if (!sameOrigin(req, res)) return;
  const pending = readSocialCookie<PendingSocialSignup>("pending", req.cookies?.[SOCIAL_PENDING_COOKIE]);
  if (!pending || !isSocialProvider(pending.provider) || !socialProviderSettings(pending.provider)) {
    res.status(401).json({ error: "가입 인증이 만료되었습니다. 소셜 로그인을 다시 시작해주세요." }); return;
  }
  const consent = parseRegistrationConsent(req.body?.consent);
  if (!consent) { res.status(400).json({ error: "최신 이용약관에 동의하고 개인정보 처리 안내를 확인해주세요.", code: "REGISTRATION_CONSENT_REQUIRED" }); return; }
  if (!(await requireDatabase(res))) return;
  await ensureRegistrationConsentSchema();
  try {
    const user = await syncUserFromIdentity(pending.identity, consent);
    await login(res, user);
    res.clearCookie(SOCIAL_PENDING_COOKIE, { path: "/" });
    res.status(201).json({ user: toAuthUser(user), returnTo: safeSocialReturnTo(pending.returnTo) });
  } catch (error) {
    if (error instanceof IdentityAuthError) { res.status(error.status).json({ error: error.message, code: error.code }); return; }
    throw error;
  }
});
export default router;
