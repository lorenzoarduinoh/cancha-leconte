import { test, expect } from '@playwright/test';

test.describe('Authentication System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the login page
    await page.goto('/admin/login');
  });

  test.describe('Login Page', () => {
    test('should display login form elements', async ({ page }) => {
      // Check that all form elements are present
      await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
      await expect(page.getByLabel(/usuario/i)).toBeVisible();
      await expect(page.getByLabel(/contraseña/i)).toBeVisible();
      await expect(page.getByLabel(/mantenerme conectado/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      // Try to submit empty form
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Check for validation messages
      await expect(page.getByText(/el usuario es obligatorio/i)).toBeVisible();
      await expect(page.getByText(/la contraseña es obligatoria/i)).toBeVisible();
    });

    test('should show validation errors for invalid username', async ({ page }) => {
      // Enter invalid username
      await page.getByLabel(/usuario/i).fill('ab'); // Too short
      await page.getByLabel(/contraseña/i).fill('ValidPassword123');
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Check for validation message
      await expect(page.getByText(/al menos 3 caracteres/i)).toBeVisible();
    });

    test('should show validation errors for invalid password', async ({ page }) => {
      // Enter invalid password
      await page.getByLabel(/usuario/i).fill('testuser');
      await page.getByLabel(/contraseña/i).fill('123'); // Too short
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Check for validation message
      await expect(page.getByText(/al menos 8 caracteres/i)).toBeVisible();
    });

    test('should disable submit button while form is invalid', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /iniciar sesión/i });
      
      // Button should be disabled when form is empty
      await expect(submitButton).toBeDisabled();
      
      // Fill username only
      await page.getByLabel(/usuario/i).fill('testuser');
      await expect(submitButton).toBeDisabled();
      
      // Fill password too
      await page.getByLabel(/contraseña/i).fill('ValidPassword123');
      await expect(submitButton).toBeEnabled();
    });

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.getByLabel(/contraseña/i);
      const toggleButton = page.getByRole('button', { name: /mostrar contraseña/i });
      
      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await expect(page.getByRole('button', { name: /ocultar contraseña/i })).toBeVisible();
      
      // Click toggle to hide password again
      await page.getByRole('button', { name: /ocultar contraseña/i }).click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should handle remember me checkbox', async ({ page }) => {
      const rememberMeCheckbox = page.getByLabel(/mantenerme conectado/i);
      
      // Should be unchecked by default
      await expect(rememberMeCheckbox).not.toBeChecked();
      
      // Check the checkbox
      await rememberMeCheckbox.check();
      await expect(rememberMeCheckbox).toBeChecked();
      
      // Uncheck the checkbox
      await rememberMeCheckbox.uncheck();
      await expect(rememberMeCheckbox).not.toBeChecked();
    });

    test('should show loading state during submission', async ({ page }) => {
      // Mock a slow API response
      await page.route('/api/auth/login', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Usuario o contraseña incorrectos',
            code: 'INVALID_CREDENTIALS'
          })
        });
      });

      // Fill form and submit
      await page.getByLabel(/usuario/i).fill('testuser');
      await page.getByLabel(/contraseña/i).fill('wrongpassword');
      
      const submitButton = page.getByRole('button', { name: /iniciar sesión/i });
      await submitButton.click();
      
      // Check loading state
      await expect(page.getByText(/iniciando sesión/i)).toBeVisible();
      await expect(submitButton).toBeDisabled();
      
      // Wait for error to appear
      await expect(page.getByText(/usuario o contraseña incorrectos/i)).toBeVisible();
    });

    test('should show error message for invalid credentials', async ({ page }) => {
      // Mock API response for invalid credentials
      await page.route('/api/auth/login', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Usuario o contraseña incorrectos',
            code: 'INVALID_CREDENTIALS'
          })
        });
      });

      // Fill form with invalid credentials
      await page.getByLabel(/usuario/i).fill('invaliduser');
      await page.getByLabel(/contraseña/i).fill('invalidpassword');
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Check for error message
      await expect(page.getByText(/usuario o contraseña incorrectos/i)).toBeVisible();
    });

    test('should show rate limit error', async ({ page }) => {
      // Mock API response for rate limiting
      await page.route('/api/auth/login', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.',
            code: 'RATE_LIMITED',
            retry_after: 300
          })
        });
      });

      // Fill form and submit
      await page.getByLabel(/usuario/i).fill('testuser');
      await page.getByLabel(/contraseña/i).fill('password123');
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Check for rate limit error
      await expect(page.getByText(/demasiados intentos/i)).toBeVisible();
    });

    test('should redirect to dashboard on successful login', async ({ page }) => {
      // Mock successful login response
      await page.route('/api/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: 'user-123',
              username: 'testuser',
              name: 'Test User',
              role: 'admin'
            },
            session: {
              expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              remember_me: false
            }
          })
        });
      });

      // Fill form with valid credentials
      await page.getByLabel(/usuario/i).fill('testuser');
      await page.getByLabel(/contraseña/i).fill('ValidPassword123');
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Should show success state briefly
      await expect(page.getByText(/éxito/i)).toBeVisible({ timeout: 1000 });
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper focus management', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/usuario/i)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/contraseña/i)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/mantenerme conectado/i)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeFocused();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Fill form using keyboard
      await page.getByLabel(/usuario/i).focus();
      await page.keyboard.type('testuser');
      
      await page.keyboard.press('Tab');
      await page.keyboard.type('ValidPassword123');
      
      // Toggle remember me with space
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      await expect(page.getByLabel(/mantenerme conectado/i)).toBeChecked();
      
      // Submit with Enter
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Form should be submitted (will show validation or API error)
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper form labeling
      await expect(page.getByRole('form')).toBeVisible();
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
      
      // Check skip link
      await expect(page.getByRole('link', { name: /saltar al contenido/i })).toBeVisible();
      
      // Check error announcements
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page.getByRole('alert')).toBeVisible();
    });

    test('should work with screen reader announcements', async ({ page }) => {
      // Fill invalid form to trigger errors
      await page.getByLabel(/usuario/i).fill('ab');
      await page.getByLabel(/contraseña/i).fill('123');
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Check that errors have proper aria-live regions
      const errorMessages = page.getByRole('alert');
      await expect(errorMessages).toHaveCount(2); // Username and password errors
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // All elements should still be visible and functional
      await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
      await expect(page.getByLabel(/usuario/i)).toBeVisible();
      await expect(page.getByLabel(/contraseña/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
      
      // Form should still be functional
      await page.getByLabel(/usuario/i).fill('testuser');
      await page.getByLabel(/contraseña/i).fill('ValidPassword123');
      await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
    });

    test('should work on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Form should be properly sized and functional
      await expect(page.getByRole('form')).toBeVisible();
      await page.getByLabel(/usuario/i).fill('testuser');
      await page.getByLabel(/contraseña/i).fill('ValidPassword123');
      await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled();
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive information in HTML', async ({ page }) => {
      const content = await page.content();
      
      // Should not contain any hardcoded credentials or secrets
      expect(content).not.toContain('password');
      expect(content).not.toContain('secret');
      expect(content).not.toContain('key');
      
      // Password field should have proper type
      await expect(page.getByLabel(/contraseña/i)).toHaveAttribute('type', 'password');
    });

    test('should have proper form security attributes', async ({ page }) => {
      const form = page.getByRole('form');
      
      // Form should have novalidate to use custom validation
      await expect(form).toHaveAttribute('novalidate');
      
      // Password input should have proper autocomplete
      await expect(page.getByLabel(/contraseña/i)).toHaveAttribute('autocomplete', 'current-password');
      await expect(page.getByLabel(/usuario/i)).toHaveAttribute('autocomplete', 'username');
    });
  });
});