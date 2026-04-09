CREATE TABLE "junior_coach_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "participant_id" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "started_at" DATETIME NOT NULL,
  "ended_at" DATETIME,
  "end_reason" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "junior_coach_history_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "junior_coach_history_participant_id_idx" ON "junior_coach_history"("participant_id");
