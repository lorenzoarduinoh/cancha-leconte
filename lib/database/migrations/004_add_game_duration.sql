-- Migration: Add game_duration_minutes field to games table
-- Created: 2025-08-19
-- Description: Add duration field for automatic game status management

-- Add game_duration_minutes column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS game_duration_minutes INTEGER DEFAULT 90 CHECK (game_duration_minutes >= 15 AND game_duration_minutes <= 300);

-- Add comment to explain the column
COMMENT ON COLUMN games.game_duration_minutes IS 'Duration of the game in minutes (default 90 for soccer)';

-- Create index for potential status queries based on duration
CREATE INDEX IF NOT EXISTS idx_games_duration ON games(game_duration_minutes);

-- Update existing games to have the default duration
UPDATE games 
SET game_duration_minutes = 90 
WHERE game_duration_minutes IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE games ALTER COLUMN game_duration_minutes SET NOT NULL;
