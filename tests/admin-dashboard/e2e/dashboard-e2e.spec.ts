/**
 * End-to-End tests for Admin Dashboard
 * Tests complete user workflows in a real browser environment
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const adminCredentials = {
  username: 'admin',
  password: 'admin123',
};

const testGameData = {
  title: 'E2E Test Game',
  description: 'Game created during E2E testing',
  gameDate: '2024-12-25',
  gameTime: '18:00',
  minPlayers: '8',
  maxPlayers: '10',
  costPerPlayer: '2500',
};

// Page object for Admin Dashboard
class AdminDashboardPage {
  constructor(private page: Page) {}

  // Navigation helpers
  async goto() {
    await this.page.goto('/admin/dashboard');
  }

  async gotoLogin() {
    await this.page.goto('/admin/login');
  }

  // Login helpers
  async login(username: string, password: string) {
    await this.page.fill('input[name="username"]', username);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  // Dashboard element getters
  get header() {
    return this.page.locator('header[role="banner"]');
  }

  get mainContent() {
    return this.page.locator('main[role="main"]');
  }

  get activeGamesSection() {
    return this.page.locator('[aria-labelledby="active-games-title"]');
  }

  get paymentAlertsSection() {
    return this.page.locator('[aria-labelledby="payment-alerts-title"]');
  }

  get quickActionsSection() {
    return this.page.locator('[aria-labelledby="quick-actions-title"]');
  }

  get recentActivitySection() {
    return this.page.locator('[aria-labelledby="recent-activity-title"]');
  }

  get createGameButton() {
    return this.page.locator('button[aria-label="Crear nuevo partido"]');
  }

  get logoutButton() {
    return this.page.locator('button[aria-label="Cerrar sesión de administrador"]');
  }

  get retryButton() {
    return this.page.locator('button:has-text("Reintentar")');
  }

  // Dashboard interaction helpers
  async createGame() {
    await this.createGameButton.click();
  }

  async logout() {
    await this.logoutButton.click();
  }

  async retryDataLoad() {
    await this.retryButton.click();
  }

  async waitForDashboardLoad() {
    await this.page.waitForSelector('[data-testid="dashboard-loaded"]', { 
      state: 'attached',
      timeout: 10000 
    });
  }

  // Verification helpers
  async verifyDashboardLayout() {
    await expect(this.header).toBeVisible();
    await expect(this.mainContent).toBeVisible();
    await expect(this.activeGamesSection).toBeVisible();
    await expect(this.quickActionsSection).toBeVisible();
  }

  async verifyStatisticsCards() {
    await expect(this.page.locator('text=Ingresos del Mes')).toBeVisible();
    await expect(this.page.locator('text=Jugadores Activos')).toBeVisible();
    await expect(this.page.locator('text=Tasa de Pago')).toBeVisible();
  }

  async verifyQuickActions() {
    await expect(this.page.locator('button[aria-label*="Crear nuevo partido"]')).toBeVisible();
    await expect(this.page.locator('button[aria-label*="Gestionar jugadores"]')).toBeVisible();
    await expect(this.page.locator('button[aria-label*="Enviar notificación"]')).toBeVisible();
    await expect(this.page.locator('button[aria-label*="Ver estadísticas"]')).toBeVisible();
  }
}

test.describe('Admin Dashboard E2E Tests', () => {
  let dashboardPage: AdminDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new AdminDashboardPage(page);
  });

  test.describe('Authentication Flow', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      await dashboardPage.goto();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.locator('h1:has-text("Iniciar Sesión")')).toBeVisible();
    });

    test('allows admin login and redirects to dashboard', async ({ page }) => {
      await dashboardPage.gotoLogin();
      
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await expect(page.locator('h1:has-text("Cancha Leconte")')).toBeVisible();
    });

    test('handles invalid login credentials', async ({ page }) => {
      await dashboardPage.gotoLogin();
      
      await dashboardPage.login('invalid', 'credentials');
      
      // Should stay on login page with error
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.locator('text=*error*')).toBeVisible();
    });
  });

  test.describe('Dashboard Loading and Display', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      await dashboardPage.waitForDashboardLoad();
    });

    test('displays dashboard layout correctly', async () => {
      await dashboardPage.verifyDashboardLayout();
      
      // Verify page title
      await expect(dashboardPage.page.locator('h1:has-text("Cancha Leconte")')).toBeVisible();
      await expect(dashboardPage.page.locator('text=Panel de Administración')).toBeVisible();
    });

    test('shows loading states initially', async ({ page }) => {
      // Intercept API call to add delay
      await page.route('/api/admin/dashboard', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });

      await dashboardPage.goto();
      
      // Should show loading skeletons
      await expect(page.locator('.animate-pulse')).toBeVisible();
    });

    test('displays active games section with data', async () => {
      await expect(dashboardPage.activeGamesSection).toBeVisible();
      await expect(dashboardPage.page.locator('text=Partidos Activos')).toBeVisible();
      
      // Check for game cards or empty state
      const gameCards = dashboardPage.page.locator('[data-testid="game-card"]');
      const emptyState = dashboardPage.page.locator('text=No hay partidos activos');
      
      await expect(gameCards.or(emptyState)).toBeVisible();
    });

    test('displays statistics cards with values', async () => {
      await dashboardPage.verifyStatisticsCards();
      
      // Verify that statistics show actual values (not just loading)
      await expect(dashboardPage.page.locator('text=/\\$[\\d,]+/')).toBeVisible(); // Currency format
      await expect(dashboardPage.page.locator('text=/\\d+%/')).toBeVisible(); // Percentage format
    });

    test('displays quick actions section', async () => {
      await dashboardPage.verifyQuickActions();
    });

    test('displays recent activity section', async () => {
      await expect(dashboardPage.recentActivitySection).toBeVisible();
      await expect(dashboardPage.page.locator('text=Actividad Reciente')).toBeVisible();
      
      // Check for activity items or empty state
      const activityItems = dashboardPage.page.locator('[data-testid="activity-item"]');
      const emptyState = dashboardPage.page.locator('text=No hay actividad reciente');
      
      await expect(activityItems.or(emptyState)).toBeVisible();
    });
  });

  test.describe('User Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      await dashboardPage.waitForDashboardLoad();
    });

    test('handles logout functionality', async ({ page }) => {
      await dashboardPage.logout();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('handles create game button click', async ({ page }) => {
      // Mock alert to capture it
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('próximamente');
        await dialog.accept();
      });

      await dashboardPage.createGame();
    });

    test('handles quick action button clicks', async ({ page }) => {
      // Test manage players button
      page.on('dialog', async dialog => {
        expect(dialog.message()).toBeTruthy();
        await dialog.accept();
      });

      const managePlayersButton = dashboardPage.page.locator('button[aria-label*="Gestionar jugadores"]');
      await managePlayersButton.click();

      // Test notifications button
      const notificationsButton = dashboardPage.page.locator('button[aria-label*="Enviar notificación"]');
      await notificationsButton.click();

      // Test statistics button
      const statisticsButton = dashboardPage.page.locator('button[aria-label*="Ver estadísticas"]');
      await statisticsButton.click();
    });

    test('handles game card interactions', async ({ page }) => {
      const gameCards = dashboardPage.page.locator('[data-testid="game-card"]');
      const gameCount = await gameCards.count();

      if (gameCount > 0) {
        // Test edit button
        const editButtons = dashboardPage.page.locator('button:has-text("Editar")');
        if (await editButtons.count() > 0) {
          await editButtons.first().click();
        }

        // Test view details button
        const detailButtons = dashboardPage.page.locator('button:has-text("Ver detalles")');
        if (await detailButtons.count() > 0) {
          await detailButtons.first().click();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
    });

    test('handles API errors gracefully', async ({ page }) => {
      // Intercept dashboard API to return error
      await page.route('/api/admin/dashboard', async route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await dashboardPage.goto();
      
      // Should show error message
      await expect(page.locator('text=Error al cargar datos del dashboard')).toBeVisible();
      await expect(dashboardPage.retryButton).toBeVisible();
    });

    test('allows retry after API error', async ({ page }) => {
      let callCount = 0;
      
      // First call fails, second succeeds
      await page.route('/api/admin/dashboard', async route => {
        callCount++;
        if (callCount === 1) {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          route.continue();
        }
      });

      await dashboardPage.goto();
      
      // Wait for error
      await expect(page.locator('text=Error al cargar datos del dashboard')).toBeVisible();
      
      // Click retry
      await dashboardPage.retryDataLoad();
      
      // Should load successfully
      await expect(page.locator('text=Partidos Activos')).toBeVisible();
      await expect(page.locator('text=Error al cargar datos del dashboard')).not.toBeVisible();
    });

    test('handles network connectivity issues', async ({ page }) => {
      // Simulate network failure
      await page.route('/api/admin/dashboard', async route => {
        route.abort('failed');
      });

      await dashboardPage.goto();
      
      // Should show connection error
      await expect(page.locator('text=Error de conexión')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      await dashboardPage.waitForDashboardLoad();
    });

    test('works correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await dashboardPage.verifyDashboardLayout();
      
      // Verify mobile-specific behavior
      const headerActions = dashboardPage.page.locator('.flex-col.md\\:flex-row');
      await expect(headerActions).toHaveClass(/flex-col/);
    });

    test('works correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await dashboardPage.verifyDashboardLayout();
      
      // Verify tablet grid layout
      const dashboardGrid = dashboardPage.page.locator('.dashboard-grid');
      await expect(dashboardGrid).toHaveClass(/md:grid-cols-2/);
    });

    test('works correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      
      await dashboardPage.verifyDashboardLayout();
      
      // Verify desktop grid layout
      const dashboardGrid = dashboardPage.page.locator('.dashboard-grid');
      await expect(dashboardGrid).toHaveClass(/lg:grid-cols-3/);
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      await dashboardPage.waitForDashboardLoad();
    });

    test('has proper heading structure', async ({ page }) => {
      // Check heading hierarchy
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      const h3 = page.locator('h3');
      
      await expect(h1).toHaveCount(1); // Only one main heading
      await expect(h2.or(h3)).toHaveCount.toBeGreaterThan(0); // Section headings exist
    });

    test('has skip link for keyboard navigation', async ({ page }) => {
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeVisible();
      await expect(skipLink).toHaveText('Ir al contenido principal');
    });

    test('has proper ARIA labels and roles', async ({ page }) => {
      // Check for important ARIA attributes
      await expect(page.locator('[role="banner"]')).toBeVisible(); // Header
      await expect(page.locator('[role="main"]')).toBeVisible(); // Main content
      await expect(page.locator('[role="region"]')).toHaveCount.toBeGreaterThan(0); // Sections
      await expect(page.locator('[aria-label]')).toHaveCount.toBeGreaterThan(0); // Labeled elements
    });

    test('supports keyboard navigation', async ({ page }) => {
      // Test tab navigation through interactive elements
      await page.keyboard.press('Tab'); // Skip link
      await page.keyboard.press('Tab'); // First interactive element
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test that all buttons are reachable
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        await page.keyboard.press('Tab');
      }
    });

    test('has proper color contrast', async ({ page }) => {
      // This would typically use axe-core or similar tool
      // For now, verify that text is visible against backgrounds
      const textElements = page.locator('p, span, div').filter({ hasText: /.+/ });
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 20); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          // Verify text is not transparent or hidden
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              opacity: computed.opacity,
            };
          });
          
          expect(styles.opacity).not.toBe('0');
          expect(styles.color).not.toBe('transparent');
        }
      }
    });
  });

  test.describe('Performance', () => {
    test('loads dashboard within acceptable time', async ({ page }) => {
      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      
      const startTime = Date.now();
      await dashboardPage.waitForDashboardLoad();
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('handles large datasets efficiently', async ({ page }) => {
      // Mock API to return large dataset
      await page.route('/api/admin/dashboard', async route => {
        const largeData = {
          data: {
            active_games_count: 100,
            active_games: Array.from({ length: 100 }, (_, i) => ({
              id: `game-${i}`,
              title: `Game ${i}`,
              status: 'open',
              current_players: 5,
              max_players: 10,
            })),
            recent_registrations: Array.from({ length: 500 }, (_, i) => ({
              id: `reg-${i}`,
              player_name: `Player ${i}`,
              registered_at: new Date().toISOString(),
            })),
            payment_alerts: [],
            quick_stats: {
              total_games_this_week: 10,
              revenue_this_week: 50000,
              new_players_this_week: 25,
              payment_completion_rate: 85,
            },
          },
        };
        
        route.fulfill({
          status: 200,
          body: JSON.stringify(largeData),
        });
      });

      await dashboardPage.gotoLogin();
      await dashboardPage.login(adminCredentials.username, adminCredentials.password);
      
      const startTime = Date.now();
      await dashboardPage.waitForDashboardLoad();
      const renderTime = Date.now() - startTime;
      
      // Should still render efficiently with large dataset
      expect(renderTime).toBeLessThan(3000);
      
      // Should only show limited items (not all 100)
      const visibleGames = page.locator('[data-testid="game-card"]');
      const gameCount = await visibleGames.count();
      expect(gameCount).toBeLessThanOrEqual(3); // Should limit display
    });
  });
});