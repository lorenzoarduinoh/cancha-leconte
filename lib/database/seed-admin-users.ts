import { createServerClient } from '@/lib/supabase/client'
import { PasswordUtils } from '@/lib/auth/password'

/**
 * Seed admin users for Santiago and Agustin
 * This script creates the initial admin accounts with secure passwords
 */
export class AdminUserSeeder {
  /**
   * Create admin users in the database
   */
  static async seedAdminUsers(): Promise<void> {
    try {
      const supabase = createServerClient()

      // Get admin credentials from environment
      const santiago_email = process.env.ADMIN_SANTIAGO_EMAIL
      const santiago_password = process.env.ADMIN_SANTIAGO_PASSWORD
      const agustin_email = process.env.ADMIN_AGUSTIN_EMAIL
      const agustin_password = process.env.ADMIN_AGUSTIN_PASSWORD

      if (!santiago_email || !santiago_password || !agustin_email || !agustin_password) {
        throw new Error('Admin credentials not found in environment variables')
      }

      console.log('🌱 Starting admin users seeding...')

      // Check if admin users already exist
      const { data: existing_users } = await supabase
        .from('admin_users')
        .select('email')
        .in('email', [santiago_email, agustin_email])

      const existing_emails = existing_users?.map(user => user.email) || []

      // Prepare admin users data
      const admin_users = [
        {
          email: santiago_email,
          password: santiago_password,
          name: 'Santiago',
          skip: existing_emails.includes(santiago_email)
        },
        {
          email: agustin_email,
          password: agustin_password,
          name: 'Agustin',
          skip: existing_emails.includes(agustin_email)
        }
      ]

      // Create admin users
      for (const admin_user of admin_users) {
        if (admin_user.skip) {
          console.log(`⏭️  Skipping ${admin_user.name} - user already exists`)
          continue
        }

        try {
          console.log(`👤 Creating admin user: ${admin_user.name}`)

          // Validate password strength
          PasswordUtils.validatePasswordStrength(admin_user.password)

          // Hash password
          const password_hash = await PasswordUtils.hashPassword(admin_user.password)

          // Insert admin user
          const { data, error } = await supabase
            .from('admin_users')
            .insert({
              email: admin_user.email.toLowerCase().trim(),
              password_hash,
              name: admin_user.name,
              role: 'admin' as const,
              is_active: true
            })
            .select()
            .single()

          if (error) {
            throw new Error(`Failed to create ${admin_user.name}: ${error.message}`)
          }

          console.log(`✅ Successfully created admin user: ${admin_user.name} (${data.id})`)

        } catch (error) {
          console.error(`❌ Failed to create admin user ${admin_user.name}:`, error)
          throw error
        }
      }

      console.log('🎉 Admin users seeding completed successfully!')

    } catch (error) {
      console.error('❌ Admin users seeding failed:', error)
      throw error
    }
  }

  /**
   * Update admin user password
   */
  static async updateAdminPassword(email: string, new_password: string): Promise<void> {
    try {
      const supabase = createServerClient()

      console.log(`🔑 Updating password for admin user: ${email}`)

      // Validate password strength
      PasswordUtils.validatePasswordStrength(new_password)

      // Hash new password
      const password_hash = await PasswordUtils.hashPassword(new_password)

      // Update user password
      const { data, error } = await supabase
        .from('admin_users')
        .update({ 
          password_hash,
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`)
      }

      if (!data) {
        throw new Error('Admin user not found or inactive')
      }

      // Destroy all existing sessions for security
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('user_id', data.id)

      console.log(`✅ Password updated successfully for: ${email}`)

    } catch (error) {
      console.error(`❌ Failed to update password for ${email}:`, error)
      throw error
    }
  }

  /**
   * Deactivate admin user
   */
  static async deactivateAdminUser(email: string): Promise<void> {
    try {
      const supabase = createServerClient()

      console.log(`🔒 Deactivating admin user: ${email}`)

      const { data, error } = await supabase
        .from('admin_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim())
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to deactivate user: ${error.message}`)
      }

      if (!data) {
        throw new Error('Admin user not found')
      }

      // Destroy all existing sessions
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('user_id', data.id)

      console.log(`✅ Admin user deactivated: ${email}`)

    } catch (error) {
      console.error(`❌ Failed to deactivate admin user ${email}:`, error)
      throw error
    }
  }

  /**
   * Reactivate admin user
   */
  static async reactivateAdminUser(email: string): Promise<void> {
    try {
      const supabase = createServerClient()

      console.log(`🔓 Reactivating admin user: ${email}`)

      const { data, error } = await supabase
        .from('admin_users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim())
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to reactivate user: ${error.message}`)
      }

      if (!data) {
        throw new Error('Admin user not found')
      }

      console.log(`✅ Admin user reactivated: ${email}`)

    } catch (error) {
      console.error(`❌ Failed to reactivate admin user ${email}:`, error)
      throw error
    }
  }

  /**
   * List all admin users
   */
  static async listAdminUsers(): Promise<void> {
    try {
      const supabase = createServerClient()

      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, name, role, is_active, created_at, last_login_at')
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to list users: ${error.message}`)
      }

      console.log('\n📋 Admin Users:')
      console.log('=' .repeat(80))
      
      if (!data || data.length === 0) {
        console.log('No admin users found.')
        return
      }

      data.forEach(user => {
        const status = user.is_active ? '🟢 Active' : '🔴 Inactive'
        const last_login = user.last_login_at 
          ? new Date(user.last_login_at).toLocaleString()
          : 'Never'
        
        console.log(`
ID: ${user.id}
Name: ${user.name}
Email: ${user.email}
Role: ${user.role}
Status: ${status}
Created: ${new Date(user.created_at).toLocaleString()}
Last Login: ${last_login}
${'─'.repeat(80)}`)
      })

    } catch (error) {
      console.error('❌ Failed to list admin users:', error)
      throw error
    }
  }

  /**
   * Generate secure passwords for admin users
   */
  static generateSecurePasswords(): void {
    console.log('\n🔐 Generated Secure Passwords:')
    console.log('=' .repeat(50))
    
    const santiago_password = PasswordUtils.generateSecurePassword(16)
    const agustin_password = PasswordUtils.generateSecurePassword(16)

    console.log(`Santiago: ${santiago_password}`)
    console.log(`Agustin: ${agustin_password}`)
    
    console.log('\n⚠️  Important: Store these passwords securely and update your .env.local file')
    console.log('Strength descriptions:')
    console.log(`Santiago: ${PasswordUtils.getPasswordStrengthDescription(santiago_password)}`)
    console.log(`Agustin: ${PasswordUtils.getPasswordStrengthDescription(agustin_password)}`)
  }
}

/**
 * Convenience functions
 */
export const seedAdminUsers = AdminUserSeeder.seedAdminUsers.bind(AdminUserSeeder)
export const updateAdminPassword = AdminUserSeeder.updateAdminPassword.bind(AdminUserSeeder)
export const listAdminUsers = AdminUserSeeder.listAdminUsers.bind(AdminUserSeeder)
export const generateSecurePasswords = AdminUserSeeder.generateSecurePasswords.bind(AdminUserSeeder)