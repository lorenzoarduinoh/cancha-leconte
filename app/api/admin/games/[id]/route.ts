import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateRequestBody, 
  withErrorHandling,
  getClientIP,
  getUserAgent
} from '../../../../../lib/utils/api';
import { 
  updateGameSchema, 
  uuidSchema 
} from '../../../../../lib/validations/games';
import { 
  GameWithStats, 
  UpdateGameRequest, 
  GameDetailsResponse
} from '../../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/games/[id] - Get game details
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  
  // Validate game ID
  const parseResult = uuidSchema.safeParse(resolvedParams.id);
  if (!parseResult.success) {
    return createApiError('ID de partido inválido', 400);
  }
  
  const gameId = parseResult.data;
  
  // Fetch game with all related data
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select(`
      *,
      game_registrations(
        id,
        player_name,
        player_phone,
        team_assignment,
        payment_status,
        payment_id,
        payment_amount,
        registered_at,
        paid_at
      ),
      game_results(
        id,
        team_a_score,
        team_b_score,
        winning_team,
        notes,
        recorded_by,
        recorded_at
      )
    `)
    .eq('id', gameId)
    .single();
  
  if (gameError) {
    if (gameError.code === 'PGRST116') {
      return createApiError('Partido no encontrado', 404);
    }
    console.error('Error fetching game:', gameError);
    return createApiError('Error al obtener el partido', 500);
  }
  
  // Auto-update status based on game duration
  const now = new Date();
  
  // Parse game date as Argentina local time (UTC-3) - same logic as main endpoint
  const isoMatch = gameData.game_date.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  let gameDate: Date;
  
  if (isoMatch) {
    // Parse as literal local time (Argentina timezone)
    const [, year, month, day, hours, minutes] = isoMatch;
    gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
  } else {
    // Fallback
    gameDate = new Date(gameData.game_date);
  }
  
  const gameDuration = gameData.game_duration_minutes || 90; // Default 90 minutes
  const gameEndTime = new Date(gameDate.getTime() + gameDuration * 60 * 1000);
  
  
  let newStatus = gameData.status;
  
  // If current time is between game start and game end, mark as in_progress
  if (now >= gameDate && now <= gameEndTime && (gameData.status === 'draft' || gameData.status === 'open' || gameData.status === 'closed')) {
    newStatus = 'in_progress';
  }
  // If current time is after game end time and status is not completed/cancelled, mark as completed
  else if (now > gameEndTime && (gameData.status === 'draft' || gameData.status === 'open' || gameData.status === 'closed' || gameData.status === 'in_progress')) {
    newStatus = 'completed';
  }
  
  // Update status if it changed
  if (newStatus !== gameData.status) {
    console.log(`Auto-updating game status from ${gameData.status} to ${newStatus}:`, gameData.id);
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);
      
    if (updateError) {
      console.error('Error auto-updating game status:', updateError);
    } else {
      // Update the local data to reflect the change
      gameData.status = newStatus;
    }
  }

  // Transform data to include statistics
  // Filter out refunded registrations (cancelled registrations should be deleted, but filter legacy refunded ones)
  const registrations = (gameData.game_registrations || []).filter(r => r.payment_status !== 'refunded');
  const result = gameData.game_results?.[0] || null;
  
  console.log('=== GET INDIVIDUAL GAME DEBUG ===');
  console.log('Raw game data:', gameData);
  console.log('Registrations:', registrations);
  console.log('Field cost per player:', gameData.field_cost_per_player);
  
  const gameWithStats: GameWithStats = {
    ...gameData,
    current_players: registrations.length,
    waiting_list_count: Math.max(0, registrations.length - gameData.max_players),
    pending_payments: registrations.filter(r => r.payment_status === 'pending').length,
    total_revenue: registrations
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
    registrations,
    result,
  };
  
  console.log('Game with stats:', gameWithStats);
  console.log('Game with stats - field_cost_per_player:', gameWithStats.field_cost_per_player);
  console.log('Game with stats - current_players:', gameWithStats.current_players);
  
  const response: GameDetailsResponse = {
    data: gameWithStats,
  };
  
  return createApiResponse(response);
});

// PUT /api/admin/games/[id] - Update game
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  
  // Validate game ID
  const parseResult = uuidSchema.safeParse(resolvedParams.id);
  if (!parseResult.success) {
    return createApiError('ID de partido inválido', 400);
  }
  
  const gameId = parseResult.data;
  
  // Validate request body
  const { data: updateData, error: validationError } = await validateRequestBody(
    request,
    updateGameSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  // Check if game exists and get current data
  const { data: existingGame, error: existingError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (existingError) {
    if (existingError.code === 'PGRST116') {
      return createApiError('Partido no encontrado', 404);
    }
    console.error('Error fetching existing game:', existingError);
    return createApiError('Error al obtener el partido', 500);
  }
  
  // Check if game can be modified (not completed or cancelled)
  if (existingGame.status === 'completed' || existingGame.status === 'cancelled') {
    return createApiError('No se puede modificar un partido completado o cancelado', 400);
  }
  
  // If reducing max_players, check current registrations
  if (updateData.max_players && updateData.max_players < existingGame.max_players) {
    const { count: currentRegistrations } = await supabase
      .from('game_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);
    
    if (currentRegistrations && currentRegistrations > updateData.max_players) {
      return createApiError(
        `No se puede reducir el máximo de jugadores por debajo del número actual de registrados (${currentRegistrations})`,
        400
      );
    }
  }
  
  // Process game_date if present in updateData - keep user's intended local time
  if (updateData.game_date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(updateData.game_date)) {
    // User entered local time - treat it as literal time without timezone conversion
    // Just add seconds to make it a valid ISO format
    updateData.game_date = updateData.game_date + ':00';
    
    console.log('=== UPDATE DATE CONVERSION DEBUG ===');
    console.log('User input (original):', updateData.game_date.slice(0, -3));
    console.log('Stored as:', updateData.game_date);
  }

  // Update game
  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select(`
      *,
      game_registrations(
        id,
        player_name,
        player_phone,
        team_assignment,
        payment_status,
        payment_amount,
        registered_at,
        paid_at
      ),
      game_results(
        id,
        team_a_score,
        team_b_score,
        winning_team,
        notes,
        recorded_at
      )
    `)
    .single();
  
  if (updateError) {
    console.error('Error updating game:', updateError);
    return createApiError('Error al actualizar el partido', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: 'mock-admin-id', // Will be replaced with actual auth
    action_type: 'UPDATE',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      changes: updateData,
      previous_values: {
        title: existingGame.title,
        game_date: existingGame.game_date,
        max_players: existingGame.max_players,
        status: existingGame.status,
      },
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Check if we need to notify players about changes
  const significantChanges = updateData.game_date || updateData.status;
  if (significantChanges) {
    // Get all registered players for notifications
    const { data: registrations } = await supabase
      .from('game_registrations')
      .select('player_phone')
      .eq('game_id', gameId);
    
    if (registrations && registrations.length > 0) {
      // Create notification entries (actual sending would be handled by notification service)
      const notifications = registrations.map(reg => ({
        game_id: gameId,
        player_phone: reg.player_phone,
        message_type: 'game_update' as const,
        message_content: `El partido "${updatedGame.title}" ha sido actualizado. Verifica los nuevos detalles.`,
        delivery_status: 'pending' as const,
      }));
      
      await supabase.from('notifications').insert(notifications);
    }
  }
  
  // Transform data to include statistics
  const registrations = updatedGame.game_registrations || [];
  const result = updatedGame.game_results?.[0] || null;
  
  const gameWithStats: GameWithStats = {
    ...updatedGame,
    current_players: registrations.length,
    waiting_list_count: Math.max(0, registrations.length - updatedGame.max_players),
    pending_payments: registrations.filter(r => r.payment_status === 'pending').length,
    total_revenue: registrations
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
    registrations,
    result,
  };
  
  const response: GameDetailsResponse = {
    data: gameWithStats,
    message: 'Partido actualizado exitosamente',
  };
  
  return createApiResponse(response, 'Partido actualizado exitosamente');
});

// PATCH /api/admin/games/[id] - Update game (alias for PUT)
export const PATCH = PUT;

// DELETE /api/admin/games/[id] - Cancel/Delete game
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  
  // Validate game ID
  const parseResult = uuidSchema.safeParse(resolvedParams.id);
  if (!parseResult.success) {
    return createApiError('ID de partido inválido', 400);
  }
  
  const gameId = parseResult.data;
  
  // Check if game exists
  const { data: existingGame, error: existingError } = await supabase
    .from('games')
    .select('*, game_registrations(player_phone)')
    .eq('id', gameId)
    .single();
  
  if (existingError) {
    if (existingError.code === 'PGRST116') {
      return createApiError('Partido no encontrado', 404);
    }
    console.error('Error fetching game:', existingError);
    return createApiError('Error al obtener el partido', 500);
  }
  
  // Check if game can be cancelled
  if (existingGame.status === 'completed') {
    return createApiError('No se puede cancelar un partido completado', 400);
  }
  
  if (existingGame.status === 'cancelled') {
    return createApiError('El partido ya está cancelado', 400);
  }
  
  // Delete all related data first, then delete the game
  const { error: deleteRegistrationsError } = await supabase
    .from('game_registrations')
    .delete()
    .eq('game_id', gameId);
  
  if (deleteRegistrationsError) {
    console.error('Error deleting game registrations:', deleteRegistrationsError);
    return createApiError('Error al eliminar registraciones del partido', 500);
  }

  // Delete game results if any
  const { error: deleteResultsError } = await supabase
    .from('game_results')
    .delete()
    .eq('game_id', gameId);
  
  if (deleteResultsError) {
    console.error('Error deleting game results:', deleteResultsError);
    return createApiError('Error al eliminar resultados del partido', 500);
  }

  // Get registrations before any deletion for notifications
  const registrations = existingGame.game_registrations || [];
  
  // Send cancellation notifications to all registered players FIRST
  if (registrations.length > 0) {
    // Create temporary notifications for immediate sending
    const notifications = registrations.map(reg => ({
      player_phone: reg.player_phone,
      message_type: 'game_cancelled' as const,
      message_content: `El partido "${existingGame.title}" ha sido cancelado y eliminado. Te notificaremos sobre próximos partidos.`,
      delivery_status: 'pending' as const,
      scheduled_for: new Date().toISOString(),
    }));
    
    // Insert notifications without game_id since the game will be deleted
    await supabase.from('notifications').insert(notifications);
  }

  // Delete notifications related to this game
  const { error: deleteNotificationsError } = await supabase
    .from('notifications')
    .delete()
    .eq('game_id', gameId);
  
  if (deleteNotificationsError) {
    console.error('Error deleting notifications:', deleteNotificationsError);
    // Don't fail the request for notification deletion errors
  }

  // Finally delete the game itself
  const { error: deleteGameError } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);
  
  if (deleteGameError) {
    console.error('Error deleting game:', deleteGameError);
    return createApiError('Error al eliminar el partido', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: 'mock-admin-id', // Will be replaced with actual auth
    action_type: 'DELETE',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      reason: 'Game cancelled and deleted by admin',
      previous_status: existingGame.status,
      game_title: existingGame.title,
      registered_players: registrations.length,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  return createApiResponse(null, 'Partido eliminado exitosamente', 200);
});