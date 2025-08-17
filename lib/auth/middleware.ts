import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from './session'
import { withRateLimit } from './rate-limiter'
import { withSecurity } from './csrf'
import { AuthenticationError, ValidationError, RateLimitError } from './types'

/**
 * Authentication middleware for protecting routes
 */
export class AuthMiddleware {
  /**
   * Authenticate request and return user/session information
   */
  static async authenticate(request: NextRequest): Promise<{
    user: any
    session: any
    payload: any
  }> {
    const session_token = SessionManager.getSessionToken(request)
    
    if (!session_token) {
      throw new AuthenticationError(
        'Token de sesión requerido',
        'SESSION_REQUIRED',
        401
      )
    }

    const validation_result = await SessionManager.validateSession(session_token)
    
    if (!validation_result.valid || !validation_result.user || !validation_result.session) {
      throw new AuthenticationError(
        'Sesión inválida o expirada',
        'INVALID_SESSION',
        401
      )
    }

    return {
      user: validation_result.user,
      session: validation_result.session,
      payload: validation_result.payload
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(user: any, required_role: 'admin'): boolean {
    return user.role === required_role && user.is_active
  }

  /**
   * Create error response for authentication failures
   */
  static createErrorResponse(error: Error): NextResponse {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code
        },
        { 
          status: error.statusCode,
          ...(error.retryAfter && {
            headers: { 'Retry-After': error.retryAfter.toString() }
          })
        }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'RATE_LIMITED',
          retry_after: error.retryAfter
        },
        { 
          status: error.statusCode,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'VALIDATION_ERROR',
          field: error.field
        },
        { status: error.statusCode }
      )
    }

    // Generic server error
    console.error('Middleware error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(
  handler: (request: NextRequest, context: { user: any; session: any }) => Promise<NextResponse>,
  options: {
    required_role?: 'admin'
    rate_limit?: boolean
    csrf_protection?: boolean
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Apply rate limiting if enabled
      if (options.rate_limit !== false) {
        await withRateLimit(request, 'general')
      }

      // Apply security middleware (including CSRF) if enabled
      if (options.csrf_protection !== false) {
        return await withSecurity(request, async (req) => {
          // Authenticate user
          const auth_context = await AuthMiddleware.authenticate(req)
          
          // Check role if required
          if (options.required_role && !AuthMiddleware.hasRole(auth_context.user, options.required_role)) {
            throw new AuthenticationError(
              'Permisos insuficientes',
              'INSUFFICIENT_PERMISSIONS',
              403
            )
          }

          // Call the handler with authenticated context
          return handler(req, auth_context)
        })
      } else {
        // Authenticate user without CSRF protection
        const auth_context = await AuthMiddleware.authenticate(request)
        
        // Check role if required
        if (options.required_role && !AuthMiddleware.hasRole(auth_context.user, options.required_role)) {
          throw new AuthenticationError(
            'Permisos insuficientes',
            'INSUFFICIENT_PERMISSIONS',
            403
          )
        }

        // Call the handler with authenticated context
        return handler(request, auth_context)
      }
    } catch (error) {
      return AuthMiddleware.createErrorResponse(error as Error)
    }
  }
}

/**
 * Middleware for public endpoints that still need security features
 */
export function withPublicSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    rate_limit?: boolean
    rate_limit_type?: 'login' | 'general'
    csrf_protection?: boolean
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Apply rate limiting if enabled
      if (options.rate_limit !== false) {
        await withRateLimit(request, options.rate_limit_type || 'general')
      }

      // Apply security middleware if enabled
      if (options.csrf_protection !== false) {
        return await withSecurity(request, handler)
      } else {
        return handler(request)
      }
    } catch (error) {
      return AuthMiddleware.createErrorResponse(error as Error)
    }
  }
}

/**
 * Utility function to get authenticated user from request
 * For use within API handlers
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  user: any
  session: any
  payload: any
} | null> {
  try {
    return await AuthMiddleware.authenticate(request)
  } catch (error) {
    return null
  }
}

/**
 * Utility function to check if request is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const auth_context = await getAuthenticatedUser(request)
  return auth_context !== null
}

/**
 * Extract request context information for logging and security
 */
export function getRequestContext(request: NextRequest): {
  ip_address: string
  user_agent: string | null
  origin: string | null
  referer: string | null
  timestamp: string
} {
  // Get IP address (handle various proxy headers)
  const forwarded_for = request.headers.get('x-forwarded-for')
  const real_ip = request.headers.get('x-real-ip')
  const ip_address = forwarded_for?.split(',')[0]?.trim() || real_ip || request.ip || '127.0.0.1'

  return {
    ip_address,
    user_agent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    timestamp: new Date().toISOString()
  }
}

/**
 * Log authentication events for security monitoring
 */
export function logAuthEvent(
  event_type: 'login_success' | 'login_failure' | 'logout' | 'session_expired' | 'unauthorized_access',
  request: NextRequest,
  additional_data?: Record<string, any>
): void {
  const context = getRequestContext(request)
  
  const log_entry = {
    event_type,
    timestamp: context.timestamp,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    origin: context.origin,
    referer: context.referer,
    path: request.nextUrl.pathname,
    method: request.method,
    ...additional_data
  }

  // In a production environment, you'd send this to a proper logging service
  console.log('AUTH_EVENT:', JSON.stringify(log_entry, null, 2))
}

/**
 * Convenience exports
 */
export const authenticate = AuthMiddleware.authenticate.bind(AuthMiddleware)
export const hasRole = AuthMiddleware.hasRole.bind(AuthMiddleware)
export const createErrorResponse = AuthMiddleware.createErrorResponse.bind(AuthMiddleware)