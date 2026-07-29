-- Email recipients move from one flat global list to per-category lists (one per
-- TSK group plus a dedicated Zero Attendance list). Starting empty rather than
-- guessing which category each existing global recipient belongs in.
DELETE FROM "email_recipients";

-- RedefineTable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email_recipients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL
);
DROP TABLE "email_recipients";
ALTER TABLE "new_email_recipients" RENAME TO "email_recipients";
CREATE UNIQUE INDEX "email_recipients_category_email_key" ON "email_recipients"("category", "email");
PRAGMA foreign_keys=ON;

-- TSK Pulse is retired; only the two Zero Attendance schedule slots remain.
DELETE FROM "email_schedules" WHERE "slot" IN ('TSK_PULSE_WEEKDAY', 'TSK_PULSE_SATURDAY');
