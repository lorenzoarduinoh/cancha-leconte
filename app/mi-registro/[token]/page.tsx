import React from 'react';
import { PersonalRegistrationInterface } from '../../components/personal-registration/PersonalRegistrationInterface';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

interface PersonalRegistrationPageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Personal Registration Management Page
 * 
 * This page allows players to manage their individual registration through a secure token.
 * Accessed via WhatsApp notifications sent after registration.
 * 
 * Features:
 * - View registration and game details
 * - Cancel registration with reason
 * - Mobile-first design optimized for WhatsApp browser
 * - Secure token-based access (no login required)
 */
export default async function PersonalRegistrationPage({ params }: PersonalRegistrationPageProps) {
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
        <ErrorBoundary 
          fallback={
            <div className="container mx-auto px-4 py-8 text-center">
              <div className="max-w-md mx-auto bg-white rounded-lg border border-red-200 p-6">
                <div className="text-red-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-lg font-semibold text-neutral-900 mb-2">
                  Error al cargar tu registro
                </h1>
                <p className="text-neutral-600 mb-4">
                  Hubo un problema al cargar la información de tu registro. Por favor, intenta nuevamente más tarde.
                </p>
                <a 
                  href="." 
                  className="btn btn--primary inline-block"
                >
                  Intentar nuevamente
                </a>
              </div>
            </div>
          }
        >
          <PersonalRegistrationInterface token={token} />
        </ErrorBoundary>
      </main>
    </div>
  );
}

// Export metadata for SEO and social sharing
export const metadata = {
  title: 'Mi Registro - Cancha Leconte',
  description: 'Gestiona tu inscripción al partido de fútbol',
  robots: 'noindex, nofollow', // Prevent indexing of personal registration links
};