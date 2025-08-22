-- Rollback Migration: Remove game_duration_minutes field from games table
-- Created: 2025-08-19
-- Description: Rollback for adding duration field

-- Drop the index
DROP INDEX IF EXISTS idx_games_duration;

-- Remove the game_duration_minutes column
ALTER TABLE games DROP COLUMN IF EXISTS game_duration_minutes;