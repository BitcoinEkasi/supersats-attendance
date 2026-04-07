CREATE TABLE "academic_payouts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "year" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  "approved_at" DATETIME,
  "approved_by" TEXT,
  "payment_request" TEXT,
  "payment_hash" TEXT,
  "payout_status" TEXT NOT NULL DEFAULT 'unpaid',
  "total_payout_sats" INTEGER NOT NULL DEFAULT 0,
  "batch_id" INTEGER,
  CONSTRAINT "academic_payouts_year_term_key" UNIQUE ("year", "term")
);

CREATE TABLE "academic_payout_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payout_id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "grade_percent" REAL NOT NULL,
  "reward_sats" INTEGER NOT NULL,
  "payout_status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academic_payout_entries_payout_id_participant_id_key" UNIQUE ("payout_id", "participant_id"),
  CONSTRAINT "academic_payout_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "academic_payouts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "academic_payout_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "special_payouts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  "approved_at" DATETIME,
  "approved_by" TEXT,
  "payment_request" TEXT,
  "payment_hash" TEXT,
  "payout_status" TEXT NOT NULL DEFAULT 'unpaid',
  "total_payout_sats" INTEGER NOT NULL DEFAULT 0,
  "batch_id" INTEGER
);

CREATE TABLE "special_payout_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payout_id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "amount_sats" INTEGER NOT NULL,
  "note" TEXT,
  "payout_status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_payout_entries_payout_id_participant_id_key" UNIQUE ("payout_id", "participant_id"),
  CONSTRAINT "special_payout_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "special_payouts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "special_payout_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
