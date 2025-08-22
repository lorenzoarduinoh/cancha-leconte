import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';
import { 
  FriendRegistrationRequest,
  FriendRegistrationResponse,
  PublicGameInfo,
  PublicGameResponse,
  GameAccessibility,
  PlayerRegistrationStatus,
  WaitingListInfo,
  FriendGameStatus,
  FRIEND_REGISTRATION_CONSTANTS
} from '../types/friend-registration';

type Tables = Database['public']['Tables'];
type GameRow = Tables['games']['Row'];
type RegistrationRow = Tables['game_registrations']['Row'];
type NotificationRow = Tables['notifications']['Row'];

export interface FriendRegistrationServiceConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export class FriendRegistrationService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(config: FriendRegistrationServiceConfig) {
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Get public game information by share token
   */
  async getPublicGameInfo(shareToken: string): Promise<PublicGameResponse> {
    try {
      // Validate token format
      if (!shareToken || shareToken.length < 20) {
        return {
          success: false,
          message: 'Token de partido inválido',
          error: 'INVALID_TOKEN'
        };
      }

      // Get game with registrations
      const { data: gameData, error: gameError } = await this.supabase
        .from('games')
        .select(`
          *,
          game_registrations(
            id,
            player_name,
            player_phone,
            payment_status,
            registered_at
          )
        `)
        .eq('share_token', shareToken)
        .single();

      if (gameError) {
        if (gameError.code === 'PGRST116') {
          return {
            success: false,
            message: 'Partido no encontrado o enlace inválido',
            error: 'GAME_NOT_FOUND'
          };
        }
        throw gameError;
      }

      // Check game accessibility
      const accessibility = this.checkGameAccessibility(gameData);
      if (!accessibility.is_accessible) {
        return {
          success: false,
          message: accessibility.messages[0] || 'No se puede acceder a este partido',
          error: 'GAME_NOT_ACCESSIBLE'
        };
      }

      // Transform to public game info
      const publicGameInfo = this.transformToPublicGameInfo(gameData);

      return {
        success: true,
        data: publicGameInfo,
        message: 'Información del partido obtenida exitosamente'
      };

    } catch (error) {
      console.error('Error getting public game info:', error);
      return {
        success: false,
        message: 'Error interno del servidor',
        error: 'SERVER_ERROR'
      };
    }
  }

  /**
   * Register a friend for a game
   */
  async registerFriend(
    shareToken: string, 
    registrationData: FriendRegistrationRequest,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<FriendRegistrationResponse> {
    try {
      // Get game information
      const gameResponse = await this.getPublicGameInfo(shareToken);
      if (!gameResponse.success || !gameResponse.data) {
        return {
          success: false,
          message: gameResponse.message,
          game_full: false,
          error: gameResponse.error
        };
      }

      const game = gameResponse.data;

      // Additional checks for registration
      const canRegister = this.canRegisterForGame(game);
      if (!canRegister.allowed) {
        return {
          success: false,
          message: canRegister.reason,
          game_full: false,
          error: 'REGISTRATION_NOT_ALLOWED'
        };
      }

      // Check for duplicate registrations
      const duplicateCheck = await this.checkDuplicateRegistration(
        game.id, 
        registrationData.player_name, 
        registrationData.player_phone
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          message: duplicateCheck.message,
          game_full: false,
          error: 'DUPLICATE_REGISTRATION'
        };
      }

      // Determine if going to waiting list
      const isWaitingList = game.current_players >= game.max_players;
      const waitingListPosition = isWaitingList ? 
        (game.current_players - game.max_players + 1) : undefined;

      // Create registration
      const { data: newRegistration, error: registrationError } = await this.supabase
        .from('game_registrations')
        .insert({
          game_id: game.id,
          player_name: registrationData.player_name.trim(),
          player_phone: registrationData.player_phone,
          payment_status: 'pending',
          payment_amount: game.field_cost_per_player,
          team_assignment: null,
        })
        .select('*')
        .single();

      if (registrationError) {
        throw registrationError;
      }

      // Schedule notifications
      await this.scheduleRegistrationNotifications(
        newRegistration, 
        game, 
        isWaitingList, 
        waitingListPosition
      );

      // Create audit log
      await this.createAuditLog(
        'FRIEND_REGISTER',
        'GAME_REGISTRATION',
        newRegistration.id,
        {
          player_name: registrationData.player_name,
          player_phone: registrationData.player_phone,
          is_waiting_list: isWaitingList,
          waiting_list_position: waitingListPosition,
          game_title: game.title,
        },
        clientInfo
      );

      return {
        success: true,
        data: newRegistration,
        message: isWaitingList ? 
          `Te registraste en la lista de espera. Posición: ${waitingListPosition}` :
          'Te registraste exitosamente para el partido',
        game_full: isWaitingList,
        waiting_list_position: waitingListPosition,
        confirmation_details: {
          game_title: game.title,
          game_date: game.game_date,
          location: FRIEND_REGISTRATION_CONSTANTS.DEFAULT_GAME_LOCATION,
          cost: game.field_cost_per_player,
          status: isWaitingList ? 'waiting_list' : 'confirmed',
          position: waitingListPosition,
        }
      };

    } catch (error) {
      console.error('Error registering friend:', error);
      return {
        success: false,
        message: 'Error al registrar al jugador',
        game_full: false,
        error: 'REGISTRATION_ERROR'
      };
    }
  }

  /**
   * Cancel a friend's registration
   */
  async cancelFriendRegistration(
    shareToken: string,
    playerPhone: string,
    reason?: string,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Get game information
      const gameResponse = await this.getPublicGameInfo(shareToken);
      if (!gameResponse.success || !gameResponse.data) {
        return {
          success: false,
          message: gameResponse.message,
          error: gameResponse.error
        };
      }

      const game = gameResponse.data;

      // Check if cancellation is allowed
      const canCancel = this.canCancelRegistration(game);
      if (!canCancel.allowed) {
        return {
          success: false,
          message: canCancel.reason,
          error: 'CANCELLATION_NOT_ALLOWED'
        };
      }

      // Find registration
      const { data: registration } = await this.supabase
        .from('game_registrations')
        .select('*')
        .eq('game_id', game.id)
        .eq('player_phone', playerPhone)
        .single();

      if (!registration) {
        return {
          success: false,
          message: 'No se encontró una inscripción activa con este número de teléfono',
          error: 'REGISTRATION_NOT_FOUND'
        };
      }

      // Delete registration completely (no refunds - payment happens after the game)
      const { error: deleteError } = await this.supabase
        .from('game_registrations')
        .delete()
        .eq('id', registration.id);

      if (deleteError) {
        throw deleteError;
      }

      // Handle waiting list promotions
      await this.processWaitingListPromotions(game.id);

      // Send cancellation notification
      await this.supabase.from('notifications').insert({
        game_id: game.id,
        player_phone: playerPhone,
        message_type: 'game_update',
        message_content: `Tu inscripción para "${game.title}" ha sido cancelada exitosamente.`,
        delivery_status: 'pending',
      });

      // Create audit log
      await this.createAuditLog(
        'FRIEND_CANCEL',
        'GAME_REGISTRATION',
        registration.id,
        {
          player_name: registration.player_name,
          player_phone: registration.player_phone,
          reason,
          game_title: game.title,
        },
        clientInfo
      );

      return {
        success: true,
        message: 'Inscripción cancelada exitosamente'
      };

    } catch (error) {
      console.error('Error cancelling registration:', error);
      return {
        success: false,
        message: 'Error al cancelar la inscripción',
        error: 'CANCELLATION_ERROR'
      };
    }
  }

  /**
   * Get player registration status
   */
  async getPlayerRegistrationStatus(
    shareToken: string,
    playerPhone: string
  ): Promise<PlayerRegistrationStatus> {
    try {
      const gameResponse = await this.getPublicGameInfo(shareToken);
      if (!gameResponse.success || !gameResponse.data) {
        return {
          is_registered: false,
          status: 'not_registered',
          can_cancel: false,
          payment_required: false
        };
      }

      const game = gameResponse.data;

      const { data: registration } = await this.supabase
        .from('game_registrations')
        .select('*')
        .eq('game_id', game.id)
        .eq('player_phone', playerPhone)
        .single();

      if (!registration) {
        return {
          is_registered: false,
          status: 'not_registered',
          can_cancel: false,
          payment_required: false
        };
      }

      const isWaitingList = game.current_players > game.max_players;
      const position = isWaitingList ? 
        await this.getWaitingListPosition(game.id, registration.id) : undefined;

      const canCancel = this.canCancelRegistration(game);

      return {
        is_registered: true,
        registration,
        status: isWaitingList ? 'waiting_list' : 'confirmed',
        can_cancel: canCancel.allowed,
        position,
        payment_required: registration.payment_status === 'pending',
        payment_deadline: this.calculatePaymentDeadline(game.game_date)
      };

    } catch (error) {
      console.error('Error getting player status:', error);
      return {
        is_registered: false,
        status: 'not_registered',
        can_cancel: false,
        payment_required: false
      };
    }
  }

  /**
   * Private helper methods
   */
  private transformToPublicGameInfo(
    gameData: GameRow & { game_registrations?: RegistrationRow[] }
  ): PublicGameInfo {
    const registrations = gameData.game_registrations || [];
    const confirmedRegistrations = registrations.filter(r => r.payment_status !== 'refunded');
    const currentPlayers = confirmedRegistrations.length;

    return {
      id: gameData.id,
      title: gameData.title,
      description: gameData.description,
      game_date: gameData.game_date,
      min_players: gameData.min_players,
      max_players: gameData.max_players,
      field_cost_per_player: gameData.field_cost_per_player,
      game_duration_minutes: gameData.game_duration_minutes,
      status: gameData.status,
      current_players: currentPlayers,
      spots_available: Math.max(0, gameData.max_players - currentPlayers),
      waiting_list_count: Math.max(0, currentPlayers - gameData.max_players),
      registration_deadline: this.calculateRegistrationDeadline(gameData.game_date),
      is_registration_open: this.isRegistrationOpen(gameData),
      is_full: currentPlayers >= gameData.max_players,
      location: FRIEND_REGISTRATION_CONSTANTS.DEFAULT_GAME_LOCATION,
    };
  }

  private checkGameAccessibility(game: GameRow): GameAccessibility {
    const now = new Date();
    const gameDate = new Date(game.game_date);
    const hoursAfterGame = (now.getTime() - gameDate.getTime()) / (1000 * 60 * 60);

    const restrictions: GameAccessibility['restrictions'] = {};
    const messages: string[] = [];

    if (game.status === 'cancelled') {
      restrictions.game_cancelled = true;
      messages.push('Este partido ha sido cancelado');
    }

    if (hoursAfterGame > 2) {
      restrictions.too_late_to_register = true;
      messages.push('Ya no es posible acceder a este partido');
    }

    const isAccessible = Object.keys(restrictions).length === 0;

    return {
      is_accessible: isAccessible,
      can_view: isAccessible,
      can_register: isAccessible && this.isRegistrationOpen(game),
      restrictions,
      messages
    };
  }

  private isRegistrationOpen(game: GameRow): boolean {
    if (game.status !== 'open') return false;

    const now = new Date();
    const gameDate = new Date(game.game_date);
    const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilGame > FRIEND_REGISTRATION_CONSTANTS.REGISTRATION_CUTOFF_HOURS;
  }

  private canRegisterForGame(game: PublicGameInfo): { allowed: boolean; reason: string } {
    if (!game.is_registration_open) {
      return { allowed: false, reason: 'Las inscripciones están cerradas' };
    }

    const now = new Date();
    const gameDate = new Date(game.game_date);
    const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilGame <= FRIEND_REGISTRATION_CONSTANTS.REGISTRATION_CUTOFF_HOURS) {
      return { allowed: false, reason: 'Ya no es posible registrarse (menos de 2 horas para el partido)' };
    }

    return { allowed: true, reason: '' };
  }

  private canCancelRegistration(game: PublicGameInfo): { allowed: boolean; reason: string } {
    if (game.status === 'in_progress' || game.status === 'completed') {
      return { allowed: false, reason: 'No se puede cancelar después de que comenzó el partido' };
    }

    const now = new Date();
    const gameDate = new Date(game.game_date);
    const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilGame <= FRIEND_REGISTRATION_CONSTANTS.CANCELLATION_CUTOFF_HOURS) {
      return { allowed: false, reason: 'No se puede cancelar menos de 2 horas antes del partido' };
    }

    return { allowed: true, reason: '' };
  }

  private async checkDuplicateRegistration(
    gameId: string,
    playerName: string,
    playerPhone: string
  ): Promise<{ isDuplicate: boolean; message: string }> {
    const { data: existingRegistrations } = await this.supabase
      .from('game_registrations')
      .select('player_name, player_phone')
      .eq('game_id', gameId);

    const duplicatePhone = existingRegistrations?.find(r => r.player_phone === playerPhone);
    if (duplicatePhone) {
      return { isDuplicate: true, message: 'Ya existe una inscripción con este número de teléfono' };
    }

    const duplicateName = existingRegistrations?.find(r => 
      r.player_name.toLowerCase().trim() === playerName.toLowerCase().trim()
    );
    if (duplicateName) {
      return { isDuplicate: true, message: 'Ya existe una inscripción con este nombre' };
    }

    return { isDuplicate: false, message: '' };
  }

  private calculateRegistrationDeadline(gameDate: string): string {
    const deadline = new Date(gameDate);
    deadline.setHours(deadline.getHours() - FRIEND_REGISTRATION_CONSTANTS.REGISTRATION_CUTOFF_HOURS);
    return deadline.toISOString();
  }

  private calculatePaymentDeadline(gameDate: string): string {
    const deadline = new Date(gameDate);
    deadline.setHours(deadline.getHours() + 24); // 24 hours after game
    return deadline.toISOString();
  }

  private async getWaitingListPosition(gameId: string, registrationId: string): Promise<number | undefined> {
    const { data: registrations } = await this.supabase
      .from('game_registrations')
      .select('id, registered_at')
      .eq('game_id', gameId)
      .order('registered_at', { ascending: true });

    const index = registrations?.findIndex(r => r.id === registrationId);
    if (index === undefined || index === -1) return undefined;

    const { data: game } = await this.supabase
      .from('games')
      .select('max_players')
      .eq('id', gameId)
      .single();

    if (!game || index < game.max_players) return undefined;

    return index - game.max_players + 1;
  }

  private async scheduleRegistrationNotifications(
    registration: RegistrationRow,
    game: PublicGameInfo,
    isWaitingList: boolean,
    waitingListPosition?: number
  ): Promise<void> {
    const gameDate = new Date(game.game_date);
    const reminderTime = new Date(gameDate.getTime() - 60 * 60 * 1000); // 1 hour before

    const message = isWaitingList 
      ? `¡Estás en lista de espera para "${game.title}"! Posición: ${waitingListPosition}. Te notificaremos si se libera un lugar.`
      : `¡Te registraste exitosamente para "${game.title}"! Fecha: ${gameDate.toLocaleDateString('es-AR')} a las ${gameDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}. Te recordaremos 1 hora antes del partido.`;

    await this.supabase.from('notifications').insert({
      game_id: game.id,
      player_phone: registration.player_phone,
      message_type: 'game_reminder',
      message_content: message,
      delivery_status: 'pending',
      scheduled_for: isWaitingList ? undefined : reminderTime.toISOString(),
    });
  }

  private async processWaitingListPromotions(gameId: string): Promise<void> {
    // Get current game capacity and registrations
    const { data: game } = await this.supabase
      .from('games')
      .select('max_players, title')
      .eq('id', gameId)
      .single();

    if (!game) return;

    const { data: registrations } = await this.supabase
      .from('game_registrations')
      .select('*')
      .eq('game_id', gameId)
      .order('registered_at', { ascending: true });

    if (!registrations) return;

    const confirmedCount = registrations.length;
    
    if (confirmedCount <= game.max_players) {
      // There might be waiting list promotions possible
      const waitingListPlayers = registrations.slice(game.max_players);
      
      for (const waitingPlayer of waitingListPlayers.slice(0, game.max_players - confirmedCount)) {
        // Send promotion notification
        await this.supabase.from('notifications').insert({
          game_id: gameId,
          player_phone: waitingPlayer.player_phone,
          message_type: 'game_update',
          message_content: `¡Buenas noticias! Se liberó un lugar en "${game.title}". Ahora estás confirmado para el partido.`,
          delivery_status: 'pending',
        });
      }
    }
  }

  private async createAuditLog(
    actionType: string,
    entityType: string,
    entityId: string,
    actionDetails: Record<string, any>,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await this.supabase.from('admin_audit_log').insert({
      admin_user_id: entityId, // Use entity ID as pseudo-admin for public actions
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      action_details: actionDetails,
      ip_address: clientInfo?.ip,
      user_agent: clientInfo?.userAgent,
    });
  }
}

// Export factory function
export function createFriendRegistrationService(): FriendRegistrationService {
  return new FriendRegistrationService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}