-- Excuse reasons no longer stored as a DB enum (free-text column), so merging/renaming
-- existing options is a plain backfill -- reason strings drive both the label and the
-- flag color shown on the Attendance Analytics chart, both derived at render time.
UPDATE "excused_sessions" SET "reason" = 'Programme closed by management decision / Public holiday'
  WHERE "reason" IN ('Facility Closed', 'Public Holiday');
UPDATE "excused_sessions" SET "reason" = 'Unfavorable weather or ocean conditions' WHERE "reason" = 'Weather Conditions';
UPDATE "excused_sessions" SET "reason" = 'Attendance not taken' WHERE "reason" = 'Attendance Skipped';
UPDATE "excused_sessions" SET "reason" = 'Technical issue' WHERE "reason" = 'Technical Issue';
