-- TSK Attendance no longer fires on a Marshal's "Submit" tap; submittedAt is unused now.
ALTER TABLE "events" DROP COLUMN "submitted_at";

-- TSK Attendance moves onto the scheduler, alongside Zero Attendance. It needs its own
-- slots (sharing ZERO_ATTENDANCE's slots would break the per-slot "already sent today"
-- claim -- only one of the two email types would ever win it on a given day), seeded to
-- start at whatever Zero Attendance is *currently* configured to, not a hardcoded default.
INSERT INTO "email_schedules" ("id", "slot", "hour", "minute", "updated_at")
SELECT lower(hex(randomblob(16))), 'TSK_ATTENDANCE_WEEKDAY', "hour", "minute", CURRENT_TIMESTAMP
FROM "email_schedules" WHERE "slot" = 'ZERO_ATTENDANCE_WEEKDAY';

INSERT INTO "email_schedules" ("id", "slot", "hour", "minute", "updated_at")
SELECT lower(hex(randomblob(16))), 'TSK_ATTENDANCE_SATURDAY', "hour", "minute", CURRENT_TIMESTAMP
FROM "email_schedules" WHERE "slot" = 'ZERO_ATTENDANCE_SATURDAY';
