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

async function createTables() {
  console.log('🚀 Creating tables for admin dashboard...');
  
  try {
    // For now, let's just check if the tables exist by trying to query them
    console.log('🔍 Checking existing tables...');
    
    // Test admin_users table (should exist)
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('count')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Admin users table not accessible:', adminError);
    } else {
      console.log('✅ Admin users table exists');
    }
    
    // Since we can't run raw SQL through the client API, let's provide instructions
    console.log('\n📋 Manual Migration Required:');
    console.log('Since the Supabase client cannot execute raw DDL statements,');
    console.log('you need to run the migration manually through the Supabase Dashboard.');
    console.log('\n🔗 Steps:');
    console.log('1. Go to https://supabase.com/dashboard/project/kdfnqatthxutflofqzre');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   lib/database/migrations/003_create_games_and_admin_features.sql');
    console.log('4. Execute the SQL');
    console.log('\n✨ Then run this script again to verify table creation.');
    
    // Let's try to detect if tables exist through a different method
    console.log('\n🧪 Testing table existence through insert operation...');
    
    // Try to access games table
    try {
      const { data, error } = await supabase
        .from('games')
        .select('count')
        .limit(1);
      
      if (error && error.code === 'PGRST106') {
        console.log('❌ Games table does not exist yet');
      } else if (error) {
        console.log('❓ Games table might exist but has access restrictions:', error.message);
      } else {
        console.log('✅ Games table exists and is accessible');
      }
    } catch (e) {
      console.log('❌ Games table does not exist');
    }
    
    // Try to access game_registrations table
    try {
      const { data, error } = await supabase
        .from('game_registrations')
        .select('count')
        .limit(1);
      
      if (error && error.code === 'PGRST106') {
        console.log('❌ Game registrations table does not exist yet');
      } else if (error) {
        console.log('❓ Game registrations table might exist but has access restrictions:', error.message);
      } else {
        console.log('✅ Game registrations table exists and is accessible');
      }
    } catch (e) {
      console.log('❌ Game registrations table does not exist');
    }
    
    // Try to access notifications table
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('count')
        .limit(1);
      
      if (error && error.code === 'PGRST106') {
        console.log('❌ Notifications table does not exist yet');
      } else if (error) {
        console.log('❓ Notifications table might exist but has access restrictions:', error.message);
      } else {
        console.log('✅ Notifications table exists and is accessible');
      }
    } catch (e) {
      console.log('❌ Notifications table does not exist');
    }
    
    console.log('\n📝 Summary:');
    console.log('If any tables are missing, please run the SQL migration manually through Supabase Dashboard.');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

createTables();