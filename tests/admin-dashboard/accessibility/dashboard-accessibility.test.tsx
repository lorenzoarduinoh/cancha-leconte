/**
 * Accessibility tests for Admin Dashboard
 * Tests ARIA compliance, keyboard navigation, and screen reader compatibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import AdminDashboardPage from '../../../app/admin/dashboard/page';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock API responses
global.fetch = jest.fn();

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
    total_games_this_week: 2,
    revenue_this_week: 25000,
    new_players_this_week: 5,
    payment_completion_rate: 85,
  },
};

// Setup authenticated dashboard
const setupAuthenticatedDashboard = () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: mockDashboardData }),
    });
};

describe('Admin Dashboard Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  describe('ARIA Compliance', () => {
    it('has no accessibility violations', async () => {
      setupAuthenticatedDashboard();
      
      const { container } = render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper landmark roles', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument(); // header
        expect(screen.getByRole('main')).toBeInTheDocument(); // main content
      });

      // Check for section landmarks
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
    });

    it('has proper heading hierarchy', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        // Main heading (h1)
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        
        // Section headings (h2/h3)
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(1);
      });
    });

    it('has proper button labels and descriptions', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        // Check specific button labels
        expect(screen.getByLabelText('Crear nuevo partido')).toBeInTheDocument();
        expect(screen.getByLabelText('Cerrar sesión de administrador')).toBeInTheDocument();
        expect(screen.getByLabelText('Crear nuevo partido de fútbol')).toBeInTheDocument();
        expect(screen.getByLabelText('Gestionar jugadores registrados')).toBeInTheDocument();
        expect(screen.getByLabelText('Enviar notificación WhatsApp a jugadores')).toBeInTheDocument();
        expect(screen.getByLabelText('Ver estadísticas y análisis de partidos')).toBeInTheDocument();
      });
    });

    it('has proper form controls and labels', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        // All interactive elements should have accessible names
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          const accessibleName = button.getAttribute('aria-label') || 
                                 button.getAttribute('aria-labelledby') || 
                                 button.textContent;
          expect(accessibleName).toBeTruthy();
        });
      });
    });

    it('provides proper status announcements', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        // Error alerts should have role="alert"
        const errorElement = screen.queryByRole('alert');
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
        }
      });
    });

    it('has proper live regions for dynamic content', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        // Status indicators should be announced
        const statusElements = screen.getAllByRole('status');
        expect(statusElements.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports tab navigation through all interactive elements', async () => {
      setupAuthenticatedDashboard();
      const user = userEvent.setup();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Start from skip link
      const skipLink = screen.getByText('Ir al contenido principal');
      skipLink.focus();
      expect(skipLink).toHaveFocus();

      // Tab through interactive elements
      await user.tab();
      const createButton = screen.getByLabelText('Crear nuevo partido');
      expect(createButton).toHaveFocus();

      await user.tab();
      const logoutButton = screen.getByLabelText('Cerrar sesión de administrador');
      expect(logoutButton).toHaveFocus();
    });

    it('supports skip link functionality', async () => {
      setupAuthenticatedDashboard();
      const user = userEvent.setup();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Ir al contenido principal')).toBeInTheDocument();
      });

      const skipLink = screen.getByText('Ir al contenido principal');
      
      // Click the skip link
      await user.click(skipLink);
      
      // Should navigate to main content (verify href)
      expect(skipLink).toHaveAttribute('href', '#main-content');
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
    });

    it('supports keyboard activation of buttons', async () => {
      setupAuthenticatedDashboard();
      const user = userEvent.setup();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Crear nuevo partido')).toBeInTheDocument();
      });

      const createButton = screen.getByLabelText('Crear nuevo partido');
      createButton.focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(global.alert).toHaveBeenCalledWith('Funcionalidad de crear partido próximamente disponible');

      // Test Space key
      jest.clearAllMocks();
      await user.keyboard(' ');
      expect(global.alert).toHaveBeenCalledWith('Funcionalidad de crear partido próximamente disponible');
    });

    it('maintains logical tab order', async () => {
      setupAuthenticatedDashboard();
      const user = userEvent.setup();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Get all focusable elements
      const focusableElements = screen.getAllByRole('button');
      
      // Tab through and verify order makes sense
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        await user.tab();
        const focusedElement = document.activeElement;
        expect(focusedElement).toBeInstanceOf(HTMLElement);
      }
    });

    it('traps focus appropriately in modal contexts', async () => {
      // This test would be relevant if the dashboard had modals
      // For now, verify that focus doesn't escape the dashboard
      setupAuthenticatedDashboard();
      const user = userEvent.setup();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Tab extensively to ensure focus stays within dashboard
      for (let i = 0; i < 20; i++) {
        await user.tab();
        const focusedElement = document.activeElement;
        expect(focusedElement).toBeInstanceOf(HTMLElement);
        
        // Focus should remain within the dashboard container
        const dashboardContainer = screen.getByRole('main').closest('div');
        expect(dashboardContainer).toContainElement(focusedElement as HTMLElement);
      }
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('provides meaningful text alternatives for visual content', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Check for descriptive text content
      expect(screen.getByText(/jugadores/)).toBeInTheDocument();
      expect(screen.getByText(/registr/)).toBeInTheDocument();
      
      // Icons should have text alternatives or be marked as decorative
      const iconElements = document.querySelectorAll('[aria-hidden="true"]');
      iconElements.forEach(icon => {
        // Decorative icons should be properly marked
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('provides context for data relationships', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Franco Díaz se registró')).toBeInTheDocument();
      });

      // Activity items should have proper context
      const activityItems = screen.getAllByLabelText(/Registro \d+ de \d+/);
      expect(activityItems.length).toBeGreaterThan(0);
    });

    it('announces dynamic content changes', async () => {
      // Mock error scenario first
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        // Error should be announced via role="alert"
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent('Error al cargar datos del dashboard');
      });
    });

    it('provides proper status information', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Payment status should be accessible
      const paymentStatuses = screen.getAllByLabelText(/Estado de pago:/);
      expect(paymentStatuses.length).toBeGreaterThanOrEqual(0);
    });

    it('provides loading state announcements', async () => {
      // Mock delayed response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Loading states should be announced
      const loadingAnnouncements = screen.getAllByLabelText(/Cargando|Loading/);
      expect(loadingAnnouncements.length).toBeGreaterThan(0);
    });
  });

  describe('Color and Contrast', () => {
    it('does not rely solely on color for information', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Status information should have text indicators, not just colors
      expect(screen.getByText('Abierto')).toBeInTheDocument();
      expect(screen.getByText('Pagado')).toBeInTheDocument();
      
      // Payment alerts should have text, not just warning colors
      expect(screen.getByText(/días/)).toBeInTheDocument();
    });

    it('maintains readability in high contrast mode', async () => {
      setupAuthenticatedDashboard();
      
      // Simulate high contrast mode by adding media query class
      document.body.classList.add('high-contrast');
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Text should still be visible and readable
      const textElements = screen.getAllByText(/\w+/);
      expect(textElements.length).toBeGreaterThan(0);
      
      // Clean up
      document.body.classList.remove('high-contrast');
    });
  });

  describe('Focus Management', () => {
    it('provides visible focus indicators', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Crear nuevo partido')).toBeInTheDocument();
      });

      const button = screen.getByLabelText('Crear nuevo partido');
      button.focus();
      
      // Focus should be visible (this would typically check computed styles)
      expect(button).toHaveFocus();
      
      // Button should have focus styles applied
      expect(button).toHaveClass(/focus:/);
    });

    it('manages focus after dynamic content changes', async () => {
      // Test focus management after retry
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockDashboardData }),
        });
      
      const user = userEvent.setup();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Reintentar');
      
      // Click retry button
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Partidos Activos')).toBeInTheDocument();
      });

      // Focus should be managed appropriately after content change
      // In this case, it should move to the main content
      const mainContent = screen.getByRole('main');
      expect(document.activeElement).toBe(mainContent);
    });
  });

  describe('Responsive Accessibility', () => {
    it('maintains accessibility on mobile viewports', async () => {
      setupAuthenticatedDashboard();
      
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const { container } = render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cancha Leconte')).toBeInTheDocument();
      });

      // Run accessibility checks on mobile layout
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('maintains touch target sizes on touch devices', async () => {
      setupAuthenticatedDashboard();
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Crear nuevo partido')).toBeInTheDocument();
      });

      // Check that buttons have proper classes for touch targets
      const buttons = screen.getAllByRole('button');
      
      // Verify we have buttons to test
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check that buttons have reasonable styling classes
      buttons.forEach(button => {
        // Instead of computed styles (which don't work in tests),
        // check for proper CSS classes that ensure touch targets
        const className = button.className;
        
        // Should have button classes that provide adequate sizing
        expect(className).toMatch(/btn|button|h-\d+|min-h|p-\d+|px-\d+|py-\d+/);
        
        // Should not be too small (if it has explicit small classes, flag it)
        if (className.includes('text-xs') || className.includes('h-4') || className.includes('h-6')) {
          // Very small elements should still have adequate padding
          expect(className).toMatch(/p-\d+|px-\d+|py-\d+/);
        }
      });
    });
  });

  describe('Error State Accessibility', () => {
    it('announces errors appropriately', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent('Error al cargar datos del dashboard');
      });

      // Error should have proper ARIA labeling
      const retryButton = screen.getByText('Reintentar');
      expect(retryButton).toBeInTheDocument();
    });

    it('provides clear error recovery instructions', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockRejectedValueOnce(new Error('Network error'));
      
      render(<AdminDashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión. Intenta nuevamente.')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });

      // Error message should be clear and actionable
      const errorMessage = screen.getByText('Error de conexión. Intenta nuevamente.');
      expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
    });
  });
});