'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CancellationModal } from './CancellationModal';
import { LoadingState } from '../friend-registration/LoadingState';
import { ErrorState } from '../friend-registration/ErrorState';
import { 
  PersonalRegistrationDetailsView, 
  ApiResponse, 
  CancelRegistrationRequest,
  CancelRegistrationResponse 
} from '../../../lib/types/whatsapp';

// Type for the registration data used by this component
interface RegistrationData {
  id: string;
  player_name: string;
  player_phone: string;
  registration_status: 'confirmed' | 'waiting_list' | 'cancelled';
  waiting_list_position?: number;
  registered_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  game: {
    id: string;
    title: string;
    description?: string;
    game_date: string;
    location: string;
    field_cost_per_player: number;
    game_duration_minutes: number;
    current_players: number;
    max_players: number;
    min_players: number;
    status: string;
  };
}

// API Response type for personal registration
type PersonalRegistrationApiResponse = ApiResponse<RegistrationData>;

interface PersonalRegistrationInterfaceProps {
  token: string;
}

export function PersonalRegistrationInterface({ token }: PersonalRegistrationInterfaceProps) {
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState<{ message: string; refund_info?: any } | null>(null);

  // Fetch registration data
  const fetchRegistration = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/mi-registro/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          throw new Error('Registro no encontrado. El enlace puede haber expirado o no ser válido.');
        } else if (response.status === 403) {
          throw new Error('Acceso denegado. El enlace no es válido o ha expirado.');
        } else if (response.status === 429) {
          throw new Error('Demasiadas consultas. Espera un momento e intenta nuevamente.');
        }
        
        throw new Error(errorData.message || errorData.error || 'Error al cargar tu registro');
      }

      const data: PersonalRegistrationApiResponse = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.message || 'No se pudo cargar la información del registro');
      }
      
      setRegistration(data.data);
    } catch (err) {
      console.error('Error fetching registration:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Handle cancellation
  const handleCancellation = async (reason?: string) => {
    if (!registration) return;

    setIsCancelling(true);
    try {
      const requestBody: CancelRegistrationRequest = { 
        reason, 
        confirm: true 
      };
      
      const response = await fetch(`/api/mi-registro/${token}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('Demasiados intentos de cancelación. Intenta de nuevo más tarde.');
        } else if (response.status === 403) {
          throw new Error('Ya no es posible cancelar este registro. Es demasiado tarde para cancelar.');
        } else if (response.status === 404) {
          throw new Error('Registro no encontrado. El enlace puede haber expirado.');
        }
        
        throw new Error(errorData.message || errorData.error || 'Error al cancelar el registro');
      }

      // Show success message
      const successData: CancelRegistrationResponse = await response.json();
      
      setShowCancellationModal(false);
      setCancellationSuccess({
        message: successData.message || 'Tu registro ha sido cancelado exitosamente.',
        refund_info: successData.refund_info
      });
    } catch (err) {
      console.error('Error cancelling registration:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cancelar';
      
      // Show user-friendly error message
      alert(`❌ ${errorMessage}\n\nSi el problema persiste, contacta al organizador del partido.`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRegistration();
  }, [fetchRegistration]);

  // Loading state
  if (isLoading) {
    return <LoadingState message="Cargando tu registro..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState 
        error={error}
        onRetry={fetchRegistration}
        canGoBack={false}
      />
    );
  }

  // No registration found
  if (!registration) {
    return (
      <ErrorState 
        error="No se pudo cargar la información de tu registro"
        onRetry={fetchRegistration}
        canGoBack={false}
      />
    );
  }

  // Safely parse dates with validation
  const gameDate = registration.game.game_date ? new Date(registration.game.game_date) : new Date();
  const registrationDate = registration.registration.registered_at ? new Date(registration.registration.registered_at) : new Date();
  
  // Validate dates
  const isValidGameDate = !isNaN(gameDate.getTime());
  const isValidRegistrationDate = !isNaN(registrationDate.getTime());
  const isCancelled = false; // Cancelled registrations are deleted, not marked as refunded
  const isWaitingList = registration.status.is_waiting_list;
  const isConfirmed = registration.status.is_confirmed;

  // Check if cancellation is still allowed (from backend)
  const canCancel = registration.status.can_cancel;

  const getStatusBadge = () => {
    if (isCancelled) {
      return <Badge variant="error">Cancelado</Badge>;
    }
    if (isWaitingList) {
      return <Badge variant="warning">Lista de espera #{registration.status.waiting_list_position}</Badge>;
    }
    if (isConfirmed) {
      return <Badge variant="success">Confirmado</Badge>;
    }
    return null;
  };

  // If cancellation was successful, show only the success message
  if (cancellationSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg border border-neutral-200 shadow-lg p-8">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-6">✅</div>
                <h1 className="text-2xl font-bold text-green-800 mb-2">
                  Cancelación Confirmada
                </h1>
                <p className="text-green-700 mb-4">
                  {cancellationSuccess.message}
                </p>
                
                {cancellationSuccess.refund_info && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 text-sm font-medium mb-1">
                      💰 Reembolso: ${cancellationSuccess.refund_info.amount}
                    </p>
                    <p className="text-green-700 text-sm">
                      Via {cancellationSuccess.refund_info.method}
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      Tiempo estimado: {cancellationSuccess.refund_info.estimated_days} días
                    </p>
                  </div>
                )}
                
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.close();
                      }
                    }}
                    variant="primary"
                    className="w-full"
                  >
                    Cerrar página
                  </Button>
                  <Button
                    onClick={() => setCancellationSuccess(null)}
                    variant="secondary"
                    className="w-full"
                  >
                    Ver detalles del registro
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
              Mi Registro
            </h1>
            <div className="flex justify-center">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          
          {/* Registration Status */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-4">
              Estado de tu Registro
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Jugador:</span>
                <span className="font-medium">{registration.registration.player_name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Teléfono:</span>
                <span className="font-medium">{registration.registration.player_phone}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Registrado:</span>
                <span className="font-medium">
                  {isValidRegistrationDate 
                    ? format(registrationDate, "d/M/yyyy 'a las' HH:mm", { locale: es })
                    : 'Fecha no disponible'
                  }
                </span>
              </div>

              {isWaitingList && registration.status.waiting_list_position && (
                <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
                  <p className="text-warning-800 text-sm">
                    Estás en la posición <strong>#{registration.status.waiting_list_position}</strong> de la lista de espera. 
                    Te notificaremos por WhatsApp si se libera un lugar.
                  </p>
                </div>
              )}

              {isCancelled && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm mb-1">
                    <strong>Registro cancelado</strong>
                  </p>
                  {registration.registration.cancelled_at && (
                    <p className="text-red-700 text-xs">
                      {(() => {
                        const cancelledDate = new Date(registration.registration.cancelled_at);
                        return !isNaN(cancelledDate.getTime())
                          ? `Cancelado el ${format(cancelledDate, "d/M/yyyy 'a las' HH:mm", { locale: es })}`
                          : 'Cancelado';
                      })()}
                    </p>
                  )}
                  {registration.registration.cancellation_reason && (
                    <p className="text-red-700 text-xs mt-1">
                      Motivo: {registration.registration.cancellation_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Game Information */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-4">
              Información del Partido
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-neutral-900 mb-1">
                  {registration.game.title}
                </h3>
                {registration.game.description && (
                  <p className="text-neutral-600 text-sm">{registration.game.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <span className="text-neutral-600 text-sm block">Fecha y hora:</span>
                  <div className="font-medium">
                    <div>
                      {isValidGameDate 
                        ? format(gameDate, "EEEE d 'de' MMMM", { locale: es })
                        : 'Fecha no disponible'
                      }
                    </div>
                    <div className="text-sm sm:text-base">
                      {isValidGameDate 
                        ? `${format(gameDate, "HH:mm", { locale: es })} hs`
                        : 'Hora no disponible'
                      }
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-neutral-600 text-sm block">Ubicación:</span>
                  <span className="font-medium">{registration.game.location}</span>
                </div>
                
                <div>
                  <span className="text-neutral-600 text-sm block">Duración:</span>
                  <span className="font-medium">{registration.game.game_duration_minutes} minutos</span>
                </div>
                
                <div>
                  <span className="text-neutral-600 text-sm block">Costo:</span>
                  <span className="font-medium">${registration.game.field_cost_per_player}</span>
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <span className="text-primary-700 text-sm">Jugadores confirmados:</span>
                  <span className="text-primary-900 font-medium">
                    {registration.game.current_players}/{registration.game.max_players}
                  </span>
                </div>
                <div className="mt-1">
                  <div className="w-full bg-primary-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min(100, (registration.game.current_players / registration.game.max_players) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isCancelled && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-4">
                Acciones
              </h2>
              
              <div className="space-y-3">
                {canCancel ? (
                  <>
                    <Button
                      onClick={() => setShowCancellationModal(true)}
                      variant="destructive"
                      className="w-full"
                    >
                      Cancelar mi registro
                    </Button>
                    <p className="text-xs text-neutral-600 text-center">
                      Puedes cancelar hasta 2 horas antes del partido
                    </p>
                  </>
                ) : (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3">
                    <p className="text-neutral-700 text-sm text-center">
                      Ya no es posible cancelar el registro (menos de 2 horas antes del partido)
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={() => {
                    const gameMessage = isValidGameDate 
                      ? `¡Nos vemos en el partido "${registration.game.title}" el ${format(gameDate, "d/M 'a las' HH:mm", { locale: es })}!`
                      : `¡Nos vemos en el partido "${registration.game.title}"!`;
                    if (typeof window !== 'undefined') {
                      window.location.href = `whatsapp://send?text=${encodeURIComponent(gameMessage)}`;
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  📱 Compartir en WhatsApp
                </Button>
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="text-center py-4 mt-8">
            <p className="text-xs text-neutral-500">
              Cancha Leconte - Organizando partidos de fútbol
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancellationModal && (
        <CancellationModal
          isOpen={showCancellationModal}
          onClose={() => setShowCancellationModal(false)}
          onConfirm={handleCancellation}
          isLoading={isCancelling}
          playerName={registration.registration.player_name}
          gameTitle={registration.game.title}
        />
      )}
    </div>
  );
}