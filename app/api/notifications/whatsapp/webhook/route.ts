import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppService } from '../../../../../lib/services/whatsapp';
import { createApiResponse, createApiError } from '../../../../../lib/utils/api';
import { z } from 'zod';

// Rate limiting for webhook (high limit since Meta sends many requests)
const webhookCounts = new Map<string, { count: number; resetTime: number }>();
const WEBHOOK_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000 // High limit for webhook delivery
};

function checkWebhookRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - WEBHOOK_RATE_LIMIT.windowMs;
  
  const current = webhookCounts.get(ip);
  if (!current || current.resetTime < windowStart) {
    webhookCounts.set(ip, { count: 1, resetTime: now + WEBHOOK_RATE_LIMIT.windowMs });
    return true;
  }
  
  if (current.count >= WEBHOOK_RATE_LIMIT.maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Validation schema for webhook payload
const webhookStatusSchema = z.object({
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

const webhookPayloadSchema = z.object({
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          phone_number_id: z.string()
        }),
        statuses: z.array(webhookStatusSchema).optional()
      }),
      field: z.literal('messages')
    }))
  }))
});

/**
 * GET /api/notifications/whatsapp/webhook
 * Handle webhook verification from Meta
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (!mode || !token || !challenge) {
      return createApiError('Missing required webhook verification parameters', 400);
    }

    const whatsappService = createWhatsAppService();
    const verificationResult = whatsappService.verifyWebhook(mode, token, challenge);

    if (verificationResult) {
      // Return the challenge as plain text (Meta expects this format)
      return new NextResponse(verificationResult, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } else {
      return createApiError('Webhook verification failed', 403);
    }

  } catch (error) {
    console.error('Error in webhook verification:', error);
    return createApiError('Webhook verification error', 500);
  }
}

/**
 * POST /api/notifications/whatsapp/webhook
 * Handle WhatsApp delivery status updates
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    if (!checkWebhookRateLimit(ip)) {
      return createApiError('Rate limit exceeded', 429);
    }

    // Verify webhook signature (basic security check)
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      console.warn('Webhook received without signature from IP:', ip);
      return createApiError('Missing signature', 401);
    }

    // Parse request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return createApiError('Invalid JSON payload', 400);
    }

    // Validate payload structure
    const validation = webhookPayloadSchema.safeParse(body);
    if (!validation.success) {
      console.error('Invalid webhook payload:', validation.error.errors);
      return createApiError('Invalid webhook payload format', 400);
    }

    const payload = validation.data;

    // Process webhook
    const whatsappService = createWhatsAppService();
    await whatsappService.handleWebhook(payload);

    // Log webhook processing for monitoring
    const statusUpdates = payload.entry.reduce((count, entry) => {
      return count + entry.changes.reduce((changeCount, change) => {
        return changeCount + (change.value.statuses?.length || 0);
      }, 0);
    }, 0);

    if (statusUpdates > 0) {
      console.log(`Processed ${statusUpdates} status updates from WhatsApp webhook`);
    }

    // Meta expects a 200 OK response
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    
    // Still return 200 to prevent Meta from retrying on our internal errors
    return new NextResponse('Internal error', { status: 200 });
  }
}

/**
 * OPTIONS /api/notifications/whatsapp/webhook
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-hub-signature-256',
      'Access-Control-Max-Age': '86400',
    },
  });
}