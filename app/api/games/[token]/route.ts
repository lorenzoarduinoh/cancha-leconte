import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  withErrorHandling 
} from '../../../../lib/utils/api';
import { createFriendRegistrationService } from '../../../../lib/services/friend-registration';
import { withPublicMiddleware } from '../../../../lib/middleware/public-rate-limiter';

// GET /api/games/[token] - Get game details by share token (public access)
export const GET = withPublicMiddleware('view')(withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;
  
  console.log('=== PUBLIC GAME ACCESS ===');
  console.log('Share token:', token);
  
  // Create service instance and get public game info
  const friendService = createFriendRegistrationService();
  
  const result = await friendService.getPublicGameInfo(token);
  
  if (!result.success) {
    return createApiError(result.message, result.error === 'GAME_NOT_FOUND' ? 404 : 400, result.error);
  }
  
  console.log('Game found:', result.data?.title);
  console.log('Current players:', result.data?.current_players);
  console.log('Max players:', result.data?.max_players);
  console.log('Game status:', result.data?.status);
  
  return createApiResponse(result.data, result.message);
}));