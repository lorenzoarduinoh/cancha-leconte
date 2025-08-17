import { NextRequest, NextResponse } from 'next/server'
import { SecurityHeaders } from './csrf'

/**
 * Centralized error handling for authentication system
 */
export class AuthErrorHandler {
  /**
   * Handle authentication-related errors and return appropriate responses
   */
  static handleError(error: unknown, request: NextRequest): NextResponse {
    const error_info = this.categorizeError(error)
    
    // Log error for monitoring
    this.logError(error_info, request)
    
    // Create response based on error type
    const response = this.createErrorResponse(error_info)
    
    // Apply security headers
    SecurityHeaders.applyHeaders(response)
    
    return response
  }

  /**
   * Categorize error and extract relevant information
   */
  private static categorizeError(error: unknown): ErrorInfo {
    if (error instanceof AuthenticationError) {
      return {
        type: 'authentication',
        message: error.message,
        code: error.code,
        status_code: error.statusCode,
        retry_after: error.retryAfter,
        user_message: error.message,
        log_level: 'warn'
      }
    }

    if (error instanceof RateLimitError) {
      return {
        type: 'rate_limit',
        message: error.message,
        code: 'RATE_LIMITED',
        status_code: error.statusCode,
        retry_after: error.retryAfter,
        user_message: error.message,
        log_level: 'warn'
      }
    }

    if (error instanceof ValidationError) {
      return {
        type: 'validation',
        message: error.message,
        code: 'VALIDATION_ERROR',
        status_code: error.statusCode,
        field: error.field,
        user_message: 'Datos de entrada inválidos',
        log_level: 'info'
      }
    }

    if (error instanceof DatabaseError) {
      return {
        type: 'database',
        message: error.message,
        code: 'DATABASE_ERROR',
        status_code: 500,
        user_message: 'Error interno del servidor. Inténtalo de nuevo más tarde.',
        log_level: 'error'
      }
    }

    if (error instanceof NetworkError) {
      return {
        type: 'network',
        message: error.message,
        code: 'NETWORK_ERROR',
        status_code: 503,
        user_message: 'Error de conectividad. Inténtalo de nuevo.',
        log_level: 'error'
      }
    }

    // Unknown error
    return {
      type: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR',
      status_code: 500,
      user_message: 'Error interno del servidor',
      log_level: 'error'
    }
  }

  /**
   * Create appropriate error response
   */
  private static createErrorResponse(error_info: ErrorInfo): NextResponse {
    const response_body = {
      success: false,
      error: error_info.user_message,
      code: error_info.code,
      ...(error_info.field && { field: error_info.field }),
      ...(error_info.retry_after && { retry_after: error_info.retry_after })
    }

    const headers: Record<string, string> = {}
    if (error_info.retry_after) {
      headers['Retry-After'] = error_info.retry_after.toString()
    }

    return NextResponse.json(response_body, {
      status: error_info.status_code,
      headers
    })
  }

  /**
   * Log error information for monitoring and debugging
   */
  private static logError(error_info: ErrorInfo, request: NextRequest): void {
    const log_entry = {
      timestamp: new Date().toISOString(),
      level: error_info.log_level,
      type: error_info.type,
      code: error_info.code,
      message: error_info.message,
      status_code: error_info.status_code,
      request: {
        method: request.method,
        url: request.url,
        user_agent: request.headers.get('user-agent'),
        ip: this.getClientIP(request),
        headers: this.sanitizeHeaders(request.headers)
      },
      ...(error_info.retry_after && { retry_after: error_info.retry_after }),
      ...(error_info.field && { field: error_info.field })
    }

    // Log based on severity
    switch (error_info.log_level) {
      case 'error':
        console.error('AUTH_ERROR:', JSON.stringify(log_entry, null, 2))
        break
      case 'warn':
        console.warn('AUTH_WARNING:', JSON.stringify(log_entry, null, 2))
        break
      case 'info':
        console.info('AUTH_INFO:', JSON.stringify(log_entry, null, 2))
        break
      default:
        console.log('AUTH_LOG:', JSON.stringify(log_entry, null, 2))
    }

    // In production, you'd send this to a logging service like DataDog, CloudWatch, etc.
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(log_entry)
    }
  }

  /**
   * Get client IP from request
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded_for = request.headers.get('x-forwarded-for')
    const real_ip = request.headers.get('x-real-ip')
    
    if (forwarded_for) {
      return forwarded_for.split(',')[0].trim()
    }
    
    return real_ip || request.ip || '127.0.0.1'
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  private static sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {}
    const sensitive_headers = ['authorization', 'cookie', 'x-csrf-token']
    
    headers.forEach((value, key) => {
      if (sensitive_headers.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = value
      }
    })
    
    return sanitized
  }

  /**
   * Send log entry to external logging service
   */
  private static sendToLoggingService(log_entry: any): void {
    // Implementation would depend on your logging service
    // Examples: DataDog, CloudWatch, LogRocket, etc.
    
    // For now, just indicate where this would go
    console.log('📤 Would send to logging service:', {
      service: 'external_logger',
      entry_id: log_entry.timestamp,
      level: log_entry.level
    })
  }
}

/**
 * Custom error classes for different types of authentication errors
 */
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

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Error information interface
 */
interface ErrorInfo {
  type: 'authentication' | 'rate_limit' | 'validation' | 'database' | 'network' | 'unknown'
  message: string
  code: string
  status_code: number
  user_message: string
  log_level: 'error' | 'warn' | 'info' | 'debug'
  retry_after?: number
  field?: string
}

/**
 * Utility function to wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof AuthenticationError ||
        error instanceof RateLimitError ||
        error instanceof ValidationError ||
        error instanceof DatabaseError ||
        error instanceof NetworkError
      ) {
        throw error
      }

      // Wrap unknown errors
      console.error('Unexpected error in function:', fn.name, error)
      throw new DatabaseError(
        'An unexpected error occurred',
        error instanceof Error ? error : undefined
      )
    }
  }
}

/**
 * Convenience function for handling API route errors
 */
export function handleAPIError(error: unknown, request: NextRequest): NextResponse {
  return AuthErrorHandler.handleError(error, request)
}