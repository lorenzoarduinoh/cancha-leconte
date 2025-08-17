import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { SessionManager } from '@/lib/auth/session'
import { PasswordUtils } from '@/lib/auth/password'
import { RateLimiter } from '@/lib/auth/rate-limiter'
import { withPublicSecurity, getRequestContext, logAuthEvent } from '@/lib/auth/middleware'
import { SecurityHeaders } from '@/lib/auth/csrf'
import { 
  loginRequestSchema, 
  LoginResponse, 
  LoginErrorResponse,
  AuthenticationError,
  RateLimitError,
  ValidationError
} from '@/lib/auth/types'

/**
 * POST /api/auth/login
 * Authenticate admin user with email/password
 */
export const POST = withPublicSecurity(
  async (request: NextRequest): Promise<NextResponse> => {
    const request_context = getRequestContext(request)
    
    try {
      // Parse and validate request body
      const body = await request.json()
      const validation_result = loginRequestSchema.safeParse(body)
      
      if (!validation_result.success) {
        const error_message = validation_result.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ')
        
        throw new ValidationError(
          `Datos de entrada inválidos: ${error_message}`,
          'request_body'
        )
      }

      const { email, password, remember_me } = validation_result.data

      // Check rate limiting specifically for login attempts
      const rate_limit_result = await RateLimiter.checkRateLimit(request, 'login')
      
      if (!rate_limit_result.allowed) {
        // Record failed attempt due to rate limiting
        await RateLimiter.recordAttempt(request, email, false)
        
        throw new RateLimitError(
          'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.',
          rate_limit_result.retry_after || 300
        )
      }

      const supabase = createServerClient()

      // Find admin user by email
      const { data: user, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single()

      if (userError || !user) {
        // Record failed attempt
        await RateLimiter.recordAttempt(request, email, false)
        
        // Log failed login attempt
        logAuthEvent('login_failure', request, { 
          email,
          reason: 'user_not_found'
        })

        throw new AuthenticationError(
          'Email o contraseña incorrectos',
          'INVALID_CREDENTIALS'
        )
      }

      // Verify password
      const is_password_valid = await PasswordUtils.verifyPassword(password, user.password_hash)
      
      if (!is_password_valid) {
        // Record failed attempt
        await RateLimiter.recordAttempt(request, email, false)
        
        // Log failed login attempt
        logAuthEvent('login_failure', request, { 
          email,
          user_id: user.id,
          reason: 'invalid_password'
        })

        throw new AuthenticationError(
          'Email o contraseña incorrectos',
          'INVALID_CREDENTIALS'
        )
      }

      // Create session
      const { token, session } = await SessionManager.createSession(
        user,
        remember_me,
        {
          ip_address: request_context.ip_address,
          user_agent: request_context.user_agent
        }
      )

      // Record successful attempt
      await RateLimiter.recordAttempt(request, email, true)

      // Log successful login
      logAuthEvent('login_success', request, { 
        email,
        user_id: user.id,
        remember_me,
        session_id: session.id
      })

      // Create response
      const response_data: LoginResponse = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        session: {
          expires_at: session.expires_at,
          remember_me: session.remember_me
        }
      }

      const response = NextResponse.json(response_data, { status: 200 })

      // Set session cookie
      SessionManager.setSessionCookie(response, token, remember_me)

      // Apply security headers
      SecurityHeaders.applyHeaders(response)

      return response

    } catch (error) {
      console.error('Login error:', error)

      // Handle specific error types
      if (error instanceof AuthenticationError) {
        const error_response: LoginErrorResponse = {
          success: false,
          error: error.message,
          code: error.code as any
        }
        
        const response = NextResponse.json(error_response, { 
          status: error.statusCode 
        })
        
        SecurityHeaders.applyHeaders(response)
        return response
      }

      if (error instanceof RateLimitError) {
        const error_response: LoginErrorResponse = {
          success: false,
          error: error.message,
          code: 'RATE_LIMITED',
          retry_after: error.retryAfter
        }
        
        const response = NextResponse.json(error_response, { 
          status: error.statusCode,
          headers: { 'Retry-After': error.retryAfter.toString() }
        })
        
        SecurityHeaders.applyHeaders(response)
        return response
      }

      if (error instanceof ValidationError) {
        const error_response: LoginErrorResponse = {
          success: false,
          error: error.message,
          code: 'INVALID_CREDENTIALS' // Don't expose validation details
        }
        
        const response = NextResponse.json(error_response, { 
          status: 400 
        })
        
        SecurityHeaders.applyHeaders(response)
        return response
      }

      // Generic server error
      const error_response: LoginErrorResponse = {
        success: false,
        error: 'Error interno del servidor. Inténtalo de nuevo más tarde.',
        code: 'SERVER_ERROR'
      }
      
      const response = NextResponse.json(error_response, { 
        status: 500 
      })
      
      SecurityHeaders.applyHeaders(response)
      return response
    }
  },
  {
    rate_limit: true,
    rate_limit_type: 'login',
    csrf_protection: true
  }
)

/**
 * GET /api/auth/login
 * Get login form with CSRF token
 */
export const GET = withPublicSecurity(
  async (request: NextRequest): Promise<NextResponse> => {
    try {
      const response_data = {
        success: true,
        message: 'Login endpoint ready',
        csrf_required: true
      }

      const response = NextResponse.json(response_data, { status: 200 })
      
      // Generate CSRF token for the login form
      SecurityHeaders.applyHeaders(response)
      
      return response
    } catch (error) {
      console.error('Login GET error:', error)
      
      const error_response = {
        success: false,
        error: 'Error interno del servidor',
        code: 'SERVER_ERROR'
      }
      
      const response = NextResponse.json(error_response, { status: 500 })
      SecurityHeaders.applyHeaders(response)
      return response
    }
  },
  {
    rate_limit: false,
    csrf_protection: true
  }
)

/**
 * Handle unsupported methods
 */
export async function handler(request: NextRequest) {
  if (!['GET', 'POST'].includes(request.method)) {
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Método no permitido',
        code: 'METHOD_NOT_ALLOWED'
      },
      { status: 405 }
    )
    
    SecurityHeaders.applyHeaders(response)
    return response
  }
}