import { NextRequest, NextResponse } from 'next/server';
import { createEnhancedFriendRegistrationService } from '../../../../../lib/services/enhanced-friend-registration';
import { createApiResponse, ApiError } from '../../../../../lib/utils/api';
import { z } from 'zod';

// Rate limiting for cancellation requests (more restrictive)
const cancellationCounts = new Map<string, { count: number; resetTime: number }>();
const CANCELLATION_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced for development)
  maxRequests: 20 // 20 cancellation attempts per 5 minutes per IP (increased for testing)
};

function checkCancellationRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - CANCELLATION_RATE_LIMIT.windowMs;
  
  const current = cancellationCounts.get(ip);
  if (!current || current.resetTime < windowStart) {
    cancellationCounts.set(ip, { count: 1, resetTime: now + CANCELLATION_RATE_LIMIT.windowMs });
    return true;
  }
  
  if (current.count >= CANCELLATION_RATE_LIMIT.maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Validation schemas (hex format - 64 characters)
const tokenSchema = z.object({
  token: z.string()
    .length(64, 'Invalid token format')
    .regex(/^[0-9a-f]+$/, 'Invalid token characters')
});

const cancelRegistrationSchema = z.object({
  reason: z.string()
    .max(500, 'El motivo es demasiado largo')
    .optional(),
  confirm: z.boolean()
    .refine(val => val === true, 'Confirmación requerida para cancelar')
});

/**
 * POST /api/mi-registro/[token]/cancel
 * Cancel registration using personal token
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    
    // Get client info for audit logging
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check rate limit
    if (!checkCancellationRateLimit(ip)) {
      return createApiResponse(
        null, 
        'Demasiados intentos de cancelación. Intenta de nuevo en 5 minutos.', 
        false, 
        429
      );
    }

    // Validate token format
    console.log('Cancel API - Token received:', token, 'length:', token?.length);
    const tokenValidation = tokenSchema.safeParse({ token });
    if (!tokenValidation.success) {
      console.log('Cancel API - Token validation failed:', tokenValidation.error);
      return createApiResponse(null, 'Token de inscripción inválido', false, 400);
    }
    console.log('Cancel API - Token validation passed');

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const requestValidation = cancelRegistrationSchema.safeParse(body);
    
    if (!requestValidation.success) {
      const errors = requestValidation.error.errors.map(e => e.message).join(', ');
      return createApiResponse(null, `Datos inválidos: ${errors}`, false, 400);
    }

    const { reason, confirm } = requestValidation.data;

    // Double-check confirmation
    if (!confirm) {
      return createApiResponse(null, 'Debes confirmar la cancelación', false, 400);
    }

    // Cancel registration
    const registrationService = createEnhancedFriendRegistrationService();
    const result = await registrationService.cancelRegistrationByToken(
      token,
      reason,
      { ip, userAgent }
    );

    if (!result.success) {
      const statusCode = result.error === 'INVALID_TOKEN' ? 404 :
                        result.error === 'CANCELLATION_NOT_ALLOWED' ? 403 : 500;
      return createApiResponse(null, result.message, false, statusCode);
    }

    // Log successful cancellation for monitoring
    console.log(`Registration cancelled via token: ${token.substring(0, 8)}... from IP: ${ip}`);

    // Return success response with refund information
    const responseData = {
      message: result.message,
      ...(result.refund_info && { refund_info: result.refund_info })
    };

    return createApiResponse(responseData, 'Inscripción cancelada exitosamente', true, 200);

  } catch (error) {
    console.error('Error in cancellation POST:', error);
    
    if (error instanceof ApiError) {
      return createApiResponse(null, error.message, false, error.statusCode);
    }

    return createApiResponse(null, 'Error interno del servidor', false, 500);
  }
}

/**
 * OPTIONS /api/mi-registro/[token]/cancel
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}