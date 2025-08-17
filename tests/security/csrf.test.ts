import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { initializeCSRF, fetchWithCSRF } from '@/app/lib/utils/csrf'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('CSRF Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up default CSRF token cookie for tests
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'cancha-csrf-token=test-csrf-token',
    })
  })

  describe('initializeCSRF', () => {
    it('should fetch CSRF token from server', async () => {
      // Mock setting the cookie when the request is made
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ csrf_token: 'test-csrf-token' }),
      }
      mockFetch.mockResolvedValue(mockResponse)
      
      // Simulate server setting the cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'cancha-csrf-token=test-csrf-token',
      })

      const token = await initializeCSRF()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'GET',
        credentials: 'include',
      })
      expect(token).toBe('test-csrf-token')
    })

    it('should handle server errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      }
      mockFetch.mockResolvedValue(mockResponse)

      const token = await initializeCSRF()

      expect(token).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const token = await initializeCSRF()

      expect(token).toBeNull()
    })

    it('should handle malformed response gracefully', async () => {
      // Clear cookies for this test
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      })
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const token = await initializeCSRF()

      expect(token).toBeNull()
    })
  })

  describe('fetchWithCSRF', () => {
    beforeEach(() => {
      // Mock document.cookie for CSRF token
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'cancha-csrf-token=test-csrf-token; path=/',
      })
    })

    it('should include CSRF token in headers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        credentials: 'include',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
    })

    it('should merge custom headers with CSRF header', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value',
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
    })

    it('should throw error when CSRF token is missing', async () => {
      // Clear the CSRF token cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      })

      await expect(
        fetchWithCSRF('/api/test', { method: 'POST' })
      ).rejects.toThrow('CSRF token not found')
    })

    it('should handle GET requests without CSRF token requirement', async () => {
      // Clear the CSRF token cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      })

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        credentials: 'include',
        headers: {},
      })
    })

    it('should override headers object correctly', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const options = {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }

      await fetchWithCSRF('/api/test', options)

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json', // Headers API normalizes to lowercase
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
    })
  })

  describe('Cookie parsing', () => {
    it('should parse CSRF token from complex cookie string', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'session=abc123; cancha-csrf-token=test-csrf-token; other=value',
      })

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', { method: 'POST' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': 'test-csrf-token',
        },
      })
    })

    it('should handle URL-encoded cookie values', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'cancha-csrf-token=test%2Dcsrf%2Dtoken; path=/',
      })

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', { method: 'POST' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': 'test-csrf-token', // Should be decoded
        },
      })
    })

    it('should handle empty cookie values', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'cancha-csrf-token=; other=value',
      })

      await expect(
        fetchWithCSRF('/api/test', { method: 'POST' })
      ).rejects.toThrow('CSRF token not found')
    })
  })

  describe('Security headers', () => {
    it('should always include credentials', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })

    it('should preserve existing credentials setting', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      mockFetch.mockResolvedValue(mockResponse)

      await fetchWithCSRF('/api/test', {
        method: 'GET',
        credentials: 'same-origin',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include', // Should be overridden for security
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(
        fetchWithCSRF('/api/test', { method: 'GET' })
      ).rejects.toThrow('Network error')
    })

    it('should pass through HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      }
      mockFetch.mockResolvedValue(mockResponse)

      const response = await fetchWithCSRF('/api/test', { method: 'GET' })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })
})