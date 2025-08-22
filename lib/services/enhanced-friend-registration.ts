import { FriendRegistrationService, FriendRegistrationServiceConfig } from './friend-registration';
import { WhatsAppService, WhatsAppConfig } from './whatsapp';
import { RegistrationTokenService, TokenUtils } from './registration-token';
import { 
  FriendRegistrationRequest,
  FriendRegistrationResponse,
  GameRegistration
} from '../types/friend-registration';

/**
 * Enhanced Friend Registration Service
 * Extends the base FriendRegistrationService to include WhatsApp notifications
 * and personal registration management
 */

export interface EnhancedFriendRegistrationConfig extends FriendRegistrationServiceConfig {
  whatsapp: WhatsAppConfig;
}

export class EnhancedFriendRegistrationService extends FriendRegistrationService {
  private whatsAppService: WhatsAppService;
  private tokenService: RegistrationTokenService;

  constructor(config: EnhancedFriendRegistrationConfig) {
    super(config);
    
    this.whatsAppService = new WhatsAppService(
      config.whatsapp,
      config.supabaseUrl,
      config.supabaseServiceKey
    );
    
    this.tokenService = new RegistrationTokenService({
      supabaseUrl: config.supabaseUrl,
      supabaseServiceKey: config.supabaseServiceKey
    });
  }

  /**
   * Enhanced friend registration with automatic WhatsApp notifications
   */
  async registerFriend(
    shareToken: string,
    registrationData: FriendRegistrationRequest,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<FriendRegistrationResponse> {
    try {
      // Call parent registration method
      const result = await super.registerFriend(shareToken, registrationData, clientInfo);
      
      if (result.success && result.data) {
        // Generate and assign registration token
        const tokenResult = await this.tokenService.assignTokenToRegistration(result.data.id);
        
        if (tokenResult.success && tokenResult.token) {
          // Send WhatsApp notification
          await this.sendRegistrationNotification(
            result.data,
            tokenResult.token,
            result.game_full,
            result.waiting_list_position,
            result.confirmation_details
          );

          // Add token to response data
          result.data.registration_token = tokenResult.token;
        } else {
          console.error('Failed to assign registration token:', tokenResult.error);
        }
      }

      return result;

    } catch (error) {
      console.error('Enhanced registration error:', error);
      // Fallback to parent implementation
      return super.registerFriend(shareToken, registrationData, clientInfo);
    }
  }

  /**
   * Enhanced cancellation with WhatsApp notification
   */
  async cancelFriendRegistration(
    shareToken: string,
    playerPhone: string,
    reason?: string,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Get registration details before cancellation
      const gameResponse = await this.getPublicGameInfo(shareToken);
      if (!gameResponse.success || !gameResponse.data) {
        return super.cancelFriendRegistration(shareToken, playerPhone, reason, clientInfo);
      }

      const game = gameResponse.data;

      // Find registration
      const { data: registration } = await this.supabase
        .from('game_registrations')
        .select('*')
        .eq('game_id', game.id)
        .eq('player_phone', playerPhone)
        .single();

      // Delete the registration completely (no refunds - payment happens after the game)
      const { error: deleteError } = await this.supabase
        .from('game_registrations')
        .delete()
        .eq('id', registration.id);

      if (deleteError) {
        console.error('Error deleting registration:', deleteError);
        return {
          success: false,
          message: 'Error al cancelar la inscripción',
          error: 'DELETE_ERROR'
        };
      }

      // Handle waiting list promotions
      await this.processWaitingListPromotions(game.id);

      // Send cancellation notification
      await this.sendCancellationNotification(registration, game, reason);

      return {
        success: true,
        message: 'Inscripción cancelada exitosamente'
      };

    } catch (error) {
      console.error('Enhanced cancellation error:', error);
      return {
        success: false,
        message: 'Error al cancelar la inscripción',
        error: 'CANCELLATION_ERROR'
      };
    }
  }

  /**
   * Cancel registration using token
   */
  async cancelRegistrationByToken(
    registrationToken: string,
    reason?: string,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string; error?: string; refund_info?: any }> {
    try {
      // Validate token and get registration
      const tokenValidation = await this.tokenService.validateTokenInDatabase(registrationToken);
      if (!tokenValidation.isValid) {
        return {
          success: false,
          message: 'Token de inscripción inválido o expirado',
          error: 'INVALID_TOKEN'
        };
      }

      // Get full registration details
      const registrationResult = await this.tokenService.getRegistrationByToken(registrationToken);
      if (!registrationResult.success || !registrationResult.data) {
        return {
          success: false,
          message: 'No se encontró la inscripción',
          error: 'REGISTRATION_NOT_FOUND'
        };
      }

      const registration = registrationResult.data;
      const game = registration.games;

      // Check if cancellation is allowed
      const canCancel = this.canCancelRegistration({
        id: game.id,
        title: game.title,
        description: game.description,
        game_date: game.game_date,
        min_players: game.min_players,
        max_players: game.max_players,
        field_cost_per_player: game.field_cost_per_player,
        game_duration_minutes: game.game_duration_minutes,
        status: game.status,
        current_players: 0, // Will be calculated
        spots_available: 0,
        waiting_list_count: 0,
        registration_deadline: '',
        is_registration_open: false,
        is_full: false,
        location: 'Cancha Leconte'
      });

      if (!canCancel.allowed) {
        return {
          success: false,
          message: canCancel.reason,
          error: 'CANCELLATION_NOT_ALLOWED'
        };
      }

      // Delete the registration completely (no refunds - payment happens after the game)
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
      await this.sendCancellationNotification(registration, game, reason);

      // No refund needed since payment happens after the game
      const refundInfo = null;

      // Create audit log
      await this.createAuditLog(
        'TOKEN_CANCEL',
        'GAME_REGISTRATION',
        registration.id,
        {
          player_name: registration.player_name,
          player_phone: registration.player_phone,
          reason,
          token_used: registrationToken,
          game_title: game.title,
        },
        clientInfo
      );

      return {
        success: true,
        message: 'Inscripción cancelada exitosamente',
        refund_info: refundInfo
      };

    } catch (error) {
      console.error('Error cancelling registration by token:', error);
      return {
        success: false,
        message: 'Error al cancelar la inscripción',
        error: 'CANCELLATION_ERROR'
      };
    }
  }

  /**
   * Get registration details by token
   */
  async getRegistrationByToken(registrationToken: string) {
    try {
      const result = await this.tokenService.getRegistrationByToken(registrationToken);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          message: 'Inscripción no encontrada',
          error: result.error
        };
      }

      const registration = result.data;
      const game = registration.games;

      // Calculate additional status information
      const now = new Date();
      const gameDate = new Date(game.game_date);
      const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const minutesUntilGame = Math.floor((hoursUntilGame % 1) * 60);

      // Get current players count and position
      const { data: allRegistrations } = await this.supabase
        .from('game_registrations')
        .select('id, registered_at')
        .eq('game_id', game.id)
        .order('registered_at', { ascending: true });

      const currentPlayers = allRegistrations?.length || 0;
      const playerIndex = allRegistrations?.findIndex(r => r.id === registration.id);
      const isWaitingList = playerIndex !== undefined && playerIndex >= game.max_players;
      const waitingListPosition = isWaitingList ? playerIndex - game.max_players + 1 : undefined;

      const canCancel = this.canCancelRegistration({
        id: game.id,
        title: game.title,
        description: game.description,
        game_date: game.game_date,
        min_players: game.min_players,
        max_players: game.max_players,
        field_cost_per_player: game.field_cost_per_player,
        game_duration_minutes: game.game_duration_minutes,
        status: game.status,
        current_players: currentPlayers,
        spots_available: Math.max(0, game.max_players - currentPlayers),
        waiting_list_count: Math.max(0, currentPlayers - game.max_players),
        registration_deadline: '',
        is_registration_open: false,
        is_full: currentPlayers >= game.max_players,
        location: 'Cancha Leconte'
      });

      return {
        success: true,
        data: {
          registration: {
            id: registration.id,
            player_name: registration.player_name,
            player_phone: registration.player_phone,
            registered_at: registration.registered_at,
            payment_status: registration.payment_status,
            team_assignment: registration.team_assignment,
            cancelled_at: registration.cancelled_at,
            cancellation_reason: registration.cancellation_reason,
          },
          game: {
            id: game.id,
            title: game.title,
            description: game.description,
            game_date: game.game_date,
            location: 'Cancha Leconte',
            field_cost_per_player: game.field_cost_per_player,
            game_duration_minutes: game.game_duration_minutes,
            status: game.status,
            current_players: currentPlayers,
            max_players: game.max_players,
            min_players: game.min_players,
          },
          status: {
            is_confirmed: !isWaitingList,
            is_waiting_list: isWaitingList,
            waiting_list_position: waitingListPosition,
            can_cancel: canCancel.allowed,
            time_until_game: {
              hours: Math.floor(hoursUntilGame),
              minutes: minutesUntilGame,
              display: hoursUntilGame > 0 
                ? `${Math.floor(hoursUntilGame)}h ${minutesUntilGame}m`
                : 'El partido ya comenzó'
            }
          }
        },
        message: 'Detalles de inscripción obtenidos exitosamente'
      };

    } catch (error) {
      console.error('Error getting registration by token:', error);
      return {
        success: false,
        message: 'Error al obtener los detalles de la inscripción',
        error: 'DATABASE_ERROR'
      };
    }
  }

  /**
   * Send registration confirmation notification
   */
  private async sendRegistrationNotification(
    registration: GameRegistration,
    token: string,
    isWaitingList: boolean,
    waitingListPosition?: number,
    confirmationDetails?: any
  ): Promise<void> {
    try {
      const managementUrl = TokenUtils.createManagementUrl(token);
      
      const templateName = isWaitingList ? 'waiting_list_notification' : 'registration_confirmation';
      
      const params: Record<string, string> = {
        '1': registration.player_name,
        '2': confirmationDetails?.game_title || 'Partido',
        '3': new Date(confirmationDetails?.game_date || '').toLocaleDateString('es-AR'),
        '4': managementUrl
      };

      // Add position for waiting list
      if (isWaitingList && waitingListPosition) {
        params['2'] = waitingListPosition.toString(); // Position goes in slot 2 for waiting list template
        params['3'] = confirmationDetails?.game_title || 'Partido'; // Game title moves to slot 3
        params['4'] = managementUrl; // URL stays in slot 4
      }

      const result = await this.whatsAppService.sendTemplateMessageWithRetry(
        registration.player_phone,
        templateName,
        params
      );

      // Update notification status in registration
      await this.supabase
        .from('game_registrations')
        .update({
          notification_sent_at: new Date().toISOString(),
          notification_status: result.success ? 'sent' : 'failed'
        })
        .eq('id', registration.id);

      // Create notification record
      await this.supabase
        .from('notifications')
        .insert({
          game_id: registration.game_id,
          registration_id: registration.id,
          player_phone: registration.player_phone,
          message_type: 'game_update',
          template_name: templateName,
          template_params: params,
          message_content: `WhatsApp template: ${templateName}`,
          whatsapp_message_id: result.message_id,
          delivery_status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null
        });

    } catch (error) {
      console.error('Failed to send registration notification:', error);
    }
  }

  /**
   * Send cancellation confirmation notification
   */
  private async sendCancellationNotification(
    registration: any,
    game: any,
    reason?: string
  ): Promise<void> {
    try {
      const params = {
        '1': registration.player_name,
        '2': game.title,
        '3': reason || 'No especificado'
      };

      const result = await this.whatsAppService.sendTemplateMessageWithRetry(
        registration.player_phone,
        'cancellation_confirmation',
        params
      );

      // Create notification record
      await this.supabase
        .from('notifications')
        .insert({
          game_id: game.id,
          registration_id: registration.id,
          player_phone: registration.player_phone,
          message_type: 'game_update',
          template_name: 'cancellation_confirmation',
          template_params: params,
          message_content: `Confirmación de cancelación: ${game.title}`,
          whatsapp_message_id: result.message_id,
          delivery_status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null
        });

    } catch (error) {
      console.error('Failed to send cancellation notification:', error);
    }
  }

  /**
   * Process waiting list promotions with WhatsApp notifications
   */
  protected async processWaitingListPromotions(gameId: string): Promise<void> {
    // Call parent method
    await super.processWaitingListPromotions(gameId);

    // Send promotion notifications via WhatsApp
    try {
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
        // Find newly promoted players (those who were in waiting list but now within max_players)
        const promotedPlayers = registrations.slice(game.max_players - 1, game.max_players);
        
        for (const promotedPlayer of promotedPlayers) {
          if (promotedPlayer.registration_token) {
            const managementUrl = TokenUtils.createManagementUrl(promotedPlayer.registration_token);
            
            const params = {
              '1': promotedPlayer.player_name,
              '2': game.title,
              '3': managementUrl
            };

            await this.whatsAppService.sendTemplateMessageWithRetry(
              promotedPlayer.player_phone,
              'waiting_list_promotion',
              params
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending promotion notifications:', error);
    }
  }
}

// Factory function
export function createEnhancedFriendRegistrationService(): EnhancedFriendRegistrationService {
  const whatsappConfig: WhatsAppConfig = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/whatsapp/webhook`
  };

  return new EnhancedFriendRegistrationService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    whatsapp: whatsappConfig
  });
}