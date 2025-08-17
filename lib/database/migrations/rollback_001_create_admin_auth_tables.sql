-- Rollback Migration: Create Admin Authentication Tables
-- Created: 2025-08-17
-- Description: Rollback script to remove admin authentication tables and functions

-- Drop policies first
DROP POLICY IF EXISTS "Admin users access via service role" ON admin_users;
DROP POLICY IF EXISTS "Admin sessions access via service role" ON admin_sessions;
DROP POLICY IF EXISTS "Login attempts access via service role" ON login_attempts;

-- Drop triggers
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
DROP TRIGGER IF EXISTS update_admin_sessions_updated_at ON admin_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS cleanup_old_login_attempts();
DROP FUNCTION IF EXISTS get_recent_login_attempts(INET, INTEGER);

-- Drop indexes
DROP INDEX IF EXISTS idx_admin_users_email;
DROP INDEX IF EXISTS idx_admin_users_active;
DROP INDEX IF EXISTS idx_admin_sessions_user_id;
DROP INDEX IF EXISTS idx_admin_sessions_token;
DROP INDEX IF EXISTS idx_admin_sessions_expires;
DROP INDEX IF EXISTS idx_login_attempts_ip;
DROP INDEX IF EXISTS idx_login_attempts_time;
DROP INDEX IF EXISTS idx_login_attempts_ip_time;

-- Drop tables (in reverse order of creation due to foreign keys)
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_users;