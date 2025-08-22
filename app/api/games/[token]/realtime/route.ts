import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  withErrorHandling 
} from '../../../../../lib/utils/api';
import { createFriendRealtimeService } from '../../../../../lib/services/friend-realtime';
import { createFriendRegistrationService } from '../../../../../lib/services/friend-registration';
import { withPublicMiddleware } from '../../../../../lib/middleware/public-rate-limiter';

// GET /api/games/[token]/realtime - Get real-time connection info and current status
export const GET = withPublicMiddleware('view')(withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token } = await params;
  
  console.log('=== REALTIME INFO REQUEST ===');
  console.log('Share token:', token);
  
  // First, validate the game exists and is accessible
  const friendService = createFriendRegistrationService();
  const gameResult = await friendService.getPublicGameInfo(token);
  
  if (!gameResult.success || !gameResult.data) {
    return createApiError(gameResult.message, 404, gameResult.error);
  }
  
  const game = gameResult.data;
  
  // Get real-time service and current status
  const realtimeService = createFriendRealtimeService();
  const currentStatus = await realtimeService.getCurrentGameStatus(game.id);
  
  // Return connection information
  const response = {
    game_id: game.id,
    realtime_enabled: true,
    current_status: currentStatus,
    connection_info: {
      websocket_available: true,
      polling_fallback: true,
      update_frequency: '1s',
    },
    events: [
      'player_joined',
      'player_left', 
      'game_full',
      'spot_available',
      'game_updated',
      'game_cancelled'
    ]
  };
  
  return createApiResponse({
    data: response,
    message: 'Información de tiempo real obtenida'
  });
}));