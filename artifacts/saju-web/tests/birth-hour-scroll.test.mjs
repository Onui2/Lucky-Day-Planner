import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

// Vite maps port 0 to its default. Bind directly for a free loopback port.
async function listenForTest(server) {
  await new Promise((resolve, reject) => {
    server.httpServer.once("error", reject);
    server.httpServer.listen(0, "127.0.0.1", resolve);
  });
}

const require = createRequire(new URL("../../../scripts/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const executablePath = [
  process.env.WATCHDOG_CHROME_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate));

const viewportSelector = "[data-radix-select-viewport]";
const cases = [
  { width: 390, height: 700, touch: true },
  { width: 320, height: 568, touch: true },
  { width: 360, height: 640, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 1280, height: 800, touch: false },
];

// Dispatch real browser input. scrollTop assignment / scrollIntoView would hide
// a broken touch or wheel scroller and must not be used to reach an option.
async function swipe(page, cdp, direction) {
  const box = await page.locator(viewportSelector).boundingBox();
  assert.ok(box && box.height > 80, "hour viewport must have usable touch space");
  const x = box.x + box.width / 2;
  const margin = Math.min(16, box.height / 10);
  const start = direction === "end" ? box.y + box.height - margin : box.y + margin;
  const end = direction === "end" ? box.y + margin : box.y + box.height - margin;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: start }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x, y: start + (end - start) * step / 10 }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(250);
}

async function scrollToEdge(page, cdp, direction, touch) {
  const viewport = page.locator(viewportSelector);
  for (let attempt = 0; attempt < 32; attempt++) {
    const atEdge = await viewport.evaluate((element, edge) => edge === "start"
      ? element.scrollTop <= 1
      : element.scrollHeight - element.clientHeight - element.scrollTop <= 1, direction);
    if (atEdge) return;
    if (touch) await swipe(page, cdp, direction);
    else {
      await viewport.hover();
      await page.mouse.wheel(0, direction === "end" ? 500 : -500);
      await page.waitForTimeout(100);
    }
  }
  assert.fail(`${touch ? "touch" : "wheel"} cannot reach ${direction} of hours`);
}

async function assertReachable(page, label) {
  const option = page.getByRole("option", { name: label, exact: true });
  const box = await option.boundingBox();
  const viewport = await page.locator(viewportSelector).boundingBox();
  assert.ok(box && viewport && box.y >= viewport.y - 1 && box.y + box.height <= viewport.y + viewport.height + 1,
    `${label} must be visible before selection (without auto-scroll)`);
  return option;
}

test("birth-hour dropdown stays inside the screen and supports touch/wheel selection", {
  skip: !executablePath && "requires local Chrome; set WATCHDOG_CHROME_EXECUTABLE_PATH",
  timeout: 180_000,
}, async (t) => {
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    cacheDir: fileURLToPath(new URL(`../node_modules/.vite-birth-hour-${process.pid}`, import.meta.url)),
    envFile: false, mode: "test", logLevel: "silent",
    server: { hmr: false, watch: null },
  });
  let browser;
  try {
    await listenForTest(server);
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({ executablePath, headless: true });
    for (const { width, height, touch } of cases) {
      await t.test(`${width}x${height} ${touch ? "touch" : "wheel"}`, async () => {
        const context = await browser.newContext({
          viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
        });
        try {
          const writes = [], errors = [];
          // All API requests are synthetic; no real account, profile, calculation,
          // payment or external request is allowed, even if a UI regression occurs.
          await context.route("**/*", async (route) => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            if (!url.pathname.startsWith("/api/")) return route.continue();
            if (route.request().method() !== "GET") writes.push(url.pathname);
            const fixtures = {
              "/api/auth/user": { user: { id: "scroll-fixture", firstName: "스크롤검증", role: "user" } },
              "/api/profile": { profile: null }, "/api/announcements": [],
              "/api/member-insights": { bookmarks: [], recentActivities: [] },
            };
            return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixtures[url.pathname] ?? {}) });
          });
          const page = await context.newPage();
          page.on("pageerror", (error) => errors.push(error.message));
          const cdp = await context.newCDPSession(page);
          await page.goto(`${origin}/sinsal-guide`);
          await page.goto(`${origin}/monthly-fortune`);
          const openProfile = page.getByRole("button", { name: "내 사주 등록하기", exact: true });
          await openProfile.click();
          // Radix temporarily hides the parent dialog from the accessibility tree
          // while the nested listbox is open; its scroll position still matters.
          const dialog = page.getByRole("dialog", { includeHidden: true });
          const trigger = dialog.getByRole("combobox");
          const activate = (locator) => touch ? locator.tap() : locator.click();
          const openHours = async () => {
            await activate(trigger);
            await page.getByRole("listbox").waitFor();
            await page.waitForTimeout(250);
            const box = await page.getByRole("listbox").boundingBox();
            assert.ok(box && box.y >= 0 && box.y + box.height <= height,
              `dropdown must fit viewport: ${JSON.stringify(box)}`);
            assert.equal(await page.getByRole("option").count(), 25, "unknown plus all 24 hours");
          };
          await openHours();
          const initial = await page.locator(viewportSelector).evaluate((element) => ({
            scroll: element.scrollHeight, client: element.clientHeight,
          }));
          assert.ok(initial.scroll > initial.client, "long hour list must create a scrollable viewport");
          const dialogScroll = await dialog.evaluate((element) => element.scrollTop);
          const documentScroll = await page.evaluate(() => window.scrollY);
          await scrollToEdge(page, cdp, "end", touch);
          await activate(await assertReachable(page, "23시 (자시)"));
          assert.equal(await trigger.textContent(), "23시 (자시)");
          assert.equal(await dialog.getByPlaceholder("분", { exact: true }).isEnabled(), true);
          assert.equal(await dialog.evaluate((element) => element.scrollTop), dialogScroll, "swipe must not scroll the dialog behind the list");
          assert.equal(await page.evaluate(() => window.scrollY), documentScroll);
          await openHours();
          await scrollToEdge(page, cdp, "start", touch);
          await activate(await assertReachable(page, "0시 (자시)"));
          assert.equal(await trigger.textContent(), "0시 (자시)");
          await openHours();
          await scrollToEdge(page, cdp, "end", touch);
          await activate(await assertReachable(page, "23시 (자시)"));
          await openHours();
          await scrollToEdge(page, cdp, "start", touch);
          await activate(await assertReachable(page, "모름"));
          assert.equal(await trigger.textContent(), "모름");
          assert.equal(await dialog.getByPlaceholder("분", { exact: true }).isDisabled(), true);
          await openHours();
          // Wheel input must work in a touch-capable browser too.
          await scrollToEdge(page, cdp, "end", false);
          await assertReachable(page, "23시 (자시)");
          if (process.env.BIRTH_HOUR_SCROLL_ARTIFACT_DIR) {
            mkdirSync(process.env.BIRTH_HOUR_SCROLL_ARTIFACT_DIR, { recursive: true });
            await page.screenshot({ path: path.join(process.env.BIRTH_HOUR_SCROLL_ARTIFACT_DIR, `hours-${width}x${height}.png`) });
          }
          await page.keyboard.press("Escape");
          assert.equal(await page.getByRole("listbox").count(), 0);
          assert.equal(await dialog.count(), 1, "Escape closes only the nested select");
          await activate(dialog.getByRole("button", { name: "Close", exact: true }));
          await dialog.waitFor({ state: "hidden" });
          await openProfile.click();
          await openHours();
          await page.goBack();
          await page.waitForURL(`${origin}/sinsal-guide`);
          assert.equal(await page.getByRole("listbox").count(), 0);
          assert.equal(await page.getByRole("dialog").count(), 0);
          assert.notEqual(await page.locator("body").evaluate((element) => getComputedStyle(element).pointerEvents), "none");
          await page.goForward();
          await page.waitForURL(`${origin}/monthly-fortune`);
          await openProfile.click();
          await openHours();
          await scrollToEdge(page, cdp, "end", touch);
          await activate(await assertReachable(page, "23시 (자시)"));
          assert.equal(await trigger.textContent(), "23시 (자시)");
          assert.deepEqual(writes, [], "selecting a birth hour must never submit profile data");
          assert.deepEqual(errors, []);
        } finally { await context.close(); }
      });
    }
  } finally { await browser?.close(); await server.close(); }
});
