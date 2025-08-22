'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GameStatistics } from '../../../lib/types/game';

export interface GameTrendsProps {
  statistics: GameStatistics;
  timeRange: string;
  onRefresh?: () => void;
}

export function GameTrends({ statistics, timeRange, onRefresh }: GameTrendsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'última semana';
      case 'month': return 'último mes';
      case 'quarter': return 'últimos 3 meses';
      case 'year': return 'último año';
      case 'all': return 'histórico';
      default: return 'periodo seleccionado';
    }
  };

  // Calculate trend metrics
  const completionRate = statistics.total_games > 0 
    ? (statistics.completed_games / statistics.total_games) * 100 
    : 0;

  const cancellationRate = statistics.total_games > 0 
    ? (statistics.cancelled_games / statistics.total_games) * 100 
    : 0;

  const collectionRate = statistics.total_revenue > 0 
    ? ((statistics.total_revenue - statistics.pending_payments) / statistics.total_revenue) * 100
    : 0;

  const avgRevenuePerGame = statistics.completed_games > 0 
    ? statistics.total_revenue / statistics.completed_games 
    : 0;

  // Generate insights and recommendations
  const generateInsights = () => {
    const insights = [];

    if (completionRate >= 90) {
      insights.push({
        type: 'success',
        title: 'Excelente tasa de finalización',
        description: `${completionRate.toFixed(1)}% de los partidos se completan exitosamente.`,
        recommendation: 'Mantén las buenas prácticas actuales.'
      });
    } else if (completionRate < 70) {
      insights.push({
        type: 'warning',
        title: 'Baja tasa de finalización',
        description: `Solo ${completionRate.toFixed(1)}% de los partidos se completan.`,
        recommendation: 'Analiza las causas de cancelación y mejora la planificación.'
      });
    }

    if (cancellationRate > 15) {
      insights.push({
        type: 'error',
        title: 'Alta tasa de cancelación',
        description: `${cancellationRate.toFixed(1)}% de los partidos se cancelan.`,
        recommendation: 'Implementa políticas de confirmación más estrictas.'
      });
    }

    if (collectionRate >= 85) {
      insights.push({
        type: 'success',
        title: 'Excelente cobranza',
        description: `${collectionRate.toFixed(1)}% de tasa de cobranza.`,
        recommendation: 'Buen trabajo en el seguimiento de pagos.'
      });
    } else if (collectionRate < 70) {
      insights.push({
        type: 'warning',
        title: 'Cobranza mejorable',
        description: `${collectionRate.toFixed(1)}% de tasa de cobranza.`,
        recommendation: 'Implementa recordatorios automáticos de pago.'
      });
    }

    if (statistics.average_players_per_game >= 16) {
      insights.push({
        type: 'success',
        title: 'Buena participación',
        description: `Promedio de ${statistics.average_players_per_game.toFixed(1)} jugadores por partido.`,
        recommendation: 'Considera aumentar la capacidad de algunos partidos.'
      });
    } else if (statistics.average_players_per_game < 12) {
      insights.push({
        type: 'info',
        title: 'Participación baja',
        description: `Promedio de ${statistics.average_players_per_game.toFixed(1)} jugadores por partido.`,
        recommendation: 'Mejora la promoción y comunicación de los partidos.'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-6">
      {/* Trend Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Tasa de Finalización</p>
                <p className="text-2xl font-bold text-primary">{completionRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-primary"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-2">
              <span className="text-sm text-neutral-600">
                {statistics.completed_games} de {statistics.total_games}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Tasa de Cancelación</p>
                <p className="text-2xl font-bold text-error">{cancellationRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚫</span>
              </div>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-error"
                style={{ width: `${cancellationRate}%` }}
              />
            </div>
            <div className="mt-2">
              <span className="text-sm text-neutral-600">
                {statistics.cancelled_games} de {statistics.total_games}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Tasa de Cobranza</p>
                <p className="text-2xl font-bold text-success">{collectionRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-success"
                style={{ width: `${collectionRate}%` }}
              />
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Participación Media</p>
                <p className="text-2xl font-bold text-info">{statistics.average_players_per_game.toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-neutral-600">
                jugadores por partido
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Rendimiento ({getTimeRangeLabel()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - Metrics */}
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-4">Métricas Clave</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Total de partidos:</span>
                    <span className="font-semibold">{statistics.total_games}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Partidos completados:</span>
                    <span className="font-semibold text-success">{statistics.completed_games}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Partidos cancelados:</span>
                    <span className="font-semibold text-error">{statistics.cancelled_games}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Jugadores únicos:</span>
                    <span className="font-semibold">{statistics.unique_players}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Total de registraciones:</span>
                    <span className="font-semibold">{statistics.total_players}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-4">Métricas Financieras</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Ingresos totales:</span>
                    <span className="font-semibold text-success">
                      {formatCurrency(statistics.total_revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Pagos pendientes:</span>
                    <span className="font-semibold text-warning">
                      {formatCurrency(statistics.pending_payments)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Ingreso por partido:</span>
                    <span className="font-semibold">
                      {formatCurrency(avgRevenuePerGame)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Trends */}
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-4">Tendencias de Rendimiento</h4>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-neutral-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Eficiencia Operativa</span>
                      <Badge variant={completionRate >= 80 ? 'success' : 'warning'}>
                        {completionRate >= 80 ? 'Alta' : 'Media'}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-600">
                      {completionRate.toFixed(1)}% de partidos completados exitosamente
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-neutral-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Engagement de Jugadores</span>
                      <Badge variant={statistics.average_players_per_game >= 15 ? 'success' : 'info'}>
                        {statistics.average_players_per_game >= 15 ? 'Alto' : 'Moderado'}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-600">
                      {statistics.average_players_per_game.toFixed(1)} jugadores promedio por partido
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-neutral-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Salud Financiera</span>
                      <Badge variant={collectionRate >= 80 ? 'success' : 'warning'}>
                        {collectionRate >= 80 ? 'Saludable' : 'Atención'}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-600">
                      {collectionRate.toFixed(1)}% de tasa de cobranza
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Insights y Recomendaciones</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
            >
              🔄 Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'success' ? 'bg-success/5 border-success' :
                    insight.type === 'warning' ? 'bg-warning/5 border-warning' :
                    insight.type === 'error' ? 'bg-error/5 border-error' :
                    'bg-info/5 border-info'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                      insight.type === 'success' ? 'bg-success text-white' :
                      insight.type === 'warning' ? 'bg-warning text-white' :
                      insight.type === 'error' ? 'bg-error text-white' :
                      'bg-info text-white'
                    }`}>
                      {insight.type === 'success' ? '✓' :
                       insight.type === 'warning' ? '⚠' :
                       insight.type === 'error' ? '✕' : 'i'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{insight.title}</h4>
                      <p className="text-sm text-neutral-600 mb-2">{insight.description}</p>
                      <p className="text-sm font-medium text-neutral-800">
                        💡 {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4" aria-hidden="true">📈</div>
              <h3 className="text-lg font-semibold mb-2">Análisis en progreso</h3>
              <p className="text-neutral-600">
                Genera más datos para obtener insights personalizados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Sugeridas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collectionRate < 80 && (
              <Button 
                variant="warning" 
                className="justify-start h-auto p-4"
                onClick={() => alert('Función de recordatorios de pago próximamente')}
              >
                <div className="text-left">
                  <div className="font-semibold">Mejorar Cobranza</div>
                  <div className="text-sm opacity-80">Enviar recordatorios de pago</div>
                </div>
              </Button>
            )}
            
            {cancellationRate > 10 && (
              <Button 
                variant="error" 
                className="justify-start h-auto p-4"
                onClick={() => alert('Análisis de cancelaciones próximamente')}
              >
                <div className="text-left">
                  <div className="font-semibold">Reducir Cancelaciones</div>
                  <div className="text-sm opacity-80">Analizar patrones de cancelación</div>
                </div>
              </Button>
            )}
            
            {statistics.average_players_per_game < 15 && (
              <Button 
                variant="info" 
                className="justify-start h-auto p-4"
                onClick={() => alert('Herramientas de promoción próximamente')}
              >
                <div className="text-left">
                  <div className="font-semibold">Aumentar Participación</div>
                  <div className="text-sm opacity-80">Mejorar promoción de partidos</div>
                </div>
              </Button>
            )}
            
            <Button 
              variant="secondary" 
              className="justify-start h-auto p-4"
              onClick={() => alert('Exportación de reportes próximamente')}
            >
              <div className="text-left">
                <div className="font-semibold">Generar Reporte</div>
                <div className="text-sm opacity-80">Exportar análisis detallado</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}