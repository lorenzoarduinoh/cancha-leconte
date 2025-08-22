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
  
  console.log('=== GET GAMES DEBUG ===');
  console.log('Raw games data from DB:', gamesData);
  if (gamesData && gamesData.length > 0) {
    console.log('First game raw:', gamesData[0]);
    console.log('First game ID:', gamesData[0]?.id);
  }
  
  // Auto-update status for games based on duration
  const now = new Date();
  const gamesToUpdateInProgress: string[] = [];
  const gamesToUpdateCompleted: string[] = [];
  
  gamesData?.forEach(game => {
    // Parse game date as Argentina local time (UTC-3) - same logic as frontend
    const isoMatch = game.game_date.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    let gameDate: Date;
    
    if (isoMatch) {
      // Parse as literal local time (Argentina timezone)
      const [, year, month, day, hours, minutes] = isoMatch;
      gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    } else {
      // Fallback
      gameDate = new Date(game.game_date);
    }
    
    const gameDuration = game.game_duration_minutes || 90; // Default 90 minutes
    const gameEndTime = new Date(gameDate.getTime() + gameDuration * 60 * 1000);
    
    
    // If current time is between game start and game end, mark as in_progress
    if (now >= gameDate && now <= gameEndTime && (game.status === 'draft' || game.status === 'open' || game.status === 'closed')) {
      gamesToUpdateInProgress.push(game.id);
    }
    // If current time is after game end time and status is not completed/cancelled, mark as completed
    else if (now > gameEndTime && (game.status === 'draft' || game.status === 'open' || game.status === 'closed' || game.status === 'in_progress')) {
      gamesToUpdateCompleted.push(game.id);
    }
  });
  
  // Update games to 'in_progress' status in batch
  if (gamesToUpdateInProgress.length > 0) {
    console.log('Auto-updating games to in_progress:', gamesToUpdateInProgress);
    await supabase
      .from('games')
      .update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .in('id', gamesToUpdateInProgress);
      
    // Update the local data to reflect the changes
    gamesData?.forEach(game => {
      if (gamesToUpdateInProgress.includes(game.id)) {
        game.status = 'in_progress';
      }
    });
  }
  
  // Update games to 'completed' status in batch
  if (gamesToUpdateCompleted.length > 0) {
    console.log('Auto-updating games to completed:', gamesToUpdateCompleted);
    await supabase
      .from('games')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .in('id', gamesToUpdateCompleted);
      
    // Update the local data to reflect the changes
    gamesData?.forEach(game => {
      if (gamesToUpdateCompleted.includes(game.id)) {
        game.status = 'completed';
      }
    });
  }

  // Transform data to include statistics
  const gamesWithStats: GameWithStats[] = gamesData?.map(game => {
    // Filter out refunded registrations (cancelled registrations should be deleted, but filter legacy refunded ones)
    const registrations = (game.game_registrations || []).filter(r => r.payment_status !== 'refunded');
    const result = game.game_results?.[0] || null;
    
    const transformed = {
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
    
    console.log('Transformed game:', transformed);
    console.log('Transformed game ID:', transformed.id);
    
    return transformed;
  }) || [];
  
  console.log('Final games with stats:', gamesWithStats);
  console.log('Final games IDs:', gamesWithStats.map(g => g.id));
  
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
  console.log('=== POST GAME START ===');
  
  // Validate request body
  const { data: gameData, error: validationError } = await validateRequestBody(
    request,
    createGameSchema
  );
  
  console.log('Validation result:', { gameData, validationError });
  
  if (validationError) {
    console.log('Validation error returning:', validationError);
    return validationError;
  }
  
  console.log('Game data passed validation:', gameData);
  
  // For now, use an existing admin user ID (will be replaced with actual auth)
  // First, let's get an existing admin user from the database
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
  
  // Generate secure share token
  const shareToken = generateSecureToken(32);
  
  // Process datetime-local format - keep user's intended local time
  let gameDate = gameData!.game_date;
  console.log('=== COMPREHENSIVE DATE DEBUG ===');
  console.log('Raw input from frontend:', gameData!.game_date);
  console.log('Current server time:', new Date().toISOString());
  console.log('Server timezone offset (minutes):', new Date().getTimezoneOffset());
  
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(gameDate)) {
    // Test different interpretations of the input
    const originalInput = gameDate;
    const asDate = new Date(gameDate + ':00');
    const asUTC = new Date(gameDate + ':00Z'); // Explicit UTC
    const asLocal = new Date(gameDate + ':00'); // Local interpretation
    
    console.log('Original input:', originalInput);
    console.log('As Date object (local):', asDate.toString());
    console.log('As Date object (UTC):', asDate.toISOString());
    console.log('As explicit UTC:', asUTC.toString());
    console.log('As explicit UTC ISO:', asUTC.toISOString());
    
    // User entered local time - treat it as literal time without timezone conversion
    // Just add seconds to make it a valid ISO format
    gameDate = gameDate + ':00';
    
    console.log('Final stored value:', gameDate);
  } else {
    console.log('Date format does not match expected pattern, storing as-is:', gameDate);
  }
  
  // Ensure game duration is set with default if not provided
  const gameDurationMinutes = gameData!.game_duration_minutes || 90;
  
  // Insert game into database
  const { data: newGame, error: insertError } = await supabase
    .from('games')
    .insert({
      ...gameData,
      game_date: gameDate,
      game_duration_minutes: gameDurationMinutes,
      share_token: shareToken,
      created_by: adminUserId,
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
  
  if (insertError) {
    console.error('Error creating game:', insertError);
    return createApiError('Error al crear el partido', 500);
  }
  
  console.log('Game created successfully:', newGame);
  
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
  
  // Transform to include stats (same logic as GET endpoint)
  const registrations = newGame.game_registrations || [];
  const result = newGame.game_results?.[0] || null;
  
  const gameWithStats: GameWithStats = {
    ...newGame,
    current_players: registrations.length,
    waiting_list_count: Math.max(0, registrations.length - newGame.max_players),
    pending_payments: registrations.filter(r => r.payment_status === 'pending').length,
    total_revenue: registrations
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
    registrations,
    result,
  };
  
  const response: GameDetailsResponse = {
    data: gameWithStats,
    message: 'Partido creado exitosamente',
  };
  
  console.log('Final game response object:', response);
  console.log('Final game response data:', response.data);
  console.log('Final game response data ID:', response.data?.id);
  
  const apiResponse = createApiResponse(response, 'Partido creado exitosamente', 201);
  console.log('API response being returned:', apiResponse);
  
  return apiResponse;
});