import { Database } from '../supabase/types';

// Database types
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

export type AdminUser = Database['public']['Tables']['admin_users']['Row'];
export type AdminAuditLog = Database['public']['Tables']['admin_audit_log']['Row'];
export type AdminAuditLogInsert = Database['public']['Tables']['admin_audit_log']['Insert'];

// Game status type
export type GameStatus = Game['status'];
export type PaymentStatus = GameRegistration['payment_status'];
export type TeamAssignment = GameRegistration['team_assignment'];
export type DeliveryStatus = Notification['delivery_status'];
export type MessageType = Notification['message_type'];

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Game Management API Types
export interface GameWithStats extends Game {
  current_players: number;
  waiting_list_count: number;
  pending_payments: number;
  total_revenue: number;
  registrations?: GameRegistration[];
  result?: GameResult;
}

export interface CreateGameRequest {
  title: string;
  description?: string;
  game_date: string; // ISO 8601
  min_players: number;
  max_players: number;
  field_cost_per_player: number;
  game_duration_minutes?: number;
  team_a_name?: string;
  team_b_name?: string;
}

export interface UpdateGameRequest extends Partial<CreateGameRequest> {}

export interface GameDetailsResponse extends ApiResponse<GameWithStats> {}

export interface GamesListResponse extends PaginatedResponse<GameWithStats> {}

// Registration API Types
export interface RegisterPlayerRequest {
  player_name: string;
  player_phone: string;
}

export interface RegistrationResponse extends ApiResponse<GameRegistration> {
  data: GameRegistration;
  game_full: boolean;
  waiting_list_position?: number;
}

export interface TeamAssignmentRequest {
  method: 'random' | 'manual';
  manual_assignments?: {
    [registrationId: string]: 'team_a' | 'team_b';
  };
}

export interface TeamsResponse extends ApiResponse {
  team_a: GameRegistration[];
  team_b: GameRegistration[];
  assignment_method: string;
  assigned_at: string;
}

// Dashboard API Types
export interface DashboardData {
  active_games_count: number;
  today_games_count: number;
  pending_payments_count: number;
  total_revenue_this_month: number;
  recent_registrations_count: number;
  active_games: GameWithStats[];
  recent_registrations: GameRegistration[];
  payment_alerts: PaymentAlert[];
  quick_stats: QuickStats;
}

export interface PaymentAlert {
  id: string;
  player_name: string;
  player_phone: string;
  game_title: string;
  game_date: string;
  amount_due: number;
  days_overdue: number;
}

export interface QuickStats {
  total_games_this_week: number;
  revenue_this_week: number;
  new_players_this_week: number;
  payment_completion_rate: number;
}

export interface DashboardResponse extends ApiResponse<DashboardData> {}

// Analytics API Types
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

export interface AnalyticsResponse extends ApiResponse {
  statistics: GameStatistics;
  player_analytics: PlayerAnalytics[];
  revenue_by_month: RevenueByMonth[];
  game_frequency: GameFrequency[];
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  games_count: number;
  players_count: number;
}

export interface GameFrequency {
  day_of_week: number;
  games_count: number;
  average_players: number;
}

// Player Management API Types
export interface PlayerProfile {
  name: string;
  phone: string;
  email?: string;
  total_games: number;
  completed_games: number;
  cancelled_games: number;
  total_paid: number;
  pending_payments: number;
  payment_reliability: number;
  first_game_date: string;
  last_game_date: string;
  game_history: GameRegistration[];
}

export interface PlayersResponse extends PaginatedResponse<PlayerProfile> {}

// Notification API Types
export interface SendNotificationRequest {
  message_type: MessageType;
  message_content: string;
  recipients: string[]; // phone numbers
  game_id?: string;
  scheduled_for?: string; // ISO 8601
}

export interface NotificationStatusUpdate {
  whatsapp_message_id: string;
  delivery_status: DeliveryStatus;
  delivered_at?: string;
}

export interface NotificationsResponse extends PaginatedResponse<Notification> {}

// Results API Types
export interface RecordResultRequest {
  team_a_score: number;
  team_b_score: number;
  notes?: string;
}

export interface ResultResponse extends ApiResponse<GameResult> {}

// Team Names API Types
export interface TeamNamesData {
  team_a_name: string;
  team_b_name: string;
}

export interface UpdateTeamNamesRequest {
  team_a_name?: string;
  team_b_name?: string;
}

export interface TeamNamesResponse extends ApiResponse<TeamNamesData> {
  data: TeamNamesData;
}

// Payment API Types
export interface PaymentTrackingData {
  total_pending: number;
  total_paid: number;
  total_failed: number;
  pending_amount: number;
  paid_amount: number;
  failed_amount: number;
  overdue_payments: PaymentAlert[];
}

export interface UpdatePaymentStatusRequest {
  payment_id: string;
  payment_status: PaymentStatus;
  paid_at?: string;
}

export interface PaymentResponse extends ApiResponse<GameRegistration> {}

// Search and Filter types
export interface GameFilters {
  status?: GameStatus[];
  date_from?: string;
  date_to?: string;
  created_by?: string;
  search?: string;
}

export interface PlayerFilters {
  phone?: string;
  name?: string;
  payment_status?: PaymentStatus;
  game_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface NotificationFilters {
  message_type?: MessageType[];
  delivery_status?: DeliveryStatus[];
  game_id?: string;
  date_from?: string;
  date_to?: string;
}

// Real-time event types
export interface RealtimeEvent {
  event: string;
  payload: any;
  timestamp: string;
}

export interface DashboardEvent extends RealtimeEvent {
  event: 'player_registered' | 'payment_completed' | 'game_status_changed' | 'game_created' | 'game_updated';
}

export interface RegistrationEvent extends RealtimeEvent {
  event: 'player_registered' | 'player_cancelled' | 'game_full' | 'spot_available';
}

// Friend Registration API Types (Public Access)
export interface FriendRegistrationRequest {
  player_name: string;
  player_phone: string;
  accept_terms?: boolean;
}

export interface FriendRegistrationResponse extends ApiResponse {
  data?: GameRegistration;
  game_full: boolean;
  waiting_list_position?: number;
  confirmation_details?: {
    game_title: string;
    game_date: string;
    location: string;
    cost: number;
    status: 'confirmed' | 'waiting_list';
    position?: number;
  };
}

export interface PublicGameInfo {
  id: string;
  title: string;
  description: string | null;
  game_date: string;
  min_players: number;
  max_players: number;
  field_cost_per_player: number;
  game_duration_minutes: number;
  team_a_name: string;
  team_b_name: string;
  status: GameStatus;
  current_players: number;
  spots_available: number;
  waiting_list_count: number;
  registration_deadline: string;
  is_registration_open: boolean;
  is_full: boolean;
  location: string;
}

export interface PublicGameResponse extends ApiResponse<PublicGameInfo> {}

export interface PlayerRegistrationStatus {
  is_registered: boolean;
  registration?: GameRegistration;
  status: 'not_registered' | 'confirmed' | 'waiting_list' | 'cancelled';
  can_cancel: boolean;
  position?: number;
  payment_required: boolean;
  payment_deadline?: string;
}

// Real-time API Types
export interface RealtimeInfo {
  game_id: string;
  realtime_enabled: boolean;
  current_status: {
    current_players: number;
    spots_available: number;
    waiting_list_count: number;
    is_full: boolean;
  };
  connection_info: {
    websocket_available: boolean;
    polling_fallback: boolean;
    update_frequency: string;
  };
  events: string[];
}

export interface RealtimeInfoResponse extends ApiResponse<RealtimeInfo> {}

// WebSocket message types
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'error' | 'ping' | 'pong';
  channel?: string;
  payload?: any;
  error?: string;
}

// Audit log types
export interface AuditLogEntry {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  action_details?: Record<string, any>;
  admin_user_id: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CreateAuditLogRequest {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  action_details?: Record<string, any>;
}

// Common query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: ValidationError[];
}

// Middleware types
export interface AuthenticatedRequest {
  user: AdminUser;
  session: any;
}

export interface RequestContext {
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}