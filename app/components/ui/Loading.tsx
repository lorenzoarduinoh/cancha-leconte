'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'text-primary',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${color} ${className}`}
      role="status"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md';
  showSpinner?: boolean;
  className?: string;
}

export function InlineLoading({ 
  message = 'Cargando...', 
  size = 'md',
  showSpinner = true,
  className = '' 
}: InlineLoadingProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status">
      {showSpinner && <LoadingSpinner size={size} />}
      <span className="text-sm text-neutral-600">{message}</span>
    </span>
  );
}