'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CheckIcon, XIcon, EditIcon } from '../ui/Icons';
import { GAME_CONSTRAINTS } from '@/lib/types/game';

export interface EditableTeamNameProps {
  teamKey: 'team_a_name' | 'team_b_name';
  currentValue: string;
  onUpdate: (teamKey: 'team_a_name' | 'team_b_name', newValue: string) => Promise<boolean>;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

interface EditState {
  mode: 'view' | 'edit' | 'saving' | 'error';
  tempValue: string;
  error: string | null;
}

export function EditableTeamName({
  teamKey,
  currentValue,
  onUpdate,
  className = '',
  disabled = false,
  placeholder = 'Nombre del equipo'
}: EditableTeamNameProps) {
  const [state, setState] = useState<EditState>({
    mode: 'view',
    tempValue: currentValue,
    error: null
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update temp value when current value changes
  useEffect(() => {
    if (state.mode === 'view') {
      setState(prev => ({
        ...prev,
        tempValue: currentValue
      }));
    }
  }, [currentValue, state.mode]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (state.mode === 'edit' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state.mode]);

  // Validate team name
  const validateName = (name: string): string | null => {
    const trimmed = name.trim();
    
    if (trimmed.length < GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH) {
      return `Mínimo ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`;
    }
    
    if (trimmed.length > GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH) {
      return `Máximo ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`;
    }
    
    // Check for forbidden characters
    if (!/^[a-zA-ZÀ-ÿ0-9\s\-_.']+$/.test(trimmed)) {
      return 'Solo se permiten letras, números, espacios y caracteres básicos';
    }
    
    return null;
  };

  // Start edit mode
  const handleStartEdit = () => {
    if (disabled || state.mode === 'saving') return;
    
    setState(prev => ({
      ...prev,
      mode: 'edit',
      tempValue: currentValue,
      error: null
    }));
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setState(prev => ({
      ...prev,
      mode: 'view',
      tempValue: currentValue,
      error: null
    }));
  };

  // Save changes
  const handleSave = async () => {
    const trimmedValue = state.tempValue.trim();
    
    // Validate
    const validationError = validateName(trimmedValue);
    if (validationError) {
      setState(prev => ({
        ...prev,
        error: validationError
      }));
      return;
    }

    // If no change, just exit edit mode
    if (trimmedValue === currentValue) {
      handleCancelEdit();
      return;
    }

    setState(prev => ({
      ...prev,
      mode: 'saving',
      error: null
    }));

    try {
      const success = await onUpdate(teamKey, trimmedValue);
      
      if (success) {
        setState(prev => ({
          ...prev,
          mode: 'view',
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          mode: 'error',
          error: 'Error al actualizar nombre del equipo'
        }));

        // Auto-return to edit mode after showing error
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            mode: 'edit'
          }));
        }, 3000);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        mode: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));

      // Auto-return to edit mode after showing error
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          mode: 'edit'
        }));
      }, 3000);
    }
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    setState(prev => ({
      ...prev,
      tempValue: value,
      error: null
    }));
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Handle click outside
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        state.mode === 'edit' &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.mode, state.tempValue]);

  const getDisplayValue = () => {
    if (state.mode === 'view' || state.mode === 'saving') {
      return currentValue || placeholder;
    }
    return state.tempValue;
  };

  const getStatusIndicator = () => {
    switch (state.mode) {
      case 'saving':
        return (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Guardando...
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <XIcon size={12} />
            {state.error}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`editable-team-name ${className}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Editar nombre del equipo: ${currentValue}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && state.mode === 'view') {
          e.preventDefault();
          handleStartEdit();
        }
      }}
    >
      {state.mode === 'edit' ? (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={state.tempValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`text-lg font-semibold bg-white border-2 ${
              state.error ? 'border-red-500 focus:ring-red-500' : 'border-blue-500 focus:ring-blue-500'
            }`}
            maxLength={GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH}
            disabled={state.mode === 'saving'}
          />
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={state.mode === 'saving'}
              className="p-1 h-8 w-8 text-green-600 hover:bg-green-50"
              aria-label="Guardar cambios"
            >
              <CheckIcon size={16} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={state.mode === 'saving'}
              className="p-1 h-8 w-8 text-red-600 hover:bg-red-50"
              aria-label="Cancelar edición"
            >
              <XIcon size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={`group cursor-pointer flex items-center gap-2 p-2 rounded transition-colors ${
            disabled 
              ? 'cursor-not-allowed opacity-60' 
              : 'hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
          }`}
          onClick={disabled ? undefined : handleStartEdit}
        >
          <span className={`text-lg font-semibold ${!currentValue ? 'text-neutral-400' : 'text-neutral-900'}`}>
            {getDisplayValue()}
          </span>
          
          {!disabled && state.mode === 'view' && (
            <EditIcon 
              size={16} 
              className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400" 
            />
          )}
        </div>
      )}

      {/* Status/Error indicator */}
      {getStatusIndicator() && (
        <div className="mt-1">
          {getStatusIndicator()}
        </div>
      )}

      {/* Input validation error */}
      {state.mode === 'edit' && state.error && (
        <div className="text-xs text-red-600 mt-1">
          {state.error}
        </div>
      )}

      {/* Character count for editing */}
      {state.mode === 'edit' && (
        <div className="text-xs text-neutral-500 mt-1">
          {state.tempValue.length}/{GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres
        </div>
      )}
    </div>
  );
}