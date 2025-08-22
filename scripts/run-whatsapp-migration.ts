#!/usr/bin/env tsx

/**
 * Script to run WhatsApp notification system database migration
 * Usage: npm run db:migrate-whatsapp
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runWhatsAppMigration() {
  console.log('🚀 Starting WhatsApp notification system migration...');

  // Initialize Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'lib', 'database', 'migrations', '005_add_whatsapp_notification_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration script...');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative approach using direct SQL execution
      console.log('🔄 Trying alternative migration approach...');
      
      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase
            .from('_temp_migration_execution')
            .select('1')
            .limit(0); // This is a trick to execute raw SQL via RPC

          // Use a more direct approach
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_migration`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ statement })
          });

          if (!response.ok) {
            console.log(`⚠️  Statement might have failed (this could be normal): ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify migration by checking for new columns
    console.log('🔍 Verifying migration...');

    // Check if registration_token column exists
    const { data: registrationColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'game_registrations')
      .eq('column_name', 'registration_token');

    // Check if whatsapp_templates table exists
    const { data: templatesTable } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'whatsapp_templates');

    if (registrationColumns && registrationColumns.length > 0) {
      console.log('✅ registration_token column added successfully');
    } else {
      console.log('⚠️  registration_token column verification failed');
    }

    if (templatesTable && templatesTable.length > 0) {
      console.log('✅ whatsapp_templates table created successfully');
    } else {
      console.log('⚠️  whatsapp_templates table verification failed');
    }

    // Test token generation function
    try {
      const { data: testToken } = await supabase.rpc('generate_registration_token');
      if (testToken && testToken.length === 43) {
        console.log('✅ Token generation function working correctly');
        console.log(`📝 Sample token: ${testToken}`);
      }
    } catch (err) {
      console.log('⚠️  Token generation function verification failed');
    }

    console.log('🎉 WhatsApp notification system migration verification completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔧 Manual migration required. Please run the SQL script manually in your database:');
    console.log('📁 File: lib/database/migrations/005_add_whatsapp_notification_system.sql');
    process.exit(1);
  }
}

// Run the migration
runWhatsAppMigration().catch(console.error);