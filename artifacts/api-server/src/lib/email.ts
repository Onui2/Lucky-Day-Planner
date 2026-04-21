import nodemailer from "nodemailer";

function normalizeAppUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw.replace(/\/$/, "");
  return `https://${raw}`.replace(/\/$/, "");
}

function getAppUrl(): string {
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
      : process.env.VERCEL_BRANCH_URL ??
        process.env.VERCEL_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL;

  return (
    normalizeAppUrl(process.env.APP_URL) ??
    normalizeAppUrl(vercelUrl) ??
    normalizeAppUrl(process.env.REPLIT_DEV_DOMAIN) ??
    "http://localhost"
  );
}

function isEmailConfigured(): boolean {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
): Promise<void> {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  if (!isEmailConfigured()) {
    console.log("[비밀번호 초기화] 이메일 설정 없음. 초기화 링크:");
    console.log(resetUrl);
    return;
  }

  const transporter = createTransport();
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER!;

  await transporter.sendMail({
    from: `"명해원 (命海苑)" <${from}>`,
    to: toEmail,
    subject: "명해원 비밀번호 초기화",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0d0f1a; color: #e5e7eb; padding: 32px; border-radius: 16px; border: 1px solid rgba(212,175,55,0.3);">
        <h2 style="color: #D4AF37; font-size: 22px; margin-bottom: 8px;">명해원 (命海苑)</h2>
        <p style="color: #9ca3af; margin-bottom: 24px; font-size: 14px;">비밀번호 초기화 요청</p>

        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          안녕하세요.<br>
          비밀번호 초기화 요청이 접수되었습니다.<br>
          아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
        </p>

        <a href="${resetUrl}"
           style="display: inline-block; background: #D4AF37; color: #0d0f1a; text-decoration: none;
                  padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 15px; margin-bottom: 24px;">
          비밀번호 새로 설정하기
        </a>

        <p style="font-size: 12px; color: #6b7280; margin-top: 24px; line-height: 1.6;">
          이 링크는 <strong>1시간</strong> 후 만료됩니다.<br>
          본인이 요청하지 않은 경우 이 이메일을 무시하세요.<br>
          링크가 작동하지 않으면 아래 주소를 브라우저에 복사해주세요:<br>
          <span style="color: #9ca3af; word-break: break-all;">${resetUrl}</span>
        </p>
      </div>
    `,
    text: `명해원 비밀번호 초기화\n\n비밀번호 초기화 링크:\n${resetUrl}\n\n이 링크는 1시간 후 만료됩니다.`,
  });
}
