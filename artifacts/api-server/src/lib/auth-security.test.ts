import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { transformSync } from "esbuild";

// Execute production modules with an isolated, transactional database double.
// No production DB module, environment loader, server, or network is invoked.
type Row = Record<string, any>;
type Expr = { kind: string; [key: string]: any };
const nativeRequire = createRequire(import.meta.url);
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function makeHarness() {
  const tables: Record<string, Row[]> = { users: [], sessions: [], identities: [] };
  const table = (name: string) => new Proxy({ _table: name } as Row, {
    get(target, key) { return key === "_table" ? target._table : { kind: "column", table: name, key }; },
  });
  const usersTable = table("users");
  const sessionsTable = table("sessions");
  const authIdentitiesTable = table("identities");
  const orm = {
    eq: (left: any, right: any) => ({ kind: "eq", left, right }),
    and: (...items: any[]) => ({ kind: "and", items }),
    or: (...items: any[]) => ({ kind: "or", items }),
    sql: (strings: TemplateStringsArray, ...values: any[]) => ({ kind: "sql", text: strings.join("?"), values }),
    count: () => 0, desc: (v: any) => v, gte: () => true, ilike: () => true,
  };
  function value(expr: any, context: Row): any {
    if (!expr || typeof expr !== "object" || expr instanceof Date) return expr;
    if (expr.kind === "column") return context[expr.table]?.[expr.key];
    if (expr.kind === "eq") return value(expr.left, context) === value(expr.right, context);
    if (expr.kind === "and") return expr.items.every((item: any) => value(item, context));
    if (expr.kind === "or") return expr.items.some((item: any) => value(item, context));
    if (expr.kind === "sql") {
      const args = expr.values.map((v: any) => value(v, context));
      if (expr.text.startsWith("lower(")) return args[0]?.toLowerCase() === args[1];
      if (expr.text.includes("->'user'->>'id' =")) return args[0]?.user?.id === args[1];
      if (expr.text.includes("->'user'->>'id'")) return args[0]?.user?.id;
      if (expr.text.includes("+ 1")) return args[0] + 1;
      throw new Error(`Unexpected SQL in auth test: ${expr.text}`);
    }
    return expr;
  }
  let nextId = 1;
  let configured = true;
  let ready = true;
  let databaseFailure: Error | null = null;
  let compareHook: (() => void) | null = null;
  const locks: string[] = [];
  const lockEvents: string[] = [];
  class Query implements PromiseLike<any> {
    target!: Row;
    predicate?: Expr;
    projection?: Row;
    patch?: Row;
    inserted?: Row[];
    joins: Array<{ table: Row; on: Expr }> = [];
    result: any;
    executed = false;
    constructor(public operation: string) {}
    from(t: Row) { this.target = t; return this; }
    where(expr: Expr) { this.predicate = expr; return this; }
    for(_mode: string) { locks.push(this.target._table); lockEvents.push(`row:${this.target._table}`); return this; }
    innerJoin(t: Row, on: Expr) { this.joins.push({ table: t, on }); return this; }
    set(patch: Row) { this.patch = patch; return this; }
    values(rows: Row | Row[]) { this.inserted = Array.isArray(rows) ? rows : [rows]; return this; }
    returning(projection?: Row) { this.projection = projection; return this; }
    onConflictDoNothing() { return this; }
    orderBy() { return this; }
    limit() { return this; }
    offset() { return this; }
    run() {
      if (databaseFailure) throw databaseFailure;
      if (this.executed) return this.result;
      this.executed = true;
      const name = this.target._table;
      if (this.operation === "insert") {
        this.result = this.inserted!.map((insert) => {
          const row = name === "users" ? {
            id: `user-${nextId++}`, email: null, firstName: null, lastName: null,
            profileImageUrl: null, role: "user", authVersion: 0, authValidAfter: null,
            passwordHash: null, passwordResetToken: null, passwordResetExpiry: null,
            ...insert,
          } : { ...insert };
          tables[name].push(structuredClone(row));
          return structuredClone(row);
        });
        return this.result;
      }
      let contexts: Row[] = tables[name].map(row => ({ [name]: row }));
      for (const join of this.joins) {
        contexts = contexts.flatMap(context => tables[join.table._table]
          .map(row => ({ ...context, [join.table._table]: row }))
          .filter(context => value(join.on, context)));
      }
      contexts = contexts.filter(context => !this.predicate || value(this.predicate, context));
      if (this.operation === "update") {
        for (const context of contexts) {
          for (const [key, expr] of Object.entries(this.patch!)) context[name][key] = value(expr, context);
        }
      }
      if (this.operation === "delete") {
        const deleted = contexts.map(context => context[name]);
        tables[name] = tables[name].filter(row => !deleted.includes(row));
        if (name === "users") {
          for (const identity of tables.identities) {
            if (deleted.some(user => user.id === identity.userId)) identity.userId = null;
          }
        }
      }
      this.result = contexts.map(context => this.projection ? Object.fromEntries(
        Object.entries(this.projection).map(([key, expr]) =>
          [key, expr?._table ? context[expr._table] : value(expr, context)]),
      ) : context[name]);
      return structuredClone(this.result);
    }
    then(onFulfilled?: any, onRejected?: any): any {
      return Promise.resolve().then(() => this.run()).then(onFulfilled, onRejected);
    }
  }
  const db: Row = {
    select: (projection?: Row) => { const q = new Query("select"); q.projection = projection; return q; },
    insert: (t: Row) => new Query("insert").from(t),
    update: (t: Row) => new Query("update").from(t),
    delete: (t: Row) => new Query("delete").from(t),
    execute: async (statement: Expr) => {
      if (databaseFailure) throw databaseFailure;
      lockEvents.push(`advisory:${statement.values[0]}`);
      return [];
    },
    transaction: async (run: (tx: Row) => Promise<any>) => {
      const before = structuredClone(tables);
      try { return await run(db); } catch (error) { Object.assign(tables, before); throw error; }
    },
  };
  const modules = new Map<string, Row>();
  const dependencies: Row = {
    "@workspace/db": { db, usersTable, sessionsTable, authIdentitiesTable, hasDatabaseConfig: () => configured },
    "@workspace/api-zod": { GetCurrentAuthUserResponse: { parse: (value: any) => value } },
    "drizzle-orm": orm,
    "openid-client": {},
    "bcryptjs": {
      hash: async (password: string) => `$2a$10$${password}`,
      compare: async (password: string, hash: string) => { compareHook?.(); return hash === `$2a$10$${password}`; },
    },
  };
  function load(relativePath: string): Row {
    const filename = path.resolve(sourceRoot, relativePath);
    if (modules.has(filename)) return modules.get(filename)!;
    if (filename.endsWith("database-guard.ts")) return {
      isDatabaseAvailable: async () => ready && configured,
      requireDatabase: async () => ready && configured,
    };
    if (filename.endsWith("email.ts")) return { sendPasswordResetEmail: async () => {} };
    const compiled = transformSync(readFileSync(filename, "utf8"), { loader: "ts", format: "cjs" }).code;
    const module = { exports: {} };
    new Function("require", "module", "exports", compiled)((specifier: string) => {
      if (specifier in dependencies) return dependencies[specifier];
      if (specifier.startsWith(".")) return load(path.relative(sourceRoot,
        path.resolve(path.dirname(filename), specifier.replace(/\.js$/, ".ts"))));
      return nativeRequire(specifier);
    }, module, module.exports);
    modules.set(filename, module.exports);
    return module.exports;
  }
  async function addUser(patch: Row = {}) {
    const [user] = await db.insert(usersTable).values(patch).returning();
    return user;
  }
  async function route(filename: string, method: string, routePath: string, request: Row = {}) {
    const router = load(`routes/${filename}.ts`).default;
    const handler = router.stack.find((layer: any) => layer.route?.path === routePath && layer.route.methods[method]).route.stack[0].handle;
    const req = { headers: {}, cookies: {}, protocol: "https", body: {}, params: {}, query: {}, isAuthenticated: () => Boolean(request.user), ...request };
    const res: Row = { req, statusCode: 200, cookies: {}, cleared: [],
      status(code: number) { this.statusCode = code; return this; },
      cookie(name: string, value: string) { this.cookies[name] = value; return this; },
      clearCookie(name: string) { this.cleared.push(name); return this; },
      json(body: any) { this.body = body; return this; },
    };
    await handler(req, res);
    return res;
  }
  return { tables, load, addUser, route, db, locks, lockEvents,
    setConfigured: (value: boolean) => { configured = value; },
    setReady: (value: boolean) => { ready = value; },
    failDatabase: () => { databaseFailure = new Error("test database unavailable"); },
    onPasswordCompare: (hook: () => void) => { compareHook = hook; },
  };
}

function withEnvironment(values: Record<string, string>, run: () => Promise<void>) {
  const original = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  return run().finally(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

test("local signup and later login cannot claim allowlisted admin privileges", () => withEnvironment({
  NODE_ENV: "production", SUPER_ADMIN_EMAILS: "victim@example.invalid", ADMIN_EMAILS: "",
}, async () => {
  const h = makeHarness();
  const signup = await h.route("auth", "post", "/auth/register", { body: { email: "victim@example.invalid", password: "attacker-password" } });
  assert.equal(signup.statusCode, 201);
  assert.equal(signup.body.user.role, "user");
  const login = await h.route("auth", "post", "/auth/login-local", { body: { email: "victim@example.invalid", password: "attacker-password" } });
  assert.equal(login.body.user.role, "user");
  assert.equal(h.tables.users[0].role, "user");
}));

test("local auth rejects oversized email input before creating accounts or reset tokens", async () => {
  const h = makeHarness();
  const craftedEmail = `${"x,".repeat(130)}x@example.invalid`;

  const signup = await h.route("auth", "post", "/auth/register", {
    body: { email: craftedEmail, password: "attacker-password" },
  });
  assert.equal(signup.statusCode, 400);
  assert.equal(h.tables.users.length, 0);

  await h.addUser({ email: craftedEmail, passwordHash: "$2a$10$old-password" });
  const login = await h.route("auth", "post", "/auth/login-local", {
    body: { email: craftedEmail, password: "old-password" },
  });
  assert.equal(login.statusCode, 400);

  const reset = await h.route("auth", "post", "/auth/forgot-password", {
    body: { email: craftedEmail },
  });
  assert.equal(reset.statusCode, 400);
  assert.equal(h.tables.users[0].passwordResetToken, null);
});

test("verified identity never merges into an attacker-preclaimed local email", async () => {
  const h = makeHarness();
  const planted = await h.addUser({ email: "victim@example.invalid", passwordHash: "$2a$10$attacker" });
  await assert.rejects(h.load("lib/auth-users.ts").syncUserFromIdentity({
    provider: "oidc:https://issuer.invalid", externalId: "victim-subject", email: planted.email, emailVerified: true,
  }), { code: "IDENTITY_ACCOUNT_CONFLICT" });
  assert.equal(h.tables.identities.length, 0);
  assert.equal(h.tables.users.length, 1);
});

test("only new verified provider accounts receive allowlist roles; demotions persist", () => withEnvironment({
  SUPER_ADMIN_EMAILS: "admin@example.invalid", ADMIN_EMAILS: "",
}, async () => {
  const h = makeHarness();
  const sync = h.load("lib/auth-users.ts").syncUserFromIdentity;
  const input = { provider: "supabase:https://provider.invalid", externalId: "subject", email: "admin@example.invalid", emailVerified: true };
  const created = await sync(input);
  assert.equal(created.role, "superadmin");
  h.tables.users[0].role = "user";
  assert.equal((await sync(input)).role, "user");
  const other = makeHarness();
  assert.equal((await other.load("lib/auth-users.ts").syncUserFromIdentity({ ...input, emailVerified: false })).role, "user");
}));

test("stable subject preserves identity across email changes without merging another user's data", async () => {
  const h = makeHarness();
  const sync = h.load("lib/auth-users.ts").syncUserFromIdentity;
  const original = await sync({ provider: "oidc:one", externalId: "sub", email: "one@example.invalid", emailVerified: true });
  const second = await h.addUser({ email: "two@example.invalid" });
  const current = await sync({ provider: "oidc:one", externalId: "sub", email: second.email, emailVerified: true });
  assert.equal(current.id, original.id);
  assert.notEqual(current.id, second.id);
});

test("legacy subject adoption requires verified matching email, no password, and no prior binding", async () => {
  const h = makeHarness();
  const legacy = await h.addUser({ id: "legacy-sub", email: "legacy@example.invalid", role: "admin" });
  const input = { provider: "oidc:one", externalId: legacy.id, email: legacy.email, emailVerified: false };
  const sync = h.load("lib/auth-users.ts").syncUserFromIdentity;
  await assert.rejects(sync(input), { code: "IDENTITY_ACCOUNT_CONFLICT" });
  assert.equal((await sync({ ...input, emailVerified: true })).id, legacy.id);
  assert.equal(h.tables.users[0].role, "admin");
  await assert.rejects(sync({ ...input, provider: "oidc:two", emailVerified: true }), { code: "IDENTITY_ACCOUNT_CONFLICT" });
  const h2 = makeHarness();
  await h2.addUser({ ...legacy, passwordHash: "$2a$10$old" });
  await assert.rejects(h2.load("lib/auth-users.ts").syncUserFromIdentity({ ...input, emailVerified: true }), { code: "IDENTITY_ACCOUNT_CONFLICT" });
});

test("missing or failing database never authenticates a fallback privileged identity", async () => {
  for (const fail of ["missing", "unavailable"]) {
    const h = makeHarness();
    if (fail === "missing") h.setConfigured(false); else h.failDatabase();
    await assert.rejects(h.load("lib/auth-users.ts").syncUserFromIdentity({
      provider: "supabase:test", externalId: "sub", email: "admin@example.invalid", emailVerified: true,
    }));
    assert.equal(h.tables.users.length, 0);
  }
});

test("session reads current role and rejects old versions, legacy sessions and deleted users", async () => {
  const h = makeHarness();
  const user = await h.addUser({ role: "admin" });
  const auth = h.load("lib/auth.ts");
  const sid = await auth.createSession({ user, authVersion: 0, access_token: "" });
  assert.equal((await auth.getSession(sid)).user.role, "admin");
  h.tables.users[0].role = "user";
  assert.equal((await auth.getSession(sid)).user.role, "user");
  h.tables.users[0].authVersion++;
  assert.equal(await auth.getSession(sid), null);
  h.tables.sessions.push({ sid: "legacy", expire: new Date(Date.now() + 10000), sess: { user, access_token: "" } });
  assert.equal(await auth.getSession("legacy"), null);
  const newSid = await auth.createSession({ user, authVersion: 1, access_token: "" });
  h.tables.users = [];
  assert.equal(await auth.getSession(newSid), null);
});

test("revocation removes every device session and rejects raced login/refresh", async () => {
  const h = makeHarness();
  const user = await h.addUser();
  const auth = h.load("lib/auth.ts");
  const data = { user, authVersion: 0, access_token: "" };
  const first = await auth.createSession(data);
  await auth.createSession(data);
  await h.db.transaction((tx: Row) => auth.revokeUserSessions(tx, user.id));
  assert.equal(h.tables.sessions.length, 0);
  assert.equal(h.tables.users[0].authVersion, 1);
  assert.ok(h.tables.users[0].authValidAfter instanceof Date);
  assert.equal(await auth.getSession(first), null);
  await assert.rejects(auth.createSession(data), auth.AuthStateChangedError);
  await assert.rejects(auth.updateSession(first, data), auth.AuthStateChangedError);
  assert.ok(h.locks.includes("users"));
});

test("local login raced with password revocation cannot mint a new session", async () => {
  const h = makeHarness();
  await h.addUser({ email: "user@example.invalid", passwordHash: "$2a$10$old-password" });
  h.onPasswordCompare(() => { h.tables.users[0].authVersion++; });
  const response = await h.route("auth", "post", "/auth/login-local", { body: { email: "user@example.invalid", password: "old-password" } });
  assert.equal(response.statusCode, 401);
  assert.equal(h.tables.sessions.length, 0);
});

test("password reset is one-use, revokes all devices and prevents replay", async () => {
  const h = makeHarness();
  const user = await h.addUser({ passwordHash: "$2a$10$old-password", passwordResetToken: "valid-token", passwordResetExpiry: new Date(Date.now() + 10000) });
  const auth = h.load("lib/auth.ts");
  await auth.createSession({ user, authVersion: 0, access_token: "" });
  const request = { body: { token: "valid-token", password: "new-password" } };
  assert.equal((await h.route("auth", "post", "/auth/reset-password", request)).statusCode, 200);
  assert.equal(h.tables.users[0].passwordHash, "$2a$10$new-password");
  assert.equal(h.tables.sessions.length, 0);
  assert.equal(h.tables.users[0].authVersion, 1);
  assert.equal((await h.route("auth", "post", "/auth/reset-password", request)).statusCode, 400);
});

test("password change clears current cookie, revokes all devices and cancels reset links", async () => {
  const h = makeHarness();
  const user = await h.addUser({ passwordHash: "$2a$10$old-password", passwordResetToken: "pending-token" });
  const auth = h.load("lib/auth.ts");
  const sid = await auth.createSession({ user, authVersion: 0, access_token: "" });
  await auth.createSession({ user, authVersion: 0, access_token: "" });
  const response = await h.route("account", "patch", "/account/password", { user, cookies: { sid }, body: { currentPassword: "old-password", newPassword: "new-password" } });
  assert.equal(response.statusCode, 200);
  assert.ok(response.cleared.includes("sid"));
  assert.equal(h.tables.sessions.length, 0);
  assert.equal(h.tables.users[0].passwordResetToken, null);
});

test("administrator role changes revoke existing target sessions", async () => {
  const h = makeHarness();
  const admin = await h.addUser({ role: "admin" });
  const root = await h.addUser({ role: "superadmin" });
  const auth = h.load("lib/auth.ts");
  await auth.createSession({ user: admin, authVersion: 0, access_token: "" });
  const response = await h.route("users", "patch", "/admin/users/:id/role", { user: root, params: { id: admin.id }, body: { role: "user" } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.user.role, "user");
  assert.equal(h.tables.sessions.length, 0);
  assert.equal(h.tables.users.find(user => user.id === admin.id)!.authVersion, 1);
});

test("account deletion retains provider and legacy subject tombstones", async () => {
  for (const mode of ["self", "admin"]) {
    const h = makeHarness();
    const user = await h.addUser({ id: "legacy-subject", email: "deleted@example.invalid" });
    const root = await h.addUser({ role: "superadmin" });
    h.tables.identities.push({ provider: "supabase:one", subject: "bound-subject", userId: user.id });
    await h.load("lib/auth.ts").createSession({ user, authVersion: 0, access_token: "" });
    const response = mode === "self"
      ? await h.route("account", "delete", "/account", { user })
      : await h.route("users", "delete", "/admin/users/:id", { user: root, params: { id: user.id } });
    assert.equal(response.statusCode, 200);
    assert.equal(h.tables.sessions.length, 0);
    const sync = h.load("lib/auth-users.ts").syncUserFromIdentity;
    for (const externalId of ["bound-subject", "legacy-subject"]) {
      await assert.rejects(sync({ provider: "supabase:one", externalId, email: user.email, emailVerified: true }), { code: "IDENTITY_ACCOUNT_UNAVAILABLE" });
    }
  }
});

test("first legacy identity binding and deletion acquire the same lock before user row locks", async () => {
  const h = makeHarness();
  const user = await h.addUser({ id: "legacy-lock-subject", email: "legacy@example.invalid" });
  await h.load("lib/auth-users.ts").syncUserFromIdentity({
    provider: "oidc:issuer", externalId: user.id, email: user.email, emailVerified: true,
  });
  const sharedLock = `advisory:legacy-user:${user.id}`;
  assert.ok(h.lockEvents.indexOf(sharedLock) >= 0);
  assert.ok(h.lockEvents.indexOf(sharedLock) < h.lockEvents.indexOf("row:users"));
  h.lockEvents.length = 0;
  await h.db.transaction((tx: Row) => h.load("lib/auth.ts").deleteUserAccount(tx, user.id));
  assert.equal(h.lockEvents[0], sharedLock);
  assert.ok(h.lockEvents.indexOf(sharedLock) < h.lockEvents.indexOf("row:users"));
});

function token(sub: string, amr: Row[] | undefined, iat = Math.floor(Date.now() / 1000)) {
  return `header.${Buffer.from(JSON.stringify({ sub, amr, iat })).toString("base64url")}.signature`;
}

test("Supabase checks verified email outside editable metadata and rejects mismatched token subject", () => withEnvironment({
  SUPABASE_URL: "https://provider.invalid", SUPABASE_PUBLISHABLE_KEY: "test-key", SUPER_ADMIN_EMAILS: "admin@example.invalid",
}, async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "subject", email: "admin@example.invalid", user_metadata: { email_verified: true, role: "superadmin" } }));
  try {
    const h = makeHarness();
    const verify = h.load("lib/supabase-auth.ts").verifySupabaseAccessToken;
    assert.equal((await verify(token("subject", undefined))).role, "user");
    assert.equal(await verify(token("other-subject", undefined)), null);
    h.failDatabase();
    await assert.rejects(verify(token("subject", undefined)));
  } finally { globalThis.fetch = originalFetch; }
}));

test("Supabase old/missing auth event and token refresh cannot bypass account revocation", () => withEnvironment({
  SUPABASE_URL: "https://provider.invalid", SUPABASE_PUBLISHABLE_KEY: "test-key",
}, async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "subject", email: "user@example.invalid", email_confirmed_at: "2025-01-01T00:00:00Z" }));
  try {
    const h = makeHarness();
    const verify = h.load("lib/supabase-auth.ts").verifySupabaseAccessToken;
    const now = Math.floor(Date.now() / 1000);
    await verify(token("subject", [{ method: "password", timestamp: now - 100 }]));
    h.tables.users[0].authValidAfter = new Date((now - 10) * 1000);
    h.tables.users[0].role = "user";
    for (const amr of [undefined, [{ method: "password", timestamp: now - 100 }], [{ method: "token_refresh", timestamp: now }]]) {
      await assert.rejects(verify(token("subject", amr)), { code: "IDENTITY_REAUTH_REQUIRED" });
    }
    assert.equal((await verify(token("subject", [{ method: "password", timestamp: now }]))).role, "user");
  } finally { globalThis.fetch = originalFetch; }
}));

test("Supabase provider throttling/outages are 503 errors, not rejected credentials", () => withEnvironment({
  SUPABASE_URL: "https://provider.invalid", SUPABASE_PUBLISHABLE_KEY: "test-key",
}, async () => {
  const originalFetch = globalThis.fetch;
  try {
    const h = makeHarness();
    const verify = h.load("lib/supabase-auth.ts").verifySupabaseAccessToken;
    for (const status of [429, 500, 503]) {
      globalThis.fetch = async () => new Response("private upstream error", { status });
      await assert.rejects(verify(token("subject", undefined)), (error: any) => {
        assert.equal(error.status, 503);
        assert.ok(!error.message.includes("private upstream error"));
        return true;
      });
    }
    for (const status of [401, 403]) {
      globalThis.fetch = async () => new Response(null, { status });
      assert.equal(await verify(token("subject", undefined)), null);
    }
    assert.equal(h.tables.users.length, 0);
  } finally { globalThis.fetch = originalFetch; }
}));

test("invalid bearer never falls back to valid cookie; bootstrap failure fails closed", () => withEnvironment({
  SUPABASE_URL: "", VITE_SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "", VITE_SUPABASE_PUBLISHABLE_KEY: "", VITE_SUPABASE_ANON_KEY: "",
}, async () => {
  for (const ready of [true, false]) {
    const h = makeHarness();
    h.setReady(ready);
    const user = await h.addUser({ role: "superadmin" });
    const sid = await h.load("lib/auth.ts").createSession({ user, authVersion: 0, access_token: "" });
    const req: Row = { headers: { authorization: "Bearer invalid" }, cookies: { sid } };
    const res: Row = { status(code: number) { this.statusCode = code; return this; }, json() { return this; } };
    let nextCalled = false;
    await h.load("middlewares/authMiddleware.ts").authMiddleware(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, ready ? 401 : 503);
    assert.equal(req.user, undefined);
    assert.equal(nextCalled, false);
  }
}));

test("session lookup outage returns 503 without clearing credentials or continuing unauthenticated", async () => {
  const h = makeHarness();
  const user = await h.addUser();
  const sid = await h.load("lib/auth.ts").createSession({ user, authVersion: 0, access_token: "" });
  h.failDatabase();
  const req: Row = { headers: {}, cookies: { sid } };
  const res: Row = { status(code: number) { this.statusCode = code; return this; }, json() { return this; } };
  let nextCalled = false;
  const originalError = console.error;
  console.error = () => {};
  try {
    await h.load("middlewares/authMiddleware.ts").authMiddleware(req, res, () => { nextCalled = true; });
  } finally { console.error = originalError; }
  assert.equal(res.statusCode, 503);
  assert.equal(nextCalled, false);
  assert.equal(req.user, undefined);
  assert.equal(h.tables.sessions.length, 1);
});
