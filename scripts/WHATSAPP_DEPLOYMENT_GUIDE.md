# WhatsApp Notification System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the WhatsApp notification system that has been integrated into the friend registration flow.

## Architecture Summary

The WhatsApp notification system includes:

- **Enhanced Friend Registration**: Automatic WhatsApp notifications when players register
- **Personal Registration Management**: Secure token-based access to registration details
- **Cancellation System**: Players can cancel registrations via personal links
- **WhatsApp Business API Integration**: Template-based messaging with delivery tracking
- **Webhook Processing**: Real-time delivery status updates

## Files Created/Modified

### New Files Created:
```
lib/database/migrations/005_add_whatsapp_notification_system.sql
lib/database/migrations/rollback_005_add_whatsapp_notification_system.sql
lib/services/registration-token.ts
lib/services/whatsapp.ts
lib/services/enhanced-friend-registration.ts
lib/types/whatsapp.ts
app/api/mi-registro/[token]/route.ts
app/api/mi-registro/[token]/cancel/route.ts
app/api/notifications/whatsapp/webhook/route.ts
scripts/run-whatsapp-migration.ts
scripts/manual-migration-setup.sql
scripts/test-whatsapp-integration.ts
```

### Modified Files:
```
lib/supabase/types.ts (added WhatsApp fields)
lib/validations/games.ts (added WhatsApp validations)
lib/types/friend-registration.ts (added enhanced registration type)
app/api/games/[token]/register/route.ts (updated to use enhanced service)
```

## Deployment Steps

### 1. Database Migration

**Option A: Manual Migration (Recommended)**
1. Open Supabase SQL Editor
2. Copy and paste the contents of `scripts/manual-migration-setup.sql`
3. Execute the script

**Option B: Automated Migration**
```bash
npx tsx --env-file=.env.local scripts/run-whatsapp-migration.ts
```

### 2. Environment Variables Setup

Add the following to your `.env.local` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Ensure these existing variables are set
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. WhatsApp Business API Setup

1. **Create WhatsApp Business Account**
   - Go to [Meta Business](https://business.facebook.com/)
   - Create a business account
   - Add WhatsApp Business API

2. **Get Access Token**
   - Go to Meta for Developers
   - Create an app with WhatsApp Business API
   - Get permanent access token
   - Add to environment variables

3. **Configure Phone Number**
   - Register a phone number
   - Get the Phone Number ID
   - Add to environment variables

4. **Create Message Templates**
   The system expects these templates to be approved:
   - `cancha_leconte_registration` (registration confirmation)
   - `cancha_leconte_waiting_list` (waiting list notification)
   - `cancha_leconte_reminder` (game reminder)
   - `cancha_leconte_cancellation` (cancellation confirmation)
   - `cancha_leconte_promotion` (waiting list promotion)

5. **Setup Webhook**
   - Webhook URL: `https://your-domain.com/api/notifications/whatsapp/webhook`
   - Verify Token: Use the token from environment variables
   - Subscribe to message status updates

### 4. Template Creation

Create these templates in Meta Business Manager:

**Registration Confirmation Template**
```
Name: cancha_leconte_registration
Category: UTILITY
Content: ¡Hola {{1}}! Te registraste exitosamente para "{{2}}" el {{3}}. Gestiona tu inscripción: {{4}}
```

**Waiting List Template**
```
Name: cancha_leconte_waiting_list
Category: UTILITY
Content: ¡Hola {{1}}! Estás en lista de espera (#{{2}}) para "{{3}}". Te notificaremos si se libera lugar: {{4}}
```

**Game Reminder Template**
```
Name: cancha_leconte_reminder
Category: UTILITY
Content: ¡Hola {{1}}! Recordatorio: "{{2}}" es en 1 hora ({{3}}). Ubicación: {{4}}
```

**Cancellation Template**
```
Name: cancha_leconte_cancellation
Category: UTILITY
Content: ¡Hola {{1}}! Tu inscripción para "{{2}}" ha sido cancelada exitosamente. Motivo: {{3}}
```

**Promotion Template**
```
Name: cancha_leconte_promotion
Category: UTILITY
Content: ¡Buenas noticias {{1}}! Se liberó un lugar en "{{2}}". Ahora estás confirmado: {{3}}
```

### 5. Testing

Run the integration test:
```bash
npx tsx --env-file=.env.local scripts/test-whatsapp-integration.ts
```

Test the complete flow:
1. Create a test game
2. Register a player with a valid WhatsApp number
3. Check if WhatsApp notification is sent
4. Use the personal management link to view registration
5. Test cancellation through the personal link

### 6. Production Deployment

1. **Update Environment Variables in Production**
   - Add WhatsApp environment variables to Vercel/production environment
   - Ensure `NEXT_PUBLIC_APP_URL` points to production domain

2. **Deploy Code**
   ```bash
   git add .
   git commit -m "feat: Add WhatsApp notification system"
   git push origin main
   ```

3. **Run Production Migration**
   - Execute the migration script in production Supabase instance

4. **Configure Production Webhook**
   - Update webhook URL to production domain
   - Test webhook delivery

## API Endpoints

### Personal Registration Management
- `GET /api/mi-registro/[token]` - Get registration details
- `POST /api/mi-registro/[token]/cancel` - Cancel registration

### WhatsApp Webhook
- `GET /api/notifications/whatsapp/webhook` - Webhook verification
- `POST /api/notifications/whatsapp/webhook` - Delivery status updates

### Enhanced Registration (Modified)
- `POST /api/games/[token]/register` - Now includes WhatsApp notifications

## Database Schema Changes

### game_registrations table (new columns):
- `registration_token` VARCHAR(255) UNIQUE
- `notification_sent_at` TIMESTAMP WITH TIME ZONE
- `notification_status` VARCHAR(50)
- `cancellation_reason` TEXT
- `cancelled_at` TIMESTAMP WITH TIME ZONE

### notifications table (new columns):
- `registration_id` UUID
- `template_name` VARCHAR(100)
- `template_params` JSONB
- `retry_count` INTEGER
- `next_retry_at` TIMESTAMP WITH TIME ZONE

### whatsapp_templates table (new):
- `id` UUID PRIMARY KEY
- `name` VARCHAR(100) UNIQUE
- `template_id` VARCHAR(255)
- `language_code` VARCHAR(10)
- `category` VARCHAR(50)
- `template_body` TEXT
- `template_params` JSONB
- `status` VARCHAR(20)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

## Features

### Automatic Notifications
- Registration confirmation with personal management link
- Waiting list notifications with position
- Promotion notifications when spots open up
- Cancellation confirmations

### Personal Registration Management
- Secure token-based access (no login required)
- View registration details and game information
- Check payment status and team assignment
- Cancel registration with optional reason
- Time-aware cancellation restrictions

### WhatsApp Integration
- Template-based messaging for consistency
- Delivery status tracking
- Retry mechanism for failed messages
- Webhook processing for real-time updates

### Security Features
- Cryptographically secure 43-character tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- Audit logging for all actions

## Monitoring

Monitor the system through:
- Supabase logs for database operations
- Application logs for WhatsApp API calls
- Meta Business Manager for template performance
- Webhook delivery reports

## Troubleshooting

### Common Issues

1. **Templates not working**
   - Ensure templates are approved in Meta Business Manager
   - Check template names match exactly
   - Verify parameter count and order

2. **Webhook not receiving updates**
   - Check webhook URL is accessible
   - Verify webhook token matches
   - Test webhook endpoint manually

3. **Tokens not generating**
   - Ensure database migration ran successfully
   - Check trigger is created and functioning
   - Verify permissions on database functions

4. **WhatsApp messages not sending**
   - Check access token validity
   - Verify phone number ID
   - Ensure phone numbers are in correct format

## Support

For issues with:
- Database migration: Check Supabase logs
- WhatsApp API: Check Meta for Developers console
- Token generation: Test with `scripts/test-whatsapp-integration.ts`
- Overall integration: Review application logs

## Security Considerations

- Tokens are cryptographically secure (32 bytes, base64url encoded)
- Rate limiting prevents abuse
- Phone numbers are validated for Argentine format
- Personal links expire based on game date
- All API calls are logged for audit purposes

## Performance Considerations

- Database indexes created for efficient queries
- WhatsApp API calls include retry logic
- Personal registration pages are optimized for mobile
- Webhook processing is asynchronous
- Template parameters are cached for faster access