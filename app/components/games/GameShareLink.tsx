'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { CopyIcon, CheckIcon, WhatsAppIcon, UsersIcon } from '../ui/Icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface GameShareLinkProps {
  shareToken: string;
  gameTitle: string;
}

/**
 * GameShareLink Component - Clean, minimal design for friend invitations
 * 
 * Features a horizontal layout with the link container and copy button side by side.
 * Provides easy sharing via WhatsApp with a pre-filled message.
 * Clean and professional styling with optimized spacing.
 */
export function GameShareLink({ shareToken, gameTitle }: GameShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const [friendUrl, setFriendUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate the friend registration URL safely on client side
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setFriendUrl(`${window.location.origin}/juego/${shareToken}`);
      // Simulate brief loading time for better UX
      setTimeout(() => setIsLoading(false), 800);
    }
  }, [shareToken]);

  // Show loading state while generating URL
  if (isLoading || !friendUrl) {
    return (
      <LoadingSpinner size="sm" message="Generando enlace..." className="py-8" />
    );
  }
  
  // WhatsApp message template
  const whatsappMessage = `¡Hola!

Te invito a jugar al partido "${gameTitle}".

Para inscribirte, solo hace click en este link:
${friendUrl}

¡Te espero en la cancha!`;

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!friendUrl) return;
    
    try {
      await navigator.clipboard.writeText(friendUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = friendUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open WhatsApp with pre-filled message
  const handleShareWhatsApp = () => {
    if (!friendUrl) return;
    
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="pt-6 pb-16 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <svg className="w-[18px] h-[18px] text-green-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M18 21a8 8 0 0 0-16 0"/>
            <circle cx="10" cy="8" r="5"/>
            <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">Invitar Amigos</h3>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Explanatory Text */}
      <div className="mb-4">
        <p className="text-base text-gray-600 font-medium leading-relaxed">Link de registro para amigos:</p>
      </div>

      {/* Link and Copy Button - Horizontal Layout */}
      <div className="flex items-stretch gap-4">
        <div className="flex-1 border border-gray-200 rounded-xl bg-gray-50 flex items-center">
          <div className="px-6 py-3 flex-1">
            <div className="text-sm font-mono text-gray-700 truncate">
              {friendUrl || 'Cargando...'}
            </div>
          </div>
        </div>
        <Button
          onClick={handleCopyLink}
          variant={copied ? "success" : "secondary"}
          size="sm"
          disabled={!friendUrl}
          className="flex-shrink-0 font-medium px-4 py-3 min-h-[48px] rounded-xl"
        >
          {copied ? (
            <CheckIcon size={16} />
          ) : (
            <CopyIcon size={16} />
          )}
        </Button>
      </div>

      {/* Fixed Space */}
      <div style={{ height: '32px' }}></div>

      {/* WhatsApp Button */}
      <div className="mb-8">
        <Button
          onClick={handleShareWhatsApp}
          disabled={!friendUrl}
          className="w-full gap-3 !bg-green-700 hover:!bg-green-800 disabled:!bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-5 px-8 rounded-xl transition-colors duration-200 shadow-sm text-base"
        >
          <WhatsAppIcon size={22} />
          Compartir por WhatsApp
        </Button>
      </div>

      {/* Success Feedback for Screen Readers */}
      {copied && (
        <div className="sr-only" role="status" aria-live="polite">
          Link copiado al portapapeles
        </div>
      )}
    </div>
  );
}