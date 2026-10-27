-- AlterTable
ALTER TABLE "monthly_reports" ADD COLUMN "penalty_percent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "monthly_reports" ADD COLUMN "penalty_reason" TEXT;
ALTER TABLE "monthly_reports" ADD COLUMN "penalty_by" TEXT;
ALTER TABLE "monthly_reports" ADD COLUMN "penalty_at" DATETIME;

-- AlterTable
ALTER TABLE "monthly_report_entries" ADD COLUMN "gross_reward_sats" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing entries were never penalised, so gross == final
UPDATE "monthly_report_entries" SET "gross_reward_sats" = "reward_sats";
