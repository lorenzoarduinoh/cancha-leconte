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

async function testTeamNamesFunctionality() {
  console.log('🧪 Testing team names functionality...');
  
  try {
    // Test 1: Check if columns exist
    console.log('\n📋 Test 1: Checking if team name columns exist...');
    
    const { data: testColumns, error: columnsError } = await supabase
      .from('games')
      .select('team_a_name, team_b_name')
      .limit(1);
    
    if (columnsError) {
      if (columnsError.message.includes('does not exist')) {
        console.log('❌ Team name columns do not exist. Please run the migration first.');
        console.log('📋 Execute the SQL from: scripts/manual-sql-execution.sql');
        return;
      } else {
        console.log('❌ Unexpected error:', columnsError);
        return;
      }
    }
    
    console.log('✅ Team name columns exist!');
    
    // Test 2: Create a test game with custom team names
    console.log('\n🎮 Test 2: Creating test game with custom team names...');
    
    const testGame = {
      title: 'Test Game - Custom Teams',
      description: 'Testing custom team names functionality',
      game_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      min_players: 4,
      max_players: 10,
      field_cost_per_player: 1500,
      team_a_name: 'Los Águilas',
      team_b_name: 'Los Pumas',
      created_by: 'mock-admin-id',
    };
    
    const { data: createdGame, error: createError } = await supabase
      .from('games')
      .insert(testGame)
      .select('id, title, team_a_name, team_b_name')
      .single();
    
    if (createError) {
      console.log('❌ Error creating test game:', createError);
      return;
    }
    
    console.log('✅ Test game created:', createdGame);
    
    // Test 3: Test the API endpoint for retrieving team names
    console.log('\n🌐 Test 3: Testing GET /api/admin/games/[id]/team-names...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/admin/games/${createdGame.id}/team-names`);
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ GET endpoint working:', result);
      } else {
        console.log('❌ GET endpoint error:', result);
      }
    } catch (fetchError) {
      console.log('⚠️ Could not test API endpoint (server may not be running):', (fetchError as Error).message);
    }
    
    // Test 4: Test updating team names via database
    console.log('\n✏️ Test 4: Testing team name updates...');
    
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        team_a_name: 'Los Guerreros',
        team_b_name: 'Los Campeones',
      })
      .eq('id', createdGame.id)
      .select('id, team_a_name, team_b_name')
      .single();
    
    if (updateError) {
      console.log('❌ Error updating team names:', updateError);
    } else {
      console.log('✅ Team names updated:', updatedGame);
    }
    
    // Test 5: Test validation constraints
    console.log('\n🔍 Test 5: Testing validation constraints...');
    
    // Test empty names (should fail)
    const { error: emptyNameError } = await supabase
      .from('games')
      .update({
        team_a_name: '',
        team_b_name: 'Valid Team',
      })
      .eq('id', createdGame.id);
    
    if (emptyNameError) {
      console.log('✅ Empty name validation working:', emptyNameError.message);
    } else {
      console.log('⚠️ Empty name validation may not be working');
    }
    
    // Test same names (should fail)
    const { error: sameNameError } = await supabase
      .from('games')
      .update({
        team_a_name: 'Same Team',
        team_b_name: 'Same Team',
      })
      .eq('id', createdGame.id);
    
    if (sameNameError) {
      console.log('✅ Same name validation working:', sameNameError.message);
    } else {
      console.log('⚠️ Same name validation may not be working');
    }
    
    // Test 6: Test validation function (if exists)
    console.log('\n🧮 Test 6: Testing validation function...');
    
    try {
      const { data: validResult, error: validError } = await supabase
        .rpc('validate_team_names', {
          p_team_a_name: 'Team A',
          p_team_b_name: 'Team B'
        });
      
      if (validError) {
        console.log('⚠️ Validation function not available:', validError.message);
      } else {
        console.log('✅ Validation function result:', validResult);
      }
    } catch (err) {
      console.log('⚠️ Validation function test skipped');
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', createdGame.id);
    
    if (deleteError) {
      console.log('⚠️ Error cleaning up test game:', deleteError);
    } else {
      console.log('✅ Test game cleaned up');
    }
    
    console.log('\n🎉 Team names functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTeamNamesFunctionality();