---
title: Payment Integration (MercadoPago) - Feature Design
description: Seamless payment flow design for Argentine users using MercadoPago integration
feature: payment-integration
last-updated: 2025-08-17
version: 1.0.0
related-files:
  - ../../design-system/style-guide.md
  - ./user-journey.md
  - ./screen-states.md
dependencies:
  - Post-game management system
  - Friend registration system
  - Design system foundation
status: approved
---

# Payment Integration (MercadoPago) - F008

## Feature Overview

The Payment Integration system provides a seamless, trusted payment experience for friends to pay their share of field costs using MercadoPago, Argentina's leading payment platform. This system emphasizes trust, clarity, and convenience while integrating smoothly with WhatsApp notifications.

**User Story**: As a friend, I want to pay for games easily so that I can fulfill my financial obligations quickly.

## User Experience Analysis

### Primary User Goals
1. **Quick payment completion** from WhatsApp notification link
2. **Clear payment amount** and explanation of what they're paying for
3. **Trusted payment method** using familiar MercadoPago interface
4. **Immediate confirmation** that payment was successful
5. **No future reminders** once payment is complete

### Success Criteria
- Payment completion in under 2 minutes from WhatsApp link
- 95%+ payment success rate (no technical failures)
- Clear understanding of payment amount and purpose
- Automatic status updates eliminating manual tracking

### Key Pain Points Addressed
- **Payment confusion**: Clear explanation of field cost division
- **Trust concerns**: MercadoPago branding and secure payment flow
- **Manual tracking**: Automatic payment confirmation and status updates
- **Payment delays**: Easy access via WhatsApp with persistent payment links

### User Personas
- **Friends/Players**: Need simple, trusted payment experience
- **Payment context**: Usually paying shortly after game completion
- **Device preference**: Mobile-first, often via WhatsApp browser
- **Technical comfort**: Varies, but familiar with MercadoPago from other purchases

## Information Architecture

### Payment Flow Structure
1. **Payment Notification** - WhatsApp message with payment context
2. **Payment Details** - Game summary and cost breakdown
3. **MercadoPago Integration** - Secure payment processing
4. **Confirmation** - Success feedback and receipt
5. **Status Update** - Automatic admin notification

### Content Hierarchy
1. **Payment amount** - Clear, prominent display of amount owed
2. **Game context** - Which game and when it occurred
3. **Cost breakdown** - Total field cost divided by players
4. **Payment method** - MercadoPago trust signals and options
5. **Contact information** - Support if payment issues arise

### Mental Model Alignment
Payment flow follows familiar e-commerce patterns: see what you're buying → confirm amount → pay → receive confirmation, matching users' expectations from other online purchases.

## User Journey Mapping

### Core Experience Flow: Payment Process

#### Step 1: Payment Notification and Access
**Trigger**: WhatsApp notification with payment link after game completion
**State Description**: Clear payment request with game context and amount
**Available Actions**: Click payment link, contact admin, ignore (with consequences)
**Visual Hierarchy**: Game info → Amount owed → Pay now button
**System Feedback**: Link validity, payment window remaining

#### Step 2: Payment Details and Confirmation
**Context Display**: Game date, location, total cost, player count, individual share
**Trust Signals**: Admin contact info, previous payment history if applicable
**Payment Options**: MercadoPago wallet, credit card, bank transfer
**Security Indicators**: SSL badges, MercadoPago branding, secure transaction messages
**Final Confirmation**: Review before proceeding to MercadoPago

#### Step 3: MercadoPago Processing
**Handoff**: Seamless redirect to MercadoPago with pre-filled information
**Payment Methods**: User's preferred MercadoPago payment options
**Security**: MercadoPago's native security and fraud protection
**Error Handling**: Clear messaging for payment failures with retry options

#### Step 4: Payment Confirmation and Status Update
**Success State**: Clear confirmation with transaction ID and receipt
**Admin Notification**: Automatic status update for admin tracking
**Future Prevention**: No more payment reminders for this game
**Receipt Access**: Email receipt and payment history access

### Advanced Scenarios

#### Payment Failures and Recovery
**Technical Failures**: Network issues, MercadoPago outages, payment processing errors
**Insufficient Funds**: Clear messaging with alternative payment method suggestions
**Fraud Prevention**: Handling of blocked transactions with appeal process
**Retry Mechanism**: Easy way to reattempt payment without losing context

#### Partial Payments and Credits
**Installment Options**: If MercadoPago supports installments for higher amounts
**Credit Application**: Applying credits from previous overpayments or refunds
**Group Payments**: Multiple people paying for one person (if supported)
**Currency Handling**: Argentine peso formatting and international considerations

#### Payment Disputes and Support
**Dispute Resolution**: Process for handling payment disagreements
**Refund Requests**: Clear process for weather cancellations or other refunds
**Support Contact**: Direct access to admin contact information
**Payment History**: Access to previous payment records for reference

## Screen-by-Screen Specifications

### Screen: Payment Request Interface

#### Purpose
Provide clear payment context and transition smoothly to MercadoPago while maintaining trust and transparency about the payment purpose and amount.

#### Layout Structure
- **Single-page flow**: All payment context on one screen
- **Trust-centered design**: Emphasizing security and legitimate purpose
- **Mobile-optimized**: Primary access through WhatsApp mobile browser

#### Content Strategy
- **Context first**: Clear game reference and date
- **Transparency**: Complete cost breakdown showing fairness
- **Trust signals**: Admin contact, secure payment badges
- **Urgency**: Payment deadline and consequences

### State: Payment Details View (Default)

**Visual Design Specifications**:
- **Layout**: Centered single-column layout with clear sections
- **Typography**: H2 for payment amount, H3 for sections, Body for details
- **Color Application**: Primary green for trust, secondary orange for urgency
- **Interactive Elements**: Prominent pay button, collapsible details sections
- **Visual Hierarchy**: Amount → Game context → Breakdown → Payment button
- **Whitespace Usage**: Generous spacing for mobile readability, 16px base padding

**Payment Header**:
```css
.payment-header {
  background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
  color: #FFFFFF;
  padding: 32px 16px;
  text-align: center;
  border-radius: 0 0 16px 16px;
  margin-bottom: 24px;
}

.payment-title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  opacity: 0.9;
}

.payment-amount {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
}

.payment-subtitle {
  font-size: 14px;
  opacity: 0.8;
}
```

**Game Context Card**:
```css
.game-context {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  margin: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #2E7D32;
}

.game-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.game-date {
  font-weight: 600;
  color: #212121;
}

.game-location {
  color: #757575;
  font-size: 14px;
}

.players-count {
  background: #E8F5E8;
  color: #1B5E20;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}
```

**Cost Breakdown Section**:
```css
.cost-breakdown {
  background: #F8F9FA;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
}

.breakdown-title {
  font-weight: 500;
  color: #424242;
}

.breakdown-details {
  display: none;
  padding-top: 12px;
  border-top: 1px solid #E0E0E0;
}

.breakdown-details.expanded {
  display: block;
  animation: slideDown 300ms ease-out;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.breakdown-total {
  font-weight: 600;
  font-size: 16px;
  border-top: 1px solid #E0E0E0;
  padding-top: 8px;
  margin-top: 8px;
}
```

**Payment Button**:
```css
.payment-button {
  width: calc(100% - 32px);
  height: 56px;
  background: #009EE3; /* MercadoPago blue */
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  margin: 24px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 200ms ease-out;
}

.payment-button:hover {
  background: #0084C4;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 158, 227, 0.3);
}

.mercadopago-logo {
  height: 24px;
  width: auto;
}
```

**Trust and Security Section**:
```css
.trust-indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 16px;
  padding: 16px;
  background: #F0F7FF;
  border-radius: 8px;
}

.security-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #1565C0;
}

.security-icon {
  color: #2196F3;
  font-size: 16px;
}
```

### State: Payment Processing

**Loading State**:
```css
.payment-processing {
  text-align: center;
  padding: 48px 24px;
}

.processing-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #E3F2FD;
  border-top: 4px solid #009EE3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

.processing-text {
  font-size: 16px;
  color: #424242;
  margin-bottom: 8px;
}

.processing-subtext {
  font-size: 14px;
  color: #757575;
}
```

### State: Payment Success Confirmation

**Success Animation**:
```css
.payment-success {
  text-align: center;
  padding: 48px 24px;
  background: #FFFFFF;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: #4CAF50;
  border-radius: 50%;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounceIn 600ms ease-out;
}

.success-checkmark {
  color: #FFFFFF;
  font-size: 32px;
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #2E7D32;
  margin-bottom: 16px;
}

.success-message {
  font-size: 16px;
  color: #424242;
  margin-bottom: 24px;
  line-height: 1.5;
}
```

**Transaction Details**:
```css
.transaction-details {
  background: #F8F9FA;
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
  text-align: left;
}

.transaction-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.transaction-id {
  font-family: monospace;
  background: #E0E0E0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
```

### State: Payment Error

**Error Display**:
```css
.payment-error {
  background: #FFEBEE;
  border: 1px solid #F44336;
  border-radius: 12px;
  padding: 20px;
  margin: 16px;
  text-align: center;
}

.error-icon {
  color: #F44336;
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: #C62828;
  margin-bottom: 12px;
}

.error-message {
  font-size: 14px;
  color: #424242;
  margin-bottom: 20px;
  line-height: 1.5;
}

.retry-button {
  background: #2E7D32;
  color: #FFFFFF;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 12px;
}

.support-link {
  color: #1976D2;
  text-decoration: none;
  font-size: 14px;
}
```

**Common Error Messages**:
- **Network Issues**: "Error de conexión. Verifica tu internet e inténtalo de nuevo."
- **Payment Declined**: "Pago rechazado. Verifica tu método de pago o contacta a tu banco."
- **Insufficient Funds**: "Fondos insuficientes. Elige otro método de pago."
- **General Error**: "Error en el pago. Inténtalo de nuevo o contacta al administrador."

## Technical Implementation Guidelines

### MercadoPago Integration
- **Preference Creation**: Server-side preference generation with game context
- **Webhook Handling**: Automatic payment confirmation processing
- **Security**: Proper credential management and validation
- **Error Handling**: Comprehensive error status management

### State Management Requirements
- **Payment Status**: Pending → Processing → Success/Failed
- **Transaction Tracking**: Link payment to specific game and player
- **Notification Triggers**: Automatic admin updates on payment completion
- **Retry Logic**: Handle transient failures gracefully

### Performance Targets
- **Page Load**: < 2 seconds for payment interface
- **MercadoPago Redirect**: < 1 second handoff
- **Confirmation Update**: < 5 seconds for status update
- **Mobile Optimization**: Optimized for WhatsApp browser

### Security Requirements
- **HTTPS Only**: All payment communications encrypted
- **Token Validation**: Secure payment link generation
- **Amount Verification**: Server-side amount validation
- **Fraud Prevention**: Integration with MercadoPago's fraud tools

## Quality Assurance Checklist

### Design System Compliance
- [ ] Payment interface matches established color palette
- [ ] Typography hierarchy maintains readability on mobile
- [ ] Spacing system applied consistently throughout flow
- [ ] Button specifications match MercadoPago integration requirements
- [ ] Trust signals appropriately designed and positioned

### Payment Flow Validation
- [ ] Payment completion achieves sub-2-minute target consistently
- [ ] MercadoPago integration handles all payment methods correctly
- [ ] Error states provide clear recovery guidance
- [ ] Success confirmation includes all necessary transaction details
- [ ] Payment status updates reach admin dashboard reliably

### Mobile Optimization
- [ ] Interface works properly in WhatsApp's in-app browser
- [ ] Touch targets meet minimum 44×44px requirement
- [ ] Payment flow remains usable on 320px minimum width
- [ ] Loading states provide appropriate feedback during processing
- [ ] Network error handling works on poor mobile connections

### Security and Trust
- [ ] All payment data transmitted securely via HTTPS
- [ ] MercadoPago branding and trust signals properly implemented
- [ ] Payment amounts validated server-side before processing
- [ ] Transaction IDs properly generated and stored
- [ ] Admin contact information clearly accessible for support

---

**Implementation Priority**: P1 (Essential for monetization)
**Dependencies**: Post-game management, MercadoPago API, design system
**Estimated Development**: 2-3 sprints including payment testing and security validation