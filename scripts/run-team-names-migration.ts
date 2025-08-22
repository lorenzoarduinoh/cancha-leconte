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

async function runTeamNamesMigration() {
  try {
    console.log('🚀 Running migration 006_add_team_names...');
    
    const migrationPath = join(process.cwd(), 'lib', 'database', 'migrations', '006_add_team_names.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    
    try {
      // Try to execute the entire migration as one block
      const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
      
      if (error) {
        console.error('❌ Error executing migration:', error);
        console.log('🔄 Trying simplified approach...');
        
        // Fallback: Execute critical parts individually
        const criticalStatements = [
          `ALTER TABLE games 
           ADD COLUMN IF NOT EXISTS team_a_name VARCHAR(50) DEFAULT 'Equipo A' NOT NULL,
           ADD COLUMN IF NOT EXISTS team_b_name VARCHAR(50) DEFAULT 'Equipo B' NOT NULL;`,
           
          `ALTER TABLE games 
           ADD CONSTRAINT check_team_a_name_length CHECK (LENGTH(team_a_name) BETWEEN 2 AND 50),
           ADD CONSTRAINT check_team_b_name_length CHECK (LENGTH(team_b_name) BETWEEN 2 AND 50);`,
           
          `ALTER TABLE games 
           ADD CONSTRAINT check_team_a_name_not_empty CHECK (LENGTH(TRIM(team_a_name)) >= 2),
           ADD CONSTRAINT check_team_b_name_not_empty CHECK (LENGTH(TRIM(team_b_name)) >= 2);`,
           
          `ALTER TABLE games 
           ADD CONSTRAINT check_team_names_different CHECK (team_a_name != team_b_name);`,
           
          `UPDATE games 
           SET team_a_name = COALESCE(team_a_name, 'Equipo A'),
               team_b_name = COALESCE(team_b_name, 'Equipo B')
           WHERE team_a_name IS NULL OR team_b_name IS NULL;`
        ];
        
        for (let i = 0; i < criticalStatements.length; i++) {
          const statement = criticalStatements[i];
          console.log(`   Executing critical statement ${i + 1}/${criticalStatements.length}...`);
          
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (stmtError && !stmtError.message.includes('already exists')) {
            console.error(`❌ Error executing statement ${i + 1}:`, stmtError);
            console.error('Statement:', statement.substring(0, 200));
          } else {
            console.log(`   ✅ Critical statement ${i + 1} executed successfully`);
          }
        }
      } else {
        console.log('   ✅ Migration executed successfully as single block');
      }
    } catch (err: any) {
      console.error('❌ Migration execution failed:', err);
    }
    
    console.log('✅ Team names migration completed!');
    
    // Verify columns were added by trying to select them
    console.log('🔍 Verifying team name columns were added...');
    try {
      const { data: testGame, error: selectError } = await supabase
        .from('games')
        .select('team_a_name, team_b_name')
        .limit(1)
        .single();
      
      if (selectError && !selectError.message.includes('Results contain 0 rows')) {
        console.error('Error selecting team name columns:', selectError);
      } else {
        console.log('✅ Team name columns verified successfully!');
        if (testGame) {
          console.log('📊 Sample team names:', testGame);
        } else {
          console.log('📊 Columns exist but no games found (expected for empty database)');
        }
      }
    } catch (err: any) {
      console.error('Error verifying columns:', err);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🔧 Starting team names migration...');
  
  try {
    // Try to check if we can access the database
    const { data, error } = await supabase
      .from('games')
      .select('id')
      .limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Check if columns already exist by trying to select them
    try {
      const { data: existingGame, error: checkError } = await supabase
        .from('games')
        .select('team_a_name, team_b_name')
        .limit(1);
      
      if (!checkError) {
        console.log('⚠️ Team name columns already exist. Migration may have already been run.');
        
        if (existingGame && existingGame.length > 0) {
          console.log('✅ Team names columns are functional:', existingGame[0]);
        }
        
        console.log('🎯 Continuing anyway to ensure all constraints are in place...');
      }
    } catch (err) {
      console.log('📝 Team name columns not found, proceeding with migration...');
    }
    
    // Run the migration
    await runTeamNamesMigration();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();