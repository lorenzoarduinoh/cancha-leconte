'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { useTeamDisplayNames } from '../../hooks/useTeamNames';
import { GameResult } from '../../../lib/types/game';
import { 
  PlayCircleIcon, 
  TrophyIcon, 
  CheckIcon,
  EditIcon 
} from '../ui/Icons';

export interface GameResultFormProps {
  gameId: string;
  existingResult?: GameResult | null;
  onResultSaved?: () => void;
  teamAName?: string;
  teamBName?: string;
}

interface ResultFormData {
  team_a_score: number;
  team_b_score: number;
  winning_team: 'team_a' | 'team_b' | 'draw' | null;
  notes: string;
}

interface ResultState {
  gameResult: ResultFormData;
  loading: boolean;
  error: string | null;
  success: boolean;
  fetching: boolean;
  hasExistingResult: boolean;
  isReadOnly: boolean;
}

export function GameResultForm({ gameId, existingResult, onResultSaved, teamAName, teamBName }: GameResultFormProps) {
  const [state, setState] = useState<ResultState>({
    gameResult: {
      team_a_score: 0,
      team_b_score: 0,
      winning_team: null,
      notes: '',
    },
    loading: false,
    error: null,
    success: false,
    fetching: false,
    hasExistingResult: false,
    isReadOnly: false,
  });

  // Get display names for teams
  const displayNames = useTeamDisplayNames(teamAName, teamBName);

  // Calculate winning team automatically
  const updateWinningTeam = useCallback((teamAScore: number, teamBScore: number) => {
    let winningTeam: 'team_a' | 'team_b' | 'draw' | null = null;
    
    if (teamAScore > teamBScore) {
      winningTeam = 'team_a';
    } else if (teamBScore > teamAScore) {
      winningTeam = 'team_b';
    } else if (teamAScore === teamBScore && teamAScore > 0) {
      winningTeam = 'draw';
    }

    setState(prev => ({
      ...prev,
      gameResult: {
        ...prev.gameResult,
        team_a_score: teamAScore,
        team_b_score: teamBScore,
        winning_team: winningTeam,
      }
    }));
  }, []);

  // Handle score changes
  const handleScoreChange = (team: 'team_a' | 'team_b', value: string) => {
    if (state.isReadOnly) return;
    
    const score = parseInt(value) || 0;
    const newTeamAScore = team === 'team_a' ? score : state.gameResult.team_a_score;
    const newTeamBScore = team === 'team_b' ? score : state.gameResult.team_b_score;
    
    updateWinningTeam(newTeamAScore, newTeamBScore);
  };

  // Fetch existing result from API
  const fetchExistingResult = useCallback(async () => {
    setState(prev => ({ ...prev, fetching: true, error: null }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/result`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Existing result found
          setState(prev => ({
            ...prev,
            gameResult: {
              team_a_score: data.data.team_a_score || 0,
              team_b_score: data.data.team_b_score || 0,
              winning_team: data.data.winning_team || null,
              notes: data.data.notes || '',
            },
            hasExistingResult: true,
            isReadOnly: true,
            fetching: false,
          }));
        } else {
          // No existing result
          setState(prev => ({
            ...prev,
            hasExistingResult: false,
            isReadOnly: false,
            fetching: false,
          }));
        }
      } else if (response.status === 404) {
        // No result exists yet
        setState(prev => ({
          ...prev,
          hasExistingResult: false,
          isReadOnly: false,
          fetching: false,
        }));
      } else {
        throw new Error('Error al cargar el resultado');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        fetching: false,
        error: error instanceof Error ? error.message : 'Error al cargar resultado',
      }));
    }
  }, [gameId]);

  // Initialize with existing result or fetch from API
  useEffect(() => {
    if (existingResult) {
      setState(prev => ({
        ...prev,
        gameResult: {
          team_a_score: existingResult.team_a_score || 0,
          team_b_score: existingResult.team_b_score || 0,
          winning_team: existingResult.winning_team || null,
          notes: existingResult.notes || '',
        },
        hasExistingResult: true,
        isReadOnly: true,
      }));
    } else {
      fetchExistingResult();
    }
  }, [existingResult, fetchExistingResult]);

  // Handle notes change
  const handleNotesChange = (notes: string) => {
    if (state.isReadOnly) return;
    
    setState(prev => ({
      ...prev,
      gameResult: {
        ...prev.gameResult,
        notes,
      }
    }));
  };

  // Submit result
  const handleSubmitResult = async () => {
    if (state.isReadOnly) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const method = state.hasExistingResult ? 'PUT' : 'POST';
      const response = await fetch(`/api/admin/games/${gameId}/result`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(state.gameResult),
      });

      if (!response.ok) {
        throw new Error(`Error al ${state.hasExistingResult ? 'actualizar' : 'registrar'} el resultado`);
      }

      setState(prev => ({ 
        ...prev, 
        loading: false, 
        success: true,
        hasExistingResult: true,
        isReadOnly: true
      }));
      
      onResultSaved?.();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  };

  // Enable edit mode
  const handleEnableEdit = () => {
    setState(prev => ({ ...prev, isReadOnly: false }));
  };

  const isValidResult = state.gameResult.team_a_score >= 0 && state.gameResult.team_b_score >= 0;
  const hasResult = state.gameResult.team_a_score > 0 || state.gameResult.team_b_score > 0;

  // Show loading while fetching
  if (state.fetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Cargando resultado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">
            {state.hasExistingResult 
              ? (state.isReadOnly ? 'Resultado del Partido' : 'Actualizar Resultado')
              : 'Registrar Resultado'
            }
          </h2>
          <p className="text-neutral-600">
            {state.hasExistingResult 
              ? (state.isReadOnly 
                ? 'Resultado final registrado'
                : 'Modifica el marcador y notas del partido'
              )
              : 'Ingresa el marcador final del partido'
            }
          </p>
        </div>
        
        {/* Submit Button - Moved to header */}
        {!state.isReadOnly && (
          <Button
            onClick={handleSubmitResult}
            variant="primary"
            size="lg"
            loading={state.loading}
            disabled={!isValidResult || state.success}
            className="gap-2 px-6"
          >
            <PlayCircleIcon size={18} />
            {state.loading 
              ? `${state.hasExistingResult ? 'Actualizando' : 'Guardando'}...`
              : `${state.hasExistingResult ? 'Actualizar' : 'Registrar'} Resultado`
            }
          </Button>
        )}
        
        {/* Edit Button for read-only mode */}
        {state.hasExistingResult && state.isReadOnly && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handleEnableEdit}
            className="gap-2 px-6"
          >
            <EditIcon size={18} />
            Editar Resultado
          </Button>
        )}
      </div>


      {/* Success Message */}
      {state.success && (
        <Card className="border-success bg-success/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-success">
              <CheckIcon size={24} />
              <div>
                <h3 className="font-semibold">
                  ¡Resultado {state.hasExistingResult ? 'actualizado' : 'registrado'} exitosamente!
                </h3>
                <p className="text-sm">El marcador ha sido guardado y los jugadores serán notificados.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {state.error && (
        <Card className="border-error bg-error/5">
          <CardContent className="p-6">
            <div className="text-error">
              <h3 className="font-semibold mb-1">Error al registrar resultado</h3>
              <p className="text-sm">{state.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Card */}
      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <TrophyIcon size={24} className="text-primary" />
              Marcador Final
            </CardTitle>
            {hasResult && (
              <Badge 
                variant={state.gameResult.winning_team === 'draw' ? 'warning' : 'success'}
                size="lg"
                className="gap-1"
              >
                <TrophyIcon size={14} />
                {state.gameResult.winning_team === 'draw' ? (
                  'Empate'
                ) : state.gameResult.winning_team === 'team_a' ? (
                  `Ganó ${displayNames.team_a_name}`
                ) : state.gameResult.winning_team === 'team_b' ? (
                  `Ganó ${displayNames.team_b_name}`
                ) : (
                  'Sin resultado'
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="flex items-center justify-center gap-8">
            {/* Team A */}
            <div className="text-center flex-1 max-w-[160px]">
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-neutral-900 mb-2">{displayNames.team_a_name}</h3>
                <div className="text-sm text-neutral-600">Equipo A</div>
              </div>
              <Input
                type="number"
                min="0"
                max="50"
                value={state.gameResult.team_a_score}
                onChange={(e) => handleScoreChange('team_a', e.target.value)}
                className="text-center text-3xl font-bold h-20 text-primary"
                placeholder="0"
                disabled={state.isReadOnly}
              />
            </div>

            {/* VS Separator */}
            <div className="text-center px-4">
              <div className="text-2xl font-bold text-neutral-400">VS</div>
            </div>

            {/* Team B */}
            <div className="text-center flex-1 max-w-[160px]">
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-neutral-900 mb-2">{displayNames.team_b_name}</h3>
                <div className="text-sm text-neutral-600">Equipo B</div>
              </div>
              <Input
                type="number"
                min="0"
                max="50"
                value={state.gameResult.team_b_score}
                onChange={(e) => handleScoreChange('team_b', e.target.value)}
                className="text-center text-3xl font-bold h-20 text-primary"
                placeholder="0"
                disabled={state.isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Notas del Partido</CardTitle>
          <p className="text-sm text-neutral-600">
            Información adicional sobre el desarrollo del partido (opcional)
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={state.gameResult.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Ej: Buen partido, clima perfecto, destacó el jugador X..."
            rows={4}
            maxLength={500}
            disabled={state.isReadOnly}
            className={state.isReadOnly ? 'bg-neutral-50' : ''}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-neutral-500">
              {(state.gameResult.notes || '').length}/500 caracteres
            </div>
            {state.gameResult.notes && state.isReadOnly && (
              <Badge variant="neutral" size="sm">Solo lectura</Badge>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}