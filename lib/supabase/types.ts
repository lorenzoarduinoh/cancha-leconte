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
          email: string
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
          email: string
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
          email?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}