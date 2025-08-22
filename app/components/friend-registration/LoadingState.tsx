'use client';

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

/**
 * LoadingState Component
 * 
 * Displays a loading indicator with optional message.
 * Designed to be accessible and mobile-friendly.
 */
export function LoadingState({ message = 'Cargando información del partido...' }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
          {/* Loading Spinner */}
          <div 
            className="w-12 h-12 mx-auto mb-6"
            role="status"
            aria-label="Cargando"
          >
            <svg 
              className="animate-spin w-full h-full text-primary" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          {/* Loading Message */}
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-neutral-900">
              {message}
            </h2>
            
            {/* Screen reader announcement */}
            <div 
              className="sr-only" 
              aria-live="polite" 
              aria-atomic="true"
            >
              {message}
            </div>
          </div>

          {/* Branding */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="text-primary font-bold text-xl">
              Cancha Leconte
            </div>
            <div className="text-sm text-neutral-600 mt-1">
              Organizando tu partido de fútbol
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Loading Component
 * 
 * Smaller loading indicator for use within other components
 */
export function InlineLoadingState({ 
  message = 'Cargando...', 
  size = 'md' 
}: { 
  message?: string; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="flex items-center justify-center gap-3 p-4">
      <div 
        className={sizeClasses[size]}
        role="status"
        aria-label="Cargando"
      >
        <svg 
          className="animate-spin w-full h-full text-primary" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      
      <span className={`${textSizeClasses[size]} text-neutral-700 font-medium`}>
        {message}
      </span>
      
      {/* Screen reader announcement */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {message}
      </div>
    </div>
  );
}

/**
 * Skeleton Loading Component
 * 
 * Shows placeholder content while loading
 */
export function SkeletonLoadingState() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Hero Section Skeleton */}
          <div className="bg-gradient-to-br from-primary-800 to-primary-500 rounded-b-xl p-8 text-center mb-6">
            <div className="space-y-4">
              <div className="skeleton h-6 w-48 mx-auto bg-white/20 rounded"></div>
              <div className="skeleton h-10 w-32 mx-auto bg-white/20 rounded"></div>
              <div className="skeleton h-4 w-56 mx-auto bg-white/20 rounded"></div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-6">
            <div className="space-y-3">
              <div className="skeleton h-4 w-full bg-neutral-200 rounded"></div>
              <div className="skeleton h-4 w-3/4 bg-neutral-200 rounded"></div>
              <div className="skeleton h-4 w-1/2 bg-neutral-200 rounded"></div>
            </div>
            
            <div className="skeleton h-12 w-full bg-neutral-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}