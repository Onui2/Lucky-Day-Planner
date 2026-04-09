# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This project is a Korean Saju (사주) & Fortune (운세) website called "천명 (天命)".

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, framer-motion, recharts

## Authentication

- **Replit Auth** (OIDC/PKCE) integrated via `@workspace/replit-auth-web` (lib/replit-auth-web)
- Sessions stored in PostgreSQL `sessions` table; users in `users` table (lib/db/src/schema/auth.ts)
- Auth routes: `GET /api/auth/user`, `GET /api/login`, `GET /api/callback`, `GET /api/logout`
- Nav shows "로그인하시면" button for guests; user name + logout for authenticated users
- Saju analysis: 사주팔자 4-pillars are public; detailed analysis (신강/신약, 용신, 대운, 세운, 일간, 직업, 조심) requires login

## Application Features

1. **사주팔자 (四柱八字)** - Four Pillars of Destiny calculator
   - Full 14-section analysis: 사주팔자, 신강/신약, 용신, **격국(格局)**, **십신+12운성**, **신살(7종)**, **합충형파해**, 대운, 세운, 삼재, 용신아이템, 조심할것들, 일간심층, 직업적성
   - **고급 분석 (saju-calculator.ts)**: 격국(格局, 월령 십신 기반 8격), 십신(十神, 10신+지장간), 12운성(十二運星, 장생~양), 신살(7종: 천을귀인·문창성·도화살·역마살·화개살·양인살·공망), 합충형파해(천간합/충, 지지삼합/육합/충/형/해)
   - Texts personalized by 10 heavenly stems (천간별 개별 텍스트)
   - 문의하기 button (logged-in users): opens inquiry modal with saju snapshot attached

2. **오늘의 일진 (日辰)** - Daily fortune
3. **만세력 (萬年曆)** - Korean Almanac
4. **궁합 (宮合)** - Compatibility analysis (with share button)
5. **저장함** - Saved saju list (max 20, authOnly)
6. **연간 운세** (`/year-fortune`) - Annual fortune based on year pillar vs day master; quarterly + monthly breakdown
7. **이름 풀이** (`/name-analysis`) - Name analysis using 수리사주 4격 + 오행 성명학 (phonetic elements, yin/yang)
8. **띠별 운세** (`/zodiac`) - Daily fortune for all 12 zodiac animals ranked by score; clash/harmony detection
9. **꿈 해몽** (`/dream`) - Dream interpretation with 50+ keyword database; categories: 동물/자연/사람/행동/물건/장소; fortune grades: 대길/길/중립/흉/주의
10. **월간 운세 달력** (`/fortune-calendar`) - Monthly calendar showing per-day fortune score with color coding; best/worst day summary; clickable day detail
11. **회원정보 관리** (`/account`) - Name change, password change, account deletion with confirmation

## Auth & Roles

- **Users**: Regular authenticated users
- **Admins**: Users whose emails are in `ADMIN_EMAILS` env var (comma-separated)
  - On login, if email matches ADMIN_EMAILS, `role='admin'` is set in DB
  - Admin nav item + bell badge visible only to admins
- `usersTable` has `role` column (default 'user', can be 'admin')

## Inquiry System

- **Users** submit inquiries from saju page (문의하기 button)
  - Attached saju snapshot (birth info, day stem) stored with inquiry
  - `/inquiries` page (내 문의): see own inquiries + admin replies
  - Bell badge shows unread reply count
- **Admin** accesses `/admin` (관리자 대시보드)
  - See all inquiries with user info + saju snapshot
  - Reply to inquiries, mark as read, delete
  - Bell badge shows unread inquiry count
  - Filter by status (전체/대기중/답변완료)
- `inquiriesTable`: id, userId, userLabel, sajuSnapshot (jsonb), message, status, adminReply, repliedAt, readByAdmin, readByUser, createdAt

## API Endpoints

- `GET /api/auth/user` - Get current user (includes role)
- `POST /api/saju/calculate` - Calculate saju
- `GET /api/fortune/daily` - Daily fortune
- `GET /api/manseryok/date`, `/month` - Almanac data
- `GET /api/saju/saved`, `POST`, `PATCH /:id`, `DELETE /:id` - Saved saju CRUD
- `POST /api/inquiries` - Submit inquiry
- `GET /api/inquiries/my` - User's own inquiries
- `GET /api/inquiries/my/unread-count` - Unread reply count
- `PATCH /api/inquiries/:id/read` - Mark reply as read (user)
- `GET /api/admin/inquiries` - All inquiries (admin)
- `GET /api/admin/inquiries/unread-count` - Unread inquiry count (admin)
- `PATCH /api/admin/inquiries/:id/reply` - Reply to inquiry (admin)
- `PATCH /api/admin/inquiries/:id/read` - Mark as read (admin)
- `DELETE /api/admin/inquiries/:id` - Delete inquiry (admin)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── saju-calculator.ts  # Core saju calculation logic
│   │       │   ├── manseryok.ts        # Korean almanac calculations
│   │       │   └── fortune.ts          # Daily fortune logic
│   │       └── routes/
│   │           ├── saju.ts             # POST /api/saju/calculate
│   │           ├── fortune.ts          # GET /api/fortune/daily
│   │           └── manseryok.ts        # GET /api/manseryok/date, /month
│   └── saju-web/           # React + Vite frontend (천명 website)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Endpoints

- `GET /api/healthz` - Health check
- `POST /api/saju/calculate` - Calculate saju (four pillars)
- `GET /api/fortune/daily?date=YYYY-MM-DD` - Get daily fortune/일진
- `GET /api/manseryok/date?date=YYYY-MM-DD` - Get manseryok for a specific date
- `GET /api/manseryok/month?year=YYYY&month=MM` - Get full month manseryok data

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Key Libraries (Frontend)

- **wouter** - routing
- **@tanstack/react-query** - data fetching
- **framer-motion** - animations
- **recharts** - five elements radar chart
- **date-fns** - date manipulation
- **tailwindcss** - styling
- **shadcn/ui components** - UI components
