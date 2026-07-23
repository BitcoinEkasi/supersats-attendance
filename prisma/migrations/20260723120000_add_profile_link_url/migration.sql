-- AlterTable
ALTER TABLE "participants" ADD COLUMN "profile_link_url" TEXT;

-- Data fix: `profile_picture` was overloaded to also hold a manually-pasted
-- reference link (e.g. a Google Drive folder), which collided with and
-- clobbered real uploaded photos (always stored under "/uploads/...").
-- Move anything that isn't an uploaded photo path into the new column.
UPDATE "participants"
SET "profile_link_url" = "profile_picture",
    "profile_picture" = NULL
WHERE "profile_picture" IS NOT NULL
  AND "profile_picture" NOT LIKE '/uploads/%';
