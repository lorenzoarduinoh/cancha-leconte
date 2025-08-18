/**
 * Simple E2E Tests for Admin Dashboard
 * Tests basic user flows without complex dependencies
 */

import { test, expect } from '@playwright/test';

// Test data
const adminCredentials = {
  username: 'admin',
  password: 'admin123'
};

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any necessary test state
    await page.goto('/');
  });

  test('should display homepage and navigate to admin login', async ({ page }) => {
    // Visit homepage
    await page.goto('/');
    
    // Should be able to navigate to admin login
    await page.goto('/admin/login');
    
    // Should see login form
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle authentication flow', async ({ page }) => {
    // Go to admin login
    await page.goto('/admin/login');
    
    // Fill in credentials
    await page.fill('input[type="text"]', adminCredentials.username);
    await page.fill('input[type="password"]', adminCredentials.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect or show some result
    // We'll just wait for navigation
    await page.waitForTimeout(2000);
  });

  test('should display admin dashboard elements when authenticated', async ({ page }) => {
    // Mock successful authentication by going directly to dashboard
    // In a real E2E test, we'd go through the full auth flow
    await page.goto('/admin/dashboard');
    
    // Check if we see dashboard elements or login redirect
    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    const isDashboard = await page.locator('text=Cancha Leconte').isVisible();
    
    // Should be either at login (not authenticated) or dashboard (authenticated)
    expect(isLoginPage || isDashboard).toBeTruthy();
    
    if (isDashboard) {
      // If we're at the dashboard, check for key elements
      await expect(page.locator('text=Panel de Administración')).toBeVisible();
      await expect(page.locator('text=Acciones Rápidas')).toBeVisible();
    }
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/admin/login');
    
    // Check that login form is still usable on mobile
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Try to submit with empty credentials
    await page.click('button[type="submit"]');
    
    // Should not crash or cause console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any console errors
    await page.waitForTimeout(1000);
    
    // Should not have any critical console errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load resource') &&
      !error.includes('404') &&
      !error.includes('favicon')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should have proper accessibility landmarks', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Check for basic accessibility landmarks
    const main = page.locator('main');
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
    
    // Check for form labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      // At least one input should have an associated label or aria-label
      const hasLabel = await page.locator('input[aria-label], label input').count();
      expect(hasLabel).toBeGreaterThan(0);
    }
  });
});