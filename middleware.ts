import { NextRequest, NextResponse } from 'next/server'
import { SecurityHeaders } from '@/lib/auth/csrf'

/**
 * Global middleware for security, HTTPS enforcement, and request processing
 */
export function middleware(request: NextRequest) {
  // Get URL information
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const protocol = request.headers.get('x-forwarded-proto') || url.protocol

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production' && protocol !== 'https:') {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https:'
    
    return NextResponse.redirect(httpsUrl, {
      status: 301,
      headers: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      }
    })
  }

  // Apply security headers to all responses
  const response = NextResponse.next()
  
  // Apply comprehensive security headers
  const security_headers = SecurityHeaders.getSecurityHeaders()
  Object.entries(security_headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add additional security headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow') // Prevent search engine indexing
  response.headers.set('Server', 'Cancha-Leconte') // Custom server header
  
  // CORS headers for API routes
  if (url.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const allowed_origins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean)

    if (origin && allowed_origins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token'
    )
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: response.headers
    })
  }

  // Rate limiting headers (informational)
  if (url.pathname.startsWith('/api/auth/')) {
    response.headers.set('X-RateLimit-Limit', '5')
    response.headers.set('X-RateLimit-Window', '900') // 15 minutes in seconds
  }

  // Security logging for sensitive endpoints
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/admin/')) {
    const ip = getClientIP(request)
    const user_agent = request.headers.get('user-agent')
    
    console.log('SECURITY_ACCESS:', {
      timestamp: new Date().toISOString(),
      ip,
      user_agent,
      method: request.method,
      path: url.pathname,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    })
  }

  return response
}

/**
 * Helper function to get client IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded_for = request.headers.get('x-forwarded-for')
  const real_ip = request.headers.get('x-real-ip')
  
  if (forwarded_for) {
    return forwarded_for.split(',')[0].trim()
  }
  
  return real_ip || '127.0.0.1'
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}