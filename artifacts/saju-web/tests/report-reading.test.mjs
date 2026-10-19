import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const require = createRequire(new URL("../../../package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../src/pages/report-viewer.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Run the real reader with isolated HTTP/auth boundaries and a small hook host.
// Retaining hook state across renders catches stale-content and response races.
function setup(initialUser = "alice") {
  let user = initialUser;
  let cursor = 0;
  const slots = [];
  const effects = [];
  const requests = [];
  let tree;
  let dirty = false;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => {
        const next = typeof value === "function" ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useEffect(callback, deps) {
      const index = cursor++;
      const old = slots[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        effects.push(() => {
          old?.cleanup?.();
          slots[index] = { deps, cleanup: callback() };
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  runInNewContext(compiled, { module, exports: module.exports, console, Error, Uint8Array,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name === "wouter") return { Link: "link", useRoute: () => [true, { id: "21" }] };
      if (name === "@workspace/replit-auth-web") return { useAuth: () => ({
        user: user ? { id: user } : null, isAuthenticated: Boolean(user), isLoading: false,
      }) };
      if (name === "@workspace/api-client-react") return {
        useGetMyReports: () => ({ data: { reports: [] } }),
        customFetch: (url) => new Promise((resolve, reject) => requests.push({ url, user, resolve, reject })),
      };
      if (name === "lucide-react") return {};
      if (name === "@/components/ui/button") return { Button: "button" };
      if (name === "@/components/SajuPreview") return { SajuCoreChart: "chart" };
      if (name === "@/lib/auth-redirect") return { buildAuthHref: (url) => url };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render() { cursor = 0; dirty = false; tree = module.exports.default(); return tree; }
  async function settle() {
    for (let pass = 0; pass < 8; pass++) {
      while (effects.length) effects.shift()();
      await tick();
      if (!dirty) return;
      render();
    }
    throw new Error("Reader did not settle");
  }
  function text(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node !== "object") return String(node);
    return Array.isArray(node) ? node.map(text).join(" ") : text(node.props?.children);
  }
  render();
  return { requests, settle, text: () => text(tree), setUser(next) { user = next; render(); } };
}
const reading = (body) => ({ id: 21, title: "Purchased reading", preview: {}, sections: [{ title: "Section", body }] });

test("anonymous reader requests no purchased content and offers login", async () => {
  const h = setup(null);
  await h.settle();
  assert.equal(h.requests.length, 0);
  assert.match(h.text(), /구매한 계정으로 로그인/);
});

test("purchased reading loads native web sections without downloading a PDF", async () => {
  const h = setup();
  await h.settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, "/api/reports/21/content");
  h.requests[0].resolve(reading("ALICE_PRIVATE_READING"));
  await h.settle();
  assert.match(h.text(), /ALICE_PRIVATE_READING/);
  assert.match(h.text(), /웹에서 읽기/);
  assert.match(h.text(), /PDF 보기/);
});

test("account change hides loaded reading immediately before effects run", async () => {
  const h = setup();
  await h.settle();
  h.requests[0].resolve(reading("ALICE_PRIVATE_READING"));
  await h.settle();
  h.setUser("bob");
  assert.doesNotMatch(h.text(), /ALICE_PRIVATE_READING/);
  await h.settle();
  h.requests[1].reject({ status: 403 });
  await h.settle();
  assert.match(h.text(), /볼 권한이 없습니다/);
  assert.doesNotMatch(h.text(), /ALICE_PRIVATE_READING/);
});

test("late reading response from prior account cannot replace current account", async () => {
  const h = setup();
  await h.settle();
  h.setUser("bob");
  await h.settle();
  h.requests[1].resolve(reading("BOB_READING"));
  await h.settle();
  h.requests[0].resolve(reading("ALICE_PRIVATE_READING"));
  await h.settle();
  assert.match(h.text(), /BOB_READING/);
  assert.doesNotMatch(h.text(), /ALICE_PRIVATE_READING/);
  h.setUser(null);
  assert.doesNotMatch(h.text(), /BOB_READING/);
  await h.settle();
  assert.equal(h.requests.length, 2);
});
