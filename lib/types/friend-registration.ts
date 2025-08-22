import { Database } from '../supabase/types';
import { GameWithStats } from './api';

// Types specific to the Friend Registration System
export type Game = Database['public']['Tables']['games']['Row'];
export type GameRegistration = Database['public']['Tables']['game_registrations']['Row'];

// Enhanced game registration with WhatsApp notification fields
export interface EnhancedGameRegistration extends GameRegistration {
  registration_token?: string;
  notification_sent_at?: string;
  notification_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  cancellation_reason?: string;
  cancelled_at?: string;
}

// Public game information (filtered for friend access)
export interface PublicGameInfo {
  id: string;
  title: string;
  description: string | null;
  game_date: string;
  min_players: number;
  max_players: number;
  field_cost_per_player: number;
  game_duration_minutes: number;
  status: Game['status'];
  current_players: number;
  spots_available: number;
  waiting_list_count: number;
  registration_deadline: string; // Calculated based on game date
  is_registration_open: boolean;
  is_full: boolean;
  location: string; // Default to "Cancha Leconte"
}

// Friend registration request
export interface FriendRegistrationRequest {
  player_name: string;
  player_phone: string;
  accept_terms?: boolean;
}

// Friend registration response
export interface FriendRegistrationResponse {
  success: boolean;
  data?: GameRegistration;
  message: string;
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
  error?: string;
}

// Game details response for friends
export interface PublicGameResponse {
  success: boolean;
  data?: PublicGameInfo;
  message: string;
  error?: string;
}

// Registration cancellation request
export interface CancelRegistrationRequest {
  phone: string;
  reason?: string;
}

// Waiting list information
export interface WaitingListInfo {
  position: number;
  estimated_spots_ahead: number;
  can_be_promoted: boolean;
  notification_message: string;
}

// Game status for friends (simplified)
export interface FriendGameStatus {
  is_open: boolean;
  can_register: boolean;
  can_cancel: boolean;
  status_message: string;
  time_until_game: {
    hours: number;
    minutes: number;
    display: string;
  };
  registration_cutoff: {
    datetime: string;
    time_remaining: string;
  };
}

// Player registration status
export interface PlayerRegistrationStatus {
  is_registered: boolean;
  registration?: GameRegistration;
  status: 'not_registered' | 'confirmed' | 'waiting_list' | 'cancelled';
  can_cancel: boolean;
  position?: number;
  payment_required: boolean;
  payment_deadline?: string;
}

// Form validation errors specific to friend registration
export interface FriendRegistrationErrors {
  player_name?: string;
  player_phone?: string;
  accept_terms?: string;
  general?: string;
}

// Registration flow state
export interface RegistrationFlowState {
  step: 'viewing' | 'registering' | 'confirming' | 'completed' | 'error';
  game_info?: PublicGameInfo;
  registration_data?: FriendRegistrationRequest;
  registration_result?: FriendRegistrationResponse;
  errors?: FriendRegistrationErrors;
}

// Real-time updates for friend registration
export interface FriendRegistrationUpdate {
  type: 'player_joined' | 'player_left' | 'game_full' | 'spot_available' | 'game_updated' | 'game_cancelled';
  game_id: string;
  data: {
    current_players?: number;
    waiting_list_count?: number;
    new_player_name?: string;
    spots_available?: number;
    game_changes?: Partial<Game>;
    cancellation_reason?: string;
  };
  timestamp: string;
}

// Friend notification preferences
export interface NotificationPreferences {
  game_reminders: boolean;
  payment_reminders: boolean;
  game_updates: boolean;
  waiting_list_updates: boolean;
  whatsapp_number: string;
}

// Game accessibility checks
export interface GameAccessibility {
  is_accessible: boolean;
  can_view: boolean;
  can_register: boolean;
  restrictions: {
    game_cancelled?: boolean;
    game_completed?: boolean;
    registration_closed?: boolean;
    too_late_to_register?: boolean;
    invalid_token?: boolean;
  };
  messages: string[];
}

// Location information
export interface GameLocation {
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  directions?: string;
  parking_info?: string;
  public_transport?: string;
}

// Payment information for friends
export interface PaymentInfo {
  amount: number;
  currency: 'ARS';
  description: string;
  due_after_game: boolean;
  payment_methods: string[];
  refund_policy: string;
}

// Game sharing information
export interface GameSharingInfo {
  share_url: string;
  whatsapp_share_text: string;
  social_share_text: string;
  qr_code_url?: string;
}

// Constants for friend registration
export const FRIEND_REGISTRATION_CONSTANTS = {
  MAX_NAME_LENGTH: 100,
  MIN_NAME_LENGTH: 2,
  MAX_PHONE_LENGTH: 20,
  MIN_PHONE_LENGTH: 10,
  REGISTRATION_CUTOFF_HOURS: 2, // Can't register within 2 hours of game start
  CANCELLATION_CUTOFF_HOURS: 2, // Can't cancel within 2 hours of game start
  MAX_WAITING_LIST_SIZE: 10,
  DEFAULT_GAME_LOCATION: 'Cancha Leconte',
  DEFAULT_GAME_ADDRESS: 'Buenos Aires, Argentina',
  REMINDER_HOURS_BEFORE: 1, // Send reminder 1 hour before game
} as const;

// Status display labels for friends (Spanish)
export const FRIEND_STATUS_LABELS = {
  draft: 'En preparación',
  open: 'Abierto',
  closed: 'Cerrado',
  in_progress: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
} as const;

export const REGISTRATION_STATUS_LABELS = {
  not_registered: 'No inscrito',
  confirmed: 'Confirmado',
  waiting_list: 'Lista de espera',
  cancelled: 'Cancelado',
} as const;

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
} as const;

// Helper type for API responses
export interface FriendApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// Export utility function types
export type FriendRegistrationValidator = (data: FriendRegistrationRequest) => Promise<FriendRegistrationErrors | null>;
export type GameAccessValidator = (token: string) => Promise<GameAccessibility>;
export type WaitingListManager = (gameId: string) => Promise<WaitingListInfo[]>;
export type NotificationScheduler = (registration: GameRegistration, game: Game) => Promise<void>;