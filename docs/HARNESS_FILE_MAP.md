# Lucky Day Planner Harness File Map

## Profile Harness

- Pages: `login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `account.tsx`, `saju.tsx`
- Components: `ProfileModal.tsx`, `RequireAuth.tsx`
- Lib/Hooks: `auth-client.ts`, `auth-redirect.ts`, `profile-storage.ts`, `resolved-profile.ts`, `birth-time.ts`

## Saju Engine Harness

- Pages: `gungap.tsx`, `daeun.tsx`, `name-analysis.tsx`, `day-pillar-analysis.tsx`, `manseryok.tsx`
- Data: `dayPillarAnalysis.ts`, `sajuTables.ts`
- Lib: `sajuLucky.ts`, `saju-relation.ts`, `age.ts`

## Fortune Feed Harness

- Pages: `daily-fortune.tsx`, `monthly-fortune.tsx`, `year-fortune.tsx`, `love-fortune.tsx`, `dream.tsx`, `zodiac.tsx`
- Admin content pages: `sinsal-guide.tsx`, `glossary.tsx`, `saju-tables.tsx`
- Shared helper: `seoul-date.ts`

## Action Harness

- Pages: `home.tsx`, `saved.tsx`, `lucky-calendar.tsx`, `inquiries.tsx`
- Components: `HomeInquiryModal.tsx`
- Hooks/Lib: `use-lucky-day-bookmarks.ts`, `member-insights.ts`

## Ops Harness

- Pages: `admin.tsx`
- Components: `RequireAdmin.tsx`
- Cross-cutting infra: `App.tsx`, `layout.tsx`, `UserContext.tsx`

## Notes

- Harness docs are internal only. No web route or nav entry exposes them.
- Shared UI primitives under `src/components/ui` stay cross-harness.
