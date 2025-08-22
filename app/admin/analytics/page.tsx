'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { AnalyticsChart } from '../../components/analytics/AnalyticsChart';
import { PlayerAnalytics } from '../../components/analytics/PlayerAnalytics';
import { RevenueAnalytics } from '../../components/analytics/RevenueAnalytics';
import { GameTrends } from '../../components/analytics/GameTrends';
import { 
  GameStatistics, 
  PlayerAnalytics as PlayerAnalyticsType,
  DashboardData 
} from '../../../lib/types/game';

interface AnalyticsPageState {
  loading: boolean;
  error: string | null;
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  statistics: GameStatistics | null;
  playerAnalytics: PlayerAnalyticsType[];
  dashboardData: DashboardData | null;
  activeTab: 'overview' | 'players' | 'revenue' | 'trends';
}

export default function AnalyticsPage() {
  const [state, setState] = useState<AnalyticsPageState>({
    loading: true,
    error: null,
    timeRange: 'month',
    statistics: null,
    playerAnalytics: [],
    dashboardData: null,
    activeTab: 'overview',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const fetchAnalytics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      
      // Set date range based on selected time range
      const now = new Date();
      const startDate = new Date();
      
      switch (state.timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2020); // Far back date
          break;
      }

      if (state.timeRange !== 'all') {
        params.append('start_date', startDate.toISOString().split('T')[0]);
        params.append('end_date', now.toISOString().split('T')[0]);
      }

      // Fetch multiple analytics endpoints
      const [statisticsRes, playersRes, dashboardRes] = await Promise.all([
        fetch(`/api/admin/analytics?${params}`, {
          method: 'GET',
          credentials: 'include',
        }),
        fetch(`/api/admin/analytics/players?${params}`, {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/api/admin/dashboard', {
          method: 'GET',
          credentials: 'include',
        }),
      ]);

      if (!statisticsRes.ok || !playersRes.ok || !dashboardRes.ok) {
        throw new Error('Error al cargar las estadísticas');
      }

      const [statisticsData, playersData, dashboardData] = await Promise.all([
        statisticsRes.json(),
        playersRes.json(),
        dashboardRes.json(),
      ]);

      setState(prev => ({
        ...prev,
        loading: false,
        statistics: statisticsData.data,
        playerAnalytics: playersData.data || [],
        dashboardData: dashboardData.data,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [state.timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleTimeRangeChange = (newRange: AnalyticsPageState['timeRange']) => {
    setState(prev => ({ ...prev, timeRange: newRange }));
  };

  const handleTabChange = (tab: AnalyticsPageState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const timeRangeOptions = [
    { value: 'week', label: 'Última semana' },
    { value: 'month', label: 'Último mes' },
    { value: 'quarter', label: 'Últimos 3 meses' },
    { value: 'year', label: 'Último año' },
    { value: 'all', label: 'Todo el tiempo' },
  ];

  const getTimeRangeLabel = () => {
    switch (state.timeRange) {
      case 'week': return 'Esta semana';
      case 'month': return 'Este mes';
      case 'quarter': return 'Últimos 3 meses';
      case 'year': return 'Este año';
      case 'all': return 'Histórico';
      default: return 'Periodo seleccionado';
    }
  };

  if (state.loading && !state.statistics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="text-6xl mb-4" aria-hidden="true">📊</div>
            <h2 className="text-xl font-semibold mb-2">Error al cargar estadísticas</h2>
            <p className="text-neutral-600 mb-4">{state.error}</p>
            <Button onClick={fetchAnalytics} variant="primary">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
                Analytics y Reportes
              </h1>
              <p className="text-neutral-600 mt-1">
                Estadísticas detalladas de partidos, jugadores y finanzas
              </p>
            </div>

            <Select
              value={state.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as AnalyticsPageState['timeRange'])}
              options={timeRangeOptions}
              className="w-full md:w-48"
            />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {[
              { id: 'overview', label: 'Resumen General', icon: '📊' },
              { id: 'players', label: 'Jugadores', icon: '👥' },
              { id: 'revenue', label: 'Ingresos', icon: '💰' },
              { id: 'trends', label: 'Tendencias', icon: '📈' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  state.activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                role="tab"
                aria-selected={state.activeTab === tab.id}
              >
                <span className="mr-2" aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {state.loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-600">Actualizando estadísticas...</p>
          </div>
        )}

        {/* Overview Tab */}
        {state.activeTab === 'overview' && state.statistics && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Partidos Totales</p>
                      <p className="text-2xl font-bold text-primary">{state.statistics.total_games}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">⚽</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-neutral-600">
                      {getTimeRangeLabel()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Jugadores Únicos</p>
                      <p className="text-2xl font-bold text-primary">{state.statistics.unique_players}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-success">
                      Promedio: {state.statistics.average_players_per_game.toFixed(1)} por partido
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(state.statistics.total_revenue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-neutral-600">
                      Por partido: {formatCurrency(state.statistics.total_games > 0 ? state.statistics.total_revenue / state.statistics.total_games : 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600">Pagos Pendientes</p>
                      <p className="text-2xl font-bold text-warning">
                        {formatCurrency(state.statistics.pending_payments)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">⏳</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="warning" size="sm">
                      Requiere seguimiento
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Game Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estado de Partidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Completados</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-neutral-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-success"
                            style={{ width: `${(state.statistics.completed_games / state.statistics.total_games) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">{state.statistics.completed_games}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Cancelados</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-neutral-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-error"
                            style={{ width: `${(state.statistics.cancelled_games / state.statistics.total_games) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">{state.statistics.cancelled_games}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Otros</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-neutral-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-neutral-500"
                            style={{ width: `${((state.statistics.total_games - state.statistics.completed_games - state.statistics.cancelled_games) / state.statistics.total_games) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">
                          {state.statistics.total_games - state.statistics.completed_games - state.statistics.cancelled_games}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Tasa de finalización:</span>
                      <span className="font-semibold text-success">
                        {state.statistics.total_games > 0 
                          ? Math.round((state.statistics.completed_games / state.statistics.total_games) * 100)
                          : 0}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Tasa de cancelación:</span>
                      <span className="font-semibold text-error">
                        {state.statistics.total_games > 0 
                          ? Math.round((state.statistics.cancelled_games / state.statistics.total_games) * 100)
                          : 0}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Ingreso promedio:</span>
                      <span className="font-semibold">
                        {formatCurrency(state.statistics.completed_games > 0 
                          ? state.statistics.total_revenue / state.statistics.completed_games 
                          : 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Participación promedio:</span>
                      <span className="font-semibold">
                        {state.statistics.average_players_per_game.toFixed(1)} jugadores
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {state.activeTab === 'players' && (
          <PlayerAnalytics 
            data={state.playerAnalytics}
            timeRange={state.timeRange}
            onRefresh={fetchAnalytics}
          />
        )}

        {/* Revenue Tab */}
        {state.activeTab === 'revenue' && state.statistics && (
          <RevenueAnalytics
            statistics={state.statistics}
            timeRange={state.timeRange}
            dashboardData={state.dashboardData}
          />
        )}

        {/* Trends Tab */}
        {state.activeTab === 'trends' && state.statistics && (
          <GameTrends
            statistics={state.statistics}
            timeRange={state.timeRange}
            onRefresh={fetchAnalytics}
          />
        )}
      </div>
    </div>
  );
}