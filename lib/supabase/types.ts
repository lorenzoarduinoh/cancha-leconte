export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          username: string
          email: string | null
          password_hash: string
          name: string
          role: 'admin'
          is_active: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id?: string
          username: string
          email?: string | null
          password_hash: string
          name: string
          role?: 'admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          password_hash?: string
          name?: string
          role?: 'admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      admin_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          expires_at: string
          remember_me: boolean
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          expires_at: string
          remember_me?: boolean
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          expires_at?: string
          remember_me?: boolean
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      login_attempts: {
        Row: {
          id: string
          ip_address: string
          email: string | null
          success: boolean
          attempted_at: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address: string
          email?: string | null
          success?: boolean
          attempted_at?: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string
          email?: string | null
          success?: boolean
          attempted_at?: string
          user_agent?: string | null
        }
      }
      games: {
        Row: {
          id: string
          title: string
          description: string | null
          game_date: string
          min_players: number
          max_players: number
          field_cost_per_player: number
          game_duration_minutes: number
          team_a_name: string
          team_b_name: string
          status: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled'
          share_token: string
          teams_assigned_at: string | null
          results_recorded_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          game_date: string
          min_players: number
          max_players: number
          field_cost_per_player: number
          game_duration_minutes?: number
          team_a_name?: string
          team_b_name?: string
          status?: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled'
          share_token?: string
          teams_assigned_at?: string | null
          results_recorded_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          game_date?: string
          min_players?: number
          max_players?: number
          field_cost_per_player?: number
          game_duration_minutes?: number
          team_a_name?: string
          team_b_name?: string
          status?: 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled'
          share_token?: string
          teams_assigned_at?: string | null
          results_recorded_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      game_registrations: {
        Row: {
          id: string
          game_id: string
          player_name: string
          player_phone: string
          team_assignment: 'team_a' | 'team_b' | null
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_id: string | null
          payment_amount: number | null
          registered_at: string
          paid_at: string | null
          registration_token: string | null
          notification_sent_at: string | null
          notification_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          cancellation_reason: string | null
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          player_name: string
          player_phone: string
          team_assignment?: 'team_a' | 'team_b' | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_id?: string | null
          payment_amount?: number | null
          registered_at?: string
          paid_at?: string | null
          registration_token?: string | null
          notification_sent_at?: string | null
          notification_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          cancellation_reason?: string | null
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          player_name?: string
          player_phone?: string
          team_assignment?: 'team_a' | 'team_b' | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_id?: string | null
          payment_amount?: number | null
          registered_at?: string
          paid_at?: string | null
          registration_token?: string | null
          notification_sent_at?: string | null
          notification_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          cancellation_reason?: string | null
          cancelled_at?: string | null
        }
      }
      game_results: {
        Row: {
          id: string
          game_id: string
          team_a_score: number
          team_b_score: number
          winning_team: 'team_a' | 'team_b' | 'draw' | null
          notes: string | null
          recorded_by: string
          recorded_at: string
        }
        Insert: {
          id?: string
          game_id: string
          team_a_score?: number
          team_b_score?: number
          winning_team?: 'team_a' | 'team_b' | 'draw' | null
          notes?: string | null
          recorded_by: string
          recorded_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          team_a_score?: number
          team_b_score?: number
          winning_team?: 'team_a' | 'team_b' | 'draw' | null
          notes?: string | null
          recorded_by?: string
          recorded_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          game_id: string
          player_phone: string
          message_type: 'game_reminder' | 'payment_request' | 'payment_reminder' | 'game_update' | 'game_cancelled'
          message_content: string
          whatsapp_message_id: string | null
          delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          scheduled_for: string | null
          sent_at: string | null
          delivered_at: string | null
          created_at: string
          registration_id: string | null
          template_name: string | null
          template_params: Json | null
          retry_count: number
          next_retry_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          player_phone: string
          message_type: 'game_reminder' | 'payment_request' | 'payment_reminder' | 'game_update' | 'game_cancelled'
          message_content: string
          whatsapp_message_id?: string | null
          delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          scheduled_for?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
          registration_id?: string | null
          template_name?: string | null
          template_params?: Json | null
          retry_count?: number
          next_retry_at?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          player_phone?: string
          message_type?: 'game_reminder' | 'payment_request' | 'payment_reminder' | 'game_update' | 'game_cancelled'
          message_content?: string
          whatsapp_message_id?: string | null
          delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          scheduled_for?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
          registration_id?: string | null
          template_name?: string | null
          template_params?: Json | null
          retry_count?: number
          next_retry_at?: string | null
        }
      }
      whatsapp_templates: {
        Row: {
          id: string
          name: string
          template_id: string
          language_code: string
          category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
          template_body: string
          template_params: Json | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          template_id: string
          language_code?: string
          category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
          template_body: string
          template_params?: Json | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          template_id?: string
          language_code?: string
          category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
          template_body?: string
          template_params?: Json | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_user_id: string
          action_type: string
          entity_type: string
          entity_id: string | null
          action_details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          action_type: string
          entity_type: string
          entity_id?: string | null
          action_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          action_type?: string
          entity_type?: string
          entity_id?: string | null
          action_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_game_statistics: {
        Args: {
          p_admin_user_id?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          total_games: number
          completed_games: number
          cancelled_games: number
          total_players: number
          unique_players: number
          total_revenue: number
          pending_payments: number
          average_players_per_game: number
        }[]
      }
      get_dashboard_data: {
        Args: {
          p_admin_user_id: string
        }
        Returns: {
          active_games_count: number
          today_games_count: number
          pending_payments_count: number
          total_revenue_this_month: number
          recent_registrations_count: number
        }[]
      }
      get_player_analytics: {
        Args: {
          p_admin_user_id?: string
          p_limit?: number
        }
        Returns: {
          player_name: string
          player_phone: string
          total_games: number
          paid_games: number
          pending_payments: number
          total_paid: number
          last_game_date: string
          payment_reliability: number
        }[]
      }
      cleanup_old_data: {
        Args: {}
        Returns: number
      }
      generate_game_share_token: {
        Args: {}
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}