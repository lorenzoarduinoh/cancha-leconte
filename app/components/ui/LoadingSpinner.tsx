'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

// Custom spinner animation that matches the page style
const spinnerStyles = `
  .custom-spinner {
    animation: customSpin 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes customSpin {
    0% {
      transform: rotate(0deg);
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: rotate(360deg);
      opacity: 0.8;
    }
  }
  
  .custom-spinner-pulse {
    animation: customPulse 1.5s ease-in-out infinite;
  }
  
  @keyframes customPulse {
    0%, 100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .custom-spinner,
    .custom-spinner-pulse {
      animation: none;
      opacity: 0.8;
      transform: none;
    }
  }
`;

export function LoadingSpinner({ 
  size = 'md', 
  message = 'Cargando...',
  className = ''
}: LoadingSpinnerProps) {
  React.useEffect(() => {
    const styleId = 'loading-spinner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = spinnerStyles;
      document.head.appendChild(style);
    }
  }, []);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const containerSizeClasses = {
    sm: 'py-6',
    md: 'py-8',
    lg: 'py-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
      {/* Main Spinner */}
      <div className="relative mb-4">
        {/* Outer ring - subtle background */}
        <div className={`${sizeClasses[size]} rounded-full border-2 border-neutral-200`}></div>
        
        {/* Inner spinning element */}
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-transparent border-t-green-500 border-r-green-500 custom-spinner`}></div>
        
        {/* Center dot with pulse */}
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className={`w-2 h-2 bg-green-500 rounded-full custom-spinner-pulse`}></div>
        </div>
      </div>
      
      {/* Loading message */}
      {message && (
        <div className="text-center">
          <p className="text-neutral-600 font-medium text-sm">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use (like in buttons)
export function InlineLoadingSpinner({ 
  size = 'sm',
  className = ''
}: { size?: 'xs' | 'sm' | 'md', className?: string }) {
  React.useEffect(() => {
    const styleId = 'loading-spinner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = spinnerStyles;
      document.head.appendChild(style);
    }
  }, []);

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Outer ring */}
      <div className={`${sizeClasses[size]} rounded-full border border-white/30`}></div>
      
      {/* Inner spinning element */}
      <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border border-transparent border-t-white border-r-white custom-spinner`}></div>
      
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-white/80 rounded-full custom-spinner-pulse"></div>
      </div>
    </div>
  );
}