import { Database } from '../supabase/types';

// Base types from database
export type Game = Database['public']['Tables']['games']['Row'];
export type GameInsert = Database['public']['Tables']['games']['Insert'];
export type GameUpdate = Database['public']['Tables']['games']['Update'];

export type GameRegistration = Database['public']['Tables']['game_registrations']['Row'];
export type GameRegistrationInsert = Database['public']['Tables']['game_registrations']['Insert'];
export type GameRegistrationUpdate = Database['public']['Tables']['game_registrations']['Update'];

export type GameResult = Database['public']['Tables']['game_results']['Row'];
export type GameResultInsert = Database['public']['Tables']['game_results']['Insert'];
export type GameResultUpdate = Database['public']['Tables']['game_results']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

// Extended types for frontend use
export interface GameWithDetails extends Game {
  current_players: number;
  registrations: GameRegistration[];
  result?: GameResult;
  notifications?: Notification[];
  teams_balanced?: boolean;
  revenue_total?: number;
  payment_completion_rate?: number;
}

export interface GameFormData {
  title: string;
  description?: string;
  game_date: string;
  min_players: number;
  max_players: number;
  field_cost_per_player: number | null;
  game_duration_minutes?: number;
  team_a_name?: string;
  team_b_name?: string;
  status?: Game['status'];
}

export interface TeamAssignment {
  team_a: GameRegistration[];
  team_b: GameRegistration[];
  unassigned: GameRegistration[];
}

export interface GameStatistics {
  total_games: number;
  completed_games: number;
  cancelled_games: number;
  total_players: number;
  unique_players: number;
  total_revenue: number;
  pending_payments: number;
  average_players_per_game: number;
}

export interface PlayerAnalytics {
  player_name: string;
  player_phone: string;
  total_games: number;
  paid_games: number;
  pending_payments: number;
  total_paid: number;
  last_game_date: string;
  payment_reliability: number;
}

export interface DashboardData {
  active_games: GameWithDetails[];
  payment_alerts: Array<{
    id: string;
    player_name: string;
    amount_due: number;
    days_overdue: number;
  }>;
  recent_registrations: Array<{
    id: string;
    player_name: string;
    registered_at: string;
    payment_status: GameRegistration['payment_status'];
  }>;
  quick_stats: {
    active_games_count: number;
    today_games_count: number;
    pending_payments_count: number;
    total_revenue_this_month: number;
    recent_registrations_count: number;
    new_players_this_week: number;
    total_games_this_week: number;
    payment_completion_rate: number;
  };
  total_revenue_this_month: number;
}

// Form validation types
export interface GameFormErrors {
  title?: string;
  description?: string;
  game_date?: string;
  min_players?: string;
  max_players?: string;
  field_cost_per_player?: string;
  game_duration_minutes?: string;
  team_a_name?: string;
  team_b_name?: string;
  general?: string;
}

// API response types
export interface GameApiResponse {
  success: boolean;
  data?: Game;
  error?: string;
}

export interface GameListApiResponse {
  success: boolean;
  data?: GameWithDetails[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface RegistrationApiResponse {
  success: boolean;
  data?: GameRegistration;
  error?: string;
}

export interface TeamAssignmentApiResponse {
  success: boolean;
  data?: TeamAssignment;
  error?: string;
}

// Filter and sorting types
export interface GameFilters {
  status?: Game['status'][];
  date_from?: string;
  date_to?: string;
  min_players?: number;
  max_players?: number;
  search?: string;
}

export interface GameSortOptions {
  field: 'game_date' | 'title' | 'status' | 'current_players' | 'created_at';
  direction: 'asc' | 'desc';
}

// Real-time update types
export interface GameUpdateEvent {
  type: 'game_updated' | 'player_registered' | 'player_unregistered' | 'teams_assigned' | 'payment_updated';
  game_id: string;
  data: any;
  timestamp: string;
}

// Notification template types
export interface NotificationTemplate {
  type: Notification['message_type'];
  template: string;
  variables: string[];
}

// Payment tracking types
export interface PaymentSummary {
  game_id: string;
  total_amount: number;
  collected_amount: number;
  pending_amount: number;
  payment_rate: number;
  overdue_count: number;
  pending_players: Array<{
    name: string;
    phone: string;
    amount: number;
    days_overdue: number;
  }>;
}

// Export utility types
export type GameStatus = Game['status'];
export type PaymentStatus = GameRegistration['payment_status'];
export type TeamName = GameRegistration['team_assignment'];
export type MessageType = Notification['message_type'];
export type DeliveryStatus = Notification['delivery_status'];

// Team names specific types
export interface TeamNamesData {
  team_a_name: string;
  team_b_name: string;
}

export interface TeamNamesUpdate {
  team_a_name?: string;
  team_b_name?: string;
}

export interface TeamNamesFormErrors {
  team_a_name?: string;
  team_b_name?: string;
  general?: string;
}

export interface TeamNamesApiResponse {
  success: boolean;
  data?: TeamNamesData;
  error?: string;
}

// Validation constants
export const GAME_CONSTRAINTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 30,
  MIN_COST: 0,
  MAX_COST: 50000, // Argentine pesos
  MIN_DURATION: 15, // minimum 15 minutes
  MAX_DURATION: 300, // maximum 5 hours
  DEFAULT_DURATION: 90, // default 90 minutes for soccer
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  ADVANCE_BOOKING_DAYS: 90,
  // Team names constraints
  MIN_TEAM_NAME_LENGTH: 2,
  MAX_TEAM_NAME_LENGTH: 50,
  DEFAULT_TEAM_A_NAME: 'Equipo A',
  DEFAULT_TEAM_B_NAME: 'Equipo B',
} as const;

// Status display mappings
export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  closed: 'Cerrado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  game_reminder: 'Recordatorio de Partido',
  payment_request: 'Solicitud de Pago',
  payment_reminder: 'Recordatorio de Pago',
  game_update: 'Actualización de Partido',
  game_cancelled: 'Partido Cancelado',
};