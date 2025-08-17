import { z } from 'zod';

// Login form validation schema
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, { message: 'El usuario es obligatorio' })
    .min(3, { message: 'El usuario debe tener al menos 3 caracteres' })
    .max(50, { message: 'El usuario es demasiado largo' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'El usuario solo puede contener letras, números, guiones y guiones bajos' }),
  password: z
    .string()
    .min(1, { message: 'La contraseña es obligatoria' })
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .max(128, { message: 'La contraseña es demasiado larga' }),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Custom error messages for specific authentication errors
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos. Inténtalo de nuevo.',
  ACCOUNT_LOCKED: 'Cuenta bloqueada temporalmente. Inténtalo en unos minutos.',
  RATE_LIMITED: 'Demasiados intentos de inicio de sesión. Espera 5 minutos antes de intentar de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión e inténtalo de nuevo.',
  SERVER_ERROR: 'Error del servidor. Inténtalo en unos minutos.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;