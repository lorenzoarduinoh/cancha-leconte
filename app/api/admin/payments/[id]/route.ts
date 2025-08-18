import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../lib/supabase/types';
import { 
  createApiResponse, 
  createApiError, 
  validateRequestBody,
  withErrorHandling,
  getClientIP,
  getUserAgent
} from '../../../../../lib/utils/api';
import { 
  updatePaymentStatusSchema,
  uuidSchema
} from '../../../../../lib/validations/games';
import { 
  UpdatePaymentStatusData,
  PaymentResponse
} from '../../../../../lib/types/api';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/payments/[id] - Get payment details
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Validate registration ID
  const parseResult = uuidSchema.safeParse(params.id);
  if (!parseResult.success) {
    return createApiError('ID de registro inválido', 400);
  }
  
  const registrationId = parseResult.data;
  
  // Fetch payment details
  const { data: registration, error: registrationError } = await supabase
    .from('game_registrations')
    .select(`
      *,
      games(
        id,
        title,
        game_date,
        field_cost_per_player,
        created_by
      )
    `)
    .eq('id', registrationId)
    .single();
  
  if (registrationError) {
    if (registrationError.code === 'PGRST116') {
      return createApiError('Registro de pago no encontrado', 404);
    }
    console.error('Error fetching payment details:', registrationError);
    return createApiError('Error al obtener detalles del pago', 500);
  }
  
  const response: PaymentResponse = {
    data: registration,
  };
  
  return createApiResponse(response);
});

// PUT /api/admin/payments/[id] - Update payment status
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Validate registration ID
  const parseResult = uuidSchema.safeParse(params.id);
  if (!parseResult.success) {
    return createApiError('ID de registro inválido', 400);
  }
  
  const registrationId = parseResult.data;
  
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
      amount: existingRegistration.payment_amount,
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
  
  // Send payment reminder if marked as pending with overdue date
  if (updateData.payment_status === 'pending' && existingRegistration.games) {
    const gameDate = new Date(existingRegistration.games.game_date);
    const now = new Date();
    
    if (gameDate < now) {
      await supabase.from('notifications').insert({
        game_id: existingRegistration.game_id,
        player_phone: existingRegistration.player_phone,
        message_type: 'payment_reminder',
        message_content: `Recordatorio de pago: Tu pago para "${existingRegistration.games.title}" está pendiente. Por favor, realiza el pago lo antes posible.`,
        delivery_status: 'pending',
      });
    }
  }
  
  const response: PaymentResponse = {
    data: updatedRegistration,
    message: 'Estado del pago actualizado exitosamente',
  };
  
  return createApiResponse(response, 'Estado del pago actualizado exitosamente');
});