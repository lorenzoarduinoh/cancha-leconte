'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  PlayerRegistrationStatus, 
  PublicGameInfo,
  REGISTRATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS 
} from '../../../lib/types/friend-registration';

interface PlayerStatusIndicatorProps {
  status: PlayerRegistrationStatus;
  gameInfo: PublicGameInfo;
  onCancelRegistration: (phone: string, reason?: string) => Promise<void>;
}

/**
 * PlayerStatusIndicator Component
 * 
 * Displays the current player's registration status with appropriate actions.
 * Shows different states: confirmed, waiting list, payment required, etc.
 * 
 * Features:
 * - Status badge with color coding
 * - Waiting list position display
 * - Payment status and deadline
 * - Cancellation option with confirmation modal
 * - Accessibility features for screen readers
 */
export function PlayerStatusIndicator({
  status,
  gameInfo,
  onCancelRegistration
}: PlayerStatusIndicatorProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  if (!status.is_registered || !status.registration) {
    return null;
  }

  const registration = status.registration;

  // Determine status display
  const getStatusConfig = () => {
    switch (status.status) {
      case 'confirmed':
        return {
          color: 'bg-success text-white',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          label: 'Confirmado',
          description: 'Tu lugar está asegurado para el partido'
        };
      
      case 'waiting_list':
        return {
          color: 'bg-warning text-white',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Lista de espera',
          description: status.position 
            ? `Estás en la posición ${status.position} de la lista de espera`
            : 'Estás en la lista de espera'
        };
      
      default:
        return {
          color: 'bg-neutral-500 text-white',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: REGISTRATION_STATUS_LABELS[status.status] || 'Desconocido',
          description: 'Estado de registro'
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Handle cancellation
  const handleCancelConfirm = async () => {
    if (!registration.player_phone) return;

    setIsCancelling(true);
    try {
      await onCancelRegistration(registration.player_phone, cancelReason.trim() || undefined);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling registration:', error);
      // Error handling is managed by parent component
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        {/* Status Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
          </div>
          
          {/* Cancellation button */}
          {status.can_cancel && (
            <Button
              onClick={() => setShowCancelModal(true)}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </Button>
          )}
        </div>

        {/* Registration Details */}
        <div className="space-y-2">
          <div className="text-sm text-primary-800">
            <strong>Registrado como:</strong> {registration.player_name}
          </div>
          
          <div className="text-sm text-primary-700">
            {statusConfig.description}
          </div>

          {/* Waiting list specific info */}
          {status.status === 'waiting_list' && status.position && (
            <div className="bg-warning/20 border border-warning/30 rounded p-2 mt-2">
              <div className="text-sm text-warning-800 font-medium">
                Posición en lista de espera: #{status.position}
              </div>
              <div className="text-xs text-warning-700 mt-1">
                Te notificaremos por WhatsApp si se libera un lugar
              </div>
            </div>
          )}

          {/* Payment information */}
          {status.payment_required && registration.payment_amount && (
            <div className="bg-neutral-100 border border-neutral-200 rounded p-2 mt-2">
              <div className="text-sm text-neutral-800">
                <strong>Costo:</strong> ${registration.payment_amount}
              </div>
              {status.payment_deadline && (
                <div className="text-xs text-neutral-600 mt-1">
                  <strong>Fecha límite de pago:</strong>{' '}
                  {format(new Date(status.payment_deadline), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </div>
              )}
              <div className="text-xs text-neutral-600 mt-1">
                Recibirás el enlace de pago por WhatsApp después del partido
              </div>
            </div>
          )}

          {/* Registration timestamp */}
          <div className="text-xs text-primary-600 pt-2 border-t border-primary-200">
            Registrado el {format(new Date(registration.registered_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar inscripción"
      >
        <div className="space-y-4">
          <div className="text-sm text-neutral-600">
            ¿Estás seguro que quieres cancelar tu inscripción para este partido?
          </div>

          {/* Game info reminder */}
          <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
            <div className="text-sm">
              <div className="font-medium text-neutral-900">{gameInfo.title}</div>
              <div className="text-neutral-600">
                {format(new Date(gameInfo.game_date), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
              </div>
            </div>
          </div>

          {/* Reason input */}
          <div>
            <label htmlFor="cancel-reason" className="block text-sm font-medium text-neutral-700 mb-2">
              Motivo de cancelación (opcional)
            </label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: No puedo asistir, cambio de planes..."
              className="w-full form-input resize-none"
              rows={3}
              maxLength={500}
              disabled={isCancelling}
            />
            <div className="text-xs text-neutral-500 mt-1">
              {cancelReason.length}/500 caracteres
            </div>
          </div>

          {/* Warning about waiting list */}
          {status.status === 'confirmed' && gameInfo.waiting_list_count > 0 && (
            <div className="bg-warning/20 border border-warning/30 rounded p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-warning-800">
                  Al cancelar, tu lugar será automáticamente asignado al siguiente jugador en la lista de espera.
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setShowCancelModal(false)}
              variant="secondary"
              className="flex-1"
              disabled={isCancelling}
            >
              Mantener inscripción
            </Button>
            <Button
              onClick={handleCancelConfirm}
              variant="destructive"
              className="flex-1"
              loading={isCancelling}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}