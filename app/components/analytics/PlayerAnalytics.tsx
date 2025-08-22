'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { PlayerAnalytics as PlayerAnalyticsType } from '../../../lib/types/game';

export interface PlayerAnalyticsProps {
  data: PlayerAnalyticsType[];
  timeRange: string;
  onRefresh?: () => void;
}

export function PlayerAnalytics({ data, timeRange, onRefresh }: PlayerAnalyticsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total_games' | 'payment_reliability' | 'total_paid'>('total_games');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 90) return 'success';
    if (reliability >= 70) return 'warning';
    return 'error';
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(player =>
      player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.player_phone.includes(searchTerm)
    );

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data, searchTerm, sortBy, sortDirection]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (data.length === 0) return null;

    const totalPlayers = data.length;
    const totalGames = data.reduce((sum, player) => sum + player.total_games, 0);
    const totalRevenue = data.reduce((sum, player) => sum + player.total_paid, 0);
    const avgReliability = data.reduce((sum, player) => sum + player.payment_reliability, 0) / totalPlayers;
    const activePlayers = data.filter(player => player.total_games > 0).length;

    return {
      totalPlayers,
      activePlayers,
      avgGamesPerPlayer: totalGames / totalPlayers,
      totalRevenue,
      avgReliability,
      avgRevenuePerPlayer: totalRevenue / totalPlayers,
    };
  }, [data]);

  const sortOptions = [
    { value: 'total_games', label: 'Partidos jugados' },
    { value: 'payment_reliability', label: 'Confiabilidad de pago' },
    { value: 'total_paid', label: 'Total pagado' },
  ];

  if (data.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <div className="text-6xl mb-4" aria-hidden="true">👥</div>
          <h3 className="text-xl font-semibold mb-2">Sin datos de jugadores</h3>
          <p className="text-neutral-600 mb-4">
            No hay información de jugadores para el periodo seleccionado.
          </p>
          <Button onClick={onRefresh} variant="primary">
            Actualizar Datos
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Total Jugadores</p>
                  <p className="text-2xl font-bold text-primary">{summaryStats.totalPlayers}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-neutral-600">
                  {summaryStats.activePlayers} activos
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Confiabilidad Promedio</p>
                  <p className="text-2xl font-bold text-success">{summaryStats.avgReliability.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💯</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-success"
                    style={{ width: `${summaryStats.avgReliability}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Ingresos por Jugador</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(summaryStats.avgRevenuePerPlayer)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-neutral-600">
                  Total: {formatCurrency(summaryStats.totalRevenue)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Partidos por Jugador</p>
                  <p className="text-2xl font-bold text-primary">
                    {summaryStats.avgGamesPerPlayer.toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚽</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-neutral-600">
                  Promedio del periodo
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <div className="flex gap-2 w-full md:w-auto">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                options={sortOptions}
                className="flex-1 md:w-48"
              />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            <Badge variant="secondary" className="whitespace-nowrap">
              {filteredAndSortedData.length} jugadores
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Players List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAndSortedData.map((player) => (
          <Card key={`${player.player_name}-${player.player_phone}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                  {getInitials(player.player_name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg text-neutral-900 truncate">
                    {player.player_name}
                  </h4>
                  <p className="text-sm text-neutral-600 truncate">
                    {player.player_phone}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getReliabilityColor(player.payment_reliability)} size="sm">
                      {player.payment_reliability.toFixed(0)}% confiable
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Partidos jugados:</span>
                  <span className="font-semibold">{player.total_games}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Partidos pagados:</span>
                  <span className="font-semibold text-success">{player.paid_games}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Pagos pendientes:</span>
                  <span className={`font-semibold ${player.pending_payments > 0 ? 'text-warning' : 'text-neutral-900'}`}>
                    {player.pending_payments}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Total pagado:</span>
                  <span className="font-semibold text-success">
                    {formatCurrency(player.total_paid)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Último partido:</span>
                  <span className="text-sm">
                    {formatDate(player.last_game_date)}
                  </span>
                </div>
              </div>

              {/* Payment Reliability Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-neutral-600">Confiabilidad</span>
                  <span className="text-xs font-medium">{player.payment_reliability.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      player.payment_reliability >= 90 ? 'bg-success' :
                      player.payment_reliability >= 70 ? 'bg-warning' : 'bg-error'
                    }`}
                    style={{ width: `${player.payment_reliability}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Could open a modal with player details
                      alert(`Detalles completos de ${player.player_name}`);
                    }}
                    className="flex-1"
                  >
                    Ver Detalles
                  </Button>
                  
                  {player.pending_payments > 0 && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => {
                        // Could send payment reminder
                        alert(`Enviar recordatorio de pago a ${player.player_name}`);
                      }}
                      className="flex-1"
                    >
                      Recordar Pago
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredAndSortedData.length === 0 && searchTerm && (
        <Card className="text-center py-8">
          <CardContent>
            <div className="text-4xl mb-4" aria-hidden="true">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No se encontraron jugadores</h3>
            <p className="text-neutral-600 mb-4">
              No hay jugadores que coincidan con la búsqueda "{searchTerm}"
            </p>
            <Button
              variant="ghost"
              onClick={() => setSearchTerm('')}
            >
              Limpiar búsqueda
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Export Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const data = filteredAndSortedData.map(player => ({
                  nombre: player.player_name,
                  telefono: player.player_phone,
                  total_partidos: player.total_games,
                  partidos_pagados: player.paid_games,
                  pagos_pendientes: player.pending_payments,
                  total_pagado: player.total_paid,
                  confiabilidad_pago: player.payment_reliability.toFixed(1) + '%',
                  ultimo_partido: formatDate(player.last_game_date),
                }));
                
                const csv = [
                  Object.keys(data[0]).join(','),
                  ...data.map(row => Object.values(row).join(','))
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `jugadores-analytics-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="flex-1 sm:flex-none"
            >
              📊 Exportar CSV
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.print()}
              className="flex-1 sm:flex-none"
            >
              🖨️ Imprimir
            </Button>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onRefresh}
              className="flex-1 sm:flex-none"
            >
              🔄 Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}