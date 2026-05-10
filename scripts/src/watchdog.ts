import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runBrowserSmoke } from "./browser-smoke.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

const STARTUP_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 1_000;
const WATCHDOG_BIRTH_INFO = {
  year: 1990,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: "male",
  calendarType: "solar",
} as const;
const INITIAL_PASSWORD = "watchdog1234";
const UPDATED_PASSWORD = "watchdog5678";

type CookieMap = Map<string, string>;

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const contents = readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadEnv() {
  const fileEnv = {
    ...parseEnvFile(path.join(workspaceRoot, ".env")),
    ...parseEnvFile(path.join(workspaceRoot, ".env.local")),
  };

  return {
    ...fileEnv,
    ...process.env,
  };
}

function prefixStream(
  stream: NodeJS.ReadableStream | null,
  target: NodeJS.WriteStream,
  name: string,
) {
  if (!stream) return;

  let buffer = "";
  stream.setEncoding("utf8");

  stream.on("data", (chunk) => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";

    for (const line of parts) {
      target.write(`[${name}] ${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      target.write(`[${name}] ${buffer}\n`);
    }
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  label: string,
  fn: () => Promise<boolean>,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await fn()) return;
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(`${label} did not become ready within ${timeoutMs}ms.`);
}

function createCookieHeader(cookieMap: CookieMap) {
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function storeCookies(headers: Headers, cookieMap: CookieMap) {
  const getSetCookie = (headers as Headers & {
    getSetCookie?: () => string[];
  }).getSetCookie;

  const rawCookies =
    typeof getSetCookie === "function"
      ? getSetCookie.call(headers)
      : headers.get("set-cookie")
        ? [headers.get("set-cookie") as string]
        : [];

  for (const cookie of rawCookies) {
    const [pair] = cookie.split(";", 1);
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) continue;
    cookieMap.set(name, value);
  }
}

async function request(
  url: string,
  init: RequestInit,
  cookieMap: CookieMap,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = new Headers(init.headers);
    const cookieHeader = createCookieHeader(cookieMap);
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      redirect: init.redirect ?? "manual",
      signal: controller.signal,
    });

    storeCookies(response.headers, cookieMap);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  cookieMap: CookieMap,
): Promise<T> {
  const response = await request(url, init, cookieMap);
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}) ${url}: ${text || response.statusText}`,
    );
  }

  return payload;
}

async function requestBuffer(
  url: string,
  init: RequestInit,
  cookieMap: CookieMap,
): Promise<Buffer> {
  const response = await request(url, init, cookieMap);
  const arrayBuffer = await response.arrayBuffer();

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}) ${url}: ${Buffer.from(arrayBuffer).toString("utf8")}`,
    );
  }

  return Buffer.from(arrayBuffer);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function startDevStack(env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ["./scripts/dev.mjs"], {
    cwd: workspaceRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  prefixStream(child.stdout, process.stdout, "watchdog");
  prefixStream(child.stderr, process.stderr, "watchdog");

  return child;
}

async function stopProcess(child: ChildProcess) {
  if (child.killed || child.exitCode !== null) {
    return;
  }

  child.stdout?.removeAllListeners();
  child.stderr?.removeAllListeners();
  child.stdout?.pause();
  child.stderr?.pause();
  child.kill("SIGINT");

  await Promise.race([
    new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
    }),
    delay(5_000).then(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGTERM");
      }
    }),
  ]);
}

async function run() {
  const env = loadEnv();
  env.PORT = env.PORT || "5001";
  env.WEB_PORT = env.WEB_PORT || "3000";
  env.NODE_ENV = env.NODE_ENV || "development";

  const apiBase = `http://127.0.0.1:${env.PORT}`;
  const webBase = `http://127.0.0.1:${env.WEB_PORT}`;
  const cookieMap: CookieMap = new Map();
  const child = startDevStack(env);

  const cleanup = async () => {
    await stopProcess(child);
  };

  process.on("SIGINT", () => {
    void cleanup().finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    void cleanup().finally(() => process.exit(143));
  });

  try {
    await waitFor(
      "API health",
      async () => {
        try {
          const response = await fetch(`${apiBase}/api/healthz`);
          return response.ok;
        } catch {
          return false;
        }
      },
      STARTUP_TIMEOUT_MS,
    );

    await waitFor(
      "web app",
      async () => {
        try {
          const response = await fetch(webBase);
          return response.ok;
        } catch {
          return false;
        }
      },
      STARTUP_TIMEOUT_MS,
    );

    const healthDetails = await requestJson<{
      status: string;
      databaseConfigured: boolean;
      localPasswordAuthEnabled: boolean;
      oidcEnabled: boolean;
      aiConfigured: boolean;
      paymentMode: string;
      tossClientKeyConfigured: boolean | null;
    }>(`${apiBase}/api/healthz/details`, {}, cookieMap);
    assert(healthDetails.status === "ok", "Detailed health endpoint did not return ok.");

    const setupStatus = await requestJson<{
      databaseConfigured: boolean;
      localPasswordAuthEnabled: boolean;
      oidcEnabled: boolean;
    }>(`${apiBase}/api/auth/setup-status`, {}, cookieMap);
    assert(setupStatus.databaseConfigured, "Database is not configured.");
    assert(
      setupStatus.localPasswordAuthEnabled,
      "Local password auth is not enabled.",
    );
    assert(
      healthDetails.databaseConfigured === setupStatus.databaseConfigured,
      "Detailed health endpoint is out of sync with auth setup status.",
    );

    const announcementsResponse = await requestJson<unknown[]>(
      `${apiBase}/api/announcements`,
      {},
      cookieMap,
    );
    assert(Array.isArray(announcementsResponse), "Announcements response is invalid.");

    const dailyFortune = await requestJson<{ date?: string; overallScore?: number }>(
      `${apiBase}/api/fortune/daily`,
      {},
      cookieMap,
    );
    assert(typeof dailyFortune.date === "string", "Daily fortune did not return a date.");
    assert(
      typeof dailyFortune.overallScore === "number",
      "Daily fortune did not return an overall score.",
    );

    const email = `watchdog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    const registered = await requestJson<{
      user: {
        id: string;
        email?: string | null;
        firstName?: string | null;
      };
    }>(
      `${apiBase}/api/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: INITIAL_PASSWORD,
          name: "Watchdog",
        }),
      },
      cookieMap,
    );
    assert(registered.user.id, "Registration did not return a user id.");
    assert(
      registered.user.email === email,
      "Registration did not return the expected email.",
    );

    const authUser = await requestJson<{
      user: {
        id: string;
        email?: string | null;
        firstName?: string | null;
      } | null;
    }>(`${apiBase}/api/auth/user`, {}, cookieMap);
    assert(authUser.user?.id === registered.user.id, "Authenticated session was not created.");

    const account = await requestJson<{
      id: string;
      email?: string | null;
      firstName?: string | null;
      hasPassword?: boolean;
    }>(`${apiBase}/api/account`, {}, cookieMap);
    assert(account.id === registered.user.id, "Account endpoint returned the wrong user.");
    assert(account.email === email, "Account endpoint returned the wrong email.");
    assert(account.hasPassword === true, "Account endpoint did not mark password auth as enabled.");

    const updatedName = `Watchdog ${Date.now().toString().slice(-4)}`;
    const renamed = await requestJson<{
      user: {
        id: string;
        firstName?: string | null;
      };
    }>(
      `${apiBase}/api/account/name`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: updatedName }),
      },
      cookieMap,
    );
    assert(
      renamed.user.firstName === updatedName,
      "Account name update did not persist the new name.",
    );

    const accountAfterRename = await requestJson<{
      firstName?: string | null;
    }>(`${apiBase}/api/account`, {}, cookieMap);
    assert(
      accountAfterRename.firstName === updatedName,
      "Account endpoint did not reflect the updated name.",
    );

    const passwordChanged = await requestJson<{ ok: boolean }>(
      `${apiBase}/api/account/password`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: INITIAL_PASSWORD,
          newPassword: UPDATED_PASSWORD,
        }),
      },
      cookieMap,
    );
    assert(passwordChanged.ok, "Password change endpoint did not return ok.");

    const reloginCookies: CookieMap = new Map();
    const reloggedIn = await requestJson<{
      user: {
        id: string;
        email?: string | null;
      };
    }>(
      `${apiBase}/api/auth/login-local`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: UPDATED_PASSWORD,
        }),
      },
      reloginCookies,
    );
    assert(
      reloggedIn.user.id === registered.user.id,
      "Re-login with the updated password failed.",
    );

    const reloggedInAuthUser = await requestJson<{
      user: {
        id: string;
      } | null;
    }>(`${apiBase}/api/auth/user`, {}, reloginCookies);
    assert(
      reloggedInAuthUser.user?.id === registered.user.id,
      "Re-login session did not persist.",
    );

    const aiHistory = await requestJson<{
      questions: Array<{ id: number }>;
      used: number;
      limit: number | null;
      remaining: number | null;
      unlimited?: boolean;
    }>(`${apiBase}/api/ai/questions`, {}, cookieMap);
    assert(Array.isArray(aiHistory.questions), "AI question history response is invalid.");

    let aiQuestionStatus = "skipped_missing_gemini";
    if (env.GEMINI_API_KEY?.trim()) {
      const aiAnswer = await requestJson<{
        question: {
          id: number;
          question: string;
          answer: string;
        };
        used: number;
        remaining: number | null;
      }>(
        `${apiBase}/api/ai/questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "올해 직업운에서 가장 주의할 점을 알려주세요.",
            birthInfo: WATCHDOG_BIRTH_INFO,
          }),
        },
        cookieMap,
      );
      assert(
        typeof aiAnswer.question.answer === "string" &&
          aiAnswer.question.answer.trim().length > 0,
        "AI question endpoint returned an empty answer.",
      );
      aiQuestionStatus = "verified";
    }

    const created = await requestJson<{
      checkoutMode: string;
      order: { orderId: string; amount: number };
      report: { id: number; status: string };
    }>(
      `${apiBase}/api/commerce/orders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "saju_pdf",
          birthInfo: WATCHDOG_BIRTH_INFO,
          label: "Watchdog PDF",
        }),
      },
      cookieMap,
    );

    const browserSmokeEnabled = env.WATCHDOG_SKIP_BROWSER_SMOKE !== "1";
    const browserPaymentSuccessUrl =
      created.checkoutMode === "dev"
        ? `${webBase}/payments/success?orderId=${encodeURIComponent(created.order.orderId)}&paymentKey=${encodeURIComponent(`dev_${created.order.orderId}`)}&amount=${created.order.amount}`
        : null;

    const browserSmokeResult = browserSmokeEnabled
      ? await runBrowserSmoke({
          webBase,
          loginEmail: email,
          loginPassword: UPDATED_PASSWORD,
          accountEmail: email,
          expectedDisplayName: updatedName,
          paymentSuccessUrl: browserPaymentSuccessUrl,
        })
      : null;

    if (created.checkoutMode === "provider") {
      assert(
        healthDetails.paymentMode === "provider",
        "Detailed health endpoint reported the wrong payment mode.",
      );
      assert(
        healthDetails.tossClientKeyConfigured === true,
        "Provider checkout mode requires VITE_TOSS_CLIENT_KEY for the browser checkout flow.",
      );
      const providerPaymentKey = env.WATCHDOG_PROVIDER_PAYMENT_KEY?.trim();
      assert(
        providerPaymentKey,
        "Provider checkout mode requires WATCHDOG_PROVIDER_PAYMENT_KEY for watchdog verification.",
      );
    }

    const confirmed = await requestJson<{
      order: { status: string };
      report: { id: number; status: string; fileName?: string | null };
    }>(
      `${apiBase}/api/commerce/payments/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: created.order.orderId,
          paymentKey: env.WATCHDOG_PROVIDER_PAYMENT_KEY?.trim(),
        }),
      },
      cookieMap,
    );

    assert(confirmed.order.status === "paid", "Order was not marked as paid.");
    assert(confirmed.report.status === "ready", "Report was not generated.");

    const reportBuffer = await requestBuffer(
      `${apiBase}/api/reports/${confirmed.report.id}/download`,
      {},
      cookieMap,
    );
    assert(
      reportBuffer.subarray(0, 4).toString("utf8") === "%PDF",
      "Downloaded report is not a PDF.",
    );

    const regenerated = await requestJson<{
      report: {
        id: number;
        status: string;
      };
    }>(
      `${apiBase}/api/reports/${confirmed.report.id}/regenerate`,
      {
        method: "POST",
      },
      cookieMap,
    );
    assert(
      regenerated.report.status === "ready",
      "Report regenerate endpoint did not return a ready report.",
    );

    const regeneratedBuffer = await requestBuffer(
      `${apiBase}/api/reports/${confirmed.report.id}/download`,
      {},
      cookieMap,
    );
    assert(
      regeneratedBuffer.subarray(0, 4).toString("utf8") === "%PDF",
      "Regenerated report is not a PDF.",
    );

    const reports = await requestJson<{ reports: Array<{ status: string }> }>(
      `${apiBase}/api/reports`,
      {},
      cookieMap,
    );
    assert(
      reports.reports.some((report) => report.status === "ready"),
      "Reports list does not include a ready report.",
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          apiBase,
          webBase,
          checkoutMode: created.checkoutMode,
          paymentMode: healthDetails.paymentMode,
          browserSmoke: browserSmokeResult
            ? {
                enabled: true,
                homeVerified: browserSmokeResult.homeVerified,
                authReturnToVerified: browserSmokeResult.authReturnToVerified,
                accountVerified: browserSmokeResult.accountVerified,
                sajuVerified: browserSmokeResult.sajuVerified,
                paymentSuccessVerified: browserSmokeResult.paymentSuccessVerified,
                paymentSuccessSkippedReason:
                  browserSmokeResult.paymentSuccessSkippedReason ?? null,
              }
            : {
                enabled: false,
                skippedReason: "WATCHDOG_SKIP_BROWSER_SMOKE=1",
              },
          reloginVerified: true,
          accountNameUpdated: true,
          aiQuestionStatus: healthDetails.aiConfigured ? aiQuestionStatus : "skipped_missing_gemini",
          reportId: confirmed.report.id,
          reportBytes: reportBuffer.length,
          regeneratedReportBytes: regeneratedBuffer.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
});
