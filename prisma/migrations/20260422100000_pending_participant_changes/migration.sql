CREATE TABLE "pending_participant_changes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "participant_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "old_value" TEXT,
  "new_value" TEXT,
  "effective_from" DATETIME NOT NULL,
  "applied_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL,
  CONSTRAINT "pending_participant_changes_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE("participant_id", "field")
);
