/**
 * Unit tests for /api/admin/dashboard route
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/admin/dashboard/route';
import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../../lib/auth/middleware';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('../../../lib/auth/middleware');
jest.mock('../../../lib/utils/api');

const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      in: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      eq: jest.fn(() => ({
        lt: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      gte: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
};

// Mock data
const mockAdminUser = {
  id: 'admin-123',
  username: 'admin',
  email: 'admin@cancha.com',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_login_at: '2024-01-01T00:00:00Z',
};

const mockGamesData = [
  {
    id: '1',
    title: 'Partido de Hoy',
    description: 'Partido regular',
    game_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    min_players: 8,
    max_players: 10,
    field_cost_per_player: 2500,
    status: 'open',
    created_by: 'admin-123',
    share_token: 'test-token',
    created_at: new Date().toISOString(),
    teams_assigned_at: null,
    results_recorded_at: null,
    game_registrations: [
      {
        id: '1',
        player_name: 'Juan Pérez',
        player_phone: '+541234567890',
        team_assignment: null,
        payment_status: 'paid',
        payment_amount: 2500,
        registered_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      },
      {
        id: '2',
        player_name: 'María García',
        player_phone: '+541234567891',
        team_assignment: null,
        payment_status: 'pending',
        payment_amount: 2500,
        registered_at: new Date().toISOString(),
        paid_at: null,
      },
    ],
    game_results: [],
  },
];

const mockRecentRegistrations = [
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
    games: {
      title: 'Partido de Hoy',
      game_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
  },
];

const mockPendingPaymentGames = [
  {
    id: '2',
    title: 'Partido de Ayer',
    game_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    field_cost_per_player: 2000,
    game_registrations: [
      {
        id: '3',
        player_name: 'Santiago Pérez',
        player_phone: '+541141234567',
        payment_status: 'pending',
        payment_amount: 2000,
      },
    ],
  },
];

describe('/api/admin/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  describe('GET /api/admin/dashboard', () => {
    it('returns comprehensive dashboard data for authenticated admin', async () => {
      // Mock auth middleware to pass through
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      // Mock database responses
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          active_games_count: 3,
          today_games_count: 1,
          pending_payments_count: 2,
          total_revenue_this_month: 45000,
          recent_registrations_count: 5,
        }],
        error: null,
      });

      // Setup sequential database calls
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: mockGamesData,
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: mockRecentRegistrations,
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: mockPendingPaymentGames,
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({
              data: mockGamesData,
              error: null,
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({
              data: mockRecentRegistrations,
              error: null,
            })),
          })),
        });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.active_games_count).toBe(3);
      expect(data.data.active_games).toHaveLength(1);
      expect(data.data.recent_registrations).toHaveLength(1);
      expect(data.data.payment_alerts).toHaveLength(1);
      expect(data.data.quick_stats).toBeDefined();
    });

    it('handles database function failure gracefully', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      // Mock database function failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Function not found' },
      });

      // Mock successful fallback queries
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: mockGamesData,
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValue({
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.active_games_count).toBe(1); // Fallback calculation
    });

    it('returns error when active games query fails', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              })),
            })),
          })),
        })),
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error al obtener partidos activos');
    });

    it('handles unexpected errors gracefully', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          throw new Error('Unexpected error');
        };
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error al cargar datos del dashboard');
    });

    it('calculates game statistics correctly', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      const gameWithStats = {
        ...mockGamesData[0],
        game_registrations: [
          {
            id: '1',
            player_name: 'Player 1',
            player_phone: '+541234567890',
            payment_status: 'paid',
            payment_amount: 2500,
          },
          {
            id: '2',
            player_name: 'Player 2',
            player_phone: '+541234567891',
            payment_status: 'pending',
            payment_amount: 2500,
          },
        ],
      };

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [gameWithStats],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValue({
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const game = data.data.active_games[0];
      expect(game.current_players).toBe(2);
      expect(game.pending_payments).toBe(1);
      expect(game.total_revenue).toBe(2500); // Only paid registrations
      expect(game.waiting_list_count).toBe(0); // No waiting list
    });

    it('processes payment alerts correctly', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      const overdueGame = {
        id: '2',
        title: 'Overdue Game',
        game_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        field_cost_per_player: 3000,
        game_registrations: [
          {
            id: '3',
            player_name: 'Overdue Player',
            player_phone: '+541234567892',
            payment_status: 'pending',
            payment_amount: 3000,
          },
        ],
      };

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [overdueGame],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValue({
          select: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.payment_alerts).toHaveLength(1);
      expect(data.data.payment_alerts[0].player_name).toBe('Overdue Player');
      expect(data.data.payment_alerts[0].amount_due).toBe(3000);
      expect(data.data.payment_alerts[0].days_overdue).toBeGreaterThan(0);
    });

    it('calculates quick stats correctly', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      const weeklyGamesData = [
        {
          id: '1',
          game_registrations: [
            { payment_status: 'paid', payment_amount: 2500, registered_at: new Date().toISOString() },
            { payment_status: 'pending', payment_amount: 2500, registered_at: new Date().toISOString() },
          ],
        },
        {
          id: '2',
          game_registrations: [
            { payment_status: 'paid', payment_amount: 3000, registered_at: new Date().toISOString() },
          ],
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({
              data: weeklyGamesData,
              error: null,
            })),
          })),
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            gte: jest.fn(() => Promise.resolve({
              data: [
                { player_phone: '+541234567890' },
                { player_phone: '+541234567891' },
                { player_phone: '+541234567890' }, // Duplicate
              ],
              error: null,
            })),
          })),
        });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const stats = data.data.quick_stats;
      expect(stats.total_games_this_week).toBe(2);
      expect(stats.revenue_this_week).toBe(5500); // 2500 + 3000
      expect(stats.new_players_this_week).toBe(2); // Unique phones
      expect(stats.payment_completion_rate).toBe(66.67); // 2 paid out of 3 total
    });
  });

  describe('POST /api/admin/dashboard', () => {
    it('returns same data as GET request for refresh', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          active_games_count: 1,
          today_games_count: 0,
          pending_payments_count: 0,
          total_revenue_this_month: 0,
          recent_registrations_count: 0,
        }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: [],
                error: null,
              })),
            })),
          })),
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: [],
                error: null,
              })),
            })),
          })),
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.message).toBe('Dashboard data loaded successfully');
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires admin role', async () => {
      // The withAuth middleware should handle this
      expect(withAuth).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          required_role: 'admin',
          rate_limit: true,
          csrf_protection: false,
        })
      );
    });

    it('enables rate limiting', async () => {
      expect(withAuth).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rate_limit: true,
        })
      );
    });

    it('configures CSRF protection correctly', async () => {
      // GET requests don't require CSRF protection
      expect(withAuth).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          csrf_protection: false,
        })
      );
    });
  });

  describe('Data Transformation', () => {
    it('transforms games data with statistics', async () => {
      (withAuth as jest.Mock).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return handler(request, { user: mockAdminUser });
        };
      });

      const gameWithMultipleRegistrations = {
        ...mockGamesData[0],
        max_players: 10,
        game_registrations: Array.from({ length: 12 }, (_, i) => ({
          id: `reg-${i}`,
          player_name: `Player ${i}`,
          player_phone: `+54123456789${i}`,
          payment_status: i < 8 ? 'paid' : 'pending',
          payment_amount: 2500,
        })),
      };

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [gameWithMultipleRegistrations],
                  error: null,
                })),
              })),
            })),
          })),
        })
        .mockReturnValue({
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
            eq: jest.fn(() => ({
              lt: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const game = data.data.active_games[0];
      expect(game.current_players).toBe(12);
      expect(game.waiting_list_count).toBe(2); // 12 - 10 max
      expect(game.pending_payments).toBe(4); // Last 4 are pending
      expect(game.total_revenue).toBe(20000); // 8 paid * 2500
    });
  });

  describe('Error Scenarios', () => {
    it('handles supabase client creation errors', async () => {
      (createClient as jest.Mock).mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard');
      
      // Since the error happens at module level, we need to test the wrapped handler
      await expect(async () => {
        await GET(request);
      }).rejects.toThrow();
    });

    it('handles malformed environment variables', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => {
        jest.resetModules();
        require('../../../app/api/admin/dashboard/route');
      }).toThrow();
    });
  });
});