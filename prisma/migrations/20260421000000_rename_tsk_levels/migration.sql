-- Update participants.tsk_status
UPDATE "participants" SET "tsk_status" = 'Turtle L1'  WHERE "tsk_status" = 'Turtle Rookie';
UPDATE "participants" SET "tsk_status" = 'Turtle L2'  WHERE "tsk_status" = 'Turtle Novice';
UPDATE "participants" SET "tsk_status" = 'Seal L3'    WHERE "tsk_status" = 'Seal Intermediate';
UPDATE "participants" SET "tsk_status" = 'Seal L4'    WHERE "tsk_status" = 'Seal Proficient';
UPDATE "participants" SET "tsk_status" = 'Dolphin L5' WHERE "tsk_status" = 'Dolphin Advanced';
UPDATE "participants" SET "tsk_status" = 'Dolphin L6' WHERE "tsk_status" = 'Dolphin Refined';
UPDATE "participants" SET "tsk_status" = 'Shark L7'   WHERE "tsk_status" = 'Shark Elite';

-- Update tsk_level_history.level
UPDATE "tsk_level_history" SET "level" = 'Turtle L1'  WHERE "level" = 'Turtle Rookie';
UPDATE "tsk_level_history" SET "level" = 'Turtle L2'  WHERE "level" = 'Turtle Novice';
UPDATE "tsk_level_history" SET "level" = 'Seal L3'    WHERE "level" = 'Seal Intermediate';
UPDATE "tsk_level_history" SET "level" = 'Seal L4'    WHERE "level" = 'Seal Proficient';
UPDATE "tsk_level_history" SET "level" = 'Dolphin L5' WHERE "level" = 'Dolphin Advanced';
UPDATE "tsk_level_history" SET "level" = 'Dolphin L6' WHERE "level" = 'Dolphin Refined';
UPDATE "tsk_level_history" SET "level" = 'Shark L7'   WHERE "level" = 'Shark Elite';
