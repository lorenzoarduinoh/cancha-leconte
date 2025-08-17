import { describe, it, expect } from '@jest/globals'
import { loginSchema, AUTH_ERROR_MESSAGES } from '@/app/lib/validations/auth'
import { loginRequestSchema, passwordValidationSchema } from '@/lib/auth/types'

describe('Validation Schemas', () => {
  describe('loginSchema (frontend)', () => {
    it('should validate correct login data', () => {
      const validData = {
        username: 'testuser',
        password: 'TestPassword123!',
        rememberMe: false,
      }

      const result = loginSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('should require username', () => {
      const invalidData = {
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/obligatorio/)
    })

    it('should reject username too short', () => {
      const invalidData = {
        username: 'ab',
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/al menos 3 caracteres/)
    })

    it('should reject username too long', () => {
      const invalidData = {
        username: 'a'.repeat(51),
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/demasiado largo/)
    })

    it('should reject username with invalid characters', () => {
      const invalidData = {
        username: 'test@user',
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/letras, números, guiones/)
    })

    it('should accept valid username formats', () => {
      const validUsernames = [
        'testuser',
        'test_user',
        'test-user',
        'user123',
        'USER123',
        'Test_User-123',
      ]

      validUsernames.forEach(username => {
        const data = {
          username,
          password: 'TestPassword123!',
          rememberMe: false,
        }

        expect(() => loginSchema.parse(data)).not.toThrow()
      })
    })

    it('should require password', () => {
      const invalidData = {
        username: 'testuser',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty password', () => {
      const invalidData = {
        username: 'testuser',
        password: '',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/obligatoria/)
    })

    it('should reject password too short', () => {
      const invalidData = {
        username: 'testuser',
        password: '1234567',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/al menos 8 caracteres/)
    })

    it('should reject password too long', () => {
      const invalidData = {
        username: 'testuser',
        password: 'a'.repeat(129),
        rememberMe: false,
      }

      expect(() => loginSchema.parse(invalidData)).toThrow(/demasiado larga/)
    })

    it('should default rememberMe to false', () => {
      const data = {
        username: 'testuser',
        password: 'TestPassword123!',
      }

      const result = loginSchema.parse(data)
      expect(result.rememberMe).toBe(false)
    })

    it('should accept explicit rememberMe values', () => {
      const dataTrue = {
        username: 'testuser',
        password: 'TestPassword123!',
        rememberMe: true,
      }

      const dataFalse = {
        username: 'testuser',
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(loginSchema.parse(dataTrue).rememberMe).toBe(true)
      expect(loginSchema.parse(dataFalse).rememberMe).toBe(false)
    })
  })

  describe('loginRequestSchema (backend)', () => {
    it('should validate correct login request', () => {
      const validData = {
        username: 'testuser',
        password: 'TestPassword123!',
        remember_me: false,
      }

      const result = loginRequestSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('should apply same username validation as frontend', () => {
      const invalidUsernames = [
        'ab', // too short
        'a'.repeat(51), // too long
        'test@user', // invalid characters
        'test user', // spaces not allowed
        'test.user', // dots not allowed
      ]

      invalidUsernames.forEach(username => {
        const data = {
          username,
          password: 'TestPassword123!',
          remember_me: false,
        }

        expect(() => loginRequestSchema.parse(data)).toThrow()
      })
    })

    it('should validate password length', () => {
      const shortPassword = {
        username: 'testuser',
        password: '1234567', // 7 characters
        remember_me: false,
      }

      const longPassword = {
        username: 'testuser',
        password: 'a'.repeat(256), // 256 characters
        remember_me: false,
      }

      expect(() => loginRequestSchema.parse(shortPassword)).toThrow(/al menos 8 caracteres/)
      expect(() => loginRequestSchema.parse(longPassword)).toThrow(/demasiado larga/)
    })

    it('should default remember_me to false', () => {
      const data = {
        username: 'testuser',
        password: 'TestPassword123!',
      }

      const result = loginRequestSchema.parse(data)
      expect(result.remember_me).toBe(false)
    })
  })

  describe('passwordValidationSchema', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPassword123!'

      expect(() => passwordValidationSchema.parse(strongPassword)).not.toThrow()
    })

    it('should reject password without lowercase', () => {
      const noLowercase = 'STRONGPASSWORD123!'

      expect(() => passwordValidationSchema.parse(noLowercase))
        .toThrow(/minúscula/)
    })

    it('should reject password without uppercase', () => {
      const noUppercase = 'strongpassword123!'

      expect(() => passwordValidationSchema.parse(noUppercase))
        .toThrow(/mayúscula/)
    })

    it('should reject password without numbers', () => {
      const noNumbers = 'StrongPassword!'

      expect(() => passwordValidationSchema.parse(noNumbers))
        .toThrow(/número/)
    })

    it('should require all character types', () => {
      const testCases = [
        { password: 'alllowercase123!', missing: 'uppercase' },
        { password: 'ALLUPPERCASE123!', missing: 'lowercase' },
        { password: 'NoNumbers!', missing: 'number' },
        { password: 'NoSpecialChars123', missing: 'special requirement not enforced in this schema' },
      ]

      testCases.forEach(({ password, missing }) => {
        if (missing !== 'special requirement not enforced in this schema') {
          expect(() => passwordValidationSchema.parse(password)).toThrow()
        }
      })
    })

    it('should accept passwords with various valid formats', () => {
      const validPasswords = [
        'Password123!',
        'MySecure123',
        'Test1234A',
        'Complex9Pass',
        'Str0ngP4ssw0rd',
      ]

      validPasswords.forEach(password => {
        expect(() => passwordValidationSchema.parse(password)).not.toThrow()
      })
    })

    it('should enforce length requirements', () => {
      const tooShort = 'Short1A'
      const tooLong = 'A1a' + 'a'.repeat(253) // 256 characters total

      expect(() => passwordValidationSchema.parse(tooShort))
        .toThrow(/al menos 8 caracteres/)
      expect(() => passwordValidationSchema.parse(tooLong))
        .toThrow(/demasiado larga/)
    })
  })

  describe('AUTH_ERROR_MESSAGES', () => {
    it('should contain all required error messages', () => {
      const requiredMessages = [
        'INVALID_CREDENTIALS',
        'ACCOUNT_LOCKED',
        'RATE_LIMITED',
        'NETWORK_ERROR',
        'SERVER_ERROR',
        'UNKNOWN_ERROR',
      ]

      requiredMessages.forEach(key => {
        expect(AUTH_ERROR_MESSAGES).toHaveProperty(key)
        expect(typeof AUTH_ERROR_MESSAGES[key as keyof typeof AUTH_ERROR_MESSAGES]).toBe('string')
        expect(AUTH_ERROR_MESSAGES[key as keyof typeof AUTH_ERROR_MESSAGES].length).toBeGreaterThan(0)
      })
    })

    it('should have messages in Spanish', () => {
      // Check that messages contain Spanish words/patterns
      expect(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS).toMatch(/incorrectos/)
      expect(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED).toMatch(/bloqueada/)
      expect(AUTH_ERROR_MESSAGES.RATE_LIMITED).toMatch(/intentos/)
      expect(AUTH_ERROR_MESSAGES.NETWORK_ERROR).toMatch(/conexión/)
      expect(AUTH_ERROR_MESSAGES.SERVER_ERROR).toMatch(/servidor/)
    })

    it('should provide user-friendly messages', () => {
      Object.values(AUTH_ERROR_MESSAGES).forEach(message => {
        expect(message.length).toBeGreaterThan(10) // Not just error codes
        // Allow "Error de" in Spanish but not raw ERROR codes
        expect(message).not.toMatch(/\bERROR\b|\bFAIL\b|\bEXCEPTION\b/) // Not technical terms
      })
    })
  })

  describe('Edge cases and security', () => {
    it('should handle unicode characters in username', () => {
      const unicodeUsername = 'test🚀user'

      const data = {
        username: unicodeUsername,
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(data)).toThrow() // Should reject unicode
    })

    it('should handle SQL injection attempts in username', () => {
      const sqlInjection = "admin'; DROP TABLE users; --"

      const data = {
        username: sqlInjection,
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(data)).toThrow() // Should reject special characters
    })

    it('should handle very long inputs gracefully', () => {
      const veryLongUsername = 'a'.repeat(1000)
      const veryLongPassword = 'A1a' + 'a'.repeat(1000)

      const usernameData = {
        username: veryLongUsername,
        password: 'TestPassword123!',
        rememberMe: false,
      }

      const passwordData = {
        username: 'testuser',
        password: veryLongPassword,
        rememberMe: false,
      }

      expect(() => loginSchema.parse(usernameData)).toThrow()
      expect(() => loginSchema.parse(passwordData)).toThrow()
    })

    it('should handle null and undefined values', () => {
      const nullData = {
        username: null,
        password: 'TestPassword123!',
        rememberMe: false,
      }

      const undefinedData = {
        username: undefined,
        password: 'TestPassword123!',
        rememberMe: false,
      }

      expect(() => loginSchema.parse(nullData)).toThrow()
      expect(() => loginSchema.parse(undefinedData)).toThrow()
    })
  })
})