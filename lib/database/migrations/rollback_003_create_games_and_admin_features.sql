-- Rollback Migration: Drop Games and Admin Dashboard Features
-- Created: 2025-08-17
-- Description: Rollback for migration 003 - removes all tables and functions created for games and admin dashboard

-- Drop functions first
DROP FUNCTION IF EXISTS generate_game_share_token();
DROP FUNCTION IF EXISTS cleanup_old_data();
DROP FUNCTION IF EXISTS get_player_analytics(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_dashboard_data(UUID);
DROP FUNCTION IF EXISTS get_game_statistics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS game_results;
DROP TABLE IF EXISTS game_registrations;
DROP TABLE IF EXISTS games;

-- Note: UUID extension is kept as it may be used by other tables