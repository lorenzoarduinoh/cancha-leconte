import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  withErrorHandling 
} from '../../../../../lib/utils/api';
import { createFriendRegistrationService } from '../../../../../lib/services/friend-registration';
import { withPublicMiddleware } from '../../../../../lib/middleware/public-rate-limiter';

// GET /api/games/[token]/status - Check player registration status (public access)
export const GET = withPublicMiddleware('status')(withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;
  
  // Get player phone from query params
  const { searchParams } = new URL(request.url);
  const playerPhone = searchParams.get('phone');
  
  if (!playerPhone) {
    return createApiError('Número de teléfono requerido', 400);
  }
  
  console.log('=== CHECK PLAYER STATUS ===');
  console.log('Share token:', token);
  console.log('Player phone:', playerPhone);
  
  // Create service instance and check status
  const friendService = createFriendRegistrationService();
  
  const status = await friendService.getPlayerRegistrationStatus(token, playerPhone);
  
  return createApiResponse({
    data: status,
    message: status.is_registered ? 
      'Estado de inscripción obtenido' : 
      'No hay inscripción registrada con este número'
  });
}));