import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

// Mock Web APIs for Node.js environment
global.Request = class MockRequest {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.body = init.body
  }
  
  get(name) {
    return this.headers.get(name)
  }
}

global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.headers = new Map(Object.entries(init.headers || {}))
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body))
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url
      this.nextUrl = new URL(url)
      this.method = init.method || 'GET'
      this.headers = new Map()
      
      // Add headers from init
      if (init.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value)
        })
      }
      
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
      }
    }
    
    json() {
      return Promise.resolve({})
    }
  },
  NextResponse: {
    json: jest.fn((data, init) => ({
      data,
      status: init?.status || 200,
      headers: init?.headers || {},
      cookies: {
        set: jest.fn(),
      },
    })),
    redirect: jest.fn((url, init) => ({
      url,
      status: init?.status || 302,
      cookies: {
        set: jest.fn(),
      },
    })),
  },
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.SESSION_DURATION_HOURS = '2'
process.env.SESSION_REMEMBER_DURATION_HOURS = '24'
process.env.RATE_LIMIT_MAX_ATTEMPTS = '5'
process.env.RATE_LIMIT_WINDOW_MINUTES = '15'

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Setup fetch mock
global.fetch = jest.fn()

// Mock crypto.randomBytes for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomBytes: (size: number) => {
      const buffer = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256)
      }
      return {
        toString: (encoding: string) => {
          if (encoding === 'hex') {
            return Array.from(buffer)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
          }
          return buffer.toString()
        }
      }
    },
    randomInt: (min: number, max?: number) => {
      if (max === undefined) {
        max = min
        min = 0
      }
      return Math.floor(Math.random() * (max - min)) + min
    }
  },
  writable: true,
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})