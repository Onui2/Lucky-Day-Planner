import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright-core";

const DEFAULT_TIMEOUT_MS = 20_000;

export interface BrowserSmokeParams {
  webBase: string;
  loginEmail: string;
  loginPassword: string;
  accountEmail: string;
  expectedDisplayName?: string | null;
  paymentSuccessUrl?: string | null;
}

export interface BrowserSmokeResult {
  chromeExecutablePath: string;
  homeVerified: boolean;
  accountVerified: boolean;
  sajuVerified: boolean;
  paymentSuccessVerified: boolean;
  paymentSuccessSkippedReason?: string;
}

function resolveChromeExecutablePath() {
  const override = process.env.WATCHDOG_CHROME_EXECUTABLE_PATH?.trim();
  const candidates = [
    override,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "브라우저 스모크 테스트에 사용할 Chrome/Chromium 실행 파일을 찾지 못했습니다.",
  );
}

function ensureFailureDir() {
  const dir = path.join(process.cwd(), ".tmp");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function runBrowserSmoke({
  webBase,
  loginEmail,
  loginPassword,
  accountEmail,
  expectedDisplayName,
  paymentSuccessUrl,
}: BrowserSmokeParams): Promise<BrowserSmokeResult> {
  const executablePath = resolveChromeExecutablePath();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-first-run", "--no-default-browser-check"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  try {
    await page.goto(webBase, { waitUntil: "networkidle", timeout: DEFAULT_TIMEOUT_MS });
    await page.getByText("명해원").first().waitFor({ timeout: DEFAULT_TIMEOUT_MS });

    await page.goto(
      `${webBase}/login?returnTo=${encodeURIComponent("/account")}`,
      { waitUntil: "networkidle", timeout: DEFAULT_TIMEOUT_MS },
    );
    await page.locator('input[type="email"]').fill(loginEmail);
    await page.locator('input[type="password"]').first().fill(loginPassword);

    await Promise.all([
      page.waitForURL(/\/account(?:[/?#]|$)/, { timeout: DEFAULT_TIMEOUT_MS }),
      page.locator('button[type="submit"]').click(),
    ]);

    await page.getByText("회원정보 관리").waitFor({ timeout: DEFAULT_TIMEOUT_MS });
    await page.getByText(accountEmail).waitFor({ timeout: DEFAULT_TIMEOUT_MS });

    if (expectedDisplayName) {
      await page
        .locator(`input[value="${expectedDisplayName.replace(/"/g, '\\"')}"]`)
        .first()
        .waitFor({ timeout: DEFAULT_TIMEOUT_MS });
    }

    await page.goto(`${webBase}/saju`, {
      waitUntil: "networkidle",
      timeout: DEFAULT_TIMEOUT_MS,
    });
    await page.getByText("정밀 사주 PDF 리포트").first().waitFor({
      timeout: DEFAULT_TIMEOUT_MS,
    });

    let paymentSuccessVerified = false;
    let paymentSuccessSkippedReason: string | undefined;

    if (paymentSuccessUrl) {
      await page.goto(paymentSuccessUrl, {
        waitUntil: "domcontentloaded",
        timeout: DEFAULT_TIMEOUT_MS,
      });

      await page.waitForFunction(
        () => {
          const globalScope = globalThis as typeof globalThis & {
            document?: {
              body?: {
                textContent?: string | null;
              };
            };
          };
          const text = globalScope.document?.body?.textContent ?? "";
          return (
            text.includes("결제가 완료되었습니다") ||
            text.includes("PDF 다운로드") ||
            text.includes("결제는 완료되었고 PDF를 준비 중입니다") ||
            text.includes("결제 확인이 중단되었습니다") ||
            text.includes("결제는 완료되었지만 후처리가 필요합니다")
          );
        },
        undefined,
        { timeout: DEFAULT_TIMEOUT_MS },
      );

      const bodyText = (await page.locator("body").innerText()).trim();
      if (!bodyText.includes("PDF 다운로드") && !bodyText.includes("결제가 완료되었습니다")) {
        throw new Error(
          `결제 성공 페이지가 준비 상태에 도달하지 못했습니다: ${bodyText.slice(0, 300)}`,
        );
      }
      paymentSuccessVerified = true;
    } else {
      paymentSuccessSkippedReason = "payment_success_flow_not_requested";
    }

    return {
      chromeExecutablePath: executablePath,
      homeVerified: true,
      accountVerified: true,
      sajuVerified: true,
      paymentSuccessVerified,
      paymentSuccessSkippedReason,
    };
  } catch (error) {
    const failureDir = ensureFailureDir();
    const screenshotPath = path.join(failureDir, "watchdog-browser-failure.png");
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message} (browser screenshot: ${screenshotPath})`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
