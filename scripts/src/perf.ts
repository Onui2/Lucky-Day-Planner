import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, type ChildProcess } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

const STARTUP_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 1_000;
function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
}

const PERF_ITERATIONS = toPositiveInt(process.env.PERF_ITERATIONS, 8);
const PERF_SAMPLE_WARMUP = toPositiveInt(process.env.PERF_SAMPLE_WARMUP, 1);
const PERF_MAX_P95_MS = toPositiveInt(process.env.PERF_MAX_P95_MS, 1200);
const PERF_REPORT_FILE = path.join(
  workspaceRoot,
  "artifacts",
  "saju-web",
  "perf-latest.json",
);
const REQUEST_TIMEOUT_ERROR =
  "Request exceeded the timeout. This can be a sign of slow response or startup instability.";

interface TimedRequest {
  name: string;
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

interface RequestSample {
  ms: number;
}

interface TimingSummary {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number | null;
  p95: number | null;
}

type RequestOutcome = {
  ok: true;
  ms: number;
} | {
  ok: false;
  ms?: number;
  error: string;
};

const API_SCENARIOS: TimedRequest[] = [
  { name: "health", method: "GET", url: "/api/healthz" },
  { name: "health-details", method: "GET", url: "/api/healthz/details" },
  { name: "setup-status", method: "GET", url: "/api/auth/setup-status" },
  { name: "announcements", method: "GET", url: "/api/announcements" },
  {
    name: "daily-fortune",
    method: "GET",
    url: "/api/fortune/daily",
  },
  {
    name: "saju-calculate",
    method: "POST",
    url: "/api/saju/calculate",
    body: {
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 14,
      birthMinute: 30,
      gender: "male",
      calendarType: "solar",
    },
  },
];

interface BrowserMetric {
  route: string;
  requestStart: number;
  responseStart: number;
  domInteractive: number;
  domContentLoaded: number;
  loadEventEnd: number;
  firstContentfulPaint?: number;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const contents = readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

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
    if (await fn()) {
      return;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(`${label} did not become ready within ${timeoutMs}ms.`);
}

function startDevStack(env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ["./scripts/dev.mjs"], {
    cwd: workspaceRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) =>
    process.stdout.write(`[dev] ${String(chunk)}`),
  );
  child.stderr?.on("data", (chunk) =>
    process.stderr.write(`[dev] ${String(chunk)}`),
  );

  return child;
}

async function stopProcess(child: ChildProcess): Promise<void> {
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

async function timedRequest(
  targetUrl: string,
  request: TimedRequest,
): Promise<RequestOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const method = request.method.toUpperCase();
    const headers = new Headers();
    const body =
      request.body && method !== "GET"
        ? JSON.stringify(request.body)
        : undefined;

    if (body) {
      headers.set("content-type", "application/json");
    }

    const start = performance.now();
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
    const ms = performance.now() - start;

    if (!response.ok) {
      return {
        ok: false,
        ms,
        error: `${response.status} ${response.statusText}`,
      };
    }

    await response.text();
    return { ok: true, ms };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      error: message.includes("This operation was aborted") ? REQUEST_TIMEOUT_ERROR : message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function percentile(values: number[], ratio: number) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((ratio / 100) * (sorted.length - 1))),
  );
  return sorted[index];
}

function summarizeTimings(samples: RequestSample[]): TimingSummary | null {
  const durations = samples.map((sample) => sample.ms);
  if (!durations.length) {
    return null;
  }

  const total = durations.reduce((acc, value) => acc + value, 0);
  return {
    count: durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    avg: total / durations.length,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
  };
}

async function measureApi(
  baseUrl: string,
): Promise<Record<string, { summary: TimingSummary | null; failures: number }>> {
  const report: Record<string, { summary: TimingSummary | null; failures: number }> = {};

  for (const request of API_SCENARIOS) {
    const samples: RequestSample[] = [];
    let failures = 0;

    for (let i = 0; i < PERF_ITERATIONS + PERF_SAMPLE_WARMUP; i += 1) {
      const result = await timedRequest(`${baseUrl}${request.url}`, request);

      if (result.ok && result.ms !== undefined) {
        if (i >= PERF_SAMPLE_WARMUP) {
          samples.push({ ms: result.ms });
        }
      } else {
        failures += 1;
      }
    }

    report[request.name] = {
      summary: summarizeTimings(samples),
      failures,
    };
  }

  return report;
}

async function runPageMetric(route: string, url: string): Promise<BrowserMetric | null> {
  const executablePath = process.env.WATCHDOG_CHROME_EXECUTABLE_PATH?.trim();
  if (executablePath && !existsSync(executablePath)) {
    return null;
  }

  try {
    const browser = await chromium.launch({
      executablePath: executablePath || undefined,
      headless: true,
      args: ["--no-first-run", "--no-default-browser-check"],
    });
    const context = await browser.newContext({
      viewport: { width: 1365, height: 1024 },
    });
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 20_000,
      });

      const metric = await page.evaluate(() => {
        const performanceEntries = (globalThis as {
          performance?: {
            getEntriesByType: (type: string) => Array<{ name?: string; startTime: number }>;
          };
        }).performance;
        const entries = performanceEntries?.getEntriesByType("navigation") ?? [];
        const navigation = entries[0] as {
          requestStart?: number;
          responseStart?: number;
          domInteractive?: number;
          domContentLoadedEventEnd?: number;
          loadEventEnd?: number;
        } | undefined;
        const paintEntries = performanceEntries?.getEntriesByType("paint") ?? [];
        const fcp = paintEntries.find((entry) => entry.name === "first-contentful-paint")
          ?.startTime;

        return {
          requestStart: navigation?.requestStart ?? 0,
          responseStart: navigation?.responseStart ?? 0,
          domInteractive: navigation?.domInteractive ?? 0,
          domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
          loadEventEnd: navigation?.loadEventEnd ?? 0,
          firstContentfulPaint: fcp,
        };
      });

      return {
        route,
        ...metric,
        requestStart: Number(metric.requestStart ?? 0),
        responseStart: Number(metric.responseStart ?? 0),
        domInteractive: Number(metric.domInteractive ?? 0),
        domContentLoaded: Number(metric.domContentLoaded ?? 0),
        loadEventEnd: Number(metric.loadEventEnd ?? 0),
        firstContentfulPaint: metric.firstContentfulPaint,
      };
    } finally {
      await context.close();
      await browser.close();
    }
  } catch {
    return null;
  }
}

async function runBrowserSmoke(webBase: string) {
  if (process.env.PERF_SKIP_BROWSER === "1") {
    return { skipped: true, reason: "PERF_SKIP_BROWSER=1" };
  }

  const results = await Promise.all([
    runPageMetric("home", `${webBase}/`),
    runPageMetric("saju", `${webBase}/saju`),
    runPageMetric("daily-fortune", `${webBase}/daily-fortune`),
  ]);

  const metrics = results.filter((value): value is BrowserMetric => Boolean(value));
  return {
    skipped: metrics.length === 0,
    reason: metrics.length === 0 ? "browser-not-available" : undefined,
    metrics,
  };
}

async function run() {
  const env = loadEnv();
  env.PORT = env.PORT || "5001";
  env.WEB_PORT = env.WEB_PORT || "3000";
  env.NODE_ENV = env.NODE_ENV || "development";

  const apiBase = `http://127.0.0.1:${env.PORT}`;
  const webBase = `http://127.0.0.1:${env.WEB_PORT}`;
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

  const startedAt = new Date().toISOString();

  try {
    await waitFor(
      "API readiness",
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
      "Web readiness",
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

    const api = await measureApi(apiBase);
    const browser = await runBrowserSmoke(webBase);

    const p95 = Object.values(api).reduce((max, entry) => {
      const value = entry.summary?.p95;
      if (value == null) {
        return max;
      }
      return Math.max(max, value);
    }, 0);

    const report = {
      startedAt,
      api,
      browser,
      budget: {
        maxP95Ms: PERF_MAX_P95_MS,
        exceeded: p95 > PERF_MAX_P95_MS,
      },
    };

    mkdirSync(path.dirname(PERF_REPORT_FILE), { recursive: true });
    writeFileSync(PERF_REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`Performance report saved: ${PERF_REPORT_FILE}`);
    console.log(
      JSON.stringify(
        {
          p95Exceeded: p95 > PERF_MAX_P95_MS,
          maxP95Ms: p95,
          budgetMs: PERF_MAX_P95_MS,
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
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
