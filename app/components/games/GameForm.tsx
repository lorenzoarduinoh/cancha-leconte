'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectOption } from '../ui/Select';
import { 
  GameFormData, 
  GameFormErrors, 
  GAME_CONSTRAINTS, 
  GameWithDetails 
} from '../../../lib/types/game';

export interface GameFormProps {
  initialData?: Partial<GameWithDetails>;
  isEditing?: boolean;
  onSubmit: (data: GameFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// Helper function to format date for datetime-local input
function formatDateTimeLocalValue(dateString: string): string {
  // Parse the date string as literal values without timezone conversion
  // Input format: "2025-08-19T03:23:00+00:00" or "2025-08-19T03:23:00"
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, year, month, day, hours, minutes] = isoMatch;
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  // Fallback to Date parsing if regex doesn't match
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function GameForm({ 
  initialData, 
  isEditing = false, 
  onSubmit, 
  onCancel, 
  loading = false 
}: GameFormProps) {
  const [formData, setFormData] = useState<GameFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    game_date: initialData?.game_date ? 
      formatDateTimeLocalValue(initialData.game_date) : '',
    min_players: initialData?.min_players || 10,
    max_players: initialData?.max_players || 20,
    field_cost_per_player: initialData?.field_cost_per_player ?? null,
    game_duration_minutes: initialData?.game_duration_minutes || 90,
    status: initialData?.status || 'open',
  });

  const [errors, setErrors] = useState<GameFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  const validateForm = useCallback((): boolean => {
    const newErrors: GameFormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    } else if (formData.title.length > GAME_CONSTRAINTS.MAX_TITLE_LENGTH) {
      newErrors.title = `El título no puede superar ${GAME_CONSTRAINTS.MAX_TITLE_LENGTH} caracteres`;
    }

    // Description validation
    if (formData.description && formData.description.length > GAME_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `La descripción no puede superar ${GAME_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} caracteres`;
    }

    // Date validation
    if (!formData.game_date) {
      newErrors.game_date = 'La fecha del partido es obligatoria';
    } else {
      const gameDate = new Date(formData.game_date);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + GAME_CONSTRAINTS.ADVANCE_BOOKING_DAYS);

      if (gameDate <= now) {
        newErrors.game_date = 'La fecha del partido debe ser en el futuro';
      } else if (gameDate > maxDate) {
        newErrors.game_date = `No se pueden crear partidos con más de ${GAME_CONSTRAINTS.ADVANCE_BOOKING_DAYS} días de anticipación`;
      }
    }

    // Players validation
    if (formData.min_players < GAME_CONSTRAINTS.MIN_PLAYERS) {
      newErrors.min_players = `Mínimo ${GAME_CONSTRAINTS.MIN_PLAYERS} jugadores`;
    }

    if (formData.max_players > GAME_CONSTRAINTS.MAX_PLAYERS) {
      newErrors.max_players = `Máximo ${GAME_CONSTRAINTS.MAX_PLAYERS} jugadores`;
    }

    if (formData.min_players >= formData.max_players) {
      newErrors.max_players = 'El máximo debe ser mayor al mínimo';
    }

    // Cost validation
    if (formData.field_cost_per_player === null || formData.field_cost_per_player === '') {
      newErrors.field_cost_per_player = 'El costo por jugador es obligatorio';
    } else if (formData.field_cost_per_player < GAME_CONSTRAINTS.MIN_COST) {
      newErrors.field_cost_per_player = 'El costo no puede ser negativo';
    } else if (formData.field_cost_per_player > GAME_CONSTRAINTS.MAX_COST) {
      newErrors.field_cost_per_player = `El costo no puede superar $${GAME_CONSTRAINTS.MAX_COST}`;
    }

    // Duration validation
    if (!formData.game_duration_minutes) {
      newErrors.game_duration_minutes = 'La duración del partido es obligatoria';
    } else if (formData.game_duration_minutes < GAME_CONSTRAINTS.MIN_DURATION_MINUTES) {
      newErrors.game_duration_minutes = `La duración mínima es ${GAME_CONSTRAINTS.MIN_DURATION_MINUTES} minutos`;
    } else if (formData.game_duration_minutes > GAME_CONSTRAINTS.MAX_DURATION_MINUTES) {
      newErrors.game_duration_minutes = `La duración máxima es ${GAME_CONSTRAINTS.MAX_DURATION_MINUTES} minutos`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Ensure field_cost_per_player is a number before submitting
    const submitData: GameFormData = {
      ...formData,
      field_cost_per_player: formData.field_cost_per_player === null ? 0 : formData.field_cost_per_player
    };

    try {
      await onSubmit(submitData);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Error al guardar el partido'
      });
    }
  };

  const handleInputChange = (
    field: keyof GameFormData,
    value: string | number | null
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };


  const totalCost = (formData.field_cost_per_player || 0) * formData.max_players;
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1); // At least 1 hour in the future

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* General Error */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex items-center">
            <span className="text-red-500 mr-2" aria-hidden="true">⚠</span>
            <p className="text-red-700">{errors.general}</p>
          </div>
        </div>
      )}

      {/* Game Basics */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica del Partido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Título del Partido"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={errors.title}
            required
            maxLength={GAME_CONSTRAINTS.MAX_TITLE_LENGTH}
            placeholder="ej: Partido de los Viernes"
            helperText="Nombre descriptivo para identificar el partido"
          />

          <Textarea
            label="Descripción"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={errors.description}
            maxLength={GAME_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
            showCharCount
            rows={3}
            placeholder="Información adicional, reglas especiales, etc. (opcional)"
            helperText="Agrega detalles que los jugadores deban conocer"
          />

          <Input
            label="Fecha y Hora del Partido"
            type="datetime-local"
            value={formData.game_date}
            onChange={(e) => handleInputChange('game_date', e.target.value)}
            error={errors.game_date}
            required
            min={minDate.toISOString().slice(0, 16)}
            helperText="Selecciona cuándo se jugará el partido"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Duración del Partido"
              value={formData.game_duration_minutes}
              onChange={(e) => handleInputChange('game_duration_minutes', parseInt(e.target.value))}
              error={errors.game_duration_minutes}
              required
              options={[
                { value: 60, label: '1 hora (60 min)' },
                { value: 75, label: '1h 15min (75 min)' },
                { value: 90, label: '1h 30min (90 min) - Estándar' },
                { value: 105, label: '1h 45min (105 min)' },
                { value: 120, label: '2 horas (120 min)' },
                { value: 150, label: '2h 30min (150 min)' },
                { value: 180, label: '3 horas (180 min)' },
              ]}
              helperText="Duración estimada del partido"
            />

            <Input
              label="Duración Personalizada"
              type="number"
              value={[60, 75, 90, 105, 120, 150, 180].includes(formData.game_duration_minutes || 90) ? '' : formData.game_duration_minutes || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 15 && value <= 300) {
                  handleInputChange('game_duration_minutes', value);
                }
              }}
              min={15}
              max={300}
              placeholder="Minutos"
              helperText="Entre 15 y 300 minutos"
            />
          </div>

          {formData.game_date && formData.game_duration_minutes && (
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-info mr-2" aria-hidden="true">⏰</span>
                <p className="text-info">
                  El partido terminará aproximadamente a las{' '}
                  {(() => {
                    const startTime = new Date(formData.game_date + ':00');
                    const endTime = new Date(startTime.getTime() + (formData.game_duration_minutes * 60 * 1000));
                    return endTime.toLocaleTimeString('es-AR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    });
                  })()}
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Player Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Jugadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mínimo de Jugadores"
              type="number"
              value={formData.min_players}
              onChange={(e) => handleInputChange('min_players', parseInt(e.target.value) || 0)}
              error={errors.min_players}
              required
              min={GAME_CONSTRAINTS.MIN_PLAYERS}
              max={GAME_CONSTRAINTS.MAX_PLAYERS}
              helperText="Jugadores necesarios para confirmar el partido"
            />

            <Input
              label="Máximo de Jugadores"
              type="number"
              value={formData.max_players}
              onChange={(e) => handleInputChange('max_players', parseInt(e.target.value) || 0)}
              error={errors.max_players}
              required
              min={GAME_CONSTRAINTS.MIN_PLAYERS}
              max={GAME_CONSTRAINTS.MAX_PLAYERS}
              helperText="Límite de jugadores que pueden registrarse"
            />
          </div>

          {formData.min_players && formData.max_players && formData.min_players < formData.max_players && (
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-info mr-2" aria-hidden="true">ℹ</span>
                <p className="text-info">
                  Se pueden formar {Math.floor(formData.max_players / 2)} equipos de{' '}
                  {Math.floor(formData.max_players / 2)} jugadores cada uno
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Costos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Costo por Jugador"
            type="number"
            value={formData.field_cost_per_player === null ? '' : formData.field_cost_per_player}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                handleInputChange('field_cost_per_player', null);
              } else {
                const numValue = parseFloat(value);
                handleInputChange('field_cost_per_player', isNaN(numValue) ? 0 : numValue);
              }
            }}
            error={errors.field_cost_per_player}
            required
            min={GAME_CONSTRAINTS.MIN_COST}
            max={GAME_CONSTRAINTS.MAX_COST}
            step="1000"
            placeholder="Ingresa el costo por jugador"
            helperText="Monto que debe pagar cada jugador en pesos argentinos (usar flechas aumenta/disminuye de 1000 en 1000)"
          />

          {totalCost > 0 && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-success font-medium">Ingresos Esperados:</span>
                <span className="text-success font-bold text-lg">
                  ${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-success text-sm mt-1">
                Con {formData.max_players} jugadores × ${formData.field_cost_per_player}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="order-2 sm:order-1"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!isDirty}
          className="order-1 sm:order-2"
        >
          {loading ? 
            (isEditing ? 'Guardando Cambios...' : 'Creando Partido...') :
            (isEditing ? 'Guardar Cambios' : 'Crear Partido')
          }
        </Button>
      </div>

    </form>
  );
}