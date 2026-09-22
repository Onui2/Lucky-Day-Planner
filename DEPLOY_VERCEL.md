# Vercel Deployment

## 1. Project setup

- Import this repository into Vercel with the project root set to the repository root.
- The repo already includes `vercel.json`, so Vercel will build the Vite app from `artifacts/saju-web` and serve `/api/*` through `api/index.ts`.
- Node.js should be `24.x`. This is also declared in `package.json`.

## 2. Environment variables

Set these in Vercel Project Settings -> Environment Variables.

### Required

- `DATABASE_URL`: Postgres connection string
- `APP_URL`: Your canonical site URL, for example `https://your-domain.com`
- `CORS_ORIGINS`: Optional comma-separated list of extra trusted browser origins. `APP_URL` and Vercel URLs are allowed automatically.

The app also accepts Vercel/Supabase-style Postgres variables such as:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

Remote database connections require TLS with certificate and hostname verification.
For Supabase or a private CA, set `DATABASE_SSL_CA_CERT` to the trusted root PEM
from the database provider (literal `\n` line breaks are supported). `PGSSLMODE`
may be `verify-full`; `require` and `prefer` also use full verification. Insecure
remote modes such as `no-verify` or `disable` are rejected. The runtime and schema
CLI use the same rules. Loopback databases can use plaintext for local development.

### Recommended

- `ADMIN_EMAILS`: comma-separated admin email list
- `SUPER_ADMIN_EMAILS`: comma-separated super admin email list

These lists assign roles only to **new provider identities with verified email**.
Local registration always creates a normal user. Existing users retain their
stored role, including demotions; manage those roles through authorized admin tools.

### AI 상담 (Gemini)

- `GEMINI_API_KEY`: Google AI Studio에서 발급. 없으면 AI 상담 기능이 비활성화됩니다.

### 결제 (Toss Payments)

- `TOSS_SECRET_KEY`: 토스 서버 시크릿 키 (없으면 유료 결제 비활성화)
- `VITE_TOSS_CLIENT_KEY`: 토스 클라이언트 키 (프론트엔드 빌드 시 포함됨)

운영에서는 키가 없으면 유료 주문·결제 승인이 HTTP 503으로 차단됩니다.
로컬 테스트에서만 `PAYMENT_SIMULATION_ENABLED=true`를 명시하면 시뮬레이션이 가능합니다.
`NODE_ENV=production` 또는 `VERCEL_ENV=production`에서는 이 옵션이 적용되지 않습니다.
무료 사주 PDF와 관리자 무료 발급은 유지됩니다. 자세한 정책은
[결제 및 리포트 접근 제어](docs/PAYMENT_SECURITY.md)를 참고하세요.

### Optional mail settings

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

In local development, password reset links are logged when SMTP is not configured. In production, configure SMTP so reset tokens are emailed instead of written to logs.

### Optional OIDC settings

- `OIDC_CLIENT_ID`
- `OIDC_ISSUER_URL`

Legacy Replit-compatible fallbacks still work:

- `REPL_ID`
- `ISSUER_URL`

## 3. Vercel system variables

Turn on automatic exposure of Vercel system environment variables in Project Settings.

The app can use:

- `VERCEL_URL`
- `VERCEL_BRANCH_URL`
- `VERCEL_PROJECT_PRODUCTION_URL`
- `VERCEL_ENV`

These are fallback values for absolute links when `APP_URL` is not set.

## 4. Database schema

Before first production use, push the schema to your database:

```bash
corepack pnpm --filter @workspace/db run push
```

Run that command with `DATABASE_URL` pointed at the target database.

`drizzle-kit` and the runtime API now use the same connection lookup rules, so `POSTGRES_URL` and the equivalent Postgres variables work there as well.

At runtime the API also ensures the core auth tables (`users`, `sessions`,
`auth_identities`) and app tables when a valid database connection is available,
but an explicit schema push is still the safer first deploy step. Read
[the security rollout notes](docs/SECURITY_ROLLOUT.md) before upgrading an existing
deployment: the auth update invalidates existing cookie sessions.

## 5. Local development

- Copy `.env.example` to `.env.local`
- Install with `corepack pnpm install`
- Start with `corepack pnpm run dev`

The local dev script loads `.env` and `.env.local`, runs the API on `PORT` default `5001`, and the web app on `WEB_PORT` default `3000`.

Vite development and preview servers bind to loopback and reject unknown Host
headers. For intentional remote development, pass an explicit `--host` and set
`__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` to the exact hostname you control. Do not
use unrestricted host allowlists.
