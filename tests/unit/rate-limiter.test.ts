import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { RateLimiter } from '@/lib/auth/rate-limiter'
import { mockSupabaseClient, resetSupabaseMocks } from '../__mocks__/supabase'

describe('RateLimiter', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    resetSupabaseMocks()
    jest.clearAllMocks()
    
    // Use the mocked NextRequest from setup
    const { NextRequest } = require('next/server')
    mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 (Test Browser)',
      },
    })
    
    // Add proper headers mock
    mockRequest.headers = {
      get: jest.fn((name) => {
        const headers = {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)',
        }
        return headers[name.toLowerCase()]
      }),
    }
  })

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      // Mock database response with 0 attempts
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 0, recent_attempts: [] }],
        error: null,
      })

      const result = await RateLimiter.checkRateLimit(mockRequest, 'login')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5) // Default max attempts
      expect(result.reset_time).toBeInstanceOf(Date)
    })

    it('should block requests over the limit', async () => {
      // Mock database response with max attempts exceeded
      const recentAttempts = Array.from({ length: 6 }, (_, i) => 
        new Date(Date.now() - (i * 60000)).toISOString()
      )

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 6, recent_attempts: recentAttempts }],
        error: null,
      })

      const result = await RateLimiter.checkRateLimit(mockRequest, 'login')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retry_after).toBeGreaterThan(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await RateLimiter.checkRateLimit(mockRequest, 'login')

      // Should fail open (allow request) when rate limit check fails
      expect(result.allowed).toBe(true)
    })

    it('should use different limits for different endpoint types', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 10, recent_attempts: [] }],
        error: null,
      })

      const loginResult = await RateLimiter.checkRateLimit(mockRequest, 'login')
      const generalResult = await RateLimiter.checkRateLimit(mockRequest, 'general')

      expect(loginResult.allowed).toBe(false) // 10 > 5 (login limit)
      expect(generalResult.allowed).toBe(true) // 10 < 100 (general limit)
    })

    it('should calculate progressive delay correctly', async () => {
      const recentAttempts = Array.from({ length: 8 }, (_, i) => 
        new Date(Date.now() - (i * 60000)).toISOString()
      )

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 8, recent_attempts: recentAttempts }],
        error: null,
      })

      const result = await RateLimiter.checkRateLimit(mockRequest, 'login')

      expect(result.allowed).toBe(false)
      expect(result.retry_after).toBeGreaterThan(60) // Should have progressive delay
    })
  })

  describe('recordAttempt', () => {
    it('should record successful login attempt', async () => {
      const insertMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
      })

      await RateLimiter.recordAttempt(mockRequest, 'user@example.com', true)

      expect(insertMock).toHaveBeenCalledWith({
        ip_address: '192.168.1.1',
        email: 'user@example.com',
        success: true,
        user_agent: 'Mozilla/5.0 (Test Browser)',
        attempted_at: expect.any(String),
      })
    })

    it('should record failed login attempt', async () => {
      const insertMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
      })

      await RateLimiter.recordAttempt(mockRequest, 'user@example.com', false)

      expect(insertMock).toHaveBeenCalledWith({
        ip_address: '192.168.1.1',
        email: 'user@example.com',
        success: false,
        user_agent: 'Mozilla/5.0 (Test Browser)',
        attempted_at: expect.any(String),
      })
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Database error')),
      })

      // Should not throw error
      await expect(
        RateLimiter.recordAttempt(mockRequest, 'user@example.com', false)
      ).resolves.not.toThrow()
    })
  })

  describe('cleanupOldAttempts', () => {
    it('should clean up old attempts successfully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 15, // Number of cleaned up records
        error: null,
      })

      const result = await RateLimiter.cleanupOldAttempts()

      expect(result).toBe(15)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cleanup_old_login_attempts')
    })

    it('should handle cleanup errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Cleanup failed' },
      })

      const result = await RateLimiter.cleanupOldAttempts()

      expect(result).toBe(0)
    })
  })

  describe('getRateLimitStatus', () => {
    it('should get current rate limit status', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 3, recent_attempts: [] }],
        error: null,
      })

      const result = await RateLimiter.getRateLimitStatus('192.168.1.1', 'login')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2) // 5 - 3
    })

    it('should handle status check errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Status check failed' },
      })

      const result = await RateLimiter.getRateLimitStatus('192.168.1.1', 'login')

      // Should fail open
      expect(result.allowed).toBe(true)
    })
  })

  describe('IP address extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 0, recent_attempts: [] }],
        error: null,
      })

      await RateLimiter.checkRateLimit(request, 'login')

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_recent_login_attempts',
        expect.objectContaining({
          p_ip_address: '203.0.113.1', // First IP in the list
        })
      )
    })

    it('should extract IP from x-real-ip header', async () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-real-ip': '203.0.113.1',
        },
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 0, recent_attempts: [] }],
        error: null,
      })

      await RateLimiter.checkRateLimit(request, 'login')

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_recent_login_attempts',
        expect.objectContaining({
          p_ip_address: '203.0.113.1',
        })
      )
    })

    it('should fall back to default IP when no headers present', async () => {
      const request = new NextRequest('http://localhost:3000')

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ attempt_count: 0, recent_attempts: [] }],
        error: null,
      })

      await RateLimiter.checkRateLimit(request, 'login')

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_recent_login_attempts',
        expect.objectContaining({
          p_ip_address: '127.0.0.1',
        })
      )
    })
  })

  describe('Progressive delay calculation', () => {
    it('should calculate exponential backoff with cap', async () => {
      // Test with various attempt counts
      const testCases = [
        { attempts: 6, expectedMinDelay: 60 }, // Base delay
        { attempts: 7, expectedMinDelay: 120 }, // 2x
        { attempts: 8, expectedMinDelay: 240 }, // 4x
        { attempts: 10, expectedMinDelay: 960 }, // 8x (capped)
        { attempts: 15, expectedMinDelay: 960 }, // Still capped at 8x
      ]

      for (const testCase of testCases) {
        const recentAttempts = Array.from({ length: testCase.attempts }, (_, i) => 
          new Date(Date.now() - (i * 60000)).toISOString()
        )

        mockSupabaseClient.rpc.mockResolvedValue({
          data: [{ attempt_count: testCase.attempts, recent_attempts: recentAttempts }],
          error: null,
        })

        const result = await RateLimiter.checkRateLimit(mockRequest, 'login')

        expect(result.allowed).toBe(false)
        expect(result.retry_after).toBeGreaterThanOrEqual(testCase.expectedMinDelay)
      }
    })
  })
})