/**
 * Security configuration for Cancha Leconte authentication system
 * Centralizes all security-related settings and constants
 */

export const SECURITY_CONFIG = {
  // Session Configuration
  SESSION: {
    COOKIE_NAME: 'cancha-admin-session',
    CSRF_COOKIE_NAME: 'cancha-csrf-token',
    DEFAULT_DURATION_HOURS: parseInt(process.env.SESSION_DURATION_HOURS || '2'),
    REMEMBER_ME_DURATION_HOURS: parseInt(process.env.SESSION_REMEMBER_DURATION_HOURS || '24'),
    CLEANUP_INTERVAL_HOURS: 24,
    REFRESH_THRESHOLD_HOURS: 0.5, // Refresh when less than 30 minutes remaining
    REFRESH_THRESHOLD_REMEMBER_HOURS: 1 // Refresh when less than 1 hour remaining for remember_me
  },

  // Password Requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 255,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false,
    SALT_ROUNDS: 12,
    COMMON_PASSWORDS_CHECK: true
  },

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN: {
      MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5'),
      WINDOW_MINUTES: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15'),
      PROGRESSIVE_DELAY: true,
      BASE_DELAY_SECONDS: 60,
      MAX_DELAY_MULTIPLIER: 8
    },
    GENERAL_API: {
      MAX_ATTEMPTS: 100,
      WINDOW_MINUTES: 15,
      PROGRESSIVE_DELAY: false
    },
    CLEANUP_INTERVAL_HOURS: 24
  },

  // JWT Configuration
  JWT: {
    ALGORITHM: 'HS256' as const,
    SECRET_MIN_LENGTH: 32,
    ISSUER: 'cancha-leconte',
    AUDIENCE: 'admin-users'
  },

  // CSRF Protection
  CSRF: {
    TOKEN_LENGTH: 32,
    HEADER_NAME: 'x-csrf-token',
    FORM_FIELD_NAME: '_csrf_token',
    COOKIE_DURATION_HOURS: 24
  },

  // Security Headers
  HEADERS: {
    CONTENT_SECURITY_POLICY: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    PERMISSIONS_POLICY: [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'serial=()',
      'bluetooth=()'
    ],
    STRICT_TRANSPORT_SECURITY: {
      MAX_AGE: 31536000, // 1 year
      INCLUDE_SUBDOMAINS: true,
      PRELOAD: true
    }
  },

  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean),
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    ALLOW_CREDENTIALS: true,
    MAX_AGE: 86400 // 24 hours
  },

  // Logging Configuration
  LOGGING: {
    SENSITIVE_HEADERS: [
      'authorization',
      'cookie',
      'x-csrf-token',
      'x-api-key'
    ],
    LOG_LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    AUTH_EVENTS: {
      LOGIN_SUCCESS: 'login_success',
      LOGIN_FAILURE: 'login_failure',
      LOGOUT: 'logout',
      SESSION_EXPIRED: 'session_expired',
      UNAUTHORIZED_ACCESS: 'unauthorized_access',
      RATE_LIMITED: 'rate_limited',
      CSRF_VIOLATION: 'csrf_violation'
    }
  },

  // Environment-specific settings
  ENVIRONMENT: {
    PRODUCTION: process.env.NODE_ENV === 'production',
    DEVELOPMENT: process.env.NODE_ENV === 'development',
    TESTING: process.env.NODE_ENV === 'test'
  },

  // Admin User Configuration
  ADMIN_USERS: {
    MAX_ACTIVE_SESSIONS: 5, // Maximum concurrent sessions per admin
    FORCE_PASSWORD_CHANGE_DAYS: 90, // Force password change every 90 days
    ACCOUNT_LOCKOUT_THRESHOLD: 10, // Lock account after 10 failed attempts
    ACCOUNT_LOCKOUT_DURATION_MINUTES: 30
  },

  // Database Configuration
  DATABASE: {
    CONNECTION_TIMEOUT_MS: 30000,
    QUERY_TIMEOUT_MS: 60000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  }
} as const

/**
 * Validation functions for security configuration
 */
export class SecurityConfigValidator {
  /**
   * Validate that all required environment variables are set
   */
  static validateEnvironment(): void {
    const required_env_vars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'SESSION_SECRET'
    ]

    const missing_vars = required_env_vars.filter(
      var_name => !process.env[var_name]
    )

    if (missing_vars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing_vars.join(', ')}`
      )
    }

    // Validate JWT secret length
    const jwt_secret = process.env.JWT_SECRET
    if (jwt_secret && jwt_secret.length < SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH) {
      throw new Error(
        `JWT_SECRET must be at least ${SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH} characters long`
      )
    }

    // Validate session secret length
    const session_secret = process.env.SESSION_SECRET
    if (session_secret && session_secret.length < SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH) {
      throw new Error(
        `SESSION_SECRET must be at least ${SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH} characters long`
      )
    }
  }

  /**
   * Get Content Security Policy string
   */
  static getCSPString(): string {
    const csp = SECURITY_CONFIG.HEADERS.CONTENT_SECURITY_POLICY
    
    return Object.entries(csp)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ')
  }

  /**
   * Get Permissions Policy string
   */
  static getPermissionsPolicyString(): string {
    return SECURITY_CONFIG.HEADERS.PERMISSIONS_POLICY.join(', ')
  }

  /**
   * Get Strict Transport Security string
   */
  static getSTSString(): string {
    const sts = SECURITY_CONFIG.HEADERS.STRICT_TRANSPORT_SECURITY
    let sts_string = `max-age=${sts.MAX_AGE}`
    
    if (sts.INCLUDE_SUBDOMAINS) {
      sts_string += '; includeSubDomains'
    }
    
    if (sts.PRELOAD) {
      sts_string += '; preload'
    }
    
    return sts_string
  }
}

/**
 * Helper functions for accessing configuration
 */
export const getSessionConfig = () => SECURITY_CONFIG.SESSION
export const getPasswordConfig = () => SECURITY_CONFIG.PASSWORD
export const getRateLimitConfig = () => SECURITY_CONFIG.RATE_LIMIT
export const getCSRFConfig = () => SECURITY_CONFIG.CSRF
export const getCORSConfig = () => SECURITY_CONFIG.CORS
export const getLoggingConfig = () => SECURITY_CONFIG.LOGGING

/**
 * Runtime configuration validation
 */
if (typeof window === 'undefined') {
  // Only validate on server-side
  try {
    SecurityConfigValidator.validateEnvironment()
  } catch (error) {
    console.error('Security configuration validation failed:', error)
    if (SECURITY_CONFIG.ENVIRONMENT.PRODUCTION) {
      process.exit(1)
    }
  }
}