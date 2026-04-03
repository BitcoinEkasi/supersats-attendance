CREATE TABLE "school_reports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "participant_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "term1_result" REAL,
  "term1_file_url" TEXT,
  "term2_result" REAL,
  "term2_file_url" TEXT,
  "term3_result" REAL,
  "term3_file_url" TEXT,
  "term4_result" REAL,
  "term4_file_url" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "school_reports_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "school_reports_participant_id_year_key" ON "school_reports"("participant_id", "year");
