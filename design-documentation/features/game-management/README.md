---
title: Game Management System - Feature Design
description: Complete UX/UI design for game creation, editing, and configuration interface
feature: game-management
last-updated: 2025-08-17
version: 1.0.0
related-files:
  - ../../design-system/style-guide.md
  - ./user-journey.md
  - ./screen-states.md
dependencies:
  - Admin authentication system
  - Design system foundation
status: approved
---

# Game Management System (F002 & F003)

## Feature Overview

The Game Management System enables Santiago and Agustin to create, configure, edit, and cancel soccer games. This system handles game settings, generates shareable links, manages player limits, and provides flexible game administration capabilities.

**Core User Stories**:
- **F002**: As an admin, I want to create games with specific settings so that I can organize soccer matches for my friends
- **F003**: As an admin, I want to modify or cancel games so that I can adapt to changing circumstances

## User Experience Analysis

### Primary User Goals
1. **Quick game creation** with sensible defaults for regular games
2. **Flexible game configuration** for special occasions or different field costs
3. **Easy game modification** when circumstances change
4. **Instant link sharing** to invite friends efficiently

### Success Criteria
- Game creation completed in under 60 seconds
- Shareable link generated immediately
- Game modifications propagated to registered players
- Zero confusion about game details or settings

### Key Pain Points Addressed
- **Manual coordination**: Automated link generation and sharing
- **Changing plans**: Easy editing with automatic notifications
- **Cost splitting**: Clear field cost configuration and tracking
- **Player limits**: Automatic registration closure when limits reached

### User Personas
- **Santiago & Agustin**: Regular game organizers needing efficiency
- **Frequency**: 2-3 games per week requiring streamlined workflows
- **Context**: Often creating games on mobile while coordinating with friends

## Information Architecture

### Content Hierarchy
1. **Game basics** - Date, time, duration (most important)
2. **Player configuration** - Min/max players, team settings
3. **Financial details** - Field cost, payment deadlines
4. **Advanced options** - Special instructions, cancellation policies

### Navigation Structure
- **Creation flow**: Step-by-step form with logical progression
- **Editing mode**: In-place editing with change tracking
- **Management view**: Overview of all game settings with quick actions

### Mental Model Alignment
Game creation follows the natural planning process: when, where, who, how much - matching how admins mentally organize soccer games.

### Progressive Disclosure Strategy
- **Essential settings** shown first (date, time, players)
- **Financial details** in secondary section
- **Advanced options** collapsed by default
- **Edit mode** reveals all settings for modification

## User Journey Mapping

### Core Experience Flow: Game Creation

#### Step 1: Initiate Game Creation
**Trigger**: Admin clicks "Create New Game" from dashboard
**State Description**: Clean form interface with logical field grouping
**Available Actions**: Fill form fields, use quick templates, save draft
**Visual Hierarchy**: Date/time prominently featured, progressive field disclosure
**System Feedback**: Real-time validation, auto-save indicators

#### Step 2: Configure Game Settings
**Task Flow**: Set date/time → Configure players → Set costs → Add details
**State Changes**: Form sections expand as user progresses
**Error Prevention**: Date validation, logical min/max player checks
**Progressive Disclosure**: Advanced settings available but not overwhelming
**Microcopy**: Helpful hints for field cost calculation and player limits

#### Step 3: Generate and Share Link
**Success State**: Immediate link generation with sharing options
**Sharing Options**: Copy link, WhatsApp direct share, QR code generation
**Confirmation**: Clear game summary with edit option
**Next Actions**: Share immediately or return to dashboard

### Core Experience Flow: Game Editing

#### Step 1: Access Game for Editing
**Trigger**: Admin selects "Edit" from game list or game detail view
**Context**: Shows current registration status and player count
**Permissions**: Only admins can edit, with change impact warnings
**Navigation**: Clear path back to game overview

#### Step 2: Modify Game Settings
**Available Changes**: All original settings plus registration management
**Impact Assessment**: Clear warnings when changes affect registered players
**Validation**: Prevents impossible changes (reducing max below current registrations)
**Notification Preview**: Shows what messages will be sent to players

#### Step 3: Apply Changes and Notify
**Change Summary**: Clear diff showing what changed
**Notification Options**: Immediate notification or scheduled messaging
**Confirmation**: Success state with change log
**Player Feedback**: Status of notification delivery

### Edge Cases and Advanced Scenarios

#### Game Cancellation
**Cancellation Triggers**: Weather, insufficient players, emergency
**Notice Requirements**: Different messaging for <24h vs >24h cancellations
**Player Notifications**: Automatic WhatsApp messages with clear reasons
**Refund Handling**: Clear guidance on payment reversal if applicable

#### Registration Management
**Capacity Management**: Manual closure even when under max capacity
**Team Assignment**: Random or manual team selection tools
**Waiting Lists**: Management when games become oversubscribed
**No-Show Handling**: Tools for managing attendance vs registration

#### Template System
**Quick Creation**: Templates for regular weekly games
**Customization**: Ability to modify template defaults
**Seasonal Adjustments**: Different templates for different times of year

## Screen-by-Screen Specifications

### Screen: Game Creation Form

#### Purpose
Enable admins to quickly create new games with all necessary configuration options while maintaining simplicity for regular use cases.

#### Layout Structure
- **Multi-section form**: Logical grouping of related settings
- **Responsive design**: Works efficiently on both mobile and desktop
- **Progressive disclosure**: Advanced options available but not overwhelming

#### Content Strategy
- **Essential first**: Date, time, and player information prominently featured
- **Cost clarity**: Clear explanation of field costs and payment timing
- **Smart defaults**: Pre-filled values based on typical game patterns

### State: New Game Form (Default)

**Visual Design Specifications**:
- **Layout**: Single-column form with section cards, 24px spacing between sections
- **Typography**: H2 for section headers, Body for labels, Body Small for help text
- **Color Application**: Primary accents for section headers, neutral form elements
- **Interactive Elements**: Date/time picker, number inputs, text fields, toggle switches
- **Visual Hierarchy**: Game basics → Player config → Cost details → Advanced options
- **Whitespace Usage**: 32px section padding, 16px field spacing, 8px label-to-input

**Form Sections**:

#### Section 1: Game Basics
```css
.game-basics {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #E0E0E0;
  margin-bottom: 24px;
}
```

**Fields**:
- **Date Picker**: Large, prominent with calendar widget
- **Time Picker**: Hours and minutes with AM/PM selector  
- **Duration**: Dropdown with common durations (90min, 120min)
- **Location**: Pre-filled with "Cancha Leconte" (editable)

#### Section 2: Player Configuration
**Fields**:
- **Minimum Players**: Number input (default: 10)
- **Maximum Players**: Number input (default: 20)
- **Team Assignment**: Toggle for "Random teams" vs "Manual selection"
- **Registration Deadline**: Time relative to game start

#### Section 3: Cost Details
**Fields**:
- **Field Cost Total**: Currency input with peso symbol
- **Cost Per Player**: Auto-calculated display
- **Payment Deadline**: Relative to game end time
- **Payment Instructions**: Text area for MercadoPago details

#### Section 4: Advanced Options (Collapsed)
**Fields**:
- **Game Description**: Text area for special instructions
- **Weather Policy**: Dropdown with cancellation conditions
- **Late Registration**: Allow/disallow after deadline
- **Guest Players**: Allow friends to invite others

**Interaction Design Specifications**:
- **Primary Actions**: "Create Game" button (Primary style, full width on mobile)
- **Secondary Actions**: "Save as Template", "Preview", "Cancel"
- **Form Validation**: Real-time validation with immediate feedback
- **Auto-save**: Draft saving every 30 seconds
- **Smart Suggestions**: Cost suggestions based on previous games

**Animation & Motion Specifications**:
- **Section Expansion**: 300ms ease-out for advanced options
- **Field Validation**: Immediate feedback with 200ms color transitions
- **Success Creation**: Celebration animation before link generation
- **Error States**: Shake animation for invalid fields

**Responsive Design Specifications**:
- **Mobile** (320-767px): Stacked layout, full-width fields, simplified date/time picker
- **Tablet** (768-1023px): Two-column layout for some sections, larger touch targets
- **Desktop** (1024px+): Optimized form layout with efficient use of space

### Screen: Game Edit Interface

#### Purpose
Allow admins to modify existing games while clearly communicating the impact of changes on registered players.

**Visual Design Specifications**:
- **Change Tracking**: Visual indicators for modified fields
- **Impact Warnings**: Clear messaging about player notifications
- **Current Status**: Player count and registration status prominently displayed

**Key Differences from Creation**:
- **Current Values**: All fields pre-populated with existing data
- **Change Indicators**: Modified fields highlighted in accent color
- **Player Impact**: Warning messages for changes affecting registered players
- **Notification Preview**: What messages will be sent to players

### Screen: Game Overview/Management

#### Purpose
Provide comprehensive view of game status with quick management actions.

**Visual Design Specifications**:
- **Game Status Card**: Key information at-a-glance
- **Player List**: Current registrations with status indicators
- **Quick Actions**: Edit, cancel, share link, manage registration
- **Analytics**: Registration rate, payment status, historical comparison

**Status Indicators**:
- **Registration Status**: Open, Closed, Full with clear visual distinction
- **Payment Status**: Overview of who has/hasn't paid
- **Time Status**: Upcoming, In Progress, Completed
- **Weather Status**: Clear/Uncertain/Cancelled based on policy

## Technical Implementation Guidelines

### State Management Requirements
- **Game States**: Draft → Published → Registration Open → Closed → In Progress → Completed → Cancelled
- **Form State**: Real-time validation, auto-save, change tracking
- **Player State**: Registration status, payment status, notification status
- **Link Management**: Secure token generation, expiration handling

### Performance Targets
- **Form Load**: < 2 seconds on initial display
- **Link Generation**: < 1 second after successful creation
- **Edit Mode**: < 1 second to populate existing data
- **Validation**: < 200ms for field validation feedback

### API Integration Points
- **Game Creation**: POST /api/games
- **Game Updates**: PATCH /api/games/:id
- **Link Generation**: GET /api/games/:id/share-link
- **Player Management**: GET/POST /api/games/:id/players
- **Notification Triggers**: POST /api/games/:id/notify

### Data Validation Rules
- **Date/Time**: Must be in future, reasonable time limits
- **Player Limits**: Min < Max, both > 0, Max ≤ 30
- **Cost**: Positive numbers, reasonable amounts for field rental
- **Duration**: 60-180 minutes typical range
- **Phone Validation**: Argentine format for notifications

## Quality Assurance Checklist

### Design System Compliance
- [ ] Colors match established palette with proper contrast
- [ ] Typography follows hierarchical scale consistently
- [ ] Spacing uses systematic 8px scale throughout
- [ ] Form components match established input specifications
- [ ] Buttons follow primary/secondary component patterns

### User Experience Validation
- [ ] Game creation completes in under 60 seconds for typical use
- [ ] Link generation provides immediate shareable result
- [ ] Edit mode clearly shows impact of changes on players
- [ ] Cancellation process provides appropriate warnings and confirmation
- [ ] All form fields have clear, helpful labels and validation

### Accessibility Compliance
- [ ] WCAG AA compliance verified for all form elements
- [ ] Keyboard navigation works throughout creation/edit flow
- [ ] Screen reader support for all field labels and error messages
- [ ] Color contrast meets 4.5:1 ratio for all text elements
- [ ] Touch targets meet 44×44px minimum on mobile
- [ ] Focus indicators visible and consistent throughout

### Functional Validation
- [ ] Date/time validation prevents impossible game scheduling
- [ ] Player limit validation prevents logical inconsistencies
- [ ] Cost calculation accuracy verified
- [ ] Link generation produces valid, secure URLs
- [ ] Edit notifications reach all registered players
- [ ] Cancellation workflow handles all edge cases properly

---

**Implementation Priority**: P0 (Core functionality)
**Dependencies**: Admin authentication, design system foundation
**Estimated Development**: 2-3 sprints including notification integration