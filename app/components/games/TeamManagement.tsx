'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EditableTeamName } from './EditableTeamName';
import { useTeamNames } from '../../hooks/useTeamNames';
import { 
  GameRegistration, 
  TeamAssignment,
  GameStatus 
} from '@/lib/types/game';
import { 
  LockIcon, 
  ShuffleIcon, 
  DicesIcon,
  RefreshIcon, 
  BrushCleaningIcon,
  SaveIcon, 
  UserGroupIcon, 
  ScaleIcon,
  ShieldIcon,
  ShieldOffIcon,
  PlayersIcon,
  CheckIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowUpDownIcon,
  XIcon
} from '../ui/Icons';

export interface TeamManagementProps {
  gameId: string;
  registrations?: GameRegistration[];
  gameStatus: GameStatus;
  onTeamsUpdate?: () => void;
  isReadOnly?: boolean;
  teamAName?: string;
  teamBName?: string;
}

interface TeamState {
  assignment: TeamAssignment;
  loading: boolean;
  draggedPlayer: GameRegistration | null;
  hoveredTeam: 'team_a' | 'team_b' | 'unassigned' | null;
  saved: boolean;
}

export function TeamManagement({
  gameId,
  registrations,
  gameStatus,
  onTeamsUpdate,
  isReadOnly = false,
  teamAName,
  teamBName
}: TeamManagementProps) {
  const [state, setState] = useState<TeamState>({
    assignment: {
      team_a: [],
      team_b: [],
      unassigned: [],
    },
    loading: false,
    draggedPlayer: null,
    hoveredTeam: null,
    saved: false,
  });

  // Team names management - use provided props when available, fallback to hook
  const { teamNames: hookTeamNames, updateTeamName } = useTeamNames(gameId);
  
  // Use provided team names (from DB) when available, especially in readonly mode
  const teamNames = {
    team_a_name: (isReadOnly && teamAName) ? teamAName : (hookTeamNames.team_a_name || teamAName || 'Equipo A'),
    team_b_name: (isReadOnly && teamBName) ? teamBName : (hookTeamNames.team_b_name || teamBName || 'Equipo B'),
  };

  // Initialize team assignment from registrations
  useEffect(() => {
    const regs = registrations || [];
    const assignment: TeamAssignment = {
      team_a: regs.filter(reg => reg.team_assignment === 'team_a'),
      team_b: regs.filter(reg => reg.team_assignment === 'team_b'),
      unassigned: regs.filter(reg => !reg.team_assignment),
    };
    
    setState(prev => ({ ...prev, assignment, saved: false }));
  }, [registrations]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Random team assignment
  const handleRandomAssignment = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ method: 'random' }),
      });

      if (!response.ok) {
        throw new Error('Error al asignar equipos aleatoriamente');
      }

      // Note: After random assignment, we need to refresh the parent to get updated registrations
      // since this changes the data structure significantly (game status, team assignments, etc.)
      onTeamsUpdate?.();
    } catch (error) {
      alert('Error al asignar equipos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [gameId, onTeamsUpdate]);

  // Save current assignment
  const handleSaveAssignment = useCallback(async () => {
    // Validate that all players are assigned before saving
    if (state.assignment.unassigned.length > 0) {
      alert(`No se pueden guardar los equipos. Hay ${state.assignment.unassigned.length} jugador${state.assignment.unassigned.length > 1 ? 'es' : ''} sin asignar.`);
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Create manual assignments in the format expected by the API
      const manual_assignments: Record<string, 'team_a' | 'team_b'> = {};
      
      // Add team_a players
      state.assignment.team_a.forEach(player => {
        manual_assignments[player.id] = 'team_a';
      });
      
      // Add team_b players
      state.assignment.team_b.forEach(player => {
        manual_assignments[player.id] = 'team_b';
      });

      const response = await fetch(`/api/admin/games/${gameId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          method: 'manual',
          manual_assignments 
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`Error al guardar la asignación de equipos: ${response.status} ${response.statusText}`);
      }

      // Show saved state (will persist until user makes changes)
      setState(prev => ({ ...prev, saved: true }));
      
      // Note: Removed onTeamsUpdate call to prevent component re-mounting
      // which was causing the saved state to reset immediately
      // Also removed setTimeout - saved state will persist until user makes modifications
    } catch (error) {
      console.error('Error saving teams:', error);
      alert('Error al guardar equipos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [gameId, state.assignment]);

  // Clear all assignments
  const handleClearAssignments = useCallback(() => {
    const regs = registrations || [];
    setState(prev => ({
      ...prev,
      assignment: {
        team_a: [],
        team_b: [],
        unassigned: regs,
      },
      saved: false,
    }));
  }, [registrations]);

  // Drag and drop handlers
  const handleDragStart = (player: GameRegistration) => {
    setState(prev => ({ ...prev, draggedPlayer: player }));
  };

  const handleDragEnd = () => {
    setState(prev => ({ ...prev, draggedPlayer: null, hoveredTeam: null }));
  };

  const handleDragOver = (e: React.DragEvent, team: 'team_a' | 'team_b' | 'unassigned') => {
    e.preventDefault();
    setState(prev => ({ ...prev, hoveredTeam: team }));
  };

  const handleDragLeave = () => {
    setState(prev => ({ ...prev, hoveredTeam: null }));
  };

  const handleDrop = (e: React.DragEvent, targetTeam: 'team_a' | 'team_b' | 'unassigned') => {
    e.preventDefault();
    const { draggedPlayer } = state;
    
    if (!draggedPlayer) return;

    // Find source team
    let sourceTeam: 'team_a' | 'team_b' | 'unassigned' | null = null;
    if (state.assignment.team_a.find(p => p.id === draggedPlayer.id)) sourceTeam = 'team_a';
    else if (state.assignment.team_b.find(p => p.id === draggedPlayer.id)) sourceTeam = 'team_b';
    else if (state.assignment.unassigned.find(p => p.id === draggedPlayer.id)) sourceTeam = 'unassigned';

    if (!sourceTeam || sourceTeam === targetTeam) {
      setState(prev => ({ ...prev, draggedPlayer: null, hoveredTeam: null }));
      return;
    }

    // Move player between teams
    setState(prev => ({
      ...prev,
      assignment: {
        ...prev.assignment,
        [sourceTeam!]: prev.assignment[sourceTeam!].filter(p => p.id !== draggedPlayer.id),
        [targetTeam]: [...prev.assignment[targetTeam], draggedPlayer],
      },
      draggedPlayer: null,
      hoveredTeam: null,
      saved: false,
    }));
  };

  // Manual player assignment
  const movePlayer = (player: GameRegistration, targetTeam: 'team_a' | 'team_b' | 'unassigned') => {
    // Find source team
    let sourceTeam: 'team_a' | 'team_b' | 'unassigned' | null = null;
    if (state.assignment.team_a.find(p => p.id === player.id)) sourceTeam = 'team_a';
    else if (state.assignment.team_b.find(p => p.id === player.id)) sourceTeam = 'team_b';
    else if (state.assignment.unassigned.find(p => p.id === player.id)) sourceTeam = 'unassigned';

    if (!sourceTeam || sourceTeam === targetTeam) return;

    setState(prev => ({
      ...prev,
      assignment: {
        ...prev.assignment,
        [sourceTeam!]: prev.assignment[sourceTeam!].filter(p => p.id !== player.id),
        [targetTeam]: [...prev.assignment[targetTeam], player],
      },
      saved: false,
    }));
  };

  const isTeamBalanced = Math.abs(state.assignment.team_a.length - state.assignment.team_b.length) <= 1;
  const regs = registrations || [];
  const hasChanges = JSON.stringify(state.assignment) !== JSON.stringify({
    team_a: regs.filter(reg => reg.team_assignment === 'team_a'),
    team_b: regs.filter(reg => reg.team_assignment === 'team_b'),
    unassigned: regs.filter(reg => !reg.team_assignment),
  });
  const hasUnassignedPlayers = state.assignment.unassigned.length > 0;

  // Show loading state when loading teams
  if (state.loading && regs.length >= 4) {
    return (
      <LoadingSpinner message="Cargando equipos..." />
    );
  }

  if (gameStatus !== 'closed' && gameStatus !== 'completed' && regs.length < 4) {
    return (
      <Card className="text-center shadow-sm border-neutral-200 rounded-xl bg-white teamsFadeInUp" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <CardContent className="p-12">
          <div className="flex items-center justify-center mb-6 teamsScaleIn" style={{ '--delay': '200ms' } as React.CSSProperties}>
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <ShieldIcon size={32} className="text-neutral-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-neutral-900 teamsFadeInUp" style={{ '--delay': '400ms' } as React.CSSProperties}>Gestión de Equipos No Disponible</h3>
          <p className="text-neutral-600 max-w-md mx-auto teamsFadeInUp" style={{ '--delay': '600ms' } as React.CSSProperties}>
            {gameStatus !== 'closed' && gameStatus !== 'completed'
              ? 'Cierra las registraciones para poder gestionar los equipos.'
              : `Se necesitan al menos 4 jugadores para formar equipos. Actualmente hay ${regs.length}.`
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 teamsFadeInUp" style={{ '--delay': '0ms' } as React.CSSProperties}>
      {/* Action Buttons and Team Balance Status */}
      <div className={`teams-action-buttons-container flex flex-wrap items-center gap-4 teamsFadeInUp ${isReadOnly ? 'justify-center' : 'justify-between'}`} style={{ '--delay': '100ms' } as React.CSSProperties}>
        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="teams-action-buttons-group flex flex-wrap gap-1">
            <button
              onClick={handleRandomAssignment}
              disabled={state.loading || regs.length < 2}
              className="teams-action-btn teams-random-btn px-6 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed teamsButtonHover"
              style={{ 
                height: '48px', 
                boxSizing: 'border-box',
                lineHeight: '1.5',
                fontSize: '14px'
              }}
            >
              <DicesIcon size={16} className="text-neutral-500" />
              Asignar Aleatoriamente
            </button>
            
            <button
              onClick={handleClearAssignments}
              disabled={state.loading}
              className="teams-action-btn teams-clear-btn px-6 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed teamsButtonHover"
              style={{ 
                height: '48px', 
                boxSizing: 'border-box',
                lineHeight: '1.5',
                fontSize: '14px'
              }}
            >
              <BrushCleaningIcon size={16} className="text-neutral-500" />
              Limpiar
            </button>
            
            <button
              onClick={handleSaveAssignment}
              disabled={state.loading || !hasChanges || hasUnassignedPlayers}
              className={`teams-action-btn teams-save-btn px-6 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed teamsButtonHover ${
                state.saved 
                  ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm'
                  : 'bg-green-600 hover:bg-green-700 text-white border border-green-600'
              }`}
              style={{ 
                height: '48px', 
                boxSizing: 'border-box',
                lineHeight: '1.5',
                fontSize: '14px'
              }}
              title={hasUnassignedPlayers ? `No se puede guardar: ${state.assignment.unassigned.length} jugador${state.assignment.unassigned.length > 1 ? 'es' : ''} sin asignar` : undefined}
            >
              {state.saved ? (
                <>
                  <CheckIcon size={16} />
                  Equipos Guardados
                </>
              ) : (
                <>
                  <SaveIcon size={16} />
                  Guardar Equipos
                </>
              )}
            </button>
          </div>
        )}

        {/* Status Alerts */}
        <div className="teams-status-container" style={{ display: 'flex', justifyContent: 'center' }}>
          {/* Unassigned Players Warning */}
          {hasUnassignedPlayers && !isReadOnly ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200 teamsBadgeFloat" style={{ '--delay': '200ms' } as React.CSSProperties}>
              <AlertTriangleIcon size={16} className="text-red-700" />
              {state.assignment.unassigned.length} jugador{state.assignment.unassigned.length > 1 ? 'es' : ''} sin asignar
            </div>
          ) : (
            /* Team Balance Status - Show when all players are assigned */
            <div className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium teamsBadgeFloat ${
              isTeamBalanced 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`} style={{ '--delay': '200ms' } as React.CSSProperties}>
              {isTeamBalanced ? (
                <CheckIcon size={16} className="text-green-700" />
              ) : (
                <AlertTriangleIcon size={16} className="text-amber-700" />
              )} 
              {isTeamBalanced 
                ? (isReadOnly ? 'Equipos finales, solo lectura' : 'Equipos balanceados')
                : `Diferencia de ${Math.abs(state.assignment.team_a.length - state.assignment.team_b.length)} jugador${Math.abs(state.assignment.team_a.length - state.assignment.team_b.length) > 1 ? 'es' : ''}`
              }
            </div>
          )}
        </div>
      </div>

      <div className="teamsScaleIn" style={{ marginTop: '32px', '--delay': '300ms' } as React.CSSProperties}>
        {/* Team Containers - New Design */}
      <Card className="shadow-sm border-neutral-200 rounded-xl bg-white teamsCardHover">
        <CardContent className="p-8">
          {/* Teams Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Team A */}
            <div
              className={`bg-white border border-neutral-200 rounded-xl p-6 min-h-[300px] teamsTeamContainer teamsSlideInLeft ${
                state.hoveredTeam === 'team_a' ? 'drag-hover' : ''
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
              style={{ '--delay': '400ms' } as React.CSSProperties}
              onDragOver={isReadOnly ? undefined : (e) => handleDragOver(e, 'team_a')}
              onDragLeave={isReadOnly ? undefined : handleDragLeave}
              onDrop={isReadOnly ? undefined : (e) => handleDrop(e, 'team_a')}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-neutral-200" style={{ minHeight: '60px' }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center" style={{ marginLeft: '8px' }}>
                    <ShieldIcon size={18} className="text-blue-600" />
                  </div>
                  <EditableTeamName
                    teamKey="team_a_name"
                    currentValue={teamNames.team_a_name}
                    onUpdate={updateTeamName}
                    disabled={isReadOnly}
                    className="flex-1"
                    placeholder="Equipo A"
                  />
                </div>
                <div className="px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium" style={{ marginRight: '8px' }}>
                  {state.assignment.team_a.length}
                </div>
              </div>
              
              {/* Team Players */}
              <div className="space-y-3">
                {state.assignment.team_a.map((player, index) => (
                  <div
                    key={player.id}
                    className={`group relative bg-white border border-neutral-200 rounded-xl p-4 teamsPlayerCard teamsPlayerStagger ${
                      !isReadOnly ? 'hover:border-green-200 hover:bg-green-50/30 cursor-grab active:cursor-grabbing' : 'cursor-default'
                    } ${state.draggedPlayer?.id === player.id ? 'dragging' : ''}`}
                    style={{ 
                      '--delay': `${500 + index * 100}ms`,
                      margin: '6px'
                    } as React.CSSProperties}
                    draggable={!isReadOnly}
                    onDragStart={isReadOnly ? undefined : () => handleDragStart(player)}
                    onDragEnd={isReadOnly ? undefined : handleDragEnd}
                  >
                    <div className="teams-player-card-content flex items-center gap-4">
                      {/* First Row: Avatar + Name */}
                      <div className="teams-player-info-row flex items-center gap-4 flex-1">
                        {/* Player Avatar */}
                        <div className="w-10 h-10 text-white rounded-lg flex items-center justify-center font-medium text-sm bg-gradient-to-br from-blue-500 to-blue-600">
                          {getInitials(player.player_name)}
                        </div>
                        
                        {/* Player Name */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 truncate">{player.player_name}</div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {!isReadOnly && (
                        <div className="teams-player-card-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayer(player, 'team_b')}
                            aria-label="Mover a Equipo B"
                            className="teams-player-card-action-btn p-1 h-7 w-7 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                          >
                            {teamNames.team_b_name}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayer(player, 'unassigned')}
                            aria-label="Quitar del equipo"
                            className="teams-player-card-action-btn teams-player-remove-btn p-1 h-7 w-7 text-neutral-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <XIcon size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {state.assignment.team_a.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center" style={{ marginTop: '60px' }}>
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                      <PlayersIcon size={24} className="text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 text-sm">
                      {isReadOnly ? 'No hay jugadores en este equipo' : 'Arrastra jugadores aquí'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Unassigned Players */}
            <div
              className={`bg-white border border-neutral-200 rounded-xl p-6 min-h-[300px] teamsTeamContainer teamsFadeInUp ${
                state.hoveredTeam === 'unassigned' ? 'drag-hover' : ''
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
              style={{ '--delay': '500ms' } as React.CSSProperties}
              onDragOver={isReadOnly ? undefined : (e) => handleDragOver(e, 'unassigned')}
              onDragLeave={isReadOnly ? undefined : handleDragLeave}
              onDrop={isReadOnly ? undefined : (e) => handleDrop(e, 'unassigned')}
            >
              {/* Unassigned Header */}
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-neutral-200" style={{ minHeight: '60px' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center" style={{ marginLeft: '8px' }}>
                    <ShieldOffIcon size={18} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">Sin Asignar</h3>
                </div>
                <div className="px-4 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium" style={{ marginRight: '8px' }}>
                  {state.assignment.unassigned.length}
                </div>
              </div>
              
              {/* Unassigned Players */}
              <div className="space-y-3">
                {state.assignment.unassigned.map((player, index) => (
                  <div
                    key={player.id}
                    className={`group relative bg-white border border-neutral-200 rounded-xl p-4 teamsPlayerCard teamsPlayerStagger ${
                      !isReadOnly ? 'hover:border-amber-200 hover:bg-amber-50/30 cursor-grab active:cursor-grabbing' : 'cursor-default'
                    } ${state.draggedPlayer?.id === player.id ? 'dragging' : ''}`}
                    style={{ 
                      '--delay': `${600 + index * 100}ms`,
                      margin: '6px'
                    } as React.CSSProperties}
                    draggable={!isReadOnly}
                    onDragStart={isReadOnly ? undefined : () => handleDragStart(player)}
                    onDragEnd={isReadOnly ? undefined : handleDragEnd}
                  >
                    <div className="teams-player-card-content flex items-center gap-4">
                      {/* First Row: Avatar + Name */}
                      <div className="teams-player-info-row flex items-center gap-4 flex-1">
                        {/* Player Avatar */}
                        <div className="w-10 h-10 text-white rounded-lg flex items-center justify-center font-medium text-sm bg-gradient-to-br from-amber-500 to-amber-600">
                          {getInitials(player.player_name)}
                        </div>
                        
                        {/* Player Name */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 truncate">{player.player_name}</div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {!isReadOnly && (
                        <div className="teams-player-card-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayer(player, 'team_a')}
                            aria-label="Mover a Equipo A"
                            className="teams-player-card-action-btn p-1 h-7 w-7 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                            title="Mover a Equipo A"
                          >
                            {teamNames.team_a_name}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayer(player, 'team_b')}
                            aria-label="Mover a Equipo B"
                            className="teams-player-card-action-btn p-1 h-7 w-7 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                            title="Mover a Equipo B"
                          >
                            {teamNames.team_b_name}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {state.assignment.unassigned.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center" style={{ marginTop: '60px' }}>
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                      <ArrowUpDownIcon size={24} className="text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 text-sm">
                      {isReadOnly ? 'Todos los jugadores fueron asignados a equipos' : 'Todos los jugadores están asignados'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Team B */}
            <div
              className={`bg-white border border-neutral-200 rounded-xl p-6 min-h-[300px] teamsTeamContainer teamsSlideInRight ${
                state.hoveredTeam === 'team_b' ? 'drag-hover' : ''
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
              style={{ '--delay': '600ms' } as React.CSSProperties}
              onDragOver={isReadOnly ? undefined : (e) => handleDragOver(e, 'team_b')}
              onDragLeave={isReadOnly ? undefined : handleDragLeave}
              onDrop={isReadOnly ? undefined : (e) => handleDrop(e, 'team_b')}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-neutral-200" style={{ minHeight: '60px' }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center" style={{ marginLeft: '8px' }}>
                    <ShieldIcon size={18} className="text-green-600" />
                  </div>
                  <EditableTeamName
                    teamKey="team_b_name"
                    currentValue={teamNames.team_b_name}
                    onUpdate={updateTeamName}
                    disabled={isReadOnly}
                    className="flex-1"
                    placeholder="Equipo B"
                  />
                </div>
                <div className="px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium" style={{ marginRight: '8px' }}>
                  {state.assignment.team_b.length}
                </div>
              </div>
              
              {/* Team Players */}
              <div className="space-y-3">
                {state.assignment.team_b.map((player, index) => (
                  <div
                    key={player.id}
                    className={`group relative bg-white border border-neutral-200 rounded-xl p-4 teamsPlayerCard teamsPlayerStagger ${
                      !isReadOnly ? 'hover:border-green-200 hover:bg-green-50/30 cursor-grab active:cursor-grabbing' : 'cursor-default'
                    } ${state.draggedPlayer?.id === player.id ? 'dragging' : ''}`}
                    style={{ 
                      '--delay': `${700 + index * 100}ms`,
                      margin: '6px'
                    } as React.CSSProperties}
                    draggable={!isReadOnly}
                    onDragStart={isReadOnly ? undefined : () => handleDragStart(player)}
                    onDragEnd={isReadOnly ? undefined : handleDragEnd}
                  >
                    <div className="teams-player-card-content flex items-center gap-4">
                      {/* First Row: Avatar + Name */}
                      <div className="teams-player-info-row flex items-center gap-4 flex-1">
                        {/* Player Avatar */}
                        <div className="w-10 h-10 text-white rounded-lg flex items-center justify-center font-medium text-sm bg-gradient-to-br from-green-500 to-green-600">
                          {getInitials(player.player_name)}
                        </div>
                        
                        {/* Player Name */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 truncate">{player.player_name}</div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {!isReadOnly && (
                        <div className="teams-player-card-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayer(player, 'team_a')}
                            aria-label="Mover a Equipo A"
                            className="teams-player-card-action-btn p-1 h-7 w-7 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                          >
                            {teamNames.team_a_name}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => movePlayer(player, 'unassigned')}
                            aria-label="Quitar del equipo"
                            className="teams-player-card-action-btn teams-player-remove-btn p-1 h-7 w-7 text-neutral-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <XIcon size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {state.assignment.team_b.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center" style={{ marginTop: '60px' }}>
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                      <PlayersIcon size={24} className="text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 text-sm">
                      {isReadOnly ? 'No hay jugadores en este equipo' : 'Arrastra jugadores aquí'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

    </div>
  );
}