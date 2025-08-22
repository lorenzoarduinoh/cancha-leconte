'use client';

import { forwardRef, useState } from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  maxLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, showCharCount, maxLength, id, value, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const currentLength = value ? value.toString().length : 0;

    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const countId = showCharCount ? `${textareaId}-count` : undefined;

    return (
      <div className="form-field">
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
            {props.required && <span className="required" aria-label="campo obligatorio">*</span>}
          </label>
        )}
        
        <div className="input-container">
          <textarea
            id={textareaId}
            className={clsx(
              'form-input',
              'form-textarea',
              {
                'form-input--error': error,
                'form-input--focused': isFocused,
              },
              className
            )}
            ref={ref}
            value={value}
            maxLength={maxLength}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={clsx(errorId, helperId, countId)}
            {...props}
          />
        </div>

        <div className="form-field-footer">
          {helperText && !error && (
            <div id={helperId} className="help-text">
              {helperText}
            </div>
          )}

          {showCharCount && maxLength && (
            <div id={countId} className="char-count">
              {currentLength}/{maxLength}
            </div>
          )}
        </div>

        {error && (
          <div id={errorId} className="error-text" role="alert">
            <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };