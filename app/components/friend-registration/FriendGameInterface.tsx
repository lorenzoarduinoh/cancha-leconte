'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameInfoDisplay } from './GameInfoDisplay';
import { FriendRegistrationForm } from './FriendRegistrationForm';
import { RegistrationConfirmation } from './RegistrationConfirmation';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { 
  PublicGameInfo, 
  FriendRegistrationRequest,
  FriendRegistrationResponse,
  RegistrationFlowState,
  PlayerRegistrationStatus 
} from '../../../lib/types/friend-registration';

interface FriendGameInterfaceProps {
  token: string;
}

/**
 * FriendGameInterface Component
 * 
 * Main orchestrator for the friend registration experience.
 * Handles the complete flow from viewing game details to registration confirmation.
 * 
 * Flow States:
 * - loading: Initial game data fetch
 * - viewing: Display game information with registration option
 * - registering: Show registration form
 * - confirming: Processing registration submission
 * - completed: Show success confirmation
 * - error: Display error state with recovery options
 */
export function FriendGameInterface({ token }: FriendGameInterfaceProps) {
  const [flowState, setFlowState] = useState<RegistrationFlowState['step']>('viewing');
  const [gameInfo, setGameInfo] = useState<PublicGameInfo | null>(null);
  const [registrationResult, setRegistrationResult] = useState<FriendRegistrationResponse | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerRegistrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch game information
  const fetchGameInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/games/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar la información del partido');
      }

      setGameInfo(data.data);
      setFlowState('viewing');
    } catch (err) {
      console.error('Error fetching game info:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setFlowState('error');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Check if user is already registered
  const checkPlayerStatus = useCallback(async (phoneNumber: string) => {
    if (!gameInfo) return;

    try {
      const response = await fetch(`/api/games/${token}/status?phone=${encodeURIComponent(phoneNumber)}`);
      const data = await response.json();
      
      if (response.ok) {
        setPlayerStatus(data.data);
      }
    } catch (err) {
      console.error('Error checking player status:', err);
      // Don't throw here, just log - this is optional functionality
    }
  }, [token, gameInfo]);

  // Handle registration submission
  const handleRegistration = async (registrationData: FriendRegistrationRequest) => {
    try {
      setFlowState('confirming');
      setError(null);

      const response = await fetch(`/api/games/${token}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar al jugador');
      }

      setRegistrationResult(data);
      setFlowState('completed');
      
      // Update game info with new player count
      if (gameInfo) {
        setGameInfo({
          ...gameInfo,
          current_players: gameInfo.current_players + 1,
          spots_available: Math.max(0, gameInfo.spots_available - 1),
          is_full: gameInfo.current_players + 1 >= gameInfo.max_players,
        });
      }

    } catch (err) {
      console.error('Error during registration:', err);
      setError(err instanceof Error ? err.message : 'Error durante el registro');
      setFlowState('error');
    }
  };

  // Handle cancellation
  const handleCancellation = async (phoneNumber: string, reason?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ phone: phoneNumber });
      if (reason) params.append('reason', reason);

      const response = await fetch(`/api/games/${token}/register?${params}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cancelar la inscripción');
      }

      // Refresh game info after cancellation
      await fetchGameInfo();
      
      // Clear player status
      setPlayerStatus(null);
      
    } catch (err) {
      console.error('Error during cancellation:', err);
      setError(err instanceof Error ? err.message : 'Error al cancelar');
      setFlowState('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers
  const handleStartRegistration = () => {
    setFlowState('registering');
  };

  const handleBackToGame = () => {
    setFlowState('viewing');
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    if (flowState === 'error' && !gameInfo) {
      fetchGameInfo();
    } else {
      setFlowState('viewing');
    }
  };

  // Real-time updates (simplified polling approach)
  useEffect(() => {
    if (gameInfo && flowState === 'viewing') {
      const interval = setInterval(() => {
        fetchGameInfo();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [gameInfo, flowState, fetchGameInfo]);

  // Initial load
  useEffect(() => {
    fetchGameInfo();
  }, [fetchGameInfo]);

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (flowState === 'registering') {
          handleBackToGame();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [flowState]);

  // Loading state
  if (isLoading && !gameInfo) {
    return <LoadingState />;
  }

  // Error state
  if (flowState === 'error') {
    return (
      <ErrorState 
        error={error || 'Error desconocido'}
        onRetry={handleRetry}
        canGoBack={!!gameInfo}
        onGoBack={gameInfo ? handleBackToGame : undefined}
      />
    );
  }

  // Game not found or no data
  if (!gameInfo) {
    return (
      <ErrorState 
        error="No se pudo cargar la información del partido"
        onRetry={fetchGameInfo}
        canGoBack={false}
      />
    );
  }

  // Render appropriate component based on flow state
  switch (flowState) {
    case 'viewing':
      return (
        <GameInfoDisplay
          gameInfo={gameInfo}
          playerStatus={playerStatus}
          onStartRegistration={handleStartRegistration}
          onCancelRegistration={handleCancellation}
          onCheckPlayerStatus={checkPlayerStatus}
          isLoading={isLoading}
        />
      );

    case 'registering':
      return (
        <FriendRegistrationForm
          gameInfo={gameInfo}
          onSubmit={handleRegistration}
          onCancel={handleBackToGame}
          onCheckExistingRegistration={checkPlayerStatus}
        />
      );

    case 'confirming':
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <LoadingState message="Procesando tu registro..." />
          </div>
        </div>
      );

    case 'completed':
      return (
        <RegistrationConfirmation
          gameInfo={gameInfo}
          registrationResult={registrationResult!}
          onReturnToGame={handleBackToGame}
        />
      );

    default:
      return (
        <ErrorState 
          error="Estado desconocido"
          onRetry={handleRetry}
          canGoBack={false}
        />
      );
  }
}