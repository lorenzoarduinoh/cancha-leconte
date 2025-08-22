import dotenv from 'dotenv';
import { createGameService } from '../lib/services/game';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Test script to verify game duration functionality
 * Run this after applying the database migration
 */
async function testDurationFunctionality() {
  console.log('🧪 Testing game duration functionality...');
  
  const gameService = createGameService();
  
  try {
    // Test 1: Calculate status for ongoing game
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes from now
    
    console.log('\n📊 Test 1: Game that should be in progress');
    console.log('Current time:', now.toISOString());
    console.log('Game start time:', startTime.toISOString());
    console.log('Game duration: 90 minutes');
    
    const status1 = gameService.calculateGameStatus(startTime.toISOString(), 90);
    console.log('Calculated status:', status1);
    console.log('Expected: in_progress');
    console.log('✅ Test 1:', status1 === 'in_progress' ? 'PASSED' : 'FAILED');
    
    // Test 2: Calculate status for completed game
    const pastStart = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
    
    console.log('\n📊 Test 2: Game that should be completed');
    console.log('Current time:', now.toISOString());
    console.log('Game start time:', pastStart.toISOString());
    console.log('Game duration: 90 minutes');
    
    const status2 = gameService.calculateGameStatus(pastStart.toISOString(), 90);
    console.log('Calculated status:', status2);
    console.log('Expected: completed');
    console.log('✅ Test 2:', status2 === 'completed' ? 'PASSED' : 'FAILED');
    
    // Test 3: Calculate status for future game
    const futureStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    console.log('\n📊 Test 3: Game that should not auto-update (future)');
    console.log('Current time:', now.toISOString());
    console.log('Game start time:', futureStart.toISOString());
    console.log('Game duration: 90 minutes');
    
    const status3 = gameService.calculateGameStatus(futureStart.toISOString(), 90);
    console.log('Calculated status:', status3);
    console.log('Expected: null (no auto-update)');
    console.log('✅ Test 3:', status3 === null ? 'PASSED' : 'FAILED');
    
    // Test 4: Validation with different durations
    console.log('\n📊 Test 4: Different duration scenarios');
    
    // 30-minute game that started 45 minutes ago (should be completed)
    const shortGameStart = new Date(now.getTime() - 45 * 60 * 1000);
    const shortGameStatus = gameService.calculateGameStatus(shortGameStart.toISOString(), 30);
    console.log('30-min game started 45 min ago - Status:', shortGameStatus, '(Expected: completed)');
    console.log('✅ Short game test:', shortGameStatus === 'completed' ? 'PASSED' : 'FAILED');
    
    // 3-hour game that started 1 hour ago (should be in progress)
    const longGameStart = new Date(now.getTime() - 60 * 60 * 1000);
    const longGameStatus = gameService.calculateGameStatus(longGameStart.toISOString(), 180);
    console.log('3-hour game started 1 hour ago - Status:', longGameStatus, '(Expected: in_progress)');
    console.log('✅ Long game test:', longGameStatus === 'in_progress' ? 'PASSED' : 'FAILED');
    
    console.log('\n🎉 Duration functionality tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Apply the database migration by running the SQL in Supabase dashboard');
    console.log('2. Create a new game with custom duration to test the full flow');
    console.log('3. Verify that status updates work in the admin interface');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testDurationFunctionality();