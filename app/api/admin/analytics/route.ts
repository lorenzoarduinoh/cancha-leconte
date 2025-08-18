import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateQueryParams,
  withErrorHandling
} from '../../../../lib/utils/api';
import { analyticsParamsSchema } from '../../../../lib/validations/games';
import { 
  AnalyticsResponse,
  GameStatistics,
  PlayerAnalytics,
  RevenueByMonth,
  GameFrequency
} from '../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/analytics - Get comprehensive analytics data
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const { data: params, error: paramsError } = validateQueryParams(
    searchParams,
    analyticsParamsSchema
  );
  
  if (paramsError) {
    return paramsError;
  }
  
  const adminUserId = 'mock-admin-id'; // Will be replaced with actual auth
  
  try {
    // Get game statistics using database function
    let gameStatistics: GameStatistics = {
      total_games: 0,
      completed_games: 0,
      cancelled_games: 0,
      total_players: 0,
      unique_players: 0,
      total_revenue: 0,
      pending_payments: 0,
      average_players_per_game: 0,
    };
    
    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_game_statistics', {
          p_admin_user_id: adminUserId,
          p_start_date: params.start_date,
          p_end_date: params.end_date,
        });
      
      if (!statsError && statsData && statsData.length > 0) {
        gameStatistics = statsData[0];
      }
    } catch (error) {
      console.log('Statistics function not available, using manual calculation');
      
      // Fallback to manual calculation
      let gamesQuery = supabase
        .from('games')
        .select(`
          *,
          game_registrations(
            id,
            payment_status,
            payment_amount,
            player_phone
          )
        `)
        .eq('created_by', adminUserId);
      
      if (params.start_date) {
        gamesQuery = gamesQuery.gte('game_date', params.start_date);
      }
      
      if (params.end_date) {
        gamesQuery = gamesQuery.lte('game_date', params.end_date);
      }
      
      const { data: gamesData, error: gamesError } = await gamesQuery;
      
      if (!gamesError && gamesData) {
        const allRegistrations = gamesData.flatMap(g => g.game_registrations || []);
        const uniquePhones = new Set(allRegistrations.map(r => r.player_phone));
        const paidRegistrations = allRegistrations.filter(r => r.payment_status === 'paid');
        const pendingRegistrations = allRegistrations.filter(r => r.payment_status === 'pending');
        
        gameStatistics = {
          total_games: gamesData.length,
          completed_games: gamesData.filter(g => g.status === 'completed').length,
          cancelled_games: gamesData.filter(g => g.status === 'cancelled').length,
          total_players: allRegistrations.length,
          unique_players: uniquePhones.size,
          total_revenue: paidRegistrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
          pending_payments: pendingRegistrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
          average_players_per_game: gamesData.length > 0 
            ? allRegistrations.length / gamesData.length 
            : 0,
        };
      }
    }
    
    // Get player analytics
    let playerAnalytics: PlayerAnalytics[] = [];
    
    try {
      const { data: playersData, error: playersError } = await supabase
        .rpc('get_player_analytics', {
          p_admin_user_id: adminUserId,
          p_limit: 50,
        });
      
      if (!playersError && playersData) {
        playerAnalytics = playersData;
      }
    } catch (error) {
      console.log('Player analytics function not available');
    }
    
    // Calculate revenue by month
    const revenueByMonth: RevenueByMonth[] = [];
    
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('game_registrations')
      .select(`
        payment_amount,
        paid_at,
        games(game_date, created_by)
      `)
      .eq('payment_status', 'paid')
      .eq('games.created_by', adminUserId)
      .not('paid_at', 'is', null);
    
    if (!monthlyError && monthlyData) {
      const monthlyMap = new Map<string, { revenue: number; games: Set<string>; players: Set<string> }>();
      
      monthlyData.forEach(payment => {
        const month = payment.paid_at?.substring(0, 7); // YYYY-MM format
        if (month) {
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { revenue: 0, games: new Set(), players: new Set() });
          }
          const monthData = monthlyMap.get(month)!;
          monthData.revenue += payment.payment_amount || 0;
          if (payment.games) {
            monthData.games.add(payment.games.game_date.substring(0, 10)); // Unique game dates
          }
        }
      });
      
      for (const [month, data] of monthlyMap.entries()) {
        revenueByMonth.push({
          month,
          revenue: data.revenue,
          games_count: data.games.size,
          players_count: 0, // Would need additional query to get unique players per month
        });
      }
      
      revenueByMonth.sort((a, b) => a.month.localeCompare(b.month));
    }
    
    // Calculate game frequency by day of week
    const gameFrequency: GameFrequency[] = [];
    
    const { data: frequencyData, error: frequencyError } = await supabase
      .from('games')
      .select(`
        game_date,
        game_registrations(id)
      `)
      .eq('created_by', adminUserId)
      .in('status', ['completed', 'in_progress']);
    
    if (!frequencyError && frequencyData) {
      const dayMap = new Map<number, { count: number; totalPlayers: number }>();
      
      // Initialize days of week
      for (let i = 0; i < 7; i++) {
        dayMap.set(i, { count: 0, totalPlayers: 0 });
      }
      
      frequencyData.forEach(game => {
        const dayOfWeek = new Date(game.game_date).getDay();
        const dayData = dayMap.get(dayOfWeek)!;
        dayData.count += 1;
        dayData.totalPlayers += game.game_registrations?.length || 0;
      });
      
      for (const [dayOfWeek, data] of dayMap.entries()) {
        gameFrequency.push({
          day_of_week: dayOfWeek,
          games_count: data.count,
          average_players: data.count > 0 ? data.totalPlayers / data.count : 0,
        });
      }
    }
    
    const response: AnalyticsResponse = {
      statistics: gameStatistics,
      player_analytics: playerAnalytics,
      revenue_by_month: revenueByMonth,
      game_frequency: gameFrequency,
      message: 'Analytics data loaded successfully',
    };
    
    return createApiResponse(response);
    
  } catch (error) {
    console.error('Analytics error:', error);
    return createApiError('Error al cargar datos de análisis', 500);
  }
});