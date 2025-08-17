---
title: Friend Registration System - Feature Design
description: Mobile-first registration experience for friends to join soccer games via shareable links
feature: friend-registration
last-updated: 2025-08-17
version: 1.0.0
related-files:
  - ../../design-system/style-guide.md
  - ./user-journey.md
  - ./screen-states.md
dependencies:
  - Game management system
  - Design system foundation
status: approved
---

# Friend Registration System (F005)

## Feature Overview

The Friend Registration System provides a seamless, mobile-first experience for friends to register for soccer games through shareable links. This system prioritizes simplicity and speed, allowing registration without creating accounts while capturing essential information for game coordination and payments.

**User Story**: As a friend, I want to register for games easily so that I can participate in soccer matches.

## User Experience Analysis

### Primary User Goals
1. **Quick registration** from WhatsApp link in under 30 seconds
2. **Clear game information** to make informed participation decisions
3. **Simple form completion** with minimal required information
4. **Immediate confirmation** of successful registration

### Success Criteria
- Registration completed in under 30 seconds from link click
- Zero confusion about game details (time, location, cost)
- 95%+ registration completion rate (started vs completed)
- Clear confirmation and next steps after registration

### Key Pain Points Addressed
- **Missing invitations**: Direct link access bypasses group chat noise
- **Unclear details**: All game information prominently displayed
- **Complex registration**: Minimal form with only essential fields
- **Forgotten commitments**: Clear confirmation with calendar integration option

### User Personas
- **Friends/Players**: Ages 18-40, varying tech comfort levels
- **Device preference**: Primarily mobile phones via WhatsApp
- **Context**: Quick decision-making while multitasking
- **Expectations**: Simple, fast process similar to other social apps

## Information Architecture

### Content Hierarchy
1. **Game essentials** - Date, time, location (immediate decision factors)
2. **Game details** - Duration, current players, cost breakdown
3. **Registration form** - Name, phone number only
4. **Confirmation** - Success feedback and next steps

### Navigation Structure
- **Linear flow**: Game details → Registration form → Confirmation
- **No login required**: Anonymous registration with contact info
- **Single page**: All information accessible without navigation
- **Clear exit**: Easy return to WhatsApp or close browser

### Mental Model Alignment
Follows familiar social event registration patterns: see details, decide, sign up, get confirmation - matching users' expectations from other social platforms.

### Progressive Disclosure Strategy
- **Critical info first**: Date, time, location immediately visible
- **Details on demand**: Player list, game rules expandable
- **Form revelation**: Registration form appears after showing interest
- **Advanced options**: Waiting list, guest invites as secondary features

## User Journey Mapping

### Core Experience Flow: Friend Registration

#### Step 1: Link Access and Game Discovery
**Trigger**: Friend clicks WhatsApp link or receives direct share
**State Description**: Immediate game information display optimized for mobile
**Available Actions**: View details, register, share with others
**Visual Hierarchy**: Date/time hero section, key details, call-to-action
**System Feedback**: Loading state, game availability status

#### Step 2: Registration Decision and Form
**Decision Factors**: Game timing, current players, cost, location convenience
**Form Reveal**: Simple slide-in animation after "Register" click
**Required Fields**: Name, phone number (WhatsApp compatible)
**Optional Fields**: Dietary restrictions, skill level (if enabled by admin)
**Validation**: Real-time phone number format checking

#### Step 3: Registration Confirmation
**Success State**: Clear confirmation with game summary
**Next Steps**: Calendar integration, WhatsApp group invitation
**Payment Info**: Clear explanation of when/how payment will be requested
**Cancellation**: Easy way to remove registration if plans change

### Advanced Scenarios

#### Waiting List Registration
**Full Game**: Clear messaging about waiting list position
**Notification**: Promise of WhatsApp alert if spot opens
**Position Tracking**: Real-time updates on waiting list position
**Automatic Promotion**: Seamless conversion from waiting list to confirmed

#### Guest Invitations
**Friend Referrals**: Ability to invite additional friends
**Quota Management**: Limits on guest invitations per player
**Approval Process**: Admin oversight for guest registrations
**Group Coordination**: Tools for coordinating with invited guests

#### Registration Changes
**Cancellation**: Easy self-removal until deadline
**Information Updates**: Edit name/phone if needed
**Status Tracking**: Clear visibility of registration status
**Re-registration**: Simple process if cancellation was accidental

## Screen-by-Screen Specifications

### Screen: Game Information and Registration

#### Purpose
Provide all necessary game information and enable quick registration decision-making on mobile devices accessed primarily through WhatsApp.

#### Layout Structure
- **Single-page design**: All information accessible without scrolling confusion
- **Mobile-first**: Optimized for 320px+ width devices
- **Thumb-friendly**: All interactions within comfortable reach zones

#### Content Strategy
- **Scannable information**: Quick visual parsing of key details
- **Trust signals**: Admin name, previous game count, clear policies
- **Social proof**: Current player list and registration momentum

### State: Game Details View (Default)

**Visual Design Specifications**:
- **Layout**: Hero section with game basics, expandable details sections below
- **Typography**: H1 for date/time, H3 for section headers, Body for details
- **Color Application**: Primary green for availability, semantic colors for status
- **Interactive Elements**: Expand/collapse sections, prominent register button
- **Visual Hierarchy**: Date/time → Location/cost → Player status → Registration CTA
- **Whitespace Usage**: Generous spacing for mobile readability, 16px base padding

**Hero Section**:
```css
.game-hero {
  background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
  color: #FFFFFF;
  padding: 32px 16px;
  text-align: center;
  border-radius: 0 0 16px 16px;
}

.game-date {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.game-time {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 16px;
}

.game-location {
  font-size: 16px;
  opacity: 0.9;
}
```

**Game Details Cards**:
```css
.details-section {
  background: #FFFFFF;
  margin: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  padding: 16px;
  background: #F5F5F5;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.section-content {
  padding: 16px;
  display: none;
}

.section-content.expanded {
  display: block;
  animation: slideDown 300ms ease-out;
}
```

**Essential Information**:
- **Date**: Day of week, month/day in large, readable format
- **Time**: Start time in prominent typography with duration
- **Location**: "Cancha Leconte" with address if needed
- **Cost**: Per-player cost with total field cost breakdown
- **Players**: Current count vs maximum with visual progress indicator

**Player Status Indicator**:
```css
.player-status {
  display: flex;
  align-items: center;
  background: #E8F5E8;
  padding: 12px 16px;
  margin: 16px;
  border-radius: 8px;
}

.status-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  color: #2E7D32;
}

.player-count {
  font-weight: 500;
  color: #1B5E20;
}

.player-progress {
  flex-grow: 1;
  height: 8px;
  background: #C8E6C9;
  border-radius: 4px;
  margin: 0 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2E7D32;
  transition: width 300ms ease-out;
}
```

### State: Registration Form

**Visual Design Specifications**:
- **Form Overlay**: Slide-up from bottom with backdrop blur
- **Field Design**: Large touch targets, clear labels, minimal fields
- **Validation**: Real-time feedback with appropriate error messaging
- **Submit Button**: Prominent, disabled until valid input

**Form Structure**:
```css
.registration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.registration-form {
  background: #FFFFFF;
  border-radius: 16px 16px 0 0;
  padding: 24px;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  transform: translateY(100%);
  animation: slideUp 300ms ease-out forwards;
}

@keyframes slideUp {
  to { transform: translateY(0); }
}
```

**Form Fields**:
- **Name Field**: 
  - Label: "Tu nombre"
  - Placeholder: "Como te conocen tus amigos"
  - Validation: Required, minimum 2 characters
- **Phone Field**:
  - Label: "Número de WhatsApp"
  - Placeholder: "+54 9 11 XXXX-XXXX"
  - Validation: Argentine phone format
  - Helper text: "Para enviarte confirmaciones y recordatorios"

**Registration Button**:
```css
.register-button {
  width: 100%;
  height: 52px;
  background: #2E7D32;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease-out;
  margin-top: 24px;
}

.register-button:disabled {
  background: #BDBDBD;
  cursor: not-allowed;
}

.register-button:not(:disabled):hover {
  background: #1B5E20;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}
```

### State: Registration Confirmation

**Success Animation**:
```css
.confirmation-screen {
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

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}
```

**Confirmation Content**:
- **Success Message**: "¡Estás registrado!"
- **Game Summary**: Key details repeated for confirmation
- **Next Steps**: Payment timing, group chat invitation
- **Calendar Integration**: "Add to Calendar" button
- **Contact Info**: How to reach admins if needed

**Interaction Design Specifications**:
- **Primary Actions**: Add to calendar, close/return to WhatsApp
- **Secondary Actions**: Share with friends, view player list
- **Form Interactions**: Smooth animations, clear feedback
- **Touch Interactions**: Large targets, swipe gestures for form dismissal
- **Keyboard Support**: Tab navigation, Enter to submit

## Technical Implementation Guidelines

### State Management Requirements
- **Game Data**: Real-time player count, availability status
- **Form State**: Validation, submission status, error handling
- **Registration Status**: User registration state, confirmation data
- **Link Security**: Token validation, expiration checking

### Performance Targets
- **Initial Load**: < 2 seconds on 3G connection
- **Form Submission**: < 3 seconds registration process
- **Real-time Updates**: < 1 second player count updates
- **Mobile Optimization**: < 100KB initial bundle

### API Integration Points
- **Game Details**: GET /api/games/:token
- **Registration**: POST /api/games/:token/register
- **Player Count**: WebSocket or polling for real-time updates
- **Validation**: Real-time phone number validation

### Browser Compatibility
- **Mobile Browsers**: iOS Safari 12+, Chrome Mobile 70+
- **WhatsApp Browser**: Optimized for in-app browser experience
- **Offline Support**: Basic caching for poor connectivity
- **Touch Support**: Optimized touch interactions throughout

## Quality Assurance Checklist

### Design System Compliance
- [ ] Colors match primary palette with appropriate semantic usage
- [ ] Typography follows mobile-optimized hierarchy
- [ ] Spacing uses systematic scale adapted for mobile
- [ ] Touch targets meet 44×44px minimum requirement
- [ ] Form components match established specifications

### User Experience Validation
- [ ] Registration completes in under 30 seconds from link access
- [ ] All game information clearly visible without confusion
- [ ] Form completion rate >95% (started vs completed)
- [ ] Confirmation provides clear next steps and contact information
- [ ] Error states provide helpful recovery guidance

### Mobile Optimization
- [ ] Layout works on 320px minimum width
- [ ] Touch interactions feel natural and responsive
- [ ] Text remains readable without zooming
- [ ] Forms work with mobile keyboards and autocomplete
- [ ] Performance acceptable on 3G connections

### Accessibility Compliance
- [ ] WCAG AA compliance verified for mobile interface
- [ ] Screen reader support for all interactive elements
- [ ] High contrast mode compatibility
- [ ] Voice control compatibility for form filling
- [ ] Gesture alternatives for all swipe interactions

---

**Implementation Priority**: P0 (Core user experience)
**Dependencies**: Game management system, design system foundation
**Estimated Development**: 2 sprints including mobile optimization testing