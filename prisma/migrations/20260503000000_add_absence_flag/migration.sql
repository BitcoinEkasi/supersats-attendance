-- CreateTable
CREATE TABLE "absence_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participant_id" TEXT NOT NULL,
    "consecutive_missed" INTEGER NOT NULL,
    "group" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "absence_flags_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "absence_flags_participant_id_key" ON "absence_flags"("participant_id");
