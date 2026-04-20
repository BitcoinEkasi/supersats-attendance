-- Add group column to events
ALTER TABLE "events" ADD COLUMN "group" TEXT;

-- Recreate monthly_reports with new unique constraint (month, group)
-- Disable FK checks for safe table recreation
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_monthly_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "group" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,
    "approved_at" DATETIME,
    "approved_by" TEXT,
    "payment_request" TEXT,
    "payment_hash" TEXT,
    "payout_status" TEXT NOT NULL DEFAULT 'unpaid',
    "total_payout_sats" INTEGER NOT NULL DEFAULT 0,
    "batch_id" INTEGER
);

INSERT INTO "new_monthly_reports" SELECT "id","month",NULL,"status","generated_at","generated_by","approved_at","approved_by","payment_request","payment_hash","payout_status","total_payout_sats","batch_id" FROM "monthly_reports";

DROP TABLE "monthly_reports";
ALTER TABLE "new_monthly_reports" RENAME TO "monthly_reports";

CREATE UNIQUE INDEX "monthly_reports_month_group_key" ON "monthly_reports"("month", "group");

PRAGMA foreign_keys=ON;
