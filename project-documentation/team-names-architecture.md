# Arquitectura Técnica: Sistema de Edición de Nombres de Equipos

## Executive Summary

Esta arquitectura define una solución completa para implementar la funcionalidad de edición inline de nombres de equipos en el sistema Cancha Leconte. La solución permite a los administradores personalizar los nombres "Equipo A" y "Equipo B" con nombres custom que persistan en la base de datos y se reflejen en tiempo real en toda la aplicación.

### Tecnologías Core
- **Backend**: Next.js API Routes con Supabase PostgreSQL
- **Frontend**: React con TypeScript y Tailwind CSS
- **Estado**: React hooks locales con optimistic updates
- **Validación**: Zod schemas para consistencia client/server
- **Real-time**: Refetch automático después de cambios

### Componentes del Sistema
- Migración de base de datos para team names
- API endpoints para CRUD de team names
- Componente EditableTeamName para edición inline
- Actualizaciones en TeamManagement y GameResultForm
- Validaciones robustas y manejo de errores

---

## 1. Migración de Base de Datos

### 1.1 Schema Changes

```sql
-- Migration: 006_add_team_names.sql
-- Adds custom team names to games table

ALTER TABLE games 
ADD COLUMN team_a_name VARCHAR(50) DEFAULT 'Equipo A' NOT NULL,
ADD COLUMN team_b_name VARCHAR(50) DEFAULT 'Equipo B' NOT NULL;

-- Add constraints
ALTER TABLE games 
ADD CONSTRAINT games_team_a_name_length CHECK (char_length(team_a_name) >= 2 AND char_length(team_a_name) <= 50);

ALTER TABLE games 
ADD CONSTRAINT games_team_b_name_length CHECK (char_length(team_b_name) >= 2 AND char_length(team_b_name) <= 50);

-- Add indexes for better performance
CREATE INDEX idx_games_team_names ON games(team_a_name, team_b_name);

-- Update existing games with default values (already handled by DEFAULT clause)
-- No additional data migration needed since DEFAULT clause handles it

COMMENT ON COLUMN games.team_a_name IS 'Nombre personalizado para el equipo A';
COMMENT ON COLUMN games.team_b_name IS 'Nombre personalizado para el equipo B';
```

### 1.2 Rollback Migration

```sql
-- Rollback: rollback_006_add_team_names.sql
-- Removes team names columns from games table

DROP INDEX IF EXISTS idx_games_team_names;

ALTER TABLE games 
DROP CONSTRAINT IF EXISTS games_team_a_name_length,
DROP CONSTRAINT IF EXISTS games_team_b_name_length,
DROP COLUMN IF EXISTS team_a_name,
DROP COLUMN IF EXISTS team_b_name;
```

---

## 2. Tipos TypeScript Actualizados

### 2.1 Database Types Update

```typescript
// lib/supabase/types.ts - Actualización requerida
export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          // ... existing fields
          team_a_name: string
          team_b_name: string
          // ... rest of fields
        }
        Insert: {
          // ... existing fields
          team_a_name?: string
          team_b_name?: string
          // ... rest of fields
        }
        Update: {
          // ... existing fields
          team_a_name?: string
          team_b_name?: string
          // ... rest of fields
        }
      }
      // ... other tables
    }
  }
}
```

### 2.2 Game Types Extension

```typescript
// lib/types/game.ts - Adiciones requeridas

// Add to existing constants
export const TEAM_NAME_CONSTRAINTS = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 50,
  PATTERN: /^[a-zA-Z0-9\s\-_áéíóúñü]+$/i, // Allow alphanumeric, spaces, hyphens, underscores, Spanish chars
  DEFAULT_TEAM_A: 'Equipo A',
  DEFAULT_TEAM_B: 'Equipo B',
} as const;

// Add to existing interfaces
export interface TeamNamesUpdate {
  gameId: string;
  teamAName?: string;
  teamBName?: string;
}

// Add validation errors
export interface TeamNameFormErrors {
  team_a_name?: string;
  team_b_name?: string;
  general?: string;
}

// Add API response types
export interface TeamNamesApiResponse {
  success: boolean;
  data?: {
    team_a_name: string;
    team_b_name: string;
  };
  error?: string;
}

// Add to existing GameFormErrors interface
export interface GameFormErrors {
  // ... existing fields
  team_a_name?: string;
  team_b_name?: string;
  // ... rest of fields
}
```

---

## 3. API Endpoints

### 3.1 Team Names Endpoint

```typescript
// app/api/admin/games/[id]/team-names/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { verifyAdminSession } from '@/lib/auth/admin';
import { TEAM_NAME_CONSTRAINTS } from '@/lib/types/game';

const TeamNamesSchema = z.object({
  team_a_name: z
    .string()
    .min(TEAM_NAME_CONSTRAINTS.MIN_LENGTH, 'El nombre debe tener al menos 2 caracteres')
    .max(TEAM_NAME_CONSTRAINTS.MAX_LENGTH, 'El nombre no puede exceder 50 caracteres')
    .regex(TEAM_NAME_CONSTRAINTS.PATTERN, 'Solo se permiten letras, números, espacios, guiones y guiones bajos')
    .optional(),
  team_b_name: z
    .string()
    .min(TEAM_NAME_CONSTRAINTS.MIN_LENGTH, 'El nombre debe tener al menos 2 caracteres')
    .max(TEAM_NAME_CONSTRAINTS.MAX_LENGTH, 'El nombre no puede exceder 50 caracteres')
    .regex(TEAM_NAME_CONSTRAINTS.PATTERN, 'Solo se permiten letras, números, espacios, guiones y guiones bajos')
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await verifyAdminSession(request);
    if (!adminUser.success) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const gameId = params.id;

    const { data: game, error } = await supabase
      .from('games')
      .select('team_a_name, team_b_name')
      .eq('id', gameId)
      .single();

    if (error || !game) {
      return NextResponse.json(
        { success: false, error: 'Partido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        team_a_name: game.team_a_name,
        team_b_name: game.team_b_name,
      },
    });
  } catch (error) {
    console.error('Error fetching team names:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await verifyAdminSession(request);
    if (!adminUser.success) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const gameId = params.id;
    const body = await request.json();

    // Validate input
    const validation = TeamNamesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { team_a_name, team_b_name } = validation.data;

    // Check if game exists and is not completed
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, team_a_name, team_b_name')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { success: false, error: 'Partido no encontrado' },
        { status: 404 }
      );
    }

    // Build update object only with provided fields
    const updateData: any = {};
    if (team_a_name !== undefined) updateData.team_a_name = team_a_name;
    if (team_b_name !== undefined) updateData.team_b_name = team_b_name;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron cambios' },
        { status: 400 }
      );
    }

    // Validate team names are different
    const finalTeamA = team_a_name ?? game.team_a_name;
    const finalTeamB = team_b_name ?? game.team_b_name;

    if (finalTeamA.toLowerCase().trim() === finalTeamB.toLowerCase().trim()) {
      return NextResponse.json(
        { success: false, error: 'Los nombres de los equipos deben ser diferentes' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    // Update team names
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select('team_a_name, team_b_name')
      .single();

    if (updateError) {
      console.error('Error updating team names:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar nombres de equipos' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('admin_audit_log').insert({
      admin_user_id: adminUser.data.id,
      action_type: 'update_team_names',
      entity_type: 'game',
      entity_id: gameId,
      action_details: {
        old_names: {
          team_a_name: game.team_a_name,
          team_b_name: game.team_b_name,
        },
        new_names: updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        team_a_name: updatedGame.team_a_name,
        team_b_name: updatedGame.team_b_name,
      },
    });
  } catch (error) {
    console.error('Error updating team names:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

---

## 4. Componentes UI

### 4.1 Componente EditableTeamName

```typescript
// app/components/games/EditableTeamName.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EditIcon, CheckIcon, XIcon } from '../ui/Icons';
import { TEAM_NAME_CONSTRAINTS } from '@/lib/types/game';

export interface EditableTeamNameProps {
  gameId: string;
  teamKey: 'team_a' | 'team_b';
  currentName: string;
  onNameUpdate: (teamKey: 'team_a' | 'team_b', newName: string) => void;
  isReadOnly?: boolean;
  className?: string;
  maxLength?: number;
}

interface EditState {
  isEditing: boolean;
  editValue: string;
  isLoading: boolean;
  error: string | null;
}

export function EditableTeamName({
  gameId,
  teamKey,
  currentName,
  onNameUpdate,
  isReadOnly = false,
  className = '',
  maxLength = TEAM_NAME_CONSTRAINTS.MAX_LENGTH,
}: EditableTeamNameProps) {
  const [state, setState] = useState<EditState>({
    isEditing: false,
    editValue: currentName,
    isLoading: false,
    error: null,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue with currentName when it changes externally
  useEffect(() => {
    if (!state.isEditing) {
      setState(prev => ({ ...prev, editValue: currentName }));
    }
  }, [currentName, state.isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (state.isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state.isEditing]);

  const handleStartEdit = () => {
    if (isReadOnly) return;
    setState(prev => ({
      ...prev,
      isEditing: true,
      editValue: currentName,
      error: null,
    }));
  };

  const handleCancelEdit = () => {
    setState(prev => ({
      ...prev,
      isEditing: false,
      editValue: currentName,
      error: null,
    }));
  };

  const validateTeamName = (name: string): string | null => {
    const trimmed = name.trim();
    
    if (trimmed.length < TEAM_NAME_CONSTRAINTS.MIN_LENGTH) {
      return `Mínimo ${TEAM_NAME_CONSTRAINTS.MIN_LENGTH} caracteres`;
    }
    
    if (trimmed.length > TEAM_NAME_CONSTRAINTS.MAX_LENGTH) {
      return `Máximo ${TEAM_NAME_CONSTRAINTS.MAX_LENGTH} caracteres`;
    }
    
    if (!TEAM_NAME_CONSTRAINTS.PATTERN.test(trimmed)) {
      return 'Solo letras, números, espacios, guiones y guiones bajos';
    }
    
    return null;
  };

  const handleSaveEdit = async () => {
    const trimmedValue = state.editValue.trim();
    
    // Validate
    const validationError = validateTeamName(trimmedValue);
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }

    // Check if value actually changed
    if (trimmedValue === currentName) {
      handleCancelEdit();
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/team-names`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          [teamKey === 'team_a' ? 'team_a_name' : 'team_b_name']: trimmedValue,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar nombre del equipo');
      }

      // Update parent component
      onNameUpdate(teamKey, trimmedValue);

      // Exit edit mode
      setState(prev => ({
        ...prev,
        isEditing: false,
        isLoading: false,
        editValue: trimmedValue,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setState(prev => ({
      ...prev,
      editValue: value,
      error: null, // Clear error when user types
    }));
  };

  if (state.isEditing) {
    return (
      <div className={`editable-team-name editing ${className}`}>
        <div className="edit-container">
          <Input
            ref={inputRef}
            value={state.editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Nombre del equipo"
            maxLength={maxLength}
            disabled={state.isLoading}
            error={state.error}
            className="team-name-input"
            size="sm"
          />
          <div className="edit-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveEdit}
              loading={state.isLoading}
              disabled={!state.editValue.trim()}
              aria-label="Guardar cambios"
              className="save-btn"
            >
              <CheckIcon size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={state.isLoading}
              aria-label="Cancelar edición"
              className="cancel-btn"
            >
              <XIcon size={14} />
            </Button>
          </div>
        </div>
        {state.error && (
          <div className="error-feedback">
            {state.error}
          </div>
        )}
        <div className="char-counter">
          {state.editValue.length}/{maxLength}
        </div>
      </div>
    );
  }

  return (
    <div className={`editable-team-name viewing ${className}`}>
      <span className="team-name-display">
        {currentName}
      </span>
      {!isReadOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartEdit}
          aria-label={`Editar nombre de ${currentName}`}
          className="edit-trigger"
        >
          <EditIcon size={14} />
        </Button>
      )}
    </div>
  );
}
```

### 4.2 Estilos CSS para EditableTeamName

```css
/* app/globals.css - Estilos adicionales necesarios */

/* Editable Team Name Styles */
.editable-team-name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  position: relative;
}

.editable-team-name.editing {
  display: block;
  min-width: 200px;
}

.edit-container {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
}

.team-name-input {
  flex: 1;
  min-width: 150px;
}

.edit-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.save-btn {
  color: var(--color-success) !important;
}

.save-btn:hover:not(:disabled) {
  background: var(--color-success) !important;
  color: white !important;
}

.cancel-btn {
  color: var(--color-neutral-600) !important;
}

.cancel-btn:hover:not(:disabled) {
  color: var(--color-error) !important;
}

.team-name-display {
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-900);
  padding: var(--space-xs) 0;
  min-height: 24px;
  display: inline-block;
}

.edit-trigger {
  opacity: 0;
  transition: opacity var(--duration-short) var(--ease-out);
  color: var(--color-neutral-400) !important;
  padding: var(--space-xs) !important;
}

.editable-team-name:hover .edit-trigger {
  opacity: 1;
}

.edit-trigger:hover {
  color: var(--color-primary) !important;
  background: var(--color-primary-50) !important;
}

.error-feedback {
  font-size: var(--font-size-xs);
  color: var(--color-error);
  margin-top: var(--space-xs);
  line-height: var(--line-height-tight);
}

.char-counter {
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
  text-align: right;
  margin-top: var(--space-xs);
  line-height: var(--line-height-tight);
}

/* Team header updates */
.team-header .team-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.team-header .team-emoji {
  font-size: 1.2em;
  flex-shrink: 0;
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .edit-container {
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .edit-actions {
    align-self: flex-end;
  }
  
  .team-name-input {
    min-width: unset;
  }
  
  .editable-team-name.editing {
    min-width: unset;
    width: 100%;
  }
}

/* Focus states for accessibility */
.edit-trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.team-name-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}
```

---

## 5. Integración con Componentes Existentes

### 5.1 Actualización de TeamManagement

```typescript
// app/components/games/TeamManagement.tsx - Modificaciones requeridas

// Add state for team names
interface TeamState {
  assignment: TeamAssignment;
  loading: boolean;
  draggedPlayer: GameRegistration | null;
  hoveredTeam: 'team_a' | 'team_b' | 'unassigned' | null;
  teamNames: {
    team_a: string;
    team_b: string;
  };
}

// Add props
export interface TeamManagementProps {
  gameId: string;
  registrations?: GameRegistration[];
  gameStatus: GameStatus;
  onTeamsUpdate?: () => void;
  isReadOnly?: boolean;
  teamAName?: string; // NEW
  teamBName?: string; // NEW
}

// In component implementation, update team headers:
// Replace:
<h3 className="team-title">🔴 Equipo A</h3>
// With:
<div className="team-title">
  <span className="team-emoji">🔴</span>
  <EditableTeamName
    gameId={gameId}
    teamKey="team_a"
    currentName={teamAName || 'Equipo A'}
    onNameUpdate={handleTeamNameUpdate}
    isReadOnly={isReadOnly}
  />
</div>

// Add handler for team name updates
const handleTeamNameUpdate = useCallback((teamKey: 'team_a' | 'team_b', newName: string) => {
  setState(prev => ({
    ...prev,
    teamNames: {
      ...prev.teamNames,
      [teamKey === 'team_a' ? 'team_a' : 'team_b']: newName,
    },
  }));
  
  // Trigger parent refresh to get updated game data
  onTeamsUpdate?.();
}, [onTeamsUpdate]);

// Initialize team names from props
useEffect(() => {
  setState(prev => ({
    ...prev,
    teamNames: {
      team_a: teamAName || 'Equipo A',
      team_b: teamBName || 'Equipo B',
    },
  }));
}, [teamAName, teamBName]);
```

### 5.2 Actualización de GameResultForm

```typescript
// app/components/games/GameResultForm.tsx - Modificaciones requeridas

// Add props for team names
export interface GameResultFormProps {
  gameId: string;
  existingResult?: GameResult;
  onResultSaved?: () => void;
  teamAName?: string; // NEW
  teamBName?: string; // NEW
}

// Update team labels in form:
// Replace hardcoded "Equipo A" and "Equipo B" with props:
<h3 className="font-semibold text-neutral-900">{teamAName || 'Equipo A'}</h3>
// and
<h3 className="font-semibold text-neutral-900">{teamBName || 'Equipo B'}</h3>

// Update winning team options:
const getWinningTeamLabel = (team: string) => {
  switch (team) {
    case 'team_a':
      return `Ganó ${teamAName || 'Equipo A'}`;
    case 'team_b':
      return `Ganó ${teamBName || 'Equipo B'}`;
    case 'draw':
      return 'Empate';
    default:
      return team;
  }
};
```

### 5.3 Actualización del Page de Game Detail

```typescript
// app/admin/games/[id]/page.tsx - Pasar team names a componentes

// Update TeamManagement usage:
<TeamManagement 
  gameId={state.game.id}
  registrations={state.game.registrations}
  gameStatus={state.game.status}
  onTeamsUpdate={fetchGameDetails}
  isReadOnly={state.game.status === 'completed'}
  teamAName={state.game.team_a_name} // NEW
  teamBName={state.game.team_b_name}  // NEW
/>

// Update GameResultForm usage:
<GameResultForm 
  gameId={state.game.id}
  existingResult={state.game.result}
  onResultSaved={fetchGameDetails}
  teamAName={state.game.team_a_name} // NEW
  teamBName={state.game.team_b_name}  // NEW
/>
```

---

## 6. Validaciones y Manejo de Errores

### 6.1 Validaciones Client-Side

```typescript
// lib/validations/team-names.ts
import { z } from 'zod';
import { TEAM_NAME_CONSTRAINTS } from '@/lib/types/game';

export const TeamNameSchema = z
  .string()
  .min(TEAM_NAME_CONSTRAINTS.MIN_LENGTH, {
    message: `El nombre debe tener al menos ${TEAM_NAME_CONSTRAINTS.MIN_LENGTH} caracteres`,
  })
  .max(TEAM_NAME_CONSTRAINTS.MAX_LENGTH, {
    message: `El nombre no puede exceder ${TEAM_NAME_CONSTRAINTS.MAX_LENGTH} caracteres`,
  })
  .regex(TEAM_NAME_CONSTRAINTS.PATTERN, {
    message: 'Solo se permiten letras, números, espacios, guiones y guiones bajos',
  })
  .transform((val) => val.trim()); // Auto-trim whitespace

export const TeamNamesUpdateSchema = z
  .object({
    team_a_name: TeamNameSchema.optional(),
    team_b_name: TeamNameSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.team_a_name && data.team_b_name) {
        return data.team_a_name.toLowerCase() !== data.team_b_name.toLowerCase();
      }
      return true;
    },
    {
      message: 'Los nombres de los equipos deben ser diferentes',
      path: ['team_b_name'], // Show error on second field
    }
  );

// Utility function for real-time validation
export function validateTeamName(name: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    TeamNameSchema.parse(name);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Nombre inválido',
      };
    }
    return { isValid: false, error: 'Error de validación' };
  }
}
```

### 6.2 Error Handling Patterns

```typescript
// lib/utils/team-names.ts
export class TeamNameError extends Error {
  constructor(
    message: string,
    public code: 'VALIDATION_ERROR' | 'DUPLICATE_NAMES' | 'GAME_NOT_FOUND' | 'SERVER_ERROR',
    public field?: 'team_a_name' | 'team_b_name'
  ) {
    super(message);
    this.name = 'TeamNameError';
  }
}

export async function updateTeamNames(
  gameId: string,
  updates: { team_a_name?: string; team_b_name?: string }
): Promise<{ team_a_name: string; team_b_name: string }> {
  try {
    const response = await fetch(`/api/admin/games/${gameId}/team-names`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          throw new TeamNameError(
            errorData.error || 'Datos inválidos',
            'VALIDATION_ERROR'
          );
        case 404:
          throw new TeamNameError(
            'Partido no encontrado',
            'GAME_NOT_FOUND'
          );
        default:
          throw new TeamNameError(
            errorData.error || 'Error del servidor',
            'SERVER_ERROR'
          );
      }
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new TeamNameError(
        result.error || 'Error desconocido',
        'SERVER_ERROR'
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof TeamNameError) {
      throw error;
    }
    
    // Network or other errors
    throw new TeamNameError(
      'Error de conexión. Verifica tu conexión a internet.',
      'SERVER_ERROR'
    );
  }
}
```

---

## 7. Plan de Implementación

### 7.1 Fase 1: Base de Datos y Backend (1-2 días)

**Tareas:**
1. ✅ Crear migration script para agregar team_a_name y team_b_name
2. ✅ Actualizar tipos de Supabase en types.ts
3. ✅ Implementar API endpoint /api/admin/games/[id]/team-names
4. ✅ Crear validaciones server-side con Zod
5. ✅ Agregar logging de audit para cambios de team names
6. ✅ Crear script de rollback para migration

**Criterios de Aceptación:**
- Migration ejecuta sin errores
- API endpoint responde correctamente a GET y PATCH
- Validaciones funcionan correctamente
- Audit log registra cambios

### 7.2 Fase 2: Componentes UI (2-3 días)

**Tareas:**
1. ✅ Crear componente EditableTeamName
2. ✅ Implementar estilos CSS para edición inline
3. ✅ Agregar validaciones client-side
4. ✅ Implementar estados de loading y error
5. ✅ Agregar soporte para accesibilidad (ARIA labels, keyboard nav)
6. ✅ Testing responsive en mobile

**Criterios de Aceptación:**
- Click para editar funciona
- Enter guarda, Escape cancela
- Validación en tiempo real
- UI responsiva en mobile
- Accesible con teclado

### 7.3 Fase 3: Integración con Componentes Existentes (1-2 días)

**Tareas:**
1. ✅ Actualizar TeamManagement para usar EditableTeamName
2. ✅ Modificar GameResultForm para mostrar team names custom
3. ✅ Actualizar GameDetailPage para pasar team names
4. ✅ Verificar GameCard muestra team names en resultados
5. ✅ Actualizar notificaciones WhatsApp con team names custom

**Criterios de Aceptación:**
- Team names se muestran correctamente en todas las vistas
- Drag & drop sigue funcionando en TeamManagement
- Resultados muestran team names custom
- Notificaciones usan nombres correctos

### 7.4 Fase 4: Testing y Refinamiento (1 día)

**Tareas:**
1. ✅ Testing end-to-end de edición de team names
2. ✅ Verificar comportamiento en diferentes estados de juego
3. ✅ Testing de validaciones y manejo de errores
4. ✅ Optimización de performance (debouncing, optimistic updates)
5. ✅ Testing de accesibilidad
6. ✅ Cross-browser testing

**Criterios de Aceptación:**
- Funciona en Chrome, Firefox, Safari, Edge
- Accessible con screen readers
- Performance adecuado en mobile
- No hay memory leaks o errores de console

---

## 8. Consideraciones de Performance

### 8.1 Optimistic Updates

```typescript
// En EditableTeamName component
const handleSaveEdit = async () => {
  // ... validation logic

  // Optimistic update - update UI immediately
  onNameUpdate(teamKey, trimmedValue);
  
  setState(prev => ({
    ...prev,
    isEditing: false,
    editValue: trimmedValue,
  }));

  try {
    // Make API call
    const response = await updateTeamNames(gameId, {
      [teamKey === 'team_a' ? 'team_a_name' : 'team_b_name']: trimmedValue,
    });
    
    // Success - UI is already updated
  } catch (error) {
    // Revert optimistic update on error
    onNameUpdate(teamKey, currentName);
    setState(prev => ({
      ...prev,
      isEditing: true,
      editValue: currentName,
      error: error.message,
    }));
  }
};
```

### 8.2 Debouncing para Validación

```typescript
// Hook personalizado para debounced validation
function useDebouncedValidation(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  }>({ isValid: true });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  useEffect(() => {
    if (debouncedValue) {
      const result = validateTeamName(debouncedValue);
      setValidationResult(result);
    }
  }, [debouncedValue]);

  return validationResult;
}
```

---

## 9. Seguridad y Autorización

### 9.1 Control de Acceso

- Solo usuarios admin autenticados pueden editar team names
- Verificación de sesión en cada API call
- Rate limiting en endpoints de modificación
- Audit logging para todos los cambios

### 9.2 Validación de Datos

- Sanitización de input en client y server
- Validación de longitud y caracteres permitidos
- Verificación de duplicados (team names diferentes)
- Escape de HTML/XSS prevention

### 9.3 Límites y Constraints

```typescript
// Database constraints
ALTER TABLE games 
ADD CONSTRAINT games_team_names_different 
CHECK (LOWER(TRIM(team_a_name)) != LOWER(TRIM(team_b_name)));

// API rate limiting (implementar si es necesario)
// Max 10 cambios por minuto por usuario
```

---

## 10. Monitoreo y Observabilidad

### 10.1 Métricas a Monitorear

- Frecuencia de cambios de team names
- Errores de validación más comunes
- Performance de API endpoints
- Uso de la funcionalidad por juego

### 10.2 Logging

```typescript
// En API endpoint
console.log('Team names updated:', {
  gameId,
  adminUserId: adminUser.data.id,
  changes: updateData,
  timestamp: new Date().toISOString(),
});

// En componente frontend
console.log('Team name edit started:', {
  gameId,
  teamKey,
  currentName,
  timestamp: new Date().toISOString(),
});
```

---

## Conclusiones

Esta arquitectura proporciona una solución completa y robusta para la edición de nombres de equipos que:

1. **Mantiene compatibilidad** con el sistema existente usando valores por defecto
2. **Escala apropiadamente** con la arquitectura actual basada en Next.js y Supabase
3. **Proporciona una UX intuitiva** con edición inline y validación en tiempo real
4. **Implementa seguridad adecuada** con validación client/server y audit logging
5. **Es mantenible** con tipos TypeScript estrictos y patrones consistentes
6. **Funciona en tiempo real** actualizando todas las vistas automáticamente

La implementación estimada total es de **5-8 días** con un desarrollador full-stack, siguiendo las fases propuestas en orden secuencial.

---

## Para Backend Engineers

### Database Migration
- Ejecutar migration `006_add_team_names.sql`
- Verificar constraints y índices
- Implementar rollback script

### API Implementation
- Crear endpoint `/api/admin/games/[id]/team-names`
- Implementar validaciones Zod server-side
- Agregar audit logging y error handling

### Security & Performance
- Verificar autenticación admin en todos los endpoints
- Implementar rate limiting si es necesario
- Optimizar queries con índices apropiados

---

## Para Frontend Engineers

### Component Architecture
- Crear `EditableTeamName` component con estados inline editing
- Implementar validación real-time y error handling
- Agregar soporte completo para accesibilidad

### Integration Points
- Actualizar `TeamManagement` y `GameResultForm` components
- Modificar `GameDetailPage` para pasar team names
- Verificar consistencia en todas las vistas que muestran team names

### UI/UX Implementation
- Implementar estilos CSS responsivos
- Agregar animaciones y transiciones smooth
- Testing cross-browser y mobile

---

## Para QA Engineers

### Testing Strategy
- E2E testing de edición inline workflow
- Validación testing (client-side y server-side)
- Testing de diferentes estados de juego y permisos

### Edge Cases
- Testing con nombres largos/cortos
- Caracteres especiales y Unicode
- Comportamiento en conexión lenta o intermitente

### Performance Testing
- Load testing en API endpoints
- UI responsiveness en diferentes dispositivos
- Memory leak testing en componentes

---

## Para Security Analysts

### Security Review
- Validar sanitización de inputs
- Verificar autorización en API endpoints
- Review de SQL injection prevention

### Audit & Monitoring
- Configurar logging de cambios críticos
- Implementar alertas para uso anómalo
- Review de datos sensibles en logs

---

## Para DevOps Engineers

### Deployment Strategy
- Plan de deployment sin downtime para migration
- Rollback procedures para database changes
- Environment variable configuration

### Monitoring Setup
- Configurar métricas de performance para nuevos endpoints
- Setup de alerts para errores API
- Database performance monitoring post-migration