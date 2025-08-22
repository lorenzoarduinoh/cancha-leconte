import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';
import { FriendRegistrationUpdate } from '../types/friend-registration';

type Tables = Database['public']['Tables'];
type GameRow = Tables['games']['Row'];
type RegistrationRow = Tables['game_registrations']['Row'];

export interface FriendRealtimeServiceConfig {
  supabaseUrl: string;
  supabaseAnonKey: string; // Use anon key for public subscriptions
}

export class FriendRealtimeService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private subscriptions: Map<string, any> = new Map();
  private eventCallbacks: Map<string, ((update: FriendRegistrationUpdate) => void)[]> = new Map();

  constructor(config: FriendRealtimeServiceConfig) {
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey);
  }

  /**
   * Subscribe to real-time updates for a specific game
   */
  subscribeToGameUpdates(
    gameId: string,
    callback: (update: FriendRegistrationUpdate) => void
  ): () => void {
    console.log('Subscribing to game updates for:', gameId);
    
    // Add callback to the list
    if (!this.eventCallbacks.has(gameId)) {
      this.eventCallbacks.set(gameId, []);
    }
    this.eventCallbacks.get(gameId)!.push(callback);

    // Create subscription if it doesn't exist
    if (!this.subscriptions.has(gameId)) {
      this.createGameSubscription(gameId);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromGameUpdates(gameId, callback);
    };
  }

  /**
   * Unsubscribe from game updates
   */
  private unsubscribeFromGameUpdates(
    gameId: string,
    callback: (update: FriendRegistrationUpdate) => void
  ): void {
    const callbacks = this.eventCallbacks.get(gameId) || [];
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }

    // If no more callbacks, remove the subscription
    if (callbacks.length === 0) {
      const subscription = this.subscriptions.get(gameId);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(gameId);
        this.eventCallbacks.delete(gameId);
      }
    }
  }

  /**
   * Create Supabase subscription for a game
   */
  private createGameSubscription(gameId: string): void {
    // Subscribe to game table changes
    const gameSubscription = this.supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          this.handleGameUpdate(gameId, payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_registrations',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          this.handleRegistrationInsert(gameId, payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_registrations',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          this.handleRegistrationUpdate(gameId, payload);
        }
      )
      .subscribe((status) => {
        console.log('Game subscription status:', status);
      });

    this.subscriptions.set(gameId, gameSubscription);
  }

  /**
   * Handle game table updates
   */
  private async handleGameUpdate(gameId: string, payload: any): void {
    console.log('Game update received:', payload);
    
    const newGame = payload.new as GameRow;
    const oldGame = payload.old as GameRow;

    // Check what changed
    const changes: Partial<GameRow> = {};
    let hasSignificantChange = false;

    if (newGame.status !== oldGame.status) {
      changes.status = newGame.status;
      hasSignificantChange = true;
    }

    if (newGame.game_date !== oldGame.game_date) {
      changes.game_date = newGame.game_date;
      hasSignificantChange = true;
    }

    if (newGame.max_players !== oldGame.max_players) {
      changes.max_players = newGame.max_players;
      hasSignificantChange = true;
    }

    if (newGame.field_cost_per_player !== oldGame.field_cost_per_player) {
      changes.field_cost_per_player = newGame.field_cost_per_player;
      hasSignificantChange = true;
    }

    if (hasSignificantChange) {
      const update: FriendRegistrationUpdate = {
        type: newGame.status === 'cancelled' ? 'game_cancelled' : 'game_updated',
        game_id: gameId,
        data: {
          game_changes: changes,
          cancellation_reason: newGame.status === 'cancelled' ? 
            'El administrador canceló el partido' : undefined
        },
        timestamp: new Date().toISOString()
      };

      this.broadcastUpdate(gameId, update);
    }
  }

  /**
   * Handle registration inserts (new players)
   */
  private async handleRegistrationInsert(gameId: string, payload: any): void {
    console.log('Registration insert received:', payload);
    
    const newRegistration = payload.new as RegistrationRow;

    // Don't broadcast refunded registrations
    if (newRegistration.payment_status === 'refunded') {
      return;
    }

    // Get updated player count
    const { data: currentRegistrations } = await this.supabase
      .from('game_registrations')
      .select('id')
      .eq('game_id', gameId)
      .neq('payment_status', 'refunded');

    const currentPlayerCount = currentRegistrations?.length || 0;

    // Get game max players to determine if full
    const { data: game } = await this.supabase
      .from('games')
      .select('max_players')
      .eq('id', gameId)
      .single();

    const isGameFull = game && currentPlayerCount >= game.max_players;

    const update: FriendRegistrationUpdate = {
      type: isGameFull ? 'game_full' : 'player_joined',
      game_id: gameId,
      data: {
        current_players: currentPlayerCount,
        new_player_name: newRegistration.player_name,
        spots_available: game ? Math.max(0, game.max_players - currentPlayerCount) : 0,
        waiting_list_count: game ? Math.max(0, currentPlayerCount - game.max_players) : 0,
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastUpdate(gameId, update);
  }

  /**
   * Handle registration updates (cancellations, payment changes)
   */
  private async handleRegistrationUpdate(gameId: string, payload: any): void {
    console.log('Registration update received:', payload);
    
    const newRegistration = payload.new as RegistrationRow;
    const oldRegistration = payload.old as RegistrationRow;

    // Check if this is a cancellation (status changed to refunded)
    if (oldRegistration.payment_status !== 'refunded' && 
        newRegistration.payment_status === 'refunded') {
      
      // Get updated player count
      const { data: currentRegistrations } = await this.supabase
        .from('game_registrations')
        .select('id')
        .eq('game_id', gameId)
        .neq('payment_status', 'refunded');

      const currentPlayerCount = currentRegistrations?.length || 0;

      // Get game max players
      const { data: game } = await this.supabase
        .from('games')
        .select('max_players')
        .eq('id', gameId)
        .single();

      const spotsAvailable = game ? Math.max(0, game.max_players - currentPlayerCount) : 0;

      const update: FriendRegistrationUpdate = {
        type: spotsAvailable > 0 ? 'spot_available' : 'player_left',
        game_id: gameId,
        data: {
          current_players: currentPlayerCount,
          spots_available: spotsAvailable,
          waiting_list_count: game ? Math.max(0, currentPlayerCount - game.max_players) : 0,
        },
        timestamp: new Date().toISOString()
      };

      this.broadcastUpdate(gameId, update);
    }
  }

  /**
   * Broadcast update to all subscribers
   */
  private broadcastUpdate(gameId: string, update: FriendRegistrationUpdate): void {
    const callbacks = this.eventCallbacks.get(gameId) || [];
    
    callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in callback:', error);
      }
    });
  }

  /**
   * Get current game status for initial load
   */
  async getCurrentGameStatus(gameId: string): Promise<{
    current_players: number;
    spots_available: number;
    waiting_list_count: number;
    is_full: boolean;
  }> {
    const { data: game } = await this.supabase
      .from('games')
      .select('max_players')
      .eq('id', gameId)
      .single();

    const { data: registrations } = await this.supabase
      .from('game_registrations')
      .select('id')
      .eq('game_id', gameId)
      .neq('payment_status', 'refunded');

    const currentPlayers = registrations?.length || 0;
    const maxPlayers = game?.max_players || 0;
    const spotsAvailable = Math.max(0, maxPlayers - currentPlayers);
    const waitingListCount = Math.max(0, currentPlayers - maxPlayers);

    return {
      current_players: currentPlayers,
      spots_available: spotsAvailable,
      waiting_list_count: waitingListCount,
      is_full: currentPlayers >= maxPlayers,
    };
  }

  /**
   * Clean up all subscriptions
   */
  disconnect(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    
    this.subscriptions.clear();
    this.eventCallbacks.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    // This is a simplified status - Supabase doesn't expose detailed connection state
    return this.subscriptions.size > 0 ? 'connected' : 'disconnected';
  }
}

// Export factory function
export function createFriendRealtimeService(): FriendRealtimeService {
  return new FriendRealtimeService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
}

// Browser-compatible version for client-side use
export function createBrowserFriendRealtimeService(): FriendRealtimeService {
  if (typeof window === 'undefined') {
    throw new Error('Browser service can only be used in browser environment');
  }

  return new FriendRealtimeService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
}