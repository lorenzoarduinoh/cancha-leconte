'use client';

import React from 'react';

/**
 * Error Fallback Component for Friend Registration
 * 
 * This component is shown when there's an unexpected error in the friend registration flow.
 * It provides a user-friendly error message and a retry button.
 */
export function ErrorFallback() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <div className="max-w-md mx-auto bg-white rounded-lg border border-red-200 p-6">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-neutral-900 mb-2">
          Error al cargar el partido
        </h1>
        <p className="text-neutral-600 mb-4">
          Hubo un problema al cargar la información del partido. Por favor, intenta nuevamente más tarde.
        </p>
        <button 
          onClick={handleRetry} 
          className="btn btn--primary"
        >
          Intentar nuevamente
        </button>
      </div>
    </div>
  );
}