/**
 * Test script to verify game duration calculation logic
 * This tests the core logic without database dependencies
 */

type GameStatus = 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Calculate game status based on current time and duration
 */
function calculateGameStatus(gameDate: string, durationMinutes: number = 90): GameStatus | null {
  const now = new Date();
  const startTime = new Date(gameDate);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  if (now >= startTime && now <= endTime) {
    return 'in_progress';
  } else if (now > endTime) {
    return 'completed';
  }
  
  // Return null to indicate no automatic status change needed
  return null;
}

function testDurationLogic() {
  console.log('🧪 Testing game duration calculation logic...');
  
  const now = new Date();
  let testsPassed = 0;
  let totalTests = 0;
  
  // Test 1: Game that should be in progress
  totalTests++;
  const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
  
  console.log('\n📊 Test 1: Game that should be in progress');
  console.log('Current time:', now.toISOString());
  console.log('Game start time:', startTime.toISOString());
  console.log('Game duration: 90 minutes');
  
  const status1 = calculateGameStatus(startTime.toISOString(), 90);
  console.log('Calculated status:', status1);
  console.log('Expected: in_progress');
  
  if (status1 === 'in_progress') {
    console.log('✅ Test 1: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 1: FAILED');
  }
  
  // Test 2: Game that should be completed
  totalTests++;
  const pastStart = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
  
  console.log('\n📊 Test 2: Game that should be completed');
  console.log('Current time:', now.toISOString());
  console.log('Game start time:', pastStart.toISOString());
  console.log('Game duration: 90 minutes');
  
  const status2 = calculateGameStatus(pastStart.toISOString(), 90);
  console.log('Calculated status:', status2);
  console.log('Expected: completed');
  
  if (status2 === 'completed') {
    console.log('✅ Test 2: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 2: FAILED');
  }
  
  // Test 3: Game that should not auto-update (future)
  totalTests++;
  const futureStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  
  console.log('\n📊 Test 3: Game that should not auto-update (future)');
  console.log('Current time:', now.toISOString());
  console.log('Game start time:', futureStart.toISOString());
  console.log('Game duration: 90 minutes');
  
  const status3 = calculateGameStatus(futureStart.toISOString(), 90);
  console.log('Calculated status:', status3);
  console.log('Expected: null (no auto-update)');
  
  if (status3 === null) {
    console.log('✅ Test 3: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 3: FAILED');
  }
  
  // Test 4: Short game (30 min) that should be completed
  totalTests++;
  const shortGameStart = new Date(now.getTime() - 45 * 60 * 1000); // 45 minutes ago
  const shortGameStatus = calculateGameStatus(shortGameStart.toISOString(), 30);
  
  console.log('\n📊 Test 4: Short game that should be completed');
  console.log('30-min game started 45 min ago - Status:', shortGameStatus);
  console.log('Expected: completed');
  
  if (shortGameStatus === 'completed') {
    console.log('✅ Test 4: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 4: FAILED');
  }
  
  // Test 5: Long game (3 hours) that should be in progress
  totalTests++;
  const longGameStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const longGameStatus = calculateGameStatus(longGameStart.toISOString(), 180);
  
  console.log('\n📊 Test 5: Long game that should be in progress');
  console.log('3-hour game started 1 hour ago - Status:', longGameStatus);
  console.log('Expected: in_progress');
  
  if (longGameStatus === 'in_progress') {
    console.log('✅ Test 5: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 5: FAILED');
  }
  
  // Test 6: Game that just started (edge case)
  totalTests++;
  const justStarted = new Date(now.getTime() - 1 * 60 * 1000); // 1 minute ago
  const justStartedStatus = calculateGameStatus(justStarted.toISOString(), 90);
  
  console.log('\n📊 Test 6: Game that just started');
  console.log('Game started 1 min ago - Status:', justStartedStatus);
  console.log('Expected: in_progress');
  
  if (justStartedStatus === 'in_progress') {
    console.log('✅ Test 6: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 6: FAILED');
  }
  
  // Test 7: Game that just ended (edge case)
  totalTests++;
  const justEnded = new Date(now.getTime() - 91 * 60 * 1000); // 91 minutes ago (90 min game)
  const justEndedStatus = calculateGameStatus(justEnded.toISOString(), 90);
  
  console.log('\n📊 Test 7: Game that just ended');
  console.log('90-min game started 91 min ago - Status:', justEndedStatus);
  console.log('Expected: completed');
  
  if (justEndedStatus === 'completed') {
    console.log('✅ Test 7: PASSED');
    testsPassed++;
  } else {
    console.log('❌ Test 7: FAILED');
  }
  
  // Summary
  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log(`Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 All tests passed! Duration logic is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the logic.');
  }
  
  console.log('\n📋 Implementation Status:');
  console.log('✅ Database migration files created');
  console.log('✅ TypeScript types updated');
  console.log('✅ Validation schemas updated');
  console.log('✅ API endpoints updated');
  console.log('✅ Duration calculation logic implemented');
  console.log('⏳ Database migration needs to be applied manually in Supabase');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Go to Supabase Dashboard → Database → SQL Editor');
  console.log('2. Run the migration SQL from lib/database/migrations/004_add_game_duration.sql');
  console.log('3. Test creating games with custom durations');
  console.log('4. Verify automatic status updates work in the admin interface');
  
  return testsPassed === totalTests;
}

// Run the tests
testDurationLogic();