import React from 'react';
import { FriendGameInterface } from '../../components/friend-registration/FriendGameInterface';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { ErrorFallback } from '../../components/friend-registration/ErrorFallback';

interface FriendGamePageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Public Friend Game Access Page
 * 
 * This page serves as the entry point for friends accessing games via shareable links.
 * It's designed to be mobile-first and accessible from WhatsApp browsers.
 * 
 * Features:
 * - Mobile-first responsive design
 * - Game information display
 * - Friend registration form
 * - Real-time player count updates
 * - Waiting list support
 * - Accessibility compliance (WCAG AA)
 */
export default async function FriendGamePage({ params }: FriendGamePageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Skip link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link"
        tabIndex={1}
      >
        Saltar al contenido principal
      </a>

      {/* Main content */}
      <main id="main-content" role="main">
        <ErrorBoundary fallback={<ErrorFallback />}>
          <FriendGameInterface token={token} />
        </ErrorBoundary>
      </main>
    </div>
  );
}

// Export metadata for SEO and social sharing
export const metadata = {
  title: 'Cancha Leconte - Únete al Partido',
  description: 'Regístrate para el próximo partido de fútbol en Cancha Leconte',
  robots: 'noindex, nofollow', // Prevent indexing of public game links
};