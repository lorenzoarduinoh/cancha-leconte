import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';

/**
 * Registration Token Service
 * Handles generation, validation, and management of secure registration tokens
 */

export interface RegistrationTokenConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  reason?: string;
  isExpired?: boolean;
}

export class RegistrationTokenService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(config: RegistrationTokenConfig) {
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Generate a cryptographically secure registration token
   * Uses 32 bytes of random data encoded as hex (64 characters)
   */
  generateToken(): string {
    // Generate 32 bytes of random data using Node.js crypto
    if (typeof window === 'undefined') {
      // Server-side: use Node.js crypto
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    } else {
      // Client-side: use Web Crypto API (though this should mainly be server-side)
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }

  /**
   * Validate token format
   * Ensures token is 64 characters of valid hex format
   */
  validateTokenFormat(token: string): boolean {
    // Basic format validation (64 characters for hex encoded 32 bytes)
    if (!token || token.length !== 64) {
      return false;
    }
    
    // Check for valid hex characters
    return /^[0-9a-f]{64}$/.test(token);
  }

  /**
   * Check if token exists in database and get registration details
   */
  async validateTokenInDatabase(token: string): Promise<TokenValidationResult & { registrationId?: string }> {
    if (!this.validateTokenFormat(token)) {
      return {
        isValid: false,
        reason: 'Invalid token format'
      };
    }

    try {
      const { data: registration, error } = await this.supabase
        .from('game_registrations')
        .select('id, registered_at, payment_status, cancelled_at')
        .eq('registration_token', token)
        .single();

      if (error || !registration) {
        return {
          isValid: false,
          reason: 'Token not found'
        };
      }

      // Cancelled registrations are deleted, so if we found it, it's still valid
      // No need to check for cancellation status since deleted registrations won't be found

      return {
        isValid: true,
        registrationId: registration.id
      };

    } catch (error) {
      console.error('Error validating token:', error);
      return {
        isValid: false,
        reason: 'Database error'
      };
    }
  }

  /**
   * Check if token is expired (optional feature for enhanced security)
   * Default: tokens expire after 7 days (168 hours)
   */
  isTokenExpired(createdAt: string, maxAgeHours: number = 168): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const ageHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return ageHours > maxAgeHours;
  }

  /**
   * Generate token and assign to existing registration
   */
  async assignTokenToRegistration(registrationId: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = this.generateToken();

      const { error } = await this.supabase
        .from('game_registrations')
        .update({ registration_token: token })
        .eq('id', registrationId);

      if (error) {
        console.error('Error assigning token:', error);
        return {
          success: false,
          error: 'Failed to assign token to registration'
        };
      }

      return {
        success: true,
        token
      };

    } catch (error) {
      console.error('Error in token assignment:', error);
      return {
        success: false,
        error: 'Internal error assigning token'
      };
    }
  }

  /**
   * Get registration details by token with security checks
   */
  async getRegistrationByToken(token: string) {
    const validation = await this.validateTokenInDatabase(token);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.reason
      };
    }

    try {
      // Use the personal_registration_details view if it exists, otherwise join manually
      const { data: registration, error } = await this.supabase
        .from('game_registrations')
        .select(`
          id,
          registration_token,
          player_name,
          player_phone,
          registered_at,
          payment_status,
          payment_amount,
          team_assignment,
          notification_status,
          notification_sent_at,
          cancellation_reason,
          cancelled_at,
          games (
            id,
            title,
            description,
            game_date,
            min_players,
            max_players,
            field_cost_per_player,
            game_duration_minutes,
            status
          )
        `)
        .eq('registration_token', token)
        .single();

      if (error || !registration) {
        return {
          success: false,
          error: 'Registration not found'
        };
      }

      return {
        success: true,
        data: registration
      };

    } catch (error) {
      console.error('Error fetching registration by token:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  /**
   * Invalidate a token (for security purposes)
   */
  async invalidateToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('game_registrations')
        .update({ registration_token: null })
        .eq('registration_token', token);

      if (error) {
        return {
          success: false,
          error: 'Failed to invalidate token'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error invalidating token:', error);
      return {
        success: false,
        error: 'Internal error'
      };
    }
  }

  /**
   * Clean up expired tokens (maintenance function)
   */
  async cleanupExpiredTokens(maxAgeHours: number = 168): Promise<{ success: boolean; cleanedCount?: number; error?: string }> {
    try {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - maxAgeHours);

      const { data, error } = await this.supabase
        .from('game_registrations')
        .update({ registration_token: null })
        .lt('registered_at', expiredDate.toISOString())
        .select('id');

      if (error) {
        return {
          success: false,
          error: 'Failed to clean up expired tokens'
        };
      }

      return {
        success: true,
        cleanedCount: data?.length || 0
      };

    } catch (error) {
      console.error('Error cleaning up tokens:', error);
      return {
        success: false,
        error: 'Internal error'
      };
    }
  }
}

// Factory function for easy instantiation
export function createRegistrationTokenService(): RegistrationTokenService {
  return new RegistrationTokenService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}

// Utility functions for quick token operations
export const TokenUtils = {
  /**
   * Quick token format validation
   */
  isValidFormat: (token: string): boolean => {
    return /^[0-9a-f]{64}$/.test(token);
  },

  /**
   * Generate a single token (stateless)
   */
  generate: (): string => {
    if (typeof window === 'undefined') {
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    } else {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  },

  /**
   * Sanitize token for URL usage
   */
  sanitizeForUrl: (token: string): string => {
    return encodeURIComponent(token);
  },

  /**
   * Create management URL for a token
   */
  createManagementUrl: (token: string, baseUrl?: string): string => {
    const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/mi-registro/${TokenUtils.sanitizeForUrl(token)}`;
  }
};

// Export types for use in other modules
export type RegistrationTokenData = {
  token: string;
  registrationId: string;
  createdAt: string;
  isValid: boolean;
  managementUrl: string;
};