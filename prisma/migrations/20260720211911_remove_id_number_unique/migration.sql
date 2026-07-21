-- Retirement policy change: idNumber is no longer globally unique, so a genuine
-- rejoining participant (same SA ID number) can be added as a brand-new record
-- once their old record is retired. Uniqueness among ACTIVE participants only is
-- now enforced at the application level (see src/app/api/participants/route.ts
-- and src/app/api/participants/[id]/route.ts).

-- DropIndex
DROP INDEX "participants_id_number_key";

-- CreateIndex
CREATE INDEX "participants_id_number_idx" ON "participants"("id_number");
