import { describe, it, expect } from '@jest/globals'
import { 
  AuthenticationError, 
  RateLimitError, 
  ValidationError,
  loginRequestSchema,
  passwordValidationSchema 
} from '@/lib/auth/types'

describe('Authentication Types', () => {
  describe('AuthenticationError', () => {
    it('should create error with correct properties', () => {
      const error = new AuthenticationError('Test message', 'TEST_CODE', 401, 300)
      
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.statusCode).toBe(401)
      expect(error.retryAfter).toBe(300)
      expect(error.name).toBe('AuthenticationError')
    })

    it('should use default status code', () => {
      const error = new AuthenticationError('Test message', 'TEST_CODE')
      
      expect(error.statusCode).toBe(401)
      expect(error.retryAfter).toBeUndefined()
    })
  })

  describe('RateLimitError', () => {
    it('should create rate limit error with correct properties', () => {
      const error = new RateLimitError('Rate limited', 300, 429)
      
      expect(error.message).toBe('Rate limited')
      expect(error.retryAfter).toBe(300)
      expect(error.statusCode).toBe(429)
      expect(error.name).toBe('RateLimitError')
    })

    it('should use default status code', () => {
      const error = new RateLimitError('Rate limited', 300)
      
      expect(error.statusCode).toBe(429)
    })
  })

  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid field', 'username', 400)
      
      expect(error.message).toBe('Invalid field')
      expect(error.field).toBe('username')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('ValidationError')
    })

    it('should use default status code', () => {
      const error = new ValidationError('Invalid field', 'username')
      
      expect(error.statusCode).toBe(400)
    })
  })

  describe('loginRequestSchema', () => {
    it('should validate valid login request', () => {
      const validData = {
        username: 'testuser',
        password: 'ValidPassword123',
        remember_me: false
      }

      const result = loginRequestSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('should reject invalid username characters', () => {
      const invalidData = {
        username: 'test@user',
        password: 'ValidPassword123',
        remember_me: false
      }

      expect(() => loginRequestSchema.parse(invalidData)).toThrow()
    })

    it('should reject short password', () => {
      const invalidData = {
        username: 'testuser',
        password: '1234567',
        remember_me: false
      }

      expect(() => loginRequestSchema.parse(invalidData)).toThrow()
    })

    it('should default remember_me to false', () => {
      const data = {
        username: 'testuser',
        password: 'ValidPassword123'
      }

      const result = loginRequestSchema.parse(data)
      expect(result.remember_me).toBe(false)
    })
  })

  describe('passwordValidationSchema', () => {
    it('should accept strong password', () => {
      const strongPassword = 'StrongPassword123'
      
      expect(() => passwordValidationSchema.parse(strongPassword)).not.toThrow()
    })

    it('should reject password without lowercase', () => {
      const password = 'STRONGPASSWORD123'
      
      expect(() => passwordValidationSchema.parse(password)).toThrow()
    })

    it('should reject password without uppercase', () => {
      const password = 'strongpassword123'
      
      expect(() => passwordValidationSchema.parse(password)).toThrow()
    })

    it('should reject password without numbers', () => {
      const password = 'StrongPassword'
      
      expect(() => passwordValidationSchema.parse(password)).toThrow()
    })

    it('should reject password too short', () => {
      const password = 'Short1A'
      
      expect(() => passwordValidationSchema.parse(password)).toThrow()
    })

    it('should reject password too long', () => {
      const password = 'A1' + 'a'.repeat(254)
      
      expect(() => passwordValidationSchema.parse(password)).toThrow()
    })
  })
})