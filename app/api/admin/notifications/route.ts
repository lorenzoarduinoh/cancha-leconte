import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateRequestBody,
  validateQueryParams,
  withErrorHandling,
  getClientIP,
  getUserAgent,
  createPaginationMeta,
  formatPhoneNumber
} from '../../../../lib/utils/api';
import { 
  sendNotificationSchema,
  paginationSchema
} from '../../../../lib/validations/games';
import { 
  SendNotificationData,
  NotificationsResponse,
  Notification
} from '../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/notifications - List notifications with filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const { data: params, error: paramsError } = validateQueryParams(
    searchParams,
    paginationSchema.extend({
      message_type: sendNotificationSchema.shape.message_type.optional(),
      delivery_status: sendNotificationSchema.shape.message_type.optional(),
      game_id: sendNotificationSchema.shape.game_id.optional(),
      date_from: sendNotificationSchema.shape.scheduled_for.optional(),
      date_to: sendNotificationSchema.shape.scheduled_for.optional(),
    })
  );
  
  if (paramsError) {
    return paramsError;
  }
  
  const { page, limit, sort_by, sort_order, ...filters } = params;
  const offset = (page - 1) * limit;
  
  // Build query
  let query = supabase
    .from('notifications')
    .select(`
      *,
      games(title, game_date)
    `, { count: 'exact' });
  
  // Apply filters
  if (filters.message_type) {
    query = query.eq('message_type', filters.message_type);
  }
  
  if (filters.delivery_status) {
    query = query.eq('delivery_status', filters.delivery_status);
  }
  
  if (filters.game_id) {
    query = query.eq('game_id', filters.game_id);
  }
  
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  
  // Apply sorting and pagination
  query = query
    .order(sort_by || 'created_at', { ascending: sort_order === 'asc' })
    .range(offset, offset + limit - 1);
  
  const { data: notificationsData, error: notificationsError, count } = await query;
  
  if (notificationsError) {
    console.error('Error fetching notifications:', notificationsError);
    return createApiError('Error al obtener notificaciones', 500);
  }
  
  const pagination = createPaginationMeta(count || 0, page, limit);
  
  const response: NotificationsResponse = {
    data: notificationsData || [],
    total: count || 0,
    page,
    limit,
    hasMore: pagination.hasMore,
  };
  
  return createApiResponse(response);
});

// POST /api/admin/notifications - Send notification
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request body
  const { data: notificationData, error: validationError } = await validateRequestBody(
    request,
    sendNotificationSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  const adminUserId = 'mock-admin-id'; // Will be replaced with actual auth
  
  // Validate game exists if game_id is provided
  if (notificationData.game_id) {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, title')
      .eq('id', notificationData.game_id)
      .single();
    
    if (gameError) {
      return createApiError('Partido no encontrado', 404);
    }
  }
  
  // Format phone numbers
  const formattedRecipients = notificationData.recipients.map(formatPhoneNumber);
  
  // Create notification entries
  const notifications = formattedRecipients.map(phone => ({
    game_id: notificationData.game_id || null,
    player_phone: phone,
    message_type: notificationData.message_type,
    message_content: notificationData.message_content,
    delivery_status: 'pending' as const,
    scheduled_for: notificationData.scheduled_for || null,
  }));
  
  const { data: createdNotifications, error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();
  
  if (insertError) {
    console.error('Error creating notifications:', insertError);
    return createApiError('Error al crear notificaciones', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: 'SEND_NOTIFICATION',
    entity_type: 'NOTIFICATION',
    action_details: {
      message_type: notificationData.message_type,
      recipients_count: formattedRecipients.length,
      game_id: notificationData.game_id,
      scheduled: !!notificationData.scheduled_for,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Here you would trigger the actual WhatsApp sending
  // For now, we'll simulate immediate sending for non-scheduled messages
  if (!notificationData.scheduled_for) {
    // Simulate WhatsApp API call
    const sendResults = await Promise.allSettled(
      (createdNotifications || []).map(async (notification) => {
        // Simulate WhatsApp Business API call
        const success = Math.random() > 0.1; // 90% success rate for simulation
        
        if (success) {
          // Update notification as sent
          await supabase
            .from('notifications')
            .update({
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
              whatsapp_message_id: `wa_${Date.now()}_${notification.id}`,
            })
            .eq('id', notification.id);
          
          return { success: true, id: notification.id };
        } else {
          // Mark as failed
          await supabase
            .from('notifications')
            .update({
              delivery_status: 'failed',
            })
            .eq('id', notification.id);
          
          return { success: false, id: notification.id, error: 'WhatsApp delivery failed' };
        }
      })
    );
    
    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = sendResults.length - successCount;
    
    return createApiResponse(
      {
        notifications: createdNotifications,
        sent_count: successCount,
        failed_count: failedCount,
      },
      `Notificaciones procesadas: ${successCount} enviadas, ${failedCount} fallidas`,
      201
    );
  }
  
  return createApiResponse(
    { notifications: createdNotifications },
    `${createdNotifications?.length || 0} notificaciones programadas exitosamente`,
    201
  );
});