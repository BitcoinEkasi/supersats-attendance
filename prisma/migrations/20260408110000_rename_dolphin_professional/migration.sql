-- Rename "Dolphin Professional" to "Shark Elite" across all tables
UPDATE "participants" SET "tsk_status" = 'Shark Elite' WHERE "tsk_status" = 'Dolphin Professional';
UPDATE "tsk_level_history" SET "level" = 'Shark Elite' WHERE "level" = 'Dolphin Professional';
