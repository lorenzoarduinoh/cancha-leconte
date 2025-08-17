import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { RateLimitResult, RateLimitConfig, RateLimitError } from './types'

/**
 * Rate limiting implementation for authentication endpoints
 * Implements progressive delays and IP-based tracking
 */
export class RateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    max_attempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5'),
    window_minutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15'),
    progressive_delay: true
  }

  /**
   * Check if a request should be rate limited
   */
  static async checkRateLimit(
    request: NextRequest,
    endpoint_type: 'login' | 'general' = 'login'
  ): Promise<RateLimitResult> {
    const ip_address = this.getClientIP(request)
    const config = this.getConfigForEndpoint(endpoint_type)
    
    try {
      const supabase = createServerClient()
      
      // Get recent login attempts for this IP
      const { data, error } = await supabase
        .rpc('get_recent_login_attempts', {
          p_ip_address: ip_address,
          p_minutes: config.window_minutes
        })

      if (error) {
        console.error('Rate limit check error:', error)
        // Allow request if we can't check (fail open for availability)
        return {
          allowed: true,
          remaining: config.max_attempts,
          reset_time: new Date(Date.now() + config.window_minutes * 60 * 1000)
        }
      }

      const attempt_count = data?.[0]?.attempt_count || 0
      const recent_attempts = data?.[0]?.recent_attempts || []

      // Calculate remaining attempts
      const remaining = Math.max(0, config.max_attempts - attempt_count)
      
      // Calculate reset time (window_minutes from now)
      const reset_time = new Date(Date.now() + config.window_minutes * 60 * 1000)

      // Check if rate limit exceeded
      if (attempt_count >= config.max_attempts) {
        const retry_after = this.calculateRetryAfter(recent_attempts, config)
        
        return {
          allowed: false,
          remaining: 0,
          reset_time,
          retry_after
        }
      }

      return {
        allowed: true,
        remaining,
        reset_time
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Allow request if we can't check (fail open)
      return {
        allowed: true,
        remaining: config.max_attempts,
        reset_time: new Date(Date.now() + config.window_minutes * 60 * 1000)
      }
    }
  }

  /**
   * Record a login attempt (success or failure)
   */
  static async recordAttempt(
    request: NextRequest,
    email: string | null,
    success: boolean
  ): Promise<void> {
    const ip_address = this.getClientIP(request)
    const user_agent = request.headers.get('user-agent')
    
    try {
      const supabase = createServerClient()
      
      await supabase
        .from('login_attempts')
        .insert({
          ip_address,
          email,
          success,
          user_agent,
          attempted_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to record login attempt:', error)
      // Don't throw error as this is logging only
    }
  }

  /**
   * Clean up old login attempts (older than 24 hours)
   */
  static async cleanupOldAttempts(): Promise<number> {
    try {
      const supabase = createServerClient()
      
      const { data, error } = await supabase
        .rpc('cleanup_old_login_attempts')

      if (error) {
        console.error('Failed to cleanup old login attempts:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Login attempts cleanup error:', error)
      return 0
    }
  }

  /**
   * Get rate limit configuration for specific endpoint type
   */
  private static getConfigForEndpoint(endpoint_type: 'login' | 'general'): RateLimitConfig {
    switch (endpoint_type) {
      case 'login':
        return {
          max_attempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5'),
          window_minutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15'),
          progressive_delay: true
        }
      case 'general':
        return {
          max_attempts: 100, // More lenient for general API calls
          window_minutes: 15,
          progressive_delay: false
        }
      default:
        return this.DEFAULT_CONFIG
    }
  }

  /**
   * Calculate retry-after time based on recent attempts and progressive delay
   */
  private static calculateRetryAfter(
    recent_attempts: string[],
    config: RateLimitConfig
  ): number {
    if (!config.progressive_delay || recent_attempts.length === 0) {
      // Standard rate limit: reset time is window duration
      return config.window_minutes * 60
    }

    // Progressive delay: increase delay based on number of recent attempts
    const attempt_count = recent_attempts.length
    
    // Calculate progressive delay (exponential backoff with cap)
    const base_delay = 60 // 1 minute base
    const multiplier = Math.min(attempt_count - config.max_attempts + 1, 8) // Cap at 8x
    const progressive_delay = base_delay * Math.pow(2, multiplier - 1)
    
    // Ensure minimum delay is the remaining window time
    const window_remaining = config.window_minutes * 60
    
    return Math.max(progressive_delay, window_remaining)
  }

  /**
   * Extract client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    // Check various headers for real IP (in order of preference)
    const forwarded_for = request.headers.get('x-forwarded-for')
    const real_ip = request.headers.get('x-real-ip')
    const forwarded = request.headers.get('forwarded')
    
    if (forwarded_for) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwarded_for.split(',')[0].trim()
    }
    
    if (real_ip) {
      return real_ip.trim()
    }
    
    if (forwarded) {
      // Parse forwarded header: for=192.0.2.60;proto=http;by=203.0.113.43
      const for_match = forwarded.match(/for=([^;,\s]+)/)
      if (for_match) {
        return for_match[1].replace(/"/g, '')
      }
    }
    
    // Fallback to connection remote address
    return '127.0.0.1'
  }

  /**
   * Get current rate limit status for an IP
   */
  static async getRateLimitStatus(
    ip_address: string,
    endpoint_type: 'login' | 'general' = 'login'
  ): Promise<RateLimitResult> {
    const config = this.getConfigForEndpoint(endpoint_type)
    
    try {
      const supabase = createServerClient()
      
      const { data, error } = await supabase
        .rpc('get_recent_login_attempts', {
          p_ip_address: ip_address,
          p_minutes: config.window_minutes
        })

      if (error) {
        throw new Error(`Rate limit status check failed: ${error.message}`)
      }

      const attempt_count = data?.[0]?.attempt_count || 0
      const remaining = Math.max(0, config.max_attempts - attempt_count)
      const reset_time = new Date(Date.now() + config.window_minutes * 60 * 1000)

      return {
        allowed: attempt_count < config.max_attempts,
        remaining,
        reset_time,
        retry_after: attempt_count >= config.max_attempts 
          ? this.calculateRetryAfter(data?.[0]?.recent_attempts || [], config)
          : undefined
      }
    } catch (error) {
      console.error('Rate limit status check error:', error)
      return {
        allowed: true,
        remaining: config.max_attempts,
        reset_time: new Date(Date.now() + config.window_minutes * 60 * 1000)
      }
    }
  }
}

/**
 * Rate limiting middleware function for Next.js API routes
 */
export async function withRateLimit(
  request: NextRequest,
  endpoint_type: 'login' | 'general' = 'login'
): Promise<void> {
  const rate_limit_result = await RateLimiter.checkRateLimit(request, endpoint_type)
  
  if (!rate_limit_result.allowed) {
    throw new RateLimitError(
      'Demasiados intentos. Inténtalo de nuevo más tarde.',
      rate_limit_result.retry_after || 300
    )
  }
}

/**
 * Convenience functions
 */
export const checkRateLimit = RateLimiter.checkRateLimit.bind(RateLimiter)
export const recordAttempt = RateLimiter.recordAttempt.bind(RateLimiter)
export const cleanupOldAttempts = RateLimiter.cleanupOldAttempts.bind(RateLimiter)