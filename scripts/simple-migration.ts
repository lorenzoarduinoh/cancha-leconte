import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple table creation using individual operations
async function createTablesSimple() {
  console.log('🚀 Creating tables using simplified approach...');
  
  // Note: Since we can't run raw DDL through the client API, 
  // we'll need to create a basic structure that we can enhance later
  
  console.log('\n📋 Migration Instructions:');
  console.log('========================================');
  console.log('Please run the following SQL in your Supabase Dashboard:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste this SQL:');
  console.log('========================================\n');
  
  const sql = `
-- Enable UUID extension
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

-- Create admin_audit_log table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_registrations_game_id ON game_registrations(game_id);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON game_registrations(payment_status);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Public can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Admins can manage games" ON games FOR ALL USING (true);
CREATE POLICY "Public can read registrations" ON game_registrations FOR SELECT USING (true);
CREATE POLICY "Public can insert registrations" ON game_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage registrations" ON game_registrations FOR ALL USING (true);
CREATE POLICY "Admins can manage results" ON game_results FOR ALL USING (true);
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Admins can read audit log" ON admin_audit_log FOR SELECT USING (true);
`;

  console.log(sql);
  console.log('\n========================================');
  console.log('4. Click "Run" to execute the SQL');
  console.log('5. If successful, run: npm run db:check');
  console.log('========================================\n');
  
  // Try to detect if we can access the tables
  console.log('🔍 Checking current table status...');
  
  const tablesToCheck = ['games', 'game_registrations', 'game_results', 'notifications', 'admin_audit_log'];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table} - Not accessible: ${error.message}`);
      } else {
        console.log(`✅ ${table} - Table exists and accessible`);
      }
    } catch (e) {
      console.log(`❌ ${table} - Does not exist`);
    }
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Run the SQL above in Supabase Dashboard');
  console.log('2. Run: npm run db:check');
  console.log('3. If successful, proceed with frontend development');
}

createTablesSimple();