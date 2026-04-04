-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_monthly_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
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
INSERT INTO "new_monthly_reports" ("approved_at", "approved_by", "generated_at", "generated_by", "id", "month", "status") SELECT "approved_at", "approved_by", "generated_at", "generated_by", "id", "month", "status" FROM "monthly_reports";
DROP TABLE "monthly_reports";
ALTER TABLE "new_monthly_reports" RENAME TO "monthly_reports";
CREATE UNIQUE INDEX "monthly_reports_month_key" ON "monthly_reports"("month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
