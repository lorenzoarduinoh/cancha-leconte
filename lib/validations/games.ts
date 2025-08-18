import { z } from 'zod';

// Game validation schemas
export const createGameSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255, 'El título es demasiado largo'),
  description: z.string().max(1000, 'La descripción es demasiado larga').optional(),
  game_date: z.string().datetime('Fecha y hora inválidas'),
  min_players: z.number().int().min(1, 'Mínimo de jugadores debe ser al menos 1').max(50, 'Mínimo de jugadores muy alto'),
  max_players: z.number().int().min(1, 'Máximo de jugadores debe ser al menos 1').max(50, 'Máximo de jugadores muy alto'),
  field_cost_per_player: z.number().positive('El costo por jugador debe ser positivo').max(10000, 'Costo por jugador muy alto'),
}).refine(data => data.max_players >= data.min_players, {
  message: 'El máximo de jugadores debe ser mayor o igual al mínimo',
  path: ['max_players'],
}).refine(data => {
  const gameDate = new Date(data.game_date);
  const now = new Date();
  return gameDate > now;
}, {
  message: 'La fecha del partido debe ser en el futuro',
  path: ['game_date'],
});

export const updateGameSchema = createGameSchema.partial();

export const gameStatusSchema = z.enum(['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled']);

export const updateGameStatusSchema = z.object({
  status: gameStatusSchema,
});

// Registration validation schemas
export const registerPlayerSchema = z.object({
  player_name: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es demasiado largo'),
  player_phone: z.string()
    .min(10, 'El número de teléfono debe tener al menos 10 dígitos')
    .max(20, 'El número de teléfono es demasiado largo')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido'),
});

export const teamAssignmentSchema = z.object({
  method: z.enum(['random', 'manual']),
  manual_assignments: z.record(z.string(), z.enum(['team_a', 'team_b'])).optional(),
}).refine(data => {
  if (data.method === 'manual' && !data.manual_assignments) {
    return false;
  }
  return true;
}, {
  message: 'Asignaciones manuales requeridas cuando el método es manual',
  path: ['manual_assignments'],
});

// Results validation schemas
export const recordResultSchema = z.object({
  team_a_score: z.number().int().min(0, 'El puntaje no puede ser negativo').max(100, 'Puntaje muy alto'),
  team_b_score: z.number().int().min(0, 'El puntaje no puede ser negativo').max(100, 'Puntaje muy alto'),
  notes: z.string().max(1000, 'Las notas son demasiado largas').optional(),
});

// Payment validation schemas
export const updatePaymentStatusSchema = z.object({
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  payment_id: z.string().optional(),
  paid_at: z.string().datetime().optional(),
});

// Notification validation schemas
export const sendNotificationSchema = z.object({
  message_type: z.enum(['game_reminder', 'payment_request', 'payment_reminder', 'game_update', 'game_cancelled']),
  message_content: z.string().min(1, 'El contenido del mensaje es requerido').max(1000, 'El mensaje es demasiado largo'),
  recipients: z.array(z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido')).min(1, 'Al menos un destinatario es requerido'),
  game_id: z.string().uuid().optional(),
  scheduled_for: z.string().datetime().optional(),
});

// Query validation schemas
export const gameFiltersSchema = z.object({
  status: z.array(gameStatusSchema).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  created_by: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
}).refine(data => {
  if (data.date_from && data.date_to) {
    return new Date(data.date_from) <= new Date(data.date_to);
  }
  return true;
}, {
  message: 'La fecha de inicio debe ser anterior a la fecha de fin',
  path: ['date_to'],
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const playerFiltersSchema = z.object({
  phone: z.string().optional(),
  name: z.string().optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  game_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export const analyticsParamsSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'La fecha de inicio debe ser anterior a la fecha de fin',
  path: ['end_date'],
});

// UUID validation helper
export const uuidSchema = z.string().uuid('ID inválido');

// Token validation (for share tokens)
export const shareTokenSchema = z.string().min(20, 'Token inválido').max(255, 'Token inválido');

// Type exports
export type CreateGameData = z.infer<typeof createGameSchema>;
export type UpdateGameData = z.infer<typeof updateGameSchema>;
export type RegisterPlayerData = z.infer<typeof registerPlayerSchema>;
export type TeamAssignmentData = z.infer<typeof teamAssignmentSchema>;
export type RecordResultData = z.infer<typeof recordResultSchema>;
export type UpdatePaymentStatusData = z.infer<typeof updatePaymentStatusSchema>;
export type SendNotificationData = z.infer<typeof sendNotificationSchema>;
export type GameFiltersData = z.infer<typeof gameFiltersSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
export type PlayerFiltersData = z.infer<typeof playerFiltersSchema>;
export type AnalyticsParamsData = z.infer<typeof analyticsParamsSchema>;