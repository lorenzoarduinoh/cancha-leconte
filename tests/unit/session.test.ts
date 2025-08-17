import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { mockSupabaseClient, resetSupabaseMocks } from '../__mocks__/supabase'

// Mock jose library
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: jest.fn(),
}))

describe('SessionManager', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin' as const,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    last_login_at: null,
  }

  const mockRequestContext = {
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Test Browser)',
  }

  beforeEach(() => {
    resetSupabaseMocks()
    jest.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        session_token: 'session-token-123',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        remember_me: false,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Test Browser)',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      // Mock database responses
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      const result = await SessionManager.createSession(
        mockUser,
        false,
        mockRequestContext
      )

      expect(result).toBeDefined()
      expect(result.token).toBe('mock-jwt-token')
      expect(result.session).toEqual(mockSession)
    })

    it('should create remember_me session with longer duration', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        session_token: 'session-token-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        remember_me: true,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 (Test Browser)',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      const result = await SessionManager.createSession(
        mockUser,
        true,
        mockRequestContext
      )

      expect(result.session.remember_me).toBe(true)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      await expect(
        SessionManager.createSession(mockUser, false, mockRequestContext)
      ).rejects.toThrow('Session creation failed')
    })
  })

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const { jwtVerify } = await import('jose')
      const mockPayload = {
        sub: 'user-123',
        username: 'testuser',
        name: 'Test User',
        role: 'admin',
        session_id: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000),
        remember_me: false,
      }

      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      })

      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        remember_me: false,
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      })

      // Mock user query
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'admin_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSession,
                  error: null,
                }),
              }),
            }),
          }
        } else if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockUser,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await SessionManager.validateSession('valid-token')

      expect(result.valid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
    })

    it('should reject expired token', async () => {
      const { jwtVerify } = await import('jose')
      const mockPayload = {
        sub: 'user-123',
        exp: Math.floor((Date.now() - 1000) / 1000), // Expired
      }

      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      })

      const result = await SessionManager.validateSession('expired-token')

      expect(result.valid).toBe(false)
    })

    it('should reject invalid token', async () => {
      const { jwtVerify } = await import('jose')
      ;(jwtVerify as jest.Mock).mockRejectedValue(new Error('Invalid token'))

      const result = await SessionManager.validateSession('invalid-token')

      expect(result.valid).toBe(false)
    })

    it('should reject if session not found in database', async () => {
      const { jwtVerify } = await import('jose')
      const mockPayload = {
        sub: 'user-123',
        session_id: 'session-123',
        exp: Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000),
      }

      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const result = await SessionManager.validateSession('token-without-session')

      expect(result.valid).toBe(false)
    })
  })

  describe('destroySession', () => {
    it('should destroy session successfully', async () => {
      const deleteMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: deleteMock,
        }),
      })

      await expect(
        SessionManager.destroySession('session-123')
      ).resolves.not.toThrow()

      expect(deleteMock).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      })

      // Should not throw error
      await expect(
        SessionManager.destroySession('session-123')
      ).resolves.not.toThrow()
    })
  })

  describe('setSessionCookie', () => {
    it('should set session cookie with correct options', () => {
      const response = new NextResponse()
      const setCookieMock = jest.fn()
      response.cookies.set = setCookieMock

      SessionManager.setSessionCookie(response, 'test-token', false)

      expect(setCookieMock).toHaveBeenCalledWith(
        'cancha-admin-session',
        'test-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'lax',
          path: '/',
        })
      )
    })

    it('should set longer expiry for remember_me sessions', () => {
      const response = new NextResponse()
      const setCookieMock = jest.fn()
      response.cookies.set = setCookieMock

      SessionManager.setSessionCookie(response, 'test-token', true)

      const call = setCookieMock.mock.calls[0]
      const options = call[2]
      
      expect(options.expires).toBeInstanceOf(Date)
      // Should be around 24 hours from now (allowing some tolerance)
      const expectedTime = Date.now() + 24 * 60 * 60 * 1000
      const actualTime = options.expires.getTime()
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(5000) // 5 second tolerance
    })
  })

  describe('clearSessionCookie', () => {
    it('should clear session cookie', () => {
      const response = new NextResponse()
      const setCookieMock = jest.fn()
      response.cookies.set = setCookieMock

      SessionManager.clearSessionCookie(response)

      expect(setCookieMock).toHaveBeenCalledWith(
        'cancha-admin-session',
        '',
        expect.objectContaining({
          httpOnly: true,
          expires: new Date(0),
          path: '/',
        })
      )
    })
  })

  describe('getSessionToken', () => {
    it('should get session token from request', () => {
      const { NextRequest } = require('next/server')
      const request = new NextRequest('http://localhost:3000')
      const getMock = jest.fn().mockReturnValue({ value: 'test-token' })
      
      // Mock the cookies.get method
      request.cookies = { get: getMock }

      const token = SessionManager.getSessionToken(request)

      expect(getMock).toHaveBeenCalledWith('cancha-admin-session')
      expect(token).toBe('test-token')
    })

    it('should return null when no token present', () => {
      const { NextRequest } = require('next/server')
      const request = new NextRequest('http://localhost:3000')
      const getMock = jest.fn().mockReturnValue(undefined)
      
      request.cookies = { get: getMock }

      const token = SessionManager.getSessionToken(request)

      expect(token).toBeNull()
    })
  })
})