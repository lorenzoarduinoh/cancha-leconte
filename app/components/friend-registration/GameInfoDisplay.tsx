'use client';

import React, { useState, useEffect } from 'react';
import { format, isAfter, differenceInHours, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { PlayerStatusIndicator } from './PlayerStatusIndicator';
import { InlineLoadingState } from './LoadingState';
import { 
  PublicGameInfo, 
  PlayerRegistrationStatus,
  FRIEND_REGISTRATION_CONSTANTS 
} from '../../../lib/types/friend-registration';

interface GameInfoDisplayProps {
  gameInfo: PublicGameInfo;
  playerStatus: PlayerRegistrationStatus | null;
  onStartRegistration: () => void;
  onCancelRegistration: (phone: string, reason?: string) => Promise<void>;
  onCheckPlayerStatus: (phone: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * GameInfoDisplay Component
 * 
 * Displays comprehensive game information in a mobile-first design.
 * Shows game details, player count, registration status, and call-to-action.
 * 
 * Features:
 * - Mobile-optimized hero section with game basics
 * - Real-time player count with progress indicator
 * - Expandable sections for detailed information
 * - Player status checking
 * - Contextual registration/cancellation actions
 */
export function GameInfoDisplay({
  gameInfo,
  playerStatus,
  onStartRegistration,
  onCancelRegistration,
  onCheckPlayerStatus,
  isLoading
}: GameInfoDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [phoneToCheck, setPhoneToCheck] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [timeUntilGame, setTimeUntilGame] = useState<{
    hours: number;
    minutes: number;
    display: string;
  } | null>(null);

  const gameDate = new Date(gameInfo.game_date);
  const now = new Date();
  
  // Calculate time until game
  useEffect(() => {
    const updateTimeUntilGame = () => {
      const now = new Date();
      const gameDate = new Date(gameInfo.game_date);
      
      if (isAfter(gameDate, now)) {
        const totalMinutes = differenceInMinutes(gameDate, now);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        let display = '';
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          display = `${days} día${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
          display = `${hours}h ${minutes}min`;
        } else {
          display = `${minutes} minutos`;
        }
        
        setTimeUntilGame({ hours, minutes, display });
      } else {
        setTimeUntilGame(null);
      }
    };

    updateTimeUntilGame();
    const interval = setInterval(updateTimeUntilGame, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [gameInfo.game_date]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Handle player status check
  const handleCheckStatus = async () => {
    if (!phoneToCheck.trim()) return;
    
    setCheckingStatus(true);
    try {
      await onCheckPlayerStatus(phoneToCheck.trim());
    } finally {
      setCheckingStatus(false);
    }
  };

  // Calculate progress percentage
  const progressPercentage = Math.min((gameInfo.current_players / gameInfo.max_players) * 100, 100);
  
  // Determine if registration is available
  const canRegister = gameInfo.is_registration_open && !gameInfo.is_full && 
                     (!timeUntilGame || timeUntilGame.hours >= FRIEND_REGISTRATION_CONSTANTS.REGISTRATION_CUTOFF_HOURS);
  
  const canJoinWaitingList = gameInfo.is_registration_open && gameInfo.is_full && 
                            gameInfo.waiting_list_count < FRIEND_REGISTRATION_CONSTANTS.MAX_WAITING_LIST_SIZE;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto max-w-lg">
        {/* Hero Section */}
        <div style={{ backgroundColor: 'var(--color-primary-600)' }} className="text-white p-8 text-center">
          <div className="space-y-4">
            {/* Game Title */}
            <h1 className="text-2xl font-bold leading-tight">
              {gameInfo.title}
            </h1>
            
            {/* Game Date and Time */}
            <div className="space-y-2">
              <div className="text-lg font-semibold">
                {format(gameDate, "EEEE d 'de' MMMM", { locale: es })}
              </div>
              <div className="text-3xl font-bold">
                {format(gameDate, 'HH:mm', { locale: es })}
              </div>
              {timeUntilGame && (
                <div className="text-sm opacity-90">
                  Faltan {timeUntilGame.display}
                </div>
              )}
            </div>
            
            {/* Location */}
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium opacity-90">
                {gameInfo.location}
              </span>
            </div>
          </div>
        </div>

        {/* Player Status Section */}
        <div className="bg-white border-b border-neutral-200 p-6">
          {/* Player Count and Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-neutral-900">Jugadores</span>
              <span className="text-primary font-bold">
                {gameInfo.current_players}/{gameInfo.max_players}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={gameInfo.current_players}
                aria-valuemin={0}
                aria-valuemax={gameInfo.max_players}
                aria-label={`${gameInfo.current_players} de ${gameInfo.max_players} jugadores registrados`}
              />
            </div>
            
            <div className="flex justify-between text-sm text-neutral-600 mt-1">
              <span>{gameInfo.spots_available} lugares disponibles</span>
              {gameInfo.waiting_list_count > 0 && (
                <span>{gameInfo.waiting_list_count} en lista de espera</span>
              )}
            </div>
          </div>

        </div>

        {/* Game Details Sections */}
        <div className="bg-white">
          {/* Game Info Section */}
          <div className="border-b border-neutral-200">
            <button
              onClick={() => toggleSection('info')}
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-neutral-50 transition-colors"
              aria-expanded={expandedSections.has('info')}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-neutral-900">Información del partido</span>
              </div>
              <svg 
                className={`w-5 h-5 text-neutral-400 transition-transform ${expandedSections.has('info') ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.has('info') && (
              <div className="px-6 pb-4 space-y-3">
                {gameInfo.description && (
                  <div>
                    <h4 className="font-medium text-neutral-800 mb-1">Descripción</h4>
                    <p className="text-neutral-600">{gameInfo.description}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-neutral-800 mb-1">Duración</h4>
                  <p className="text-neutral-600">{gameInfo.game_duration_minutes} minutos</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-neutral-800 mb-1">Costo por jugador</h4>
                  <p className="text-neutral-600 font-semibold">${gameInfo.field_cost_per_player}</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Registration Actions */}
        <div className="bg-white p-6">
          {isLoading ? (
            <InlineLoadingState message="Actualizando información..." />
          ) : (
            <div className="space-y-4">
              {canRegister && (
                <Button
                  onClick={onStartRegistration}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Registrarme para el partido
                </Button>
              )}

              {canJoinWaitingList && (
                <Button
                  onClick={onStartRegistration}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Unirme a la lista de espera
                </Button>
              )}

              {!gameInfo.is_registration_open && (
                <div className="bg-warning/20 border border-warning rounded-lg p-4 text-center">
                  <svg className="w-6 h-6 text-warning mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-warning font-medium">
                    Las inscripciones están cerradas
                  </p>
                </div>
              )}

              {timeUntilGame && timeUntilGame.hours < FRIEND_REGISTRATION_CONSTANTS.REGISTRATION_CUTOFF_HOURS && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <svg className="w-6 h-6 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium text-sm">
                    Ya no es posible registrarse (menos de {FRIEND_REGISTRATION_CONSTANTS.REGISTRATION_CUTOFF_HOURS} horas para el partido)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with branding */}
        <div className="bg-white border-t border-neutral-200 p-6 text-center">
          <div className="text-primary font-bold text-xl mb-1">
            Cancha Leconte
          </div>
          <div className="text-sm text-neutral-600">
            Organizando partidos de fútbol
          </div>
        </div>
      </div>
    </div>
  );
}