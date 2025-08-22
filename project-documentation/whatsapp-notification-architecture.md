# WhatsApp Notification System - Technical Architecture

## Executive Summary

This document provides a comprehensive technical architecture for implementing a WhatsApp notification system within the existing Friend Registration System. The system will automatically notify players upon registration and provide personal management links for secure access to registration details and cancellation functionality.

### Key Features
- Automatic WhatsApp notifications upon player registration
- Personal registration management with unique secure tokens
- Cancellation functionality without requiring user accounts
- Integration with existing Supabase infrastructure
- WhatsApp Business Cloud API integration
- Real-time notification delivery tracking

### Technology Stack Integration
- **Frontend**: Next.js 15.4.6 with TypeScript
- **Backend**: Supabase PostgreSQL with Next.js API routes
- **WhatsApp Service**: Meta WhatsApp Business Cloud API
- **Security**: Token-based access with rate limiting
- **Deployment**: Vercel with environment-specific configurations

---

## System Architecture Overview

### Current System Context
The existing Friend Registration System provides:
- Game creation and management at `/juego/[token]`
- Player registration with name and WhatsApp number
- Real-time updates and waiting list management
- Payment tracking and team assignment

### New System Components
1. **WhatsApp Notification Service** - Automated message delivery
2. **Personal Registration Management** - Token-based access to registration details
3. **Registration Token System** - Secure individual registration access
4. **Notification Delivery Tracking** - Status monitoring and retry logic

---

## Database Schema Changes

### 1. Enhanced game_registrations Table

```sql
-- Add new columns to existing game_registrations table
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS registration_token VARCHAR(255) UNIQUE;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS notification_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (notification_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE game_registrations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Create index for registration token lookups
CREATE INDEX IF NOT EXISTS idx_registrations_token ON game_registrations(registration_token);
```

### 2. Enhanced notifications Table

The existing notifications table will be extended:

```sql
-- Add new columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES game_registrations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_params JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_registration_id ON notifications(registration_id);
CREATE INDEX IF NOT EXISTS idx_notifications_next_retry ON notifications(next_retry_at);
```

### 3. New whatsapp_templates Table

```sql
-- Create WhatsApp message templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    template_id VARCHAR(255) NOT NULL, -- WhatsApp template ID
    language_code VARCHAR(10) DEFAULT 'es' NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    template_body TEXT NOT NULL,
    template_params JSONB, -- Parameter definitions
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO whatsapp_templates (name, template_id, category, template_body, template_params) VALUES
('registration_confirmation', 'cancha_leconte_registration', 'UTILITY', 
 '¡Hola {{1}}! Te registraste exitosamente para "{{2}}" el {{3}}. Gestiona tu inscripción: {{4}}', 
 '{"1": "player_name", "2": "game_title", "3": "game_date", "4": "management_url"}'),
('waiting_list_notification', 'cancha_leconte_waiting_list', 'UTILITY',
 '¡Hola {{1}}! Estás en lista de espera (#{{2}}) para "{{3}}". Te notificaremos si se libera lugar: {{4}}',
 '{"1": "player_name", "2": "position", "3": "game_title", "4": "management_url"}'),
('game_reminder', 'cancha_leconte_reminder', 'UTILITY',
 '¡Hola {{1}}! Recordatorio: "{{2}}" es en 1 hora ({{3}}). Ubicación: {{4}}',
 '{"1": "player_name", "2": "game_title", "3": "game_time", "4": "location"}');
```

---

## API Contract Specifications

### 1. WhatsApp Service Endpoints

#### POST /api/notifications/whatsapp/send
```typescript
interface WhatsAppSendRequest {
  registration_id: string;
  template_name: string;
  phone_number: string;
  template_params: Record<string, string>;
}

interface WhatsAppSendResponse {
  success: boolean;
  message_id?: string;
  status: 'sent' | 'failed';
  error?: string;
}
```

#### POST /api/notifications/whatsapp/webhook
```typescript
interface WhatsAppWebhookPayload {
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
        }>;
      };
      field: 'messages';
    }>;
  }>;
}
```

### 2. Personal Registration Management Endpoints

#### GET /api/mi-registro/[registration_token]
```typescript
interface PersonalRegistrationResponse {
  success: boolean;
  data?: {
    registration: {
      id: string;
      player_name: string;
      player_phone: string;
      registered_at: string;
      payment_status: string;
      team_assignment: string | null;
    };
    game: {
      id: string;
      title: string;
      description: string | null;
      game_date: string;
      location: string;
      field_cost_per_player: number;
      status: string;
      current_players: number;
      max_players: number;
    };
    status: {
      is_confirmed: boolean;
      is_waiting_list: boolean;
      waiting_list_position?: number;
      can_cancel: boolean;
      time_until_game: {
        hours: number;
        minutes: number;
        display: string;
      };
    };
  };
  message: string;
  error?: string;
}
```

#### POST /api/mi-registro/[registration_token]/cancel
```typescript
interface CancelRegistrationRequest {
  reason?: string;
  confirm: boolean;
}

interface CancelRegistrationResponse {
  success: boolean;
  message: string;
  refund_info?: {
    amount: number;
    method: string;
    estimated_days: number;
  };
  error?: string;
}
```

### 3. Registration Token Generation

#### Function: generateRegistrationToken()
```typescript
export function generateRegistrationToken(): string {
  return encode(gen_random_bytes(32), 'base64url');
}
```

---

## WhatsApp Business Cloud API Integration

### 1. Service Configuration

```typescript
interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  webhookUrl: string;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }
}
```

### 2. Message Templates and Sending

```typescript
export class WhatsAppService {
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<WhatsAppSendResponse> {
    const template = await this.getTemplate(templateName);
    
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
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
    
    if (response.ok) {
      return {
        success: true,
        message_id: data.messages[0].id,
        status: 'sent'
      };
    } else {
      return {
        success: false,
        status: 'failed',
        error: data.error?.message || 'Failed to send message'
      };
    }
  }
}
```

### 3. Webhook Handling

```typescript
export async function handleWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.value.statuses) {
        for (const status of change.value.statuses) {
          await updateNotificationStatus(status.id, status.status, new Date(parseInt(status.timestamp) * 1000));
        }
      }
    }
  }
}
```

---

## Security Architecture

### 1. Registration Token Security

```typescript
export interface TokenSecurity {
  // Token generation using cryptographically secure random bytes
  generateToken(): string;
  
  // Token validation
  validateToken(token: string): boolean;
  
  // Token expiration (optional - for enhanced security)
  isTokenExpired(token: string, maxAge: number): boolean;
}

export class RegistrationTokenService implements TokenSecurity {
  generateToken(): string {
    // Generate 32 bytes of random data, base64url encoded
    return crypto.randomBytes(32).toString('base64url');
  }

  validateToken(token: string): boolean {
    // Basic format validation
    return /^[A-Za-z0-9_-]{43}$/.test(token);
  }

  isTokenExpired(createdAt: string, maxAgeHours: number = 168): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const ageHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return ageHours > maxAgeHours;
  }
}
```

### 2. Rate Limiting

```typescript
export const rateLimitConfig = {
  // Personal registration page access
  registration_access: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes per IP
  },
  
  // Cancellation requests
  cancellation_requests: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 cancellation attempts per hour per IP
  },
  
  // WhatsApp webhook
  whatsapp_webhook: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // High limit for webhook delivery
  }
};
```

### 3. Input Validation

```typescript
export const personalRegistrationSchemas = {
  tokenValidation: z.object({
    registration_token: z.string()
      .length(43, 'Invalid token format')
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid token characters')
  }),
  
  cancellationRequest: z.object({
    reason: z.string().max(500, 'Reason too long').optional(),
    confirm: z.boolean().refine(val => val === true, 'Confirmation required')
  })
};
```

---

## Component Architecture

### 1. Personal Registration Management Page

#### Route: /mi-registro/[registration_token]/page.tsx

```typescript
interface PersonalRegistrationPageProps {
  params: Promise<{ registration_token: string }>;
}

export default async function PersonalRegistrationPage({ params }: PersonalRegistrationPageProps) {
  const { registration_token } = await params;
  
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="container mx-auto px-4 py-8">
        <ErrorBoundary fallback={<PersonalRegistrationError />}>
          <PersonalRegistrationInterface token={registration_token} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
```

#### Component: PersonalRegistrationInterface

```typescript
export interface PersonalRegistrationInterfaceProps {
  token: string;
}

export function PersonalRegistrationInterface({ token }: PersonalRegistrationInterfaceProps) {
  const [registrationData, setRegistrationData] = useState<PersonalRegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => fetchRegistrationData()} />}
      {registrationData && (
        <>
          <RegistrationHeader data={registrationData} />
          <GameInformation game={registrationData.game} />
          <RegistrationStatus status={registrationData.status} />
          <PaymentInformation registration={registrationData.registration} />
          {registrationData.status.can_cancel && (
            <CancellationSection token={token} onCancel={handleCancellation} />
          )}
        </>
      )}
    </div>
  );
}
```

#### Component: CancellationSection

```typescript
interface CancellationSectionProps {
  token: string;
  onCancel: (reason?: string) => Promise<void>;
}

export function CancellationSection({ token, onCancel }: CancellationSectionProps) {
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCancellation = async () => {
    setIsProcessing(true);
    try {
      await onCancel(cancellationReason);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center text-red-600">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Cancelar Inscripción
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!showCancellationForm ? (
          <Button 
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setShowCancellationForm(true)}
          >
            Cancelar mi inscripción
          </Button>
        ) : (
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo de cancelación (opcional)"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              maxLength={500}
            />
            <div className="flex space-x-3">
              <Button
                variant="destructive"
                onClick={handleCancellation}
                disabled={isProcessing}
              >
                {isProcessing ? 'Cancelando...' : 'Confirmar Cancelación'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancellationForm(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2. WhatsApp Integration Components

#### Service: Enhanced Registration Service

```typescript
export class EnhancedFriendRegistrationService extends FriendRegistrationService {
  private whatsAppService: WhatsAppService;
  private tokenService: RegistrationTokenService;

  constructor(config: FriendRegistrationServiceConfig & { whatsapp: WhatsAppConfig }) {
    super(config);
    this.whatsAppService = new WhatsAppService(config.whatsapp);
    this.tokenService = new RegistrationTokenService();
  }

  async registerFriend(
    shareToken: string,
    registrationData: FriendRegistrationRequest,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<FriendRegistrationResponse> {
    // Call parent registration method
    const result = await super.registerFriend(shareToken, registrationData, clientInfo);
    
    if (result.success && result.data) {
      // Generate registration token
      const registrationToken = this.tokenService.generateToken();
      
      // Update registration with token
      await this.supabase
        .from('game_registrations')
        .update({ registration_token: registrationToken })
        .eq('id', result.data.id);

      // Send WhatsApp notification
      await this.sendRegistrationNotification(result.data, registrationToken, result.game_full);
    }

    return result;
  }

  private async sendRegistrationNotification(
    registration: GameRegistration,
    token: string,
    isWaitingList: boolean
  ): Promise<void> {
    const managementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mi-registro/${token}`;
    
    const templateName = isWaitingList ? 'waiting_list_notification' : 'registration_confirmation';
    
    try {
      const result = await this.whatsAppService.sendTemplateMessage(
        registration.player_phone,
        templateName,
        {
          player_name: registration.player_name,
          game_title: result.confirmation_details?.game_title || '',
          game_date: new Date(result.confirmation_details?.game_date || '').toLocaleDateString('es-AR'),
          management_url: managementUrl,
          ...(isWaitingList && { position: result.waiting_list_position?.toString() || '0' })
        }
      );

      // Update notification status
      await this.supabase
        .from('game_registrations')
        .update({
          notification_sent_at: new Date().toISOString(),
          notification_status: result.success ? 'sent' : 'failed'
        })
        .eq('id', registration.id);

      // Create notification record
      await this.supabase
        .from('notifications')
        .insert({
          game_id: registration.game_id,
          registration_id: registration.id,
          player_phone: registration.player_phone,
          message_type: 'registration_confirmation',
          template_name: templateName,
          message_content: `WhatsApp template: ${templateName}`,
          whatsapp_message_id: result.message_id,
          delivery_status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null
        });

    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      
      // Update notification status as failed
      await this.supabase
        .from('game_registrations')
        .update({
          notification_status: 'failed'
        })
        .eq('id', registration.id);
    }
  }
}
```

---

## Error Handling and Resilience

### 1. WhatsApp Service Error Handling

```typescript
export class WhatsAppService {
  private async sendWithRetry(
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

  private isNonRetryableError(error?: string): boolean {
    if (!error) return false;
    
    const nonRetryablePatterns = [
      'invalid phone number',
      'template not found',
      'account suspended',
      'insufficient permissions'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. Notification Retry System

```typescript
export class NotificationRetryService {
  constructor(private supabase: SupabaseClient, private whatsAppService: WhatsAppService) {}

  async processFailedNotifications(): Promise<void> {
    const { data: failedNotifications } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('delivery_status', 'failed')
      .lt('retry_count', 3)
      .lte('next_retry_at', new Date().toISOString());

    for (const notification of failedNotifications || []) {
      await this.retryNotification(notification);
    }
  }

  private async retryNotification(notification: NotificationRow): Promise<void> {
    try {
      const result = await this.whatsAppService.sendTemplateMessage(
        notification.player_phone,
        notification.template_name || 'registration_confirmation',
        JSON.parse(notification.template_params || '{}')
      );

      const nextRetryAt = result.success 
        ? null 
        : new Date(Date.now() + Math.pow(2, notification.retry_count + 1) * 60000); // Exponential backoff in minutes

      await this.supabase
        .from('notifications')
        .update({
          delivery_status: result.success ? 'sent' : 'failed',
          retry_count: notification.retry_count + 1,
          next_retry_at: nextRetryAt?.toISOString(),
          whatsapp_message_id: result.message_id || notification.whatsapp_message_id,
          sent_at: result.success ? new Date().toISOString() : notification.sent_at
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error retrying notification:', error);
    }
  }
}
```

---

## Implementation Plan

### Phase 1: Database and Core Infrastructure (Week 1)

**Priority: HIGH**

1. **Database Schema Updates**
   - Execute migration scripts for enhanced tables
   - Add registration tokens, notification tracking
   - Create WhatsApp templates table
   - Update indexes for performance

2. **Registration Token System**
   - Implement token generation service
   - Add token validation middleware
   - Update registration flow to generate tokens

3. **Enhanced Registration Service**
   - Extend existing FriendRegistrationService
   - Add token generation to registration process
   - Implement token-based access methods

### Phase 2: WhatsApp Integration (Week 2)

**Priority: HIGH**

1. **WhatsApp Business API Setup**
   - Business verification process
   - Configure webhook endpoints
   - Template approval process

2. **WhatsApp Service Implementation**
   - Create WhatsAppService class
   - Implement template message sending
   - Add webhook handling for delivery status

3. **Integration with Registration Flow**
   - Automatic notification sending
   - Delivery status tracking
   - Error handling and retry logic

### Phase 3: Personal Management Interface (Week 2-3)

**Priority: MEDIUM**

1. **API Endpoints**
   - `/api/mi-registro/[token]` - Registration details
   - `/api/mi-registro/[token]/cancel` - Cancellation
   - Security and rate limiting implementation

2. **Frontend Components**
   - Personal registration page
   - Registration details display
   - Cancellation interface

3. **User Experience**
   - Mobile-first responsive design
   - Loading states and error handling
   - Accessibility compliance

### Phase 4: Testing and Monitoring (Week 3-4)

**Priority: HIGH**

1. **Testing Strategy**
   - Unit tests for WhatsApp service
   - Integration tests for notification flow
   - End-to-end testing of complete flow

2. **Monitoring and Analytics**
   - Notification delivery tracking
   - Failed message monitoring
   - Personal page access analytics

3. **Error Handling**
   - Retry mechanisms
   - Fallback notifications
   - Admin notification dashboard

### Phase 5: Production Deployment and Optimization (Week 4)

**Priority: MEDIUM**

1. **Environment Configuration**
   - Production WhatsApp Business account
   - Environment variables management
   - SSL certificate and security headers

2. **Performance Optimization**
   - Database query optimization
   - Caching strategies
   - Rate limiting fine-tuning

3. **Documentation and Training**
   - Admin user documentation
   - Troubleshooting guides
   - System monitoring setup

---

## Testing Strategy

### 1. Unit Testing

```typescript
// WhatsApp Service Tests
describe('WhatsAppService', () => {
  it('should send template message successfully', async () => {
    const service = new WhatsAppService(mockConfig);
    const result = await service.sendTemplateMessage('+5491123456789', 'registration_confirmation', {
      player_name: 'Juan Pérez',
      game_title: 'Partido Amistoso',
      game_date: '15/08/2025',
      management_url: 'https://app.com/mi-registro/abc123'
    });
    
    expect(result.success).toBe(true);
    expect(result.message_id).toBeDefined();
  });
});

// Token Service Tests
describe('RegistrationTokenService', () => {
  it('should generate valid tokens', () => {
    const service = new RegistrationTokenService();
    const token = service.generateToken();
    
    expect(token).toHaveLength(43);
    expect(service.validateToken(token)).toBe(true);
  });
});
```

### 2. Integration Testing

```typescript
// Registration Flow with Notifications
describe('Enhanced Registration Flow', () => {
  it('should register player and send WhatsApp notification', async () => {
    const service = createEnhancedFriendRegistrationService();
    
    const result = await service.registerFriend('game_token_123', {
      player_name: 'Juan Pérez',
      player_phone: '+5491123456789'
    });
    
    expect(result.success).toBe(true);
    expect(result.data?.registration_token).toBeDefined();
    
    // Verify notification was scheduled
    const notification = await getNotificationByRegistrationId(result.data.id);
    expect(notification.delivery_status).toBe('sent');
  });
});
```

### 3. End-to-End Testing

```typescript
// Complete User Journey
describe('Complete WhatsApp Notification Flow', () => {
  it('should complete full registration and management flow', async () => {
    // 1. Player registers for game
    const registrationResult = await registerPlayer({
      gameToken: 'test_game_token',
      playerName: 'Juan Pérez',
      playerPhone: '+5491123456789'
    });
    
    // 2. Verify WhatsApp notification sent
    await waitForNotificationDelivery(registrationResult.data.id);
    
    // 3. Access personal management page
    const managementData = await getPersonalRegistration(registrationResult.data.registration_token);
    expect(managementData.success).toBe(true);
    
    // 4. Cancel registration
    const cancellationResult = await cancelRegistration(registrationResult.data.registration_token, 'Change of plans');
    expect(cancellationResult.success).toBe(true);
    
    // 5. Verify cancellation notification sent
    await waitForCancellationNotification(registrationResult.data.id);
  });
});
```

---

## Security Considerations

### 1. Data Protection
- **Registration tokens**: Cryptographically secure, 32-byte random values
- **Phone number privacy**: Hash phone numbers for analytics while preserving functionality
- **Message content**: No sensitive data in WhatsApp messages beyond necessary information
- **Token expiration**: Optional 7-day expiration for enhanced security

### 2. Access Control
- **Token-based access**: No user accounts required, secure token validation
- **Rate limiting**: Prevent abuse of personal management endpoints
- **IP-based restrictions**: Monitor and limit requests from single IPs
- **CSRF protection**: Ensure state-changing operations include proper protection

### 3. WhatsApp Security
- **Webhook verification**: Validate all incoming webhook requests
- **Template compliance**: Ensure all templates follow WhatsApp policies
- **Phone number validation**: Validate Argentine phone number format
- **Message content sanitization**: Prevent injection attacks in template parameters

---

## Performance Considerations

### 1. Database Optimization
- **Indexes**: Proper indexing on frequently queried fields
- **Query optimization**: Efficient joins and data retrieval
- **Connection pooling**: Supabase handles connection management
- **Data retention**: Implement cleanup procedures for old notifications

### 2. WhatsApp API Optimization
- **Rate limiting compliance**: Respect WhatsApp API rate limits
- **Batch processing**: Group multiple notifications when possible
- **Retry logic**: Efficient exponential backoff for failed messages
- **Template caching**: Cache approved templates for faster access

### 3. Frontend Performance
- **Code splitting**: Separate bundles for personal management pages
- **Caching**: Implement appropriate caching headers
- **Mobile optimization**: Optimized for WhatsApp browser performance
- **Loading states**: Provide immediate feedback during operations

---

## Monitoring and Analytics

### 1. Notification Metrics
- **Delivery rates**: Track successful message delivery
- **Failure analysis**: Monitor and categorize failure reasons
- **Response times**: WhatsApp API response time monitoring
- **Template performance**: Track template approval and usage

### 2. User Engagement
- **Personal page access**: Track usage of management links
- **Cancellation rates**: Monitor cancellation patterns
- **Time to access**: Measure time from notification to page access
- **Device analytics**: Mobile vs desktop usage patterns

### 3. System Health
- **Error rates**: Monitor API and service error rates
- **Database performance**: Query execution time monitoring
- **Webhook reliability**: Track webhook delivery success
- **Token security**: Monitor for suspicious token access patterns

---

## Deployment Configuration

### 1. Environment Variables

```typescript
// Production environment
export const productionConfig = {
  // WhatsApp Business API
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN!,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!,
  
  // Application URLs
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
  WHATSAPP_WEBHOOK_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/whatsapp/webhook`,
  
  // Database
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};
```

### 2. Webhook Configuration

```typescript
// Vercel deployment configuration
export const webhookConfig = {
  url: 'https://cancha-leconte.vercel.app/api/notifications/whatsapp/webhook',
  fields: 'messages',
  verify_token: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  include_values: ['statuses', 'messages']
};
```

---

## Conclusion

This comprehensive architecture provides a robust foundation for implementing WhatsApp notifications within the existing Friend Registration System. The design prioritizes:

- **Security**: Token-based access with proper validation and rate limiting
- **Reliability**: Retry mechanisms and comprehensive error handling
- **User Experience**: Mobile-first design with immediate feedback
- **Maintainability**: Clean separation of concerns and comprehensive testing
- **Scalability**: Efficient database design and API optimization

The implementation plan provides a clear roadmap for development teams, with specific priorities and deliverables for each phase. The system integrates seamlessly with the existing Supabase infrastructure while adding powerful WhatsApp notification capabilities that will enhance the user experience for players managing their game registrations.

### Next Steps

1. **Database Migration**: Execute schema changes in development environment
2. **WhatsApp Business Setup**: Begin business verification process
3. **Token System Implementation**: Develop and test registration token service
4. **Integration Development**: Implement WhatsApp service and enhanced registration flow
5. **Frontend Development**: Build personal management interface
6. **Testing and Deployment**: Comprehensive testing and production deployment

This architecture ensures that the WhatsApp notification system will provide significant value to users while maintaining the high security and performance standards of the existing system.