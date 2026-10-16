import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { Router } from "express";
import * as social from "./social-auth.js";

const environment = {
  APP_URL: "https://app.example.invalid", SOCIAL_AUTH_COOKIE_SECRET: "ab".repeat(32), NODE_ENV: "test", VERCEL_ENV: "",
  GOOGLE_OAUTH_CLIENT_ID: "test-google", GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
  KAKAO_OAUTH_CLIENT_ID: "test-kakao", KAKAO_OAUTH_CLIENT_SECRET: "test-secret",
};
async function configured(run: () => unknown) {
  const before = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  try { await run(); } finally {
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}
class IdentityAuthError extends Error {
  constructor(public code: string, message = code, public status = 403) { super(message); }
}
const consent = { terms: true, privacy: true, version: "2026-10-16" };
function routeHarness() {
  const state = { signup: 0, sessions: 0, calls: 0, existing: false, grant: null as any, authorization: null as any, failGrant: false };
  const deps: Record<string, any> = {
    express: { Router },
    "openid-client": {
      randomPKCECodeVerifier: () => "verifier", randomState: () => "state", randomNonce: () => "nonce",
      calculatePKCECodeChallenge: async () => "challenge",
      buildAuthorizationUrl: (_config: unknown, params: unknown) => { state.authorization = params; return new URL("https://accounts.google.com/o/oauth2/v2/auth"); },
      authorizationCodeGrant: async (_config: unknown, url: URL, checks: unknown) => {
        state.grant = { url: url.href, checks };
        if (state.failGrant) throw new Error("provider error");
        return { claims: () => ({ sub: "subject", email: "user@example.invalid", email_verified: true }) };
      },
    },
    "../lib/auth.js": { SESSION_COOKIE: "sid", SESSION_TTL: 86400, toAuthUser: (user: unknown) => user, createSession: async () => { state.sessions++; return "session"; } },
    "../lib/auth-users.js": { IdentityAuthError, syncUserFromIdentity: async (_identity: unknown, supplied: unknown) => {
      state.calls++;
      if (!state.existing && !supplied) throw new IdentityAuthError("REGISTRATION_CONSENT_REQUIRED");
      if (!state.existing) state.signup++;
      return { id: "member", authVersion: 0, role: "user" };
    } },
    "../lib/database-guard.js": { requireDatabase: async () => true },
    "../lib/registration-consent.js": {
      REGISTRATION_CONSENT_VERSION: consent.version,
      ensureRegistrationConsentSchema: async () => {},
      parseRegistrationConsent: (value: any) => value?.terms === true && value?.privacy === true && value?.version === consent.version ? consent : null,
    },
    "../lib/social-auth.js": { ...social, socialOidcConfig: async () => ({}) },
  };
  const module = { exports: {} as any };
  const source = readFileSync(fileURLToPath(new URL("../routes/social-auth.ts", import.meta.url)), "utf8");
  new Function("require", "module", "exports", transformSync(source, { loader: "ts", format: "cjs" }).code)((name: string) => {
    assert.ok(name in deps, `Unexpected dependency ${name}`); return deps[name];
  }, module, module.exports);
  async function route(method: string, path: string, request: Record<string, unknown> = {}) {
    const handler = module.exports.default.stack.find((entry: any) => entry.route?.path === path && entry.route.methods[method]).route.stack[0].handle;
    const req = { headers: { origin: environment.APP_URL }, params: {}, body: {}, cookies: {}, query: {}, ...request };
    const res = { statusCode: 200, body: null as any, destination: "", cookies: {} as Record<string, any>, cleared: [] as string[],
      status(code: number) { this.statusCode = code; return this; }, json(value: unknown) { this.body = value; return this; },
      redirect(value: string) { this.destination = value; return this; }, clearCookie(name: string) { this.cleared.push(name); return this; },
      cookie(name: string, value: string, options: unknown) { this.cookies[name] = { value, options }; return this; },
    };
    await handler(req, res); return res;
  }
  return { state, route };
}

test("social cookies reject tampering, cross-purpose reuse, expiry and key rotation", () => configured(() => {
  const sealed = social.sealSocialCookie("flow", { provider: "google", secret: "verifier" });
  assert.equal(social.readSocialCookie<any>("flow", sealed)?.secret, "verifier");
  assert.equal(social.readSocialCookie("pending", sealed), null);
  assert.equal(social.readSocialCookie("flow", `${sealed.slice(0, 20)}${sealed[20] === "A" ? "B" : "A"}${sealed.slice(21)}`), null);
  const original = Date.now;
  try { Date.now = () => original() + social.SOCIAL_FLOW_TTL + 1; assert.equal(social.readSocialCookie("flow", sealed), null); }
  finally { Date.now = original; }
  process.env.SOCIAL_AUTH_COOKIE_SECRET = "cd".repeat(32);
  assert.equal(social.readSocialCookie("flow", sealed), null);
}));
test("provider exposure requires all credentials, fixed safe origin and encryption secret", () => configured(() => {
  assert.ok(social.socialProviderSettings("google"));
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  assert.equal(social.socialProviderSettings("google"), null);
  assert.ok(social.socialProviderSettings("kakao"));
  process.env.APP_URL = "https://attacker:password@app.example.invalid";
  assert.equal(social.socialProviderSettings("kakao"), null);
  process.env.APP_URL = "http://localhost:3210";
  assert.ok(social.socialProviderSettings("kakao"));
  process.env.NODE_ENV = "production";
  assert.equal(social.socialProviderSettings("kakao"), null);
}));
test("return paths reject external redirects and encoded control characters", () => {
  for (const path of ["//evil.test", "https://evil.test", "/\\evil.test", "/%2fevil.test", "/%5cevil.test", "/%0aLocation:evil", "/\nevil.test", "/%", "/" + "x".repeat(513)]) {
    assert.equal(social.safeSocialReturnTo(path), "/", path);
  }
  assert.equal(social.safeSocialReturnTo("/saju?focus=money"), "/saju?focus=money");
});
test("identity stores Google verified email only and ignores Kakao email/profile", () => {
  const claims = { sub: "subject", email: "A@Example.invalid", email_verified: true, nickname: "name", picture: "https://image.invalid" };
  assert.deepEqual(social.socialIdentity("google", claims), { provider: "social:google", externalId: "subject", email: "a@example.invalid", emailVerified: true });
  assert.equal(social.socialIdentity("google", { ...claims, email_verified: "true" }).email, null);
  assert.deepEqual(social.socialIdentity("kakao", claims), { provider: "social:kakao", externalId: "subject", email: null, emailVerified: false });
  assert.throws(() => social.socialIdentity("google", { sub: "" }));
});
test("social start rejects cross-origin before provider work", () => configured(async () => {
  const h = routeHarness();
  const response = await h.route("post", "/auth/social/:provider/start", { params: { provider: "google" }, headers: { origin: "https://evil.invalid" } });
  assert.equal(response.statusCode, 403); assert.equal(h.state.authorization, null);
}));
test("social start binds PKCE, nonce and state in HttpOnly cookie and minimizes scope", () => configured(async () => {
  const h = routeHarness();
  for (const provider of ["google", "kakao"]) {
    const response = await h.route("post", "/auth/social/:provider/start", { params: { provider }, body: { returnTo: "//evil.invalid" } });
    assert.equal(response.statusCode, 200);
    assert.equal(h.state.authorization.code_challenge_method, "S256");
    assert.equal(h.state.authorization.scope, provider === "google" ? "openid email" : "openid");
    const cookie = response.cookies[social.SOCIAL_FLOW_COOKIE];
    assert.deepEqual(cookie.options, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: social.SOCIAL_FLOW_TTL });
    assert.equal(social.readSocialCookie<any>("flow", cookie.value)?.returnTo, "/");
  }
}));
test("callback requires flow cookie; no provider calls or session on missing/cross-provider flow", () => configured(async () => {
  const h = routeHarness();
  for (const cookie of [undefined, social.sealSocialCookie("flow", { provider: "kakao", state: "state", nonce: "nonce", verifier: "verifier" })]) {
    const response = await h.route("get", "/auth/social/:provider/callback", { params: { provider: "google" }, cookies: { [social.SOCIAL_FLOW_COOKIE]: cookie } });
    assert.equal(response.destination, "/login?socialError=expired");
    assert.equal(h.state.grant, null); assert.equal(h.state.sessions, 0);
  }
}));
test("new social callback validates fixed callback with state/nonce/PKCE then waits for consent", () => configured(async () => {
  const h = routeHarness();
  const flow = social.sealSocialCookie("flow", { provider: "google", state: "state", nonce: "nonce", verifier: "verifier", returnTo: "/saju" });
  const response = await h.route("get", "/auth/social/:provider/callback", { params: { provider: "google" }, headers: { host: "evil.invalid" }, cookies: { [social.SOCIAL_FLOW_COOKIE]: flow }, originalUrl: "/api/auth/social/google/callback?code=test&state=state" });
  assert.equal(h.state.grant.url, "https://app.example.invalid/api/auth/social/google/callback?code=test&state=state");
  assert.deepEqual(h.state.grant.checks, { pkceCodeVerifier: "verifier", expectedState: "state", expectedNonce: "nonce", idTokenExpected: true });
  assert.equal(response.destination, "/register?social=1");
  assert.equal(h.state.signup, 0); assert.equal(h.state.sessions, 0);
  const pending = social.readSocialCookie<any>("pending", response.cookies[social.SOCIAL_PENDING_COOKIE].value);
  assert.equal(pending.identity.externalId, "subject"); assert.equal(pending.returnTo, "/saju");
}));
test("existing social member logs in without new signup consent", () => configured(async () => {
  const h = routeHarness(); h.state.existing = true;
  const flow = social.sealSocialCookie("flow", { provider: "google", state: "state", nonce: "nonce", verifier: "verifier", returnTo: "/saju" });
  const response = await h.route("get", "/auth/social/:provider/callback", { params: { provider: "google" }, cookies: { [social.SOCIAL_FLOW_COOKIE]: flow }, originalUrl: "/api/auth/social/google/callback?code=test&state=state" });
  assert.equal(response.destination, "/saju"); assert.equal(h.state.signup, 0); assert.equal(h.state.sessions, 1);
}));
test("social completion rejects missing/stale consent and forged pending cookies", () => configured(async () => {
  const h = routeHarness();
  const pending = social.sealSocialCookie("pending", { provider: "google", identity: { provider: "social:google", externalId: "subject" }, returnTo: "/saju" });
  for (const supplied of [undefined, { ...consent, terms: false }, { ...consent, privacy: false }, { ...consent, version: "old" }]) {
    const response = await h.route("post", "/auth/social/complete", { cookies: { [social.SOCIAL_PENDING_COOKIE]: pending }, body: { consent: supplied } });
    assert.equal(response.statusCode, 400);
  }
  const forged = await h.route("post", "/auth/social/complete", { cookies: { [social.SOCIAL_PENDING_COOKIE]: "forged" }, body: { consent } });
  assert.equal(forged.statusCode, 401); assert.equal(h.state.signup, 0);
  const success = await h.route("post", "/auth/social/complete", { cookies: { [social.SOCIAL_PENDING_COOKIE]: pending }, body: { consent } });
  assert.equal(success.statusCode, 201); assert.equal(success.body.returnTo, "/saju");
  assert.equal(h.state.signup, 1); assert.equal(h.state.sessions, 1);
  assert.ok(success.cleared.includes(social.SOCIAL_PENDING_COOKIE));
}));
