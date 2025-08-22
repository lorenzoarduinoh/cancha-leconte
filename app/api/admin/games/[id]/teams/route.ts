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
  teamAssignmentSchema, 
  uuidSchema 
} from '../../../../../../lib/validations/games';
import { 
  TeamsResponse,
  TeamAssignmentData
} from '../../../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/games/[id]/teams - Assign teams
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Validate game ID
  const { id } = await params;
  const parseResult = uuidSchema.safeParse(id);
  if (!parseResult.success) {
    return createApiError('ID de partido inválido', 400);
  }
  
  const gameId = parseResult.data;
  
  // Validate request body
  const { data: assignmentData, error: validationError } = await validateRequestBody(
    request,
    teamAssignmentSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  // Check if game exists and get registrations
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      *,
      game_registrations(
        id,
        player_name,
        player_phone,
        team_assignment,
        payment_status,
        registered_at
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
  
  // Check if game can have teams assigned
  if (game.status === 'completed' || game.status === 'cancelled') {
    return createApiError('No se pueden asignar equipos a un partido completado o cancelado', 400);
  }
  
  if (game.status === 'draft') {
    return createApiError('El partido debe estar abierto para asignar equipos', 400);
  }
  
  const registrations = game.game_registrations || [];
  
  // Allow team assignment for testing with fewer players
  if (registrations.length < 2) {
    return createApiError(
      `Se necesitan al menos 2 jugadores para asignar equipos (actual: ${registrations.length})`,
      400
    );
  }
  
  // Prepare team assignments
  let teamAssignments: { [key: string]: 'team_a' | 'team_b' } = {};
  
  if (assignmentData.method === 'random') {
    // Randomly assign players to teams
    const shuffledRegistrations = [...registrations].sort(() => Math.random() - 0.5);
    const halfPoint = Math.ceil(shuffledRegistrations.length / 2);
    
    shuffledRegistrations.forEach((reg, index) => {
      teamAssignments[reg.id] = index < halfPoint ? 'team_a' : 'team_b';
    });
  } else if (assignmentData.method === 'manual') {
    // Use manual assignments provided
    if (!assignmentData.manual_assignments) {
      return createApiError('Asignaciones manuales requeridas', 400);
    }
    
    teamAssignments = assignmentData.manual_assignments;
    
    // Validate that all registrations are assigned
    const assignedIds = new Set(Object.keys(teamAssignments));
    const registrationIds = new Set(registrations.map(r => r.id));
    
    if (assignedIds.size !== registrationIds.size) {
      return createApiError('Todos los jugadores deben ser asignados a un equipo', 400);
    }
    
    for (const regId of registrationIds) {
      if (!assignedIds.has(regId)) {
        return createApiError(`Jugador con ID ${regId} no fue asignado a ningún equipo`, 400);
      }
    }
  }
  
  // Count players in each team to ensure balance
  const teamACount = Object.values(teamAssignments).filter(team => team === 'team_a').length;
  const teamBCount = Object.values(teamAssignments).filter(team => team === 'team_b').length;
  
  // For testing purposes, allow unbalanced teams if there are few players
  if (registrations.length >= 4 && Math.abs(teamACount - teamBCount) > 1) {
    return createApiError('Los equipos deben estar balanceados (diferencia máxima de 1 jugador)', 400);
  }
  
  // Update team assignments in database - update each registration individually
  for (const [regId, team] of Object.entries(teamAssignments)) {
    const { error } = await supabase
      .from('game_registrations')
      .update({ team_assignment: team })
      .eq('id', regId);
    
    if (error) {
      console.error(`Error updating registration ${regId}:`, error);
      return createApiError('Error al asignar equipos', 500);
    }
  }
  
  // Update game to mark teams as assigned
  const { error: gameUpdateError } = await supabase
    .from('games')
    .update({
      teams_assigned_at: new Date().toISOString(),
      status: 'closed', // Close registration after teams are assigned
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);
  
  if (gameUpdateError) {
    console.error('Error updating game status:', gameUpdateError);
    return createApiError('Error al actualizar el estado del partido', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: 'mock-admin-id', // Will be replaced with actual auth
    action_type: 'ASSIGN_TEAMS',
    entity_type: 'GAME',
    entity_id: gameId,
    action_details: {
      method: assignmentData.method,
      team_a_count: teamACount,
      team_b_count: teamBCount,
      assignments: teamAssignments,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Fetch updated registrations with team assignments
  const { data: updatedRegistrations, error: fetchError } = await supabase
    .from('game_registrations')
    .select('*')
    .eq('game_id', gameId)
    .order('team_assignment', { ascending: true })
    .order('registered_at', { ascending: true });
  
  if (fetchError) {
    console.error('Error fetching updated registrations:', fetchError);
    return createApiError('Error al obtener las asignaciones actualizadas', 500);
  }
  
  // Separate teams
  const teamA = updatedRegistrations?.filter(reg => reg.team_assignment === 'team_a') || [];
  const teamB = updatedRegistrations?.filter(reg => reg.team_assignment === 'team_b') || [];
  
  // Send notifications to players about team assignments
  const notifications = updatedRegistrations?.map(reg => ({
    game_id: gameId,
    player_phone: reg.player_phone,
    message_type: 'game_update' as const,
    message_content: `¡Equipos asignados para "${game.title}"! Has sido asignado al ${reg.team_assignment === 'team_a' ? 'Equipo A' : 'Equipo B'}.`,
    delivery_status: 'pending' as const,
  })) || [];
  
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }
  
  const response: TeamsResponse = {
    team_a: teamA,
    team_b: teamB,
    assignment_method: assignmentData.method,
    assigned_at: new Date().toISOString(),
    message: 'Equipos asignados exitosamente',
  };
  
  return createApiResponse(response, 'Equipos asignados exitosamente');
});

// GET /api/admin/games/[id]/teams - Get current team assignments
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Validate game ID
  const { id } = await params;
  const parseResult = uuidSchema.safeParse(id);
  if (!parseResult.success) {
    return createApiError('ID de partido inválido', 400);
  }
  
  const gameId = parseResult.data;
  
  // Fetch game with team assignments
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      teams_assigned_at,
      game_registrations(
        id,
        player_name,
        player_phone,
        team_assignment,
        payment_status,
        registered_at,
        paid_at
      )
    `)
    .eq('id', gameId)
    .single();
  
  if (gameError) {
    if (gameError.code === 'PGRST116') {
      return createApiError('Partido no encontrado', 404);
    }
    console.error('Error fetching game teams:', gameError);
    return createApiError('Error al obtener los equipos', 500);
  }
  
  const registrations = game.game_registrations || [];
  
  // Separate teams
  const teamA = registrations.filter(reg => reg.team_assignment === 'team_a');
  const teamB = registrations.filter(reg => reg.team_assignment === 'team_b');
  const unassigned = registrations.filter(reg => !reg.team_assignment);
  
  const response: TeamsResponse = {
    team_a: teamA,
    team_b: teamB,
    assignment_method: game.teams_assigned_at ? 'assigned' : 'none',
    assigned_at: game.teams_assigned_at || '',
    unassigned,
  };
  
  return createApiResponse(response);
});