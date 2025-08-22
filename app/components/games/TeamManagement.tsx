'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
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
  RefreshIcon, 
  SaveIcon, 
  UserGroupIcon, 
  ScaleIcon,
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

  if (gameStatus !== 'closed' && gameStatus !== 'completed' && regs.length < 4) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <div className="flex justify-center mb-4">
            <UserGroupIcon size={48} className="text-neutral-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Gestión de Equipos No Disponible</h3>
          <p className="text-neutral-600">
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
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Gestión de Equipos</CardTitle>
                {isReadOnly && (
                  <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-full border border-neutral-200">
                    <LockIcon size={12} />
                    Solo Lectura
                  </div>
                )}
              </div>
              <p className="text-sm text-neutral-600 mt-1">
                {isReadOnly 
                  ? "Visualiza cómo se formaron los equipos. No se permiten cambios en partidos completados."
                  : "Arrastra jugadores entre equipos o usa los botones de acción"
                }
              </p>
            </div>
            
            {!isReadOnly && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRandomAssignment}
                  loading={state.loading}
                  disabled={regs.length < 2}
                  className="gap-2"
                >
                  <ShuffleIcon size={16} />
                  Asignar Aleatoriamente
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAssignments}
                  disabled={state.loading}
                  className="gap-2"
                >
                  <RefreshIcon size={16} />
                  Limpiar
                </Button>
                
                <Button
                  variant={state.saved ? "success" : "primary"}
                  size="sm"
                  onClick={handleSaveAssignment}
                  loading={state.loading}
                  disabled={!hasChanges || hasUnassignedPlayers}
                  className="gap-2"
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
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Team Balance Status */}
      <div className="flex flex-col items-center gap-3">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          isTeamBalanced 
            ? 'bg-success/10 text-success border border-success/20' 
            : 'bg-warning/10 text-warning border border-warning/20'
        }`}>
          {isTeamBalanced ? (
            <CheckIcon size={16} className="text-success" />
          ) : (
            <AlertTriangleIcon size={16} className="text-warning" />
          )} 
          {isTeamBalanced 
            ? (isReadOnly ? 'Equipos finales balanceados' : 'Equipos balanceados')
            : `Diferencia de ${Math.abs(state.assignment.team_a.length - state.assignment.team_b.length)} jugador${Math.abs(state.assignment.team_a.length - state.assignment.team_b.length) > 1 ? 'es' : ''}`
          }
        </div>
        
        {/* Unassigned Players Warning */}
        {hasUnassignedPlayers && !isReadOnly && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-error/10 text-error border border-error/20">
            <AlertTriangleIcon size={16} className="text-error" />
            {state.assignment.unassigned.length} jugador{state.assignment.unassigned.length > 1 ? 'es' : ''} sin asignar - Asigna todos los jugadores para poder guardar
          </div>
        )}
      </div>

      {/* Team Containers */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isReadOnly ? 'team-management--readonly' : ''}`}>
        {/* Team A */}
        <div
          className={`team-container ${state.hoveredTeam === 'team_a' ? 'team-container--active' : ''} ${isReadOnly ? 'team-container--readonly' : ''}`}
          onDragOver={isReadOnly ? undefined : (e) => handleDragOver(e, 'team_a')}
          onDragLeave={isReadOnly ? undefined : handleDragLeave}
          onDrop={isReadOnly ? undefined : (e) => handleDrop(e, 'team_a')}
        >
          <div className="team-header">
            <div className="flex items-center gap-2">
              <UserGroupIcon size={20} className="text-neutral-600" />
              <EditableTeamName
                teamKey="team_a_name"
                currentValue={teamNames.team_a_name}
                onUpdate={updateTeamName}
                disabled={isReadOnly}
                className="flex-1"
                placeholder="Equipo A"
              />
            </div>
            <div className="team-count">{state.assignment.team_a.length}</div>
          </div>
          
          <div className="space-y-3 min-h-[200px]">
            {state.assignment.team_a.map((player) => (
              <div
                key={player.id}
                className={`player-item ${isReadOnly ? 'player-item--readonly' : ''}`}
                draggable={!isReadOnly}
                onDragStart={isReadOnly ? undefined : () => handleDragStart(player)}
                onDragEnd={isReadOnly ? undefined : handleDragEnd}
              >
                <div className="player-avatar">
                  {getInitials(player.player_name)}
                </div>
                <div className="player-name">{player.player_name}</div>
                
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePlayer(player, 'team_b')}
                      aria-label="Mover a Equipo B"
                      className="p-1 h-6 w-6"
                    >
                      <ArrowRightIcon size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePlayer(player, 'unassigned')}
                      aria-label="Quitar del equipo"
                      className="p-1 h-6 w-6"
                    >
                      <XIcon size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {state.assignment.team_a.length === 0 && (
              <div className="text-center text-neutral-400 py-8">
                <p>{isReadOnly ? 'No hay jugadores en este equipo' : 'Arrastra jugadores aquí'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Unassigned Players */}
        <div
          className={`team-container ${state.hoveredTeam === 'unassigned' ? 'team-container--active' : ''} ${isReadOnly ? 'team-container--readonly' : ''}`}
          onDragOver={isReadOnly ? undefined : (e) => handleDragOver(e, 'unassigned')}
          onDragLeave={isReadOnly ? undefined : handleDragLeave}
          onDrop={isReadOnly ? undefined : (e) => handleDrop(e, 'unassigned')}
        >
          <div className="team-header">
            <h3 className="team-title flex items-center gap-2">
              <ArrowUpDownIcon size={20} className="text-neutral-600" />
              Sin Asignar
            </h3>
            <div className="team-count">{state.assignment.unassigned.length}</div>
          </div>
          
          <div className="space-y-3 min-h-[200px]">
            {state.assignment.unassigned.map((player) => (
              <div
                key={player.id}
                className={`player-item ${isReadOnly ? 'player-item--readonly' : ''}`}
                draggable={!isReadOnly}
                onDragStart={isReadOnly ? undefined : () => handleDragStart(player)}
                onDragEnd={isReadOnly ? undefined : handleDragEnd}
              >
                <div className="player-avatar">
                  {getInitials(player.player_name)}
                </div>
                <div className="player-name">{player.player_name}</div>
                
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePlayer(player, 'team_a')}
                      aria-label="Mover a Equipo A"
                      className="p-1 h-6 w-6 text-neutral-600 hover:text-neutral-900"
                      title="Mover a Equipo A"
                    >
                      <ArrowLeftIcon size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePlayer(player, 'team_b')}
                      aria-label="Mover a Equipo B"
                      className="p-1 h-6 w-6 text-neutral-600 hover:text-neutral-900"
                      title="Mover a Equipo B"
                    >
                      <ArrowRightIcon size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {state.assignment.unassigned.length === 0 && (
              <div className="text-center text-neutral-400 py-8">
                <p>{isReadOnly ? 'Todos los jugadores fueron asignados a equipos' : 'Todos los jugadores están asignados'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Team B */}
        <div
          className={`team-container ${state.hoveredTeam === 'team_b' ? 'team-container--active' : ''} ${isReadOnly ? 'team-container--readonly' : ''}`}
          onDragOver={isReadOnly ? undefined : (e) => handleDragOver(e, 'team_b')}
          onDragLeave={isReadOnly ? undefined : handleDragLeave}
          onDrop={isReadOnly ? undefined : (e) => handleDrop(e, 'team_b')}
        >
          <div className="team-header">
            <div className="flex items-center gap-2">
              <UserGroupIcon size={20} className="text-neutral-600" />
              <EditableTeamName
                teamKey="team_b_name"
                currentValue={teamNames.team_b_name}
                onUpdate={updateTeamName}
                disabled={isReadOnly}
                className="flex-1"
                placeholder="Equipo B"
              />
            </div>
            <div className="team-count">{state.assignment.team_b.length}</div>
          </div>
          
          <div className="space-y-3 min-h-[200px]">
            {state.assignment.team_b.map((player) => (
              <div
                key={player.id}
                className={`player-item ${isReadOnly ? 'player-item--readonly' : ''}`}
                draggable={!isReadOnly}
                onDragStart={isReadOnly ? undefined : () => handleDragStart(player)}
                onDragEnd={isReadOnly ? undefined : handleDragEnd}
              >
                <div className="player-avatar">
                  {getInitials(player.player_name)}
                </div>
                <div className="player-name">{player.player_name}</div>
                
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePlayer(player, 'team_a')}
                      aria-label="Mover a Equipo A"
                      className="p-1 h-6 w-6"
                    >
                      <ArrowLeftIcon size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePlayer(player, 'unassigned')}
                      aria-label="Quitar del equipo"
                      className="p-1 h-6 w-6"
                    >
                      <XIcon size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {state.assignment.team_b.length === 0 && (
              <div className="text-center text-neutral-400 py-8">
                <p>{isReadOnly ? 'No hay jugadores en este equipo' : 'Arrastra jugadores aquí'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}