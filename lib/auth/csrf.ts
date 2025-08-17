import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from './session'

/**
 * CSRF (Cross-Site Request Forgery) protection implementation
 * Uses double-submit cookie pattern for stateless CSRF protection
 */
export class CSRFProtection {
  private static readonly CSRF_HEADER_NAME = 'x-csrf-token'
  private static readonly CSRF_FORM_FIELD = '_csrf_token'
  
  /**
   * Generate CSRF token and set it in response cookie
   */
  static generateToken(response: NextResponse): string {
    return SessionManager.generateCSRFToken(response)
  }

  /**
   * Verify CSRF token from request
   */
  static verifyToken(request: NextRequest): boolean {
    try {
      // Get CSRF token from header or form field
      const csrf_token = this.getCSRFTokenFromRequest(request)
      
      if (!csrf_token) {
        return false
      }

      // Verify token matches cookie
      return SessionManager.verifyCSRFToken(request, csrf_token)
    } catch (error) {
      console.error('CSRF verification error:', error)
      return false
    }
  }

  /**
   * Extract CSRF token from request (header or body)
   */
  private static getCSRFTokenFromRequest(request: NextRequest): string | null {
    // Check header first
    const header_token = request.headers.get(this.CSRF_HEADER_NAME)
    if (header_token) {
      return header_token
    }

    // For form submissions, token would be in the body
    // Note: In API routes, you'd need to parse the body first
    return null
  }

  /**
   * Check if request requires CSRF protection
   */
  static requiresCSRFProtection(request: NextRequest): boolean {
    const method = request.method.toUpperCase()
    const path = request.nextUrl.pathname

    // Only protect state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return false
    }

    // Protect authentication endpoints
    if (path.startsWith('/api/auth/')) {
      return true
    }

    // Protect admin endpoints
    if (path.startsWith('/api/admin/')) {
      return true
    }

    return false
  }

  /**
   * Get CSRF error response
   */
  static getCSRFErrorResponse(): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: 'Token CSRF inválido o faltante',
        code: 'CSRF_TOKEN_INVALID'
      },
      { status: 403 }
    )
  }
}

/**
 * CSRF middleware for Next.js API routes
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Check if CSRF protection is required
  if (!CSRFProtection.requiresCSRFProtection(request)) {
    return handler(request)
  }

  // For GET requests that need CSRF token, generate it
  if (request.method === 'GET') {
    const response = await handler(request)
    CSRFProtection.generateToken(response)
    return response
  }

  // For state-changing requests, verify CSRF token
  if (!CSRFProtection.verifyToken(request)) {
    return CSRFProtection.getCSRFErrorResponse()
  }

  return handler(request)
}

/**
 * Security headers utility
 */
export class SecurityHeaders {
  /**
   * Get security headers for responses
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),

      // Prevent clickjacking
      'X-Frame-Options': 'DENY',

      // Prevent MIME sniffing
      'X-Content-Type-Options': 'nosniff',

      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Permissions Policy
      'Permissions-Policy': [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'serial=()',
        'bluetooth=()'
      ].join(', '),

      // HTTPS enforcement (in production)
      ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      }),

      // XSS Protection (legacy browsers)
      'X-XSS-Protection': '1; mode=block'
    }
  }

  /**
   * Apply security headers to response
   */
  static applyHeaders(response: NextResponse): NextResponse {
    const headers = this.getSecurityHeaders()
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Security middleware that applies both CSRF protection and security headers
 */
export async function withSecurity(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Apply CSRF protection
  const response = await withCSRFProtection(request, handler)
  
  // Apply security headers
  return SecurityHeaders.applyHeaders(response)
}

/**
 * Convenience functions
 */
export const generateCSRFToken = CSRFProtection.generateToken.bind(CSRFProtection)
export const verifyCSRFToken = CSRFProtection.verifyToken.bind(CSRFProtection)
export const applySecurityHeaders = SecurityHeaders.applyHeaders.bind(SecurityHeaders)