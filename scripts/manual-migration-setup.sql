-- Manual Migration for WhatsApp Notification System
-- Run this script directly in Supabase SQL Editor

-- 1. Add columns to game_registrations table
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS registration_token VARCHAR(255) UNIQUE;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS notification_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (notification_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. Add columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES game_registrations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_params JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_registrations_token ON game_registrations(registration_token);
CREATE INDEX IF NOT EXISTS idx_notifications_registration_id ON notifications(registration_id);
CREATE INDEX IF NOT EXISTS idx_notifications_next_retry ON notifications(next_retry_at);

-- 4. Create WhatsApp templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    language_code VARCHAR(10) DEFAULT 'es' NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    template_body TEXT NOT NULL,
    template_params JSONB,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert default templates
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

-- 6. Create token generation function
CREATE OR REPLACE FUNCTION generate_registration_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- 7. Update existing registrations with tokens
UPDATE game_registrations 
SET registration_token = generate_registration_token() 
WHERE registration_token IS NULL;