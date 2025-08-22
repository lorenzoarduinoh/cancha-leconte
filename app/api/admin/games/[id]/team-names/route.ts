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
import { 
  teamNamesSchema,
  updateTeamNamesSchema,
  uuidSchema 
} from '../../../../../../lib/validations/games';
import { 
  TeamNamesData,
  UpdateTeamNamesRequest,
  TeamNamesResponse
} from '../../../../../../lib/types/api';
import { GAME_CONSTRAINTS } from '../../../../../../lib/types/game';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/games/[id]/team-names - Get team names for a game
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
  
  // Fetch game team names
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('team_a_name, team_b_name')
    .eq('id', gameId)
    .single();
  
  if (gameError) {
    if (gameError.code === 'PGRST116') {
      return createApiError('Partido no encontrado', 404);
    }
    console.error('Error fetching game team names:', gameError);
    return createApiError('Error al obtener los nombres de equipos', 500);
  }
  
  // Prepare response data
  const teamNamesData: TeamNamesData = {
    team_a_name: gameData.team_a_name,
    team_b_name: gameData.team_b_name,
  };
  
  const response: TeamNamesResponse = {
    data: teamNamesData,
  };
  
  return createApiResponse(response);
});

// PATCH /api/admin/games/[id]/team-names - Update team names for a game
export const PATCH = withErrorHandling(async (
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
    updateTeamNamesSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  // Check if at least one team name is provided
  if (!updateData.team_a_name && !updateData.team_b_name) {
    return createApiError('Al menos un nombre de equipo debe ser proporcionado', 400);
  }
  
  // Check if game exists and get current data
  const { data: existingGame, error: existingError } = await supabase
    .from('games')
    .select('team_a_name, team_b_name, status, title')
    .eq('id', gameId)
    .single();
  
  if (existingError) {
    if (existingError.code === 'PGRST116') {
      return createApiError('Partido no encontrado', 404);
    }
    console.error('Error fetching existing game:', existingError);
    return createApiError('Error al obtener el partido', 500);
  }
  
  // Prepare the update data with current values as defaults
  const finalTeamAName = updateData.team_a_name ?? existingGame.team_a_name;
  const finalTeamBName = updateData.team_b_name ?? existingGame.team_b_name;
  
  // Validate that final team names are different
  if (finalTeamAName.trim().toLowerCase() === finalTeamBName.trim().toLowerCase()) {
    return createApiError('Los nombres de los equipos deben ser diferentes', 400);
  }
  
  // Validate the final combined data to ensure it meets all constraints
  const fullValidationResult = teamNamesSchema.safeParse({
    team_a_name: finalTeamAName,
    team_b_name: finalTeamBName,
  });
  
  if (!fullValidationResult.success) {
    const firstError = fullValidationResult.error.errors[0];
    return createApiError(firstError.message, 400);
  }
  
  // Check if there are any actual changes
  if (finalTeamAName === existingGame.team_a_name && finalTeamBName === existingGame.team_b_name) {
    // No changes, return current data
    const teamNamesData: TeamNamesData = {
      team_a_name: existingGame.team_a_name,
      team_b_name: existingGame.team_b_name,
    };
    
    const response: TeamNamesResponse = {
      data: teamNamesData,
    };
    
    return createApiResponse(response, 'No hay cambios en los nombres de equipos');
  }
  
  // Log the update attempt for debugging
  console.log('Updating team names for game:', gameId);
  console.log('Previous names:', { 
    team_a: existingGame.team_a_name, 
    team_b: existingGame.team_b_name 
  });
  console.log('New names:', { 
    team_a: finalTeamAName, 
    team_b: finalTeamBName 
  });
  
  // Set application context for the audit trigger
  // Note: Setting context for audit trigger - simplified for now
  // TODO: Implement proper context setting if audit logging is required
  
  // Update team names
  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({
      team_a_name: finalTeamAName,
      team_b_name: finalTeamBName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select('team_a_name, team_b_name, title')
    .single();
  
  if (updateError) {
    console.error('Error updating team names:', updateError);
    
    // Check for constraint violations
    if (updateError.message?.includes('check_team_names_different')) {
      return createApiError('Los nombres de los equipos deben ser diferentes', 400);
    }
    if (updateError.message?.includes('check_team_a_name_length') || 
        updateError.message?.includes('check_team_b_name_length')) {
      return createApiError('Los nombres de equipos deben tener entre 2 y 50 caracteres', 400);
    }
    if (updateError.message?.includes('check_team_a_name_not_empty') || 
        updateError.message?.includes('check_team_b_name_not_empty')) {
      return createApiError('Los nombres de equipos no pueden estar vacíos', 400);
    }
    
    return createApiError('Error al actualizar los nombres de equipos', 500);
  }
  
  // Manual audit log entry (in addition to the trigger)
  await supabase.from('admin_audit_log').insert({
    admin_user_id: 'mock-admin-id', // Will be replaced with actual auth
    action_type: 'update_team_names',
    entity_type: 'games',
    entity_id: gameId,
    action_details: {
      previous_team_a_name: existingGame.team_a_name,
      new_team_a_name: updatedGame.team_a_name,
      previous_team_b_name: existingGame.team_b_name,
      new_team_b_name: updatedGame.team_b_name,
      game_title: existingGame.title,
      fields_changed: [
        ...(updateData.team_a_name ? ['team_a_name'] : []),
        ...(updateData.team_b_name ? ['team_b_name'] : []),
      ],
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Check if we should notify players about team name changes
  // Only notify if the game has registrations and is not draft status
  if (existingGame.status !== 'draft') {
    const { data: registrations } = await supabase
      .from('game_registrations')
      .select('player_phone')
      .eq('game_id', gameId);
    
    if (registrations && registrations.length > 0) {
      // Create notification entries for team name updates
      const notifications = registrations.map(reg => ({
        game_id: gameId,
        player_phone: reg.player_phone,
        message_type: 'game_update' as const,
        message_content: `Los nombres de equipos del partido "${updatedGame.title}" han sido actualizados: ${updatedGame.team_a_name} vs ${updatedGame.team_b_name}.`,
        delivery_status: 'pending' as const,
      }));
      
      await supabase.from('notifications').insert(notifications);
      
      console.log(`Created ${notifications.length} notifications for team name update`);
    }
  }
  
  // Prepare response data
  const teamNamesData: TeamNamesData = {
    team_a_name: updatedGame.team_a_name,
    team_b_name: updatedGame.team_b_name,
  };
  
  const response: TeamNamesResponse = {
    data: teamNamesData,
  };
  
  return createApiResponse(
    response, 
    'Nombres de equipos actualizados exitosamente'
  );
});

// PUT /api/admin/games/[id]/team-names - Complete team names update (alias for PATCH)
export const PUT = PATCH;