/**
 * Test setup and configuration for Admin Dashboard tests
 * This file provides common utilities and mocks for all dashboard tests
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock IntersectionObserver for components that might use it
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver for responsive components
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock performance.now for performance tests
global.performance.now = jest.fn(() => Date.now());

// Mock console methods to avoid noise during tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Test environment configuration
export const testConfig = {
  // API endpoints
  apiBaseUrl: 'http://localhost:3000/api',
  dashboardEndpoint: '/admin/dashboard',
  authEndpoint: '/auth/validate',
  logoutEndpoint: '/auth/logout',
  
  // Test timeouts
  defaultTimeout: 5000,
  asyncTimeout: 10000,
  
  // Mock data
  mockAdminUser: {
    id: 'test-admin-123',
    username: 'testadmin',
    email: 'admin@test.com',
    role: 'admin' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-01-01T00:00:00Z',
  },
  
  // Viewport sizes for responsive testing
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1200, height: 800 },
    widescreen: { width: 1920, height: 1080 },
  },
};

// Mock dashboard data factory
export const createMockDashboardData = (overrides = {}) => ({
  active_games_count: 3,
  today_games_count: 1,
  pending_payments_count: 2,
  total_revenue_this_month: 45000,
  recent_registrations_count: 5,
  active_games: [
    {
      id: '1',
      title: 'Test Game 1',
      description: 'Test game description',
      game_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      min_players: 8,
      max_players: 10,
      field_cost_per_player: 2500,
      status: 'open' as const,
      current_players: 6,
      waiting_list_count: 0,
      pending_payments: 1,
      total_revenue: 15000,
      created_by: testConfig.mockAdminUser.id,
      share_token: 'test-token-1',
      created_at: new Date().toISOString(),
      teams_assigned_at: null,
      results_recorded_at: null,
    },
    {
      id: '2',
      title: 'Test Game 2',
      description: 'Another test game',
      game_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      min_players: 10,
      max_players: 10,
      field_cost_per_player: 3000,
      status: 'closed' as const,
      current_players: 10,
      waiting_list_count: 2,
      pending_payments: 0,
      total_revenue: 30000,
      created_by: testConfig.mockAdminUser.id,
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
      player_name: 'Test Player 1',
      player_phone: '+541234567890',
      payment_status: 'paid' as const,
      payment_amount: 2500,
      team_assignment: null,
      registered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      paid_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      game_id: '2',
      player_name: 'Test Player 2',
      player_phone: '+541234567891',
      payment_status: 'pending' as const,
      payment_amount: 3000,
      team_assignment: null,
      registered_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      paid_at: null,
    },
  ],
  payment_alerts: [
    {
      id: '1',
      player_name: 'Overdue Player',
      player_phone: '+541234567892',
      game_title: 'Past Game',
      game_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      amount_due: 2000,
      days_overdue: 1,
    },
  ],
  quick_stats: {
    total_games_this_week: 3,
    revenue_this_week: 45000,
    new_players_this_week: 8,
    payment_completion_rate: 85,
  },
  ...overrides,
});

// Mock API response factory
export const createMockApiResponse = (data: any, success = true, message?: string) => ({
  data: success ? data : undefined,
  error: success ? undefined : (message || 'Test error'),
  message: message || (success ? 'Success' : 'Error'),
});

// Common test utilities
export const testUtils = {
  // Wait for element with custom timeout
  waitForElement: async (selector: string, timeout = testConfig.defaultTimeout) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  // Simulate viewport resize
  setViewport: (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  },

  // Simulate network conditions
  simulateSlowNetwork: (delay = 2000) => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(async (...args) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return originalFetch(...args);
    });
    return () => {
      global.fetch = originalFetch;
    };
  },

  // Simulate offline condition
  simulateOffline: () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    return () => {
      global.fetch = jest.fn();
    };
  },

  // Generate large dataset for performance testing
  generateLargeDataset: (size: number) => {
    return {
      active_games: Array.from({ length: size }, (_, i) => ({
        id: `game-${i}`,
        title: `Game ${i + 1}`,
        status: i % 3 === 0 ? 'open' : i % 3 === 1 ? 'closed' : 'in_progress',
        current_players: Math.floor(Math.random() * 10) + 1,
        max_players: 10,
        // ... other required fields
      })),
      recent_registrations: Array.from({ length: size * 2 }, (_, i) => ({
        id: `reg-${i}`,
        player_name: `Player ${i + 1}`,
        registered_at: new Date(Date.now() - i * 60000).toISOString(),
        // ... other required fields
      })),
    };
  },
};

// Mock implementations
export const mockImplementations = {
  // Mock Next.js router
  mockRouter: {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/admin/dashboard',
    query: {},
    asPath: '/admin/dashboard',
  },

  // Mock Supabase client
  mockSupabaseClient: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
  },

  // Mock auth middleware
  mockAuthMiddleware: (mockUser = testConfig.mockAdminUser) => {
    return jest.fn().mockImplementation((handler) => {
      return async (request: any, context?: any) => {
        return handler(request, { user: mockUser, ...context });
      };
    });
  },

  // Mock fetch responses
  setupMockFetch: (responses: Array<{ url?: string; response: any; delay?: number }>) => {
    global.fetch = jest.fn().mockImplementation(async (url: string, options?: any) => {
      const matchingResponse = responses.find(r => !r.url || url.includes(r.url));
      
      if (matchingResponse) {
        if (matchingResponse.delay) {
          await new Promise(resolve => setTimeout(resolve, matchingResponse.delay));
        }
        
        if (matchingResponse.response instanceof Error) {
          throw matchingResponse.response;
        }
        
        return {
          ok: matchingResponse.response.ok !== false,
          status: matchingResponse.response.status || 200,
          json: async () => matchingResponse.response,
        };
      }
      
      // Default response
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });
  },
};

// Test environment setup and cleanup
export const setupTestEnvironment = () => {
  // Mock console to reduce noise
  Object.keys(mockConsole).forEach(method => {
    console[method as keyof typeof console] = mockConsole[method as keyof typeof mockConsole];
  });

  // Setup global mocks
  global.alert = jest.fn();
  global.confirm = jest.fn(() => true);
  global.prompt = jest.fn(() => 'test-input');

  // Mock crypto for token generation
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: jest.fn(() => 'test-uuid-123'),
    },
  });

  // Setup default fetch mock
  global.fetch = jest.fn();
};

export const cleanupTestEnvironment = () => {
  // Restore console
  Object.keys(originalConsole).forEach(method => {
    console[method as keyof typeof console] = originalConsole[method as keyof typeof originalConsole];
  });

  // Clean up timers
  jest.clearAllTimers();
  jest.useRealTimers();

  // Reset mocks
  jest.clearAllMocks();
};

// Performance testing utilities
export const performanceUtils = {
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    await renderFn();
    const end = performance.now();
    return end - start;
  },

  measureMemoryUsage: () => {
    // In a real browser environment, this would use performance.memory
    // For Node.js tests, we'll mock it
    return {
      usedJSHeapSize: Math.random() * 1000000,
      totalJSHeapSize: Math.random() * 2000000,
      jsHeapSizeLimit: 2000000000,
    };
  },

  expectPerformanceBenchmark: (actualTime: number, maxTime: number, operation: string) => {
    if (actualTime > maxTime) {
      console.warn(`Performance warning: ${operation} took ${actualTime}ms (max: ${maxTime}ms)`);
    }
    expect(actualTime).toBeLessThanOrEqual(maxTime);
  },
};

// Accessibility testing utilities
export const a11yUtils = {
  // Check for basic ARIA requirements
  checkBasicARIA: (container: Element) => {
    const checks = {
      hasHeadings: container.querySelector('h1, h2, h3, h4, h5, h6') !== null,
      hasMainLandmark: container.querySelector('[role="main"], main') !== null,
      hasButtons: container.querySelectorAll('button').length > 0,
      buttonsHaveLabels: Array.from(container.querySelectorAll('button')).every(btn => 
        btn.textContent?.trim() || 
        btn.getAttribute('aria-label') || 
        btn.getAttribute('aria-labelledby')
      ),
    };

    return checks;
  },

  // Simulate color blindness by removing specific color information
  simulateColorBlindness: (type: 'deuteranopia' | 'protanopia' | 'tritanopia' = 'deuteranopia') => {
    const style = document.createElement('style');
    const filters = {
      deuteranopia: 'sepia(100%) saturate(0%) hue-rotate(0deg)',
      protanopia: 'sepia(100%) saturate(0%) hue-rotate(90deg)',
      tritanopia: 'sepia(100%) saturate(0%) hue-rotate(180deg)',
    };
    
    style.textContent = `* { filter: ${filters[type]} !important; }`;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  },
};

// Test data builders
export const dataBuilders = {
  game: (overrides = {}) => ({
    id: 'test-game-id',
    title: 'Test Game',
    description: 'Test game description',
    game_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    min_players: 8,
    max_players: 10,
    field_cost_per_player: 2500,
    status: 'open' as const,
    created_by: testConfig.mockAdminUser.id,
    share_token: 'test-share-token',
    created_at: new Date().toISOString(),
    teams_assigned_at: null,
    results_recorded_at: null,
    ...overrides,
  }),

  registration: (overrides = {}) => ({
    id: 'test-registration-id',
    game_id: 'test-game-id',
    player_name: 'Test Player',
    player_phone: '+541234567890',
    payment_status: 'paid' as const,
    payment_amount: 2500,
    team_assignment: null,
    registered_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    ...overrides,
  }),

  paymentAlert: (overrides = {}) => ({
    id: 'test-alert-id',
    player_name: 'Test Player',
    player_phone: '+541234567890',
    game_title: 'Test Game',
    game_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    amount_due: 2000,
    days_overdue: 1,
    ...overrides,
  }),
};

// Export default setup function
export default function setupDashboardTests() {
  setupTestEnvironment();
  return cleanupTestEnvironment;
}