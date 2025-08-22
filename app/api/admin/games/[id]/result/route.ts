import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateRequestBody, 
  withErrorHandling,
  getClientIP,
  getUserAgent
} from '../../../../../../lib/utils/api';
import { z } from 'zod';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for game results
const gameResultSchema = z.object({
  team_a_score: z.number().int().min(0),
  team_b_score: z.number().int().min(0),
  winning_team: z.enum(['team_a', 'team_b', 'draw']).nullable(),
  notes: z.string().optional(),
});

// POST /api/admin/games/[id]/result - Record game result
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const gameId = resolvedParams.id;

  // Validate request body
  const { data: resultData, error: validationError } = await validateRequestBody(
    request,
    gameResultSchema
  );

  if (validationError) {
    return validationError;
  }

  // Check if game exists and get current status
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError) {
    console.error('Error fetching game:', gameError);
    return createApiError('Partido no encontrado', 404);
  }

  // Check if game status allows result recording
  if (!['in_progress', 'completed'].includes(game.status)) {
    return createApiError('Solo se pueden registrar resultados de partidos en progreso o completados', 400);
  }

  // Get admin user (simplified for now)
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .limit(1)
    .single();
    
  if (adminError || !adminUsers) {
    console.error('No admin users found:', adminError);
    return createApiError('No hay usuarios administradores disponibles', 500);
  }

  const adminUserId = adminUsers.id;

  // Check if result already exists
  const { data: existingResult } = await supabase
    .from('game_results')
    .select('id')
    .eq('game_id', gameId)
    .single();

  if (existingResult) {
    // Update existing result
    const { error: updateError } = await supabase
      .from('game_results')
      .update({
        team_a_score: resultData.team_a_score,
        team_b_score: resultData.team_b_score,
        winning_team: resultData.winning_team,
        notes: resultData.notes || null,
        recorded_at: new Date().toISOString(),
        recorded_by: adminUserId,
      })
      .eq('id', existingResult.id);

    if (updateError) {
      console.error('Error updating game result:', updateError);
      return createApiError('Error al actualizar el resultado', 500);
    }
  } else {
    // Insert new result
    const { error: insertError } = await supabase
      .from('game_results')
      .insert({
        game_id: gameId,
        team_a_score: resultData.team_a_score,
        team_b_score: resultData.team_b_score,
        winning_team: resultData.winning_team,
        notes: resultData.notes || null,
        recorded_by: adminUserId,
      });

    if (insertError) {
      console.error('Error inserting game result:', insertError);
      return createApiError('Error al registrar el resultado', 500);
    }
  }

  // Update game status to completed and set results_recorded_at
  const { error: gameUpdateError } = await supabase
    .from('games')
    .update({
      status: 'completed',
      results_recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  if (gameUpdateError) {
    console.error('Error updating game status:', gameUpdateError);
    return createApiError('Error al actualizar el estado del partido', 500);
  }

  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: 'RECORD_RESULTS',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      team_a_score: resultData.team_a_score,
      team_b_score: resultData.team_b_score,
      winning_team: resultData.winning_team,
      notes: resultData.notes,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return createApiResponse(
    { success: true }, 
    'Resultado registrado exitosamente',
    200
  );
});

// GET /api/admin/games/[id]/result - Fetch existing game result
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const gameId = resolvedParams.id;

  // Check if game exists
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError) {
    console.error('Error fetching game:', gameError);
    return createApiError('Partido no encontrado', 404);
  }

  // Get admin user for authorization check (simplified for now)
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .limit(1)
    .single();
    
  if (adminError || !adminUsers) {
    console.error('No admin users found:', adminError);
    return createApiError('No hay usuarios administradores disponibles', 500);
  }

  // Fetch existing game result
  const { data: gameResult, error: resultError } = await supabase
    .from('game_results')
    .select(`
      id,
      game_id,
      team_a_score,
      team_b_score,
      winning_team,
      notes,
      recorded_at,
      recorded_by
    `)
    .eq('game_id', gameId)
    .single();

  if (resultError) {
    // If no result exists yet, return 404
    if (resultError.code === 'PGRST116') {
      return createApiError('No se ha registrado un resultado para este partido', 404);
    }
    
    console.error('Error fetching game result:', resultError);
    return createApiError('Error al obtener el resultado del partido', 500);
  }

  // Create audit log entry for result access
  await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUsers.id,
    action_type: 'VIEW_RESULTS',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      result_id: gameResult.id,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return createApiResponse(
    { 
      result: gameResult,
      game: {
        id: game.id,
        status: game.status,
        results_recorded_at: game.results_recorded_at,
      }
    }, 
    'Resultado obtenido exitosamente',
    200
  );
});

// PUT /api/admin/games/[id]/result - Update existing game result
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const gameId = resolvedParams.id;

  // Validate request body
  const { data: resultData, error: validationError } = await validateRequestBody(
    request,
    gameResultSchema
  );

  if (validationError) {
    return validationError;
  }

  // Check if game exists
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError) {
    console.error('Error fetching game:', gameError);
    return createApiError('Partido no encontrado', 404);
  }

  // Check if game status allows result updates
  if (!['in_progress', 'completed'].includes(game.status)) {
    return createApiError('Solo se pueden actualizar resultados de partidos en progreso o completados', 400);
  }

  // Check if result exists to update
  const { data: existingResult, error: resultError } = await supabase
    .from('game_results')
    .select('id')
    .eq('game_id', gameId)
    .single();

  if (resultError || !existingResult) {
    return createApiError('No existe un resultado previo para actualizar. Use POST para crear un nuevo resultado.', 404);
  }

  // Get admin user (simplified for now)
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .limit(1)
    .single();
    
  if (adminError || !adminUsers) {
    console.error('No admin users found:', adminError);
    return createApiError('No hay usuarios administradores disponibles', 500);
  }

  const adminUserId = adminUsers.id;

  // Update existing result
  const { error: updateError } = await supabase
    .from('game_results')
    .update({
      team_a_score: resultData.team_a_score,
      team_b_score: resultData.team_b_score,
      winning_team: resultData.winning_team,
      notes: resultData.notes || null,
      recorded_at: new Date().toISOString(),
      recorded_by: adminUserId,
    })
    .eq('id', existingResult.id);

  if (updateError) {
    console.error('Error updating game result:', updateError);
    return createApiError('Error al actualizar el resultado', 500);
  }

  // Update game status to completed and set results_recorded_at
  const { error: gameUpdateError } = await supabase
    .from('games')
    .update({
      status: 'completed',
      results_recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  if (gameUpdateError) {
    console.error('Error updating game status:', gameUpdateError);
    return createApiError('Error al actualizar el estado del partido', 500);
  }

  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: 'UPDATE_RESULTS',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      team_a_score: resultData.team_a_score,
      team_b_score: resultData.team_b_score,
      winning_team: resultData.winning_team,
      notes: resultData.notes,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return createApiResponse(
    { success: true }, 
    'Resultado actualizado exitosamente',
    200
  );
});