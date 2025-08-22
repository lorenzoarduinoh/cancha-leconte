import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  validateRequestBody,
  withErrorHandling,
  getClientIP,
  getUserAgent 
} from '../../../../../lib/utils/api';
import { friendRegistrationSchema, cancelRegistrationSchema } from '../../../../../lib/validations/games';
import { createEnhancedFriendRegistrationService } from '../../../../../lib/services/enhanced-friend-registration';
import { withPublicMiddleware } from '../../../../../lib/middleware/public-rate-limiter';

// POST /api/games/[token]/register - Register player for game (public access)
export const POST = withPublicMiddleware('registration')(withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;
  
  console.log('=== FRIEND REGISTRATION ===');
  console.log('Share token:', token);
  
  // Validate request body
  const { data: playerData, error: validationError } = await validateRequestBody(
    request,
    friendRegistrationSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  console.log('Player registration data:', playerData);
  
  // Create enhanced service instance with WhatsApp notifications
  const friendService = createEnhancedFriendRegistrationService();
  
  const result = await friendService.registerFriend(token, playerData, {
    ip: getClientIP(request),
    userAgent: getUserAgent(request)
  });
  
  if (!result.success) {
    return createApiError(result.message, 400, result.error);
  }
  
  return createApiResponse(result, result.message, 201);
}));

// DELETE /api/games/[token]/register - Cancel registration (public access)
export const DELETE = withPublicMiddleware('registration')(withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;
  
  // Get cancellation data from query params
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const reason = searchParams.get('reason') || undefined;
  
  if (!phone) {
    return createApiError('Número de teléfono requerido para cancelar inscripción', 400);
  }
  
  console.log('=== CANCEL REGISTRATION ===');
  console.log('Share token:', token);
  console.log('Player phone:', phone);
  
  // Create enhanced service instance with WhatsApp notifications
  const friendService = createEnhancedFriendRegistrationService();
  
  const result = await friendService.cancelFriendRegistration(token, phone, reason, {
    ip: getClientIP(request),
    userAgent: getUserAgent(request)
  });
  
  if (!result.success) {
    return createApiError(result.message, 400, result.error);
  }
  
  return createApiResponse({
    message: result.message
  });
}));