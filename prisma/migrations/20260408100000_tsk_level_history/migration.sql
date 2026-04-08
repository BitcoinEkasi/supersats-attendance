CREATE TABLE "tsk_level_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "participant_id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "changed_at" DATETIME NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE
);

-- Backfill one entry for participants who already have a tskStatus
INSERT INTO "tsk_level_history" ("id", "participant_id", "level", "changed_at")
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
       "id", "tsk_status", COALESCE("tsk_status_updated_at", "created_at")
FROM "participants"
WHERE "tsk_status" IS NOT NULL;
