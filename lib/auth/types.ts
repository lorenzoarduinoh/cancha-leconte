import { z } from 'zod'

// Database types
export interface AdminUser {
  id: string
  username: string
  email?: string
  name: string
  role: 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface AdminSession {
  id: string
  user_id: string
  session_token: string
  expires_at: string
  remember_me: boolean
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export interface LoginAttempt {
  id: string
  ip_address: string
  email: string | null
  success: boolean
  attempted_at: string
  user_agent: string | null
}

// API Request/Response types
export interface LoginRequest {
  username: string
  password: string
  remember_me?: boolean
}

export interface LoginResponse {
  success: true
  user: {
    id: string
    username: string
    name: string
    role: 'admin'
  }
  session: {
    expires_at: string
    remember_me: boolean
  }
}

export interface LoginErrorResponse {
  success: false
  error: string
  code: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'ACCOUNT_DISABLED' | 'SERVER_ERROR'
  retry_after?: number
}

export interface SessionValidationResponse {
  valid: true
  user: {
    id: string
    username: string
    name: string
    role: 'admin'
  }
  session: {
    expires_at: string
    remember_me: boolean
  }
}

export interface SessionValidationErrorResponse {
  valid: false
  error: string
  code: 'INVALID_SESSION' | 'EXPIRED_SESSION' | 'SERVER_ERROR'
}

export interface LogoutResponse {
  success: true
  message: string
}

export interface LogoutErrorResponse {
  success: false
  error: string
  code: 'INVALID_SESSION' | 'SERVER_ERROR'
}

// Validation schemas using Zod
export const loginRequestSchema = z.object({
  username: z.string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50, 'Usuario demasiado largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Usuario debe contener solo letras, números, guiones y guiones bajos'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(255, 'Contraseña demasiado larga'),
  remember_me: z.boolean().optional().default(false)
})

export const passwordValidationSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(255, 'Contraseña demasiado larga')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'
  )

// Authentication context types
export interface AuthContextType {
  user: AdminUser | null
  session: AdminSession | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<LoginResponse | LoginErrorResponse>
  logout: () => Promise<void>
  validateSession: () => Promise<boolean>
}

// JWT payload type
export interface JWTPayload {
  sub: string // user id
  username: string
  name: string
  role: 'admin'
  session_id: string
  iat: number
  exp: number
  remember_me: boolean
  [key: string]: any
}

// Rate limiting types
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset_time: Date
  retry_after?: number
}

export interface RateLimitConfig {
  max_attempts: number
  window_minutes: number
  progressive_delay: boolean
}

// Security types
export interface SecurityHeaders {
  'Content-Security-Policy': string
  'X-Frame-Options': string
  'X-Content-Type-Options': string
  'Referrer-Policy': string
  'Permissions-Policy': string
  'Strict-Transport-Security': string
}

export interface RequestContext {
  ip_address: string
  user_agent: string | null
  csrf_token?: string
  session_token?: string
}

// Error types
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public statusCode: number = 429
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Utility types
export type AuthEndpoint = '/api/auth/login' | '/api/auth/logout' | '/api/auth/validate'

export type SessionDuration = 'default' | 'remember_me'

export interface SessionConfig {
  default_duration_hours: number
  remember_me_duration_hours: number
  cleanup_interval_hours: number
}