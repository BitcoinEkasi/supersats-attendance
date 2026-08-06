-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "principal_name" TEXT,
    "principal_contact" TEXT,
    "principal_email" TEXT,
    "secretary_name" TEXT,
    "secretary_contact" TEXT,
    "secretary_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_name_key" ON "schools"("name");

-- AlterTable
ALTER TABLE "participants" ADD COLUMN "school_notes" TEXT;

-- Data fix: School used to be a hardcoded dropdown list of 5 names baked into
-- the React forms. Seed those same 5 as real School rows so every existing
-- participant's free-text "school" value still resolves to a real entry in
-- the new admin-managed list. Contact details are unknown at migration time
-- and left null for an administrator to fill in via the School Details tab.
INSERT INTO "schools" ("id", "name", "created_at", "updated_at", "created_by")
VALUES
    (lower(hex(randomblob(16))), 'Indwe Secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'),
    (lower(hex(randomblob(16))), 'TM Ndanda', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'),
    (lower(hex(randomblob(16))), 'Hillcrest', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'),
    (lower(hex(randomblob(16))), 'Sao Bras', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'),
    (lower(hex(randomblob(16))), 'Milkwood', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration');
