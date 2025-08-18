import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateRequestBody, 
  validateQueryParams,
  withErrorHandling,
  generateSecureToken,
  getClientIP,
  getUserAgent,
  createPaginationMeta
} from '../../../../lib/utils/api';
import { 
  createGameSchema, 
  gameFiltersSchema, 
  paginationSchema 
} from '../../../../lib/validations/games';
import { 
  GameWithStats, 
  CreateGameRequest, 
  GamesListResponse,
  GameDetailsResponse
} from '../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/games - List games with filters and pagination
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const { data: filters, error: filtersError } = validateQueryParams(
    searchParams,
    gameFiltersSchema.merge(paginationSchema)
  );
  
  if (filtersError) {
    return filtersError;
  }
  
  const { page, limit, sort_by, sort_order, ...gameFilters } = filters;
  const offset = (page - 1) * limit;
  
  // Build query
  let query = supabase
    .from('games')
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
    `, { count: 'exact' });
  
  // Apply filters
  if (gameFilters.status && gameFilters.status.length > 0) {
    query = query.in('status', gameFilters.status);
  }
  
  if (gameFilters.date_from) {
    query = query.gte('game_date', gameFilters.date_from);
  }
  
  if (gameFilters.date_to) {
    query = query.lte('game_date', gameFilters.date_to);
  }
  
  if (gameFilters.created_by) {
    query = query.eq('created_by', gameFilters.created_by);
  }
  
  if (gameFilters.search) {
    query = query.or(`title.ilike.%${gameFilters.search}%,description.ilike.%${gameFilters.search}%`);
  }
  
  // Apply sorting and pagination
  query = query
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);
  
  const { data: gamesData, error: gamesError, count } = await query;
  
  if (gamesError) {
    console.error('Error fetching games:', gamesError);
    return createApiError('Error al obtener los partidos', 500);
  }
  
  // Transform data to include statistics
  const gamesWithStats: GameWithStats[] = gamesData?.map(game => {
    const registrations = game.game_registrations || [];
    const result = game.game_results?.[0] || null;
    
    return {
      ...game,
      current_players: registrations.length,
      waiting_list_count: Math.max(0, registrations.length - game.max_players),
      pending_payments: registrations.filter(r => r.payment_status === 'pending').length,
      total_revenue: registrations
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
      registrations,
      result,
    };
  }) || [];
  
  const pagination = createPaginationMeta(count || 0, page, limit);
  
  const response: GamesListResponse = {
    data: gamesWithStats,
    total: count || 0,
    page,
    limit,
    hasMore: pagination.hasMore,
  };
  
  return createApiResponse(response);
});

// POST /api/admin/games - Create new game
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request body
  const { data: gameData, error: validationError } = await validateRequestBody(
    request,
    createGameSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  // For now, use a mock admin user ID (will be replaced with actual auth)
  const adminUserId = 'mock-admin-id';
  
  // Generate secure share token
  const shareToken = generateSecureToken(32);
  
  // Insert game into database
  const { data: newGame, error: insertError } = await supabase
    .from('games')
    .insert({
      ...gameData,
      share_token: shareToken,
      created_by: adminUserId,
      status: 'draft',
    })
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
      )
    `)
    .single();
  
  if (insertError) {
    console.error('Error creating game:', insertError);
    return createApiError('Error al crear el partido', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: 'CREATE',
    entity_type: 'GAME',
    entity_id: newGame.id,
    action_details: {
      title: gameData.title,
      game_date: gameData.game_date,
      max_players: gameData.max_players,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Transform to include stats
  const gameWithStats: GameWithStats = {
    ...newGame,
    current_players: 0,
    waiting_list_count: 0,
    pending_payments: 0,
    total_revenue: 0,
    registrations: [],
    result: null,
  };
  
  const response: GameDetailsResponse = {
    data: gameWithStats,
    message: 'Partido creado exitosamente',
  };
  
  return createApiResponse(response, 'Partido creado exitosamente', 201);
});