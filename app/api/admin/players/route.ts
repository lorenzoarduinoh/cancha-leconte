import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateQueryParams,
  withErrorHandling,
  createPaginationMeta
} from '../../../../lib/utils/api';
import { 
  playerFiltersSchema, 
  paginationSchema 
} from '../../../../lib/validations/games';
import { 
  PlayerProfile,
  PlayersResponse
} from '../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/players - List players with analytics
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const { data: filters, error: filtersError } = validateQueryParams(
    searchParams,
    playerFiltersSchema.merge(paginationSchema)
  );
  
  if (filtersError) {
    return filtersError;
  }
  
  const { page, limit, sort_by, sort_order, ...playerFilters } = filters;
  const offset = (page - 1) * limit;
  
  // Use the player analytics function if available
  try {
    const { data: playerAnalytics, error: analyticsError } = await supabase
      .rpc('get_player_analytics', { 
        p_admin_user_id: 'mock-admin-id', // Will be replaced with actual auth
        p_limit: limit * 2 // Get more to allow for filtering
      });
    
    if (!analyticsError && playerAnalytics) {
      // Apply client-side filtering to the analytics data
      let filteredPlayers = playerAnalytics;
      
      if (playerFilters.phone) {
        filteredPlayers = filteredPlayers.filter(p => 
          p.player_phone.includes(playerFilters.phone!)
        );
      }
      
      if (playerFilters.name) {
        filteredPlayers = filteredPlayers.filter(p => 
          p.player_name.toLowerCase().includes(playerFilters.name!.toLowerCase())
        );
      }
      
      // Convert to PlayerProfile format and paginate
      const startIndex = offset;
      const endIndex = offset + limit;
      const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);
      
      const playerProfiles: PlayerProfile[] = await Promise.all(
        paginatedPlayers.map(async (player) => {
          // Get detailed game history for this player
          const { data: gameHistory } = await supabase
            .from('game_registrations')
            .select(`
              *,
              games(
                id,
                title,
                game_date,
                status
              )
            `)
            .eq('player_phone', player.player_phone)
            .order('registered_at', { ascending: false });
          
          return {
            name: player.player_name,
            phone: player.player_phone,
            total_games: player.total_games,
            completed_games: player.paid_games, // Assuming paid games are completed
            cancelled_games: player.total_games - player.paid_games,
            total_paid: player.total_paid,
            pending_payments: player.pending_payments,
            payment_reliability: player.payment_reliability,
            first_game_date: gameHistory?.[gameHistory.length - 1]?.registered_at || '',
            last_game_date: player.last_game_date,
            game_history: gameHistory || [],
          };
        })
      );
      
      const response: PlayersResponse = {
        data: playerProfiles,
        total: filteredPlayers.length,
        page,
        limit,
        hasMore: endIndex < filteredPlayers.length,
      };
      
      return createApiResponse(response);
    }
  } catch (error) {
    console.log('Player analytics function not available, using manual query');
  }
  
  // Fallback to manual query if function is not available
  let query = supabase
    .from('game_registrations')
    .select(`
      player_name,
      player_phone,
      payment_status,
      payment_amount,
      registered_at,
      paid_at,
      games(
        id,
        title,
        game_date,
        status,
        field_cost_per_player
      )
    `, { count: 'exact' });
  
  // Apply filters
  if (playerFilters.phone) {
    query = query.ilike('player_phone', `%${playerFilters.phone}%`);
  }
  
  if (playerFilters.name) {
    query = query.ilike('player_name', `%${playerFilters.name}%`);
  }
  
  if (playerFilters.payment_status) {
    query = query.eq('payment_status', playerFilters.payment_status);
  }
  
  if (playerFilters.game_id) {
    query = query.eq('game_id', playerFilters.game_id);
  }
  
  if (playerFilters.date_from) {
    query = query.gte('registered_at', playerFilters.date_from);
  }
  
  if (playerFilters.date_to) {
    query = query.lte('registered_at', playerFilters.date_to);
  }
  
  const { data: registrationsData, error: registrationsError, count } = await query;
  
  if (registrationsError) {
    console.error('Error fetching player registrations:', registrationsError);
    return createApiError('Error al obtener datos de jugadores', 500);
  }
  
  // Group registrations by player phone
  const playerMap = new Map<string, {
    name: string;
    phone: string;
    registrations: any[];
  }>();
  
  registrationsData?.forEach(reg => {
    const key = reg.player_phone;
    if (!playerMap.has(key)) {
      playerMap.set(key, {
        name: reg.player_name,
        phone: reg.player_phone,
        registrations: [],
      });
    }
    playerMap.get(key)!.registrations.push(reg);
  });
  
  // Convert to PlayerProfile format
  const allPlayers = Array.from(playerMap.values());
  const playerProfiles: PlayerProfile[] = allPlayers.map(player => {
    const registrations = player.registrations;
    const paidRegistrations = registrations.filter(r => r.payment_status === 'paid');
    const pendingRegistrations = registrations.filter(r => r.payment_status === 'pending');
    const completedGames = registrations.filter(r => r.games?.status === 'completed');
    const cancelledGames = registrations.filter(r => r.games?.status === 'cancelled');
    
    const totalPaid = paidRegistrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0);
    const pendingPayments = pendingRegistrations.length;
    
    const sortedRegistrations = registrations.sort((a, b) => 
      new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
    );
    
    return {
      name: player.name,
      phone: player.phone,
      total_games: registrations.length,
      completed_games: completedGames.length,
      cancelled_games: cancelledGames.length,
      total_paid: totalPaid,
      pending_payments: pendingPayments,
      payment_reliability: registrations.length > 0 
        ? (paidRegistrations.length / registrations.length) * 100 
        : 0,
      first_game_date: sortedRegistrations[0]?.registered_at || '',
      last_game_date: sortedRegistrations[sortedRegistrations.length - 1]?.registered_at || '',
      game_history: registrations,
    };
  });
  
  // Apply sorting
  playerProfiles.sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sort_by) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'total_games':
        aValue = a.total_games;
        bValue = b.total_games;
        break;
      case 'payment_reliability':
        aValue = a.payment_reliability;
        bValue = b.payment_reliability;
        break;
      case 'last_game_date':
        aValue = new Date(a.last_game_date);
        bValue = new Date(b.last_game_date);
        break;
      default:
        aValue = a.total_games;
        bValue = b.total_games;
    }
    
    if (aValue < bValue) return sort_order === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort_order === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Apply pagination
  const paginatedPlayers = playerProfiles.slice(offset, offset + limit);
  const pagination = createPaginationMeta(playerProfiles.length, page, limit);
  
  const response: PlayersResponse = {
    data: paginatedPlayers,
    total: playerProfiles.length,
    page,
    limit,
    hasMore: pagination.hasMore,
  };
  
  return createApiResponse(response);
});