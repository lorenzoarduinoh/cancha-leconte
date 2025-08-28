'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { XIcon } from '../ui/Icons';
import { InlineLoadingSpinner, LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  GameRegistration, 
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
  GameStatus 
} from '../../../lib/types/game';

// Animation styles for PlayerRegistrations
const PLAYER_ANIMATIONS = `
  .playersFadeInUp {
    animation: playersFadeInUp 0.6s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes playersFadeInUp {
    0% {
      opacity: 0;
      transform: translate3d(0, 40px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .playersSlideInLeft {
    animation: playersSlideInLeft 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes playersSlideInLeft {
    0% {
      opacity: 0;
      transform: translate3d(-20px, 0, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  .playersScaleIn {
    animation: playersScaleIn 0.4s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes playersScaleIn {
    0% {
      opacity: 0;
      transform: scale3d(0.8, 0.8, 1);
    }
    100% {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  
  .playerCardAnimate {
    animation: playerCardAnimate 0.5s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes playerCardAnimate {
    0% {
      opacity: 0;
      transform: translate3d(0, 24px, 0) scale3d(0.95, 0.95, 1);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
    }
  }
  
  .playersButtonHover {
    transition: all 0.2s ease-out;
  }
  
  .playersButtonHover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .playersSearchFade {
    animation: playersSearchFade 0.4s ease-out both;
    animation-delay: var(--delay, 0ms);
  }
  
  @keyframes playersSearchFade {
    0% {
      opacity: 0;
      transform: translate3d(0, -10px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  
  /* Accessibility - respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .playersFadeInUp,
    .playersSlideInLeft,
    .playersScaleIn,
    .playerCardAnimate,
    .playersSearchFade {
      animation: none;
      opacity: 1;
      transform: none;
    }
    
    .playersButtonHover:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

// Player Management Icon
const PlayersIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 21a8 8 0 0 0-16 0"/>
    <circle cx="10" cy="8" r="5"/>
    <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
  </svg>
);

// Search Icon
const SearchIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21 21-4.34-4.34"/>
    <circle cx="11" cy="11" r="8"/>
  </svg>
);

// Filter Icon
const FilterIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

export interface PlayerRegistrationsProps {
  gameId: string;
  registrations?: GameRegistration[];
  gameStatus: GameStatus;
  onRegistrationUpdate?: () => void;
}

interface RegistrationState {
  loading: boolean;
  searchTerm: string;
  paymentLoading: boolean;
}

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

export function PlayerRegistrations({
  gameId,
  registrations,
  gameStatus,
  onRegistrationUpdate
}: PlayerRegistrationsProps) {
  const [state, setState] = useState<RegistrationState & { paymentFilter: 'all' | 'paid' | 'pending' }>({
    loading: false,
    searchTerm: '',
    paymentLoading: false,
    paymentFilter: 'all',
  });

  // Inject animation styles
  React.useEffect(() => {
    const styleId = 'player-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = PLAYER_ANIMATIONS;
      document.head.appendChild(style);
    }
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusVariant = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'neutral';
      default: return 'neutral';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate payment statistics
  const paymentStats = useMemo((): PaymentStats => {
    const regs = registrations || [];
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
  }, [registrations]);

  // Filter registrations based on search term and payment filter
  // Show loading state when registrations are being loaded
  if (state.loading) {
    return (
      <LoadingSpinner message="Cargando jugadores..." />
    );
  }

  const regs = registrations || [];
  const filteredRegistrations = regs.filter(reg => {
    const matchesSearch = reg.player_name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      reg.player_phone.includes(state.searchTerm);
    
    const matchesPaymentFilter = state.paymentFilter === 'all' || 
      (state.paymentFilter === 'paid' && reg.payment_status === 'paid') ||
      (state.paymentFilter === 'pending' && reg.payment_status === 'pending');
    
    return matchesSearch && matchesPaymentFilter;
  });

  // Get context-aware title and messages
  const getFilteredTitle = () => {
    switch (state.paymentFilter) {
      case 'paid':
        return `Jugadores Pagados (${filteredRegistrations.length})`;
      case 'pending':
        return `Jugadores Pendientes (${filteredRegistrations.length})`;
      default:
        return `Jugadores Registrados (${filteredRegistrations.length})`;
    }
  };

  const getEmptyStateMessage = () => {
    if (state.searchTerm) {
      // When searching, show search-specific messages
      const searchContext = state.paymentFilter === 'all' ? 'jugadores' :
        state.paymentFilter === 'paid' ? 'jugadores pagados' : 'jugadores pendientes';
      
      return {
        title: `No se encontraron ${searchContext}`,
        description: `No hay ${searchContext} que coincidan con la búsqueda "${state.searchTerm}"`
      };
    } else {
      // When not searching, show filter-specific messages
      switch (state.paymentFilter) {
        case 'paid':
          return {
            title: 'No hay jugadores pagados',
            description: 'Aún no hay jugadores que hayan completado su pago.'
          };
        case 'pending':
          return {
            title: 'No hay jugadores pendientes',
            description: 'Todos los jugadores han completado su pago.'
          };
        default:
          return {
            title: 'No se encontraron jugadores',
            description: 'No hay jugadores que coincidan con los filtros seleccionados.'
          };
      }
    }
  };

  // Group registrations by payment status
  const groupedRegistrations = {
    paid: filteredRegistrations.filter(r => r.payment_status === 'paid'),
    pending: filteredRegistrations.filter(r => r.payment_status === 'pending'),
    failed: filteredRegistrations.filter(r => r.payment_status === 'failed'),
    refunded: filteredRegistrations.filter(r => r.payment_status === 'refunded'),
  };

  // Handle payment status update
  const handleMarkAsPaid = async (registrationId: string) => {
    setState(prev => ({ ...prev, paymentLoading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado de pago');
      }

      onRegistrationUpdate?.();
    } catch (error) {
      alert('Error al actualizar el pago: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setState(prev => ({ 
        ...prev, 
        paymentLoading: false
      }));
    }
  };

  const clearSearch = () => {
    setState(prev => ({ ...prev, searchTerm: '' }));
  };

  // Handle player removal
  const handleRemovePlayer = async (registrationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta registración?')) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/registrations/${registrationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la registración');
      }

      onRegistrationUpdate?.();
    } catch (error) {
      alert('Error al eliminar jugador: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  if (regs.length === 0) {
    return (
      <Card className="text-center shadow-sm border-neutral-200 rounded-xl bg-white playersFadeInUp" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <CardContent className="p-12">
          <div className="flex items-center justify-center mb-6 playersScaleIn" style={{ '--delay': '200ms' } as React.CSSProperties}>
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <PlayersIcon size={32} className="text-neutral-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-neutral-900 playersFadeInUp" style={{ '--delay': '400ms' } as React.CSSProperties}>No hay jugadores registrados</h3>
          <p className="text-neutral-600 max-w-md mx-auto playersFadeInUp" style={{ '--delay': '600ms' } as React.CSSProperties}>
            {gameStatus === 'draft' 
              ? 'Publica el partido para que los jugadores puedan registrarse.'
              : 'Los jugadores podrán registrarse una vez que el partido esté publicado.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8" style={{ marginTop: '-12px' }}>
      <style id="player-registrations-styles">{`
        .player-search-and-filters-container {
            display: flex;
            gap: 12px;
        }
        .search-container {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
        }
        @media (max-width: 767px) {
          .player-search-and-filters-container {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          .search-container {
            width: 100%;
          }
          .player-search-bar {
            min-width: 0;
            flex: 1;
          }
          .player-filters {
            justify-content: center;
            width: 100%;
            gap: 8px;
          }
          .player-filters button {
            flex: 1;
            padding-left: 8px;
            padding-right: 8px;
            font-size: 12px;
          }
        }
      `}</style>
      {/* Search and Filters - No Card Background */}
      <div className="playersSearchFade" style={{ padding: '12px', display: 'flex', alignItems: 'center', minHeight: '72px', '--delay': '0ms' } as React.CSSProperties}>
        <div className="flex flex-col md:flex-row items-center justify-between w-full" style={{ gap: '12px', minHeight: 'auto' }}>
          {/* Search and Filters - Perfect Alignment */}
          <div className="player-search-and-filters-container w-full flex-1">
            <div className="search-container">
                <style>{`
                    .custom-pl {
                        padding-left: 1.5rem;
                    }
                    .custom-pr {
                        padding-right: 1.25rem;
                    }
                `}</style>
                <div className="player-search-bar relative flex-1 playersSlideInLeft" style={{ '--delay': '150ms' } as React.CSSProperties}>
                <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={state.searchTerm}
                    onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="w-full h-12 pr-10 text-sm bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:outline-none placeholder:text-neutral-400 transition-colors duration-200 custom-pl"
                />
                {state.searchTerm ? (
                    <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors z-10 playersButtonHover custom-pr"
                    aria-label="Limpiar búsqueda"
                    >
                    <XIcon size={16} />
                    </button>
                ) : (
                    <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none custom-pr">
                        <SearchIcon size={20} className="text-neutral-400" />
                    </div>
                )}
                </div>
            </div>
            
            {/* Filter Buttons - Exact height matching */}
            <div className="player-filters flex gap-1 shrink-0 playersSlideInLeft" style={{ '--delay': '200ms' } as React.CSSProperties}>
                <button
                  onClick={() => setState(prev => ({ ...prev, paymentFilter: 'all' }))}
                  className={`px-6 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center playersButtonHover ${
                    state.paymentFilter === 'all'
                      ? 'bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-sm' 
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                  style={{ 
                    height: '48px', 
                    boxSizing: 'border-box',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }}
                >
                  Todos
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, paymentFilter: 'paid' }))}
                  className={`px-6 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center playersButtonHover ${
                    state.paymentFilter === 'paid'
                      ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm' 
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                  style={{ 
                    height: '48px', 
                    boxSizing: 'border-box',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }}
                >
                  Pagados
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, paymentFilter: 'pending' }))}
                  className={`px-6 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center playersButtonHover ${
                    state.paymentFilter === 'pending'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' 
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                  style={{ 
                    height: '48px', 
                    boxSizing: 'border-box',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }}
                >
                  Pendientes
                </button>
            </div>
          </div>
          
          {/* Status Summary */}
          {(paymentStats.failed > 0 || paymentStats.refunded > 0) && (
            <div className="hidden md:flex flex-wrap gap-2 playersSlideInLeft" style={{ '--delay': '300ms' } as React.CSSProperties}>
              {paymentStats.failed > 0 && (
                <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
                  {paymentStats.failed} Fallido{paymentStats.failed > 1 ? 's' : ''}
                </div>
              )}
              {paymentStats.refunded > 0 && (
                <div className="px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600">
                  {paymentStats.refunded} Reembolsado{paymentStats.refunded > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Players List */}
      <Card className="shadow-sm border-neutral-200 rounded-xl bg-white playersFadeInUp" style={{ marginTop: '20px', '--delay': '100ms' } as React.CSSProperties}>
        <CardContent className="p-8">
          {/* Header Section */}
          <div className="flex items-center gap-3 playersSlideInLeft" style={{ marginBottom: '24px', '--delay': '200ms' } as React.CSSProperties}>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center playersScaleIn" style={{ '--delay': '300ms' } as React.CSSProperties}>
              <PlayersIcon size={18} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">{getFilteredTitle()}</h3>
          </div>

          <div className="space-y-4">
            <style>{`
              .desktop-only { display: flex; }
              .mobile-only { display: none; }

              @media (max-width: 767px) {
                .player-card-content-wrapper {
                  flex-direction: column;
                  align-items: stretch;
                  gap: 1rem;
                  padding-left: 0 !important;
                }
                .player-card-main-info {
                  gap: 1.5rem;
                  align-items: flex-start; /* Changed from center to flex-start to eliminate vertical centering spacing */
                  margin-top: 0; /* Reset to match left spacing exactly */
                }
                .player-card-avatar {
                  margin-top: 0; /* Removed top margin to match visual spacing with left margin */
                  margin-left: 0.5rem;
                }
                .player-card-actions {
                  padding-top: 0.25rem; /* Reduced from 0.5rem */
                  margin-top: 0.25rem; /* Reduced from 0.5rem */
                  /* border-top: 1px solid #e5e7eb; */ /* neutral-200 */
                  display: flex;
                  gap: 0.75rem;
                  padding-left: 0.5rem; /* Moved to left */
                  padding-right: 1rem; /* Added padding */
                  justify-content: flex-start; /* Align to start */
                  padding-bottom: 0.25rem; /* Reduced from 0.5rem to make more compact */
                }
                .player-card-actions > button {
                  flex: 1; /* Make wider */
                  height: 36px; /* Less tall */
                  padding: 0 1rem; /* Adjust padding */
                }
                .player-card-actions .button-text {
                  display: none;
                }
                .player-card-payment-amount-mobile {
                  margin-bottom: 0.5rem;
                  margin-top: -1rem; /* Pull payment amount very close to registration info */
                }
                .player-card-details-mobile {
                  margin-bottom: 0.75rem; /* Reduce bottom margin to bring closer to registration details */
                }
                .player-card-registration-details {
                  margin-top: -0.5rem; /* Pull registration details closer to phone info */
                }
                .player-card-mobile-padding {
                  padding-top: 0.5rem; /* Same as avatar margin-left for consistent spacing */
                  padding-bottom: 0.5rem; /* Further reduced from 0.75rem to make card more compact */
                }
                .desktop-only { display: none; }
                .mobile-only { display: flex; }
              }
            `}</style>
            {filteredRegistrations.map((registration, index) => (
              <div 
                key={registration.id} 
                className="group relative bg-white border border-neutral-200 rounded-xl p-6 hover:border-green-200 hover:bg-green-50/30 transition-all duration-300 hover:shadow-sm playerCardAnimate player-card-mobile-padding"
                style={{ 
                  '--delay': `${400 + index * 80}ms`
                } as React.CSSProperties}
              >
                <div className="player-card-content-wrapper flex items-center gap-6" style={{ paddingLeft: '8px' }}>
                  <div className="player-card-main-info flex-1 flex items-center gap-6">
                    {/* Avatar */}
                    <div className={`player-card-avatar w-12 h-12 text-white rounded-lg flex items-center justify-center font-medium text-base shadow-sm flex-shrink-0 ${
                      registration.payment_status === 'paid' 
                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                        : 'bg-gradient-to-br from-amber-500 to-amber-600'
                    }`}>
                      {getInitials(registration.player_name)}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold text-neutral-900 truncate pr-4">
                          {registration.player_name}
                        </h4>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Payment Status - Only show for failed/refunded states */}
                          {(registration.payment_status === 'failed' || registration.payment_status === 'refunded') && (
                            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              registration.payment_status === 'failed' 
                                ? 'bg-red-100 text-red-700 border border-red-200' :
                                'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}>
                              {PAYMENT_STATUS_LABELS[registration.payment_status]}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-neutral-600 mb-3 player-card-details-mobile">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span>{registration.player_phone}</span>
                        </div>
                        
                        {registration.payment_amount && (
                          <div className="desktop-only items-center gap-2 font-semibold text-neutral-900">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <rect width="20" height="14" x="2" y="5" rx="2"/>
                              <line x1="2" x2="22" y1="10" y2="10"/>
                            </svg>
                            <span>{formatCurrency(registration.payment_amount)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Registration Details */}
                      <div className="flex md:items-center items-start gap-6 text-xs text-neutral-500 md:flex-row flex-col player-card-registration-details">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                          </svg>
                          <span>Registrado: {formatDate(registration.registered_at)}</span>
                        </div>

                        {registration.payment_amount && (
                          <div className="mobile-only items-center gap-2 font-semibold text-neutral-900 player-card-payment-amount-mobile">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <rect width="20" height="14" x="2" y="5" rx="2"/>
                              <line x1="2" x2="22" y1="10" y2="10"/>
                            </svg>
                            <span>{formatCurrency(registration.payment_amount)}</span>
                          </div>
                        )}
                        
                        {registration.paid_at && (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M20 6 9 17l-5-5"/>
                            </svg>
                            <span>Pagado: {formatDate(registration.paid_at)}</span>
                          </div>
                        )}
                        
                        {registration.payment_id && (
                          <div className="flex items-center gap-1 font-mono">
                            <span>ID: {registration.payment_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="player-card-actions flex items-center gap-3" style={{ paddingRight: '8px' }}>
                    {registration.payment_status !== 'paid' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleMarkAsPaid(registration.id)}
                        disabled={state.paymentLoading}
                        className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm playersButtonHover"
                      >
                        {state.paymentLoading ? (
                          <div className="flex items-center gap-2">
                            <InlineLoadingSpinner size="sm" />
                            <span className="text-sm button-text">Actualizando...</span>
                          </div>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M20 6 9 17l-5-5"/>
                            </svg>
                            <span className="button-text">Marcar Pagado</span>
                          </>
                        )}
                      </Button>
                    )}

                    {gameStatus !== 'completed' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemovePlayer(registration.id)}
                        disabled={state.loading}
                        className="px-3 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm playersButtonHover"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredRegistrations.length === 0 && regs.length > 0 && (
              <div className="text-center py-12 playersFadeInUp" style={{ '--delay': '400ms' } as React.CSSProperties}>
                <div className="flex items-center justify-center mb-6 playersScaleIn" style={{ '--delay': '500ms' } as React.CSSProperties}>
                  <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center">
                    <SearchIcon size={32} className="text-neutral-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-3 text-neutral-900 playersSlideInLeft" style={{ '--delay': '600ms' } as React.CSSProperties}>{getEmptyStateMessage().title}</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto playersSlideInLeft" style={{ '--delay': '700ms' } as React.CSSProperties}>
                  {getEmptyStateMessage().description}
                </p>
                {state.searchTerm && (
                  <Button
                    variant="ghost"
                    onClick={clearSearch}
                    className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-0 rounded-lg playersButtonHover playersScaleIn"
                    style={{ '--delay': '800ms' } as React.CSSProperties}
                  >
                    <XIcon size={16} className="mr-2" />
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}