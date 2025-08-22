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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runSimpleMigration() {
  console.log('🚀 Starting simple team names migration...');
  
  try {
    // Step 1: Add columns (this is the critical step)
    console.log('📝 Step 1: Adding team name columns...');
    
    // Use direct SQL query approach
    const addColumnsQuery = `
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS team_a_name VARCHAR(50) DEFAULT 'Equipo A' NOT NULL,
      ADD COLUMN IF NOT EXISTS team_b_name VARCHAR(50) DEFAULT 'Equipo B' NOT NULL;
    `;
    
    // We need to execute this directly via the SQL editor or use a different approach
    console.log('SQL to execute in Supabase SQL Editor:');
    console.log('=====================================');
    console.log(addColumnsQuery);
    console.log('=====================================');
    
    // Test if columns exist by trying to query them
    console.log('🔍 Testing if team name columns exist...');
    
    const { data: testData, error: testError } = await supabase
      .from('games')
      .select('team_a_name, team_b_name')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('does not exist')) {
        console.log('❌ Team name columns do not exist yet.');
        console.log('📋 Please execute the following SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('-- Add team name columns to games table');
        console.log(addColumnsQuery);
        console.log('');
        console.log('-- Add constraints');
        console.log(`
ALTER TABLE games 
ADD CONSTRAINT IF NOT EXISTS check_team_a_name_length CHECK (LENGTH(team_a_name) BETWEEN 2 AND 50),
ADD CONSTRAINT IF NOT EXISTS check_team_b_name_length CHECK (LENGTH(team_b_name) BETWEEN 2 AND 50),
ADD CONSTRAINT IF NOT EXISTS check_team_a_name_not_empty CHECK (LENGTH(TRIM(team_a_name)) >= 2),
ADD CONSTRAINT IF NOT EXISTS check_team_b_name_not_empty CHECK (LENGTH(TRIM(team_b_name)) >= 2),
ADD CONSTRAINT IF NOT EXISTS check_team_names_different CHECK (team_a_name != team_b_name);
        `);
        console.log('');
        console.log('-- Update existing games to have default team names');
        console.log(`
UPDATE games 
SET 
  team_a_name = COALESCE(team_a_name, 'Equipo A'),
  team_b_name = COALESCE(team_b_name, 'Equipo B')
WHERE team_a_name IS NULL OR team_b_name IS NULL;
        `);
        console.log('');
        console.log('Then run this script again to verify the migration.');
      } else {
        console.error('❌ Unexpected error:', testError);
      }
    } else {
      console.log('✅ Team name columns already exist!');
      console.log('📊 Sample data:', testData);
      
      // Test creating a game with custom team names via API
      console.log('🧪 Testing team name functionality...');
      
      const testGame = {
        title: 'Test Game - Team Names',
        description: 'Testing team name functionality',
        game_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        min_players: 4,
        max_players: 10,
        field_cost_per_player: 1000,
        team_a_name: 'Los Tigres',
        team_b_name: 'Los Leones',
        created_by: 'mock-admin-id', // This would be real admin ID in production
      };
      
      const { data: createdGame, error: createError } = await supabase
        .from('games')
        .insert(testGame)
        .select('id, title, team_a_name, team_b_name')
        .single();
      
      if (createError) {
        console.error('❌ Error creating test game:', createError);
      } else {
        console.log('✅ Test game created successfully:', createdGame);
        
        // Clean up test game
        await supabase
          .from('games')
          .delete()
          .eq('id', createdGame.id);
          
        console.log('🧹 Test game cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runSimpleMigration();