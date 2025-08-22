'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { 
  ArrowLeftIcon, 
  ChartBarIcon, 
  UsersIcon, 
  ShieldIcon, 
  TrophyIcon,
  LockIcon,
  PlayCircleIcon,
  TrashIcon,
  AlertTriangleIcon,
  PercentIcon,
  DollarSignIcon,
  ClockIcon 
} from '@/app/components/ui/Icons';
import { TeamManagement } from '@/app/components/games/TeamManagement';
import { PlayerRegistrations } from '@/app/components/games/PlayerRegistrations';
import { GameShareLink } from '@/app/components/games/GameShareLink';
import { GameResultForm } from '@/app/components/games/GameResultForm';
import { ConfirmationModal } from '@/app/components/ui/ConfirmationModal';
import { 
  GameWithDetails, 
  GAME_STATUS_LABELS,
  GameRegistration,
  TeamAssignment 
} from '@/lib/types/game';

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
  isDeleting: boolean;
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
    isDeleting: false,
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

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Cargando detalles del partido...</p>
        </div>
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
  const canEdit = !isPastGame && state.game.status !== 'completed' && state.game.status !== 'cancelled';
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
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/games')}
                  aria-label="Volver a la lista de partidos"
                  className="gap-2 text-neutral-600 hover:text-neutral-900"
                >
                  <ArrowLeftIcon size={18} />
                  Volver
                </Button>
                <Badge 
                  variant={getStatusVariant(state.game.status)} 
                  size="lg"
                  className="px-4 py-2"
                >
                  {GAME_STATUS_LABELS[state.game.status]}
                </Badge>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
                {state.game.title}
              </h1>
              
              <p className="text-neutral-600">
                <time dateTime={state.game.game_date}>
                  {formatDate(state.game.game_date)}
                </time>
              </p>
              
              {state.game.description && (
                <p className="text-neutral-700 mt-2">{state.game.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {state.game.status === 'open' && (
                <Button
                  onClick={() => handleStatusChange('closed')}
                  variant="warning"
                  size="md"
                  className="flex-1 sm:flex-none gap-2"
                >
                  <LockIcon size={18} />
                  Cerrar Registraciones
                </Button>
              )}

              {state.game.status === 'closed' && (
                <Button
                  onClick={() => handleStatusChange('completed')}
                  variant="success"
                  size="md"
                  className="flex-1 sm:flex-none gap-2"
                >
                  <PlayCircleIcon size={18} />
                  Marcar como Completado
                </Button>
              )}
              
              
              {canCancel && (
                <Button
                  onClick={handleCancelGame}
                  variant="destructive"
                  size="md"
                  className="flex-1 sm:flex-none gap-2"
                >
                  <TrashIcon size={18} />
                  Cancelar Partido
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex gap-8 overflow-x-auto py-1" role="tablist">
            {[
              { 
                id: 'overview', 
                label: 'Resumen', 
                icon: ChartBarIcon,
                count: null 
              },
              { 
                id: 'players', 
                label: 'Jugadores', 
                icon: UsersIcon,
                count: state.game.current_players 
              },
              { 
                id: 'teams', 
                label: 'Equipos', 
                icon: ShieldIcon,
                count: null 
              },
              { 
                id: 'resultado', 
                label: 'Resultado', 
                icon: TrophyIcon,
                count: null 
              },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`group flex items-center gap-3 py-4 px-3 border-b-3 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    state.activeTab === tab.id
                      ? 'border-primary text-primary bg-primary/5 -mb-px'
                      : 'border-transparent text-neutral-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5'
                  }`}
                  role="tab"
                  aria-selected={state.activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                >
                  <IconComponent size={18} />
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        state.activeTab === tab.id
                          ? 'bg-primary text-white'
                          : 'bg-neutral-200 text-neutral-600 group-hover:bg-primary group-hover:text-white'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Overview Tab */}
        {state.activeTab === 'overview' && (
          <div id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {/* Game Stats */}
              <Card className="shadow-sm border-neutral-200">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold">Estadísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Jugadores registrados:</span>
                    <span className="font-semibold">{state.game?.current_players || 0}/{state.game?.max_players || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Mínimo requerido:</span>
                    <span className="font-semibold">{state.game?.min_players || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Costo por jugador:</span>
                    <span className="font-semibold">{formatCurrency(state.game?.field_cost_per_player || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Ingresos esperados:</span>
                    <span className="font-semibold text-success">
                      {formatCurrency((state.game?.field_cost_per_player || 0) * (state.game?.current_players || 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card className="shadow-sm border-neutral-200">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold">Estado de Pagos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {paymentStats.total > 0 ? (
                    <>
                      {/* Payment Rate */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <PercentIcon size={20} className="text-primary" />
                          </div>
                          <div>
                            <span className="text-neutral-600 text-sm">Tasa de Pago</span>
                            <p className="font-semibold text-lg">{paymentStats.paymentRate}%</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar for Payment Rate - Now horizontal and much longer */}
                        <div className="flex-1 max-w-48 ml-6">
                          <div className="w-full bg-neutral-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${paymentStats.paymentRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Collected Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                            <DollarSignIcon size={20} className="text-success" />
                          </div>
                          <div>
                            <span className="text-neutral-600 text-sm">Recaudado</span>
                            <p className="font-semibold text-lg text-success">
                              {formatCurrency(paymentStats.paidAmount)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-neutral-600">
                          {paymentStats.paid} de {paymentStats.total}
                        </span>
                      </div>
                      
                      {/* Pending Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                            <ClockIcon size={20} className="text-warning" />
                          </div>
                          <div>
                            <span className="text-neutral-600 text-sm">Pendiente</span>
                            <p className="font-semibold text-lg text-warning">
                              {formatCurrency(paymentStats.pendingAmount)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-neutral-600">
                          {paymentStats.pending} jugadores
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-3" aria-hidden="true">💳</div>
                      <p className="text-neutral-600">No hay pagos registrados</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Friend Registration Link */}
              <Card className="md:col-span-2 xl:col-span-1 shadow-sm border-neutral-200">
                <CardHeader className="pb-6">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-semibold">Invitar Amigos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <GameShareLink 
                    shareToken={state.game.share_token} 
                    gameTitle={state.game.title}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {state.activeTab === 'players' && (
          <div id="players-panel" role="tabpanel" aria-labelledby="players-tab">
            <PlayerRegistrations 
              gameId={state.game.id} 
              registrations={state.game.registrations}
              gameStatus={state.game.status}
              onRegistrationUpdate={fetchGameDetails}
            />
          </div>
        )}

        {/* Teams Tab */}
        {state.activeTab === 'teams' && (
          <div id="teams-panel" role="tabpanel" aria-labelledby="teams-tab">
            <TeamManagement 
              gameId={state.game.id}
              registrations={state.game.registrations}
              gameStatus={state.game.status}
              onTeamsUpdate={fetchGameDetails}
              isReadOnly={state.game.status === 'completed'}
              teamAName={state.game.team_a_name}
              teamBName={state.game.team_b_name}
            />
          </div>
        )}


        {/* Resultado Tab - Always accessible */}
        {state.activeTab === 'resultado' && (
          <div id="resultado-panel" role="tabpanel" aria-labelledby="resultado-tab">
            {state.game.status === 'completed' ? (
              <GameResultForm 
                gameId={state.game.id}
                existingResult={state.game.result}
                onResultSaved={fetchGameDetails}
                teamAName={state.game.team_a_name}
                teamBName={state.game.team_b_name}
              />
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <div className="text-6xl mb-4" aria-hidden="true">🏆</div>
                  <h3 className="text-xl font-semibold mb-2">Resultado No Disponible</h3>
                  <p className="text-neutral-600 mb-4">
                    Solo se puede registrar el resultado de partidos completados.
                  </p>
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-sm text-warning-800 max-w-md mx-auto">
                    <div className="flex items-center gap-2 font-medium mb-2">
                      <AlertTriangleIcon size={18} className="text-warning" />
                      Estado actual: <Badge variant={getStatusVariant(state.game.status)} size="sm">
                        {GAME_STATUS_LABELS[state.game.status]}
                      </Badge>
                    </div>
                    <p className="text-left">
                      Para registrar el resultado, el partido debe estar marcado como completado. 
                      Puedes cambiar el estado desde las acciones en el encabezado de la página.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>

      {/* Cancel Game Confirmation Modal */}
      <ConfirmationModal
        isOpen={state.showCancelModal}
        onClose={() => setState(prev => ({ ...prev, showCancelModal: false }))}
        onConfirm={confirmCancelGame}
        title="Cancelar Partido"
        message={
          <div>
            <p className="mb-3">
              ¿Estás seguro de que quieres cancelar el partido <strong>"{state.game?.title}"</strong>?
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
    </div>
  );
}