'use client';

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EditIcon } from '../ui/Icons';
import { useTeamDisplayNames } from '../../hooks/useTeamNames';
import { GameResult } from '../../../lib/types/game';

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
  
  .staggerDelay {
    animation: fadeInUp 0.6s ease-out both;
  }
  
  .staggerDelay:nth-child(1) { animation-delay: 0.8s; }
  .staggerDelay:nth-child(2) { animation-delay: 0.9s; }
  .staggerDelay:nth-child(3) { animation-delay: 1.0s; }
  .staggerDelay:nth-child(4) { animation-delay: 1.1s; }
  
  .buttonHover {
    transition: all 0.2s ease-in-out;
    transform: translate3d(0, 0, 0);
  }
  
  .buttonHover:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .cardHover {
    transition: all 0.2s ease-in-out;
    will-change: transform, box-shadow;
  }
  
  .cardHover:hover {
    transform: translate3d(0, -4px, 0);
  }
  
  .scoreHighlight {
    animation: scoreHighlight 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes scoreHighlight {
    0% {
      opacity: 0;
      transform: scale3d(0.8, 0.8, 1);
    }
    50% {
      transform: scale3d(1.1, 1.1, 1);
    }
    100% {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .fadeInUp,
    .scaleInBounce,
    .slideDownBounce,
    .pulseOnLoad,
    .staggerDelay,
    .scoreHighlight {
      animation: none;
      opacity: 1;
      transform: none;
    }
    
    .buttonHover:hover,
    .cardHover:hover {
      transform: none;
    }
  }
`;

export interface GameResultDisplayProps {
  result: GameResult;
  teamAName?: string;
  teamBName?: string;
  onEdit?: () => void;
  isEditable?: boolean;
  className?: string;
}

export function GameResultDisplay({ 
  result, 
  teamAName, 
  teamBName, 
  onEdit, 
  isEditable = false,
  className = '' 
}: GameResultDisplayProps) {
  // Get display names for teams
  const displayNames = useTeamDisplayNames(teamAName, teamBName);
  
  // Determine winner
  const getWinnerInfo = () => {
    if (result.team_a_score > result.team_b_score) {
      return {
        winner: 'team_a',
        winnerName: displayNames.team_a_name,
        message: `Ganó ${displayNames.team_a_name}`
      };
    } else if (result.team_b_score > result.team_a_score) {
      return {
        winner: 'team_b',
        winnerName: displayNames.team_b_name,
        message: `Ganó ${displayNames.team_b_name}`
      };
    } else {
      return {
        winner: 'draw',
        winnerName: null,
        message: 'Empate'
      };
    }
  };

  const winnerInfo = getWinnerInfo();
  
  // Enhanced team badge colors using design system
  const getTeamBadgeColor = (team: 'team_a' | 'team_b', isWinner: boolean) => {
    if (team === 'team_a') {
      return isWinner 
        ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg ring-4 ring-blue-200' 
        : 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-md';
    } else {
      return isWinner 
        ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg ring-4 ring-green-200' 
        : 'bg-gradient-to-br from-green-400 to-green-500 shadow-md';
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className="space-y-8" style={{ marginTop: '4px' }}>
      {/* Main Result Card - Consistent with other sections */}
      <Card className="shadow-sm border-neutral-200 rounded-xl bg-white fadeInUp" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <CardContent className="p-8">
          {/* Edit Button */}
          {isEditable && onEdit && (
            <div className="flex justify-end mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="gap-2 px-6 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-300 rounded-xl buttonHover fadeInUp"
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
            </div>
          )}

          {/* Main Score Display - Simplified and Consistent */}
          <div className="space-y-6">
            {/* Winner Badge - Prominent but not overwhelming */}
            <div className="flex justify-center mb-8">
              <div className={`px-6 py-3 rounded-xl text-lg font-semibold border slideDownBounce ${
                winnerInfo.winner === 'draw' 
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
                  {winnerInfo.message}
                </div>
              </div>
            </div>

            {/* Score Layout - Clean and Readable */}
            <div className="grid grid-cols-3 gap-8 items-center">
              {/* Team A */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 scaleInBounce" style={{ '--delay': '400ms' } as React.CSSProperties}>
                  A
                </div>
                <h4 className="text-lg font-semibold text-neutral-900 mb-3 leading-tight fadeInUp" style={{ marginBottom: '20px', '--delay': '500ms' } as React.CSSProperties}>
                  {displayNames.team_a_name}
                </h4>
                <div className={`text-4xl font-bold transition-colors duration-200 scoreHighlight ${
                  winnerInfo.winner === 'team_a' ? 'text-green-600' : 'text-neutral-700'
                }`} style={{ '--delay': '600ms' } as React.CSSProperties}>
                  {result.team_a_score}
                </div>
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
                <div className={`text-4xl font-bold transition-colors duration-200 scoreHighlight ${
                  winnerInfo.winner === 'team_b' ? 'text-green-600' : 'text-neutral-700'
                }`} style={{ '--delay': '700ms' } as React.CSSProperties}>
                  {result.team_b_score}
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Notes Section - Separate Module */}
      {result.notes && result.notes.trim() && (
        <Card className="shadow-sm border-neutral-200 rounded-xl bg-white fadeInUp" style={{ '--delay': '100ms' } as React.CSSProperties}>
          <CardContent className="p-8">
            {/* Header Section - Consistent with other sections */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">Notas del Partido</h3>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
              <p className="text-neutral-700 leading-relaxed text-sm">
                {result.notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Statistics - Consistent grid styling */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="shadow-sm border-neutral-200 rounded-xl bg-white hover:shadow-md transition-all duration-200 cardHover staggerDelay">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-neutral-900 mb-2">
              {result.team_a_score + result.team_b_score}
            </div>
            <div className="text-sm text-neutral-600 font-medium">
              Goles Totales
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 rounded-xl bg-white hover:shadow-md transition-all duration-200 cardHover staggerDelay">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-neutral-900 mb-2">
              {Math.abs(result.team_a_score - result.team_b_score)}
            </div>
            <div className="text-sm text-neutral-600 font-medium">
              Diferencia
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 rounded-xl bg-blue-50 hover:shadow-md transition-all duration-200 cardHover staggerDelay">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-700 mb-2">
              {result.team_a_score}
            </div>
            <div className="text-sm text-blue-600 font-medium">
              {displayNames.team_a_name}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 rounded-xl bg-green-50 hover:shadow-md transition-all duration-200 cardHover staggerDelay">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-700 mb-2">
              {result.team_b_score}
            </div>
            <div className="text-sm text-green-600 font-medium">
              {displayNames.team_b_name}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}

export default GameResultDisplay;