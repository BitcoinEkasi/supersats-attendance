-- CreateTable
CREATE TABLE "assistant_coach_periods" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "participant_id" TEXT NOT NULL,
  "started_at" DATETIME NOT NULL,
  "ended_at" DATETIME,
  "created_by" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_coach_periods_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "assistant_coach_periods_participant_id_idx" ON "assistant_coach_periods"("participant_id");

-- Backfill: reconstruct one open period per currently-AC participant from their
-- existing assistant_coach_since — the best available starting point, since AC
-- status/history wasn't tracked with start+end dates before this table existed.
INSERT INTO "assistant_coach_periods" ("id", "participant_id", "started_at", "ended_at", "created_by", "created_at")
SELECT lower(hex(randomblob(16))), "id", "assistant_coach_since", NULL, 'system-backfill', CURRENT_TIMESTAMP
FROM "participants"
WHERE "is_assistant_coach" = 1 AND "assistant_coach_since" IS NOT NULL;
