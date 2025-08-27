'use client';

import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { 
  ArrowLeftIcon, 
  ShieldIcon, 
  CheckCircleIcon,
  AlertTriangleIcon
} from '@/app/components/ui/Icons';
import { ConfirmationModal } from '@/app/components/ui/ConfirmationModal';
import { CloseRegistrationsModal } from '@/app/components/ui/CloseRegistrationsModal';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { 
  GameWithDetails, 
  GAME_STATUS_LABELS,
  TeamAssignment 
} from '@/lib/types/game';

// Animation styles for the overview section
const overviewAnimationStyles = `
  .overviewFadeInUp {
    animation: overviewFadeInUp 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes overviewFadeInUp {
    0% {
      opacity: 0;
      transform: translate3d(0, 40px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .progressBarAnimate {
    animation: progressBarAnimate 1.2s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes progressBarAnimate {
    0% {
      width: 0%;
    }
    100% {
      width: var(--target-width, 0%);
    }
  }
  
  .circularProgressAnimate {
    animation: circularProgressAnimate 1.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes circularProgressAnimate {
    0% {
      stroke-dasharray: 0 226.19;
    }
    100% {
      stroke-dasharray: var(--target-dash, 0 226.19);
    }
  }
  
  .scaleInBounce {
    animation: scaleInBounce 0.5s ease-out both;
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
      transform: scale3d(0.95, 0.95, 1);
    }
    100% {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  
  .slideInRight {
    animation: slideInRight 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes slideInRight {
    0% {
      opacity: 0;
      transform: translate3d(30px, 0, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .overviewCardHover {
    transition: all 0.3s ease-in-out;
    will-change: transform, box-shadow;
  }
  
  .overviewCardHover:hover {
    transform: translate3d(0, -4px, 0);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  @media (prefers-reduced-motion: reduce) {
    .overviewFadeInUp,
    .progressBarAnimate,
    .circularProgressAnimate,
    .scaleInBounce,
    .slideInRight {
      animation: none;
      opacity: 1;
      transform: none;
      width: var(--target-width, auto);
      stroke-dasharray: var(--target-dash, none);
    }
    
    .overviewCardHover:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

// Animation styles for the teams section
const teamsAnimationStyles = `
  .teamsFadeInUp {
    animation: teamsFadeInUp 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes teamsFadeInUp {
    0% {
      opacity: 0;
      transform: translate3d(0, 40px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .teamsSlideInLeft {
    animation: teamsSlideInLeft 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes teamsSlideInLeft {
    0% {
      opacity: 0;
      transform: translate3d(-40px, 0, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .teamsSlideInRight {
    animation: teamsSlideInRight 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes teamsSlideInRight {
    0% {
      opacity: 0;
      transform: translate3d(40px, 0, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .teamsScaleIn {
    animation: teamsScaleIn 0.4s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes teamsScaleIn {
    0% {
      opacity: 0;
      transform: scale3d(0.9, 0.9, 1);
    }
    100% {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  
  .teamsPlayerStagger {
    animation: teamsPlayerStagger 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes teamsPlayerStagger {
    0% {
      opacity: 0;
      transform: translate3d(0, 20px, 0) scale3d(0.95, 0.95, 1);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
    }
  }
  
  .teamsButtonHover {
    transition: all 0.3s ease-in-out;
    will-change: transform, box-shadow;
  }
  
  .teamsButtonHover:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
  
  .teamsCardHover {
    transition: all 0.3s ease-in-out;
    will-change: transform, box-shadow;
  }
  
  .teamsCardHover:hover {
    transform: translate3d(0, -4px, 0);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  .teamsBadgeFloat {
    animation: teamsBadgeFloat 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes teamsBadgeFloat {
    0% {
      opacity: 0;
      transform: translate3d(0, -10px, 0) scale3d(0.9, 0.9, 1);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
    }
  }
  
  .teamsTeamContainer {
    transition: all 0.3s ease-in-out;
    will-change: border-color, background-color;
  }
  
  .teamsTeamContainer.drag-hover {
    border-color: rgb(34, 197, 94);
    background-color: rgb(240, 253, 244);
    transform: scale3d(1.02, 1.02, 1);
  }
  
  .teamsPlayerCard {
    transition: all 0.2s ease-in-out;
    will-change: transform, box-shadow, border-color;
  }
  
  .teamsPlayerCard:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .teamsPlayerCard.dragging {
    transform: rotate(5deg) scale3d(1.05, 1.05, 1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 1000;
  }
  
  @media (prefers-reduced-motion: reduce) {
    .teamsFadeInUp,
    .teamsSlideInLeft,
    .teamsSlideInRight,
    .teamsScaleIn,
    .teamsPlayerStagger,
    .teamsBadgeFloat {
      animation: none;
      opacity: 1;
      transform: none;
    }
    
    .teamsButtonHover:hover,
    .teamsCardHover:hover,
    .teamsPlayerCard:hover {
      transform: none;
      box-shadow: none;
    }
    
    .teamsTeamContainer.drag-hover {
      transform: none;
    }
    
    .teamsPlayerCard.dragging {
      transform: none;
    }
  }
`;

// Lazy load heavy components to reduce initial bundle size
const TeamManagement = lazy(() => 
  import('@/app/components/games/TeamManagement')
    .then(mod => ({ default: mod.TeamManagement }))
    .catch(err => {
      console.error('Failed to load TeamManagement:', err);
      return { default: () => <div>Error loading component</div> };
    })
);

const PlayerRegistrations = lazy(() => 
  import('@/app/components/games/PlayerRegistrations')
    .then(mod => ({ default: mod.PlayerRegistrations }))
    .catch(err => {
      console.error('Failed to load PlayerRegistrations:', err);
      return { default: () => <div>Error loading component</div> };
    })
);

const GameShareLink = lazy(() => 
  import('@/app/components/games/GameShareLink')
    .then(mod => ({ default: mod.GameShareLink }))
    .catch(err => {
      console.error('Failed to load GameShareLink:', err);
      return { default: () => <div>Error loading component</div> };
    })
);

const GameResultForm = lazy(() => 
  import('@/app/components/games/GameResultForm')
    .then(mod => ({ default: mod.GameResultForm }))
    .catch(err => {
      console.error('Failed to load GameResultForm:', err);
      return { default: () => <div>Error loading component</div> };
    })
);

const PaymentStatusCard = lazy(() => 
  import('@/app/components/games/PaymentStatusCard')
    .then(mod => ({ default: mod.PaymentStatusCard }))
    .catch(err => {
      console.error('Failed to load PaymentStatusCard:', err);
      return { default: () => <div>Error loading component</div> };
    })
);


interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentRate: number;
}

interface GameDetailState {
  game: GameWithDetails | null;
  loading: boolean;
  error: string | null;
  showCancelModal: boolean;
  showCloseRegistrationsModal: boolean;
  isDeleting: boolean;
  isClosingRegistrations: boolean;
  activeTab: 'overview' | 'players' | 'teams' | 'resultado';
  teamAssignment: TeamAssignment | null;
}

export default function GameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params?.id as string;
  const tabParam = searchParams?.get('tab');

  const [state, setState] = useState<GameDetailState>({
    game: null,
    loading: true,
    error: null,
    showCancelModal: false,
    showCloseRegistrationsModal: false,
    isDeleting: false,
    isClosingRegistrations: false,
    activeTab: 'overview',
    teamAssignment: null,
  });

  // Fetch game details
  const fetchGameDetails = useCallback(async () => {
    if (!gameId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Partido no encontrado');
        }
        throw new Error('Error al cargar el partido');
      }

      const result = await response.json();
      
      console.log('=== FRONTEND GAME DATA ===');
      console.log('API response result:', result);
      console.log('API response result.data:', result.data);
      console.log('Game data (result.data.data):', result.data.data);
      console.log('field_cost_per_player:', result.data.data?.field_cost_per_player);
      console.log('current_players:', result.data.data?.current_players);
      console.log('max_players:', result.data.data?.max_players);
      
      setState(prev => ({
        ...prev,
        game: result.data.data,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [gameId]);

  // Initial load
  useEffect(() => {
    fetchGameDetails();
  }, [fetchGameDetails]);

  // Handle URL tab parameter - allow all tabs
  useEffect(() => {
    if (tabParam && ['overview', 'players', 'teams', 'resultado'].includes(tabParam)) {
      setState(prev => ({ ...prev, activeTab: tabParam as GameDetailState['activeTab'] }));
    }
  }, [tabParam]);


  // Handle tab change - allow all tabs
  const handleTabChange = (tab: GameDetailState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  // Handle game cancellation
  const handleCancelGame = async () => {
    if (!state.game) return;
    
    setState(prev => ({ ...prev, showCancelModal: true }));
  };

  // Confirm game cancellation
  const confirmCancelGame = async () => {
    if (!state.game) return;

    setState(prev => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al cancelar el partido');
      }

      // Navigate back to games list since the game is deleted
      router.push('/admin/games');
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isDeleting: false,
        showCancelModal: false 
      }));
      alert('Error al cancelar el partido: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!state.game) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado');
      }

      await fetchGameDetails(); // Refresh data
    } catch (error) {
      alert('Error al actualizar el estado: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Handle close registrations
  const handleCloseRegistrations = async () => {
    if (!state.game) return;

    setState(prev => ({ ...prev, isClosingRegistrations: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'closed' }),
      });

      if (!response.ok) {
        throw new Error('Error al cerrar las inscripciones');
      }

      await fetchGameDetails(); // Refresh data
      setState(prev => ({ 
        ...prev, 
        showCloseRegistrationsModal: false,
        isClosingRegistrations: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isClosingRegistrations: false,
        showCloseRegistrationsModal: false 
      }));
      alert('Error al cerrar las inscripciones: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" message="Cargando detalles del partido..." />
      </div>
    );
  }

  if (state.error || !state.game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="flex justify-center mb-4">
              <AlertTriangleIcon size={48} className="text-error" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-neutral-600 mb-4">
              {state.error || 'No se pudo cargar el partido'}
            </p>
            <div className="space-y-2">
              <Button onClick={() => fetchGameDetails()} variant="primary" className="w-full">
                Reintentar
              </Button>
              <Button onClick={() => router.push('/admin/games')} variant="ghost" className="w-full">
                Volver a Partidos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    console.log('formatCurrency called with:', amount, 'type:', typeof amount);
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.error('Invalid amount passed to formatCurrency:', amount);
      return '$ 0';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'neutral';
      case 'open': return 'success';
      case 'closed': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'neutral';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  // Calculate payment statistics
  const calculatePaymentStats = (): PaymentStats => {
    const regs = state.game?.registrations || [];
    const stats = {
      total: regs.length,
      paid: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      paymentRate: 0,
    };

    regs.forEach(reg => {
      const amount = reg.payment_amount || 0;
      stats.totalAmount += amount;

      switch (reg.payment_status) {
        case 'paid':
          stats.paid++;
          stats.paidAmount += amount;
          break;
        case 'pending':
          stats.pending++;
          stats.pendingAmount += amount;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'refunded':
          stats.refunded++;
          break;
      }
    });

    stats.paymentRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

    return stats;
  };

  const isPastGame = new Date(state.game.game_date) < new Date();
  const canCancel = state.game.status !== 'completed' && state.game.status !== 'cancelled';
  
  // Calculate payment statistics for the Overview
  const paymentStats = calculatePaymentStats();
  
  // Debug info
  console.log('Game date:', state.game.game_date);
  console.log('Current date:', new Date().toISOString());
  console.log('isPastGame:', isPastGame);
  console.log('Game status:', state.game.status);
  console.log('canCancel:', canCancel);


  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header - Fixed with transparency */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          {/* DESKTOP: Original structure preserved */}
          <div className="game-detail-header-desktop flex items-center justify-between gap-4">
            {/* Left: Back button + Status badge */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/games')}
                aria-label="Volver a la lista de partidos"
                className="game-detail-header-back-btn gap-2 text-neutral-600 hover:text-neutral-900"
              >
                <ArrowLeftIcon size={18} />
                <span className="game-detail-header-back-text">Volver</span>
              </Button>
              <Badge 
                variant={state.game.status === 'closed' ? 'success' : getStatusVariant(state.game.status)} 
                size="sm"
                className="game-detail-header-status-badge px-3 py-1 bg-emerald-100 text-emerald-700 border-emerald-200"
              >
                {GAME_STATUS_LABELS[state.game.status]}
              </Badge>
            </div>

            {/* Center: Game title + date */}
            <div className="flex-1 text-center min-w-0">
              <h1 className="game-detail-header-title text-xl font-semibold text-neutral-900 truncate">
                {state.game.title}
              </h1>
              <p className="game-detail-header-date text-sm text-neutral-500">
                <time dateTime={state.game.game_date}>
                  {formatDate(state.game.game_date)}
                </time>
              </p>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {state.game.status === 'open' && (
                <Button
                  onClick={() => setState(prev => ({ ...prev, showCloseRegistrationsModal: true }))}
                  variant="warning"
                  size="sm"
                  className="game-detail-header-action-btn px-3 py-2 h-9"
                  aria-label="Cerrar Registraciones"
                  title="Cerrar Registraciones"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="7" r="4"/>
                    <path d="M10.3 15H7a4 4 0 0 0-4 4v2"/>
                    <path d="M15 15.5V14a2 2 0 0 1 4 0v1.5"/>
                    <rect width="8" height="5" x="13" y="16" rx=".899"/>
                  </svg>
                  <span className="game-detail-header-action-btn-text">Cerrar</span>
                </Button>
              )}

              {state.game.status === 'closed' && (
                <Button
                  onClick={() => handleStatusChange('completed')}
                  variant="ghost"
                  size="sm"
                  className="game-detail-header-action-btn gap-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-300 font-medium px-4 py-2 h-9"
                >
                  <CheckCircleIcon size={16} />
                  <span className="game-detail-header-action-btn-text">Marcar como Completado</span>
                </Button>
              )}
              
              {canCancel && (
                <Button
                  onClick={handleCancelGame}
                  variant="destructive"
                  size="sm"
                  className="game-detail-header-action-btn font-medium px-3 py-2 h-9"
                  aria-label="Cancelar Partido"
                  title="Cancelar Partido"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <path d="M3 6h18"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  <span className="game-detail-header-action-btn-text">Cancelar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-neutral-50 pb-8">
        <div className="max-w-7xl mx-auto game-detail-tabs-container px-4 md:px-6">
          {/* Clear visual separator from header */}
          <div className="h-6"></div>
          
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden px-3 py-2">
            <nav className="game-detail-tabs-nav" role="tablist">
              {[
                { 
                  id: 'overview', 
                  label: 'Resumen', 
                  icon: ({ size, className }: { size: number; className?: string }) => (
                    <svg className={`w-[${size}px] h-[${size}px] ${className} game-detail-tab-icon`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
                      <path d="M18 17V9"/>
                      <path d="M13 17V5"/>
                      <path d="M8 17v-3"/>
                    </svg>
                  ),
                  count: null 
                },
                { 
                  id: 'players', 
                  label: 'Jugadores', 
                  icon: ({ size, className }: { size: number; className?: string }) => (
                    <svg className={`w-[${size}px] h-[${size}px] ${className} game-detail-tab-icon`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M18 21a8 8 0 0 0-16 0"/>
                      <circle cx="10" cy="8" r="5"/>
                      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
                    </svg>
                  ),
                  count: state.game.current_players 
                },
                { 
                  id: 'teams', 
                  label: 'Equipos', 
                  icon: ({ size, className }: { size: number; className?: string }) => (
                    <ShieldIcon size={size} className={`${className} game-detail-tab-icon`} />
                  ),
                  count: null 
                },
                { 
                  id: 'resultado', 
                  label: 'Resultado', 
                  icon: ({ size, className }: { size?: number; className?: string }) => (
                    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} game-detail-tab-icon`}>
                      <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/>
                      <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/>
                      <path d="M18 9h1.5a1 1 0 0 0 0-5H18"/>
                      <path d="M4 22h16"/>
                      <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/>
                      <path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>
                    </svg>
                  ),
                  count: null 
                },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = state.activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as GameDetailState['activeTab'])}
                    className={`
                      game-detail-tab-button
                      ${isActive
                        ? 'bg-green-100/70 text-green-700' 
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                      }
                    `}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${tab.id}-panel`}
                  >
                    <IconComponent size={18} className="flex-shrink-0" />
                    <span className="game-detail-tab-text">
                      {tab.label}
                    </span>
                    {tab.count !== null && (
                      <span className={`
                        game-detail-tab-count text-sm font-semibold px-2 py-1 rounded-full min-w-6 text-center
                        ${isActive 
                          ? 'bg-green-200/60 text-green-700' 
                          : 'bg-neutral-100 text-neutral-600'
                        }
                      `}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto game-detail-overview-content px-4 md:px-6 py-8">
        {/* Overview Tab */}
        {state.activeTab === 'overview' && (
          <>
            <style dangerouslySetInnerHTML={{ __html: overviewAnimationStyles }} />
            <div id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Game Stats - Fixed Layout */}
                <Card className="game-stats-card shadow-sm border-neutral-200 rounded-xl bg-white overviewFadeInUp overviewCardHover" style={{ height: '400px', '--delay': '0ms' } as React.CSSProperties}>
                <CardContent className="p-6 h-full flex flex-col">
                  {/* Header Section */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-[18px] h-[18px] text-green-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
                        <path d="M18 17V9"/>
                        <path d="M13 17V5"/>
                        <path d="M8 17v-3"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900">Estadísticas del Partido</h3>
                  </div>

                  <div className="space-y-6 flex-1" style={{ marginTop: '20px' }}>
                    {/* Registered Players Block */}
                    <div className="space-y-4">
                      {/* Main row */}
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-700 font-medium">Jugadores Registrados</span>
                        <span className="text-2xl font-bold text-neutral-900">
                          {state.game?.current_players || 0}<span className="text-sm text-neutral-400 font-normal">/{state.game?.max_players || 0}</span>
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full">
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div 
                            className="bg-black h-2 rounded-full progressBarAnimate"
                            style={{ 
                              '--target-width': `${Math.min(
                                ((state.game?.current_players || 0) / (state.game?.max_players || 1)) * 100, 
                                100
                              )}%`,
                              '--delay': '800ms'
                            } as React.CSSProperties}
                            role="progressbar"
                            aria-valuenow={state.game?.current_players || 0}
                            aria-valuemax={state.game?.max_players || 0}
                            aria-label="Jugadores registrados"
                          />
                        </div>
                      </div>
                      
                      {/* Auxiliary text */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">
                          Mínimo: {state.game?.min_players || 0}
                        </span>
                        <span className="text-neutral-600">
                          {Math.round(
                            ((state.game?.current_players || 0) / (state.game?.max_players || 1)) * 100
                          )}% ocupado
                        </span>
                      </div>
                    </div>

                    {/* Cost per Player Row */}
                    <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 overviewFadeInUp" style={{ '--delay': '600ms' } as React.CSSProperties}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-neutral-200">
                            <svg className="w-[16px] h-[16px] text-neutral-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <circle cx="12" cy="8" r="5"/>
                              <path d="M20 21a8 8 0 0 0-16 0"/>
                            </svg>
                          </div>
                          <span className="text-neutral-700 font-medium">Costo por Jugador</span>
                        </div>
                        <span className="text-lg font-semibold text-neutral-900">
                          {formatCurrency(state.game?.field_cost_per_player || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Expected Income Block */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 overviewFadeInUp" style={{ '--delay': '700ms' } as React.CSSProperties}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center border border-green-200">
                            <svg className="w-[16px] h-[16px] text-green-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <rect width="20" height="12" x="2" y="6" rx="2"/>
                              <circle cx="12" cy="12" r="2"/>
                              <path d="M6 12h.01M18 12h.01"/>
                            </svg>
                          </div>
                          <span className="text-green-800 font-medium">Ingresos Esperados</span>
                        </div>
                        <span className="text-2xl font-bold text-green-800">
                          {formatCurrency((state.game?.field_cost_per_player || 0) * (state.game?.current_players || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

                {/* Payment Status - New Design */}
                <Suspense fallback={
                  <LoadingSpinner message="Cargando estado de pagos..." />
                }>
                  <PaymentStatusCard
                    paidAmount={paymentStats.paidAmount}
                    pendingAmount={paymentStats.pendingAmount}
                    paidPlayersCount={paymentStats.paid}
                    pendingPlayersCount={paymentStats.pending}
                    totalPlayersCount={paymentStats.total}
                    className="shadow-sm overviewFadeInUp overviewCardHover"
                    style={{ '--delay': '200ms' } as React.CSSProperties}
                  />
                </Suspense>

                {/* Invite Friends Card */}
                <Card className="game-invite-card md:col-span-2 xl:col-span-1 bg-white rounded-3xl border border-neutral-200 shadow-lg min-h-[320px] overviewFadeInUp overviewCardHover" style={{ '--delay': '400ms' } as React.CSSProperties}>
                <CardContent className="game-invite-content px-12 py-16 h-full flex flex-col" style={{ marginBottom: '0 !important' }}>
                  <Suspense fallback={
                    <LoadingSpinner size="sm" message="Cargando enlace..." />
                  }>
                    <GameShareLink 
                      shareToken={state.game.share_token} 
                      gameTitle={state.game.title}
                    />
                  </Suspense>
                </CardContent>
              </Card>
              </div>
            </div>
          </>
        )}

        {/* Players Tab */}
        {state.activeTab === 'players' && (
          <div id="players-panel" role="tabpanel" aria-labelledby="players-tab">
            <Suspense fallback={
              <LoadingSpinner message="Cargando jugadores..." />
            }>
              <PlayerRegistrations 
                gameId={state.game.id} 
                registrations={state.game.registrations}
                gameStatus={state.game.status}
                onRegistrationUpdate={fetchGameDetails}
              />
            </Suspense>
          </div>
        )}

        {/* Teams Tab */}
        {state.activeTab === 'teams' && (
          <>
            <style dangerouslySetInnerHTML={{ __html: teamsAnimationStyles }} />
            <div id="teams-panel" role="tabpanel" aria-labelledby="teams-tab">
              <Suspense fallback={
                <LoadingSpinner message="Cargando equipos..." />
              }>
                <TeamManagement 
                  gameId={state.game.id}
                  registrations={state.game.registrations}
                  gameStatus={state.game.status}
                  onTeamsUpdate={fetchGameDetails}
                  isReadOnly={state.game.status === 'completed'}
                  teamAName={state.game.team_a_name}
                  teamBName={state.game.team_b_name}
                />
              </Suspense>
            </div>
          </>
        )}


        {/* Resultado Tab - Always accessible */}
        {state.activeTab === 'resultado' && (
          <>
            <style dangerouslySetInnerHTML={{ __html: teamsAnimationStyles }} />
            <div id="resultado-panel" role="tabpanel" aria-labelledby="resultado-tab">
            {state.game.status === 'completed' ? (
              <Suspense fallback={
                <LoadingSpinner message="Cargando resultados..." />
              }>
                <GameResultForm 
                  gameId={state.game.id}
                  existingResult={state.game.result}
                  onResultSaved={fetchGameDetails}
                  teamAName={state.game.team_a_name}
                  teamBName={state.game.team_b_name}
                />
              </Suspense>
            ) : (
              <Card className="text-center shadow-sm border-neutral-200 rounded-xl bg-white teamsFadeInUp" style={{ '--delay': '0ms' } as React.CSSProperties}>
                <CardContent className="p-12">
                  <div className="flex items-center justify-center mb-6 teamsScaleIn" style={{ '--delay': '200ms' } as React.CSSProperties}>
                    <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
                      <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-neutral-400'>
                        <path d='M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978'/>
                        <path d='M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978'/>
                        <path d='M18 9h1.5a1 1 0 0 0 0-5H18'/>
                        <path d='M4 22h16'/>
                        <path d='M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z'/>
                        <path d='M6 9H4.5a1 1 0 0 1 0-5H6'/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-neutral-900 teamsFadeInUp" style={{ '--delay': '400ms' } as React.CSSProperties}>Resultado No Disponible</h3>
                  <p className="text-neutral-600 max-w-md mx-auto teamsFadeInUp" style={{ '--delay': '600ms' } as React.CSSProperties}>
                    Solo se puede registrar el resultado de partidos completados.
                  </p>
                </CardContent>
              </Card>
            )}
            </div>
          </>
        )}

      </div>

      {/* Cancel Game Confirmation Modal */}
      <ConfirmationModal
        isOpen={state.showCancelModal}
        onClose={() => setState(prev => ({ ...prev, showCancelModal: false }))}
        onConfirm={confirmCancelGame}
        title={`¿Seguro que querés eliminar el partido "${state.game?.title}"?`}
        message={
          <div>
            <p className="mb-3">
              ¿Estás seguro de que quieres cancelar el partido <strong>&ldquo;{state.game?.title}&rdquo;</strong>?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <div className="flex items-center gap-2 font-medium mb-2">
                <AlertTriangleIcon size={18} className="text-red-600" />
                Esta acción:
              </div>
              <ul className="list-disc list-inside space-y-1 ml-6">
                <li>Eliminará el partido permanentemente</li>
                <li>Notificará a todos los jugadores registrados</li>
                <li>No se puede deshacer</li>
              </ul>
            </div>
          </div>
        }
        confirmText="Sí, Cancelar Partido"
        cancelText="No, Mantener"
        variant="danger"
        isLoading={state.isDeleting}
      />

      {/* Close Registrations Confirmation Modal */}
      <CloseRegistrationsModal
        isOpen={state.showCloseRegistrationsModal}
        onClose={() => setState(prev => ({ ...prev, showCloseRegistrationsModal: false }))}
        onConfirm={handleCloseRegistrations}
        gameTitle={state.game?.title || ''}
        currentPlayers={state.game?.current_players || 0}
        isLoading={state.isClosingRegistrations}
      />
    </div>
  );
}