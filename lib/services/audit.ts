import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';
import { AuditLogEntry, CreateAuditLogRequest } from '../types/api';

export class AuditService {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Log an administrative action
   */
  async logAction(
    adminUserId: string,
    request: CreateAuditLogRequest,
    context?: {
      ip_address?: string;
      user_agent?: string;
    }
  ): Promise<void> {
    try {
      const auditEntry = {
        admin_user_id: adminUserId,
        action_type: request.action_type,
        entity_type: request.entity_type,
        entity_id: request.entity_id || null,
        action_details: request.action_details || null,
        ip_address: context?.ip_address || null,
        user_agent: context?.user_agent || null,
      };

      const { error } = await this.supabase
        .from('admin_audit_log')
        .insert(auditEntry);

      if (error) {
        console.error('Error creating audit log entry:', error);
        // Don't throw error - audit logging should not break the main flow
      }
    } catch (error) {
      console.error('Audit service error:', error);
      // Fail silently - audit logging is not critical for operation
    }
  }

  /**
   * Get audit log entries with filtering
   */
  async getAuditLog(options: {
    adminUserId?: string;
    actionType?: string;
    entityType?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    let query = this.supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin_users(name, username)
      `, { count: 'exact' });

    // Apply filters
    if (options.adminUserId) {
      query = query.eq('admin_user_id', options.adminUserId);
    }

    if (options.actionType) {
      query = query.eq('action_type', options.actionType);
    }

    if (options.entityType) {
      query = query.eq('entity_type', options.entityType);
    }

    if (options.entityId) {
      query = query.eq('entity_id', options.entityId);
    }

    if (options.dateFrom) {
      query = query.gte('created_at', options.dateFrom);
    }

    if (options.dateTo) {
      query = query.lte('created_at', options.dateTo);
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Error fetching audit log: ${error.message}`);
    }

    const entries: AuditLogEntry[] = (data || []).map(entry => ({
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action_details: entry.action_details as Record<string, any> | undefined,
      admin_user_id: entry.admin_user_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: entry.created_at,
    }));

    return {
      entries,
      total: count || 0,
    };
  }

  /**
   * Common audit action helpers
   */
  async logGameAction(
    adminUserId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL',
    gameId: string,
    details: Record<string, any>,
    context?: { ip_address?: string; user_agent?: string }
  ) {
    await this.logAction(
      adminUserId,
      {
        action_type: action,
        entity_type: 'GAME',
        entity_id: gameId,
        action_details: details,
      },
      context
    );
  }

  async logPlayerAction(
    adminUserId: string,
    action: 'REGISTER' | 'CANCEL' | 'ASSIGN_TEAM' | 'UPDATE_PAYMENT',
    registrationId: string,
    details: Record<string, any>,
    context?: { ip_address?: string; user_agent?: string }
  ) {
    await this.logAction(
      adminUserId,
      {
        action_type: action,
        entity_type: 'PLAYER',
        entity_id: registrationId,
        action_details: details,
      },
      context
    );
  }

  async logPaymentAction(
    adminUserId: string,
    action: 'UPDATE_PAYMENT' | 'REFUND' | 'MARK_PAID',
    registrationId: string,
    details: Record<string, any>,
    context?: { ip_address?: string; user_agent?: string }
  ) {
    await this.logAction(
      adminUserId,
      {
        action_type: action,
        entity_type: 'PAYMENT',
        entity_id: registrationId,
        action_details: details,
      },
      context
    );
  }

  async logNotificationAction(
    adminUserId: string,
    action: 'SEND_NOTIFICATION' | 'SCHEDULE_NOTIFICATION',
    details: Record<string, any>,
    context?: { ip_address?: string; user_agent?: string }
  ) {
    await this.logAction(
      adminUserId,
      {
        action_type: action,
        entity_type: 'NOTIFICATION',
        action_details: details,
      },
      context
    );
  }

  async logSystemAction(
    adminUserId: string,
    action: 'LOGIN' | 'LOGOUT' | 'BACKUP' | 'CLEANUP',
    details?: Record<string, any>,
    context?: { ip_address?: string; user_agent?: string }
  ) {
    await this.logAction(
      adminUserId,
      {
        action_type: action,
        entity_type: 'SYSTEM',
        action_details: details,
      },
      context
    );
  }

  /**
   * Generate audit report
   */
  async generateReport(options: {
    dateFrom: string;
    dateTo: string;
    adminUserId?: string;
  }): Promise<{
    summary: {
      total_actions: number;
      unique_admins: number;
      most_common_action: string;
      actions_by_type: Record<string, number>;
      actions_by_entity: Record<string, number>;
    };
    entries: AuditLogEntry[];
  }> {
    const { entries, total } = await this.getAuditLog({
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      adminUserId: options.adminUserId,
      limit: 1000, // Get all entries for report
    });

    // Calculate summary statistics
    const actionCounts = new Map<string, number>();
    const entityCounts = new Map<string, number>();
    const adminIds = new Set<string>();

    entries.forEach(entry => {
      actionCounts.set(
        entry.action_type,
        (actionCounts.get(entry.action_type) || 0) + 1
      );
      
      entityCounts.set(
        entry.entity_type,
        (entityCounts.get(entry.entity_type) || 0) + 1
      );
      
      adminIds.add(entry.admin_user_id);
    });

    // Find most common action
    let mostCommonAction = '';
    let maxCount = 0;
    for (const [action, count] of actionCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonAction = action;
      }
    }

    return {
      summary: {
        total_actions: total,
        unique_admins: adminIds.size,
        most_common_action: mostCommonAction,
        actions_by_type: Object.fromEntries(actionCounts),
        actions_by_entity: Object.fromEntries(entityCounts),
      },
      entries,
    };
  }

  /**
   * Clean up old audit logs (older than specified days)
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { count, error } = await this.supabase
      .from('admin_audit_log')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Error cleaning up audit logs: ${error.message}`);
    }

    return count || 0;
  }
}

// Singleton instance
export const auditService = new AuditService();