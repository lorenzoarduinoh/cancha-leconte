import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';
import { AuditService } from './audit';
import { NotificationService } from './notification';
import { PaymentService } from './payment';
import { 
  CreateGameRequest, 
  UpdateGameRequest, 
  GameWithStats,
  GameRegistration,
  TeamAssignment,
  GameStatus
} from '../types/api';

type Tables = Database['public']['Tables'];
type GameRow = Tables['games']['Row'];
type GameInsert = Tables['games']['Insert'];
type GameUpdate = Tables['games']['Update'];
type RegistrationRow = Tables['game_registrations']['Row'];

export interface GameFilters {
  status?: GameStatus[];
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GameServiceConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export class GameService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private auditService: AuditService;
  private notificationService: NotificationService;
  private paymentService: PaymentService;

  constructor(config: GameServiceConfig) {
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey);
    this.auditService = new AuditService(this.supabase);
    this.notificationService = new NotificationService(this.supabase);
    this.paymentService = new PaymentService();
  }

  /**
   * Create a new game with full business logic validation
   */
  async createGame(gameData: CreateGameRequest, adminUserId: string): Promise<GameWithStats> {
    // Validate game date is in the future
    const gameDate = new Date(gameData.game_date);
    if (gameDate <= new Date()) {
      throw new Error('La fecha del partido debe ser futura');
    }

    // Validate player limits
    if (gameData.min_players >= gameData.max_players) {
      throw new Error('El mínimo de jugadores debe ser menor al máximo');
    }

    if (gameData.max_players > 30) {
      throw new Error('El máximo de jugadores no puede exceder 30');
    }

    // Generate secure share token
    const shareToken = this.generateShareToken();

    // Prepare game data for insertion
    const gameInsert: GameInsert = {
      title: gameData.title,
      description: gameData.description || null,
      game_date: gameData.game_date,
      min_players: gameData.min_players,
      max_players: gameData.max_players,
      field_cost_per_player: gameData.field_cost_per_player,
      game_duration_minutes: gameData.game_duration_minutes || 90,
      status: 'open',
      share_token: shareToken,
      created_by: adminUserId,
    };

    // Insert game into database
    const { data: newGame, error: insertError } = await this.supabase
      .from('games')
      .insert(gameInsert)
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Error al crear el partido: ${insertError.message}`);
    }

    // Create audit log entry
    await this.auditService.logAction({
      adminUserId,
      actionType: 'CREATE',
      entityType: 'GAME',
      entityId: newGame.id,
      actionDetails: {
        title: gameData.title,
        game_date: gameData.game_date,
        max_players: gameData.max_players,
      },
    });

    // Transform to GameWithStats
    return this.transformToGameWithStats(newGame, []);
  }

  /**
   * Update an existing game with change impact validation
   */
  async updateGame(
    gameId: string, 
    updates: UpdateGameRequest, 
    adminUserId: string
  ): Promise<GameWithStats> {
    // Get current game data
    const currentGame = await this.getGameById(gameId);
    if (!currentGame) {
      throw new Error('Partido no encontrado');
    }

    // Get current registrations
    const registrations = await this.getGameRegistrations(gameId);
    const currentPlayerCount = registrations.length;

    // Validate updates that could affect registered players
    if (updates.max_players && updates.max_players < currentPlayerCount) {
      throw new Error(
        `No se puede reducir el máximo de jugadores por debajo del número actual (${currentPlayerCount})`
      );
    }

    if (updates.game_date) {
      const newDate = new Date(updates.game_date);
      const currentDate = new Date(currentGame.game_date);
      
      // Check if date change is significant (more than 1 hour difference)
      const timeDiff = Math.abs(newDate.getTime() - currentDate.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff > 1 && registrations.length > 0) {
        // Schedule notifications for significant date changes
        await this.notificationService.scheduleGameUpdateNotifications(
          gameId, 
          registrations,
          'La fecha del partido ha cambiado'
        );
      }
    }

    // Prepare update data
    const gameUpdate: GameUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Update game in database
    const { data: updatedGame, error: updateError } = await this.supabase
      .from('games')
      .update(gameUpdate)
      .eq('id', gameId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Error al actualizar el partido: ${updateError.message}`);
    }

    // Create audit log entry
    await this.auditService.logAction({
      adminUserId,
      actionType: 'UPDATE',
      entityType: 'GAME',
      entityId: gameId,
      actionDetails: {
        changes: updates,
        previous_data: {
          title: currentGame.title,
          game_date: currentGame.game_date,
          max_players: currentGame.max_players,
        },
      },
    });

    return this.transformToGameWithStats(updatedGame, registrations);
  }

  /**
   * Cancel a game with proper notification handling
   */
  async cancelGame(gameId: string, adminUserId: string, reason?: string): Promise<void> {
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new Error('Partido no encontrado');
    }

    if (game.status === 'cancelled') {
      throw new Error('El partido ya está cancelado');
    }

    if (game.status === 'completed') {
      throw new Error('No se puede cancelar un partido que ya finalizó');
    }

    // Get registrations for notifications
    const registrations = await this.getGameRegistrations(gameId);

    // Update game status
    const { error: updateError } = await this.supabase
      .from('games')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      throw new Error(`Error al cancelar el partido: ${updateError.message}`);
    }

    // Handle refunds for paid registrations
    const paidRegistrations = registrations.filter(r => r.payment_status === 'paid');
    for (const registration of paidRegistrations) {
      if (registration.payment_id) {
        try {
          await this.paymentService.processRefund(registration.payment_id);
          
          // Update payment status
          await this.supabase
            .from('game_registrations')
            .update({ payment_status: 'refunded' })
            .eq('id', registration.id);
        } catch (error) {
          console.error(`Error processing refund for registration ${registration.id}:`, error);
        }
      }
    }

    // Send cancellation notifications
    await this.notificationService.sendGameCancellationNotifications(
      gameId, 
      registrations, 
      reason || 'El partido ha sido cancelado'
    );

    // Create audit log entry
    await this.auditService.logAction({
      adminUserId,
      actionType: 'CANCEL',
      entityType: 'GAME',
      entityId: gameId,
      actionDetails: {
        reason,
        affected_players: registrations.length,
        refunds_processed: paidRegistrations.length,
      },
    });
  }

  /**
   * Assign teams randomly or manually
   */
  async assignTeams(
    gameId: string, 
    adminUserId: string, 
    method: 'random' | 'manual',
    manualAssignments?: TeamAssignment[]
  ): Promise<GameRegistration[]> {
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new Error('Partido no encontrado');
    }

    const registrations = await this.getGameRegistrations(gameId);
    
    if (registrations.length < game.min_players) {
      throw new Error('No hay suficientes jugadores registrados para asignar equipos');
    }

    let assignments: TeamAssignment[] = [];

    if (method === 'random') {
      // Random team assignment
      const shuffled = [...registrations].sort(() => Math.random() - 0.5);
      const teamSize = Math.floor(registrations.length / 2);
      
      assignments = shuffled.map((reg, index) => ({
        registrationId: reg.id,
        team: index < teamSize ? 'team_a' : 'team_b',
      }));
    } else if (method === 'manual' && manualAssignments) {
      assignments = manualAssignments;
    }

    // Update registrations with team assignments
    for (const assignment of assignments) {
      await this.supabase
        .from('game_registrations')
        .update({ team_assignment: assignment.team })
        .eq('id', assignment.registrationId);
    }

    // Update game with assignment timestamp
    await this.supabase
      .from('games')
      .update({ 
        teams_assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    // Create audit log entry
    await this.auditService.logAction({
      adminUserId,
      actionType: 'ASSIGN_TEAMS',
      entityType: 'GAME',
      entityId: gameId,
      actionDetails: {
        method,
        assignments_count: assignments.length,
        team_a_count: assignments.filter(a => a.team === 'team_a').length,
        team_b_count: assignments.filter(a => a.team === 'team_b').length,
      },
    });

    // Return updated registrations
    return this.getGameRegistrations(gameId);
  }

  /**
   * Record game results
   */
  async recordResults(
    gameId: string,
    adminUserId: string,
    teamAScore: number,
    teamBScore: number,
    notes?: string
  ): Promise<void> {
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new Error('Partido no encontrado');
    }

    if (game.status !== 'in_progress' && game.status !== 'closed') {
      throw new Error('Solo se pueden registrar resultados de partidos en progreso o cerrados');
    }

    // Determine winning team
    let winningTeam: 'team_a' | 'team_b' | 'draw';
    if (teamAScore > teamBScore) {
      winningTeam = 'team_a';
    } else if (teamBScore > teamAScore) {
      winningTeam = 'team_b';
    } else {
      winningTeam = 'draw';
    }

    // Insert game result
    const { error: resultError } = await this.supabase
      .from('game_results')
      .insert({
        game_id: gameId,
        team_a_score: teamAScore,
        team_b_score: teamBScore,
        winning_team: winningTeam,
        notes,
        recorded_by: adminUserId,
      });

    if (resultError) {
      throw new Error(`Error al registrar los resultados: ${resultError.message}`);
    }

    // Update game status to completed
    await this.supabase
      .from('games')
      .update({ 
        status: 'completed',
        results_recorded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    // Create audit log entry
    await this.auditService.logAction({
      adminUserId,
      actionType: 'RECORD_RESULTS',
      entityType: 'GAME',
      entityId: gameId,
      actionDetails: {
        team_a_score: teamAScore,
        team_b_score: teamBScore,
        winning_team: winningTeam,
        notes,
      },
    });
  }

  /**
   * Get games list with filters and pagination
   */
  async getGames(
    filters: GameFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<{ data: GameWithStats[]; total: number }> {
    const { page, limit, sortBy = 'game_date', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    // Build query
    let query = this.supabase
      .from('games')
      .select(`
        *,
        game_registrations(
          id,
          player_name,
          player_phone,
          team_assignment,
          payment_status,
          payment_amount,
          registered_at,
          paid_at
        ),
        game_results(
          id,
          team_a_score,
          team_b_score,
          winning_team,
          notes,
          recorded_at
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters.dateFrom) {
      query = query.gte('game_date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('game_date', filters.dateTo);
    }

    if (filters.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: gamesData, error: gamesError, count } = await query;

    if (gamesError) {
      throw new Error(`Error al obtener los partidos: ${gamesError.message}`);
    }

    // Transform data to include statistics
    const gamesWithStats = gamesData?.map(game => 
      this.transformToGameWithStats(game, game.game_registrations || [])
    ) || [];

    return {
      data: gamesWithStats,
      total: count || 0,
    };
  }

  /**
   * Get single game by ID
   */
  async getGameById(gameId: string): Promise<GameWithStats | null> {
    const { data: game, error } = await this.supabase
      .from('games')
      .select(`
        *,
        game_registrations(
          id,
          player_name,
          player_phone,
          team_assignment,
          payment_status,
          payment_amount,
          registered_at,
          paid_at
        ),
        game_results(
          id,
          team_a_score,
          team_b_score,
          winning_team,
          notes,
          recorded_at
        )
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Game not found
      }
      throw new Error(`Error al obtener el partido: ${error.message}`);
    }

    return this.transformToGameWithStats(game, game.game_registrations || []);
  }

  /**
   * Get game by share token (for public access)
   */
  async getGameByShareToken(shareToken: string): Promise<GameWithStats | null> {
    const { data: game, error } = await this.supabase
      .from('games')
      .select(`
        *,
        game_registrations(
          id,
          player_name,
          player_phone,
          team_assignment,
          payment_status,
          registered_at
        )
      `)
      .eq('share_token', shareToken)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Error al obtener el partido: ${error.message}`);
    }

    return this.transformToGameWithStats(game, game.game_registrations || []);
  }

  /**
   * Get game registrations
   */
  private async getGameRegistrations(gameId: string): Promise<RegistrationRow[]> {
    const { data: registrations, error } = await this.supabase
      .from('game_registrations')
      .select('*')
      .eq('game_id', gameId)
      .order('registered_at', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener las inscripciones: ${error.message}`);
    }

    return registrations || [];
  }

  /**
   * Transform game data to include statistics
   */
  private transformToGameWithStats(
    game: GameRow & { 
      game_registrations?: RegistrationRow[];
      game_results?: any[];
    },
    registrations?: RegistrationRow[]
  ): GameWithStats {
    const regs = registrations || game.game_registrations || [];
    const result = game.game_results?.[0] || null;

    return {
      ...game,
      current_players: regs.length,
      waiting_list_count: Math.max(0, regs.length - game.max_players),
      pending_payments: regs.filter(r => r.payment_status === 'pending').length,
      total_revenue: regs
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.payment_amount || 0), 0),
      registrations: regs,
      result,
    };
  }

  /**
   * Calculate game status based on current time and duration
   */
  calculateGameStatus(gameDate: string, durationMinutes: number = 90): GameStatus {
    const now = new Date();
    
    // Parse game date as Argentina local time (UTC-3) - same logic as frontend
    const isoMatch = gameDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    let startTime: Date;
    
    if (isoMatch) {
      // Parse as literal local time (Argentina timezone)
      const [, year, month, day, hours, minutes] = isoMatch;
      startTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    } else {
      // Fallback
      startTime = new Date(gameDate);
    }
    
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    if (now >= startTime && now <= endTime) {
      return 'in_progress';
    } else if (now > endTime) {
      return 'completed';
    }
    
    // Return null to indicate no automatic status change needed
    return null as any;
  }

  /**
   * Update game status based on duration for a single game
   */
  async updateGameStatusByDuration(game: GameRow): Promise<GameStatus | null> {
    const currentStatus = game.status;
    const newStatus = this.calculateGameStatus(game.game_date, game.game_duration_minutes || 90);
    
    // Only update if the calculated status is different and makes sense
    if (newStatus && newStatus !== currentStatus) {
      // Only auto-update from valid statuses to 'in_progress' or 'completed'
      // Allow transitions from draft, open, closed to in_progress/completed
      // Also update from 'in_progress' to 'completed'
      const allowedTransitions = {
        'draft': ['in_progress', 'completed'],
        'open': ['in_progress', 'completed'],
        'closed': ['in_progress', 'completed'],
        'in_progress': ['completed']
      };

      const allowed = allowedTransitions[currentStatus as keyof typeof allowedTransitions];
      if (allowed && allowed.includes(newStatus)) {
        const { error } = await this.supabase
          .from('games')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);

        if (error) {
          console.error('Error updating game status:', error);
          return null;
        }

        console.log(`Auto-updated game ${game.id} status from ${currentStatus} to ${newStatus}`);
        return newStatus;
      }
    }

    return null;
  }

  /**
   * Batch update game statuses based on duration
   */
  async batchUpdateGameStatusesByDuration(games: GameRow[]): Promise<void> {
    const now = new Date();
    const gamesToUpdateInProgress: string[] = [];
    const gamesToUpdateCompleted: string[] = [];

    games.forEach(game => {
      // Parse game date as Argentina local time (UTC-3) - same logic as frontend
      const isoMatch = game.game_date.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      let gameDate: Date;
      
      if (isoMatch) {
        // Parse as literal local time (Argentina timezone)
        const [, year, month, day, hours, minutes] = isoMatch;
        gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      } else {
        // Fallback
        gameDate = new Date(game.game_date);
      }
      
      const gameDuration = game.game_duration_minutes || 90;
      const gameEndTime = new Date(gameDate.getTime() + gameDuration * 60 * 1000);

      // If current time is between game start and game end, mark as in_progress
      if (now >= gameDate && now <= gameEndTime && (game.status === 'open' || game.status === 'closed')) {
        gamesToUpdateInProgress.push(game.id);
      }
      // If current time is after game end time, mark as completed
      else if (now > gameEndTime && (game.status === 'open' || game.status === 'closed' || game.status === 'in_progress')) {
        gamesToUpdateCompleted.push(game.id);
      }
    });

    // Update games to 'in_progress' status in batch
    if (gamesToUpdateInProgress.length > 0) {
      console.log('Batch updating games to in_progress:', gamesToUpdateInProgress);
      await this.supabase
        .from('games')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .in('id', gamesToUpdateInProgress);
    }

    // Update games to 'completed' status in batch
    if (gamesToUpdateCompleted.length > 0) {
      console.log('Batch updating games to completed:', gamesToUpdateCompleted);
      await this.supabase
        .from('games')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .in('id', gamesToUpdateCompleted);
    }
  }

  /**
   * Generate secure share token
   */
  private generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export factory function for creating service instances
export function createGameService(): GameService {
  return new GameService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}