import { NextRequest, NextResponse } from 'next/server';
import { createEnhancedFriendRegistrationService } from '../../../../lib/services/enhanced-friend-registration';
import { createApiResponse, ApiError } from '../../../../lib/utils/api';
import { z } from 'zod';

// Rate limiting (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50 // 50 requests per 15 minutes per IP
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  const current = requestCounts.get(ip);
  if (!current || current.resetTime < windowStart) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return true;
  }
  
  if (current.count >= RATE_LIMIT.maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Validation schema for token (hex format - 64 characters)
const tokenSchema = z.object({
  token: z.string()
    .length(64, 'Invalid token format')
    .regex(/^[0-9a-f]+$/, 'Invalid token characters')
});

/**
 * GET /api/mi-registro/[token]
 * Get personal registration details by token
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return createApiResponse(null, 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.', false, 429);
    }

    // Validate token format
    const validation = tokenSchema.safeParse({ token });
    if (!validation.success) {
      return createApiResponse(null, 'Token de inscripción inválido', false, 400);
    }

    // Get registration details
    const registrationService = createEnhancedFriendRegistrationService();
    const result = await registrationService.getRegistrationByToken(token);

    if (!result.success) {
      const statusCode = result.error === 'INVALID_TOKEN' ? 404 : 500;
      return createApiResponse(null, result.message, false, statusCode);
    }

    // Log access for security monitoring
    console.log(`Personal registration accessed: ${token.substring(0, 8)}... from IP: ${ip}`);
    console.log('API Response data:', JSON.stringify(result.data, null, 2));

    return createApiResponse(result.data, result.message, true, 200);

  } catch (error) {
    console.error('Error in personal registration GET:', error);
    
    if (error instanceof ApiError) {
      return createApiResponse(null, error.message, false, error.status);
    }

    return createApiResponse(null, 'Error interno del servidor', false, 500);
  }
}

/**
 * OPTIONS /api/mi-registro/[token]
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}