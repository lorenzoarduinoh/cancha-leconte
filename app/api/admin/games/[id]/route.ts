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
  { params }: { params: { id: string } }
) => {
  // Validate game ID
  const parseResult = uuidSchema.safeParse(params.id);
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
  
  // Transform data to include statistics
  const registrations = gameData.game_registrations || [];
  const result = gameData.game_results?.[0] || null;
  
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
  
  const response: GameDetailsResponse = {
    data: gameWithStats,
  };
  
  return createApiResponse(response);
});

// PUT /api/admin/games/[id] - Update game
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Validate game ID
  const parseResult = uuidSchema.safeParse(params.id);
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

// DELETE /api/admin/games/[id] - Cancel/Delete game
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Validate game ID
  const parseResult = uuidSchema.safeParse(params.id);
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
  
  // Update game status to cancelled instead of deleting
  const { error: cancelError } = await supabase
    .from('games')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);
  
  if (cancelError) {
    console.error('Error cancelling game:', cancelError);
    return createApiError('Error al cancelar el partido', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: 'mock-admin-id', // Will be replaced with actual auth
    action_type: 'CANCEL',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      reason: 'Cancelled by admin',
      previous_status: existingGame.status,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Notify all registered players about cancellation
  const registrations = existingGame.game_registrations || [];
  if (registrations.length > 0) {
    const notifications = registrations.map(reg => ({
      game_id: gameId,
      player_phone: reg.player_phone,
      message_type: 'game_cancelled' as const,
      message_content: `El partido "${existingGame.title}" ha sido cancelado. Te notificaremos sobre próximos partidos.`,
      delivery_status: 'pending' as const,
    }));
    
    await supabase.from('notifications').insert(notifications);
  }
  
  return createApiResponse(null, 'Partido cancelado exitosamente', 200);
});