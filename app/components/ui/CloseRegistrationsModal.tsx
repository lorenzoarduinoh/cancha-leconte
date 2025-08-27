'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Button } from './Button';
import { AlertTriangleIcon } from './Icons';
import { InlineLoadingSpinner } from './LoadingSpinner';

interface CloseRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gameTitle: string;
  currentPlayers: number;
  isLoading?: boolean;
}

// Animation styles (same as ConfirmationModal)
const modalAnimationStyles = `
  .modal-overlay-enter {
    animation: modalOverlayEnter 0.3s ease-out both;
  }
  
  .modal-overlay-exit {
    animation: modalOverlayExit 0.2s ease-in both;
  }
  
  @keyframes modalOverlayEnter {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(2px);
    }
  }
  
  @keyframes modalOverlayExit {
    from {
      opacity: 1;
      backdrop-filter: blur(2px);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
  }
  
  .modal-card-enter {
    animation: modalCardEnter 0.4s ease-out both;
  }
  
  .modal-card-exit {
    animation: modalCardExit 0.3s ease-in both;
  }
  
  @keyframes modalCardEnter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes modalCardExit {
    from {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    to {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .modal-overlay-enter,
    .modal-overlay-exit,
    .modal-card-enter,
    .modal-card-exit {
      animation: none;
    }
  }
`;

export function CloseRegistrationsModal({
  isOpen,
  onClose,
  onConfirm,
  gameTitle,
  currentPlayers,
  isLoading = false,
}: CloseRegistrationsModalProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Inject animation styles when modal opens
  useEffect(() => {
    if (isOpen) {
      const styleId = 'close-registrations-modal-animations';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = modalAnimationStyles;
        document.head.appendChild(style);
      }
      setShouldRender(true);
      setIsAnimatingOut(false);
    }
  }, [isOpen]);

  // Handle modal close with animation
  const handleClose = () => {
    if (isLoading) return; // Prevent closing during loading
    
    setIsAnimatingOut(true);
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setShouldRender(false);
      setIsAnimatingOut(false);
      onClose();
    }, 300); // Match the exit animation duration
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      const existingStyle = document.getElementById('close-registrations-modal-animations');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isAnimatingOut ? 'modal-overlay-exit' : 'modal-overlay-enter'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        onClick={handleClose}
      />
      
      {/* Main Card - Semi-transparent */}
      <div className={`relative bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 w-full max-w-lg mx-auto px-12 min-h-[350px] flex items-center ${
        isAnimatingOut ? 'modal-card-exit' : 'modal-card-enter'
      }`}>
        
        {/* Content Container - mantiene el espaciado original */}
        <div className="max-w-md mx-auto w-full">
          {/* Title */}
          <div className="text-center" style={{ marginBottom: '24px' }}>
            <h2 className="text-xl font-semibold text-neutral-900">
              ¿Querés cerrar las inscripciones para "{gameTitle}"?
            </h2>
          </div>

          {/* Info Card */}
          <div style={{ marginBottom: '32px' }}>
            <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl p-4">
              <div className="flex items-center gap-2 font-medium mb-3 text-amber-800">
                <AlertTriangleIcon size={18} className="text-amber-600" />
                Al cerrar las inscripciones:
              </div>
              <ul className="list-disc list-inside space-y-1 ml-6 text-sm text-amber-800">
                <li>No se podrán registrar más jugadores</li>
                <li>Los {currentPlayers} jugadores actuales se mantendrán</li>
                <li>Podrás proceder a formar equipos y completar el partido</li>
                <li>Se puede reabrir más tarde si es necesario</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleClose}
              variant="ghost"
              disabled={isLoading}
              className="flex-1 h-12 px-6 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 transition-all duration-200 rounded-xl font-medium border border-neutral-300"
            >
              No, Mantener
            </Button>
            <Button
              onClick={onConfirm}
              variant="warning"
              disabled={isLoading}
              className="flex-1 h-12 px-6 transition-all duration-200 rounded-xl font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <InlineLoadingSpinner size="sm" />
                  <span>Cerrando...</span>
                </div>
              ) : (
                'Sí, Cerrar'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}