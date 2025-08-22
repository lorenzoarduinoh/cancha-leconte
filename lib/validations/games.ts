import { z } from 'zod';
import { GAME_CONSTRAINTS } from '../types/game';

// Game validation schemas
export const createGameSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255, 'El título es demasiado largo'),
  description: z.string().max(1000, 'La descripción es demasiado larga').optional(),
  game_date: z.string().refine(date => {
    // Accept both datetime-local format and full ISO datetime
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?Z?)?$/.test(date);
  }, 'Fecha y hora inválidas'),
  min_players: z.number().int().min(1, 'Mínimo de jugadores debe ser al menos 1').max(50, 'Mínimo de jugadores muy alto'),
  max_players: z.number().int().min(1, 'Máximo de jugadores debe ser al menos 1').max(50, 'Máximo de jugadores muy alto'),
  field_cost_per_player: z.number().positive('El costo por jugador debe ser positivo').max(10000, 'Costo por jugador muy alto'),
  game_duration_minutes: z.number()
    .int('La duración debe ser un número entero')
    .min(GAME_CONSTRAINTS.MIN_DURATION, `La duración mínima es ${GAME_CONSTRAINTS.MIN_DURATION} minutos`)
    .max(GAME_CONSTRAINTS.MAX_DURATION, `La duración máxima es ${GAME_CONSTRAINTS.MAX_DURATION} minutos`)
    .optional()
    .default(GAME_CONSTRAINTS.DEFAULT_DURATION),
  team_a_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo A no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .optional()
    .default(GAME_CONSTRAINTS.DEFAULT_TEAM_A_NAME),
  team_b_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo B no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .optional()
    .default(GAME_CONSTRAINTS.DEFAULT_TEAM_B_NAME),
  // Allow but ignore additional fields like status
  status: z.any().optional(),
}).refine(data => data.max_players >= data.min_players, {
  message: 'El máximo de jugadores debe ser mayor o igual al mínimo',
  path: ['max_players'],
}).refine(data => {
  // Convert datetime-local format to proper ISO if needed
  let dateString = data.game_date;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateString)) {
    dateString = dateString + ':00'; // Add seconds for proper parsing
  }
  const gameDate = new Date(dateString);
  const now = new Date();
  return gameDate > now;
}, {
  message: 'La fecha del partido debe ser en el futuro',
  path: ['game_date'],
}).refine(data => {
  // Ensure team names are different
  const teamAName = data.team_a_name || GAME_CONSTRAINTS.DEFAULT_TEAM_A_NAME;
  const teamBName = data.team_b_name || GAME_CONSTRAINTS.DEFAULT_TEAM_B_NAME;
  return teamAName.trim() !== teamBName.trim();
}, {
  message: 'Los nombres de los equipos deben ser diferentes',
  path: ['team_b_name'],
});

export const gameStatusSchema = z.enum(['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled']);

// Create update schema without defaults to prevent overriding existing values
export const updateGameSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255, 'El título es demasiado largo').optional(),
  description: z.string().max(1000, 'La descripción es demasiado larga').optional(),
  game_date: z.string().refine(date => {
    // Accept both datetime-local format and full ISO datetime
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?Z?)?$/.test(date);
  }, 'Fecha y hora inválidas').optional(),
  min_players: z.number().int().min(1, 'Mínimo de jugadores debe ser al menos 1').max(50, 'Mínimo de jugadores muy alto').optional(),
  max_players: z.number().int().min(1, 'Máximo de jugadores debe ser al menos 1').max(50, 'Máximo de jugadores muy alto').optional(),
  field_cost_per_player: z.number().positive('El costo por jugador debe ser positivo').max(10000, 'Costo por jugador muy alto').optional(),
  game_duration_minutes: z.number()
    .int('La duración debe ser un número entero')
    .min(GAME_CONSTRAINTS.MIN_DURATION, `La duración mínima es ${GAME_CONSTRAINTS.MIN_DURATION} minutos`)
    .max(GAME_CONSTRAINTS.MAX_DURATION, `La duración máxima es ${GAME_CONSTRAINTS.MAX_DURATION} minutos`)
    .optional(),
  // Team names without defaults - only update if explicitly provided
  team_a_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo A no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .optional(),
  team_b_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo B no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .optional(),
  status: gameStatusSchema.optional(),
}).refine(data => {
  // Only validate max >= min if both are provided
  if (data.max_players !== undefined && data.min_players !== undefined) {
    return data.max_players >= data.min_players;
  }
  return true;
}, {
  message: 'El máximo de jugadores debe ser mayor o igual al mínimo',
  path: ['max_players'],
}).refine(data => {
  // Only validate date if provided
  if (data.game_date) {
    // Convert datetime-local format to proper ISO if needed
    let dateString = data.game_date;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateString)) {
      dateString = dateString + ':00'; // Add seconds for proper parsing
    }
    const gameDate = new Date(dateString);
    const now = new Date();
    return gameDate > now;
  }
  return true;
}, {
  message: 'La fecha del partido debe ser en el futuro',
  path: ['game_date'],
}).refine(data => {
  // Only validate team names if both are provided
  if (data.team_a_name && data.team_b_name) {
    return data.team_a_name.trim() !== data.team_b_name.trim();
  }
  return true;
}, {
  message: 'Los nombres de los equipos deben ser diferentes',
  path: ['team_b_name'],
});

export const updateGameStatusSchema = z.object({
  status: gameStatusSchema,
});

// Registration validation schemas
export const registerPlayerSchema = z.object({
  player_name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es demasiado largo')
    .refine(name => name.trim().length >= 2, {
      message: 'El nombre debe tener al menos 2 caracteres válidos'
    })
    .refine(name => /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(name.trim()), {
      message: 'El nombre solo puede contener letras y espacios'
    }),
  player_phone: z.string()
    .min(10, 'El número de teléfono debe tener al menos 10 dígitos')
    .max(20, 'El número de teléfono es demasiado largo')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido')
    .refine(phone => {
      // Argentina phone number validation (more specific)
      const argentinePatterns = [
        /^(\+54|54)?9?11\d{8}$/, // Buenos Aires mobile
        /^(\+54|54)?9?\d{2,4}\d{7}$/, // Other provinces mobile
        /^(\+54|54)?11\d{8}$/, // Buenos Aires landline
        /^(\+54|54)?\d{2,4}\d{6,7}$/, // Other provinces landline
      ];
      return argentinePatterns.some(pattern => pattern.test(phone.replace(/\s|-/g, '')));
    }, {
      message: 'Ingresa un número de teléfono argentino válido'
    }),
});

// Friend registration specific schemas
export const friendRegistrationSchema = registerPlayerSchema.extend({
  accept_terms: z.boolean().optional().default(true),
});

export const cancelRegistrationSchema = z.object({
  phone: z.string()
    .min(10, 'El número de teléfono es requerido')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido'),
  reason: z.string().max(500, 'El motivo es demasiado largo').optional(),
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

// Team names validation schemas
export const teamNamesSchema = z.object({
  team_a_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo A no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .refine(name => !/^\s+$/.test(name), {
      message: 'El nombre del equipo A no puede ser solo espacios en blanco'
    }),
  team_b_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo B no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .refine(name => !/^\s+$/.test(name), {
      message: 'El nombre del equipo B no puede ser solo espacios en blanco'
    }),
}).refine(data => {
  // Ensure team names are different (case-insensitive comparison)
  const teamAName = data.team_a_name.trim().toLowerCase();
  const teamBName = data.team_b_name.trim().toLowerCase();
  return teamAName !== teamBName;
}, {
  message: 'Los nombres de los equipos deben ser diferentes',
  path: ['team_b_name'],
});

export const updateTeamNamesSchema = z.object({
  team_a_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo A no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo A debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .refine(name => !/^\s+$/.test(name), {
      message: 'El nombre del equipo A no puede ser solo espacios en blanco'
    })
    .optional(),
  team_b_name: z.string()
    .min(GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres`)
    .max(GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH, `El nombre del equipo B no puede exceder ${GAME_CONSTRAINTS.MAX_TEAM_NAME_LENGTH} caracteres`)
    .refine(name => name.trim().length >= GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH, {
      message: `El nombre del equipo B debe tener al menos ${GAME_CONSTRAINTS.MIN_TEAM_NAME_LENGTH} caracteres válidos`
    })
    .refine(name => !/^\s+$/.test(name), {
      message: 'El nombre del equipo B no puede ser solo espacios en blanco'
    })
    .optional(),
}).refine(data => {
  // Only validate if both names are provided
  if (data.team_a_name && data.team_b_name) {
    const teamAName = data.team_a_name.trim().toLowerCase();
    const teamBName = data.team_b_name.trim().toLowerCase();
    return teamAName !== teamBName;
  }
  return true;
}, {
  message: 'Los nombres de los equipos deben ser diferentes',
  path: ['team_b_name'],
});

// UUID validation helper
export const uuidSchema = z.string().uuid('ID inválido');

// Token validation (for share tokens)
export const shareTokenSchema = z.string().min(20, 'Token inválido').max(255, 'Token inválido');

// Personal registration management schemas
export const personalRegistrationTokenSchema = z.object({
  registration_token: z.string()
    .length(64, 'Invalid token format')
    .regex(/^[0-9a-f]+$/, 'Invalid token characters')
});

export const personalCancellationSchema = z.object({
  reason: z.string()
    .max(500, 'El motivo es demasiado largo')
    .optional(),
  confirm: z.boolean()
    .refine(val => val === true, 'Confirmación requerida para cancelar')
});

// WhatsApp template validation schemas
export const whatsappTemplateSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es demasiado largo')
    .regex(/^[a-z_]+$/, 'Solo minúsculas y guiones bajos permitidos'),
  template_id: z.string()
    .min(1, 'El ID de template es requerido')
    .max(255, 'El ID de template es demasiado largo'),
  language_code: z.string()
    .length(2, 'Código de idioma debe ser de 2 caracteres')
    .default('es'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  template_body: z.string()
    .min(1, 'El cuerpo del template es requerido')
    .max(1000, 'El cuerpo del template es demasiado largo'),
  template_params: z.record(z.string()).optional(),
});

export const whatsappSendSchema = z.object({
  registration_id: z.string().uuid('ID de registro inválido'),
  template_name: z.string()
    .min(1, 'Nombre de template requerido')
    .max(100, 'Nombre de template demasiado largo'),
  phone_number: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido'),
  template_params: z.record(z.string()),
});

// Webhook validation schemas
export const whatsappWebhookStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  timestamp: z.string(),
  recipient_id: z.string(),
  errors: z.array(z.object({
    code: z.number(),
    title: z.string(),
    message: z.string()
  })).optional()
});

export const whatsappWebhookSchema = z.object({
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          phone_number_id: z.string()
        }),
        statuses: z.array(whatsappWebhookStatusSchema).optional()
      }),
      field: z.literal('messages')
    }))
  }))
});

// Rate limiting validation schema
export const rateLimitSchema = z.object({
  ip: z.string().min(1, 'IP address requerida'),
  window_ms: z.number().int().min(1000).max(3600000), // 1 second to 1 hour
  max_requests: z.number().int().min(1).max(10000),
});

// Type exports
export type CreateGameData = z.infer<typeof createGameSchema>;
export type UpdateGameData = z.infer<typeof updateGameSchema>;
export type RegisterPlayerData = z.infer<typeof registerPlayerSchema>;
export type FriendRegistrationData = z.infer<typeof friendRegistrationSchema>;
export type CancelRegistrationData = z.infer<typeof cancelRegistrationSchema>;
export type TeamAssignmentData = z.infer<typeof teamAssignmentSchema>;
export type RecordResultData = z.infer<typeof recordResultSchema>;
export type UpdatePaymentStatusData = z.infer<typeof updatePaymentStatusSchema>;
export type SendNotificationData = z.infer<typeof sendNotificationSchema>;
export type GameFiltersData = z.infer<typeof gameFiltersSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
export type PlayerFiltersData = z.infer<typeof playerFiltersSchema>;
export type AnalyticsParamsData = z.infer<typeof analyticsParamsSchema>;

// Team names type exports
export type TeamNamesData = z.infer<typeof teamNamesSchema>;
export type UpdateTeamNamesData = z.infer<typeof updateTeamNamesSchema>;

// WhatsApp-related type exports
export type PersonalRegistrationTokenData = z.infer<typeof personalRegistrationTokenSchema>;
export type PersonalCancellationData = z.infer<typeof personalCancellationSchema>;
export type WhatsAppTemplateData = z.infer<typeof whatsappTemplateSchema>;
export type WhatsAppSendData = z.infer<typeof whatsappSendSchema>;
export type WhatsAppWebhookData = z.infer<typeof whatsappWebhookSchema>;
export type RateLimitData = z.infer<typeof rateLimitSchema>;