# TSK Bitcoin Rewards Platform — System Documentation

**BitcoinEkasi** · [tsk.bitcoinekasi.xyz](https://tsk.bitcoinekasi.xyz) · [bolt.bitcoinekasi.xyz](https://bolt.bitcoinekasi.xyz) · April 2026

---

## Contents

- [Part 1 — Platform Overview](#part-1--platform-overview)
- [Part 2 — TSK Rewards System](#part-2--tsk-rewards-system-tskbitcoinekasixyz)
  - [2.1 Data Model](#21-data-model)
  - [2.2 Participant Management](#22-participant-management)
  - [2.3 Attendance System](#23-attendance-system)
  - [2.4 Monthly Report & Reward Logic](#24-monthly-report--reward-logic)
  - [2.5 Payout Integration](#25-payout-integration)
  - [2.6 Time Zone Strategy](#26-time-zone-strategy)
- [Part 3 — BoltCard Server](#part-3--boltcard-server-boltbitcoinekasixyz)
  - [3.1 Database Schema](#31-database-schema)
  - [3.2 Card Programming Workflow](#32-card-programming-workflow)
  - [3.3 Card Tap → Payment (LNURL-W)](#33-card-tap--payment-lnurl-w)
  - [3.4 Balance Refill (LNURL-P)](#34-balance-refill-lnurl-p)
  - [3.5 Blink Lightning Integration](#35-blink-lightning-integration)
  - [3.6 Admin Dashboard](#36-admin-dashboard)
  - [3.7 Batch Payout API](#37-batch-payout-api)
  - [3.8 Security](#38-security)
- [Part 4 — How the Two Systems Work Together](#part-4--how-the-two-systems-work-together)
- [Part 5 — Deployment & Operations](#part-5--deployment--operations)

---

## Part 1 — Platform Overview

The **BitcoinEkasi TSK Bitcoin Rewards Platform** is two cooperating systems that together form a complete Bitcoin-powered incentive programme for a youth surf/skate/fitness club in Mossel Bay, South Africa.

### 1.1 What Was Built

| System | Domain | Purpose |
|--------|--------|---------|
| **TSK Rewards** | tsk.bitcoinekasi.xyz | Participant registry, attendance tracking, monthly report generation, and reward calculation. The administrative brain of the platform. |
| **BoltCard Server** | bolt.bitcoinekasi.xyz | Bitcoin balance ledger, BoltCard NFC payment handling (LNURL-W), Lightning Network address refills (LNURL-P), and batch reward disbursement. The money layer. |

### 1.2 Technology Stack

| Layer | TSK Rewards | BoltCard Server |
|-------|-------------|-----------------|
| Runtime | Node.js 20 / Next.js 15 (App Router) | Node.js 20 / Express 4 |
| Language | TypeScript | TypeScript |
| Database | SQLite via Prisma ORM | SQLite via better-sqlite3 (synchronous) |
| Auth | NextAuth.js v5 (credentials + JWT) | JWT (HS256, jsonwebtoken) |
| Frontend | React Server Components + Tailwind CSS | React + Vite + Tailwind CSS |
| Bitcoin | Calls Bolt API for payouts | Blink GraphQL API + WebSocket |
| Container | Docker (multi-stage) | Docker (multi-stage) |

### 1.3 Deployment Architecture

Both systems run on a single VPS as Docker containers behind an **nginx reverse proxy** that handles SSL termination (Let's Encrypt) and routes by domain name.

```
Internet
   │
nginx (SSL termination)
   ├── tsk.bitcoinekasi.xyz  →  TSK container :3000
   └── bolt.bitcoinekasi.xyz →  Bolt container :3001
```

CI/CD is handled by **GitHub Actions**: on push to `main`, each repository builds a Docker image and pushes it to the **GitHub Container Registry (GHCR)**. Deployment runs `docker compose pull && docker compose up -d` on the VPS.

### 1.4 User Roles

| Role | Access Level | Primary Use |
|------|-------------|-------------|
| **ADMINISTRATOR** | Full access | Participant management, report generation & approval, payout management |
| **MARSHAL** | Attendance only | Mobile-first view of today's session; marks attendance; can raise change requests |

Marshals are redirected to the current day's attendance session on login and see only the minimal mobile UI needed for that task.

---

## Part 2 — TSK Rewards System (tsk.bitcoinekasi.xyz)

### 2.1 Data Model

All data lives in a SQLite database managed by Prisma.

#### Participant

The central entity. Represents one registered youth participant or junior coach.

| Field Group | Fields | Notes |
|-------------|--------|-------|
| **Identity** | `tskId`, `surname`, `fullNames`, `knownAs`, `idNumber` | TSK ID is auto-generated sequential (`TSK00001`). SA ID is unique, parsed for DOB + gender. |
| **Derived** | `gender`, `dateOfBirth` | Extracted from the 13-digit SA ID number at registration; never entered manually. |
| **Status** | `status`, `registrationDate`, `retiredAt`, `retiredReason`, `retiredReasonOther` | Status: `ACTIVE` or `RETIRED`. Retirement captures date, reason (dropdown), and optional free-text for "Other". |
| **Demographics** | `ethnicity`, `language`, `housingType` | Optional fields for programme reporting. |
| **School** | `school`, `grade` | Used for academic payout eligibility. |
| **Guardian** | `guardian`, `guardianId`, `guardianRelationship`, `address`, `contact1`, `contact2` | Emergency / parental contact information. |
| **Measurements** | `weightKg`, `heightCm`, `tshirtSize`, `shoeSize`, `wetsuiteSize` | Plain text / numeric. Each field has its own `*UpdatedAt` timestamp. |
| **Measurement timestamps** | `measurementsUpdatedAt`, `weightUpdatedAt`, `heightUpdatedAt`, `tshirtSizeUpdatedAt`, `shoeSizeUpdatedAt`, `wetsuiteUpdatedAt` | Per-field timestamps updated only when that specific field changes. |
| **Junior Coach** | `isJuniorCoach`, `juniorCoachLevel` | Level 1, 2, or 3 — drives reward multiplier (5×, 7.5×, 10×). |
| **TSK Level** | `tskStatus`, `tskStatusUpdatedAt` | Programme progression level. Full history stored in `TskLevelHistory`. |
| **Documents** | `idDocumentUrl`, `idDocumentUploadedAt`, `indemnityFormUrl`, `indemnityUploadedAt`, `profilePicture` | File paths served from `/public/uploads/participants/`. |
| **Payment** | `paymentMethod`, `lightningAddress` | `BOLT_CARD` (internal credit) or `LIGHTNING_ADDRESS` (outbound LN send). |
| **Notes** | `notes` | Free-text admin notes; editable without triggering a report recalculation. |

#### Event & AttendanceRecord

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **Event** | `id`, `date`, `category`, `note` | One session per SAST calendar day. Category: `SURFING`, `FITNESS`, `SKATING`, `BEACH_CLEAN_UP`, `OTHER`. |
| **AttendanceRecord** | `participantId`, `eventId`, `present`, `onTour` | Composite unique on `(participantId, eventId)`. `onTour` marks participants away at competitions. |

#### MonthlyReport & MonthlyReportEntry

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **MonthlyReport** | `month` (YYYY-MM), `status`, `generatedAt`, `generatedBy`, `approvedAt`, `approvedBy` | One row per calendar month. Status: `PENDING` → `APPROVED`. Resets to `PENDING` on any data change. |
| **MonthlyReportEntry** | `reportId`, `participantId`, `totalEvents`, `attended`, `percentage`, `rewardSats` | One row per participant per month. Fully replaced (delete + recreate) on each regeneration. |

#### TskLevelHistory

Append-only audit log of TSK level changes. Each row records `participantId`, `level`, and `changedAt`. A new row is inserted whenever `tskStatus` changes, providing a full progression timeline.

#### Other Models

| Model | Purpose |
|-------|---------|
| **Certification** | Surf/lifesaving certificates: `certType`, `issuedAt`, `fileUrl`. Multiple per participant. |
| **TskReview** | Quarterly review: overall rating, surfing/skating/fitness scores, coach comments, level recommendation. |
| **PerformanceEvent** | Competition results: event name, date, placement, notes. |
| **SchoolReport** | Academic results per term: `year`, `term`, `grade`, `percentage`, `reportFileUrl`. Used for academic payouts. |
| **ParticipantChangeRequest** | Marshal-raised profile corrections: `field`, `currentValue`, `proposedValue`, `reason`, `status`. |
| **AcademicPayout / Entry** | Term-based school grade reward batches and per-participant entries. |
| **SpecialPayout / Entry** | Ad-hoc reward groups and per-participant entries with custom amounts. |

---

### 2.2 Participant Management

#### Registration

An Administrator enters the participant's SA ID number, names, and other details. The system parses the 13-digit SA ID using the Luhn checksum algorithm to:

- Validate the number is genuine
- Extract the **date of birth** (first 6 digits: YYMMDD)
- Extract the **gender** (digit 7: 0–4 = Female, 5–9 = Male)

The TSK ID (`TSK00001`, `TSK00002`, …) is auto-generated sequentially inside a database transaction to prevent duplicates under concurrent writes.

#### Body Measurements

Weight, height, t-shirt size, shoe size, and wetsuit size each have an independent `*UpdatedAt` timestamp. The timestamp is set to _now_ only when that specific field's value changes. This lets staff see exactly when each measurement was last taken.

#### Status Lifecycle

A participant starts `ACTIVE`. When retired, the Administrator selects a reason from a standardised list:

- At age 18
- Relocated
- Poor attendance
- Lack of interest
- Negative attitude or behaviour
- Other (requires free-text explanation)

The `retiredAt` date is set to the current timestamp. On retirement, the monthly report for the current month is automatically regenerated.

#### Junior Coach System

| Level | Multiplier | Effect on 10,000 sat base reward |
|-------|-----------|----------------------------------|
| 1 | 5× | 50,000 sats |
| 2 | 7.5× | 75,000 sats |
| 3 | 10× | 100,000 sats |

#### Change Requests

When a Marshal notices a profile error, they submit a **ParticipantChangeRequest** specifying the field, current value, and proposed correction. Administrators see a queue of pending requests and approve or reject each one. This gives Marshals a way to surface data issues without granting them direct edit access.

---

### 2.3 Attendance System

#### Session Creation

An **Event** (session) represents a single training day. Only one session can exist per SAST calendar day — enforced by a unique index on the date field.

#### Role-Based Flow

- **Marshals** see a mobile-optimised single-page view. On login they are redirected to today's session (if it exists) or to a stripped-down creation form.
- **Administrators** see the full attendance overview: all historical sessions grouped by month, a session creation form, and a link to today's session.

#### Marking Attendance

Inside a session, every active participant is listed. Staff tap to toggle each participant between:

- **Present** — counted towards rewards
- **Absent** — default state, not counted
- **On Tour** — away at a competition; recorded separately, treated as absent for percentage purposes

#### Sessions UI — Monthly Grouping

The attendance overview groups sessions by calendar month with an expand/collapse chevron. The most recent month is open by default. Each month header shows the total session count and combined attendee count. Each session row shows: date, category badge, attendee count (present only), optional note, and action links.

#### Session Deletion

Administrators can delete a session provided its month has **not** been approved. If the month's report is `APPROVED`, deletion is blocked. When a session is deleted:

1. All `AttendanceRecord` rows for that session are deleted.
2. The `Event` row is deleted.
3. If other sessions remain in that month, the monthly report is automatically regenerated.
4. If it was the only session in the month, the report is reset to `PENDING` with no entries.

---

### 2.4 Monthly Report & Reward Logic

This is the core business logic of the platform. Each month produces a report stating: for each participant, how many sessions they attended, their attendance percentage, and how many sats they earned.

#### Report Generation — `upsertMonthlyReport()`

A single idempotent function (`src/lib/upsert-report.ts`) handles all report creation and updates. It is called automatically when:

- A new session is created
- A session is deleted
- A participant is marked RETIRED

The function runs inside a database transaction and fully replaces all `MonthlyReportEntry` rows — safe to call repeatedly with no side effects.

#### Participant Inclusion Rules

| Participant State | Included? | Reasoning |
|------------------|-----------|-----------|
| ACTIVE, registered before month end | Yes | Normal active participant. |
| ACTIVE, registered after month end | No | Not yet a participant during the month. |
| RETIRED, `retiredAt ≥ monthStart` | Yes — retirement month only | Was participating at some point during the month. |
| RETIRED, `retiredAt < monthStart` | No | Retired before this month began; fully excluded. |

> **New-joiner rule:** A participant who joins mid-month is included. Their attendance for sessions before their registration date is naturally zero. They are divided by the full month session count — no prorated denominator. The same rule applies to retired participants.

#### Attendance Calculation

```typescript
// For each participant:
const attendableEvents = participant.retiredAt
  ? events.filter(e => e.date <= participant.retiredAt)
  : events;  // all month events for active participants

const totalEvents = events.length;   // ALWAYS the full month count

const attended = attendableEvents.filter(e =>
  attendedSet.get(participant.id)?.has(e.id)
).length;

const percentage = (attended / totalEvents) * 100;
```

Key design decisions:
- **`attended`** only counts sessions up to the retirement date for retired participants.
- **`totalEvents`** is always the full count — no participant gets a smaller denominator regardless of when they joined or left. This creates a consistent, fair metric.

#### Reward Tiers

| Attendance % | Base Reward (sats) |
|-------------|-------------------|
| 100% | 10,000 |
| 95 – 99% | 8,200 |
| 90 – 94% | 6,700 |
| 85 – 89% | 5,500 |
| 80 – 84% | 4,500 |
| 75 – 79% | 3,700 |
| 70 – 74% | 3,000 |
| < 70% | 0 |

#### Junior Coach Multiplier

```typescript
const JC_MULTIPLIERS = { 1: 5, 2: 7.5, 3: 10 };
const rewardSats = participant.isJuniorCoach
  ? Math.round(baseReward * (JC_MULTIPLIERS[participant.juniorCoachLevel ?? 1] ?? 5))
  : baseReward;
```

#### Report Lifecycle

1. **Generate** — created or refreshed automatically on data changes. Status starts `PENDING`. If the report was `APPROVED` and is regenerated, it resets to `PENDING`.
2. **Review** — Administrator views per-participant attendance, percentage, and reward amounts.
3. **Approve** — Administrator approves. Blocked for the current or future months. On approval, a batch payout is created via the Bolt API.
4. **Pay** — Payout transitions: `unpaid` → `invoiced` → `paid` as the Lightning payment settles.

---

### 2.5 Payout Integration

#### Payment Methods

- **BOLT_CARD** — reward sats are credited as an internal balance on the BoltCard Server. The participant spends using their NFC card at point-of-sale.
- **LIGHTNING_ADDRESS** — reward sats are sent outbound via Lightning Network to the participant's Lightning address.

#### Monthly Report Payout Flow

When an Administrator approves a monthly report, TSK calls Bolt's `POST /api/v1/payout/batch` with a list of `{ userId, amountSats, payoutType }` items. Bolt credits internal balances or sends outbound Lightning payments accordingly.

#### Academic Payouts

Term-based school grade rewards separate from monthly attendance. Administrators upload school reports and enter academic percentages; the system calculates rewards based on grade thresholds and dispatches via the same Bolt batch API.

#### Special Payouts

Ad-hoc reward batches for specific events (competition prizes, community participation, etc.) with custom per-participant amounts.

---

### 2.6 Time Zone Strategy

South Africa uses **SAST (UTC+2)** with no daylight-saving time.

> **Convention:** All Event dates are stored as **noon UTC** on the SAST calendar date. For example, "Monday 7 April 2026 SAST" is stored as `2026-04-07T10:00:00.000Z`. This ensures the date never crosses midnight UTC in either direction.

Month boundary calculations in `src/lib/sast.ts`:
- `getStartOfSASTMonth("2026-04")` → `2026-03-31T22:00:00.000Z`
- `getEndOfSASTMonth("2026-04")` → `2026-04-30T21:59:59.999Z`

All Prisma date-range queries use these UTC boundary values.

---

## Part 3 — BoltCard Server (bolt.bitcoinekasi.xyz)

An Express.js application that manages a Bitcoin balance ledger, handles NFC card payments, accepts Lightning Network refills, and exposes an admin dashboard and a payout API.

### 3.1 Database Schema

Eleven SQLite tables (created synchronously on startup):

| Table | Purpose |
|-------|---------|
| `admins` | Admin user accounts. Stores bcrypt-hashed password and display name. |
| `users` | Participants/cardholders. Fields: `username`, `display_name`, `balance_sats`, `daily_limit_sats`, `tx_limit_sats`, `lightning_address`, `external_id` (links to TSK participant ID). |
| `cards` | NFC BoltCards. One card per user. Stores all 5 AES-128 keys (K0–K4), the card UID (captured on first tap), last seen counter, and enabled/disabled status. |
| `transactions` | Completed payment events. Records direction (debit/credit), amount, fee, memo, and Unix timestamp. |
| `pending_refills` | In-flight LNURL-P invoices awaiting payment. Holds Blink payment hash, amount, expiry timestamp. |
| `pending_withdrawals` | In-flight LNURL-W requests awaiting wallet callback. Holds one-time k1 token and amount. |
| `api_keys` | API keys for server-to-server calls (TSK → Bolt). Stored as SHA-256 hash — raw key shown once at creation. |
| `card_events` | Append-only audit log of every card tap attempt (success, failure, reason). |
| `payout_batches` | Monthly/academic/special reward batches received from TSK. Tracks total sats, status, Lightning invoice hash. |
| `payout_batch_items` | Individual user entries within a batch. Tracks `payout_type` (`internal` vs `ln_address`), amount, and per-item status. |
| `ln_payouts` | Records of outbound Lightning payments. Stores payment hash, destination address, amount, fee, status. |

#### Card Keys Explained

Each BoltCard has 5 AES-128 (128-bit) keys written during programming:

| Key | Role |
|-----|------|
| `K0` | Card authentication master key (used by card internally) |
| `K1` | **Session key** — used by the server to decrypt the encrypted UID and tap counter from the NFC URL |
| `K2` | **CMAC key** — used to verify the message authentication code in the NFC URL, preventing replay attacks |
| `K3` | Reserved / factory use |
| `K4` | Reserved / factory use |

---

### 3.2 Card Programming Workflow

1. Administrator opens the user detail page and clicks **"Generate Card QR"**.
2. The server generates 5 random 128-bit AES keys (K0–K4) and stores them against the card record. The card UID is initially unknown.
3. The server constructs a configuration payload encoding the keys and the LNURL-W endpoint URL, returned as a QR code.
4. An administrator scans the QR code with the **BoltCard Programmer** mobile app (iOS/Android).
5. The app establishes an NFC connection with the blank card and writes all 5 keys plus the LNURL-W URL to the card's NTAG424 memory.
6. On the card's **first tap**, the server decrypts the NFC payload and captures the card's real UID, completing registration.

To decommission a card, the administrator generates a "wipe QR" which resets the card to factory keys.

---

### 3.3 Card Tap → Payment (LNURL-W)

When a participant taps their BoltCard at a point-of-sale terminal:

1. **NFC tap** — The card broadcasts a URL: `https://bolt.bitcoinekasi.xyz/lnurlw?p=ENCRYPTED_PAYLOAD&c=CMAC`
2. **Server receives `/lnurlw`** — Extracts `p` (AES-encrypted UID + counter) and `c` (CMAC authentication tag).
3. **Decrypt** — Using K1, the server decrypts `p` to recover the plaintext UID and 3-byte tap counter.
4. **Identify card** — Looks up the card by UID. On first tap, stores the UID.
5. **Verify CMAC** — Using K2, recomputes the CMAC and compares to `c`. Mismatch = rejected.
6. **Counter check** — Decrypted counter must be strictly greater than the last seen counter. Prevents replay attacks.
7. **Return LNURL-W response** — JSON with `minWithdrawable`, `maxWithdrawable` (balance up to per-tx limit), `defaultDescription`, and callback URL.
8. **Wallet creates invoice** — The payment terminal creates a Lightning invoice and sends it to `/lnurlw/callback?k1=TOKEN&pr=INVOICE`.
9. **Callback processing** — Server decodes the invoice, checks amount against balance and limits, then calls Blink's `lnInvoicePaymentSend` mutation.
10. **Balance deduction** — On successful payment, `balance_sats` is decremented and a `transactions` row is inserted.

> **Replay prevention:** The strictly-increasing counter (stored on the card's secure memory and verified server-side) means that re-broadcasting a recorded NFC URL fails the counter check. The CMAC further ensures the payload hasn't been tampered with.

---

### 3.4 Balance Refill (LNURL-P)

Participants can top up their balance by sending Lightning payments to `username@bolt.bitcoinekasi.xyz`:

1. **Lightning address lookup** — Sender's wallet fetches `/.well-known/lnurlp/username` and receives LNURL-P metadata.
2. **Invoice request** — Sender's wallet requests an invoice via `/lnurlp/username/callback?amount=MILLISATS`.
3. **Invoice creation** — Server calls Blink's `lnInvoiceCreate` mutation, stores the invoice in `pending_refills` (1-hour expiry), and returns it to the sender's wallet.
4. **Payment** — Sender pays the invoice. Blink detects the incoming payment.
5. **Real-time notification** — The Blink WebSocket subscription fires an `LnUpdate` event with the payment hash and settled amount.
6. **Balance credit** — Server matches the payment hash to a `pending_refills` row, credits the user's `balance_sats`, inserts a `transactions` row, and removes the pending entry.

A background job runs every 30 minutes to clean up expired unpaid pending_refills.

---

### 3.5 Blink Lightning Integration

All Lightning Network operations go through **Blink** (galoy.io), a custodial Bitcoin Lightning wallet with a GraphQL API and WebSocket subscription feed.

#### GraphQL HTTP API

| Operation | Type | Used For |
|-----------|------|---------|
| `lnInvoiceCreate` | Mutation | Create a Lightning invoice for refills |
| `lnInvoicePaymentSend` | Mutation | Pay a Lightning invoice (card withdrawals) |
| `getBalance` | Query | Fetch current Blink account balance |
| `getTransactions` | Query | Fetch transaction history with counterparty details |

#### WebSocket Subscription

The server maintains a persistent WebSocket connection subscribing to `myUpdates`. When a payment arrives, Blink pushes a real-time `LnUpdate` event. The server uses `graphql-ws` with `retryAttempts: Infinity` for auto-reconnect.

#### Transaction Counterparty Extraction

The admin dashboard shows a "From/To" column on Blink transactions, extracted from `settlementVia`:

- **IntraLedger** (Blink-to-Blink) — counterparty's Blink username
- **OnChain** — Bitcoin transaction hash
- **Lightning** — "Lightning" (external LN payment; no identifying info available)

---

### 3.6 Admin Dashboard

A React SPA (Vite build) authenticating via JWT stored in `localStorage`.

#### Users Tab

- Live search bar filtering by username or display name
- Each user row: display name, username, card status badge (Active / Inactive / No Card), balance in sats and ZAR, lightning bolt icon if LN address is set
- Clicking a user opens the detail panel with: balance management, transaction history, card programming QR / wipe QR, limits, Lightning payout

#### Blink Account Tab

Shows the main Blink account (`skredit@blink.sv`) transaction history:

- Direction indicator (↓ receive / ↑ send)
- Date and time
- From/To counterparty
- Amount in sats (with ZAR equivalent)
- Fee in sats
- Memo
- Status badge (SUCCESS / PENDING / FAILED)
- Refresh button (loads lazily on first tab open)

---

### 3.7 Batch Payout API

TSK calls **`POST /api/v1/payout/batch`** on report approval. Protected by a SHA-256-hashed API key.

```json
{
  "batchId": "tsk-2026-03",
  "description": "Monthly rewards — March 2026",
  "items": [
    { "userId": "TSK00001", "amountSats": 10000, "payoutType": "internal" },
    { "userId": "TSK00042", "amountSats": 8200,  "payoutType": "ln_address" }
  ]
}
```

- **`internal`** items — balance credited immediately; `payout_batch_items` row marked `completed`.
- **`ln_address`** items — outbound Lightning payment initiated; tracked in `ln_payouts`; marked `completed` on WebSocket confirmation from Blink.

---

### 3.8 Security

| Mechanism | Implementation |
|-----------|----------------|
| Admin authentication | JWT (HS256), 8-hour expiry, signed with `JWT_SECRET` |
| Password storage | bcrypt, salt rounds = 12 |
| API key storage | SHA-256 hash of raw key; raw key shown once at creation |
| NFC replay prevention | Strictly-increasing tap counter (3 bytes, stored per card) |
| NFC tamper detection | CMAC (AES-128 CBC-MAC) using K2; mismatch = rejected |
| NFC payload confidentiality | AES-128 decryption of UID + counter using K1 |
| Withdrawal limits | Per-transaction and daily rolling limits enforced server-side before calling Blink |
| HTTPS | Let's Encrypt TLS via nginx; all traffic encrypted in transit |

---

## Part 4 — How the Two Systems Work Together

TSK Rewards and the BoltCard Server are loosely coupled via a simple REST API. TSK is the source of truth for participants and rewards; Bolt is the source of truth for balances and card payments.

### End-to-End Reward Flow

1. **Attendance tracked (TSK)** — Marshals mark daily attendance throughout the month. Each session auto-updates the monthly report.
2. **Month closes (TSK)** — Administrator opens the monthly report showing each participant's attendance % and calculated reward.
3. **Report approved (TSK → Bolt)** — Administrator clicks Approve. TSK calls `POST /api/v1/payout/batch` on Bolt, passing each participant's TSK ID and reward amount.
4. **Balances credited (Bolt)** — Bolt processes the batch. BOLT_CARD participants have their internal balance increased; LIGHTNING_ADDRESS participants receive an outbound Lightning payment.
5. **Spending (Bolt)** — Participants tap their BoltCard at community vendors. Each tap deducts from their internal balance via LNURL-W.
6. **Lightning refills (Bolt)** — Any Lightning wallet can send sats to `username@bolt.bitcoinekasi.xyz` to top up a balance directly.

### Data Mapping

| TSK Field | Bolt Field | How Linked |
|-----------|-----------|------------|
| `participant.tskId` | `users.external_id` | TSK creates/looks up the Bolt user by TSK ID when dispatching a payout batch |
| `participant.paymentMethod` | `payout_batch_items.payout_type` | `BOLT_CARD` → `internal`; `LIGHTNING_ADDRESS` → `ln_address` |
| `participant.lightningAddress` | `users.lightning_address` | Synced when the Bolt user is created or updated from TSK |

The systems can operate independently — Bolt has no knowledge of attendance or reward calculations, and TSK has no knowledge of card balances or tap history.

---

## Part 5 — Deployment & Operations

### 5.1 Docker Builds

Both systems use **multi-stage Docker builds**:

| Stage | Purpose |
|-------|---------|
| `deps` | Install all npm dependencies (including devDependencies for the build) |
| `builder` | Run the production build (`next build` for TSK, `tsc + vite build` for Bolt) |
| `runner` | Copy only compiled output + production dependencies; set `NODE_ENV=production` |

### 5.2 GitHub Actions CI

Triggered on push to `main`. Builds the Docker image and pushes to **GHCR** (`ghcr.io/org/repo:latest`). The `GITHUB_TOKEN` secret is used for authentication — no manual credentials needed.

### 5.3 Server Deployment

Both services are defined in a single `docker-compose.yml` on the VPS. To deploy:

```bash
docker compose pull
docker compose up -d
```

Docker Compose only restarts services where the image digest changed.

> **Disk space:** Docker image layers accumulate over time. Run `docker system prune -f` before deploying if disk space is low.

### 5.4 nginx Configuration

```nginx
server {
    server_name tsk.bitcoinekasi.xyz;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    server_name bolt.bitcoinekasi.xyz;
    location /assets/ {
        proxy_pass http://localhost:5173;
        proxy_buffering off;  # Critical: prevents truncation of large JS bundles
    }
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

> **`proxy_buffering off`** on the `/assets/` location is critical. Without it, nginx's default 32KB proxy buffer truncates large JavaScript bundles, causing a blank white page.

SSL is managed by **Certbot** (Let's Encrypt) with automatic HTTPS redirect.

### 5.5 Environment Variables

| Variable | System | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | TSK | Prisma connection string (SQLite file path) |
| `NEXTAUTH_SECRET` | TSK | JWT signing secret for NextAuth sessions |
| `NEXTAUTH_URL` | TSK | Public URL of the TSK app |
| `AUTH_TRUST_HOST` | TSK | Set to `true` when behind a proxy |
| `BOLT_API_URL` | TSK | Internal URL of the Bolt server for payout API calls |
| `BOLT_API_KEY` | TSK | API key for authenticating TSK → Bolt calls |
| `JWT_SECRET` | Bolt | Signs admin dashboard JWTs |
| `BLINK_API_KEY` | Bolt | Blink GraphQL API authentication |
| `BLINK_WALLET_ID` | Bolt | Blink Bitcoin wallet identifier |
| `ZAR_RATE` | Bolt | BTC/ZAR exchange rate for display purposes |

### 5.6 Database Migrations

**TSK (Prisma):** The Docker entrypoint runs `prisma migrate deploy` before starting the Next.js server. This applies any pending SQL migrations from `prisma/migrations/` safely — skipping already-applied migrations, never touching data.

**Bolt (SQLite):** On startup, Express runs synchronous `CREATE TABLE IF NOT EXISTS` statements for all 11 tables. Schema changes require a manual `ALTER TABLE` run on the server.

### 5.7 Maintenance

```bash
# View live logs
docker compose logs -f tsk
docker compose logs -f bolt

# Backup TSK database
docker cp infra-tsk-1:/data/tsk.db ./backup-tsk.db

# Seed default admin + marshal accounts (fresh deploy only)
docker compose exec tsk npm run db:seed

# Free up disk space before deploying
docker system prune -f
```

---

*BitcoinEkasi — TSK Bitcoin Rewards Platform — April 2026*
