import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse, ValidationError } from '../types/api';
import type { ApiError } from '../types/api';

// Create ApiError class for instance checking
class ApiErrorClass extends Error implements ApiError {
  constructor(public message: string, public status: number, public code?: string, public details?: ValidationError[]) {
    super(message);
    this.name = 'ApiError';
  }
}

export { ApiErrorClass as ApiError };

/**
 * Creates a standardized API response
 */
export function createApiResponse<T>(
  data?: T,
  message?: string,
  success: boolean = true,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    data,
    message,
    success,
  };

  return NextResponse.json(response, { status });
}

/**
 * Creates a standardized API error response
 */
export function createApiError(
  error: string,
  status: number = 400,
  details?: ValidationError[]
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    error,
    ...(details && { details }),
  };

  return NextResponse.json(response, { status });
}

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { data: validatedData, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors: ValidationError[] = (error.errors || []).map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      return {
        data: null,
        error: createApiError('Datos de entrada inválidos', 400, validationErrors),
      };
    }
    
    return {
      data: null,
      error: createApiError('Error al procesar la solicitud', 400),
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    const params: Record<string, any> = {};
    
    for (const [key, value] of searchParams.entries()) {
      // Handle arrays (e.g., status[]=draft&status[]=open)
      if (key.endsWith('[]')) {
        const cleanKey = key.slice(0, -2);
        if (!params[cleanKey]) {
          params[cleanKey] = [];
        }
        params[cleanKey].push(value);
      } else {
        // Convert string numbers to numbers
        if (!isNaN(Number(value)) && value !== '') {
          params[key] = Number(value);
        } else if (value === 'true' || value === 'false') {
          params[key] = value === 'true';
        } else {
          params[key] = value;
        }
      }
    }
    
    const validatedData = schema.parse(params);
    return { data: validatedData, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors: ValidationError[] = (error.errors || []).map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      return {
        data: null,
        error: createApiError('Parámetros de consulta inválidos', 400, validationErrors),
      };
    }
    
    return {
      data: null,
      error: createApiError('Error al procesar los parámetros', 400),
    };
  }
}

/**
 * Extracts user information from authenticated request
 */
export function extractUserFromRequest(request: NextRequest): string | null {
  // This would be implemented based on your authentication system
  // For now, return a mock user ID (will be replaced with actual auth)
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  // In a real implementation, you would validate the token and extract user ID
  // For now, we'll use a placeholder
  return 'mock-user-id';
}

/**
 * Gets client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.ip;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return real || remote || 'unknown';
}

/**
 * Gets user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Creates pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasMore,
  };
}

/**
 * Handles async route errors consistently
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof ApiErrorClass) {
        return createApiError(error.message, error.status);
      }
      
      return createApiError('Error interno del servidor', 500);
    }
  };
}

/**
 * HTTP method validation middleware
 */
export function validateMethods(allowedMethods: string[]) {
  return (request: NextRequest): NextResponse | null => {
    if (!allowedMethods.includes(request.method)) {
      return createApiError(
        `Método ${request.method} no permitido`,
        405
      );
    }
    return null;
  };
}

/**
 * Generates a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Formats phone number to standard format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code for Argentina if not present
  if (cleaned.length === 10 && !cleaned.startsWith('54')) {
    return `54${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Calculates payment due date based on game date
 */
export function calculatePaymentDueDate(gameDate: string): Date {
  const game = new Date(gameDate);
  // Payment due 24 hours after the game
  return new Date(game.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Checks if payment is overdue
 */
export function isPaymentOverdue(gameDate: string, paymentStatus: string): boolean {
  if (paymentStatus === 'paid') return false;
  
  const dueDate = calculatePaymentDueDate(gameDate);
  return new Date() > dueDate;
}

/**
 * Calculates days overdue for payment
 */
export function getDaysOverdue(gameDate: string): number {
  const dueDate = calculatePaymentDueDate(gameDate);
  const now = new Date();
  
  if (now <= dueDate) return 0;
  
  const diffTime = now.getTime() - dueDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Builds SQL query filters
 */
export function buildSqlFilters<T extends Record<string, any>>(
  filters: T,
  columnMappings: Record<keyof T, string> = {}
): { where: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    
    const column = columnMappings[key] || key;
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${column} IN (${placeholders})`);
        params.push(...value);
      }
    } else if (typeof value === 'string' && key.includes('search')) {
      conditions.push(`${column} ILIKE $${paramIndex++}`);
      params.push(`%${value}%`);
    } else {
      conditions.push(`${column} = $${paramIndex++}`);
      params.push(value);
    }
  }
  
  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}