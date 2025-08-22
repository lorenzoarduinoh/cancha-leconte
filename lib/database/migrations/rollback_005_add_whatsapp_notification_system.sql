-- Rollback Migration 005: Remove WhatsApp Notification System
-- This migration removes all changes made by migration 005

-- 1. Drop the view
DROP VIEW IF EXISTS personal_registration_details;

-- 2. Drop functions
DROP FUNCTION IF EXISTS validate_registration_token(VARCHAR);
DROP FUNCTION IF EXISTS generate_registration_token();
DROP FUNCTION IF EXISTS auto_generate_registration_token();

-- 3. Drop trigger
DROP TRIGGER IF EXISTS trg_auto_generate_registration_token ON game_registrations;

-- 4. Drop indexes created in migration 005
DROP INDEX IF EXISTS idx_game_registrations_notification_status;
DROP INDEX IF EXISTS idx_game_registrations_cancelled_at;
DROP INDEX IF EXISTS idx_whatsapp_templates_name;
DROP INDEX IF EXISTS idx_whatsapp_templates_status;
DROP INDEX IF EXISTS idx_registrations_token;
DROP INDEX IF EXISTS idx_notifications_registration_id;
DROP INDEX IF EXISTS idx_notifications_next_retry;

-- 5. Drop whatsapp_templates table
DROP TABLE IF EXISTS whatsapp_templates;

-- 6. Remove columns from notifications table
ALTER TABLE notifications DROP COLUMN IF EXISTS registration_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS template_name;
ALTER TABLE notifications DROP COLUMN IF EXISTS template_params;
ALTER TABLE notifications DROP COLUMN IF EXISTS retry_count;
ALTER TABLE notifications DROP COLUMN IF EXISTS next_retry_at;

-- 7. Remove columns from game_registrations table
ALTER TABLE game_registrations DROP COLUMN IF EXISTS registration_token;
ALTER TABLE game_registrations DROP COLUMN IF EXISTS notification_sent_at;
ALTER TABLE game_registrations DROP COLUMN IF EXISTS notification_status;
ALTER TABLE game_registrations DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE game_registrations DROP COLUMN IF EXISTS cancelled_at;