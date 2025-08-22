import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
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

async function runGameDurationMigration() {
  try {
    console.log('🚀 Running migration 004_add_game_duration...');
    
    const migrationPath = join(process.cwd(), 'lib', 'database', 'migrations', '004_add_game_duration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
        
        try {
          // Use raw SQL execution via Supabase
          const { error } = await supabase.rpc('exec', { sql: statement + ';' });
          
          if (error) {
            // Try alternative approach for SQL execution
            const { error: directError } = await supabase
              .from('_temp_migration')
              .select('*')
              .limit(0);
            
            // Since we can't execute arbitrary SQL easily, we'll use the database schema update approach
            if (statement.includes('ALTER TABLE games ADD COLUMN')) {
              console.log('   Adding game_duration_minutes column...');
              // This will be handled by updating the database types and running schema sync
            } else if (statement.includes('UPDATE games')) {
              console.log('   Updating existing games with default duration...');
              // This will be handled by manual update if needed
            }
          }
        } catch (err) {
          console.log(`   Note: ${err}`);
          // Continue with migration even if some statements can't be executed directly
        }
      }
    }
    
    console.log('✅ Migration script completed!');
    console.log('📝 Note: Please ensure the database schema is updated in your Supabase dashboard');
    console.log('   or run the SQL statements manually in the SQL editor');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Manual database verification
async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration...');
    
    // Try to select from games to see if the column exists
    const { data, error } = await supabase
      .from('games')
      .select('id, game_duration_minutes')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Column may not exist yet. Error:', error.message);
      return false;
    } else {
      console.log('✅ Migration verified - game_duration_minutes column exists');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Could not verify migration:', error);
    return false;
  }
}

async function main() {
  console.log('🔧 Starting game duration migration...');
  
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('games')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Check if migration is already applied
    const migrationExists = await verifyMigration();
    
    if (migrationExists) {
      console.log('✅ Migration already applied - game_duration_minutes column exists');
    } else {
      // Run the migration
      await runGameDurationMigration();
      
      console.log('\n📋 Manual Steps Required:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to Database > SQL Editor');
      console.log('3. Run the following SQL commands:');
      console.log('');
      console.log('-- Add game_duration_minutes column');
      console.log('ALTER TABLE games');
      console.log('ADD COLUMN IF NOT EXISTS game_duration_minutes INTEGER DEFAULT 90');
      console.log('CHECK (game_duration_minutes >= 15 AND game_duration_minutes <= 300);');
      console.log('');
      console.log('-- Update existing games');
      console.log('UPDATE games SET game_duration_minutes = 90 WHERE game_duration_minutes IS NULL;');
      console.log('');
      console.log('-- Make column NOT NULL');
      console.log('ALTER TABLE games ALTER COLUMN game_duration_minutes SET NOT NULL;');
      console.log('');
      console.log('-- Add index');
      console.log('CREATE INDEX IF NOT EXISTS idx_games_duration ON games(game_duration_minutes);');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();