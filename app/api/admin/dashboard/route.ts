import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  withErrorHandling,
  getDaysOverdue,
  isPaymentOverdue
} from '../../../../lib/utils/api';
import { withAuth } from '../../../../lib/auth/middleware';
import { 
  DashboardData,
  DashboardResponse,
  PaymentAlert,
  QuickStats,
  GameWithStats
} from '../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/dashboard - Get comprehensive dashboard data
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;
    const adminUserId = user.id;
    
    // Get current date info
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Fetch dashboard statistics using database function
    const { data: dashboardStats, error: statsError } = await supabase
      .rpc('get_dashboard_data', { p_admin_user_id: adminUserId });
    
    if (statsError) {
      console.error('Error fetching dashboard stats:', statsError);
      // Fallback to manual queries if function doesn't exist
    }
    
    // Fetch active games (open or closed status)
    const { data: activeGamesData, error: activeGamesError } = await supabase
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
          recorded_at
        )
      `)
      .in('status', ['open', 'closed', 'in_progress'])
      .order('game_date', { ascending: true })
      .limit(10);
    
    if (activeGamesError) {
      console.error('Error fetching active games:', activeGamesError);
      return createApiError('Error al obtener partidos activos', 500);
    }
    
    // Transform active games data
    const activeGames: GameWithStats[] = activeGamesData?.map(game => {
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
    
    // Fetch recent registrations (last 24 hours)
    const { data: recentRegistrations, error: recentRegError } = await supabase
      .from('game_registrations')
      .select(`
        *,
        games(title, game_date)
      `)
      .gte('registered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('registered_at', { ascending: false })
      .limit(20);
    
    if (recentRegError) {
      console.error('Error fetching recent registrations:', recentRegError);
    }
    
    // Calculate payment alerts (overdue payments)
    const paymentAlerts: PaymentAlert[] = [];
    
    // Get all games with pending payments
    const { data: gamesWithPendingPayments, error: pendingError } = await supabase
      .from('games')
      .select(`
        id,
        title,
        game_date,
        field_cost_per_player,
        game_registrations!inner(
          id,
          player_name,
          player_phone,
          payment_status,
          payment_amount
        )
      `)
      .eq('game_registrations.payment_status', 'pending')
      .lt('game_date', now.toISOString()) // Games that already happened
      .order('game_date', { ascending: false });
    
    if (!pendingError && gamesWithPendingPayments) {
      for (const game of gamesWithPendingPayments) {
        for (const registration of game.game_registrations) {
          if (isPaymentOverdue(game.game_date, registration.payment_status)) {
            paymentAlerts.push({
              id: registration.id,
              player_name: registration.player_name,
              player_phone: registration.player_phone,
              game_title: game.title,
              game_date: game.game_date,
              amount_due: registration.payment_amount || game.field_cost_per_player,
              days_overdue: getDaysOverdue(game.game_date),
            });
          }
        }
      }
    }
    
    // Calculate quick stats for the week
    const { data: weeklyGames, error: weeklyError } = await supabase
      .from('games')
      .select(`
        *,
        game_registrations(payment_status, payment_amount, registered_at)
      `)
      .gte('game_date', weekStart);
    
    let quickStats: QuickStats = {
      total_games_this_week: 0,
      revenue_this_week: 0,
      new_players_this_week: 0,
      payment_completion_rate: 0,
    };
    
    if (!weeklyError && weeklyGames) {
      const allRegistrations = weeklyGames.flatMap(g => g.game_registrations || []);
      const paidRegistrations = allRegistrations.filter(r => r.payment_status === 'paid');
      
      // Get unique players this week
      const uniquePhones = new Set();
      const { data: weeklyRegistrations } = await supabase
        .from('game_registrations')
        .select('player_phone')
        .gte('registered_at', weekStart);
      
      weeklyRegistrations?.forEach(r => uniquePhones.add(r.player_phone));
      
      quickStats = {
        total_games_this_week: weeklyGames.length,
        revenue_this_week: paidRegistrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
        new_players_this_week: uniquePhones.size,
        payment_completion_rate: allRegistrations.length > 0 
          ? (paidRegistrations.length / allRegistrations.length) * 100 
          : 0,
      };
    }
    
    // Compile dashboard data
    const dashboardData: DashboardData = {
      // Use stats from function if available, otherwise calculate manually
      active_games_count: dashboardStats?.[0]?.active_games_count || activeGames.length,
      today_games_count: dashboardStats?.[0]?.today_games_count || 
        activeGames.filter(g => g.game_date.startsWith(today)).length,
      pending_payments_count: dashboardStats?.[0]?.pending_payments_count || paymentAlerts.length,
      total_revenue_this_month: dashboardStats?.[0]?.total_revenue_this_month || 0,
      recent_registrations_count: dashboardStats?.[0]?.recent_registrations_count || 
        (recentRegistrations?.length || 0),
      
      // Detailed data
      active_games: activeGames,
      recent_registrations: recentRegistrations || [],
      payment_alerts: paymentAlerts,
      quick_stats: quickStats,
    };
    
    return createApiResponse(dashboardData, 'Dashboard data loaded successfully');
    
  } catch (error) {
    console.error('Dashboard error:', error);
    return createApiError('Error al cargar datos del dashboard', 500);
  }
}, {
  required_role: 'admin',
  rate_limit: true,
  csrf_protection: false
});

// POST /api/admin/dashboard/refresh - Force refresh dashboard data
export const POST = withAuth(async (request: NextRequest, context) => {
  // This endpoint can be used to trigger cache invalidation or real-time updates
  // For now, it just returns the same data as GET
  return GET(request, context);
}, {
  required_role: 'admin',
  rate_limit: true,
  csrf_protection: true
});