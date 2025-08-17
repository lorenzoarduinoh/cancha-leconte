import { describe, it, expect, beforeEach } from '@jest/globals'
import { PasswordUtils } from '@/lib/auth/password'

describe('PasswordUtils', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!'
      const hash = await PasswordUtils.hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 characters
    })

    it('should throw error for weak password', async () => {
      const weakPassword = '123'
      
      await expect(PasswordUtils.hashPassword(weakPassword))
        .rejects.toThrow(/Password hashing failed/)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!'
      const hash1 = await PasswordUtils.hashPassword(password)
      const hash2 = await PasswordUtils.hashPassword(password)
      
      expect(hash1).not.toBe(hash2) // Due to random salt
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!'
      const hash = await PasswordUtils.hashPassword(password)
      
      const isValid = await PasswordUtils.verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hash = await PasswordUtils.hashPassword(password)
      
      const isValid = await PasswordUtils.verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('should handle empty password', async () => {
      const hash = '$2b$12$test.hash'
      
      const isValid = await PasswordUtils.verifyPassword('', hash)
      expect(isValid).toBe(false)
    })

    it('should handle empty hash', async () => {
      const password = 'TestPassword123!'
      
      const isValid = await PasswordUtils.verifyPassword(password, '')
      expect(isValid).toBe(false)
    })

    it('should handle invalid hash format', async () => {
      const password = 'TestPassword123!'
      const invalidHash = 'invalid-hash'
      
      const isValid = await PasswordUtils.verifyPassword(password, invalidHash)
      expect(isValid).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const strongPassword = 'TestPassword123!'
      
      expect(() => PasswordUtils.validatePasswordStrength(strongPassword))
        .not.toThrow()
    })

    it('should reject password too short', () => {
      const shortPassword = 'Test1!'
      
      expect(() => PasswordUtils.validatePasswordStrength(shortPassword))
        .toThrow(/al menos 8 caracteres/)
    })

    it('should reject password without uppercase', () => {
      const noUppercase = 'testpassword123!'
      
      expect(() => PasswordUtils.validatePasswordStrength(noUppercase))
        .toThrow(/mayúscula/)
    })

    it('should reject password without lowercase', () => {
      const noLowercase = 'TESTPASSWORD123!'
      
      expect(() => PasswordUtils.validatePasswordStrength(noLowercase))
        .toThrow(/minúscula/)
    })

    it('should reject password without numbers', () => {
      const noNumbers = 'TestPassword!'
      
      expect(() => PasswordUtils.validatePasswordStrength(noNumbers))
        .toThrow(/número/)
    })

    it('should reject password too long', () => {
      const tooLong = 'A'.repeat(256) + 'a1!'
      
      expect(() => PasswordUtils.validatePasswordStrength(tooLong))
        .toThrow(/demasiado larga/)
    })
  })

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = PasswordUtils.generateSecurePassword()
      
      expect(password).toBeDefined()
      expect(password.length).toBe(16)
    })

    it('should generate password with custom length', () => {
      const length = 20
      const password = PasswordUtils.generateSecurePassword(length)
      
      expect(password.length).toBe(length)
    })

    it('should generate password with required character types', () => {
      const password = PasswordUtils.generateSecurePassword(16)
      
      expect(password).toMatch(/[a-z]/) // lowercase
      expect(password).toMatch(/[A-Z]/) // uppercase
      expect(password).toMatch(/[0-9]/) // numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/) // symbols
    })

    it('should throw error for length too short', () => {
      expect(() => PasswordUtils.generateSecurePassword(8))
        .toThrow(/at least 12 characters/)
    })

    it('should generate different passwords', () => {
      const password1 = PasswordUtils.generateSecurePassword()
      const password2 = PasswordUtils.generateSecurePassword()
      
      expect(password1).not.toBe(password2)
    })
  })

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      const commonPasswords = ['password', '123456', 'qwerty', 'admin']
      
      commonPasswords.forEach(password => {
        expect(PasswordUtils.isCommonPassword(password)).toBe(true)
      })
    })

    it('should not flag strong passwords as common', () => {
      const strongPassword = 'MySecureP@ssw0rd2024!'
      
      expect(PasswordUtils.isCommonPassword(strongPassword)).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(PasswordUtils.isCommonPassword('PASSWORD')).toBe(true)
      expect(PasswordUtils.isCommonPassword('Password')).toBe(true)
    })
  })

  describe('getPasswordStrength', () => {
    it('should rate very weak passwords correctly', () => {
      const veryWeak = '123'
      expect(PasswordUtils.getPasswordStrength(veryWeak)).toBeLessThanOrEqual(1)
    })

    it('should rate weak passwords correctly', () => {
      const weak = 'password123'
      // This will be penalized for being common, expect lower score
      expect(PasswordUtils.getPasswordStrength(weak)).toBeLessThanOrEqual(2)
    })

    it('should rate moderate passwords correctly', () => {
      const moderate = 'MyPassword123'
      expect(PasswordUtils.getPasswordStrength(moderate)).toBeGreaterThanOrEqual(2)
      expect(PasswordUtils.getPasswordStrength(moderate)).toBeLessThanOrEqual(3)
    })

    it('should rate strong passwords correctly', () => {
      const strong = 'StrongP@ssw0rd!'
      expect(PasswordUtils.getPasswordStrength(strong)).toBe(4)
    })

    it('should penalize common passwords', () => {
      const commonPasswords = ['password', '123456', 'qwerty']
      
      commonPasswords.forEach(password => {
        const strength = PasswordUtils.getPasswordStrength(password)
        expect(strength).toBeLessThanOrEqual(2) // Should be significantly reduced
      })
    })
  })

  describe('getPasswordStrengthDescription', () => {
    it('should return correct descriptions', () => {
      expect(PasswordUtils.getPasswordStrengthDescription('123')).toBe('Muy débil')
      expect(PasswordUtils.getPasswordStrengthDescription('password123')).toBe('Muy débil') // Common password penalty
      expect(PasswordUtils.getPasswordStrengthDescription('UniquePassword123')).toBe('Moderada')
      expect(PasswordUtils.getPasswordStrengthDescription('StrongP@ssw0rd!')).toBe('Fuerte')
    })
  })
})