#!/usr/bin/env node

// Direct implementation without TypeScript imports
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupAdminUsers() {
  try {
    console.log('🚀 Setting up admin users...')
    
    // Get admin users from environment
    const adminUsers = [
      {
        username: process.env.ADMIN_SANTIAGO_USERNAME || 'lecon',
        password: process.env.ADMIN_SANTIAGO_PASSWORD,
        name: 'Santiago Admin',
        email: 'santiago@cancha-leconte.com'
      },
      {
        username: process.env.ADMIN_AGUSTIN_USERNAME || 'golfi',
        password: process.env.ADMIN_AGUSTIN_PASSWORD,
        name: 'Agustin Admin',
        email: 'agustin@cancha-leconte.com'
      }
    ]

    for (const user of adminUsers) {
      if (!user.password) {
        console.error(`❌ Password not found for ${user.username}. Check your .env.local file.`)
        continue
      }

      console.log(`👤 Creating admin user: ${user.username}`)
      
      // Hash password
      const password_hash = await bcrypt.hash(user.password, 12)
      
      // Insert or update user
      const { data, error } = await supabase
        .from('admin_users')
        .upsert({
          username: user.username.toLowerCase().trim(),
          email: user.email,
          password_hash,
          name: user.name,
          role: 'admin',
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'username'
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ Failed to create ${user.username}:`, error.message)
      } else {
        console.log(`✅ Admin user created/updated: ${user.username}`)
      }
    }
    
    console.log('\n✅ Admin users setup completed!')
    
    // List created users
    console.log('\n📋 Admin users in database:')
    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Failed to list users:', error.message)
    } else {
      users.forEach(user => {
        const status = user.is_active ? '🟢 Active' : '🔴 Inactive'
        console.log(`\nUsername: ${user.username}\nName: ${user.name}\nEmail: ${user.email || 'N/A'}\nRole: ${user.role}\nStatus: ${status}\nCreated: ${new Date(user.created_at).toLocaleString()}\n${'─'.repeat(50)}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  setupAdminUsers()
}

module.exports = { setupAdminUsers }