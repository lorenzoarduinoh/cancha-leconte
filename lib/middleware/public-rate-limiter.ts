import { NextRequest } from 'next/server';
import { createApiError } from '../utils/api';

// Simple in-memory rate limiter for public endpoints
class PublicRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60 * 1000) { // 10 requests per minute by default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up old entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      this.requests.forEach((value, key) => {
        if (now > value.resetTime) {
          this.requests.delete(key);
        }
      });
    }, 5 * 60 * 1000);
  }

  checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        resetTime: now + this.windowMs,
        remaining: this.maxRequests - 1
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0
      };
    }

    // Increment count
    record.count++;
    this.requests.set(identifier, record);

    return {
      allowed: true,
      resetTime: record.resetTime,
      remaining: this.maxRequests - record.count
    };
  }
}

// Different rate limiters for different endpoints
const gameViewLimiter = new PublicRateLimiter(30, 60 * 1000); // 30 requests per minute for viewing games
const registrationLimiter = new PublicRateLimiter(5, 60 * 1000); // 5 requests per minute for registration actions
const statusCheckLimiter = new PublicRateLimiter(15, 60 * 1000); // 15 requests per minute for status checks

export function getClientIdentifier(request: NextRequest): string {
  // Use IP address as primary identifier
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Add user agent for additional uniqueness (but don't make it too specific)
  const userAgent = request.headers.get('user-agent') || '';
  const simplifiedUA = userAgent.split(' ')[0] || ''; // Just the first part
  
  return `${remoteAddr}-${simplifiedUA}`;
}

export function withPublicRateLimit(
  limiterType: 'view' | 'registration' | 'status' = 'view'
) {
  return function(handler: Function) {
    return async function(request: NextRequest, context?: any) {
      const identifier = getClientIdentifier(request);
      
      let limiter: PublicRateLimiter;
      switch (limiterType) {
        case 'registration':
          limiter = registrationLimiter;
          break;
        case 'status':
          limiter = statusCheckLimiter;
          break;
        default:
          limiter = gameViewLimiter;
      }
      
      const rateCheck = limiter.checkRateLimit(identifier);
      
      if (!rateCheck.allowed) {
        const resetTimeSeconds = Math.ceil((rateCheck.resetTime! - Date.now()) / 1000);
        return createApiError(
          `Demasiadas solicitudes. Intenta nuevamente en ${resetTimeSeconds} segundos.`,
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }
      
      // Add rate limit headers
      const response = await handler(request, context);
      
      if (response && typeof response.headers?.set === 'function') {
        response.headers.set('X-RateLimit-Limit', limiter.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateCheck.remaining?.toString() || '0');
        response.headers.set('X-RateLimit-Reset', Math.ceil(rateCheck.resetTime! / 1000).toString());
      }
      
      return response;
    };
  };
}

// Security headers for public endpoints
export function withPublicSecurity(handler: Function) {
  return async function(request: NextRequest, context?: any) {
    const response = await handler(request, context);
    
    if (response && typeof response.headers?.set === 'function') {
      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // CORS headers for frontend access
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    
    return response;
  };
}

// Input validation for public endpoints
export function validatePublicInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic XSS prevention
  if (typeof data === 'string') {
    if (/<script|javascript:|on\w+=/i.test(data)) {
      errors.push('Entrada inválida detectada');
    }
  }
  
  // Check for common SQL injection patterns
  if (typeof data === 'string') {
    if (/('|(\\x27)|(\\x2D\\x2D)|(--)|(;)|(\\x00)|(\\n)|(\\r))/i.test(data)) {
      errors.push('Caracteres no permitidos en la entrada');
    }
  }
  
  // Recursive check for objects
  if (typeof data === 'object' && data !== null) {
    Object.values(data).forEach(value => {
      const nestedValidation = validatePublicInput(value);
      errors.push(...nestedValidation.errors);
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Combined middleware for public endpoints
export function withPublicMiddleware(
  limiterType: 'view' | 'registration' | 'status' = 'view'
) {
  return function(handler: Function) {
    return withPublicSecurity(
      withPublicRateLimit(limiterType)(
        async function(request: NextRequest, context?: any) {
          // Additional request validation
          const contentType = request.headers.get('content-type');
          
          if (request.method === 'POST' && contentType && !contentType.includes('application/json')) {
            return createApiError('Content-Type debe ser application/json', 400);
          }
          
          // Validate request size (prevent large payloads)
          const contentLength = request.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 10 * 1024) { // 10KB limit
            return createApiError('Payload demasiado grande', 413);
          }
          
          return handler(request, context);
        }
      )
    );
  };
}