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

### Recommended

- `ADMIN_EMAILS`: comma-separated admin email list
- `SUPER_ADMIN_EMAILS`: comma-separated super admin email list

### Optional mail settings

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

If SMTP is not configured, password reset links are logged on the server instead of being emailed.

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

## 5. Local development

- Copy `.env.example` to `.env.local`
- Install with `corepack pnpm install`
- Start with `corepack pnpm run dev`

The local dev script loads `.env` and `.env.local`, runs the API on `PORT` default `5001`, and the web app on `WEB_PORT` default `3000`.
