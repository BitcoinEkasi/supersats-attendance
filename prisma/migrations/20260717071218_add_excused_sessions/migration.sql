-- CreateTable
CREATE TABLE "excused_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "group" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reason_other" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "excused_sessions_date_group_key" ON "excused_sessions"("date", "group");
