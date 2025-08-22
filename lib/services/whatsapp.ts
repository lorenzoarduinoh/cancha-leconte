import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';

/**
 * WhatsApp Business API Service
 * Handles sending template messages, webhook processing, and delivery tracking
 */

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  webhookUrl: string;
}

export interface WhatsAppSendRequest {
  registration_id: string;
  template_name: string;
  phone_number: string;
  template_params: Record<string, string>;
}

export interface WhatsAppSendResponse {
  success: boolean;
  message_id?: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface WhatsAppWebhookPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: { phone_number_id: string };
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
      field: 'messages';
    }>;
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  template_id: string;
  language_code: string;
  category: string;
  template_body: string;
  template_params: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private supabase: ReturnType<typeof createClient<Database>>;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig, supabaseUrl: string, supabaseServiceKey: string) {
    this.config = config;
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Send a template message via WhatsApp Business API
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<WhatsAppSendResponse> {
    try {
      // Get template information
      const template = await this.getTemplate(templateName);
      if (!template) {
        return {
          success: false,
          status: 'failed',
          error: `Template '${templateName}' not found`
        };
      }

      // Prepare message payload
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(phoneNumber),
        type: 'template',
        template: {
          name: template.template_id,
          language: { code: template.language_code },
          components: [{
            type: 'body',
            parameters: Object.values(params).map(value => ({
              type: 'text',
              text: value
            }))
          }]
        }
      };

      // Send to WhatsApp API
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok && data.messages) {
        return {
          success: true,
          message_id: data.messages[0].id,
          status: 'sent'
        };
      } else {
        console.error('WhatsApp API error:', data);
        return {
          success: false,
          status: 'failed',
          error: data.error?.message || 'Failed to send message'
        };
      }

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send template message with retry logic
   */
  async sendTemplateMessageWithRetry(
    phoneNumber: string,
    templateName: string,
    params: Record<string, string>,
    maxRetries: number = 3
  ): Promise<WhatsAppSendResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendTemplateMessage(phoneNumber, templateName, params);
        
        if (result.success) {
          return result;
        }
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(result.error)) {
          return result;
        }
        
        lastError = new Error(result.error);
        
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return {
      success: false,
      status: 'failed',
      error: lastError?.message || 'All retry attempts failed'
    };
  }

  /**
   * Handle WhatsApp webhook for delivery status updates
   */
  async handleWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    try {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.value.statuses) {
            for (const status of change.value.statuses) {
              await this.updateNotificationStatus(
                status.id,
                status.status,
                new Date(parseInt(status.timestamp) * 1000),
                status.errors
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (security)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Get template by name from database
   */
  private async getTemplate(templateName: string): Promise<WhatsAppTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('name', templateName)
        .eq('status', 'approved')
        .single();

      if (error || !data) {
        console.error('Template not found:', templateName, error);
        return null;
      }

      return data as WhatsAppTemplate;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    messageId: string,
    status: string,
    timestamp: Date,
    errors?: Array<{ code: number; title: string; message: string }>
  ): Promise<void> {
    try {
      const updateData: any = {
        delivery_status: status,
      };

      if (status === 'sent') {
        updateData.sent_at = timestamp.toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = timestamp.toISOString();
      }

      // Update notifications table
      const { error } = await this.supabase
        .from('notifications')
        .update(updateData)
        .eq('whatsapp_message_id', messageId);

      if (error) {
        console.error('Error updating notification status:', error);
      }

      // Also update registration notification status
      if (status === 'delivered' || status === 'read') {
        await this.supabase
          .from('game_registrations')
          .update({ notification_status: status })
          .in('id', 
            this.supabase
              .from('notifications')
              .select('registration_id')
              .eq('whatsapp_message_id', messageId)
          );
      }

    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  /**
   * Format phone number for WhatsApp API
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it doesn't start with country code, assume Argentina (+54)
    if (!cleaned.startsWith('54') && !cleaned.startsWith('1')) {
      return `54${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error?: string): boolean {
    if (!error) return false;
    
    const nonRetryablePatterns = [
      'invalid phone number',
      'template not found',
      'account suspended',
      'insufficient permissions',
      'invalid recipient',
      'template parameter mismatch'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a template in the database (for admin use)
   */
  async createTemplate(template: Omit<WhatsAppTemplate, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .insert(template)
        .select('id')
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        id: data.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all available templates
   */
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data as WhatsAppTemplate[];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  /**
   * Send a notification and track it
   */
  async sendNotificationWithTracking(request: WhatsAppSendRequest): Promise<WhatsAppSendResponse> {
    const result = await this.sendTemplateMessageWithRetry(
      request.phone_number,
      request.template_name,
      request.template_params
    );

    // Create notification record
    try {
      await this.supabase
        .from('notifications')
        .insert({
          game_id: '', // Will be filled from registration
          registration_id: request.registration_id,
          player_phone: request.phone_number,
          message_type: 'game_update',
          template_name: request.template_name,
          template_params: request.template_params,
          message_content: `WhatsApp template: ${request.template_name}`,
          whatsapp_message_id: result.message_id,
          delivery_status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null
        });
    } catch (error) {
      console.error('Error creating notification record:', error);
    }

    return result;
  }
}

// Factory function
export function createWhatsAppService(): WhatsAppService {
  const config: WhatsAppConfig = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/whatsapp/webhook`
  };

  return new WhatsAppService(
    config,
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Utility functions for WhatsApp operations
export const WhatsAppUtils = {
  /**
   * Format phone number for display
   */
  formatPhoneForDisplay: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('54')) {
      return `+${cleaned}`;
    }
    return `+54${cleaned}`;
  },

  /**
   * Validate Argentine phone number
   */
  isValidArgentinePhone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    const argentinePatterns = [
      /^(54)?9?11\d{8}$/, // Buenos Aires mobile
      /^(54)?9?\d{2,4}\d{7}$/, // Other provinces mobile
      /^(54)?11\d{8}$/, // Buenos Aires landline
      /^(54)?\d{2,4}\d{6,7}$/, // Other provinces landline
    ];
    return argentinePatterns.some(pattern => pattern.test(cleaned));
  },

  /**
   * Extract template parameters from text
   */
  extractTemplateParams: (template: string, values: Record<string, string>): string => {
    let result = template;
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }
};