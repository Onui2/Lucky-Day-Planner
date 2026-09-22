import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const rootRequire = createRequire(new URL("../../../package.json", import.meta.url));
const ts = rootRequire("typescript");
const source = readFileSync(new URL("../../../lib/replit-auth-web/src/use-auth.ts", import.meta.url), "utf8");
const tokenKeys = [
  "lucky_day_supabase_access_token", "lucky_day_supabase_refresh_token",
  "sb-test-auth-token", "sb-test-auth-token-user", "sb-test-auth-token-code-verifier",
];
const snapshotKey = "lucky_day_auth_snapshot_v1";
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Execute the actual AuthProvider callbacks, with a tiny hook host and isolated
// browser, SDK, and HTTP boundaries. No real tokens, Supabase or network are used.
function setup({ status = 200, code, deferred = false, offline = false, enabled = true } = {}) {
  const storage = new Map(tokenKeys.map((key) => [key, "synthetic-token"]));
  storage.set(snapshotKey, JSON.stringify({ user: { id: "owner" } }));
  const effects = [];
  const calls = [];
  const sdkCalls = [];
  let auth;
  let resolveAuth;
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    location: { href: "/account", pathname: "/account", search: "", hash: "" },
  };
  const react = {
    useState: (value) => [typeof value === "function" ? value() : value, () => {}],
    useRef: (value) => ({ current: value }),
    useCallback: (callback) => callback,
    useEffect: (callback) => effects.push(callback),
    createContext: (value) => ({ Provider: {}, value }),
    useContext: (context) => context.value,
    createElement: (_type, props) => { auth = props.value; return null; },
  };
  const sdk = {
    getSupabaseClient: () => ({ auth: {
      getSession: async () => ({ data: { session: { access_token: "synthetic-token", refresh_token: "synthetic-refresh" } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      stopAutoRefresh: async () => { sdkCalls.push("stop"); },
      signOut: async (options) => {
        sdkCalls.push(options?.scope ?? "global");
        if (offline) throw new Error("synthetic offline error");
      },
    } }),
    storeSupabaseSession: (session) => {
      storage.set(tokenKeys[0], session.access_token);
      storage.set(tokenKeys[1], session.refresh_token);
    },
  };
  const module = { exports: {} };
  const compiled = ts.transpileModule(source.replaceAll("import.meta", "__testImportMeta"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2016 },
  }).outputText;
  runInNewContext(compiled, {
    module, exports: module.exports, window, Promise, URL, URLSearchParams, setTimeout,
    __testImportMeta: { env: {
      BASE_URL: "/",
      ...(enabled ? { VITE_SUPABASE_URL: "https://test.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key" } : {}),
    } },
    require(name) {
      if (name === "react") return react;
      if (name === "./supabase") return sdk;
      throw new Error(`Unexpected dependency: ${name}`);
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url === "/api/logout") return { ok: true, status: 200 };
      assert.equal(url, "/api/auth/user");
      const response = {
        ok: status === 200, status,
        json: async () => status === 200 ? { user: { id: "stale-user" } } : { code },
      };
      return deferred ? new Promise((resolve) => { resolveAuth = () => resolve(response); }) : response;
    },
  });
  module.exports.AuthProvider({ children: null });
  return { storage, effects, calls, sdkCalls, window, auth, resolveAuth: () => resolveAuth() };
}

function assertSignedOut(harness) {
  for (const key of tokenKeys) assert.equal(harness.storage.has(key), false, key);
  assert.equal(JSON.parse(harness.storage.get(snapshotKey)).user, null);
}

test("password-change logout keeps the login notice destination and clears client state", async () => {
  const h = setup();
  const destination = "/login?returnTo=%2Faccount&notice=password-changed";
  const pending = h.auth.logout({ redirectTo: destination });
  assert.equal(JSON.parse(h.storage.get(snapshotKey)).user, null);
  await pending;
  assert.equal(h.window.location.href, destination);
  assertSignedOut(h);
});

test("existing logout callers still navigate home", async () => {
  const h = setup();
  await h.auth.logout();
  assert.equal(h.window.location.href, "/");
  assertSignedOut(h);
});

test("logout rejects external redirect destinations", async () => {
  for (const redirectTo of ["//attacker.invalid", "https://attacker.invalid", "/\\attacker.invalid"]) {
    const h = setup();
    await h.auth.logout({ redirectTo });
    assert.equal(h.window.location.href, "/");
  }
});

test("SDK cleanup failure still clears storage and completes server logout", async () => {
  const h = setup({ offline: true });
  await h.auth.logout();
  assertSignedOut(h);
  assert.ok(h.sdkCalls.includes("global"));
  assert.ok(h.calls.some((call) => call.url === "/api/logout"));
});

test("in-flight auth response cannot restore a user after logout", async () => {
  const h = setup({ enabled: false, deferred: true });
  h.effects[0]();
  await flush();
  await h.auth.logout({ redirectTo: "/login?notice=password-changed" });
  h.resolveAuth();
  await flush();
  assert.equal(JSON.parse(h.storage.get(snapshotKey)).user, null);
});

test("401 and 403 rejected bearer responses clear custom and SDK tokens", async () => {
  for (const status of [401, 403]) {
    const h = setup({ status });
    h.effects[0]();
    await flush();
    await flush();
    assertSignedOut(h);
    assert.ok(h.sdkCalls.includes("local"));
  }
});

test("auth requests after rejection omit the stale bearer", async () => {
  const h = setup({ status: 401 });
  h.effects[0]();
  await flush();
  await flush();
  await h.auth.refreshUser();
  assert.equal(h.calls.at(-1).options.headers, undefined);
});

test("IDENTITY_ACCOUNT_CONFLICT 409 clears bearer so local login can recover", async () => {
  const h = setup({ status: 409, code: "IDENTITY_ACCOUNT_CONFLICT" });
  h.effects[0]();
  await flush();
  await flush();
  assertSignedOut(h);
  assert.ok(h.sdkCalls.includes("local"));
  await h.auth.refreshUser();
  assert.equal(h.calls.at(-1).options.headers, undefined);
});

test("unrelated 409 responses preserve the last known session", async () => {
  const h = setup({ status: 409, code: "UNRELATED_CONFLICT" });
  h.effects[0]();
  await flush();
  await flush();
  assert.equal(h.storage.has(tokenKeys[0]), true);
  assert.equal(h.storage.has(tokenKeys[2]), true);
  assert.equal(JSON.parse(h.storage.get(snapshotKey)).user.id, "owner");
  assert.equal(h.sdkCalls.includes("local"), false);
});
