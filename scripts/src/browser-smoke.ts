import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright-core";

const DEFAULT_TIMEOUT_MS = 20_000;
const RESULT_TIMEOUT_MS = 30_000;

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
  authReturnToVerified: boolean;
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

    await page.goto(`${webBase}/account`, {
      waitUntil: "networkidle",
      timeout: DEFAULT_TIMEOUT_MS,
    });

    const accountEntryUrl = new URL(page.url());
    if (accountEntryUrl.pathname === "/account") {
      const accountLoginLink = page.getByRole("link", { name: "로그인하기" });
      await accountLoginLink.waitFor({ timeout: DEFAULT_TIMEOUT_MS });

      const accountLoginHref = await accountLoginLink.getAttribute("href");
      if (!accountLoginHref) {
        throw new Error("회원정보 보호 화면의 로그인 링크 href를 찾지 못했습니다.");
      }

      const accountLoginUrl = new URL(accountLoginHref, webBase);
      if (
        accountLoginUrl.pathname !== "/login" ||
        accountLoginUrl.searchParams.get("returnTo") !== "/account"
      ) {
        throw new Error(`회원정보 보호 화면 로그인 링크가 복귀 경로를 유지하지 않았습니다: ${accountLoginHref}`);
      }

      await Promise.all([
        page.waitForURL(/\/login(?:[/?#]|$)/, { timeout: DEFAULT_TIMEOUT_MS }),
        accountLoginLink.click(),
      ]);
    } else if (accountEntryUrl.pathname !== "/login") {
      throw new Error(`회원정보 진입 시 예상하지 못한 경로로 이동했습니다: ${page.url()}`);
    }

    const loginUrl = new URL(page.url());
    if (loginUrl.pathname !== "/login" || loginUrl.searchParams.get("returnTo") !== "/account") {
      throw new Error(`로그인 복귀 경로가 /account 로 유지되지 않았습니다: ${page.url()}`);
    }

    const forgotPasswordLink = page.getByRole("link", { name: "비밀번호를 잊으셨나요?" });
    const forgotPasswordHref = await forgotPasswordLink.getAttribute("href");
    if (!forgotPasswordHref) {
      throw new Error("비밀번호 재설정 링크 href를 찾지 못했습니다.");
    }

    const forgotPasswordUrl = new URL(forgotPasswordHref, webBase);
    if (
      forgotPasswordUrl.pathname !== "/forgot-password" ||
      forgotPasswordUrl.searchParams.get("returnTo") !== "/account"
    ) {
      throw new Error(`비밀번호 재설정 링크가 복귀 경로를 유지하지 않았습니다: ${forgotPasswordHref}`);
    }

    await Promise.all([
      page.waitForURL(/\/forgot-password(?:[/?#]|$)/, { timeout: DEFAULT_TIMEOUT_MS }),
      forgotPasswordLink.click(),
    ]);

    const forgotPageUrl = new URL(page.url());
    if (
      forgotPageUrl.pathname !== "/forgot-password" ||
      forgotPageUrl.searchParams.get("returnTo") !== "/account"
    ) {
      throw new Error(`비밀번호 찾기 페이지가 복귀 경로를 유지하지 않았습니다: ${page.url()}`);
    }

    await Promise.all([
      page.waitForURL(/\/login(?:[/?#]|$)/, { timeout: DEFAULT_TIMEOUT_MS }),
      page.getByRole("link", { name: "로그인으로 돌아가기" }).click(),
    ]);

    const loginReturnUrl = new URL(page.url());
    if (loginReturnUrl.pathname !== "/login" || loginReturnUrl.searchParams.get("returnTo") !== "/account") {
      throw new Error(`로그인 복귀 링크가 returnTo 를 유지하지 않았습니다: ${page.url()}`);
    }

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
    await page.locator('input[placeholder="예) 1990"]').fill("1990");
    await page.locator('input[placeholder="1~12"]').fill("1");
    await page.locator('input[placeholder="1~31"]').fill("1");
    await page.getByRole("button", { name: "사주 확인하기" }).click();
    await page.getByText("사주 분석 결과").waitFor({
      timeout: RESULT_TIMEOUT_MS,
    });
    await page.getByRole("button", { name: /PDF 리포트 4,900원|리포트 무료 발급/ }).waitFor({
      timeout: RESULT_TIMEOUT_MS,
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
      authReturnToVerified: true,
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
