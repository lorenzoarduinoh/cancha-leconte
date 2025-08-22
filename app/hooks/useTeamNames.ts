'use client';

import { useState, useEffect, useCallback } from 'react';
import { TeamNamesData, GAME_CONSTRAINTS } from '@/lib/types/game';

export interface UseTeamNamesReturn {
  teamNames: TeamNamesData;
  isLoading: boolean;
  error: string | null;
  updateTeamName: (teamKey: 'team_a_name' | 'team_b_name', newName: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  resetError: () => void;
}

export function useTeamNames(gameId: string): UseTeamNamesReturn {
  const [state, setState] = useState({
    teamNames: {
      team_a_name: GAME_CONSTRAINTS.DEFAULT_TEAM_A_NAME,
      team_b_name: GAME_CONSTRAINTS.DEFAULT_TEAM_B_NAME,
    },
    isLoading: true,
    error: null as string | null,
  });

  // Fetch current team names from API
  const fetchTeamNames = useCallback(async () => {
    if (!gameId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/team-names`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al obtener nombres de equipos');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const newTeamNames = {
          team_a_name: data.data.team_a_name || GAME_CONSTRAINTS.DEFAULT_TEAM_A_NAME,
          team_b_name: data.data.team_b_name || GAME_CONSTRAINTS.DEFAULT_TEAM_B_NAME,
        };

        setState(prev => ({
          ...prev,
          teamNames: newTeamNames,
          isLoading: false,
          error: null,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [gameId]);

  // Update a specific team name
  const updateTeamName = useCallback(async (
    teamKey: 'team_a_name' | 'team_b_name', 
    newName: string
  ): Promise<boolean> => {
    const trimmedName = newName.trim();
    
    // Validate name
    if (trimmedName.length < GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH) {
      setState(prev => ({
        ...prev,
        error: `El nombre debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`
      }));
      return false;
    }
    
    if (trimmedName.length > GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH) {
      setState(prev => ({
        ...prev,
        error: `El nombre no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`
      }));
      return false;
    }

    // Check for forbidden characters
    if (!/^[a-zA-ZÀ-ÿ0-9\s\-_.']+$/.test(trimmedName)) {
      setState(prev => ({
        ...prev,
        error: 'Solo se permiten letras, números, espacios y caracteres básicos'
      }));
      return false;
    }

    // If no change, return success
    if (trimmedName === state.teamNames[teamKey]) {
      return true;
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
          [teamKey]: trimmedName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar nombre del equipo');
      }

      // Update state immediately - no need to refetch
      const newTeamNames = {
        ...state.teamNames,
        [teamKey]: trimmedName
      };

      setState(prev => ({
        ...prev,
        teamNames: newTeamNames,
        isLoading: false,
        error: null,
      }));

      return true;

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
      return false;
    }
  }, [gameId, state.teamNames]);

  // Fetch team names only once when component mounts
  useEffect(() => {
    if (gameId) {
      fetchTeamNames();
    }
  }, [gameId, fetchTeamNames]);

  // Reset error state
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    teamNames: state.teamNames,
    isLoading: state.isLoading,
    error: state.error,
    updateTeamName,
    refetch: fetchTeamNames,
    resetError,
  };
}

// Utility hook for getting team display names with fallbacks
export function useTeamDisplayNames(
  teamAName?: string, 
  teamBName?: string
): TeamNamesData {
  return {
    team_a_name: teamAName || GAME_CONSTRAINTS.DEFAULT_TEAM_A_NAME,
    team_b_name: teamBName || GAME_CONSTRAINTS.DEFAULT_TEAM_B_NAME,
  };
}