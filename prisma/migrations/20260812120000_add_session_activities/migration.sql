-- CreateTable
CREATE TABLE "session_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "restricted_to_group" TEXT,
    "requires_note" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "session_activities_name_key" ON "session_activities"("name");

-- Data fix: seed the 10 previously-hardcoded EventCategory enum values as real rows,
-- preserving their original order (marshals' dropdown order) via strictly increasing
-- created_at timestamps, and carrying forward the two behaviors that used to be
-- hardcoded to specific values — Sharks-only restriction and Other's required note —
-- as data on the seeded rows themselves, now editable like everything else. Existing
-- events.category values (stored as the old enum keys, e.g. "BEACH_CLEAN_UP") are left
-- untouched — they are historical snapshots and are never re-joined against this table.
INSERT INTO "session_activities" ("id", "name", "restricted_to_group", "requires_note", "created_at", "created_by")
VALUES
    (lower(hex(randomblob(16))), 'Surfing', NULL, false, '2026-01-01T00:00:00.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Fitness', NULL, false, '2026-01-01T00:00:01.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Skating', NULL, false, '2026-01-01T00:00:02.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Beach Clean Up', NULL, false, '2026-01-01T00:00:03.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Beach Activities', NULL, false, '2026-01-01T00:00:04.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Simulated Heats', 'SHARKS', false, '2026-01-01T00:00:05.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Video Analysis', 'SHARKS', false, '2026-01-01T00:00:06.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Mental Training', 'SHARKS', false, '2026-01-01T00:00:07.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Scoring Review', 'SHARKS', false, '2026-01-01T00:00:08.000Z', 'migration'),
    (lower(hex(randomblob(16))), 'Other', NULL, true, '2026-01-01T00:00:09.000Z', 'migration');
