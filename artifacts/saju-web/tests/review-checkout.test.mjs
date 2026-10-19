import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const require = createRequire(new URL("../../../package.json", import.meta.url));
const ts = require("typescript");
const products = [
  { type: "saju_basic", title: "사주 기본 리포트", amount: 4900 },
  { type: "saju_detail", title: "사주 상세 리포트", amount: 9900 },
  { type: "saju_full", title: "사주 종합 리포트", amount: 19900 },
];
const birthInfo = { year: 1990, month: 1, day: 1, hour: 12, minute: 0, gender: "male", calendarType: "solar" };
const tick = () => new Promise(resolve => setImmediate(resolve));
const nodes = node => node == null || typeof node !== "object" ? []
  : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = node => node == null || typeof node === "boolean" ? ""
  : typeof node !== "object" ? String(node)
    : Array.isArray(node) ? node.map(text).join(" ") : text(node.props?.children);

// Execute the real components with HTTP and query boundaries mocked. Keep hook
// state so selection changes, rapid duplicate clicks, and failed retries run.
function setup({ authenticated = false, admin = false, live = false, newYear = false } = {}) {
  let cursor = 0;
  const slots = [];
  const cleanups = [];
  const requests = [];
  const navigations = [];
  const queryOptions = [];
  const catalog = { data: { products, salesEnabled: live, checkoutMode: admin ? "admin" : live ? "toss_pay" : "disabled", campaign: { amount: 9900, salesEnabled: false } }, isPending: false, isError: false };
  const review = { data: { enabled: true, product: products[0] }, isPending: false, isError: false };
  const react = {
    useId: () => "checkout",
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = value; }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useEffect(effect) { const index = cursor++; if (!(index in slots)) { slots[index] = true; cleanups.push(effect()); } },
  };
  const jsx = (type, props) => ({ type, props });
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8").replaceAll("import.meta.env.BASE_URL", '"/"');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = { exports: {} };
    runInNewContext(compiled, { module, exports: module.exports, URL, Error, AbortController, window: { location: { assign: url => navigations.push(url) } },
      require(name) {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
        if (name === "@tanstack/react-query") return { useQuery: options => { queryOptions.push(options); return review; } };
        if (name === "@workspace/api-client-react") return {
          useGetCommerceProducts: () => catalog,
          useCreateCommerceOrder: () => ({ mutateAsync: () => { throw new Error("Test checkout must not create a paid order"); } }),
          useConfirmCommercePayment: () => ({ mutateAsync: () => { throw new Error("Test checkout must not grant paid access"); } }),
          customFetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })),
        };
        if (name === "@workspace/replit-auth-web") return { useAuth: () => ({ user: authenticated ? { id: "member" } : null }) };
        if (name === "wouter") return { Link: "link" };
        if (name === "lucide-react") return {};
        if (name === "@/components/ui/button") return { Button: "button" };
        if (name === "@/lib/auth-redirect") return { buildAuthHref: url => url };
        if (name === "./ReviewCheckout") return load("components/ReviewCheckout.tsx");
        if (["@/lib/toss-payments", "./NewYearOffer", "@/lib/campaign-tracking", "@/lib/report-policy"].includes(name)) return {};
        throw new Error(`Unexpected dependency: ${name}`);
      },
    });
    return cache[file] = module.exports;
  }
  return { catalog, review, requests, navigations, queryOptions,
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
    renderOptions() { cursor = 0; return load("components/ReportPurchaseOptions.tsx").ReportPurchaseOptions({ birthInfo, isAuthenticated: authenticated, isAdmin: admin, reportEdition: newYear ? "new-year-2027" : undefined }); },
    renderCheckout(props = {}) { cursor = 0; return load("components/ReviewCheckout.tsx").ReviewCheckout({ product: products[0], ...props }); },
  };
}
const reviewControl = tree => nodes(tree).find(node => node.type?.name === "ReviewCheckout");

for (const authenticated of [false, true]) {
  test(`normal basic purchase offers review checkout for ${authenticated ? "member" : "guest"} while live sales are off`, () => {
    const h = setup({ authenticated });
    const tree = h.renderOptions();
    assert.ok(reviewControl(tree), "Normal purchase dialog must expose the enabled review checkout");
    assert.doesNotMatch(text(tree), /판매 준비 중|로그인 후 상품 확인/);
    assert.equal(reviewControl(tree).props.product.amount, 4900);
  });
}

test("other report tiers and the new-year edition cannot use the basic test checkout", () => {
  const h = setup({ authenticated: true });
  for (const type of ["saju_detail", "saju_full", "saju_basic"]) {
    nodes(h.renderOptions()).find(node => node.type === "input" && node.props.value === type).props.onChange();
    const tree = h.renderOptions();
    assert.equal(Boolean(reviewControl(tree)), type === "saju_basic");
    if (type !== "saju_basic") assert.match(text(tree), /판매 준비 중/);
  }
  assert.equal(reviewControl(setup({ newYear: true }).renderOptions()), undefined);
});

test("live checkout and administrator issuance take priority over cached review configuration", () => {
  for (const options of [{ live: true }, { admin: true }]) {
    const h = setup({ authenticated: true, ...options });
    const tree = h.renderOptions();
    assert.equal(reviewControl(tree), undefined);
    assert.equal(h.queryOptions.at(-1).enabled, false);
    const button = nodes(tree).find(node => node.type === "button" && /결제하기|무료 발급/.test(text(node)));
    assert.equal(button.props.disabled, false);
  }
});

test("disabled, failed, loading, or mismatched catalogs never expose test checkout", () => {
  for (const configure of [
    h => { h.review.data.enabled = false; },
    h => { h.review.data = undefined; h.review.isPending = true; },
    h => { h.review.isError = true; },
    h => { h.catalog.isError = true; },
    h => { h.catalog.isPending = true; },
    h => { h.review.data.product = { ...products[0], amount: 100 }; },
    h => { h.review.data.product = { ...products[0], type: "saju_full" }; },
  ]) {
    const h = setup();
    configure(h);
    assert.equal(reviewControl(h.renderOptions()), undefined);
  }
});

const checkoutButton = tree => nodes(tree).find(node => node.type === "button");
test("guest test checkout sends only product type and blocks rapid duplicate requests", async () => {
  const h = setup();
  const tree = h.renderCheckout();
  assert.match(text(tree), /실제 금액은 청구되지 않으며, 유료 리포트는 발급되지 않습니다/);
  assert.match(text(tree), /4,900원 토스페이 테스트 결제/);
  const click = checkoutButton(tree).props.onClick;
  click(); click();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, "/api/commerce/review/checkout");
  assert.equal(h.requests[0].options.method, "POST");
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { productType: "saju_basic" });
  assert.equal(checkoutButton(h.renderCheckout()).props.disabled, true);
  h.requests[0].resolve({ checkoutPage: "https://pay.toss.im/test-checkout" });
  await tick();
  assert.deepEqual(h.navigations, ["https://pay.toss.im/test-checkout"]);
  click();
  assert.equal(h.requests.length, 1);
});

test("failed checkout permits retry, while confirmation in progress prevents starting checkout", async () => {
  const h = setup();
  checkoutButton(h.renderCheckout({ disabled: true })).props.onClick();
  assert.equal(h.requests.length, 0);
  checkoutButton(h.renderCheckout()).props.onClick();
  h.requests[0].reject(new Error("Provider unavailable"));
  await tick();
  const tree = h.renderCheckout();
  assert.match(text(tree), /Provider unavailable/);
  assert.equal(checkoutButton(tree).props.disabled, false);
  checkoutButton(tree).props.onClick();
  assert.equal(h.requests.length, 2);
});

test("provider redirect rejects foreign origins, insecure URLs, and embedded credentials", async () => {
  for (const checkoutPage of ["https://pay.toss.im.example.com/", "http://pay.toss.im/", "https://name:password@pay.toss.im/", "javascript:alert(1)"]) {
    const h = setup();
    checkoutButton(h.renderCheckout()).props.onClick();
    h.requests[0].resolve({ checkoutPage });
    await tick();
    assert.deepEqual(h.navigations, []);
    assert.match(text(h.renderCheckout()), /결제창 주소를 확인하지 못했습니다/);
    assert.equal(checkoutButton(h.renderCheckout()).props.disabled, false);
  }
});

test("closing the dialog or changing product cancels the request and ignores a late provider response", async () => {
  const h = setup();
  checkoutButton(h.renderCheckout()).props.onClick();
  assert.equal(h.requests[0].options.signal.aborted, false);
  h.unmount();
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.requests[0].resolve({ checkoutPage: "https://pay.toss.im/abandoned-checkout" });
  await tick();
  assert.deepEqual(h.navigations, []);
});
