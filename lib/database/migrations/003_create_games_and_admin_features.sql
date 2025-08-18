-- Migration: Create Games and Admin Dashboard Features
-- Created: 2025-08-17
-- Description: Set up tables for games, registrations, notifications, results and admin dashboard functionality

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    game_date TIMESTAMP WITH TIME ZONE NOT NULL,
    min_players INTEGER NOT NULL CHECK (min_players > 0),
    max_players INTEGER NOT NULL CHECK (max_players >= min_players),
    field_cost_per_player DECIMAL(10,2) NOT NULL CHECK (field_cost_per_player > 0),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled')),
    share_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
    teams_assigned_at TIMESTAMP WITH TIME ZONE,
    results_recorded_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES admin_users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create game_registrations table
CREATE TABLE IF NOT EXISTS game_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    player_phone VARCHAR(20) NOT NULL,
    team_assignment VARCHAR(10) CHECK (team_assignment IN ('team_a', 'team_b')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id VARCHAR(255),
    payment_amount DECIMAL(10,2),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(game_id, player_phone)
);

-- Create game_results table
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    team_a_score INTEGER DEFAULT 0 CHECK (team_a_score >= 0),
    team_b_score INTEGER DEFAULT 0 CHECK (team_b_score >= 0),
    winning_team VARCHAR(10) CHECK (winning_team IN ('team_a', 'team_b', 'draw')),
    notes TEXT,
    recorded_by UUID REFERENCES admin_users(id) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    player_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('game_reminder', 'payment_request', 'payment_reminder', 'game_update', 'game_cancelled')),
    message_content TEXT NOT NULL,
    whatsapp_message_id VARCHAR(255),
    delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_audit_log table for tracking administrative actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_share_token ON games(share_token);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);

CREATE INDEX IF NOT EXISTS idx_registrations_game_id ON game_registrations(game_id);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON game_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON game_registrations(player_phone);

CREATE INDEX IF NOT EXISTS idx_results_game_id ON game_results(game_id);

CREATE INDEX IF NOT EXISTS idx_notifications_game_id ON notifications(game_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
CREATE POLICY "Admins can manage games" ON games FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public can read games via token" ON games FOR SELECT USING (true);

-- Create policies for game_registrations table
CREATE POLICY "Admins can manage registrations" ON game_registrations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public can register for games" ON game_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read registrations for games" ON game_registrations FOR SELECT USING (true);

-- Create policies for game_results table
CREATE POLICY "Admins can manage results" ON game_results FOR ALL USING (auth.role() = 'service_role');

-- Create policies for notifications table
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- Create policies for admin_audit_log table
CREATE POLICY "Admins can read audit log" ON admin_audit_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Admins can insert audit log" ON admin_audit_log FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create functions for game statistics and analytics

-- Function to get game statistics
CREATE OR REPLACE FUNCTION get_game_statistics(
    p_admin_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    total_games INTEGER,
    completed_games INTEGER,
    cancelled_games INTEGER,
    total_players INTEGER,
    unique_players INTEGER,
    total_revenue DECIMAL(10,2),
    pending_payments DECIMAL(10,2),
    average_players_per_game DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT g.id)::INTEGER as total_games,
        COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN g.id END)::INTEGER as completed_games,
        COUNT(DISTINCT CASE WHEN g.status = 'cancelled' THEN g.id END)::INTEGER as cancelled_games,
        COUNT(gr.id)::INTEGER as total_players,
        COUNT(DISTINCT gr.player_phone)::INTEGER as unique_players,
        COALESCE(SUM(CASE WHEN gr.payment_status = 'paid' THEN gr.payment_amount END), 0)::DECIMAL(10,2) as total_revenue,
        COALESCE(SUM(CASE WHEN gr.payment_status = 'pending' THEN gr.payment_amount END), 0)::DECIMAL(10,2) as pending_payments,
        COALESCE(AVG(g.player_count), 0)::DECIMAL(5,2) as average_players_per_game
    FROM games g
    LEFT JOIN game_registrations gr ON g.id = gr.game_id
    LEFT JOIN (
        SELECT game_id, COUNT(*) as player_count
        FROM game_registrations
        GROUP BY game_id
    ) pc ON g.id = pc.game_id
    WHERE 
        (p_admin_user_id IS NULL OR g.created_by = p_admin_user_id)
        AND (p_start_date IS NULL OR g.game_date >= p_start_date)
        AND (p_end_date IS NULL OR g.game_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard data
CREATE OR REPLACE FUNCTION get_dashboard_data(p_admin_user_id UUID)
RETURNS TABLE(
    active_games_count INTEGER,
    today_games_count INTEGER,
    pending_payments_count INTEGER,
    total_revenue_this_month DECIMAL(10,2),
    recent_registrations_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN g.status IN ('open', 'closed') THEN 1 END)::INTEGER as active_games_count,
        COUNT(CASE WHEN DATE(g.game_date) = CURRENT_DATE THEN 1 END)::INTEGER as today_games_count,
        COUNT(CASE WHEN gr.payment_status = 'pending' THEN 1 END)::INTEGER as pending_payments_count,
        COALESCE(SUM(
            CASE 
                WHEN gr.payment_status = 'paid' 
                AND DATE_TRUNC('month', gr.paid_at) = DATE_TRUNC('month', CURRENT_DATE)
                THEN gr.payment_amount 
            END
        ), 0)::DECIMAL(10,2) as total_revenue_this_month,
        COUNT(CASE WHEN gr.registered_at > CURRENT_DATE - INTERVAL '24 hours' THEN 1 END)::INTEGER as recent_registrations_count
    FROM games g
    LEFT JOIN game_registrations gr ON g.id = gr.game_id
    WHERE g.created_by = p_admin_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get player analytics
CREATE OR REPLACE FUNCTION get_player_analytics(
    p_admin_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    player_name VARCHAR(255),
    player_phone VARCHAR(20),
    total_games INTEGER,
    paid_games INTEGER,
    pending_payments INTEGER,
    total_paid DECIMAL(10,2),
    last_game_date TIMESTAMP WITH TIME ZONE,
    payment_reliability DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gr.player_name,
        gr.player_phone,
        COUNT(gr.id)::INTEGER as total_games,
        COUNT(CASE WHEN gr.payment_status = 'paid' THEN 1 END)::INTEGER as paid_games,
        COUNT(CASE WHEN gr.payment_status = 'pending' THEN 1 END)::INTEGER as pending_payments,
        COALESCE(SUM(CASE WHEN gr.payment_status = 'paid' THEN gr.payment_amount END), 0)::DECIMAL(10,2) as total_paid,
        MAX(g.game_date) as last_game_date,
        CASE 
            WHEN COUNT(gr.id) > 0 THEN 
                (COUNT(CASE WHEN gr.payment_status = 'paid' THEN 1 END)::DECIMAL / COUNT(gr.id)::DECIMAL * 100)
            ELSE 0 
        END::DECIMAL(5,2) as payment_reliability
    FROM game_registrations gr
    JOIN games g ON gr.game_id = g.id
    WHERE p_admin_user_id IS NULL OR g.created_by = p_admin_user_id
    GROUP BY gr.player_name, gr.player_phone
    ORDER BY COUNT(gr.id) DESC, MAX(g.game_date) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Cleanup old notifications (older than 6 months)
    DELETE FROM notifications 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Cleanup old audit logs (older than 1 year)
    DELETE FROM admin_audit_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure share tokens
CREATE OR REPLACE FUNCTION generate_game_share_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;