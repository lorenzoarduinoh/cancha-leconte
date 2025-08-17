import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { withAuth, logAuthEvent } from '@/lib/auth/middleware'
import { SecurityHeaders } from '@/lib/auth/csrf'
import { LogoutResponse, LogoutErrorResponse } from '@/lib/auth/types'

/**
 * POST /api/auth/logout
 * Logout admin user and destroy session
 */
export const POST = withAuth(
  async (request: NextRequest, context): Promise<NextResponse> => {
    try {
      const { user, session } = context

      // Destroy session in database
      await SessionManager.destroySession(session.id)

      // Log logout event
      logAuthEvent('logout', request, { 
        user_id: user.id,
        email: user.email,
        session_id: session.id
      })

      // Create response
      const response_data: LogoutResponse = {
        success: true,
        message: 'Sesión cerrada exitosamente'
      }

      const response = NextResponse.json(response_data, { status: 200 })

      // Clear session cookie
      SessionManager.clearSessionCookie(response)

      // Apply security headers
      SecurityHeaders.applyHeaders(response)

      return response

    } catch (error) {
      console.error('Logout error:', error)

      const error_response: LogoutErrorResponse = {
        success: false,
        error: 'Error al cerrar sesión. Inténtalo de nuevo.',
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
 * GET /api/auth/logout
 * Handle logout via GET (for redirect scenarios)
 */
export const GET = withAuth(
  async (request: NextRequest, context): Promise<NextResponse> => {
    try {
      const { user, session } = context

      // Destroy session in database
      await SessionManager.destroySession(session.id)

      // Log logout event
      logAuthEvent('logout', request, { 
        user_id: user.id,
        email: user.email,
        session_id: session.id,
        method: 'GET'
      })

      // Create response with redirect to login
      const response = NextResponse.redirect(
        new URL('/login', request.url),
        { status: 302 }
      )

      // Clear session cookie
      SessionManager.clearSessionCookie(response)

      // Apply security headers
      SecurityHeaders.applyHeaders(response)

      return response

    } catch (error) {
      console.error('Logout GET error:', error)

      // Redirect to login even if logout fails
      const response = NextResponse.redirect(
        new URL('/login?error=logout_failed', request.url),
        { status: 302 }
      )

      // Clear cookie anyway
      SessionManager.clearSessionCookie(response)
      SecurityHeaders.applyHeaders(response)
      
      return response
    }
  },
  {
    required_role: 'admin',
    rate_limit: true,
    csrf_protection: false // GET requests don't need CSRF protection
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