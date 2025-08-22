'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
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
  selectedRegistration: GameRegistration | null;
  showPaymentModal: boolean;
  paymentLoading: boolean;
}

export function PlayerRegistrations({
  gameId,
  registrations,
  gameStatus,
  onRegistrationUpdate
}: PlayerRegistrationsProps) {
  const [state, setState] = useState<RegistrationState>({
    loading: false,
    searchTerm: '',
    selectedRegistration: null,
    showPaymentModal: false,
    paymentLoading: false,
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

  // Filter registrations based on search term
  const regs = registrations || [];
  const filteredRegistrations = regs.filter(reg =>
    reg.player_name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    reg.player_phone.includes(state.searchTerm)
  );

  // Group registrations by payment status
  const groupedRegistrations = {
    paid: filteredRegistrations.filter(r => r.payment_status === 'paid'),
    pending: filteredRegistrations.filter(r => r.payment_status === 'pending'),
    failed: filteredRegistrations.filter(r => r.payment_status === 'failed'),
    refunded: filteredRegistrations.filter(r => r.payment_status === 'refunded'),
  };

  // Handle payment status update
  const handleUpdatePaymentStatus = async (registrationId: string, newStatus: PaymentStatus) => {
    setState(prev => ({ ...prev, paymentLoading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          payment_status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
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
        paymentLoading: false,
        showPaymentModal: false,
        selectedRegistration: null 
      }));
    }
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
          <div className="text-6xl mb-4" aria-hidden="true">👥</div>
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
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="flex-1"
            />
            
            <div className="flex gap-2 text-sm">
              <Badge variant="success">{groupedRegistrations.paid.length} Pagado</Badge>
              <Badge variant="warning">{groupedRegistrations.pending.length} Pendiente</Badge>
              <Badge variant="error">{groupedRegistrations.failed.length} Fallido</Badge>
              {groupedRegistrations.refunded.length > 0 && (
                <Badge variant="neutral">{groupedRegistrations.refunded.length} Reembolsado</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRegistrations.map((registration) => (
          <Card key={registration.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                    {getInitials(registration.player_name)}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg text-neutral-900">
                      {registration.player_name}
                    </h4>
                    <p className="text-neutral-600">
                      {registration.player_phone}
                    </p>
                    {registration.team_assignment && (
                      <Badge variant="info" size="sm" className="mt-1">
                        {registration.team_assignment === 'team_a' ? 'Equipo A' : 'Equipo B'}
                      </Badge>
                    )}
                  </div>
                </div>

                <Badge variant={getPaymentStatusVariant(registration.payment_status)}>
                  {PAYMENT_STATUS_LABELS[registration.payment_status]}
                </Badge>
              </div>

              {/* Registration Details */}
              <div className="space-y-2 text-sm text-neutral-600 mb-4">
                <div className="flex justify-between">
                  <span>Registrado:</span>
                  <span>{formatDate(registration.registered_at)}</span>
                </div>
                
                {registration.payment_amount && (
                  <div className="flex justify-between">
                    <span>Monto:</span>
                    <span className="font-medium">{formatCurrency(registration.payment_amount)}</span>
                  </div>
                )}
                
                {registration.paid_at && (
                  <div className="flex justify-between">
                    <span>Pagado:</span>
                    <span className="text-success">{formatDate(registration.paid_at)}</span>
                  </div>
                )}
                
                {registration.payment_id && (
                  <div className="flex justify-between">
                    <span>ID Pago:</span>
                    <span className="font-mono text-xs">{registration.payment_id}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {registration.payment_status === 'pending' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleUpdatePaymentStatus(registration.id, 'paid')}
                    disabled={state.paymentLoading}
                  >
                    Marcar Pagado
                  </Button>
                )}
                
                {registration.payment_status === 'paid' && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleUpdatePaymentStatus(registration.id, 'refunded')}
                    disabled={state.paymentLoading}
                  >
                    Reembolsar
                  </Button>
                )}
                
                {registration.payment_status === 'failed' && (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleUpdatePaymentStatus(registration.id, 'paid')}
                      disabled={state.paymentLoading}
                    >
                      Marcar Pagado
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdatePaymentStatus(registration.id, 'pending')}
                      disabled={state.paymentLoading}
                    >
                      Reintentar
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    selectedRegistration: registration,
                    showPaymentModal: true 
                  }))}
                >
                  Gestionar
                </Button>

                {gameStatus !== 'completed' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemovePlayer(registration.id)}
                    disabled={state.loading}
                    className="ml-auto"
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredRegistrations.length === 0 && regs.length > 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <div className="text-4xl mb-4" aria-hidden="true">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No se encontraron jugadores</h3>
            <p className="text-neutral-600 mb-4">
              No hay jugadores que coincidan con la búsqueda "{state.searchTerm}"
            </p>
            <Button
              variant="ghost"
              onClick={() => setState(prev => ({ ...prev, searchTerm: '' }))}
            >
              Limpiar búsqueda
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Management Modal */}
      {state.showPaymentModal && state.selectedRegistration && (
        <Modal
          isOpen={state.showPaymentModal}
          onClose={() => setState(prev => ({ ...prev, showPaymentModal: false, selectedRegistration: null }))}
          title={`Gestionar Pago - ${state.selectedRegistration.player_name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-neutral-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Información del Jugador</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Nombre:</span>
                  <span>{state.selectedRegistration.player_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Teléfono:</span>
                  <span>{state.selectedRegistration.player_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado actual:</span>
                  <Badge variant={getPaymentStatusVariant(state.selectedRegistration.payment_status)} size="sm">
                    {PAYMENT_STATUS_LABELS[state.selectedRegistration.payment_status]}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="success"
                onClick={() => handleUpdatePaymentStatus(state.selectedRegistration!.id, 'paid')}
                loading={state.paymentLoading}
                disabled={state.selectedRegistration.payment_status === 'paid'}
              >
                Marcar Pagado
              </Button>
              <Button
                variant="warning"
                onClick={() => handleUpdatePaymentStatus(state.selectedRegistration!.id, 'pending')}
                loading={state.paymentLoading}
                disabled={state.selectedRegistration.payment_status === 'pending'}
              >
                Marcar Pendiente
              </Button>
              <Button
                variant="error"
                onClick={() => handleUpdatePaymentStatus(state.selectedRegistration!.id, 'failed')}
                loading={state.paymentLoading}
                disabled={state.selectedRegistration.payment_status === 'failed'}
              >
                Marcar Fallido
              </Button>
              <Button
                variant="neutral"
                onClick={() => handleUpdatePaymentStatus(state.selectedRegistration!.id, 'refunded')}
                loading={state.paymentLoading}
                disabled={state.selectedRegistration.payment_status === 'refunded'}
              >
                Reembolsar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}