'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { GameStatistics, DashboardData } from '../../../lib/types/game';

export interface RevenueAnalyticsProps {
  statistics: GameStatistics;
  timeRange: string;
  dashboardData?: DashboardData | null;
}

export function RevenueAnalytics({ 
  statistics, 
  timeRange, 
  dashboardData 
}: RevenueAnalyticsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'esta semana';
      case 'month': return 'este mes';
      case 'quarter': return 'últimos 3 meses';
      case 'year': return 'este año';
      case 'all': return 'histórico';
      default: return 'periodo seleccionado';
    }
  };

  // Calculate revenue metrics
  const avgRevenuePerGame = statistics.completed_games > 0 
    ? statistics.total_revenue / statistics.completed_games 
    : 0;

  const avgRevenuePerPlayer = statistics.total_players > 0 
    ? statistics.total_revenue / statistics.total_players 
    : 0;

  const collectionRate = statistics.total_revenue > 0 
    ? ((statistics.total_revenue - statistics.pending_payments) / statistics.total_revenue) * 100
    : 0;

  const potentialRevenue = statistics.total_revenue + statistics.pending_payments;

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(statistics.total_revenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-neutral-600 capitalize">
                {getTimeRangeLabel()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Pendientes de Cobro</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(statistics.pending_payments)}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-warning"
                  style={{ 
                    width: potentialRevenue > 0 
                      ? `${(statistics.pending_payments / potentialRevenue) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Tasa de Cobranza</p>
                <p className="text-2xl font-bold text-primary">{collectionRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <div className="mt-2">
              <Badge 
                variant={collectionRate >= 80 ? 'success' : collectionRate >= 60 ? 'warning' : 'error'} 
                size="sm"
              >
                {collectionRate >= 80 ? 'Excelente' : collectionRate >= 60 ? 'Buena' : 'Mejorar'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Ingreso Promedio</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(avgRevenuePerGame)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚽</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-neutral-600">
                Por partido completado
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Ingresos cobrados:</span>
                <div className="text-right">
                  <span className="font-semibold text-success">
                    {formatCurrency(statistics.total_revenue)}
                  </span>
                  <div className="text-xs text-neutral-500">
                    {collectionRate.toFixed(1)}% del total
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Pagos pendientes:</span>
                <div className="text-right">
                  <span className="font-semibold text-warning">
                    {formatCurrency(statistics.pending_payments)}
                  </span>
                  <div className="text-xs text-neutral-500">
                    {potentialRevenue > 0 
                      ? ((statistics.pending_payments / potentialRevenue) * 100).toFixed(1)
                      : 0}% del total
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-semibold">Ingresos potenciales:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(potentialRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promedios por Unidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Ingreso por partido:</span>
                <span className="font-semibold">
                  {formatCurrency(avgRevenuePerGame)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Ingreso por jugador:</span>
                <span className="font-semibold">
                  {formatCurrency(avgRevenuePerPlayer)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Jugadores por partido:</span>
                <span className="font-semibold">
                  {statistics.average_players_per_game.toFixed(1)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Tasa de finalización:</span>
                <span className="font-semibold">
                  {statistics.total_games > 0 
                    ? ((statistics.completed_games / statistics.total_games) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue (if available) */}
      {dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos del Mes Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-success mb-2">
                  {formatCurrency(dashboardData.total_revenue_this_month || 0)}
                </div>
                <div className="text-sm text-neutral-600">
                  Ingresos este mes
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {dashboardData.quick_stats?.total_games_this_week || 0}
                </div>
                <div className="text-sm text-neutral-600">
                  Partidos esta semana
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-info mb-2">
                  {Math.round(dashboardData.quick_stats?.payment_completion_rate || 0)}%
                </div>
                <div className="text-sm text-neutral-600">
                  Tasa de pago actual
                </div>
              </div>
            </div>

            {dashboardData.payment_alerts && dashboardData.payment_alerts.length > 0 && (
              <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <h4 className="font-semibold text-warning mb-2">
                  Alertas de Pago ({dashboardData.payment_alerts.length})
                </h4>
                <div className="space-y-2">
                  {dashboardData.payment_alerts.slice(0, 3).map((alert, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{alert.player_name}</span>
                      <span className="font-medium">
                        {formatCurrency(alert.amount_due)} ({alert.days_overdue}d)
                      </span>
                    </div>
                  ))}
                  {dashboardData.payment_alerts.length > 3 && (
                    <div className="text-xs text-warning">
                      +{dashboardData.payment_alerts.length - 3} alertas más
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Projections */}
      <Card>
        <CardHeader>
          <CardTitle>Proyecciones y Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Si se cobran todos los pendientes:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Ingresos totales:</span>
                  <span className="font-semibold text-success">
                    {formatCurrency(potentialRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Incremento:</span>
                  <span className="font-semibold text-primary">
                    +{statistics.total_revenue > 0 
                      ? ((statistics.pending_payments / statistics.total_revenue) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Nuevo promedio por partido:</span>
                  <span className="font-semibold">
                    {formatCurrency(statistics.completed_games > 0 
                      ? potentialRevenue / statistics.completed_games 
                      : 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Oportunidades de mejora:</h4>
              <div className="space-y-3">
                {collectionRate < 80 && (
                  <div className="flex items-center gap-2">
                    <span className="text-warning">⚠️</span>
                    <span className="text-sm">Mejorar tasa de cobranza</span>
                  </div>
                )}
                {statistics.cancelled_games > statistics.completed_games * 0.1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-error">🚫</span>
                    <span className="text-sm">Reducir cancelaciones</span>
                  </div>
                )}
                {statistics.average_players_per_game < 15 && (
                  <div className="flex items-center gap-2">
                    <span className="text-info">👥</span>
                    <span className="text-sm">Aumentar participación</span>
                  </div>
                )}
                {collectionRate >= 80 && statistics.cancelled_games <= statistics.completed_games * 0.1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-success">✅</span>
                    <span className="text-sm">Operación eficiente</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}