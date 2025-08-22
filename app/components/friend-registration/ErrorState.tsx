'use client';

import React from 'react';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  canGoBack: boolean;
  onGoBack?: () => void;
  type?: 'network' | 'not-found' | 'access-denied' | 'generic';
}

/**
 * ErrorState Component
 * 
 * Displays error messages with appropriate recovery actions.
 * Designed to be accessible and provide clear next steps for users.
 */
export function ErrorState({ 
  error, 
  onRetry, 
  canGoBack, 
  onGoBack,
  type = 'generic' 
}: ErrorStateProps) {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: (
            <svg className="w-12 h-12 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          title: 'Problema de conexión',
          description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.',
          primaryAction: 'Intentar nuevamente',
        };
      
      case 'not-found':
        return {
          icon: (
            <svg className="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ),
          title: 'Partido no encontrado',
          description: 'El enlace del partido no es válido o el partido ya no está disponible.',
          primaryAction: 'Verificar enlace',
        };
      
      case 'access-denied':
        return {
          icon: (
            <svg className="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
          title: 'Acceso no permitido',
          description: 'No tienes permisos para acceder a este partido o las inscripciones están cerradas.',
          primaryAction: 'Contactar organizador',
        };
      
      default:
        return {
          icon: (
            <svg className="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Error inesperado',
          description: 'Ocurrió un problema al procesar tu solicitud.',
          primaryAction: 'Intentar nuevamente',
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center" aria-hidden="true">
            {config.icon}
          </div>

          {/* Error Content */}
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-neutral-900">
              {config.title}
            </h1>
            
            <div className="space-y-2">
              <p className="text-neutral-600">
                {config.description}
              </p>
              
              {error && error !== config.description && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <strong>Detalles del error:</strong> {error}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={onRetry}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {config.primaryAction}
              </Button>

              {canGoBack && onGoBack && (
                <Button
                  onClick={onGoBack}
                  variant="secondary"
                  size="md"
                  className="w-full"
                >
                  Volver
                </Button>
              )}

              {type === 'access-denied' && (
                <div className="pt-4 border-t border-neutral-200">
                  <p className="text-sm text-neutral-600 mb-3">
                    ¿Necesitas ayuda? Contacta al organizador del partido:
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.open('https://wa.me/message', '_blank')}
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      📱 Enviar WhatsApp
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Branding */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <div className="text-primary font-bold text-lg">
              Cancha Leconte
            </div>
            <div className="text-sm text-neutral-500 mt-1">
              Organizando partidos de fútbol
            </div>
          </div>

          {/* Accessibility announcements */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Error: {config.title}. {config.description}. {error}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * InlineErrorState Component
 * 
 * Smaller error display for use within other components
 */
export function InlineErrorState({ 
  error, 
  onRetry, 
  onDismiss,
  size = 'md' 
}: { 
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg',
  };

  return (
    <div 
      className={`bg-red-50 border border-red-200 rounded-lg ${sizeClasses[size]}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0 mt-1">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Error Content */}
        <div className="flex-1 min-w-0">
          <p className="text-red-700 font-medium">
            Error
          </p>
          <p className="text-red-600 mt-1">
            {error}
          </p>

          {/* Actions */}
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm text-red-700 hover:text-red-800 font-medium underline"
                >
                  Intentar nuevamente
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Cerrar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-500"
            aria-label="Cerrar error"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}