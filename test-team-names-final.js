// Test script to verify team names persist when game is marked as completed
const gameId = '6fccabf2-8caf-4af1-a51e-ffe3a5aeb48f'; // Test game ID
const baseUrl = 'http://localhost:3000';

async function testTeamNamesPersistence() {
  console.log('🧪 Testing Team Names Persistence on Game Completion...\n');
  
  try {
    // Step 1: Get current game state
    console.log('📋 Step 1: Getting current game state...');
    const gameResponse = await fetch(`${baseUrl}/api/admin/games/${gameId}`);
    const gameData = await gameResponse.json();
    
    if (!gameData.success) {
      throw new Error('Failed to fetch game data');
    }
    
    console.log('Current game status:', gameData.data.status);
    console.log('Current team A name:', gameData.data.team_a_name);
    console.log('Current team B name:', gameData.data.team_b_name);
    console.log('');
    
    // Step 2: Set custom team names
    console.log('✏️ Step 2: Setting custom team names...');
    const customTeamA = 'Los Tigres';
    const customTeamB = 'Las Águilas';
    
    // Update Team A
    const teamAResponse = await fetch(`${baseUrl}/api/admin/games/${gameId}/team-names`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_a_name: customTeamA }),
    });
    
    if (!teamAResponse.ok) {
      throw new Error('Failed to update Team A name');
    }
    
    // Update Team B
    const teamBResponse = await fetch(`${baseUrl}/api/admin/games/${gameId}/team-names`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_b_name: customTeamB }),
    });
    
    if (!teamBResponse.ok) {
      throw new Error('Failed to update Team B name');
    }
    
    console.log(`✅ Team names updated: "${customTeamA}" vs "${customTeamB}"`);
    console.log('');
    
    // Step 3: Verify team names are set
    console.log('🔍 Step 3: Verifying team names are set...');
    const verifyResponse = await fetch(`${baseUrl}/api/admin/games/${gameId}/team-names`);
    const verifyData = await verifyResponse.json();
    
    if (!verifyData.success) {
      throw new Error('Failed to verify team names');
    }
    
    console.log('Verified Team A:', verifyData.data.team_a_name);
    console.log('Verified Team B:', verifyData.data.team_b_name);
    
    if (verifyData.data.team_a_name !== customTeamA || verifyData.data.team_b_name !== customTeamB) {
      throw new Error('Team names were not set correctly');
    }
    console.log('✅ Team names verified correctly');
    console.log('');
    
    // Step 4: Mark game as completed (the critical test)
    console.log('🏁 Step 4: Marking game as completed...');
    const completeResponse = await fetch(`${baseUrl}/api/admin/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    
    if (!completeResponse.ok) {
      const errorData = await completeResponse.json().catch(() => ({}));
      throw new Error(`Failed to mark game as completed: ${errorData.error || 'Unknown error'}`);
    }
    
    const completedData = await completeResponse.json();
    console.log('✅ Game marked as completed');
    console.log('Status after completion:', completedData.data.status);
    console.log('Team A after completion:', completedData.data.team_a_name);
    console.log('Team B after completion:', completedData.data.team_b_name);
    console.log('');
    
    // Step 5: Final verification - fetch game again to ensure persistence
    console.log('🔍 Step 5: Final verification - fetching game state...');
    const finalResponse = await fetch(`${baseUrl}/api/admin/games/${gameId}`);
    const finalData = await finalResponse.json();
    
    if (!finalData.success) {
      throw new Error('Failed to fetch final game state');
    }
    
    console.log('Final game status:', finalData.data.status);
    console.log('Final team A name:', finalData.data.team_a_name);
    console.log('Final team B name:', finalData.data.team_b_name);
    console.log('');
    
    // Step 6: Verify team names have NOT reverted to defaults
    const isTeamACorrect = finalData.data.team_a_name === customTeamA;
    const isTeamBCorrect = finalData.data.team_b_name === customTeamB;
    
    if (isTeamACorrect && isTeamBCorrect) {
      console.log('🎉 SUCCESS! Team names persisted correctly after marking as completed!');
      console.log(`✅ Team A: "${finalData.data.team_a_name}" (expected: "${customTeamA}")`);
      console.log(`✅ Team B: "${finalData.data.team_b_name}" (expected: "${customTeamB}")`);
      console.log('');
      console.log('🔧 The validation schema fix has resolved the issue!');
    } else {
      console.log('❌ FAILURE! Team names reverted to defaults');
      console.log(`❌ Team A: "${finalData.data.team_a_name}" (expected: "${customTeamA}")`);
      console.log(`❌ Team B: "${finalData.data.team_b_name}" (expected: "${customTeamB}")`);
      console.log('');
      console.log('🚨 The issue still persists - further investigation needed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testTeamNamesPersistence();