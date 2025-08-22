'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useTeamDisplayNames } from '../../hooks/useTeamNames';
import { 
  GameWithDetails, 
  GAME_STATUS_LABELS,
  PAYMENT_STATUS_LABELS 
} from '../../../lib/types/game';

export interface GameCardProps {
  game: GameWithDetails;
  onEdit?: (game: GameWithDetails) => void;
  onView?: (game: GameWithDetails) => void;
  onCancel?: (game: GameWithDetails) => void;
  onManageTeams?: (game: GameWithDetails) => void;
  onViewPayments?: (game: GameWithDetails) => void;
  showActions?: boolean;
  className?: string;
}

export function GameCard({
  game,
  onEdit,
  onView,
  onCancel,
  onManageTeams,
  onViewPayments,
  showActions = true,
  className = ''
}: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  
  // Get display names for teams
  const displayNames = useTeamDisplayNames(game.team_a_name, game.team_b_name);
  
  // Debug logging
  if (!game.id) {
    console.error('GameCard received game without ID:', game);
  }

  const formatDate = (dateString: string) => {
    // Parse the date string as literal values without timezone conversion
    // Input format: "2025-08-19T05:46:00+00:00" or "2025-08-19T05:46:00"
    const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    
    if (isoMatch) {
      // Extract date/time components directly without timezone conversion
      const [, year, month, day, hours, minutes] = isoMatch;
      const gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const now = new Date();
      const diffInHours = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Format manually to maintain user's intended time
      const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      
      const weekday = weekdays[gameDate.getDay()];
      const monthName = months[gameDate.getMonth()];
      const dayNum = gameDate.getDate();
      const hour = gameDate.getHours().toString().padStart(2, '0');
      const minute = gameDate.getMinutes().toString().padStart(2, '0');
      const period = gameDate.getHours() < 12 ? 'a. m.' : 'p. m.';
      const displayHour = gameDate.getHours() === 0 ? 12 : gameDate.getHours() > 12 ? gameDate.getHours() - 12 : gameDate.getHours();
      
      const formattedDate = `${weekday}, ${dayNum} ${monthName}, ${displayHour.toString().padStart(2, '0')}:${minute} ${period}`;
      
      // Add relative time for upcoming games
      if (diffInHours > 0 && diffInHours < 24) {
        const hoursRounded = Math.round(diffInHours);
        return `${formattedDate} (en ${hoursRounded}h)`;
      } else if (diffInHours > 24 && diffInHours < 168) {
        const days = Math.round(diffInHours / 24);
        return `${formattedDate} (en ${days}d)`;
      }
      
      return formattedDate;
    }
    
    // Fallback to original method if regex doesn't match
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    };

    const formattedDate = date.toLocaleDateString('es-AR', dateOptions);
    
    if (diffInHours > 0 && diffInHours < 24) {
      const hours = Math.round(diffInHours);
      return `${formattedDate} (en ${hours}h)`;
    } else if (diffInHours > 24 && diffInHours < 168) {
      const days = Math.round(diffInHours / 24);
      return `${formattedDate} (en ${days}d)`;
    }
    
    return formattedDate;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'neutral';
      case 'open':
        return 'success';
      case 'closed':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'neutral';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const playerProgress = game.max_players > 0 ? 
    (game.current_players / game.max_players) * 100 : 0;

  const isPastGame = new Date(game.game_date) < new Date();
  const canEdit = !isPastGame && game.status !== 'completed' && game.status !== 'cancelled';
  const canCancel = !isPastGame && game.status !== 'completed' && game.status !== 'cancelled';
  const canManageTeams = game.status === 'closed' && game.current_players >= game.min_players;

  // Duration and live status calculations
  const duration = game.game_duration_minutes || 90;
  const gameStart = new Date(game.game_date);
  const gameEnd = new Date(gameStart.getTime() + (duration * 60 * 1000));
  const now = new Date();
  
  const isGameInProgress = now >= gameStart && now < gameEnd && (game.status === 'open' || game.status === 'closed' || game.status === 'in_progress');
  const shouldBeCompleted = now >= gameEnd && (game.status !== 'completed' && game.status !== 'cancelled');
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };
  
  // Calculate payment stats
  const paidRegistrations = game.registrations?.filter(reg => reg.payment_status === 'paid').length || 0;
  const paymentRate = game.current_players > 0 ? 
    Math.round((paidRegistrations / game.current_players) * 100) : 0;

  // Handle navigation to result registration
  const handleResultRegistration = () => {
    router.push(`/admin/games/${game.id}?tab=resultado`);
  };

  return (
    <div 
      className={`game-card ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Partido: ${game.title}`}
    >
      {/* Header */}
      <div className="game-card-header">
        <div className="flex-1">
          <h3 className="game-card-title">
            {game.title}
          </h3>
          {game.description && (
            <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
              {game.description}
            </p>
          )}
        </div>
        
        <Badge 
          variant={getStatusVariant(game.status)}
          size="sm"
          aria-label={`Estado: ${GAME_STATUS_LABELS[game.status]}`}
        >
          {GAME_STATUS_LABELS[game.status]}
        </Badge>
      </div>

      {/* Date and Time */}
      <div className="game-card-date">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <time dateTime={game.game_date}>
            {formatDate(game.game_date)}
          </time>
        </span>
        
        {/* Duration info */}
        <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Duración: {formatDuration(duration)}
          </span>
          
          {game.status === 'in_progress' || isGameInProgress ? (
            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              EN VIVO
            </span>
          ) : shouldBeCompleted ? (
            <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Debe actualizarse
            </span>
          ) : null}
        </div>
      </div>

      {/* Players Progress */}
      <div className="game-card-players">
        <div className="game-card-players-count">
          {game.current_players}/{game.max_players} jugadores
        </div>
        
        <div className="game-card-progress" role="progressbar" aria-valuemin={0} aria-valuemax={game.max_players} aria-valuenow={game.current_players}>
          <div 
            className="game-card-progress-bar"
            style={{ width: `${Math.min(playerProgress, 100)}%` }}
          />
        </div>
        
        {game.current_players >= game.min_players && (
          <span className="text-success text-sm font-medium ml-2" aria-label="Mínimo alcanzado">
            ✓ Min
          </span>
        )}
      </div>

      {/* Cost and Payment Info */}
      <div className="flex justify-between items-center text-sm mb-4">
        <div>
          <span className="text-neutral-600">Costo: </span>
          <span className="font-medium text-neutral-900">
            {formatCurrency(game.field_cost_per_player)}
          </span>
        </div>
        
        {game.status !== 'draft' && game.current_players > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-600">Pagos:</span>
            <span className={`font-medium ${paymentRate >= 80 ? 'text-success' : paymentRate >= 50 ? 'text-warning' : 'text-error'}`}>
              {paymentRate}%
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="game-card-footer">
          <div className="game-card-actions">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(game)}
                aria-label={`Ver detalles de ${game.title}`}
              >
                Ver Detalles
              </Button>
            )}
            
            {onEdit && canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(game)}
                aria-label={`Editar ${game.title}`}
              >
                Editar
              </Button>
            )}
            
            {onManageTeams && canManageTeams && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onManageTeams(game)}
                aria-label={`Gestionar equipos de ${game.title}`}
              >
                Equipos
              </Button>
            )}
            
            {onViewPayments && game.current_players > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewPayments(game)}
                aria-label={`Ver pagos de ${game.title}`}
              >
                <span className="inline-flex items-center gap-1">
                  💰 Pagos
                  {paymentRate < 100 && (
                    <span className="bg-warning text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      !
                    </span>
                  )}
                </span>
              </Button>
            )}

            {game.status === 'completed' && !game.result && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleResultRegistration}
                aria-label={`Registrar resultado de ${game.title}`}
              >
                Registrar Resultado
              </Button>
            )}
          </div>
          
          {onCancel && canCancel && isHovered && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(game)}
              aria-label={`Cancelar ${game.title}`}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Cancelar
            </Button>
          )}
        </div>
      )}

      {/* Additional Info for Completed Games */}
      {game.status === 'completed' && game.result && (
        <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-600">Resultado:</span>
            <span className="font-medium">
              {displayNames.team_a_name}: {game.result.team_a_score} - {displayNames.team_b_name}: {game.result.team_b_score}
            </span>
          </div>
          {game.result.winning_team && game.result.winning_team !== 'draw' && (
            <div className="text-center mt-2">
              <span className="text-success font-medium">
                🏆 Ganó {game.result.winning_team === 'team_a' ? displayNames.team_a_name : displayNames.team_b_name}
              </span>
            </div>
          )}
          {game.result.winning_team === 'draw' && (
            <div className="text-center mt-2">
              <span className="text-neutral-600 font-medium">
                🤝 Empate
              </span>
            </div>
          )}
        </div>
      )}

      {/* Warning for Low Registration */}
      {game.status === 'open' && game.current_players < game.min_players && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-warning" aria-hidden="true">⚠</span>
            <span className="text-warning text-sm">
              Faltan {game.min_players - game.current_players} jugadores para confirmar
            </span>
          </div>
        </div>
      )}

      {/* Full Game Warning */}
      {game.status === 'open' && game.current_players >= game.max_players && (
        <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-success" aria-hidden="true">✅</span>
            <span className="text-success text-sm font-medium">
              Partido completo - Listo para cerrar registraciones
            </span>
          </div>
        </div>
      )}
    </div>
  );
}