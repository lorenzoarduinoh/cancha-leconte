'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner, InlineLoadingSpinner } from '../ui/LoadingSpinner';
import { 
  GameRegistration, 
  PAYMENT_STATUS_LABELS,
  PaymentStatus 
} from '../../../lib/types/game';

export interface PaymentTrackerProps {
  gameId: string;
  registrations?: GameRegistration[];
  detailed?: boolean;
  className?: string;
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

export function PaymentTracker({
  gameId,
  registrations,
  detailed = false,
  className = ''
}: PaymentTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [loading, setLoading] = useState(false);

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
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    const regs = registrations || [];
    return regs.filter(reg => {
      const matchesSearch = reg.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           reg.player_phone.includes(searchTerm);
      const matchesStatus = !statusFilter || reg.payment_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [registrations, searchTerm, statusFilter]);

  // Handle bulk payment status update
  const handleBulkPaymentUpdate = async (status: PaymentStatus) => {
    const selectedRegistrations = filteredRegistrations.filter(reg => 
      reg.payment_status !== status && reg.payment_status !== 'refunded'
    );

    if (selectedRegistrations.length === 0) {
      alert('No hay jugadores para actualizar con este estado');
      return;
    }

    const confirmation = confirm(
      `¿Marcar como "${PAYMENT_STATUS_LABELS[status]}" a ${selectedRegistrations.length} jugador${selectedRegistrations.length > 1 ? 'es' : ''}?`
    );

    if (!confirmation) return;

    setLoading(true);

    try {
      const updatePromises = selectedRegistrations.map(reg =>
        fetch(`/api/admin/games/${gameId}/registrations/${reg.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            payment_status: status,
            paid_at: status === 'paid' ? new Date().toISOString() : null,
          }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const failedUpdates = responses.filter(res => !res.ok);

      if (failedUpdates.length > 0) {
        alert(`Error al actualizar ${failedUpdates.length} pagos. Algunos pueden haberse actualizado correctamente.`);
      } else {
        alert(`${selectedRegistrations.length} pagos actualizados exitosamente.`);
      }

      // Refresh would be handled by parent component
      window.location.reload();
    } catch (error) {
      alert('Error al actualizar pagos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const statusFilterOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'paid', label: 'Pagados' },
    { value: 'failed', label: 'Fallidos' },
    { value: 'refunded', label: 'Reembolsados' },
  ];

  // Show loading state when loading payment data
  if (loading && detailed) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <span className="text-neutral-600">Cargando estado de pagos...</span>
      </div>
    );
  }

  if (!detailed) {
    // Simple payment overview
    return (
      <div className={className}>
        <div className="space-y-4">
          {/* Payment Rate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Tasa de pago:</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-neutral-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-success"
                  style={{ width: `${paymentStats.paymentRate}%` }}
                />
              </div>
              <span className="text-sm font-medium">{paymentStats.paymentRate}%</span>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Recaudado:</span>
              <span className="font-medium text-success">
                {formatCurrency(paymentStats.paidAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Pendiente:</span>
              <span className="font-medium text-warning">
                {formatCurrency(paymentStats.pendingAmount)}
              </span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {paymentStats.paid > 0 && (
              <Badge variant="success" size="sm">
                {paymentStats.paid} Pagado{paymentStats.paid > 1 ? 's' : ''}
              </Badge>
            )}
            {paymentStats.pending > 0 && (
              <Badge variant="warning" size="sm">
                {paymentStats.pending} Pendiente{paymentStats.pending > 1 ? 's' : ''}
              </Badge>
            )}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Tasa de Pago</p>
                <p className="text-2xl font-bold text-primary">{paymentStats.paymentRate}%</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
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
                <span className="text-2xl">💰</span>
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
                <span className="text-2xl">⏳</span>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mt-1">
              {paymentStats.pending} jugadores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
                options={statusFilterOptions}
                className="w-full sm:w-48"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleBulkPaymentUpdate('paid')}
                disabled={loading}
                className="flex-1 md:flex-none flex items-center gap-2"
              >
                {loading ? <InlineLoadingSpinner size="sm" /> : null}
                Marcar Pagados
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => handleBulkPaymentUpdate('pending')}
                disabled={loading}
                className="flex-1 md:flex-none flex items-center gap-2"
              >
                {loading ? <InlineLoadingSpinner size="sm" /> : null}
                Marcar Pendientes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos Detallados ({filteredRegistrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRegistrations.map((registration) => (
              <div 
                key={registration.id} 
                className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {registration.player_name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-neutral-900">
                      {registration.player_name}
                    </h4>
                    <p className="text-sm text-neutral-600">
                      {registration.player_phone}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-neutral-600">
                        Registrado: {formatDate(registration.registered_at)}
                      </span>
                      {registration.paid_at && (
                        <span className="text-sm text-success">
                          • Pagado: {formatDate(registration.paid_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getPaymentStatusVariant(registration.payment_status)} size="sm">
                      {PAYMENT_STATUS_LABELS[registration.payment_status]}
                    </Badge>
                  </div>
                  
                  {registration.payment_amount && (
                    <div className="text-lg font-semibold text-neutral-900">
                      {formatCurrency(registration.payment_amount)}
                    </div>
                  )}
                  
                  {registration.payment_id && (
                    <div className="text-xs text-neutral-500 font-mono">
                      ID: {registration.payment_id}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredRegistrations.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4" aria-hidden="true">🔍</div>
                <h3 className="text-lg font-semibold mb-2">No se encontraron pagos</h3>
                <p className="text-neutral-600">
                  {(registrations || []).length === 0 
                    ? 'No hay jugadores registrados aún.'
                    : 'Intenta ajustar los filtros de búsqueda.'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const data = filteredRegistrations.map(reg => ({
                  nombre: reg.player_name,
                  telefono: reg.player_phone,
                  estado: PAYMENT_STATUS_LABELS[reg.payment_status],
                  monto: reg.payment_amount || 0,
                  fecha_registro: formatDate(reg.registered_at),
                  fecha_pago: reg.paid_at ? formatDate(reg.paid_at) : '',
                }));
                
                const csv = [
                  Object.keys(data[0]).join(','),
                  ...data.map(row => Object.values(row).join(','))
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pagos-partido-${new Date().toISOString().split('T')[0]}.csv`;
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}