import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';
import { verifySession } from '../auth/session';
import { createApiError } from '../utils/api';
import { auditService } from '../services/audit';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    username: string;
    name: string;
    email: string | null;
    role: string;
  };
  session: any;
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Middleware to validate admin authentication for API routes
 */
export function withAdminAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Extract session token from cookies
      const sessionToken = request.cookies.get('admin_session')?.value;
      
      if (!sessionToken) {
        return createApiError('Token de sesión requerido', 401);
      }
      
      // Verify session
      const sessionResult = await verifySession(sessionToken);
      
      if (!sessionResult.valid || !sessionResult.session || !sessionResult.user) {
        return createApiError('Sesión inválida o expirada', 401);
      }
      
      // Check if user is admin
      if (sessionResult.user.role !== 'admin') {
        return createApiError('Acceso denegado: se requieren permisos de administrador', 403);
      }
      
      // Check if user is active
      if (!sessionResult.user.is_active) {
        return createApiError('Cuenta desactivada', 403);
      }
      
      // Create authenticated request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: sessionResult.user.id,
        username: sessionResult.user.username,
        name: sessionResult.user.name,
        email: sessionResult.user.email,
        role: sessionResult.user.role,
      };
      authenticatedRequest.session = sessionResult.session;
      
      // Update session last activity
      await updateSessionActivity(sessionResult.session.id);
      
      // Call the original handler with authenticated request
      return await handler(authenticatedRequest, ...args);
      
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return createApiError('Error de autenticación', 500);
    }
  };
}

/**
 * Middleware to log administrative actions automatically
 */
export function withAuditLogging<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
  actionType: string,
  entityType: string,
  getEntityId?: (request: AuthenticatedRequest, ...args: T) => string | undefined
) {
  return async (request: AuthenticatedRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    let actionDetails: Record<string, any> = {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    };
    
    try {
      // Execute the handler
      const response = await handler(request, ...args);
      
      // Log successful action
      actionDetails.success = true;
      actionDetails.status_code = response.status;
      actionDetails.duration_ms = Date.now() - startTime;
      
      // Extract entity ID if function provided
      const entityId = getEntityId ? getEntityId(request, ...args) : undefined;
      
      // Log the action
      await auditService.logAction(
        request.user.id,
        {
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          action_details: actionDetails,
        },
        {
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || undefined,
        }
      );
      
      return response;
      
    } catch (error) {
      // Log failed action
      actionDetails.success = false;
      actionDetails.error = error instanceof Error ? error.message : 'Unknown error';
      actionDetails.duration_ms = Date.now() - startTime;
      
      await auditService.logAction(
        request.user.id,
        {
          action_type: actionType,
          entity_type: entityType,
          action_details: actionDetails,
        },
        {
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || undefined,
        }
      );
      
      throw error;
    }
  };
}

/**
 * Combined middleware for auth + audit logging
 */
export function withAdminAuthAndAudit<T extends any[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
  actionType: string,
  entityType: string,
  getEntityId?: (request: AuthenticatedRequest, ...args: T) => string | undefined
) {
  return withAdminAuth(
    withAuditLogging(handler, actionType, entityType, getEntityId)
  );
}

/**
 * Update session activity timestamp
 */
async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('admin_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error updating session activity:', error);
    // Don't throw error - this is not critical
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.ip;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return real || remote || 'unknown';
}

/**
 * Validate admin permissions for specific resources
 */
export async function validateResourceAccess(
  adminUserId: string,
  resourceType: 'game' | 'registration' | 'notification',
  resourceId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'game':
        const { data: game } = await supabase
          .from('games')
          .select('created_by')
          .eq('id', resourceId)
          .single();
        return game?.created_by === adminUserId;
        
      case 'registration':
        const { data: registration } = await supabase
          .from('game_registrations')
          .select('games!inner(created_by)')
          .eq('id', resourceId)
          .single();
        return registration?.games?.created_by === adminUserId;
        
      case 'notification':
        const { data: notification } = await supabase
          .from('notifications')
          .select('games!inner(created_by)')
          .eq('id', resourceId)
          .single();
        return notification?.games?.created_by === adminUserId;
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Error validating resource access:', error);
    return false;
  }
}

/**
 * Rate limiting for admin actions
 */
const actionCounts = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  maxActions: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return function<T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: AuthenticatedRequest, ...args: T): Promise<NextResponse> => {
      const userId = request.user.id;
      const now = Date.now();
      const key = `${userId}:${request.method}:${new URL(request.url).pathname}`;
      
      // Clean up expired entries
      for (const [k, data] of actionCounts.entries()) {
        if (now > data.resetTime) {
          actionCounts.delete(k);
        }
      }
      
      // Check current count
      const current = actionCounts.get(key);
      if (current && current.count >= maxActions && now < current.resetTime) {
        return createApiError(
          `Límite de velocidad excedido. Máximo ${maxActions} acciones por minuto.`,
          429
        );
      }
      
      // Update count
      if (current && now < current.resetTime) {
        current.count++;
      } else {
        actionCounts.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
      }
      
      return await handler(request, ...args);
    };
  };
}