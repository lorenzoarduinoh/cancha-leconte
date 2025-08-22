'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { CopyIcon, CheckIcon, WhatsAppIcon } from '../ui/Icons';

interface GameShareLinkProps {
  shareToken: string;
  gameTitle: string;
}

/**
 * GameShareLink Component
 * 
 * Displays the friend registration link and provides easy sharing options.
 * Allows copying the link and opening WhatsApp with a pre-filled message.
 */
export function GameShareLink({ shareToken, gameTitle }: GameShareLinkProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate the friend registration URL
  const friendUrl = `${window.location.origin}/juego/${shareToken}`;
  
  // WhatsApp message template
  const whatsappMessage = `¡Hola!

Te invito a jugar al partido "${gameTitle}".

Para inscribirte, solo hace click en este link:
${friendUrl}

¡Te espero en la cancha!`;

  // Copy link to clipboard
  const handleCopyLink = async () => {
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
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };


  return (
    <div className="space-y-4">
      
      {/* Friend Registration URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">
          Link de registro para amigos:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={friendUrl}
            readOnly
            className="flex-1 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary select-all"
          />
          <Button
            onClick={handleCopyLink}
            variant={copied ? "success" : "secondary"}
            size="sm"
            className="flex-shrink-0 gap-2"
          >
            {copied ? (
              <>
                <CheckIcon size={16} />
                Copiado
              </>
            ) : (
              <>
                <CopyIcon size={16} />
                Copiar
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-neutral-600">
          Comparte este link para que tus amigos se registren directamente
        </p>
      </div>

      {/* WhatsApp Sharing */}
      <div className="space-y-2">
        <Button
          onClick={handleShareWhatsApp}
          variant="whatsapp"
          size="sm"
          className="w-full gap-2"
        >
          <WhatsAppIcon size={18} />
          Compartir por WhatsApp
        </Button>
        <p className="text-xs text-neutral-600 text-center">
          Comparte el link por WhatsApp con mensaje incluido
        </p>
      </div>
    </div>
  );
}