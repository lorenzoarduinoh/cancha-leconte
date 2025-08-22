'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';
    
    const variantStyles = {
      default: 'bg-primary text-white',
      success: 'bg-success text-white',
      warning: 'bg-warning text-white',
      error: 'bg-error text-white',
      info: 'bg-info text-white',
      neutral: 'bg-neutral-200 text-neutral-800',
    };

    const sizeStyles = {
      sm: 'px-2 py-1 text-xs min-h-[20px]',
      md: 'px-3 py-1 text-sm min-h-[24px]',
      lg: 'px-4 py-2 text-base min-h-[32px]',
      xl: 'px-5 py-2 text-lg min-h-[36px] font-semibold',
    };

    return (
      <span
        ref={ref}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };