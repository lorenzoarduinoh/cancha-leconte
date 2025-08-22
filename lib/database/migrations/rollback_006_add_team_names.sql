-- Rollback Migration: Remove Team Names from Games Table
-- Created: 2025-08-21
-- Description: Rollback script to remove team_a_name and team_b_name columns and related functionality

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_log_team_name_changes ON games;

-- Drop the trigger function
DROP FUNCTION IF EXISTS log_team_name_changes();

-- Drop the validation function
DROP FUNCTION IF EXISTS validate_team_names(VARCHAR(50), VARCHAR(50));

-- Drop the indexes
DROP INDEX IF EXISTS idx_games_team_a_name;
DROP INDEX IF EXISTS idx_games_team_b_name;

-- Drop the constraints (need to drop them individually)
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_team_names_different;
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_team_a_name_not_empty;
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_team_b_name_not_empty;
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_team_a_name_length;
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_team_b_name_length;

-- Remove the columns
ALTER TABLE games DROP COLUMN IF EXISTS team_a_name;
ALTER TABLE games DROP COLUMN IF EXISTS team_b_name;

-- Clean up any audit log entries related to team name changes
DELETE FROM admin_audit_log 
WHERE action_type = 'update_team_names' 
  AND entity_type = 'games';

-- Note: If you had any views or other database objects that depend on these columns,
-- you would need to drop and recreate them here as well.