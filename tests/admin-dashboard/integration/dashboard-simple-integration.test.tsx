/**
 * Simple Integration Tests for Admin Dashboard
 * Tests the integration between components without complex middleware
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboardPage from '../../../app/admin/dashboard/page';

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/admin/dashboard',
}));

// Mock dashboard data
const mockDashboardData = {
  active_games_count: 2,
  today_games_count: 1,
  pending_payments_count: 1,
  total_revenue_this_month: 25000,
  recent_registrations_count: 3,
  active_games: [
    {
      id: '1',
      title: 'Partido de Hoy',
      description: 'Partido regular',
      game_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
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
    }
  ],
  recent_registrations: [
    {
      id: '1',
      game_id: '1',
      player_name: 'Juan Pérez',
      player_phone: '+541234567890',
      payment_status: 'paid',
      payment_amount: 2500,
      team_assignment: null,
      registered_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      paid_at: new Date().toISOString(),
    }
  ],
  payment_alerts: [
    {
      id: '1',
      player_name: 'Carlos García',
      player_phone: '+541234567891',
      game_title: 'Partido de Ayer',
      game_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      amount_due: 2000,
      days_overdue: 1,
    }
  ],
  quick_stats: {
    total_games_this_week: 3,
    revenue_this_week: 20000,
    new_players_this_week: 12,
    payment_completion_rate: 85,
  },
};

describe('Admin Dashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    (global.fetch as jest.Mock) = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 'admin-1', role: 'admin' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          data: mockDashboardData,
          message: 'Dashboard data loaded successfully'
        }),
      });
  });

  it('loads and displays complete dashboard data flow', async () => {
    render(<AdminDashboardPage />);

    // Wait for authentication and data loading
    await waitFor(() => {
      expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
    });

    // Verify all main sections are rendered
    expect(screen.getByText('Acciones Rápidas')).toBeInTheDocument();
    expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
    
    // Verify game data is displayed
    await waitFor(() => {
      expect(screen.getByText('Partido de Hoy')).toBeInTheDocument();
    });
    
    // Check for registration activity (may be in different format)
    expect(screen.getByText(/registr/i)).toBeInTheDocument();
  });

  it('handles user interactions and state updates', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
    });

    // Test logout functionality  
    const logoutButton = screen.getByLabelText('Cerrar sesión de administrador');
    
    // Mock the logout endpoint
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });
    
    fireEvent.click(logoutButton);

    // Wait for the logout process to complete
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/login');
    });
  });

  it('displays error states and recovery', async () => {
    // Mock failed data fetch
    (global.fetch as jest.Mock) = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 'admin-1', role: 'admin' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar/)).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByText('Reintentar');
    
    // Mock successful retry
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ 
        data: mockDashboardData,
        message: 'Dashboard data loaded successfully'
      }),
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Partido de Hoy')).toBeInTheDocument();
    });
  });

  it('renders responsive design elements', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
    });

    // Check for responsive classes
    const quickActions = screen.getByText('Acciones Rápidas').closest('.card');
    expect(quickActions).toHaveClass('card');
    
    const dashboardGrid = document.querySelector('.dashboard-grid');
    expect(dashboardGrid).toBeInTheDocument();
  });

  it('integrates currency and date formatting', async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
    });

    // Verify formatted data is displayed
    await waitFor(() => {
      // Look for formatted currency (could be in different formats)
      expect(screen.getByText(/25\.?000/)).toBeInTheDocument();
      expect(screen.getByText(/2\.?000/)).toBeInTheDocument();
    });
  });
});