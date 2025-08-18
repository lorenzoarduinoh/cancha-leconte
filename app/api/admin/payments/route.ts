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
  getDaysOverdue,
  isPaymentOverdue
} from '../../../../lib/utils/api';
import { 
  updatePaymentStatusSchema,
  paginationSchema
} from '../../../../lib/validations/games';
import { 
  PaymentTrackingData,
  UpdatePaymentStatusData,
  PaymentResponse,
  PaymentAlert
} from '../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/payments - Get payment tracking overview
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const { data: params, error: paramsError } = validateQueryParams(
    searchParams,
    paginationSchema.extend({
      game_id: updatePaymentStatusSchema.shape.payment_id.optional(),
      payment_status: updatePaymentStatusSchema.shape.payment_status.optional(),
      date_from: updatePaymentStatusSchema.shape.paid_at.optional(),
      date_to: updatePaymentStatusSchema.shape.paid_at.optional(),
      overdue_only: updatePaymentStatusSchema.shape.payment_id.optional().transform(val => val === 'true'),
    })
  );
  
  if (paramsError) {
    return paramsError;
  }
  
  const adminUserId = 'mock-admin-id'; // Will be replaced with actual auth
  
  // Get overall payment statistics
  const { data: allRegistrations, error: registrationsError } = await supabase
    .from('game_registrations')
    .select(`
      *,
      games!inner(
        id,
        title,
        game_date,
        created_by,
        field_cost_per_player
      )
    `)
    .eq('games.created_by', adminUserId);
  
  if (registrationsError) {
    console.error('Error fetching payment data:', registrationsError);
    return createApiError('Error al obtener datos de pagos', 500);
  }
  
  // Calculate payment statistics
  const paymentStats = (allRegistrations || []).reduce((acc, reg) => {
    const amount = reg.payment_amount || reg.games?.field_cost_per_player || 0;
    
    switch (reg.payment_status) {
      case 'paid':
        acc.total_paid++;
        acc.paid_amount += amount;
        break;
      case 'pending':
        acc.total_pending++;
        acc.pending_amount += amount;
        break;
      case 'failed':
        acc.total_failed++;
        acc.failed_amount += amount;
        break;
    }
    
    return acc;
  }, {
    total_pending: 0,
    total_paid: 0,
    total_failed: 0,
    pending_amount: 0,
    paid_amount: 0,
    failed_amount: 0,
  });
  
  // Get overdue payments
  const overduePayments: PaymentAlert[] = [];
  
  for (const reg of allRegistrations || []) {
    if (reg.payment_status === 'pending' && reg.games && isPaymentOverdue(reg.games.game_date, reg.payment_status)) {
      overduePayments.push({
        id: reg.id,
        player_name: reg.player_name,
        player_phone: reg.player_phone,
        game_title: reg.games.title,
        game_date: reg.games.game_date,
        amount_due: reg.payment_amount || reg.games.field_cost_per_player,
        days_overdue: getDaysOverdue(reg.games.game_date),
      });
    }
  }
  
  // Sort overdue payments by days overdue (most urgent first)
  overduePayments.sort((a, b) => b.days_overdue - a.days_overdue);
  
  const paymentTrackingData: PaymentTrackingData = {
    ...paymentStats,
    overdue_payments: overduePayments,
  };
  
  return createApiResponse(paymentTrackingData, 'Datos de seguimiento de pagos obtenidos');
});

// PUT /api/admin/payments/[registrationId] - Update payment status
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const url = new URL(request.url);
  const registrationId = url.pathname.split('/').pop();
  
  if (!registrationId) {
    return createApiError('ID de registro requerido', 400);
  }
  
  // Validate request body
  const { data: updateData, error: validationError } = await validateRequestBody(
    request,
    updatePaymentStatusSchema
  );
  
  if (validationError) {
    return validationError;
  }
  
  const adminUserId = 'mock-admin-id'; // Will be replaced with actual auth
  
  // Check if registration exists
  const { data: existingRegistration, error: existingError } = await supabase
    .from('game_registrations')
    .select(`
      *,
      games(
        title,
        game_date,
        created_by
      )
    `)
    .eq('id', registrationId)
    .single();
  
  if (existingError) {
    if (existingError.code === 'PGRST116') {
      return createApiError('Registro no encontrado', 404);
    }
    console.error('Error fetching registration:', existingError);
    return createApiError('Error al obtener el registro', 500);
  }
  
  // Verify admin owns the game
  if (existingRegistration.games?.created_by !== adminUserId) {
    return createApiError('No autorizado para modificar este pago', 403);
  }
  
  // Prepare update data
  const updatePayload: any = {
    payment_status: updateData.payment_status,
    updated_at: new Date().toISOString(),
  };
  
  if (updateData.payment_id) {
    updatePayload.payment_id = updateData.payment_id;
  }
  
  if (updateData.payment_status === 'paid') {
    updatePayload.paid_at = updateData.paid_at || new Date().toISOString();
  } else if (updateData.payment_status === 'pending') {
    // Clear paid_at if reverting to pending
    updatePayload.paid_at = null;
  }
  
  // Update payment status
  const { data: updatedRegistration, error: updateError } = await supabase
    .from('game_registrations')
    .update(updatePayload)
    .eq('id', registrationId)
    .select(`
      *,
      games(
        title,
        game_date
      )
    `)
    .single();
  
  if (updateError) {
    console.error('Error updating payment status:', updateError);
    return createApiError('Error al actualizar el estado del pago', 500);
  }
  
  // Create audit log entry
  await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: 'UPDATE_PAYMENT',
    entity_type: 'PAYMENT',
    entity_id: registrationId,
    action_details: {
      previous_status: existingRegistration.payment_status,
      new_status: updateData.payment_status,
      payment_id: updateData.payment_id,
      player_name: existingRegistration.player_name,
      game_title: existingRegistration.games?.title,
    },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });
  
  // Send notification to player if payment was marked as received
  if (updateData.payment_status === 'paid' && existingRegistration.payment_status !== 'paid') {
    await supabase.from('notifications').insert({
      game_id: existingRegistration.game_id,
      player_phone: existingRegistration.player_phone,
      message_type: 'payment_request',
      message_content: `¡Pago confirmado! Tu pago para "${existingRegistration.games?.title}" ha sido recibido. ¡Gracias!`,
      delivery_status: 'pending',
    });
  }
  
  const response: PaymentResponse = {
    data: updatedRegistration,
    message: 'Estado del pago actualizado exitosamente',
  };
  
  return createApiResponse(response, 'Estado del pago actualizado exitosamente');
});