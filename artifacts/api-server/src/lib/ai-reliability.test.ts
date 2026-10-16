import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

const directory = path.dirname(fileURLToPath(import.meta.url));
function load(filename: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const module = { exports: {} as any };
  const code = transformSync(readFileSync(filename, "utf8"), { loader: filename.endsWith(".tsx") ? "tsx" : "ts", jsx: "automatic", format: "cjs" }).code;
  runInNewContext(code, {
    module, exports: module.exports, Date, Promise,
    console: { error() {}, warn() {} },
    require(name: string) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return module.exports;
}

function routeHarness(failure: "calculate" | "generate" | "finalize" | null = null, blocked = false) {
  let handler: any;
  const state = { reserved: 0, released: [] as number[], saved: 0 };
  load(path.join(directory, "../routes/ai.ts"), {
    express: { Router: () => ({ get() {}, post(_path: string, callback: any) { handler = callback; } }) },
    "@workspace/db": {}, "drizzle-orm": {},
    "../lib/ai-assistant.js": { buildSajuQuestionAnswer: async () => {
      if (failure === "generate") throw new Error("provider failure");
      return "상담 답변";
    } },
    "../lib/commerce.js": {
      getActiveSubscription: async () => null, getPlanQuestionLimit: () => 3,
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
    "../lib/date-access.js": { isPrivilegedRole: () => false },
    "../lib/prompt-injection-guard.js": { assessPromptInjection: () => ({ blocked }), buildPromptGuardAnswer: () => "상담 범위 안내" },
    "../lib/birth-resolution.js": { birthOptionsFromRecord: () => ({}) },
    "../lib/saju-result.js": { buildSajuResult: () => {
      if (failure === "calculate") throw new Error("calculation failure");
      return {};
    } },
  });
  return { state, async run() {
    const response = { statusCode: 200, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; return this; } };
    await handler({ isAuthenticated: () => true, user: { id: "test" }, body: { question: "직업운", birthInfo: {} }, get: () => undefined }, response);
    return response;
  } };
}

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
            if (model === "gemini-3.6-flash") {
              throw new Error("[404 Not Found] models/gemini-3.6-flash is not found");
            }
            return { response: { text: () => "폴백 모델 정상 답변" } };
          },
        };
      }
    } },
  }, { process: { env: { GEMINI_API_KEY: "synthetic-test-only" } }, setTimeout, Set });
  const answer = await assistant.buildSajuQuestionAnswer("직업운", {});
  assert.equal(answer, "폴백 모델 정상 답변");
  assert.deepEqual(triedModels, ["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
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
    "@/lib/ai-chat-sessions": { getAiChatBirthInfoKey: () => "birth-key" },
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
