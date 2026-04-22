CREATE TABLE "reward_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "min_sats" INTEGER NOT NULL,
  "max_sats" INTEGER NOT NULL,
  "effective_from" DATETIME NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT NOT NULL
);

-- Seed with current values
INSERT INTO "reward_settings" ("id", "min_sats", "max_sats", "effective_from", "created_by")
VALUES ('00000000-0000-0000-0000-000000000001', 3000, 10000, '2020-01-01T00:00:00.000Z', 'system');
