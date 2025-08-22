-- Migration: Add Team Names to Games Table
-- Created: 2025-08-21
-- Description: Add team_a_name and team_b_name columns to games table for custom team naming functionality

-- Add team name columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS team_a_name VARCHAR(50) DEFAULT 'Equipo A' NOT NULL,
ADD COLUMN IF NOT EXISTS team_b_name VARCHAR(50) DEFAULT 'Equipo B' NOT NULL;

-- Add constraints for team names
ALTER TABLE games 
ADD CONSTRAINT check_team_a_name_length CHECK (LENGTH(team_a_name) BETWEEN 2 AND 50),
ADD CONSTRAINT check_team_b_name_length CHECK (LENGTH(team_b_name) BETWEEN 2 AND 50);

-- Add constraints to ensure team names are not empty after trimming
ALTER TABLE games 
ADD CONSTRAINT check_team_a_name_not_empty CHECK (LENGTH(TRIM(team_a_name)) >= 2),
ADD CONSTRAINT check_team_b_name_not_empty CHECK (LENGTH(TRIM(team_b_name)) >= 2);

-- Add constraint to ensure team names are different
ALTER TABLE games 
ADD CONSTRAINT check_team_names_different CHECK (team_a_name != team_b_name);

-- Create index for team names (useful for searching/filtering)
CREATE INDEX IF NOT EXISTS idx_games_team_a_name ON games(team_a_name);
CREATE INDEX IF NOT EXISTS idx_games_team_b_name ON games(team_b_name);

-- Add comment to the table to document the new columns
COMMENT ON COLUMN games.team_a_name IS 'Custom name for Team A (2-50 characters, default: "Equipo A")';
COMMENT ON COLUMN games.team_b_name IS 'Custom name for Team B (2-50 characters, default: "Equipo B")';

-- Function to validate team names (useful for application-level validation)
CREATE OR REPLACE FUNCTION validate_team_names(
    p_team_a_name VARCHAR(50),
    p_team_b_name VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check length constraints
    IF LENGTH(p_team_a_name) < 2 OR LENGTH(p_team_a_name) > 50 THEN
        RETURN FALSE;
    END IF;
    
    IF LENGTH(p_team_b_name) < 2 OR LENGTH(p_team_b_name) > 50 THEN
        RETURN FALSE;
    END IF;
    
    -- Check trimmed length
    IF LENGTH(TRIM(p_team_a_name)) < 2 OR LENGTH(TRIM(p_team_b_name)) < 2 THEN
        RETURN FALSE;
    END IF;
    
    -- Check that names are different
    IF p_team_a_name = p_team_b_name THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update existing games to have default team names if somehow they don't
UPDATE games 
SET 
    team_a_name = COALESCE(team_a_name, 'Equipo A'),
    team_b_name = COALESCE(team_b_name, 'Equipo B')
WHERE team_a_name IS NULL OR team_b_name IS NULL;

-- Add audit logging for team name changes
-- This function will be triggered on updates to log team name changes
CREATE OR REPLACE FUNCTION log_team_name_changes()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Only log if team names actually changed
    IF OLD.team_a_name != NEW.team_a_name OR OLD.team_b_name != NEW.team_b_name THEN
        -- Try to get admin ID from context, if not available, skip logging
        BEGIN
            admin_id := NULLIF(current_setting('app.current_admin_id', true), '')::UUID;
        EXCEPTION WHEN OTHERS THEN
            admin_id := NULL;
        END;
        
        -- Only insert if we have a valid admin_id, otherwise skip logging
        IF admin_id IS NOT NULL THEN
            -- Check if admin exists before logging
            IF EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id) THEN
                INSERT INTO admin_audit_log (
                    admin_user_id,
                    action_type,
                    entity_type,
                    entity_id,
                    action_details,
                    ip_address,
                    user_agent
                ) VALUES (
                    admin_id,
                    'update_team_names',
                    'games',
                    NEW.id,
                    jsonb_build_object(
                        'old_team_a_name', OLD.team_a_name,
                        'new_team_a_name', NEW.team_a_name,
                        'old_team_b_name', OLD.team_b_name,
                        'new_team_b_name', NEW.team_b_name,
                        'updated_at', NEW.updated_at
                    ),
                    -- IP and user agent should be set by application
                    NULLIF(current_setting('app.current_ip', true), '')::INET,
                    NULLIF(current_setting('app.current_user_agent', true), '')
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team name changes audit logging
DROP TRIGGER IF EXISTS trigger_log_team_name_changes ON games;
CREATE TRIGGER trigger_log_team_name_changes
    AFTER UPDATE ON games
    FOR EACH ROW
    WHEN (OLD.team_a_name != NEW.team_a_name OR OLD.team_b_name != NEW.team_b_name)
    EXECUTE FUNCTION log_team_name_changes();

-- Grant necessary permissions (assuming service role has full access)
-- These are mainly for documentation as service role typically has full access
GRANT SELECT, UPDATE ON games TO service_role;
GRANT EXECUTE ON FUNCTION validate_team_names(VARCHAR(50), VARCHAR(50)) TO service_role;