-- Migration 005: Add WhatsApp Notification System
-- This migration adds all necessary tables and columns for the WhatsApp notification system

-- 1. Add new columns to game_registrations table
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS registration_token VARCHAR(255) UNIQUE;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS notification_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (notification_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Create index for registration token lookups
CREATE INDEX IF NOT EXISTS idx_registrations_token ON game_registrations(registration_token);

-- 2. Add new columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES game_registrations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_params JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_registration_id ON notifications(registration_id);
CREATE INDEX IF NOT EXISTS idx_notifications_next_retry ON notifications(next_retry_at);

-- 3. Create WhatsApp message templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    template_id VARCHAR(255) NOT NULL, -- WhatsApp template ID
    language_code VARCHAR(10) DEFAULT 'es' NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    template_body TEXT NOT NULL,
    template_params JSONB, -- Parameter definitions
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO whatsapp_templates (name, template_id, category, template_body, template_params) VALUES
('registration_confirmation', 'cancha_leconte_registration', 'UTILITY', 
 '¡Hola {{1}}! Te registraste exitosamente para "{{2}}" el {{3}}. Gestiona tu inscripción: {{4}}', 
 '{"1": "player_name", "2": "game_title", "3": "game_date", "4": "management_url"}'),
('waiting_list_notification', 'cancha_leconte_waiting_list', 'UTILITY',
 '¡Hola {{1}}! Estás en lista de espera (#{{2}}) para "{{3}}". Te notificaremos si se libera lugar: {{4}}',
 '{"1": "player_name", "2": "position", "3": "game_title", "4": "management_url"}'),
('game_reminder', 'cancha_leconte_reminder', 'UTILITY',
 '¡Hola {{1}}! Recordatorio: "{{2}}" es en 1 hora ({{3}}). Ubicación: {{4}}',
 '{"1": "player_name", "2": "game_title", "3": "game_time", "4": "location"}'),
('cancellation_confirmation', 'cancha_leconte_cancellation', 'UTILITY',
 '¡Hola {{1}}! Tu inscripción para "{{2}}" ha sido cancelada exitosamente. Motivo: {{3}}',
 '{"1": "player_name", "2": "game_title", "3": "reason"}'),
('waiting_list_promotion', 'cancha_leconte_promotion', 'UTILITY',
 '¡Buenas noticias {{1}}! Se liberó un lugar en "{{2}}". Ahora estás confirmado: {{3}}',
 '{"1": "player_name", "2": "game_title", "3": "management_url"}')
ON CONFLICT (name) DO NOTHING;

-- 4. Create function to generate secure registration tokens
CREATE OR REPLACE FUNCTION generate_registration_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically generate registration tokens for new registrations
CREATE OR REPLACE FUNCTION auto_generate_registration_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.registration_token IS NULL THEN
        NEW.registration_token := generate_registration_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_auto_generate_registration_token'
    ) THEN
        CREATE TRIGGER trg_auto_generate_registration_token
            BEFORE INSERT ON game_registrations
            FOR EACH ROW EXECUTE FUNCTION auto_generate_registration_token();
    END IF;
END $$;

-- 6. Update existing registrations to have registration tokens
UPDATE game_registrations 
SET registration_token = generate_registration_token() 
WHERE registration_token IS NULL;

-- 7. Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_game_registrations_notification_status ON game_registrations(notification_status);
CREATE INDEX IF NOT EXISTS idx_game_registrations_cancelled_at ON game_registrations(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);

-- 8. Create view for personal registration details
CREATE OR REPLACE VIEW personal_registration_details AS
SELECT 
    gr.id,
    gr.registration_token,
    gr.player_name,
    gr.player_phone,
    gr.registered_at,
    gr.payment_status,
    gr.payment_amount,
    gr.team_assignment,
    gr.notification_status,
    gr.notification_sent_at,
    gr.cancellation_reason,
    gr.cancelled_at,
    g.id as game_id,
    g.title as game_title,
    g.description as game_description,
    g.game_date,
    g.min_players,
    g.max_players,
    g.field_cost_per_player,
    g.game_duration_minutes,
    g.status as game_status,
    -- Calculate position in waiting list if applicable
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM game_registrations gr2 
            WHERE gr2.game_id = g.id 
            AND gr2.payment_status != 'refunded'
        ) > g.max_players THEN
            CASE
                WHEN (
                    SELECT COUNT(*) 
                    FROM game_registrations gr3 
                    WHERE gr3.game_id = g.id 
                    AND gr3.payment_status != 'refunded'
                    AND gr3.registered_at < gr.registered_at
                ) + 1 > g.max_players THEN
                    (
                        SELECT COUNT(*) 
                        FROM game_registrations gr3 
                        WHERE gr3.game_id = g.id 
                        AND gr3.payment_status != 'refunded'
                        AND gr3.registered_at < gr.registered_at
                    ) - g.max_players + 1
                ELSE NULL
            END
        ELSE NULL
    END as waiting_list_position,
    -- Calculate if player is confirmed or on waiting list
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM game_registrations gr2 
            WHERE gr2.game_id = g.id 
            AND gr2.payment_status != 'refunded'
            AND gr2.registered_at < gr.registered_at
        ) + 1 <= g.max_players THEN 'confirmed'
        ELSE 'waiting_list'
    END as registration_status,
    -- Calculate current players count
    (
        SELECT COUNT(*) 
        FROM game_registrations gr2 
        WHERE gr2.game_id = g.id 
        AND gr2.payment_status != 'refunded'
    ) as current_players
FROM game_registrations gr
JOIN games g ON gr.game_id = g.id
WHERE gr.payment_status != 'refunded';

COMMENT ON VIEW personal_registration_details IS 'View for accessing personal registration information with calculated status and position';

-- 9. Create function to validate registration tokens
CREATE OR REPLACE FUNCTION validate_registration_token(token_input VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic format validation (64 characters for hex encoded 32 bytes)
    IF LENGTH(token_input) != 64 THEN
        RETURN FALSE;
    END IF;
    
    -- Check for valid hex characters
    IF token_input !~ '^[0-9a-f]{64}$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Add comments for documentation
COMMENT ON COLUMN game_registrations.registration_token IS 'Unique token for personal registration management access';
COMMENT ON COLUMN game_registrations.notification_sent_at IS 'Timestamp when WhatsApp notification was sent';
COMMENT ON COLUMN game_registrations.notification_status IS 'Status of WhatsApp notification delivery';
COMMENT ON COLUMN game_registrations.cancellation_reason IS 'Reason provided when registration was cancelled';
COMMENT ON COLUMN game_registrations.cancelled_at IS 'Timestamp when registration was cancelled';

COMMENT ON COLUMN notifications.registration_id IS 'Link to specific registration for notification tracking';
COMMENT ON COLUMN notifications.template_name IS 'WhatsApp template name used for this notification';
COMMENT ON COLUMN notifications.template_params IS 'JSON parameters passed to WhatsApp template';
COMMENT ON COLUMN notifications.retry_count IS 'Number of retry attempts for failed notifications';
COMMENT ON COLUMN notifications.next_retry_at IS 'Scheduled time for next retry attempt';

COMMENT ON TABLE whatsapp_templates IS 'WhatsApp message templates with approval status';
COMMENT ON FUNCTION generate_registration_token() IS 'Generates cryptographically secure registration tokens';
COMMENT ON FUNCTION validate_registration_token(VARCHAR) IS 'Validates registration token format';