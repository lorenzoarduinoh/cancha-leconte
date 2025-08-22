'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchWithCSRF } from '../../lib/utils/csrf';

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data when authenticated
  useEffect(() => {
    if (!isAuthenticated || isLoading || dataLoading) return;
    
    const fetchData = async () => {
      setDataLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/admin/dashboard', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          setDashboardData(result.data);
        } else {
          setError('Error al cargar datos del dashboard');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Error de conexión. Intenta nuevamente.');
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, isLoading]); // Only trigger when auth state changes

  // Simple retry function for the error button
  const retryFetch = () => {
    if (dataLoading) return;
    
    setDataLoading(true);
    setError(null);
    
    fetch('/api/admin/dashboard', {
      method: 'GET',
      credentials: 'include',
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Error al cargar datos del dashboard');
      }
    })
    .then(result => {
      setDashboardData(result.data);
    })
    .catch(error => {
      console.error('Error fetching dashboard data:', error);
      setError('Error de conexión. Intenta nuevamente.');
    })
    .finally(() => {
      setDataLoading(false);
    });
  };

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetchWithCSRF('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      router.push('/admin/login');
    }
  };

  const handleCreateGame = () => {
    router.push('/admin/games');
  };

  const handleSendNotification = () => {
    // Navigate to notifications - for now just show alert
    alert('Funcionalidad de notificaciones próximamente disponible');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Validando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Ir al contenido principal
      </a>

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 dashboard-header" role="banner">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary">Cancha Leconte</h1>
              <p className="text-sm text-neutral-600">Panel de Administración</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
              <div className="flex gap-2">
                <Button 
                  variant="primary" 
                  onClick={handleCreateGame}
                  aria-label="Crear nuevo partido"
                  className="flex-1 md:flex-none"
                >
                  + Crear Partido
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  aria-label="Cerrar sesión de administrador"
                  className="flex-1 md:flex-none"
                >
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8" role="main">
        <h2 className="sr-only">Dashboard Principal</h2>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <div className="flex items-center">
              <span className="text-red-500 mr-2" aria-hidden="true">⚠</span>
              <p className="text-red-700">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={retryFetch}
                className="ml-auto"
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}

        <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Active Games Overview Card */}
          <Card variant="elevated" className="dashboard-span-full lg:dashboard-span-2 border-l-4 border-l-primary" role="region" aria-labelledby="active-games-title">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle id="active-games-title">Partidos Activos</CardTitle>
                <Button variant="ghost" size="sm" aria-label="Ver todos los partidos">
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                      <div className="h-3 bg-neutral-100 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.active_games?.length ? (
                <div className="space-y-4">
                  {(dashboardData.active_games || []).slice(0, 3).map((game) => (
                    <div key={game.id} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-neutral-900">{game.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          game.status === 'open' ? 'bg-success text-white' :
                          game.status === 'closed' ? 'bg-warning text-white' :
                          'bg-neutral-200 text-neutral-700'
                        }`}>
                          {game.status === 'open' ? 'Abierto' :
                           game.status === 'closed' ? 'Cerrado' :
                           'En Progreso'}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">
                        {formatDate(game.game_date)}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium text-primary">
                            {game.current_players}/{game.max_players}
                          </span>
                          <span className="text-neutral-600 ml-1">jugadores</span>
                        </div>
                        <div className="game-card-actions flex flex-col sm:flex-row gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="flex-1 sm:flex-none"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            Gestionar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="flex-1 sm:flex-none"
                            onClick={() => router.push(`/admin/games/${game.id}`)}
                          >
                            Ver detalles
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600 mb-4">No hay partidos activos</p>
                  <Button onClick={handleCreateGame}>
                    Crear primer partido
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Alerts */}
          <Card className="bg-warning/10 border-warning" role="region" aria-labelledby="payment-alerts-title">
            <CardHeader>
              <div className="flex items-center">
                <span className="text-warning mr-2" aria-hidden="true">💰</span>
                <CardTitle id="payment-alerts-title" className="text-warning">Alertas de Pago</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-warning/20 rounded"></div>
                  <div className="h-3 bg-warning/20 rounded w-3/4"></div>
                </div>
              ) : dashboardData?.payment_alerts?.length ? (
                <div className="space-y-3">
                  {(dashboardData.payment_alerts || []).slice(0, 5).map((alert) => (
                    <div key={alert.id} className="text-sm">
                      <p className="font-medium text-warning">
                        {alert.player_name}
                      </p>
                      <p className="text-neutral-600">
                        {formatCurrency(alert.amount_due)} • {alert.days_overdue} días
                      </p>
                    </div>
                  ))}
                  {(dashboardData.payment_alerts || []).length > 5 && (
                    <p className="text-xs text-warning">
                      +{(dashboardData.payment_alerts || []).length - 5} más
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-neutral-600 text-sm">
                  ✅ No hay pagos pendientes
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="elevated" className="dashboard-span-full md:dashboard-span-full lg:dashboard-span-3" role="region" aria-labelledby="quick-actions-title">
            <CardHeader>
              <CardTitle id="quick-actions-title">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4" role="toolbar" aria-label="Acciones principales de administración">
                <Button 
                  variant="primary" 
                  onClick={handleCreateGame}
                  className="h-20 flex flex-col items-center justify-center text-sm px-3"
                  aria-label="Crear nuevo partido de fútbol"
                >
                  <span className="text-2xl mb-2" aria-hidden="true">⚽</span>
                  <span className="text-center">Crear Partido</span>
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/admin/games')}
                  className="h-20 flex flex-col items-center justify-center text-sm px-3"
                  aria-label="Gestionar jugadores registrados"
                >
                  <span className="text-2xl mb-2" aria-hidden="true">👥</span>
                  <span className="text-center">Gestionar Partidos</span>
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleSendNotification}
                  className="h-20 flex flex-col items-center justify-center text-sm px-3"
                  aria-label="Enviar notificación WhatsApp a jugadores"
                >
                  <span className="text-2xl mb-2" aria-hidden="true">📱</span>
                  <span className="text-center">Enviar Notificación</span>
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/admin/analytics')}
                  className="h-20 flex flex-col items-center justify-center text-sm px-3"
                  aria-label="Ver estadísticas y análisis de partidos"
                >
                  <span className="text-2xl mb-2" aria-hidden="true">📊</span>
                  <span className="text-center">Ver Estadísticas</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingresos del Mes</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-neutral-200 rounded mb-2"></div>
                  <div className="h-4 bg-neutral-100 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-success">
                    {formatCurrency(dashboardData?.total_revenue_this_month || 0)}
                  </div>
                  <p className="text-sm text-neutral-600">
                    {dashboardData?.quick_stats?.total_games_this_week || 0} partidos esta semana
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Player Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jugadores Activos</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-neutral-200 rounded mb-2"></div>
                  <div className="h-4 bg-neutral-100 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-primary">
                    {dashboardData?.quick_stats?.new_players_this_week || 0}
                  </div>
                  <p className="text-sm text-neutral-600">
                    Nuevos esta semana
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasa de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-neutral-200 rounded mb-2"></div>
                  <div className="h-4 bg-neutral-100 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-info">
                    {Math.round(dashboardData?.quick_stats?.payment_completion_rate || 0)}%
                  </div>
                  <p className="text-sm text-neutral-600">
                    Pagos completados
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="elevated" className="dashboard-span-full md:dashboard-span-full lg:dashboard-span-3" role="region" aria-labelledby="recent-activity-title">
            <CardHeader>
              <CardTitle id="recent-activity-title">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-3" aria-label="Cargando actividad reciente" role="status">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="activity-avatar w-8 h-8 bg-neutral-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-neutral-200 rounded mb-1"></div>
                        <div className="h-3 bg-neutral-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.recent_registrations?.length ? (
                <div className="space-y-3" role="feed" aria-label="Lista de registraciones recientes">
                  {(dashboardData.recent_registrations || []).slice(0, 5).map((registration, index) => (
                    <div 
                      key={registration.id} 
                      className="activity-item flex items-center gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg"
                      role="article"
                      aria-label={`Registro ${index + 1} de ${(dashboardData.recent_registrations || []).length}`}
                    >
                      <div 
                        className="activity-avatar w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                        aria-hidden="true"
                      >
                        {registration.player_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 text-sm md:text-base truncate">
                          {registration.player_name} se registró
                        </p>
                        <p className="text-xs md:text-sm text-neutral-600">
                          <time dateTime={registration.registered_at}>
                            {formatDate(registration.registered_at)}
                          </time>
                        </p>
                      </div>
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          registration.payment_status === 'paid' ? 'bg-success text-white' :
                          registration.payment_status === 'pending' ? 'bg-warning text-white' :
                          'bg-neutral-200 text-neutral-700'
                        }`}
                        aria-label={`Estado de pago: ${
                          registration.payment_status === 'paid' ? 'Pagado' :
                          registration.payment_status === 'pending' ? 'Pendiente' :
                          'Fallido'
                        }`}
                      >
                        {registration.payment_status === 'paid' ? 'Pagado' :
                         registration.payment_status === 'pending' ? 'Pendiente' :
                         'Fallido'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-600 text-center py-8" role="status">
                  No hay actividad reciente
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}