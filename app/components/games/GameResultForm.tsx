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
  CheckIcon,
  EditIcon 
} from '../ui/Icons';

// Animation styles
const animationStyles = `
  .fadeInUp {
    animation: fadeInUp 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translate3d(0, 40px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .scaleInBounce {
    animation: scaleInBounce 0.4s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes scaleInBounce {
    0% {
      opacity: 0;
      transform: scale3d(0.3, 0.3, 1);
    }
    50% {
      transform: scale3d(1.05, 1.05, 1);
    }
    70% {
      transform: scale3d(0.9, 0.9, 1);
    }
    100% {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  
  .slideDownBounce {
    animation: slideDownBounce 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes slideDownBounce {
    0% {
      opacity: 0;
      transform: translate3d(0, -60px, 0);
    }
    60% {
      opacity: 1;
      transform: translate3d(0, 10px, 0);
    }
    100% {
      transform: translate3d(0, 0, 0);
    }
  }
  
  .pulseOnLoad {
    animation: pulseOnLoad 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes pulseOnLoad {
    0% {
      opacity: 0;
      transform: scale3d(0.95, 0.95, 1) rotate(0deg);
    }
    50% {
      transform: scale3d(1.05, 1.05, 1) rotate(180deg);
    }
    100% {
      opacity: 1;
      transform: scale3d(1, 1, 1) rotate(360deg);
    }
  }
  
  .buttonHover {
    transition: all 0.2s ease-in-out;
    transform: translate3d(0, 0, 0);
  }
  
  .buttonHover:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .inputFocus {
    transition: all 0.2s ease-in-out;
  }
  
  .inputFocus:focus {
    transform: scale3d(1.02, 1.02, 1);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .messageSlideIn {
    animation: messageSlideIn 0.4s ease-out both;
  }
  
  @keyframes messageSlideIn {
    0% {
      opacity: 0;
      transform: translate3d(0, -20px, 0) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .fadeInUp,
    .scaleInBounce,
    .slideDownBounce,
    .pulseOnLoad,
    .messageSlideIn {
      animation: none;
      opacity: 1;
      transform: none;
    }
    
    .buttonHover:hover,
    .inputFocus:focus {
      transform: none;
    }
  }
`;

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
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className="space-y-8" style={{ marginTop: '4px' }}>


      {/* Main Result Card - Consistent with other sections */}
      <Card className="shadow-sm border-neutral-200 rounded-xl bg-white fadeInUp" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <CardContent className="p-8">
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mb-8">
            {!state.isReadOnly && (
              <Button
                onClick={handleSubmitResult}
                variant="success"
                size="sm"
                loading={state.loading}
                disabled={!isValidResult || state.success}
                className="gap-2 px-6 text-sm font-medium bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm rounded-xl buttonHover fadeInUp"
                style={{ 
                  height: '48px', 
                  boxSizing: 'border-box',
                  lineHeight: '1.5',
                  fontSize: '14px',
                  '--delay': '200ms'
                } as React.CSSProperties}
              >
                <PlayCircleIcon size={16} />
                {state.loading 
                  ? `${state.hasExistingResult ? 'Actualizando' : 'Guardando'}...`
                  : `${state.hasExistingResult ? 'Actualizar' : 'Registrar'} Resultado`
                }
              </Button>
            )}
            
            {/* Edit Button for read-only mode */}
            {state.hasExistingResult && state.isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEnableEdit}
                className="gap-2 px-6 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-300 rounded-xl buttonHover fadeInUp mt-6"
                style={{ 
                  height: '48px', 
                  boxSizing: 'border-box',
                  lineHeight: '1.5',
                  fontSize: '14px',
                  '--delay': '200ms'
                } as React.CSSProperties}
              >
                <EditIcon size={16} />
                Editar Resultado
              </Button>
            )}
          </div>

          {/* Success/Error Messages */}
          {state.success && (
            <div className="mb-6 bg-green-100 border border-green-200 rounded-lg p-4 messageSlideIn">
              <div className="flex items-center gap-3 text-green-700">
                <CheckIcon size={20} />
                <div>
                  <h4 className="font-semibold text-sm">
                    ¡Resultado {state.hasExistingResult ? 'actualizado' : 'registrado'} exitosamente!
                  </h4>
                  <p className="text-sm">El marcador ha sido guardado y los jugadores serán notificados.</p>
                </div>
              </div>
            </div>
          )}

          {state.error && (
            <div className="mb-6 bg-red-100 border border-red-200 rounded-lg p-4 messageSlideIn">
              <div className="text-red-700">
                <h4 className="font-semibold text-sm mb-1">Error al registrar resultado</h4>
                <p className="text-sm">{state.error}</p>
              </div>
            </div>
          )}

          {/* Winner Badge */}
          {hasResult && (
            <div className="flex justify-center mb-8">
              <div className={`px-6 py-3 rounded-xl text-lg font-semibold border slideDownBounce ${
                state.gameResult.winning_team === 'draw' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              }`} style={{ '--delay': '300ms' } as React.CSSProperties}>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/>
                    <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/>
                    <path d="M18 9h1.5a1 1 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/>
                    <path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>
                  </svg>
                  {state.gameResult.winning_team === 'draw' ? (
                    'Empate'
                  ) : state.gameResult.winning_team === 'team_a' ? (
                    `Ganó ${displayNames.team_a_name}`
                  ) : state.gameResult.winning_team === 'team_b' ? (
                    `Ganó ${displayNames.team_b_name}`
                  ) : (
                    'Sin resultado'
                  )}
                </div>
              </div>
            </div>
          )}

            {/* Score Layout - Clean and Readable */}
            <div className="grid grid-cols-3 gap-8 items-center mb-8">
              {/* Team A */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 scaleInBounce" style={{ '--delay': '400ms' } as React.CSSProperties}>
                  A
                </div>
                <h4 className="text-lg font-semibold text-neutral-900 mb-3 leading-tight fadeInUp" style={{ marginBottom: '20px', '--delay': '500ms' } as React.CSSProperties}>
                  {displayNames.team_a_name}
                </h4>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={state.gameResult.team_a_score}
                  onChange={(e) => handleScoreChange('team_a', e.target.value)}
                  className="text-center text-2xl font-bold h-16 border-2 focus:border-blue-500 inputFocus fadeInUp"
                  placeholder="0"
                  disabled={state.isReadOnly}
                  style={{ '--delay': '600ms' } as React.CSSProperties}
                />
              </div>

              {/* VS Separator */}
              <div className="text-center">
                <div className="w-16 h-16 border border-neutral-200 rounded-full flex items-center justify-center bg-white mx-auto shadow-md pulseOnLoad" style={{ '--delay': '450ms' } as React.CSSProperties}>
                  <span className="text-lg font-extrabold text-neutral-500">VS</span>
                </div>
              </div>

              {/* Team B */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 scaleInBounce" style={{ '--delay': '500ms' } as React.CSSProperties}>
                  B
                </div>
                <h4 className="text-lg font-semibold text-neutral-900 mb-3 leading-tight fadeInUp" style={{ marginBottom: '20px', '--delay': '600ms' } as React.CSSProperties}>
                  {displayNames.team_b_name}
                </h4>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={state.gameResult.team_b_score}
                  onChange={(e) => handleScoreChange('team_b', e.target.value)}
                  className="text-center text-2xl font-bold h-16 border-2 focus:border-green-500 inputFocus fadeInUp"
                  placeholder="0"
                  disabled={state.isReadOnly}
                  style={{ '--delay': '700ms' } as React.CSSProperties}
                />
              </div>
            </div>

        </CardContent>
      </Card>

      {/* Notes Section - Separate Module */}
      <div style={{ marginTop: '32px' }}>
      <Card className="shadow-sm border-neutral-200 rounded-xl bg-white fadeInUp" style={{ '--delay': '100ms' } as React.CSSProperties}>
        <CardContent className="p-8">
          {/* Header Section - Consistent with other sections */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 12h-5"/>
                <path d="M15 8h-5"/>
                <path d="M19 17V5a2 2 0 0 0-2-2H4"/>
                <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900">Notas del Partido</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Información adicional sobre el desarrollo del partido (opcional)
              </p>
            </div>
          </div>

          <Textarea
            value={state.gameResult.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Ej: Buen partido, clima perfecto, destacó el jugador X..."
            rows={3}
            maxLength={500}
            disabled={state.isReadOnly}
            className={`${state.isReadOnly ? 'bg-neutral-50' : ''} border-neutral-200 focus:border-green-500 inputFocus fadeInUp`}
            style={{ marginTop: '16px', '--delay': '200ms' } as React.CSSProperties}
          />
          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-neutral-500">
              {(state.gameResult.notes || '').length}/500 caracteres
            </div>
            {state.gameResult.notes && state.isReadOnly && (
              <div className="px-2 py-1 bg-neutral-100 text-neutral-600 border border-neutral-200 rounded text-xs font-medium">
                Solo lectura
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      </div>
    </>
  );
}