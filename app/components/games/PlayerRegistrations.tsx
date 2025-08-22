'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { XIcon, PercentIcon, DollarSignIcon, ClockIcon } from '../ui/Icons';
import { 
  GameRegistration, 
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
  GameStatus 
} from '../../../lib/types/game';

export interface PlayerRegistrationsProps {
  gameId: string;
  registrations?: GameRegistration[];
  gameStatus: GameStatus;
  onRegistrationUpdate?: () => void;
}

interface RegistrationState {
  loading: boolean;
  searchTerm: string;
  paymentLoading: boolean;
}

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentRate: number;
}

export function PlayerRegistrations({
  gameId,
  registrations,
  gameStatus,
  onRegistrationUpdate
}: PlayerRegistrationsProps) {
  const [state, setState] = useState<RegistrationState & { paymentFilter: 'all' | 'paid' | 'pending' }>({
    loading: false,
    searchTerm: '',
    paymentLoading: false,
    paymentFilter: 'all',
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusVariant = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'neutral';
      default: return 'neutral';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate payment statistics
  const paymentStats = useMemo((): PaymentStats => {
    const regs = registrations || [];
    const stats = {
      total: regs.length,
      paid: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      paymentRate: 0,
    };

    regs.forEach(reg => {
      const amount = reg.payment_amount || 0;
      stats.totalAmount += amount;

      switch (reg.payment_status) {
        case 'paid':
          stats.paid++;
          stats.paidAmount += amount;
          break;
        case 'pending':
          stats.pending++;
          stats.pendingAmount += amount;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'refunded':
          stats.refunded++;
          break;
      }
    });

    stats.paymentRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

    return stats;
  }, [registrations]);

  // Filter registrations based on search term and payment filter
  const regs = registrations || [];
  const filteredRegistrations = regs.filter(reg => {
    const matchesSearch = reg.player_name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      reg.player_phone.includes(state.searchTerm);
    
    const matchesPaymentFilter = state.paymentFilter === 'all' || 
      (state.paymentFilter === 'paid' && reg.payment_status === 'paid') ||
      (state.paymentFilter === 'pending' && reg.payment_status === 'pending');
    
    return matchesSearch && matchesPaymentFilter;
  });

  // Get context-aware title and messages
  const getFilteredTitle = () => {
    switch (state.paymentFilter) {
      case 'paid':
        return `Jugadores Pagados (${filteredRegistrations.length})`;
      case 'pending':
        return `Jugadores Pendientes (${filteredRegistrations.length})`;
      default:
        return `Jugadores Registrados (${filteredRegistrations.length})`;
    }
  };

  const getEmptyStateMessage = () => {
    if (state.searchTerm) {
      // When searching, show search-specific messages
      const searchContext = state.paymentFilter === 'all' ? 'jugadores' :
        state.paymentFilter === 'paid' ? 'jugadores pagados' : 'jugadores pendientes';
      
      return {
        title: `No se encontraron ${searchContext}`,
        description: `No hay ${searchContext} que coincidan con la búsqueda "${state.searchTerm}"`
      };
    } else {
      // When not searching, show filter-specific messages
      switch (state.paymentFilter) {
        case 'paid':
          return {
            title: 'No hay jugadores pagados',
            description: 'Aún no hay jugadores que hayan completado su pago.'
          };
        case 'pending':
          return {
            title: 'No hay jugadores pendientes',
            description: 'Todos los jugadores han completado su pago.'
          };
        default:
          return {
            title: 'No se encontraron jugadores',
            description: 'No hay jugadores que coincidan con los filtros seleccionados.'
          };
      }
    }
  };

  // Group registrations by payment status
  const groupedRegistrations = {
    paid: filteredRegistrations.filter(r => r.payment_status === 'paid'),
    pending: filteredRegistrations.filter(r => r.payment_status === 'pending'),
    failed: filteredRegistrations.filter(r => r.payment_status === 'failed'),
    refunded: filteredRegistrations.filter(r => r.payment_status === 'refunded'),
  };

  // Handle payment status update
  const handleMarkAsPaid = async (registrationId: string) => {
    setState(prev => ({ ...prev, paymentLoading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado de pago');
      }

      onRegistrationUpdate?.();
    } catch (error) {
      alert('Error al actualizar el pago: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setState(prev => ({ 
        ...prev, 
        paymentLoading: false
      }));
    }
  };

  const clearSearch = () => {
    setState(prev => ({ ...prev, searchTerm: '' }));
  };

  // Handle player removal
  const handleRemovePlayer = async (registrationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta registración?')) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/registrations/${registrationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la registración');
      }

      onRegistrationUpdate?.();
    } catch (error) {
      alert('Error al eliminar jugador: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  if (regs.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <h3 className="text-xl font-semibold mb-2">No hay jugadores registrados</h3>
          <p className="text-neutral-600">
            {gameStatus === 'draft' 
              ? 'Publica el partido para que los jugadores puedan registrarse.'
              : 'Los jugadores podrán registrarse una vez que el partido esté publicado.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Tasa de Pago</p>
                <p className="text-2xl font-bold text-primary">{paymentStats.paymentRate}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <PercentIcon size={24} className="text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${paymentStats.paymentRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Recaudado</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(paymentStats.paidAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <DollarSignIcon size={24} className="text-success" />
              </div>
            </div>
            <p className="text-sm text-neutral-600 mt-1">
              {paymentStats.paid} de {paymentStats.total} jugadores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Pendiente</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(paymentStats.pendingAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                <ClockIcon size={24} className="text-warning" />
              </div>
            </div>
            <p className="text-sm text-neutral-600 mt-1">
              {paymentStats.pending} jugadores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search Input */}
          <div className="relative flex items-center gap-3">
            <svg 
              className="w-4 h-4 text-neutral-400 flex-shrink-0"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="text-sm min-w-[280px] placeholder:text-neutral-400"
            />
            {state.searchTerm && (
              <button
                onClick={clearSearch}
                className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0 p-1 hover:bg-neutral-100 rounded-full"
                aria-label="Limpiar búsqueda"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={state.paymentFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setState(prev => ({ ...prev, paymentFilter: 'all' }))}
              className={`px-4 py-2 rounded-full font-medium ${
                state.paymentFilter === 'all' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Todos ({regs.length})
            </Button>
            <Button
              variant={state.paymentFilter === 'paid' ? 'success' : 'outline'}
              size="sm"
              onClick={() => setState(prev => ({ ...prev, paymentFilter: 'paid' }))}
              className={`px-4 py-2 rounded-full font-medium ${
                state.paymentFilter === 'paid' 
                  ? 'bg-success text-white shadow-md' 
                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Pagados ({paymentStats.paid})
            </Button>
            <Button
              variant={state.paymentFilter === 'pending' ? 'warning' : 'outline'}
              size="sm"
              onClick={() => setState(prev => ({ ...prev, paymentFilter: 'pending' }))}
              className={`px-4 py-2 rounded-full font-medium ${
                state.paymentFilter === 'pending' 
                  ? 'bg-warning text-white shadow-md' 
                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Pendientes ({paymentStats.pending})
            </Button>
          </div>
        </div>
        
        {/* Status Summary */}
        <div className="flex flex-wrap gap-2 text-sm">
          {paymentStats.failed > 0 && (
            <Badge variant="error" size="sm">
              {paymentStats.failed} Fallido{paymentStats.failed > 1 ? 's' : ''}
            </Badge>
          )}
          {paymentStats.refunded > 0 && (
            <Badge variant="neutral" size="sm">
              {paymentStats.refunded} Reembolsado{paymentStats.refunded > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle>{getFilteredTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRegistrations.map((registration) => (
              <div 
                key={registration.id} 
                className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                    {getInitials(registration.player_name)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-lg text-neutral-900">
                        {registration.player_name}
                      </h4>
                      {registration.team_assignment && (
                        <Badge variant="info" size="sm">
                          {registration.team_assignment === 'team_a' ? 'Equipo A' : 'Equipo B'}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-neutral-600 mb-2">
                      {registration.player_phone}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span>Registrado: {formatDate(registration.registered_at)}</span>
                      {registration.paid_at && (
                        <span className="text-success">
                          • Pagado: {formatDate(registration.paid_at)}
                        </span>
                      )}
                      {registration.payment_id && (
                        <span className="font-mono text-xs">
                          • ID: {registration.payment_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  {/* Payment Status */}
                  <div>
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className={`text-sm font-medium ${
                        registration.payment_status === 'paid' ? 'text-success' :
                        registration.payment_status === 'pending' ? 'text-warning' :
                        registration.payment_status === 'failed' ? 'text-error' :
                        'text-neutral-600'
                      }`}>
                        {PAYMENT_STATUS_LABELS[registration.payment_status]}
                      </span>
                    </div>
                    
                    {registration.payment_amount && (
                      <div className="text-lg font-semibold text-neutral-900">
                        {formatCurrency(registration.payment_amount)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {registration.payment_status !== 'paid' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleMarkAsPaid(registration.id)}
                        disabled={state.paymentLoading}
                      >
                        Marcar Pagado
                      </Button>
                    )}

                    {gameStatus !== 'completed' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemovePlayer(registration.id)}
                        disabled={state.loading}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredRegistrations.length === 0 && regs.length > 0 && (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">{getEmptyStateMessage().title}</h3>
                <p className="text-neutral-600 mb-4">
                  {getEmptyStateMessage().description}
                </p>
                {state.searchTerm && (
                  <Button
                    variant="ghost"
                    onClick={clearSearch}
                  >
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}