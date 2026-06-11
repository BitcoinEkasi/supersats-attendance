# SUPERSATS — Attendance & Rewards

Built by [The Surfer Kids](https://bitcoinekasi.com) in collaboration with **Bitcoin Ekasi**, Mossel Bay, South Africa.

Captures session attendance for a youth surf, skate, and fitness programme, calculates monthly Bitcoin (satoshi) rewards based on participation, and triggers payouts via the companion [supersats-rewards](https://github.com/BitcoinEkasi/supersats-rewards) server.

---

## What it does

- **Participant registry** — profiles with SA ID parsing, photo uploads, TSK sequential IDs
- **Attendance capture** — marshals mark attendance per session on a mobile-first PWA; administrators manage events across activity types (surfing, skating, fitness, beach clean-ups, etc.)
- **Monthly reports** — auto-generated per group, showing sessions, attendance percentage, and satoshi reward tier per participant
- **Reward calculation** — tiered sats rewards based on attendance percentage; junior coaches excluded
- **Bitcoin payouts** — integrates with the supersats-rewards server to pay BoltCard holders and Lightning addresses; ZAR/sat rate locked at approval time for auditable historical records
- **Group management** — supports multiple participant groups (Turtles, Seals, Dolphins, Sharks, Free Surfers) with independent reporting

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | SQLite via Prisma ORM |
| Auth | NextAuth.js v5 (credentials + JWT) |
| Frontend | React Server Components + Tailwind CSS |
| Deployment | Docker + GitHub Actions CI |

## Roles

| Role | Access |
|---|---|
| **ADMINISTRATOR** | Full access — participants, events, reports, payouts |
| **MARSHAL** | Mobile attendance capture only |

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/BitcoinEkasi/supersats-attendance
cd supersats-attendance
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Set up the database
npm run db:push
npm run db:seed   # creates default admin + marshal accounts

# 4. Start the dev server
npm run dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma connection string (e.g. `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Random 32-byte secret for JWT signing |
| `NEXTAUTH_URL` | Public URL of this app |
| `AUTH_TRUST_HOST` | Set to `true` when behind a reverse proxy |
| `ADMIN_NAME` | Display name for the admin account |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `MARSHAL_NAME` | Display name for the marshal account |
| `MARSHAL_USERNAME` | Marshal login username |
| `MARSHAL_PASSWORD` | Marshal login password |
| `BOLT_API_URL` | Internal URL of the supersats-rewards server |
| `BOLT_API_KEY` | API key for the supersats-rewards server |
| `NEXT_PUBLIC_BOLT_URL` | Public URL of the supersats-rewards server |
| `CRON_SECRET` | Bearer token for the daily absence-check cron job |
| `MARSHAL_PASSCODE_*` | Per-group passcodes for the marshal PWA |

See `.env.example` for a full template.

## Deployment

The app ships as a multi-stage Docker image. On push to `main`, GitHub Actions builds and pushes the image to GHCR. On the server:

```bash
docker compose pull
docker compose up -d
```

The Docker entrypoint runs `prisma migrate deploy` automatically before starting, so schema migrations are applied on each deploy.

## Reward tiers

Defaults (configurable in the admin UI):

| Attendance | Reward |
|---|---|
| 100% | 7 500 sats |
| 90–99% | 7 000 sats |
| 80–89% | 6 000 sats |
| 70–79% | 5 000 sats |
| < 70% | 0 sats |

## Progressive Web App (PWA)

The marshal attendance interface is installable as a PWA on Android via Chrome — no app store required.

### Marshal PWA (`/marshal`)

Marshals visit `yourdomain.com/marshal` on their Android phone and tap **Add to Home Screen** when Chrome prompts. The app opens in standalone mode (no browser chrome) and is optimised for portrait mobile use.

**Per-group passcodes** control which group a marshal can check in. Set these via env vars:

```
MARSHAL_PASSCODE_TURTLES=your-passcode
MARSHAL_PASSCODE_SEALS=your-passcode
# etc. — one per group defined in src/lib/tsk-groups.ts
```

**Customising the app name and icons:**
- Name and short name: edit `public/marshal-manifest.json`
- Icons: replace `public/icons/marshal-192.png` and `public/icons/marshal-512.png` with your own (192×192 and 512×512 PNG)

## Companion project

Payouts are handled by **[supersats-rewards](https://github.com/BitcoinEkasi/supersats-rewards)** — the BoltCard and Lightning Network payment server that this app calls when approving monthly reports.

## License

[MIT](LICENSE) © BitcoinEkasi
