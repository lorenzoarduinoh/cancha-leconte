'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { InlineErrorState } from './ErrorState';
import { 
  PublicGameInfo, 
  FriendRegistrationRequest,
  FRIEND_REGISTRATION_CONSTANTS 
} from '../../../lib/types/friend-registration';

// Form validation schema
const registrationSchema = z.object({
  player_name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
  
  player_phone: z.string()
    .min(FRIEND_REGISTRATION_CONSTANTS.MIN_PHONE_LENGTH, `El teléfono debe tener al menos ${FRIEND_REGISTRATION_CONSTANTS.MIN_PHONE_LENGTH} dígitos`)
    .max(FRIEND_REGISTRATION_CONSTANTS.MAX_PHONE_LENGTH, `El teléfono no puede tener más de ${FRIEND_REGISTRATION_CONSTANTS.MAX_PHONE_LENGTH} dígitos`)
    .refine(phone => {
      // Argentina phone number validation
      const cleanPhone = phone.replace(/\s|-/g, '');
      const argentinePatterns = [
        /^(\+54|54)?9?11\d{8}$/, // Buenos Aires mobile
        /^(\+54|54)?9?\d{2,4}\d{7}$/, // Other provinces mobile
        /^(\+54|54)?11\d{8}$/, // Buenos Aires landline
        /^(\+54|54)?\d{2,4}\d{6,7}$/, // Other provinces landline
      ];
      return argentinePatterns.some(pattern => pattern.test(cleanPhone));
    }, {
      message: 'Ingresa un número de teléfono argentino válido'
    }),
  
  accept_terms: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos para participar'
  }),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface FriendRegistrationFormProps {
  gameInfo: PublicGameInfo;
  onSubmit: (data: FriendRegistrationRequest) => Promise<void>;
  onCancel: () => void;
  onCheckExistingRegistration?: (phone: string) => Promise<void>;
}

/**
 * FriendRegistrationForm Component
 * 
 * Mobile-optimized registration form with real-time validation.
 * Follows design specifications for slide-up modal behavior.
 * 
 * Features:
 * - Real-time form validation with clear error messages
 * - Argentina phone number validation
 * - Duplicate registration checking
 * - Accessibility features (WCAG AA compliance)
 * - Mobile-first responsive design
 * - Terms and conditions acceptance
 * - Game information summary
 */
export function FriendRegistrationForm({
  gameInfo,
  onSubmit,
  onCancel,
  onCheckExistingRegistration
}: FriendRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneCheckError, setPhoneCheckError] = useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    watch,
    setValue,
    trigger,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
    defaultValues: {
      player_name: '',
      player_phone: '',
      accept_terms: false,
    }
  });

  const watchedPhone = watch('player_phone');

  // Focus on name input when form opens
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 300); // Allow slide animation to complete

    return () => clearTimeout(timer);
  }, []);

  // Check for existing registration when phone changes
  useEffect(() => {
    const checkExistingRegistration = async () => {
      if (!onCheckExistingRegistration || !watchedPhone || watchedPhone.length < 10) {
        setPhoneCheckError(null);
        return;
      }

      setIsCheckingPhone(true);
      setPhoneCheckError(null);

      try {
        await onCheckExistingRegistration(watchedPhone);
      } catch (error) {
        setPhoneCheckError('Ya existe una inscripción con este número de teléfono');
      } finally {
        setIsCheckingPhone(false);
      }
    };

    const debounceTimer = setTimeout(checkExistingRegistration, 500);
    return () => clearTimeout(debounceTimer);
  }, [watchedPhone, onCheckExistingRegistration]);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format for Argentine numbers
    if (value.startsWith('54')) {
      value = '+' + value;
    } else if (value.startsWith('9') && value.length > 1) {
      value = '+54 ' + value;
    } else if (value.length > 0 && !value.startsWith('+')) {
      if (value.length >= 10) {
        // Format as: +54 9 XX XXXX-XXXX
        value = value.replace(/(\d{2})(\d{4})(\d{4})/, '+54 9 $1 $2-$3');
      }
    }
    
    setValue('player_phone', value);
    trigger('player_phone');
  };

  // Handle form submission
  const onFormSubmit = async (data: RegistrationFormData) => {
    if (phoneCheckError) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean phone number by removing spaces and dashes
      const cleanedPhone = data.player_phone.replace(/\s|-/g, '');
      
      await onSubmit({
        player_name: data.player_name.trim(),
        player_phone: cleanedPhone,
        accept_terms: data.accept_terms || true, // Default to true if not provided
      });
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isSubmitting]);

  const gameDate = new Date(gameInfo.game_date);
  const isWaitingList = gameInfo.is_full;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header with game summary */}
      <div className="bg-white border-b border-neutral-200 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold text-neutral-900">
              {isWaitingList ? 'Unirse a lista de espera' : 'Registrarse para el partido'}
            </h1>
            <div className="text-sm text-neutral-600">
              <div className="font-medium">{gameInfo.title}</div>
              <div>{format(gameDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          <form 
            ref={formRef}
            onSubmit={handleSubmit(onFormSubmit)}
            className="bg-white rounded-lg border border-neutral-200 p-6 space-y-6"
          >
            {/* Waiting list notice */}
            {isWaitingList && (
              <div className="bg-warning/20 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-warning mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-warning-800 font-medium mb-1">
                      Partido completo - Lista de espera
                    </p>
                    <p className="text-warning-700">
                      Te registrarás en la lista de espera. Te notificaremos por WhatsApp si se libera un lugar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Name Field */}
            <div>
              <Input
                name="player_name"
                {...register('player_name')}
                label="Tu nombre"
                placeholder="Como te conocen tus amigos"
                error={errors.player_name?.message}
                required
                disabled={isSubmitting}
                aria-describedby="name-help"
              />
              <div id="name-help" className="text-xs text-neutral-500 mt-1">
                Solo letras y espacios. Mínimo 2 caracteres.
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <Input
                {...register('player_phone')}
                type="tel"
                label="Número de WhatsApp"
                placeholder="+54 9 11 XXXX-XXXX"
                error={errors.player_phone?.message || phoneCheckError || undefined}
                required
                disabled={isSubmitting}
                onChange={handlePhoneChange}
                aria-describedby="phone-help"
              />
              <div id="phone-help" className="text-xs text-neutral-500 mt-1">
                Para enviarte confirmaciones y recordatorios del partido.
                {isCheckingPhone && (
                  <span className="ml-2 text-primary">Verificando...</span>
                )}
              </div>
            </div>

            {/* Game Information Summary */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-medium text-primary-900 mb-3">
                Resumen del partido
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-700">Fecha y hora:</span>
                  <span className="text-primary-900 font-medium">
                    {format(gameDate, "d/M 'a las' HH:mm", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Ubicación:</span>
                  <span className="text-primary-900 font-medium">
                    {gameInfo.location}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Duración:</span>
                  <span className="text-primary-900 font-medium">
                    {gameInfo.game_duration_minutes} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Costo por jugador:</span>
                  <span className="text-primary-900 font-medium">
                    ${gameInfo.field_cost_per_player}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Jugadores:</span>
                  <span className="text-primary-900 font-medium">
                    {gameInfo.current_players}/{gameInfo.max_players}
                    {gameInfo.waiting_list_count > 0 && (
                      <span className="text-warning"> (+{gameInfo.waiting_list_count} en espera)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <div className="flex items-start gap-3">
                <input
                  {...register('accept_terms')}
                  type="checkbox"
                  id="accept-terms"
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary focus:ring-offset-0"
                  disabled={isSubmitting}
                />
                <label 
                  htmlFor="accept-terms" 
                  className="text-sm text-neutral-700 cursor-pointer leading-relaxed"
                >
                  Acepto participar en el partido y entiendo que:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-neutral-600">
                    <li>El pago se realizará después del partido vía WhatsApp</li>
                    <li>Tengo hasta 2 horas antes del partido para cancelar</li>
                    <li>Mi teléfono será usado solo para notificaciones del partido</li>
                    <li>Participo bajo mi propia responsabilidad</li>
                  </ul>
                </label>
              </div>
              {errors.accept_terms && (
                <div className="mt-2 text-sm text-red-600" role="alert">
                  {errors.accept_terms.message}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isSubmitting}
                disabled={!isValid || isSubmitting || !!phoneCheckError || isCheckingPhone}
              >
                {isSubmitting ? (
                  'Procesando registro...'
                ) : isWaitingList ? (
                  'Unirme a la lista de espera'
                ) : (
                  'Confirmar registro'
                )}
              </Button>

              <Button
                type="button"
                onClick={onCancel}
                variant="secondary"
                size="md"
                className="w-full"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>

            {/* Additional Information */}
            <div className="pt-4 border-t border-neutral-200">
              <div className="text-xs text-neutral-600 space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Recibirás confirmación inmediata por WhatsApp</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Te recordaremos 1 hora antes del partido</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>El enlace de pago llegará después del partido</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}