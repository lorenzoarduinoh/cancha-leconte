import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';
import { WebSocketMessage, DashboardEvent, RegistrationEvent } from '../types/api';

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  userId?: string;
  lastActivity: Date;
}

export class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient>();
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Initialize WebSocket server
   */
  public initializeServer(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      const client: ConnectedClient = {
        id: clientId,
        ws,
        channels: new Set(),
        lastActivity: new Date(),
      };
      
      this.clients.set(clientId, client);
      
      console.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'event',
        payload: { event: 'connected', clientId },
      });
      
      ws.on('message', (data) => {
        this.handleMessage(clientId, data.toString());
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    this.startPingInterval();
    console.log(`WebSocket server started on port ${port}`);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(clientId: string, message: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const data: WebSocketMessage = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          if (data.channel) {
            client.channels.add(data.channel);
            this.sendToClient(clientId, {
              type: 'event',
              payload: { event: 'subscribed', channel: data.channel },
            });
          }
          break;
          
        case 'unsubscribe':
          if (data.channel) {
            client.channels.delete(data.channel);
            this.sendToClient(clientId, {
              type: 'event',
              payload: { event: 'unsubscribed', channel: data.channel },
            });
          }
          break;
          
        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;
          
        default:
          console.warn(`Unknown message type from client ${clientId}:`, data.type);
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Invalid message format',
      });
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.clients.delete(clientId);
    }
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  public broadcastToChannel(channel: string, event: DashboardEvent | RegistrationEvent) {
    const message: WebSocketMessage = {
      type: 'event',
      channel,
      payload: event,
    };

    for (const [clientId, client] of this.clients.entries()) {
      if (client.channels.has(channel)) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * Initialize Supabase real-time subscriptions
   */
  public initializeSupabaseSubscriptions() {
    // Subscribe to game changes
    this.supabase
      .channel('games_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games' },
        (payload) => this.handleGameChange(payload)
      )
      .subscribe();

    // Subscribe to registration changes
    this.supabase
      .channel('registrations_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_registrations' },
        (payload) => this.handleRegistrationChange(payload)
      )
      .subscribe();

    // Subscribe to payment changes
    this.supabase
      .channel('payments_changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_registrations', filter: 'payment_status=eq.paid' },
        (payload) => this.handlePaymentChange(payload)
      )
      .subscribe();

    console.log('Supabase real-time subscriptions initialized');
  }

  /**
   * Handle game table changes
   */
  private handleGameChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
      const event: DashboardEvent = {
        event: 'game_created',
        payload: { game: newRecord },
        timestamp: new Date().toISOString(),
      };
      this.broadcastToChannel('dashboard', event);
    } else if (eventType === 'UPDATE') {
      const event: DashboardEvent = {
        event: 'game_updated',
        payload: { 
          gameId: newRecord.id,
          changes: this.getChangedFields(oldRecord, newRecord),
        },
        timestamp: new Date().toISOString(),
      };
      this.broadcastToChannel('dashboard', event);
      this.broadcastToChannel(`game:${newRecord.id}`, event);
    }
  }

  /**
   * Handle registration table changes
   */
  private handleRegistrationChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
      const dashboardEvent: DashboardEvent = {
        event: 'player_registered',
        payload: { 
          gameId: newRecord.game_id,
          registration: newRecord,
        },
        timestamp: new Date().toISOString(),
      };
      this.broadcastToChannel('dashboard', dashboardEvent);
      
      const gameEvent: RegistrationEvent = {
        event: 'player_registered',
        payload: newRecord,
        timestamp: new Date().toISOString(),
      };
      this.broadcastToChannel(`game:${newRecord.game_id}`, gameEvent);
    } else if (eventType === 'DELETE') {
      const gameEvent: RegistrationEvent = {
        event: 'player_cancelled',
        payload: { playerId: oldRecord.id, gameId: oldRecord.game_id },
        timestamp: new Date().toISOString(),
      };
      this.broadcastToChannel(`game:${oldRecord.game_id}`, gameEvent);
    }
  }

  /**
   * Handle payment status changes
   */
  private handlePaymentChange(payload: any) {
    const { new: newRecord } = payload;
    
    if (newRecord.payment_status === 'paid') {
      const event: DashboardEvent = {
        event: 'payment_completed',
        payload: {
          gameId: newRecord.game_id,
          playerId: newRecord.id,
          amount: newRecord.payment_amount,
        },
        timestamp: new Date().toISOString(),
      };
      this.broadcastToChannel('dashboard', event);
    }
  }

  /**
   * Get changed fields between old and new records
   */
  private getChangedFields(oldRecord: any, newRecord: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    for (const key in newRecord) {
      if (oldRecord[key] !== newRecord[key]) {
        changes[key] = { from: oldRecord[key], to: newRecord[key] };
      }
    }
    
    return changes;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      for (const [clientId, client] of this.clients.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(clientId, { type: 'ping' });
        } else {
          this.clients.delete(clientId);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Start cleanup interval for inactive connections
   */
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes
      
      for (const [clientId, client] of this.clients.entries()) {
        if (now.getTime() - client.lastActivity.getTime() > timeout) {
          client.ws.close();
          this.clients.delete(clientId);
          console.log(`Cleaned up inactive client ${clientId}`);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Manually trigger events (for testing or manual notifications)
   */
  public triggerDashboardUpdate() {
    const event: DashboardEvent = {
      event: 'dashboard_refresh',
      payload: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    };
    this.broadcastToChannel('dashboard', event);
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    const channelCounts = new Map<string, number>();
    
    for (const client of this.clients.values()) {
      for (const channel of client.channels) {
        channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
      }
    }
    
    return {
      totalClients: this.clients.size,
      channelSubscriptions: Object.fromEntries(channelCounts),
      uptime: process.uptime(),
    };
  }

  /**
   * Shutdown the service
   */
  public shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    
    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
    }
    
    console.log('Realtime service shut down');
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();