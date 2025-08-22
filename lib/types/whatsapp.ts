/**
 * WhatsApp Notification System Types
 * TypeScript interfaces for the WhatsApp Business API integration
 */

// WhatsApp Service Configuration
export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  webhookUrl: string;
}

// WhatsApp Message Templates
export interface WhatsAppTemplate {
  id: string;
  name: string;
  template_id: string;
  language_code: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  template_body: string;
  template_params: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

// WhatsApp API Request/Response Types
export interface WhatsAppSendRequest {
  registration_id: string;
  template_name: string;
  phone_number: string;
  template_params: Record<string, string>;
}

export interface WhatsAppSendResponse {
  success: boolean;
  message_id?: string;
  status: 'sent' | 'failed';
  error?: string;
}

// WhatsApp Webhook Types
export interface WhatsAppWebhookPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: { phone_number_id: string };
        statuses?: Array<WhatsAppMessageStatus>;
        messages?: Array<WhatsAppIncomingMessage>;
      };
      field: 'messages';
    }>;
  }>;
}

export interface WhatsAppMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  text?: {
    body: string;
  };
  context?: {
    id: string;
    from: string;
  };
}

// Personal Registration Management Types
export interface PersonalRegistrationData {
  registration: {
    id: string;
    player_name: string;
    player_phone: string;
    registered_at: string;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    team_assignment: 'team_a' | 'team_b' | null;
  };
  game: {
    id: string;
    title: string;
    description: string | null;
    game_date: string;
    location: string;
    field_cost_per_player: number;
    status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';
    current_players: number;
    max_players: number;
  };
  status: {
    is_confirmed: boolean;
    is_waiting_list: boolean;
    waiting_list_position?: number;
    can_cancel: boolean;
    time_until_game: {
      hours: number;
      minutes: number;
      display: string;
    };
  };
}

export interface PersonalRegistrationResponse {
  success: boolean;
  data?: PersonalRegistrationData;
  message: string;
  error?: string;
}

// Cancellation Types
export interface CancelRegistrationRequest {
  reason?: string;
  confirm: boolean;
}

export interface CancelRegistrationResponse {
  success: boolean;
  message: string;
  refund_info?: {
    amount: number;
    method: string;
    estimated_days: number;
  };
  error?: string;
}

// Registration Token Types
export interface RegistrationTokenData {
  token: string;
  registrationId: string;
  createdAt: string;
  isValid: boolean;
  managementUrl: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  reason?: string;
  isExpired?: boolean;
  registrationId?: string;
}

// Notification Tracking Types
export interface NotificationRecord {
  id: string;
  game_id: string;
  registration_id?: string;
  player_phone: string;
  message_type: 'game_reminder' | 'payment_request' | 'payment_reminder' | 'game_update' | 'game_cancelled';
  template_name?: string;
  template_params?: Record<string, string>;
  message_content: string;
  whatsapp_message_id?: string;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  retry_count: number;
  next_retry_at?: string;
  scheduled_for?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

// Enhanced Registration Types (extends base registration types)
export interface EnhancedGameRegistration {
  id: string;
  game_id: string;
  player_name: string;
  player_phone: string;
  team_assignment: 'team_a' | 'team_b' | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string;
  payment_amount?: number;
  registered_at: string;
  paid_at?: string;
  // WhatsApp notification fields
  registration_token?: string;
  notification_sent_at?: string;
  notification_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  cancellation_reason?: string;
  cancelled_at?: string;
}

// Template Parameter Types for different message types
export interface RegistrationConfirmationParams {
  '1': string; // player_name
  '2': string; // game_title
  '3': string; // game_date
  '4': string; // management_url
}

export interface WaitingListNotificationParams {
  '1': string; // player_name
  '2': string; // position
  '3': string; // game_title
  '4': string; // management_url
}

export interface GameReminderParams {
  '1': string; // player_name
  '2': string; // game_title
  '3': string; // game_time
  '4': string; // location
}

export interface CancellationConfirmationParams {
  '1': string; // player_name
  '2': string; // game_title
  '3': string; // reason
}

export interface WaitingListPromotionParams {
  '1': string; // player_name
  '2': string; // game_title
  '3': string; // management_url
}

// Service Response Types
export interface WhatsAppServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Utility Types
export type PhoneNumber = string; // Argentine phone number format
export type RegistrationToken = string; // 43-character base64url token
export type WhatsAppMessageId = string;
export type TemplateParameterMap = Record<string, string>;

// Error Types
export interface WhatsAppApiError {
  code: number;
  title: string;
  message: string;
  details?: string;
}

export interface PersonalRegistrationError {
  field?: string;
  message: string;
  code?: string;
}

// Analytics Types for WhatsApp notifications
export interface NotificationAnalytics {
  total_sent: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  delivery_rate: number;
  read_rate: number;
  average_delivery_time: number; // in minutes
  template_performance: Array<{
    template_name: string;
    sent_count: number;
    delivery_rate: number;
  }>;
}

// Webhook Processing Types
export interface WebhookProcessingResult {
  processed_count: number;
  error_count: number;
  updated_notifications: string[];
  errors: Array<{
    message_id: string;
    error: string;
  }>;
}

// Database View Types (for personal_registration_details view)
export interface PersonalRegistrationDetailsView {
  id: string;
  registration_token: string;
  player_name: string;
  player_phone: string;
  registered_at: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_amount?: number;
  team_assignment: 'team_a' | 'team_b' | null;
  notification_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  notification_sent_at?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  game_id: string;
  game_title: string;
  game_description?: string;
  game_date: string;
  min_players: number;
  max_players: number;
  field_cost_per_player: number;
  game_duration_minutes: number;
  game_status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';
  waiting_list_position?: number;
  registration_status: 'confirmed' | 'waiting_list';
  current_players: number;
}

// Export utility type for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  status_code?: number;
}

// Constants
export const WHATSAPP_CONSTANTS = {
  MAX_TEMPLATE_PARAMS: 10,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_PHONE_LENGTH: 20,
  TOKEN_LENGTH: 43,
  RETRY_ATTEMPTS: 3,
  RATE_LIMIT: {
    PERSONAL_ACCESS: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
    CANCELLATION: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
    WEBHOOK: { windowMs: 60 * 1000, maxRequests: 1000 }
  }
} as const;

// Template Names (constants for type safety)
export const TEMPLATE_NAMES = {
  REGISTRATION_CONFIRMATION: 'registration_confirmation',
  WAITING_LIST_NOTIFICATION: 'waiting_list_notification',
  GAME_REMINDER: 'game_reminder',
  CANCELLATION_CONFIRMATION: 'cancellation_confirmation',
  WAITING_LIST_PROMOTION: 'waiting_list_promotion'
} as const;

export type TemplateNameType = typeof TEMPLATE_NAMES[keyof typeof TEMPLATE_NAMES];