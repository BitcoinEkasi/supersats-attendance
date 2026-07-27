-- CreateTable
CREATE TABLE "participant_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participant_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "participant_notes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Data fix: Notes used to be a single overwritable text field on Participant.
-- Carry forward any existing text as one entry per participant so nothing is
-- lost, dated by "updated_at" (the closest honest proxy we have for when it
-- was last written, since there was no per-field timestamp before this).
INSERT INTO "participant_notes" ("id", "participant_id", "text", "created_at")
SELECT lower(hex(randomblob(16))), "id", "notes", "updated_at"
FROM "participants"
WHERE "notes" IS NOT NULL AND trim("notes") != '';

-- AlterTable
ALTER TABLE "participants" DROP COLUMN "notes";
