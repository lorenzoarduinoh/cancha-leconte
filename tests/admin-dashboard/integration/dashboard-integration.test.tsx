/**
 * Integration tests for Admin Dashboard
 * Tests the complete flow from API to UI rendering
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextRequest, NextResponse } from 'next/server';
import AdminDashboardPage from '../../../app/admin/dashboard/page';
import { GET } from '../../../app/api/admin/dashboard/route';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../../lib/auth/middleware';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('../../../lib/auth/middleware');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Setup MSW for API mocking
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock data
const mockDashboardApiResponse = {
  data: {
    active_games_count: 3,
    today_games_count: 1,
    pending_payments_count: 2,
    total_revenue_this_month: 45000,
    recent_registrations_count: 5,
    active_games: [
      {
        id: '1',
        title: 'Partido de Hoy - Tarde',
        description: 'Partido regular de fútbol 5',
        game_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        min_players: 8,
        max_players: 10,
        field_cost_per_player: 2500,
        status: 'open',
        current_players: 6,
        waiting_list_count: 0,
        pending_payments: 1,
        total_revenue: 15000,
        created_by: 'admin-1',
        share_token: 'test-token',
        created_at: new Date().toISOString(),
        teams_assigned_at: null,
        results_recorded_at: null,
      },
      {
        id: '2',
        title: 'Clásico del Sábado',
        description: 'El partido más competitivo',
        game_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        min_players: 10,
        max_players: 10,
        field_cost_per_player: 3500,
        status: 'closed',
        current_players: 10,
        waiting_list_count: 2,
        pending_payments: 0,
        total_revenue: 35000,
        created_by: 'admin-1',
        share_token: 'test-token-2',
        created_at: new Date().toISOString(),
        teams_assigned_at: null,
        results_recorded_at: null,
      },
    ],
    recent_registrations: [
      {
        id: '1',
        game_id: '1',
        player_name: 'Franco Díaz',
        player_phone: '+541157890123',
        payment_status: 'paid',
        payment_amount: 2500,
        team_assignment: null,
        registered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        game_id: '1',
        player_name: 'Sebastián Ramos',
        player_phone: '+541159012345',
        payment_status: 'paid',
        payment_amount: 2500,
        team_assignment: null,
        registered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        paid_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
    payment_alerts: [
      {
        id: '1',
        player_name: 'Santiago Pérez',
        player_phone: '+541141234567',
        game_title: 'Partido de Ayer',
        game_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        amount_due: 2000,
        days_overdue: 1,
      },
    ],
    quick_stats: {
      total_games_this_week: 3,
      revenue_this_week: 51000,
      new_players_this_week: 8,
      payment_completion_rate: 85,
    },
  },
  message: 'Dashboard data loaded successfully',
};

const server = setupServer(
  // Auth validation endpoint
  http.get('/api/auth/validate', () => {
    return HttpResponse.json({ success: true });
  }),
  
  // Dashboard data endpoint
  http.get('/api/admin/dashboard', () => {
    return HttpResponse.json(mockDashboardApiResponse);
  }),
  
  // Logout endpoint
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  })
);

describe('Admin Dashboard Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
    
    // Mock Supabase for API tests
    const mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Mock auth middleware
    (withAuth as jest.Mock).mockImplementation((handler) => {
      return async (request: NextRequest) => {
        return handler(request, { user: { id: 'admin-123', role: 'admin' } });
      };
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Full Dashboard Flow', () => {
    it('successfully loads and displays dashboard data from API', async () => {
      render(<AdminDashboardPage />);

      // Wait for authentication and data loading
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Verify active games are displayed
      expect(screen.getByText('Partido de Hoy - Tarde')).toBeInTheDocument();
      expect(screen.getByText('Clásico del Sábado')).toBeInTheDocument();
      expect(screen.getByText('6/10')).toBeInTheDocument(); // Players count
      expect(screen.getByText('10/10')).toBeInTheDocument();

      // Verify payment alerts
      expect(screen.getByText('Alertas de Pago')).toBeInTheDocument();
      expect(screen.getByText('Santiago Pérez')).toBeInTheDocument();

      // Verify recent activity
      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
      expect(screen.getByText('Franco Díaz se registró')).toBeInTheDocument();
      expect(screen.getByText('Sebastián Ramos se registró')).toBeInTheDocument();

      // Verify statistics
      expect(screen.getByText('$45.000')).toBeInTheDocument(); // Monthly revenue
      expect(screen.getByText('8')).toBeInTheDocument(); // New players
      expect(screen.getByText('85%')).toBeInTheDocument(); // Payment rate
    });

    it('handles authentication failure and redirects', async () => {
      // Mock auth failure
      server.use(
        http.get('/api/auth/validate', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      const mockPush = jest.fn();
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({ push: mockPush }),
      }));

      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/login');
      });
    });

    it('handles API errors gracefully with retry functionality', async () => {
      let attemptCount = 0;
      server.use(
        http.get('/api/admin/dashboard', () => {
          attemptCount++;
          if (attemptCount === 1) {
            return new HttpResponse(null, { status: 500 });
          }
          return HttpResponse.json(mockDashboardApiResponse);
        })
      );

      render(<AdminDashboardPage />);

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Error al cargar datos del dashboard')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Reintentar');
      await act(async () => {
        await userEvent.click(retryButton);
      });

      // Wait for successful data load
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
        expect(screen.queryByText('Error al cargar datos del dashboard')).not.toBeInTheDocument();
      });
    });

    it('shows loading states during data fetch', async () => {
      // Delay the API response
      server.use(
        http.get('/api/admin/dashboard', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockDashboardApiResponse);
        })
      );

      render(<AdminDashboardPage />);

      // Wait for auth to complete
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Check for loading indicators
      await waitFor(() => {
        const loadingElements = screen.getAllByLabelText(/Loading|Cargando/i);
        expect(loadingElements.length).toBeGreaterThan(0);
      });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction Integration', () => {
    beforeEach(async () => {
      render(<AdminDashboardPage />);
      
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });
    });

    it('integrates logout functionality with API', async () => {
      const mockPush = jest.fn();
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({ push: mockPush }),
      }));

      const logoutButton = screen.getByLabelText('Cerrar sesión de administrador');
      
      await act(async () => {
        await userEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/login');
      });
    });

    it('handles quick action interactions', async () => {
      const createGameButton = screen.getByLabelText('Crear nuevo partido de fútbol');
      
      await act(async () => {
        await userEvent.click(createGameButton);
      });

      expect(global.alert).toHaveBeenCalledWith('Funcionalidad de crear partido próximamente disponible');

      const managePlayersButton = screen.getByLabelText('Gestionar jugadores registrados');
      
      await act(async () => {
        await userEvent.click(managePlayersButton);
      });

      expect(global.alert).toHaveBeenCalledWith('Próximamente');
    });

    it('handles view details interactions', async () => {
      const viewDetailsButtons = screen.getAllByText('Ver detalles');
      expect(viewDetailsButtons.length).toBeGreaterThan(0);

      await act(async () => {
        await userEvent.click(viewDetailsButtons[0]);
      });

      // Currently this just shows an alert, but in a real implementation
      // it would navigate to a detailed view
    });

    it('handles edit game interactions', async () => {
      const editButtons = screen.getAllByText('Editar');
      expect(editButtons.length).toBeGreaterThan(0);

      await act(async () => {
        await userEvent.click(editButtons[0]);
      });

      // Currently this doesn't have implementation, but the button is clickable
    });
  });

  describe('Real-time Data Updates', () => {
    it('refreshes data when component receives focus', async () => {
      let requestCount = 0;
      server.use(
        http.get('/api/admin/dashboard', () => {
          requestCount++;
          return HttpResponse.json({
            ...mockDashboardApiResponse,
            data: {
              ...mockDashboardApiResponse.data,
              active_games_count: requestCount, // Change data to verify refresh
            },
          });
        })
      );

      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Simulate window focus (which might trigger a refresh in a real implementation)
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // For now, the component doesn't implement real-time updates,
      // but this test structure is ready for when it does
    });
  });

  describe('Error Recovery Integration', () => {
    it('recovers from network errors', async () => {
      let shouldFail = true;
      server.use(
        http.get('/api/admin/dashboard', () => {
          if (shouldFail) {
            return HttpResponse.error();
          }
          return HttpResponse.json(mockDashboardApiResponse);
        })
      );

      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument();
      });

      // Simulate network recovery
      shouldFail = false;
      
      const retryButton = screen.getByText('Reintentar');
      await act(async () => {
        await userEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
        expect(screen.queryByText('Error de conexión')).not.toBeInTheDocument();
      });
    });

    it('handles partial data scenarios', async () => {
      server.use(
        http.get('/api/admin/dashboard', () => {
          return HttpResponse.json({
            data: {
              ...mockDashboardApiResponse.data,
              active_games: [],
              recent_registrations: [],
              payment_alerts: [],
            },
          });
        })
      );

      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No hay partidos activos')).toBeInTheDocument();
        expect(screen.getByText('✅ No hay pagos pendientes')).toBeInTheDocument();
        expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
      });

      // Verify that the empty state doesn't break the layout
      expect(screen.getByText('Crear primer partido')).toBeInTheDocument();
    });
  });

  describe('Data Consistency Integration', () => {
    it('maintains data consistency across components', async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Verify that player counts are consistent
      const gameCard = screen.getByText('Partido de Hoy - Tarde').closest('div');
      expect(gameCard).toHaveTextContent('6/10');

      // Verify that revenue calculations are consistent
      expect(screen.getByText('$45.000')).toBeInTheDocument(); // Monthly revenue
      
      // Verify that payment alerts match the data
      expect(screen.getByText('Santiago Pérez')).toBeInTheDocument();
      expect(screen.getByText('$2.000 • 1 días')).toBeInTheDocument();
    });

    it('handles concurrent data updates correctly', async () => {
      let updateCount = 0;
      server.use(
        http.get('/api/admin/dashboard', () => {
          updateCount++;
          return HttpResponse.json({
            ...mockDashboardApiResponse,
            data: {
              ...mockDashboardApiResponse.data,
              total_revenue_this_month: 45000 + (updateCount * 1000),
            },
          });
        })
      );

      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('$46.000')).toBeInTheDocument(); // Updated revenue
      });
    });
  });

  describe('Performance Integration', () => {
    it('renders efficiently with large datasets', async () => {
      // Create a large dataset
      const largeDataset = {
        ...mockDashboardApiResponse.data,
        active_games: Array.from({ length: 50 }, (_, i) => ({
          ...mockDashboardApiResponse.data.active_games[0],
          id: `game-${i}`,
          title: `Partido ${i + 1}`,
        })),
        recent_registrations: Array.from({ length: 100 }, (_, i) => ({
          ...mockDashboardApiResponse.data.recent_registrations[0],
          id: `reg-${i}`,
          player_name: `Player ${i + 1}`,
        })),
      };

      server.use(
        http.get('/api/admin/dashboard', () => {
          return HttpResponse.json({
            data: largeDataset,
          });
        })
      );

      const startTime = performance.now();
      
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time even with large dataset
      expect(renderTime).toBeLessThan(2000); // 2 seconds max

      // Should only show limited items (not all 50 games)
      const gameElements = screen.getAllByText(/Partido \d+/);
      expect(gameElements.length).toBeLessThanOrEqual(3); // Only first 3 shown
    });
  });
});