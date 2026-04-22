ALTER TABLE "participants" ADD COLUMN "is_assistant_coach" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "participants" ADD COLUMN "assistant_coach_since" DATETIME;
ALTER TABLE "participants" DROP COLUMN "is_junior_coach";
ALTER TABLE "participants" DROP COLUMN "junior_coach_level";
DROP TABLE IF EXISTS "junior_coach_history";
