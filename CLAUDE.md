# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server (or ./dev.sh, which selects Node 22 via fnm)
npm run build         # Production build — the only real automated check
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # prisma migrate dev — create/apply a migration locally
npm run db:push       # Push schema to DB without a migration (prototyping only)

DATABASE_URL="file:./seed.db" npx tsx scripts/seed-demo.ts   # Build a demo DB
```

No test suite and no lint script are configured. Production applies migrations with `prisma migrate deploy` in `docker-entrypoint.sh`, so every schema change needs a migration in `prisma/migrations/`.

## Architecture

**TSK Rewards** is an attendance tracking and Bitcoin (satoshi) rewards platform for a youth surf programme in South Africa. Built with Next.js 16 App Router, React 19, TypeScript, Prisma 7 + **SQLite** (via `@prisma/adapter-libsql`), NextAuth v5 (beta) credentials auth, and Tailwind 4.

### Request Flow

There are **no Server Actions**. All data reads/mutations from client components go through **API route handlers** in `src/app/api/` (roughly one folder per resource, e.g. `participants/[id]/...`, `reports/[id]/...`, `events/[id]/...`). Route handlers call Prisma directly. Server Component pages also query Prisma directly.

- `src/app/api/admin/check-*` and `apply-pending-changes` are cron endpoints, authenticated by `Authorization: Bearer $CRON_SECRET` and triggered by GitHub Actions workflows in `.github/workflows/` (hourly email checks, daily absence check at 02:00 SAST, pending changes at 02:05 SAST).
- `src/app/api/public/*` serves the unauthenticated `/analytics` viewer.

### Auth, Roles & Access

There is no User table — users are defined in `src/lib/auth.ts` from env vars: one admin (`ADMIN_*`) and one marshal per group (username = group key, password = `MARSHAL_PASSCODE_<GROUP>`). The session carries `id`, `role`, and `group`.

Two roles: `ADMINISTRATOR` and `MARSHAL`.

- Marshals get an attendance-only UI and land on `/attendance`; the mobile marshal PWA lives at `/marshal`. Every marshal account is tied to a group.
- Administrators get the full dashboard (sidebar, participants, reports, payouts, data sheets, settings).
- Enforcement is layered:
  - `src/middleware.ts` — path-based redirects for pages (API routes are excluded from its matcher). `/marshal`, `/analytics`, `/chart-snapshot` bypass it.
  - `requireRole()` (`src/lib/role-guard.ts`) — in Server Component pages; redirects.
  - `requireAuth(roles?)` (`src/lib/api-auth.ts`) — in API routes; returns `null` when unauthorized, and the handler returns 401/403. **Every API route must check this itself.**

### Key Library Modules (`src/lib/`)

| File | Purpose |
|---|---|
| `auth.ts` | NextAuth config and env-defined user list |
| `db.ts` | Prisma client singleton (libsql adapter) |
| `rewards.ts` | Reward tiers (see below), `fmtPct`, `weightedAvgPercentage` |
| `get-reward-settings.ts` | Active min/max sats from `RewardSettings` |
| `upsert-report.ts` | Builds/refreshes a `MonthlyReport` + entries for a month (optionally per group) |
| `roster-history.ts` | `groupAsOf` / `isParticipantActiveOn` — reconstructs historical group membership from `TskLevelHistory` |
| `tsk-groups.ts` | Groups: TURTLES, SEALS, DOLPHINS, SHARKS, FREE_SURFERS; labels, levels, helpers |
| `tsk-levels.ts` | Level logic incl. Assistant Coach reward multiplier (`acMultiplierForMonth`) |
| `participant-attendance.ts`, `attendance-stats.ts`, `consecutive-missed.ts` | Attendance calculations for profiles, dashboard charts, absence alerts |
| `excused-session-reasons.ts` | Reasons for excused/flagged sessions (category + scope) |
| `absence-badges.ts`, `*-pdf.tsx` | PDF generation with `@react-pdf/renderer` |
| `bolt.ts` | Bolt card / Lightning service client (users, cards, payout batches, ZAR rate) |
| `email.ts`, `email-schedule.ts` | Resend emails; recipients and send slots are DB-configured |
| `render-chart-screenshot.ts` | Puppeteer screenshot of `/chart-snapshot` for the TSK Attendance email |
| `sast.ts` | South African Standard Time (UTC+2, no DST) helpers — DB dates are stored at UTC noon; month boundaries calculated in SAST |
| `sa-id.ts` | 13-digit SA ID parsing + Luhn validation; extracts DOB and gender |
| `tsk-id.ts` | Sequential ID generation (`TSK00001`, etc.) within transactions |

### Database Models (Prisma, `prisma/schema.prisma`)

- **Participants:** `Participant`, `TskLevelHistory`, `AssistantCoachPeriod`, `PendingParticipantChange` (scheduled changes, e.g. group moves), `ParticipantChangeRequest`, `ParticipantNote`, `Certification`, `PerformanceEvent`, `SchoolReport`, `TskReview`.
- **Attendance:** `Event` (a session per group/date, with activity and optional zero-attendance confirmation), `AttendanceRecord` (unique on `(participantId, eventId)`), `AbsenceFlag`, `ExcusedSession`, `SessionActivity`, `School`.
- **Rewards/payouts:** `MonthlyReport` / `MonthlyReportEntry`, `AcademicPayout` / `AcademicPayoutEntry`, `SpecialPayout` / `SpecialPayoutEntry`, `RewardSettings`.
- **Email:** `EmailRecipient`, `EmailSchedule`.

Invariants:
- `Participant` has a unique `tskId` and a unique SA ID number.
- `MonthlyReport.month` is a `YYYY-MM` string with status `PENDING` or `APPROVED`. A PENDING report is regenerated when the attendance behind it changes. **Approved reports are fully locked** — nothing may change their attendance or rewards.
- Group membership for a past month must come from `TskLevelHistory` (`groupAsOf`), **never** from the current `Participant.tskStatus`. Otherwise group moves corrupt past reports and rosters.

### Reward Tiers

`src/lib/rewards.ts`: seven tiers (70, 75, 80, 85, 90, 95, 100%) on an exponential curve from `minSats` (70%) to `maxSats` (100%); below 70% → 0. Defaults are 3000 / 10000 sats, and admins can change them via `RewardSettings`. Tier selection uses the raw unrounded percentage; display floors it (`fmtPct`). Junior coaches are excluded from rewards. Assistant coaches get a multiplier.

### File Uploads

POST `/api/upload` — accepts JPEG, PNG, WebP, PDF up to 5MB. Files are stored in `/public/uploads/participants/`, and it returns a relative path that is saved to the DB.

### Environment Variables

See `.env.example`. Used by the code: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `ADMIN_NAME`/`ADMIN_USERNAME`/`ADMIN_PASSWORD`, `MARSHAL_PASSCODE_<GROUP>`, `CRON_SECRET`, `BOLT_API_URL`, `BOLT_API_KEY`, `NEXT_PUBLIC_BOLT_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `PUPPETEER_EXECUTABLE_PATH`, `DEMO_MODE`.
