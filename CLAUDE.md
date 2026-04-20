# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server (Turbopack)
npm run build         # Production build
npm run lint          # ESLint

npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:push       # Push schema to DB (development/prototype)
npm run db:migrate    # Run migrations (production-safe)
npm run db:seed       # Seed default users (admin, marshall)
```

No test suite is configured. Lint is the only automated check.

## Architecture

**TSK Rewards** is an attendance tracking and Bitcoin (satoshi) rewards platform for a youth sports program (South Africa). Built with Next.js App Router, TypeScript, Prisma + PostgreSQL, and NextAuth.js credentials auth.

### Request Flow

All data mutations go through **Server Actions** (`src/app/actions/`), not API routes. The only API routes are `/api/auth/[...nextauth]` and `/api/upload`. Server Actions call Prisma directly and use `revalidatePath()` for cache invalidation.

### Roles & Access

Two roles: `ADMINISTRATOR` and `MARSHALL`.

- Marshalls get a stripped-down attendance-only UI and land on `/attendance` after login.
- Administrators get the full dashboard with sidebar, participants, reports, etc.
- All role enforcement happens in Server Actions via `requireRole()` (`src/lib/role-guard.ts`), not in components or middleware.

### Key Library Modules (`src/lib/`)

| File | Purpose |
|---|---|
| `auth.ts` | NextAuth config (credentials, JWT with `id`+`role`) |
| `db.ts` | Prisma client singleton |
| `rewards.ts` | Satoshi tier calculation based on attendance % |
| `sast.ts` | South African Standard Time (UTC+2, no DST) helpers — DB dates are stored at UTC noon; month boundaries calculated in SAST |
| `sa-id.ts` | 13-digit SA ID parsing + Luhn validation; extracts DOB and gender |
| `tsk-id.ts` | Sequential ID generation (`TSK00001`, etc.) within transactions |
| `role-guard.ts` | `requireRole()` enforces role; redirects unauthorized to `/dashboard` |

### Database Models (Prisma)

Core models: `User`, `Participant`, `Event`, `AttendanceRecord`, `MonthlyReport`, `MonthlyReportEntry`, `Certification`, `PerformanceEvent`, `ParticipantChangeRequest`.

- `Participant` has a unique `tskId` (auto-generated sequential) and a unique SA ID number.
- `AttendanceRecord` has a composite unique on `(participantId, eventId)`.
- `MonthlyReport` uses `month` as a string key (`YYYY-MM` format) and has status `PENDING` or `APPROVED`. Report status resets to PENDING whenever underlying attendance data changes.

### Reward Tiers

Defined in `src/lib/rewards.ts`:
- 100% → 7500 sats
- 90–99% → 7000 sats
- 80–89% → 6000 sats
- 70–79% → 5000 sats
- <70% → 0 sats

Junior coaches are excluded from rewards.

### File Uploads

POST `/api/upload` — accepts JPEG, PNG, WebP, PDF up to 5MB. Files stored in `/public/uploads/participants/`. Returns a relative path saved to the DB.

### Environment Variables

See `.env.example`. Required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
