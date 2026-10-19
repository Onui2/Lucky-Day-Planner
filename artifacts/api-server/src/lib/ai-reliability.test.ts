import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

const directory = path.dirname(fileURLToPath(import.meta.url));
class TestRateLimitError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public retryAfterSeconds: number) { super(message); }
}
const defaultLimits = {
  enforceSharedRateLimit: async () => {},
  getConfiguredRateLimitMax: (_name: string, fallback: number) => fallback,
  rateLimitKeyByIp: () => "network:test",
  RateLimitError: TestRateLimitError,
};
function load(filename: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const module = { exports: {} as any };
  const code = transformSync(readFileSync(filename, "utf8"), { loader: filename.endsWith(".tsx") ? "tsx" : "ts", jsx: "automatic", format: "cjs" }).code;
  runInNewContext(code, {
    module, exports: module.exports, Date, Promise,
    console: { error() {}, warn() {} },
    require(name: string) {
      if (name === "../middlewares/rateLimit.js" && !(name in dependencies)) return defaultLimits;
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return module.exports;
}

function routeHarness(failure: "calculate" | "generate" | "finalize" | null = null, blocked = false,
  options: { limitError?: Error; planCode?: string; bonus?: number; unlimited?: boolean; question?: string; stream?: boolean; providerError?: Error } = {}) {
  let handler: any;
  const state = { reserved: 0, released: [] as number[], saved: 0, checked: 0, generated: 0, events: [] as string[] };
  load(path.join(directory, "../routes/ai.ts"), {
    express: { Router: () => ({ get() {}, post(_path: string, callback: any) { handler = callback; } }) },
    "@workspace/db": {}, "drizzle-orm": {},
    "../lib/ai-assistant.js": { buildSajuQuestionAnswer: async () => {
      state.generated++;
      if (options.providerError) throw options.providerError;
      if (failure === "generate") throw new Error("provider failure");
      return "상담 답변";
    } },
    "../lib/commerce.js": {
      getActiveSubscription: async () => options.planCode ? { planCode: options.planCode } : null, getPlanQuestionLimit: (plan: string) => ["premium", "pro", "expert"].includes(plan) ? 20 : 3,
      getReportQuestionBonus: async () => options.bonus ?? 0,
      getMonthlyBucket: () => "2026-10", getMonthlyQuestionUsage: async () => 0,
      parseBirthInfo: () => ({ year: 1990, month: 1, day: 1, hour: 12, gender: "male", calendarType: "solar" }),
      reserveQuestionSlot: async () => { state.reserved++; return { id: 7 }; },
      releaseQuestionSlot: async (id: number) => { state.released.push(id); },
      finalizeQuestionAnswer: async () => {
        if (failure === "finalize") throw new Error("storage failure");
        state.saved++; return { id: 7, answer: "상담 답변" };
      },
    },
    "../lib/database-guard.js": { requireDatabase: async () => true },
    "../lib/date-access.js": { isPrivilegedRole: () => options.unlimited ?? false },
    "../middlewares/rateLimit.js": { ...defaultLimits, enforceSharedRateLimit: async () => {
      state.checked++;
      if (options.limitError) throw options.limitError;
    } },
    "../lib/prompt-injection-guard.js": { assessPromptInjection: () => ({ blocked }), buildPromptGuardAnswer: () => "상담 범위 안내" },
    "../lib/birth-resolution.js": { birthOptionsFromRecord: () => ({}) },
    "../lib/saju-result.js": { buildSajuResult: () => {
      if (failure === "calculate") throw new Error("calculation failure");
      return {};
    } },
  });
  return { state, async run() {
    const response = { statusCode: 200, body: null as any, headersSent: false, headers: {} as Record<string, string>,
      setHeader(name: string, value: string) { this.headers[name] = value; }, flushHeaders() { this.headersSent = true; },
      write(value: string) { state.events.push(value); }, end() {},
      status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; return this; } };
    await handler({ isAuthenticated: () => true, user: { id: "test" }, body: { question: options.question ?? "직업운", birthInfo: {} }, query: { stream: options.stream ? "1" : undefined }, get: () => undefined }, response);
    return response;
  } };
}

function limiterHarness(configured = true, fail = false, env: Record<string, string> = { NODE_ENV: "production" }) {
  const rows = new Map<string, { count: number; reset_at: Date }>();
  const warnings: any[] = [];
  let executions = 0;
  const exports = load(path.join(directory, "../middlewares/rateLimit.ts"), {
    "node:crypto": { createHash }, "node:net": { isIP },
    "drizzle-orm": { sql: (parts: TemplateStringsArray, ...values: unknown[]) => ({ parts, values }) },
    "@workspace/db": { hasDatabaseConfig: () => configured, db: { execute: async (query: any) => {
      executions++;
      if (fail) throw new Error("database unavailable");
      const [name, key, resetAt] = query.values;
      const bucketKey = `${name}:${key}`;
      const prior = rows.get(bucketKey);
      const row = prior && prior.reset_at.getTime() > Date.now() ? { ...prior, count: prior.count + 1 } : { count: 1, reset_at: resetAt };
      rows.set(bucketKey, row);
      return { rows: [row] };
    } } },
  }, { process: { env }, URL, setInterval: () => ({ unref() {} }), Math: { ...Math, random: () => 1, max: Math.max, ceil: Math.ceil, floor: Math.floor }, console: { error() {}, warn(...args: any[]) { warnings.push(args); } } });
  return { ...exports, rows, warnings, executions: () => executions };
}

test("IP keys ignore forged forwarding values and group equivalent IPv6 networks", () => {
  const limits = limiterHarness();
  const request = (ip: string, spoof = "198.51.100.1") => ({ ip, headers: { "x-forwarded-for": spoof }, body: { email: "same@example.test" } });
  assert.equal(limits.rateLimitKeyByEmailAndIp(request("203.0.113.1")), limits.rateLimitKeyByEmailAndIp(request("203.0.113.1", "198.51.100.2")));
  assert.equal(limits.rateLimitKeyByIp(request("203.0.113.1")), limits.rateLimitKeyByIp(request("::ffff:203.0.113.1")));
  assert.equal(limits.rateLimitKeyByIp(request("2001:db8:1234:5678::1")), limits.rateLimitKeyByIp(request("2001:0db8:1234:5678:ffff::2")));
  assert.notEqual(limits.rateLimitKeyByIp(request("2001:db8:1234:5678::1")), limits.rateLimitKeyByIp(request("2001:db8:1234:5679::1")));
});

test("shared budgets reject across accounts, expire, and fail closed on storage failure", async () => {
  const limits = limiterHarness();
  const options = { name: "ai-free-ip", key: "network:shared", max: 2, windowMs: 86_400_000, code: "AI_FREE_NETWORK_LIMIT", message: "network limit" };
  await limits.enforceSharedRateLimit(options);
  await limits.enforceSharedRateLimit(options);
  await assert.rejects(limits.enforceSharedRateLimit(options), (e: any) => e.statusCode === 429 && e.retryAfterSeconds > 0);
  await limits.enforceSharedRateLimit({ ...options, key: "network:other" });
  limits.rows.get("ai-free-ip:network:shared").reset_at = new Date(0);
  await limits.enforceSharedRateLimit(options);
  for (const h of [limiterHarness(true, true), limiterHarness(false)]) {
    await assert.rejects(h.enforceSharedRateLimit(options), (e: any) => e.statusCode === 503);
  }
});

test("network denial prevents provider work and refunds the user reservation", async () => {
  const h = routeHarness(null, false, { limitError: new TestRateLimitError(429, "AI_FREE_NETWORK_LIMIT", "네트워크 제한", 3600) });
  const response = await h.run();
  assert.equal(response.statusCode, 429);
  assert.equal(response.body.code, "AI_FREE_NETWORK_LIMIT");
  assert.equal(response.headers["Retry-After"], "3600");
  assert.equal(h.state.generated, 0);
  assert.deepEqual(h.state.released, [7]);
});

test("paid users and administrators bypass only the free network budget", async () => {
  for (const options of [{ planCode: "premium" }, { bonus: 2 }, { unlimited: true }]) {
    const h = routeHarness(null, false, options);
    assert.equal((await h.run()).statusCode, 200);
    assert.equal(h.state.checked, 0);
    assert.equal(h.state.generated, 1);
  }
  const free = routeHarness(null, false, { planCode: "unknown" });
  await free.run();
  assert.equal(free.state.checked, 1);
});

test("oversized questions are rejected before reserving quota", async () => {
  const h = routeHarness(null, false, { question: "질".repeat(2001) });
  assert.equal((await h.run()).statusCode, 400);
  assert.equal(h.state.reserved, 0);
  assert.equal(h.state.generated, 0);
});

test("registration mount blocks rotating emails on the ninth request and fails closed", async () => {
  for (const databaseFailure of [false, true]) {
    const limits = limiterHarness(true, databaseFailure);
    const mounts: any[][] = [];
    const app = { disable() {}, set() {}, use(...args: any[]) { mounts.push(args); } };
    const noop = () => {};
    const express = Object.assign(() => app, { json: () => noop, urlencoded: () => noop });
    load(path.join(directory, "../app.ts"), {
      express, cors: () => noop, "cookie-parser": () => noop,
      "@workspace/db": { hasDatabaseConfig: () => false }, "./middlewares/authMiddleware.js": {}, "./middlewares/csrf.js": {},
      "./middlewares/rateLimit.js": limits, "./routes/index.js": {},
    }, { process: { env: { NODE_ENV: "production" } }, URL });
    const registration = mounts.find(([route]) => route === "/api/auth/register")!.slice(1);
    for (let i = 0; i < (databaseFailure ? 1 : 9); i++) {
      const req = { method: "POST", ip: "203.0.113.2", headers: { "x-forwarded-for": `198.51.100.${i}` }, body: { email: `rotate-${i}@example.test` } };
      const res = { statusCode: 200, body: null as any, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; } };
      let accepted = true;
      for (const middleware of registration) {
        let continued = false;
        await middleware(req, res, () => { continued = true; });
        if (!continued) { accepted = false; break; }
      }
      assert.equal(res.statusCode, databaseFailure ? 503 : i < 8 ? 200 : 429);
      assert.equal(accepted, !databaseFailure && i < 8);
    }
  }
});

test("provider budget counts retries, caps output, and stops before another billable call", async () => {
  for (const streaming of [false, true]) {
    let consumed = 0;
    let providerCalls = 0;
    const assistant = load(path.join(directory, "ai-assistant.ts"), {
      "../middlewares/rateLimit.js": { ...defaultLimits, enforceSharedRateLimit: async (options: any) => {
        assert.equal(options.name, "ai-provider-daily");
        assert.equal(options.key, "global");
        assert.equal(options.max, 500);
        if (++consumed > 2) throw new TestRateLimitError(429, "AI_SERVICE_CAPACITY_REACHED", "capacity", 3600);
      } },
      "@google/generative-ai": { GoogleGenerativeAI: class {
        getGenerativeModel(options: any) {
          assert.equal(options.generationConfig.maxOutputTokens, 2048);
          const fail = async () => { providerCalls++; throw new Error("[503 Service Unavailable]"); };
          return { generateContent: fail, generateContentStream: fail };
        }
      } },
    }, { process: { env: { GEMINI_API_KEY: "synthetic-test-only" } }, setTimeout: (callback: () => void) => callback() });
    await assert.rejects(assistant.buildSajuQuestionAnswer("직업운", {}, [], streaming ? () => {} : undefined), (e: any) => e.code === "AI_SERVICE_CAPACITY_REACHED");
    assert.equal(consumed, 3);
    assert.equal(providerCalls, 2);
  }
});

test("provider budget denial refunds monthly quota and reports retry information in JSON or SSE", async () => {
  for (const stream of [false, true]) {
    const h = routeHarness(null, false, { stream, providerError: new TestRateLimitError(429, "AI_SERVICE_CAPACITY_REACHED", "capacity", 120) });
    const response = await h.run();
    assert.deepEqual(h.state.released, [7]);
    const body = stream ? JSON.parse(h.state.events[0].slice(6)) : response.body;
    assert.equal(body.code, "AI_SERVICE_CAPACITY_REACHED");
    assert.equal(body.retryAfterSeconds, 120);
    assert.equal(h.state.saved, 0);
    if (!stream) assert.equal(response.statusCode, 429);
  }
});

test("global budget emits threshold logs once without account or IP data", async () => {
  const h = limiterHarness();
  const options = { name: "ai-provider-daily", key: "global", max: 5, windowMs: 60_000, code: "AI_SERVICE_CAPACITY_REACHED", message: "capacity", warnAtThreshold: true };
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => h.enforceSharedRateLimit(options)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 5);
  assert.equal(h.warnings.length, 2);
  assert.equal(h.warnings[0][1].event, "warning");
  assert.equal(h.warnings[1][1].event, "exhausted");
  assert.equal(h.warnings[1][1].count, 6);
});

test("zero disables a budget, invalid settings retain safe defaults, Vercel never uses memory", async () => {
  for (const value of ["", "-1", "NaN", "Infinity", "1.5", "1000001", "9007199254740993"]) {
    assert.equal(limiterHarness(false, false, { LIMIT: value }).getConfiguredRateLimitMax("LIMIT", 12), 12);
  }
  assert.equal(limiterHarness(false, false, { LIMIT: "0" }).getConfiguredRateLimitMax("LIMIT", 12), 0);
  const options = { name: "test", key: "global", max: 0, windowMs: 60_000, code: "CLOSED", message: "closed" };
  await assert.rejects(limiterHarness().enforceSharedRateLimit(options), (e: any) => e.statusCode === 429);
  await assert.rejects(limiterHarness(false, false, { VERCEL: "1", NODE_ENV: "development" }).enforceSharedRateLimit({ ...options, max: 1 }), (e: any) => e.statusCode === 503);
});

for (const failure of ["calculate", "generate", "finalize"] as const) {
  test(`AI ${failure} failure releases the reserved question`, async () => {
    const harness = routeHarness(failure);
    const response = await harness.run();
    assert.equal(response.statusCode, 500);
    assert.deepEqual(harness.state.released, [7]);
  });
}

test("guard answer storage failure also releases the question", async () => {
  const harness = routeHarness("finalize", true);
  await harness.run();
  assert.deepEqual(harness.state.released, [7]);
});

test("successful answer keeps its reservation", async () => {
  const harness = routeHarness();
  assert.equal((await harness.run()).statusCode, 200);
  assert.equal(harness.state.saved, 1);
  assert.deepEqual(harness.state.released, []);
});

test("empty AI output cannot become a charged successful answer", async () => {
  const assistant = load(path.join(directory, "ai-assistant.ts"), {
    "@google/generative-ai": { GoogleGenerativeAI: class {
      getGenerativeModel() { return { generateContent: async () => ({ response: { text: () => "  " } }) }; }
    } },
  }, { process: { env: { GEMINI_API_KEY: "synthetic-test-only" } }, setTimeout });
  await assert.rejects(assistant.buildSajuQuestionAnswer("직업운", {}), /답변/);
});

test("404 model not found on primary model automatically falls back to fallback model", async () => {
  const triedModels: string[] = [];
  const assistant = load(path.join(directory, "ai-assistant.ts"), {
    "@google/generative-ai": { GoogleGenerativeAI: class {
      getGenerativeModel({ model }: { model: string }) {
        triedModels.push(model);
        return {
          generateContent: async () => {
            if (model === "gemini-3.5-flash-lite") {
              throw new Error("[404 Not Found] models/gemini-3.5-flash-lite is not found");
            }
            return { response: { text: () => "폴백 모델 정상 답변" } };
          },
        };
      }
    } },
  }, { process: { env: { GEMINI_API_KEY: "synthetic-test-only" } }, setTimeout, Set });
  const answer = await assistant.buildSajuQuestionAnswer("직업운", {});
  assert.equal(answer, "폴백 모델 정상 답변");
  assert.deepEqual(triedModels, ["gemini-3.5-flash-lite", "gemini-3.6-flash"]);
});

test("streaming callback receives incremental chunks and returns full answer", async () => {
  const chunks: string[] = [];
  const assistant = load(path.join(directory, "ai-assistant.ts"), {
    "@google/generative-ai": { GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContentStream: async () => ({
            stream: (async function* () {
              yield { text: () => "첫 문장 " };
              yield { text: () => "둘째 문장" };
            })(),
          }),
        };
      }
    } },
  }, { process: { env: { GEMINI_API_KEY: "synthetic-test-only" } }, setTimeout, Set });
  const answer = await assistant.buildSajuQuestionAnswer(
    "직업운",
    {},
    [],
    (_delta: string, fullText: string) => chunks.push(fullText),
  );
  assert.equal(answer, "첫 문장 둘째 문장");
  assert.deepEqual(chunks, ["첫 문장 ", "첫 문장 둘째 문장"]);
});

test("blocked browser storage does not crash AI session reads or writes", () => {
  const filename = path.resolve(directory, "../../../saju-web/src/lib/ai-chat-sessions.ts");
  for (const window of [
    { get localStorage() { throw new Error("SecurityError"); } },
    { localStorage: { getItem() { return null; }, setItem() { throw new Error("QuotaExceededError"); } } },
  ]) {
    const sessions = load(filename, {}, { window });
    assert.doesNotThrow(() => sessions.loadAiChatSessions("test"));
    assert.doesNotThrow(() => sessions.saveAiChatSessions("test", []));
    const session = sessions.createAiChatSessionRecord("birth-key");
    sessions.saveAiChatSessions("test", [session]);
    assert.equal(sessions.loadAiChatSessions("test")[0].id, session.id);
  }
});

function panelHarness() {
  const state: any[] = [false, "한글 질문", true, [{ id: "session", questionIds: [], birthInfoKey: "birth-key" }], "session", null];
  let cursor = 0;
  let sent = 0;
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const panel = load(path.resolve(directory, "../../../saju-web/src/components/AiChatPanel.tsx"), {
    react: {
      useState(initial: unknown) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value: any) => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
      useEffect() {}, useMemo: (fn: () => unknown) => fn(), useRef: (current: unknown) => ({ current }),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@workspace/api-client-react": {
      useAskSajuQuestion: () => ({ isPending: false, mutateAsync: async () => { sent++; throw new Error("provider unavailable"); } }),
      useGetMyAiQuestions: () => ({ data: { questions: [] }, isLoading: false }),
    },
    "@workspace/replit-auth-web": { useAuth: () => ({ user: { id: "test" } }) },
    "@tanstack/react-query": { useQueryClient: () => ({}) },
    wouter: {}, "lucide-react": {}, "framer-motion": { motion: { div: "div" } },
    "@/lib/auth-redirect": { buildAuthHref: () => "/login" },
    "@/lib/utils": { cn: () => "" },
    "@/lib/ai-chat-sessions": {
      getAiChatBirthInfoKey: () => "birth-key",
      loadHiddenAiQuestionIds: () => [],
      hideAiQuestionIds: () => [],
    },
  }, { setTimeout });
  const tree = panel.AiChatPanel({ isAuthenticated: true, externalOpen: true, birthInfo: { year: 1990 } });
  function find(node: any): any {
    if (!node) return null;
    if (Array.isArray(node)) return node.map(find).find(Boolean);
    if (node.type === "textarea") return node;
    return find(node.props?.children);
  }
  return { state, textarea: find(tree), sent: () => sent };
}

test("IME composition Enter must not send a Korean question", async () => {
  const panel = panelHarness();
  let prevented = false;
  panel.textarea.props.onKeyDown({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: true }, preventDefault() { prevented = true; } });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(panel.sent(), 0);
  assert.equal(prevented, false);
});

test("failed AI request restores the user's question for retry", async () => {
  const panel = panelHarness();
  panel.textarea.props.onKeyDown({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: false }, preventDefault() {} });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(panel.sent(), 1);
  assert.equal(panel.state[1], "한글 질문");
});
