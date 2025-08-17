import bcrypt from 'bcryptjs'
import { passwordValidationSchema } from './types'

/**
 * Password utility functions for secure authentication
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12

  /**
   * Hash a plain text password
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Validate password strength before hashing
      this.validatePasswordStrength(password)
      
      // Generate salt and hash password
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS)
      const hashedPassword = await bcrypt.hash(password, salt)
      
      return hashedPassword
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify a plain text password against a hash
   * @param password - Plain text password
   * @param hash - Hashed password from database
   * @returns Promise<boolean> - True if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (!password || !hash) {
        return false
      }

      const isValid = await bcrypt.compare(password, hash)
      return isValid
    } catch (error) {
      // Log error but don't expose details
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * Validate password strength according to requirements
   * @param password - Plain text password to validate
   * @throws Error if password doesn't meet requirements
   */
  static validatePasswordStrength(password: string): void {
    const result = passwordValidationSchema.safeParse(password)
    
    if (!result.success) {
      const errorMessage = result.error.errors
        .map(err => err.message)
        .join(', ')
      throw new Error(errorMessage)
    }
  }

  /**
   * Generate a secure random password for admin accounts
   * @param length - Password length (minimum 12)
   * @returns string - Generated password
   */
  static generateSecurePassword(length: number = 16): string {
    if (length < 12) {
      throw new Error('Password length must be at least 12 characters')
    }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = lowercase + uppercase + numbers + symbols
    
    let password = ''
    
    // Ensure at least one character from each category
    password += this.getRandomChar(lowercase)
    password += this.getRandomChar(uppercase)
    password += this.getRandomChar(numbers)
    password += this.getRandomChar(symbols)
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars)
    }
    
    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password)
  }

  /**
   * Check if a password has been compromised (basic check)
   * In a production environment, you might want to integrate with HaveIBeenPwned API
   * @param password - Password to check
   * @returns boolean - True if password appears compromised
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'pass', 'master', 'shadow', 'football'
    ]
    
    return commonPasswords.includes(password.toLowerCase())
  }

  /**
   * Get password strength score (0-4)
   * @param password - Password to evaluate
   * @returns number - Strength score
   */
  static getPasswordStrength(password: string): number {
    let score = 0
    
    // Length check
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    // Reduce score for common patterns
    if (this.isCommonPassword(password)) score = Math.max(0, score - 2)
    
    return Math.min(4, score)
  }

  /**
   * Generate password strength description
   * @param password - Password to evaluate
   * @returns string - Human readable strength description
   */
  static getPasswordStrengthDescription(password: string): string {
    const strength = this.getPasswordStrength(password)
    
    switch (strength) {
      case 0:
      case 1:
        return 'Muy débil'
      case 2:
        return 'Débil'
      case 3:
        return 'Moderada'
      case 4:
        return 'Fuerte'
      default:
        return 'Desconocida'
    }
  }

  /**
   * Private helper to get random character from string
   */
  private static getRandomChar(chars: string): string {
    const crypto = require('crypto')
    const randomIndex = crypto.randomInt(0, chars.length)
    return chars[randomIndex]
  }

  /**
   * Private helper to shuffle string characters
   */
  private static shuffleString(str: string): string {
    const crypto = require('crypto')
    const arr = str.split('')
    
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    
    return arr.join('')
  }
}

/**
 * Convenience functions for common operations
 */
export const hashPassword = PasswordUtils.hashPassword.bind(PasswordUtils)
export const verifyPassword = PasswordUtils.verifyPassword.bind(PasswordUtils)
export const validatePasswordStrength = PasswordUtils.validatePasswordStrength.bind(PasswordUtils)
export const generateSecurePassword = PasswordUtils.generateSecurePassword.bind(PasswordUtils)