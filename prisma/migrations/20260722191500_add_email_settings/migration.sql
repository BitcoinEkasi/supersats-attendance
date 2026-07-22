-- Admin-configurable email recipients and send-time schedule for the Zero Attendance
-- and TSK Pulse (formerly TSK Daily Digest) automated emails.

-- CreateTable
CREATE TABLE "email_recipients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "email_recipients_email_key" ON "email_recipients"("email");

-- CreateTable
CREATE TABLE "email_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "last_sent_date" TEXT,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "email_schedules_slot_key" ON "email_schedules"("slot");

-- Seed the 4 schedule slots with the values matching the current hardcoded cron times,
-- so behavior is unchanged until an admin edits something via the new settings UI.
INSERT INTO "email_schedules" ("id", "slot", "hour", "minute", "updated_at") VALUES
    ('731c5ff9-ac7d-4356-862c-57d036871648', 'ZERO_ATTENDANCE_WEEKDAY', 15, 0, CURRENT_TIMESTAMP),
    ('143b55e9-25c5-4231-9ea0-10d8e84d26fd', 'ZERO_ATTENDANCE_SATURDAY', 10, 0, CURRENT_TIMESTAMP),
    ('00bc525c-5087-4901-8389-204eb91db21c', 'TSK_PULSE_WEEKDAY', 19, 0, CURRENT_TIMESTAMP),
    ('81c29e5f-f482-428d-a05b-7fd121c6e433', 'TSK_PULSE_SATURDAY', 19, 0, CURRENT_TIMESTAMP);
