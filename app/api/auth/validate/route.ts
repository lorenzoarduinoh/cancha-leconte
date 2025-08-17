import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { withAuth, getAuthenticatedUser, logAuthEvent } from '@/lib/auth/middleware'
import { SecurityHeaders } from '@/lib/auth/csrf'
import { 
  SessionValidationResponse, 
  SessionValidationErrorResponse 
} from '@/lib/auth/types'

/**
 * GET /api/auth/validate
 * Validate current session and return user information
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Try to get authenticated user without throwing errors
    const auth_context = await getAuthenticatedUser(request)

    if (!auth_context) {
      // Session is invalid or doesn't exist
      logAuthEvent('session_expired', request, { 
        reason: 'no_session_or_invalid'
      })

      const error_response: SessionValidationErrorResponse = {
        valid: false,
        error: 'Sesión inválida o expirada',
        code: 'INVALID_SESSION'
      }
      
      const response = NextResponse.json(error_response, { status: 401 })
      SecurityHeaders.applyHeaders(response)
      return response
    }

    const { user, session, payload } = auth_context

    // Optionally refresh session if it's close to expiring
    const session_expires_at = new Date(session.expires_at)
    const now = new Date()
    const time_until_expiry = session_expires_at.getTime() - now.getTime()
    const hours_until_expiry = time_until_expiry / (1000 * 60 * 60)

    // Refresh session if less than 1 hour remaining for remember_me sessions
    // or less than 30 minutes for regular sessions
    const refresh_threshold = session.remember_me ? 1 : 0.5
    
    if (hours_until_expiry < refresh_threshold && hours_until_expiry > 0) {
      await SessionManager.refreshSession(session.id, session.remember_me)
      
      // Update expires_at for response
      const duration_hours = session.remember_me ? 24 : 2
      const new_expires_at = new Date()
      new_expires_at.setHours(new_expires_at.getHours() + duration_hours)
      session.expires_at = new_expires_at.toISOString()
    }

    // Create response
    const response_data: SessionValidationResponse = {
      valid: true,
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
    
    // Apply security headers
    SecurityHeaders.applyHeaders(response)

    return response

  } catch (error) {
    console.error('Session validation error:', error)

    // Log the validation failure
    logAuthEvent('session_expired', request, { 
      reason: 'validation_error',
      error: error instanceof Error ? error.message : 'unknown'
    })

    const error_response: SessionValidationErrorResponse = {
      valid: false,
      error: 'Error al validar sesión',
      code: 'SERVER_ERROR'
    }
    
    const response = NextResponse.json(error_response, { status: 500 })
    SecurityHeaders.applyHeaders(response)
    return response
  }
}

/**
 * POST /api/auth/validate
 * Validate session and optionally refresh it
 */
export const POST = withAuth(
  async (request: NextRequest, context): Promise<NextResponse> => {
    try {
      const { user, session } = context

      // Parse request body for refresh options
      let refresh_session = false
      try {
        const body = await request.json()
        refresh_session = body.refresh === true
      } catch {
        // Body parsing failed, continue without refresh
      }

      // Refresh session if requested
      if (refresh_session) {
        await SessionManager.refreshSession(session.id, session.remember_me)
        
        // Update expires_at for response
        const duration_hours = session.remember_me ? 24 : 2
        const new_expires_at = new Date()
        new_expires_at.setHours(new_expires_at.getHours() + duration_hours)
        session.expires_at = new_expires_at.toISOString()
      }

      // Create response
      const response_data: SessionValidationResponse = {
        valid: true,
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
      
      // Apply security headers
      SecurityHeaders.applyHeaders(response)

      return response

    } catch (error) {
      console.error('Session validation POST error:', error)

      const error_response: SessionValidationErrorResponse = {
        valid: false,
        error: 'Error al validar sesión',
        code: 'SERVER_ERROR'
      }
      
      const response = NextResponse.json(error_response, { status: 500 })
      SecurityHeaders.applyHeaders(response)
      return response
    }
  },
  {
    required_role: 'admin',
    rate_limit: true,
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