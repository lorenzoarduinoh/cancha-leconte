#!/usr/bin/env npx tsx

/**
 * Database Admin CLI
 * Utility script for managing admin users and database operations
 * 
 * Usage:
 *   npx tsx scripts/db-admin.ts seed-users
 *   npx tsx scripts/db-admin.ts list-users
 *   npx tsx scripts/db-admin.ts update-password <email> <new-password>
 *   npx tsx scripts/db-admin.ts deactivate-user <email>
 *   npx tsx scripts/db-admin.ts reactivate-user <email>
 *   npx tsx scripts/db-admin.ts generate-passwords
 */

import { config } from 'dotenv'
import { AdminUserSeeder } from '../lib/database/seed-admin-users'

// Load environment variables
config({ path: '.env.local' })

const COMMANDS = {
  'seed-users': 'Seed admin users (Santiago and Agustin)',
  'list-users': 'List all admin users',
  'update-password': 'Update admin user password (requires email and password)',
  'deactivate-user': 'Deactivate admin user (requires email)',
  'reactivate-user': 'Reactivate admin user (requires email)',
  'generate-passwords': 'Generate secure passwords for admin users'
}

async function main() {
  const command = process.argv[2]
  const args = process.argv.slice(3)

  if (!command || command === 'help') {
    showHelp()
    return
  }

  try {
    switch (command) {
      case 'seed-users':
        await AdminUserSeeder.seedAdminUsers()
        break

      case 'list-users':
        await AdminUserSeeder.listAdminUsers()
        break

      case 'update-password':
        if (args.length < 2) {
          console.error('❌ Error: Email and new password are required')
          console.log('Usage: npx tsx scripts/db-admin.ts update-password <email> <new-password>')
          process.exit(1)
        }
        await AdminUserSeeder.updateAdminPassword(args[0], args[1])
        break

      case 'deactivate-user':
        if (args.length < 1) {
          console.error('❌ Error: Email is required')
          console.log('Usage: npx tsx scripts/db-admin.ts deactivate-user <email>')
          process.exit(1)
        }
        await AdminUserSeeder.deactivateAdminUser(args[0])
        break

      case 'reactivate-user':
        if (args.length < 1) {
          console.error('❌ Error: Email is required')
          console.log('Usage: npx tsx scripts/db-admin.ts reactivate-user <email>')
          process.exit(1)
        }
        await AdminUserSeeder.reactivateAdminUser(args[0])
        break

      case 'generate-passwords':
        AdminUserSeeder.generateSecurePasswords()
        break

      default:
        console.error(`❌ Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }

  } catch (error) {
    console.error('❌ Command failed:', error)
    process.exit(1)
  }
}

function showHelp() {
  console.log(`
🔧 Database Admin CLI for Cancha Leconte

Available commands:`)

  Object.entries(COMMANDS).forEach(([cmd, description]) => {
    console.log(`  ${cmd.padEnd(20)} ${description}`)
  })

  console.log(`
Examples:
  npx tsx scripts/db-admin.ts seed-users
  npx tsx scripts/db-admin.ts list-users
  npx tsx scripts/db-admin.ts update-password santiago@canchaleconte.com newpassword123
  npx tsx scripts/db-admin.ts generate-passwords

Note: Make sure your .env.local file is configured with Supabase credentials.
`)
}

// Run the script
main().catch(console.error)