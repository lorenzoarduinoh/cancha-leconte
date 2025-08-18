import { NextRequest } from 'next/server';
import { createApiResponse, createApiError, withErrorHandling } from '../../../../lib/utils/api';
import { realtimeService } from '../../../../lib/services/realtime';

// GET /api/admin/realtime - Get WebSocket connection info and stats
export const GET = withErrorHandling(async (request: NextRequest) => {
  const stats = realtimeService.getStats();
  
  const connectionInfo = {
    websocket_url: `ws://localhost:8080`, // In production, this would be dynamic
    stats,
    supported_channels: [
      'dashboard',
      'game:{gameId}',
    ],
    supported_events: {
      dashboard: [
        'player_registered',
        'payment_completed', 
        'game_status_changed',
        'game_created',
        'game_updated',
        'dashboard_refresh'
      ],
      game: [
        'player_registered',
        'player_cancelled',
        'game_full',
        'spot_available',
        'game_updated'
      ]
    },
    message_types: [
      'subscribe',
      'unsubscribe', 
      'ping',
      'pong',
      'event',
      'error'
    ]
  };
  
  return createApiResponse(connectionInfo, 'WebSocket connection info retrieved');
});

// POST /api/admin/realtime/trigger - Manually trigger real-time events (for testing)
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { event_type } = body;
  
  switch (event_type) {
    case 'dashboard_refresh':
      realtimeService.triggerDashboardUpdate();
      return createApiResponse(null, 'Dashboard refresh event triggered');
      
    default:
      return createApiError('Tipo de evento no soportado', 400);
  }
});