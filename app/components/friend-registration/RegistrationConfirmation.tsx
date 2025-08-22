'use client';

import React, { useState, useEffect } from 'react';
import { format, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { 
  PublicGameInfo, 
  FriendRegistrationResponse 
} from '../../../lib/types/friend-registration';

interface RegistrationConfirmationProps {
  gameInfo: PublicGameInfo;
  registrationResult: FriendRegistrationResponse;
  onReturnToGame: () => void;
}

/**
 * RegistrationConfirmation Component
 * 
 * Displays successful registration confirmation with animated success state.
 * Provides next steps and important information about the upcoming game.
 * 
 * Features:
 * - Animated success indicator
 * - Registration details summary
 * - Next steps information
 * - Calendar integration option
 * - Social sharing capabilities
 * - Waiting list specific messaging
 * - Contact information for support
 */
export function RegistrationConfirmation({
  gameInfo,
  registrationResult,
  onReturnToGame
}: RegistrationConfirmationProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Trigger success animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const gameDate = new Date(gameInfo.game_date);
  const confirmationDetails = registrationResult.confirmation_details;
  const isWaitingList = registrationResult.game_full || confirmationDetails?.status === 'waiting_list';

  // Generate calendar event
  const handleAddToCalendar = () => {
    try {
      const startDate = gameDate;
      const endDate = addHours(startDate, gameInfo.game_duration_minutes / 60);
      
      const formatDateForCalendar = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const calendarParams = new URLSearchParams({
        action: 'TEMPLATE',
        text: `⚽ ${gameInfo.title}`,
        dates: `${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}`,
        details: `Partido de fútbol en ${gameInfo.location}\n\nCosto: $${gameInfo.field_cost_per_player}\nDuración: ${gameInfo.game_duration_minutes} minutos\n\nOrganizado por Cancha Leconte`,
        location: gameInfo.location,
        sf: 'true',
        output: 'xml'
      });

      const calendarUrl = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;
      window.open(calendarUrl, '_blank');
      
    } catch (error) {
      console.error('Error creating calendar event:', error);
      setCalendarError('No se pudo crear el evento en el calendario');
    }
  };

  // Generate WhatsApp share message
  const handleShareWhatsApp = () => {
    const message = isWaitingList 
      ? `¡Me registré en la lista de espera para "${gameInfo.title}"! 🥅\n\n📅 ${format(gameDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}\n📍 ${gameInfo.location}\n\n¿Te animas a unirte también?`
      : `¡Me registré para "${gameInfo.title}"! ⚽\n\n📅 ${format(gameDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}\n📍 ${gameInfo.location}\n💰 $${gameInfo.field_cost_per_player}\n\n¿Te animas a jugar también?`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            
            {/* Success Header */}
            <div className="bg-gradient-to-br from-success to-primary-light text-white p-8 text-center">
              {/* Animated Success Icon */}
              <div 
                className={`w-20 h-20 mx-auto mb-4 transition-all duration-600 ${
                  showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              >
                <div className="w-full h-full bg-white/20 rounded-full flex items-center justify-center">
                  <svg 
                    className={`w-12 h-12 transition-all duration-300 delay-300 ${
                      showAnimation ? 'scale-100' : 'scale-0'
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">
                  {isWaitingList ? '¡En lista de espera!' : '¡Estás registrado!'}
                </h1>
                <p className="text-white/90">
                  {isWaitingList 
                    ? 'Te notificaremos si se libera un lugar'
                    : 'Tu lugar está confirmado para el partido'
                  }
                </p>
              </div>
            </div>

            {/* Registration Details */}
            <div className="p-6 space-y-6">
              
              {/* Game Summary */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Detalles del partido
                </h2>
                
                <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-neutral-600">Partido:</span>
                    <span className="font-medium text-neutral-900 text-right">
                      {confirmationDetails?.game_title || gameInfo.title}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-neutral-600">Fecha y hora:</span>
                    <span className="font-medium text-neutral-900 text-right">
                      {format(gameDate, "EEEE d 'de' MMMM", { locale: es })}<br />
                      {format(gameDate, 'HH:mm', { locale: es })} hs
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-neutral-600">Ubicación:</span>
                    <span className="font-medium text-neutral-900 text-right">
                      {confirmationDetails?.location || gameInfo.location}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-neutral-600">Costo:</span>
                    <span className="font-medium text-neutral-900">
                      ${confirmationDetails?.cost || gameInfo.field_cost_per_player}
                    </span>
                  </div>

                  {/* Waiting List Position */}
                  {isWaitingList && confirmationDetails?.position && (
                    <div className="flex justify-between items-start border-t border-neutral-200 pt-3">
                      <span className="text-warning-600">Posición en lista:</span>
                      <span className="font-bold text-warning-700">
                        #{confirmationDetails.position}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Message */}
              {isWaitingList ? (
                <div className="bg-warning/20 border border-warning/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-warning mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-warning-800 font-medium mb-1">
                        Lista de espera
                      </p>
                      <p className="text-warning-700">
                        El partido está completo, pero estás en la lista de espera. 
                        Te enviaremos un WhatsApp si se libera un lugar.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-success/20 border border-success/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-success mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-success-800 font-medium mb-1">
                        Registro confirmado
                      </p>
                      <p className="text-success-700">
                        Tu lugar está asegurado. Te enviaremos recordatorios por WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Próximos pasos
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-neutral-900">Recordatorio</p>
                      <p className="text-neutral-600">
                        Te enviaremos un WhatsApp 1 hora antes del partido
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-neutral-900">Día del partido</p>
                      <p className="text-neutral-600">
                        Llega 10 minutos antes al {gameInfo.location}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-neutral-900">Después del partido</p>
                      <p className="text-neutral-600">
                        Recibirás el enlace de pago por WhatsApp (tienes 24 horas)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleAddToCalendar}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Agregar al calendario
                </Button>

                {calendarError && (
                  <div className="text-sm text-red-600 text-center">
                    {calendarError}
                  </div>
                )}

                <Button
                  onClick={handleShareWhatsApp}
                  variant="secondary"
                  size="md"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Compartir con amigos
                </Button>

                <Button
                  onClick={onReturnToGame}
                  variant="ghost"
                  size="md"
                  className="w-full"
                >
                  Ver detalles del partido
                </Button>
              </div>

              {/* Contact Information */}
              <div className="pt-6 border-t border-neutral-200">
                <div className="text-center space-y-3">
                  <h4 className="font-medium text-neutral-900">
                    ¿Necesitas ayuda?
                  </h4>
                  <div className="text-sm text-neutral-600">
                    <p>Si tienes alguna pregunta o necesitas cancelar tu registro,</p>
                    <p>contacta al organizador del partido.</p>
                  </div>
                  <Button
                    onClick={() => window.open('https://wa.me/message', '_blank')}
                    variant="ghost"
                    size="sm"
                    className="text-success hover:text-success-700"
                  >
                    📱 Enviar WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-neutral-50 border-t border-neutral-200 p-4 text-center">
              <div className="text-primary font-bold text-lg">
                Cancha Leconte
              </div>
              <div className="text-sm text-neutral-600">
                ¡Nos vemos en la cancha! ⚽
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isWaitingList 
          ? `Registro en lista de espera confirmado para ${gameInfo.title}`
          : `Registro confirmado para ${gameInfo.title}`
        }
      </div>
    </div>
  );
}