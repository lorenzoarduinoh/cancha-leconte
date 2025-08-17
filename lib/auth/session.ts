import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { JWTPayload, AdminUser, AdminSession, SessionConfig } from './types'

/**
 * Session management utilities for admin authentication
 */
export class SessionManager {
  private static readonly JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET!
  )
  
  private static readonly COOKIE_NAME = 'cancha-admin-session'
  private static readonly CSRF_COOKIE_NAME = 'cancha-csrf-token'

  private static readonly SESSION_CONFIG: SessionConfig = {
    default_duration_hours: parseInt(process.env.SESSION_DURATION_HOURS || '2'),
    remember_me_duration_hours: parseInt(process.env.SESSION_REMEMBER_DURATION_HOURS || '24'),
    cleanup_interval_hours: 24
  }

  /**
   * Create a new session for authenticated user
   */
  static async createSession(
    user: AdminUser,
    remember_me: boolean = false,
    request_context: { ip_address: string; user_agent: string | null }
  ): Promise<{ token: string; session: AdminSession }> {
    const supabase = createServerClient()
    
    try {
      // Calculate expiration time
      const duration_hours = remember_me 
        ? this.SESSION_CONFIG.remember_me_duration_hours 
        : this.SESSION_CONFIG.default_duration_hours
      
      const expires_at = new Date()
      expires_at.setHours(expires_at.getHours() + duration_hours)

      // Generate session token
      const session_token = this.generateSecureToken()
      const session_token_hash = this.hashToken(session_token)

      // Create session in database (store hash, not plain token)
      const { data: session, error } = await supabase
        .from('admin_sessions')
        .insert({
          user_id: user.id,
          session_token: session_token_hash,
          expires_at: expires_at.toISOString(),
          remember_me,
          ip_address: request_context.ip_address,
          user_agent: request_context.user_agent
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`)
      }

      // Update user's last login time
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)

      // Create JWT token
      const jwt_payload: JWTPayload = {
        sub: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        session_id: session.id,
        session_token_hash: session_token_hash, // Include hash for verification
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expires_at.getTime() / 1000),
        remember_me
      }

      const token = await new SignJWT(jwt_payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(this.JWT_SECRET)

      return { token, session }
    } catch (error) {
      throw new Error(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate and verify a session token
   */
  static async validateSession(token: string): Promise<{
    valid: boolean
    user?: AdminUser
    session?: AdminSession
    payload?: JWTPayload
  }> {
    try {
      // Verify JWT token
      const { payload } = await jwtVerify(token, this.JWT_SECRET)
      const jwt_payload = payload as unknown as JWTPayload

      // Check token expiration
      if (jwt_payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false }
      }

      const supabase = createServerClient()

      // Verify session exists in database and is not expired
      const { data: session, error: sessionError } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('id', jwt_payload.session_id)
        .single()

      if (sessionError || !session) {
        return { valid: false }
      }

      // Verify session token hash matches (additional security layer)
      if (jwt_payload.session_token_hash && session.session_token !== jwt_payload.session_token_hash) {
        return { valid: false }
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Clean up expired session
        await this.destroySession(session.id)
        return { valid: false }
      }

      // Get user information
      const { data: user, error: userError } = await supabase
        .from('admin_users')
        .select('id, username, email, name, role, is_active, created_at, updated_at, last_login_at')
        .eq('id', jwt_payload.sub)
        .eq('is_active', true)
        .single()

      if (userError || !user) {
        return { valid: false }
      }

      return {
        valid: true,
        user,
        session,
        payload: jwt_payload
      }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false }
    }
  }

  /**
   * Destroy a session (logout)
   */
  static async destroySession(session_id: string): Promise<void> {
    const supabase = createServerClient()
    
    try {
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('id', session_id)
    } catch (error) {
      console.error('Failed to destroy session:', error)
      // Don't throw error as it's not critical for logout
    }
  }

  /**
   * Set session cookie in response
   */
  static setSessionCookie(response: NextResponse, token: string, remember_me: boolean = false): void {
    const duration_hours = remember_me 
      ? this.SESSION_CONFIG.remember_me_duration_hours 
      : this.SESSION_CONFIG.default_duration_hours

    const expires = new Date()
    expires.setHours(expires.getHours() + duration_hours)

    response.cookies.set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      expires,
      path: '/'
    })
  }

  /**
   * Clear session cookie
   */
  static clearSessionCookie(response: NextResponse): void {
    response.cookies.set(this.COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    })
  }

  /**
   * Get session token from request
   */
  static getSessionToken(request: NextRequest): string | null {
    return request.cookies.get(this.COOKIE_NAME)?.value || null
  }

  /**
   * Generate CSRF token and set cookie
   */
  static generateCSRFToken(response: NextResponse): string {
    const csrf_token = this.generateSecureToken()
    
    response.cookies.set(this.CSRF_COOKIE_NAME, csrf_token, {
      httpOnly: false, // CSRF tokens need to be accessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      path: '/'
    })

    return csrf_token
  }

  /**
   * Verify CSRF token
   */
  static verifyCSRFToken(request: NextRequest, provided_token: string): boolean {
    const stored_token = request.cookies.get(this.CSRF_COOKIE_NAME)?.value
    return stored_token === provided_token && provided_token.length > 0
  }

  /**
   * Clean up expired sessions from database
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const supabase = createServerClient()
    
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_sessions')

      if (error) {
        console.error('Failed to cleanup expired sessions:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Session cleanup error:', error)
      return 0
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(user_id: string): Promise<AdminSession[]> {
    const supabase = createServerClient()
    
    try {
      const { data, error } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('user_id', user_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get user sessions: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      return []
    }
  }

  /**
   * Destroy all sessions for a user (force logout everywhere)
   */
  static async destroyAllUserSessions(user_id: string): Promise<void> {
    const supabase = createServerClient()
    
    try {
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('user_id', user_id)
    } catch (error) {
      console.error('Failed to destroy all user sessions:', error)
    }
  }

  /**
   * Refresh session expiration time
   */
  static async refreshSession(session_id: string, remember_me: boolean): Promise<void> {
    const supabase = createServerClient()
    
    try {
      const duration_hours = remember_me 
        ? this.SESSION_CONFIG.remember_me_duration_hours 
        : this.SESSION_CONFIG.default_duration_hours
      
      const expires_at = new Date()
      expires_at.setHours(expires_at.getHours() + duration_hours)

      await supabase
        .from('admin_sessions')
        .update({ expires_at: expires_at.toISOString() })
        .eq('id', session_id)
    } catch (error) {
      console.error('Failed to refresh session:', error)
    }
  }

  /**
   * Generate secure random token
   */
  private static generateSecureToken(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Hash a token for secure storage
   */
  private static hashToken(token: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}

/**
 * Convenience functions for common operations
 */
export const createSession = SessionManager.createSession.bind(SessionManager)
export const validateSession = SessionManager.validateSession.bind(SessionManager)
export const destroySession = SessionManager.destroySession.bind(SessionManager)
export const setSessionCookie = SessionManager.setSessionCookie.bind(SessionManager)
export const clearSessionCookie = SessionManager.clearSessionCookie.bind(SessionManager)
export const getSessionToken = SessionManager.getSessionToken.bind(SessionManager)