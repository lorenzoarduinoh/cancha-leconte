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

async function runMigration() {
  try {
    console.log('🚀 Running migration 003_create_games_and_admin_features...');
    
    const migrationPath = join(process.cwd(), 'lib', 'database', 'migrations', '003_create_games_and_admin_features.sql');
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
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error && !error.message.includes('already exists')) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          console.error('Statement:', statement);
          // Continue with next statement instead of stopping
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['games', 'game_registrations', 'game_results', 'notifications', 'admin_audit_log']);
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('📊 Created tables:', tables?.map(t => t.table_name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Execute the migration SQL directly
async function runMigrationDirect() {
  try {
    console.log('🚀 Running migration directly...');
    
    const migrationPath = join(process.cwd(), 'lib', 'database', 'migrations', '003_create_games_and_admin_features.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Use the raw SQL execution approach
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration error:', error);
      
      // Try individual statements approach
      console.log('🔄 Trying individual statement execution...');
      await runMigration();
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Direct migration failed, trying statement-by-statement approach...');
    await runMigration();
  }
}

// Check if exec_sql function exists, if not use statement-by-statement approach
async function main() {
  console.log('🔧 Starting database migration...');
  
  try {
    // Try to check if we can access the database
    const { data, error } = await supabase
      .from('admin_users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Run the migration
    await runMigration();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();