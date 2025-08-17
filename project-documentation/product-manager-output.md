# Cancha Leconte - Product Management Documentation

## Executive Summary

### Elevator Pitch
Cancha Leconte is a simple web app that helps Santiago and Agustin organize soccer games with their friends, handle payments, and track game history.

### Problem Statement
Santiago Leconte and Agustin Goldfarb currently face challenges in organizing soccer games at their field, including:
- Manual coordination of player participation
- Difficulty tracking who has paid for field costs
- No centralized system for game history and statistics
- Inefficient communication about game details and reminders

### Target Audience
**Primary Users (Admins):**
- Santiago Leconte and Agustin Goldfarb
- Soccer field owners/organizers
- Age: 20-35
- Tech-savvy enough to use web applications
- Need simple, efficient field management

**Secondary Users (Friends/Players):**
- Friends invited to play soccer
- Age: 18-40
- Varying tech comfort levels
- Need simple registration and payment process
- Use WhatsApp for communication

### Unique Selling Proposition
A purpose-built, simple field management system specifically designed for a single soccer field that integrates WhatsApp notifications and MercadoPago payments for the Argentine market.

### Success Metrics
- Reduction in time spent organizing games (target: 50% less admin time)
- Improved payment collection rate (target: 90%+ payment completion)
- User adoption rate (target: 80%+ of regular players use the system)
- Admin satisfaction with game organization process

## User Personas

### Persona 1: Santiago & Agustin (Field Administrators)
**Demographics:**
- Age: 25-30
- Location: Argentina
- Tech Comfort: Intermediate
- Soccer Frequency: 2-3 times per week

**Goals:**
- Simplify game organization process
- Track payments efficiently
- Maintain game history and statistics
- Reduce manual coordination effort

**Pain Points:**
- Manual tracking of who's playing
- Chasing friends for payments
- Forgetting game details and history
- Time-consuming coordination via multiple channels

**Behavior:**
- Organizes games regularly
- Manages field booking and costs
- Coordinates with 10-20 regular players
- Uses WhatsApp for most communication

### Persona 2: Friends/Players
**Demographics:**
- Age: 18-40
- Location: Argentina (friends of Santiago/Agustin)
- Tech Comfort: Basic to Intermediate
- Soccer Frequency: 1-2 times per week

**Goals:**
- Easy registration for games
- Clear game information
- Simple payment process
- Timely reminders about games

**Pain Points:**
- Missing game invitations in group chats
- Forgetting to pay for field costs
- Unclear game details (time, location)
- No easy way to track personal game history

**Behavior:**
- Responds to game invitations
- Uses WhatsApp as primary communication
- Prefers simple, quick interactions
- May forget payment obligations

## Feature Specifications

### F001: Admin Authentication System
**User Story:** As an admin (Santiago/Agustin), I want to securely log into the system so that I can manage games and access admin features.

**Acceptance Criteria:**
- Given I am an admin, when I enter valid credentials, then I can access the admin dashboard
- Given I am not an admin, when I try to access admin features, then I am redirected to login
- Given I enter invalid credentials, when I try to log in, then I receive an error message
- Given I am logged in, when I am inactive for 24 hours, then my session expires

**Priority:** P0 (Foundational requirement)
**Dependencies:** None
**Technical Constraints:** Must support only 2 admin accounts (Santiago and Agustin)
**UX Considerations:** Simple login form, remember login option

### F002: Game Creation and Configuration
**User Story:** As an admin, I want to create games with specific settings so that I can organize soccer matches for my friends.

**Acceptance Criteria:**
- Given I am an admin, when I create a game, then I can set date, time, min/max players, and field cost
- Given I create a game, when I save it, then a unique shareable link is generated
- Given I set max players, when that number is reached, then registration automatically closes
- Given I create a game, when I share the link, then friends can register using only the link

**Priority:** P0 (Core functionality)
**Dependencies:** F001 (Authentication)
**Technical Constraints:** Link must be secure but not require friend authentication
**UX Considerations:** Intuitive date/time picker, clear field validation

### F003: Game Management (Edit/Cancel)
**User Story:** As an admin, I want to modify or cancel games so that I can adapt to changing circumstances.

**Acceptance Criteria:**
- Given I am an admin, when I edit a game, then I can change any game parameter
- Given I edit a game, when players are already registered, then they receive notification of changes
- Given I cancel a game, when players are registered, then they receive cancellation notification
- Given I cancel a game, when it's within 24 hours, then players receive priority notification

**Priority:** P0 (Essential for flexibility)
**Dependencies:** F002 (Game Creation), F006 (WhatsApp Integration)
**Technical Constraints:** Must handle edge cases like reducing max players below current registrations
**UX Considerations:** Clear confirmation dialogs, change history tracking

### F004: Registration Management
**User Story:** As an admin, I want to control game registration so that I can manage player participation effectively.

**Acceptance Criteria:**
- Given I am an admin, when I want to close registration, then I can manually close it regardless of player count
- Given registration is closed, when I arrange teams, then I can do it randomly or manually
- Given I arrange teams manually, when I assign players, then the system prevents uneven teams (if possible)
- Given teams are arranged, when I finalize them, then the arrangement is locked until the game

**Priority:** P1 (Important for game management)
**Dependencies:** F005 (Friend Registration)
**Technical Constraints:** Team balancing algorithm for random assignment
**UX Considerations:** Drag-and-drop interface for manual team assignment

### F005: Friend Registration System
**User Story:** As a friend, I want to register for games easily so that I can participate in soccer matches.

**Acceptance Criteria:**
- Given I receive a game link, when I click it, then I can see game details without login
- Given I want to register, when I enter my name and phone number, then I am registered for the game
- Given I am registered, when the game is full, then late visitors see a waiting list option
- Given I registered, when I want to cancel, then I can remove myself until registration closes

**Priority:** P0 (Core user experience)
**Dependencies:** F002 (Game Creation)
**Technical Constraints:** Phone number validation for WhatsApp integration
**UX Considerations:** Mobile-first design, minimal form fields

### F006: WhatsApp Notification System
**User Story:** As a friend, I want to receive WhatsApp notifications so that I don't miss game information and payment reminders.

**Acceptance Criteria:**
- Given I registered for a game, when it's 1 hour before the game, then I receive a confirmation WhatsApp message
- Given the game ended, when payment is due, then I receive a WhatsApp message with MercadoPago link
- Given I haven't paid, when 24 hours pass after the game, then I receive a payment reminder WhatsApp
- Given game details change, when I'm registered, then I receive update notifications

**Priority:** P1 (Important for user engagement)
**Dependencies:** F005 (Friend Registration), F008 (Payment Integration)
**Technical Constraints:** WhatsApp Business API integration, message template approval
**UX Considerations:** Clear, concise message templates

### F007: Post-Game Management
**User Story:** As an admin, I want to manage game results and payments so that I can track outcomes and financial obligations.

**Acceptance Criteria:**
- Given a game ended, when I access post-game management, then I can see who has/hasn't paid
- Given I want to record results, when I enter the winning team's goals, then the result is saved
- Given players pay, when I mark them as paid, then their status updates and they stop receiving payment reminders
- Given I need payment status, when I view the game, then I see clear visual indicators of payment status

**Priority:** P1 (Important for financial tracking)
**Dependencies:** F008 (Payment Integration)
**Technical Constraints:** Integration with MercadoPago payment confirmation
**UX Considerations:** Clear payment status indicators, bulk payment marking

### F008: Payment Integration (MercadoPago)
**User Story:** As a friend, I want to pay for games easily so that I can fulfill my financial obligations quickly.

**Acceptance Criteria:**
- Given I need to pay, when I click the payment link, then I'm directed to MercadoPago with the correct amount
- Given I complete payment, when the transaction succeeds, then my payment status updates automatically
- Given I complete payment, when the system receives confirmation, then I stop receiving payment reminders
- Given payment fails, when I retry, then I can use the same link again

**Priority:** P1 (Essential for monetization)
**Dependencies:** F007 (Post-Game Management)
**Technical Constraints:** MercadoPago API integration, webhook handling for payment confirmation
**UX Considerations:** Clear payment amount, secure payment flow

### F009: Game History and Statistics
**User Story:** As an admin, I want to view game history and statistics so that I can track field usage and financial performance.

**Acceptance Criteria:**
- Given I want to see history, when I access the history section, then I see all past games with basic details
- Given I select a specific game, when I view details, then I see players, results, and payment status
- Given I want statistics, when I view the stats section, then I see total games, revenue, and unique players
- Given I need financial data, when I view statistics, then I see payment completion rates and outstanding amounts

**Priority:** P2 (Nice to have, adds value)
**Dependencies:** F007 (Post-Game Management)
**Technical Constraints:** Data aggregation and reporting functionality
**UX Considerations:** Clear data visualization, exportable reports

## Functional Requirements

### User Flow: Game Creation and Management
1. Admin logs into system
2. Admin creates new game with configuration
3. System generates shareable link
4. Admin shares link with friends
5. Friends register using link
6. Admin manages registration (close when ready)
7. Admin arranges teams (random or manual)
8. Game takes place
9. Admin records results and manages payments

### User Flow: Friend Participation
1. Friend receives game link
2. Friend views game details
3. Friend registers with name and phone
4. Friend receives WhatsApp confirmation before game
5. Friend participates in game
6. Friend receives payment link via WhatsApp
7. Friend completes payment via MercadoPago

### State Management Needs
- Game states: Draft, Open for Registration, Registration Closed, Teams Set, In Progress, Completed
- Player states: Registered, Confirmed, Paid, No-show
- Admin sessions and authentication state
- Notification queue and delivery status

### Data Validation Rules
- Date/time must be in the future for new games
- Min players must be less than max players
- Phone numbers must be valid Argentine format
- Payment amounts must match game cost
- Player names must be unique per game

### Integration Points
- WhatsApp Business API for notifications
- MercadoPago API for payment processing
- Database for persistent storage
- File storage for any game-related documents

## Non-Functional Requirements

### Performance Targets
- Page load time: < 3 seconds on 3G connection
- Game link sharing: Immediate generation
- Payment processing: < 30 seconds end-to-end
- WhatsApp delivery: < 5 minutes for all notifications

### Scalability Needs
- Concurrent users: Up to 50 (considering 2-3 games with ~20 players each)
- Data volume: Approximately 100 games per year
- Storage: Minimal requirements, text-based data primarily
- Notification volume: ~200 WhatsApp messages per month

### Security Requirements
- Admin authentication with secure password requirements
- HTTPS for all communications
- Secure payment processing via MercadoPago
- Game links with non-guessable tokens
- Phone number privacy protection

### Accessibility Standards
- WCAG 2.1 AA compliance for web interface
- Mobile-responsive design (primary access method)
- Support for Spanish language
- Clear typography and color contrast

## User Experience Requirements

### Information Architecture
```
Admin Dashboard
├── Active Games
│   ├── Create New Game
│   ├── Edit Game
│   └── Manage Registration
├── Game History
│   ├── Past Games List
│   ├── Game Details
│   └── Player History
├── Statistics
│   ├── Financial Overview
│   ├── Player Statistics
│   └── Game Frequency
└── Account Settings

Friend Interface
├── Game Registration
│   ├── Game Details View
│   ├── Registration Form
│   └── Confirmation
└── Payment Interface
    ├── Payment Link
    └── Payment Confirmation
```

### Progressive Disclosure Strategy
- Show essential game info first (date, time, players needed)
- Expand to show additional details on request
- Admin features organized by frequency of use
- Payment flow streamlined to essential steps only

### Error Prevention Mechanisms
- Date validation prevents past dates
- Player limit validation prevents impossible configurations
- Duplicate registration prevention
- Payment amount verification
- Network error handling with retry mechanisms

### Feedback Patterns
- Immediate feedback for all user actions
- Loading states for all async operations
- Success confirmations for critical actions
- Clear error messages with recovery suggestions
- WhatsApp delivery confirmation indicators

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Sprint 1.1: Core Setup**
- [ ] Project setup and deployment pipeline
- [ ] Database schema implementation
- [ ] Admin authentication system (F001)
- [ ] Basic admin dashboard layout

**Sprint 1.2: Game Management**
- [ ] Game creation functionality (F002)
- [ ] Game editing and cancellation (F003)
- [ ] Shareable link generation
- [ ] Basic game listing for admins

### Phase 2: Core Functionality (Weeks 3-4)
**Sprint 2.1: Friend Experience**
- [ ] Friend registration system (F005)
- [ ] Game details view for friends
- [ ] Registration management interface
- [ ] Manual and random team assignment (F004)

**Sprint 2.2: Communication**
- [ ] WhatsApp integration setup (F006)
- [ ] Notification templates creation
- [ ] Basic notification sending (game reminders)

### Phase 3: Payment and Post-Game (Weeks 5-6)
**Sprint 3.1: Payment Integration**
- [ ] MercadoPago integration (F008)
- [ ] Payment link generation
- [ ] Payment confirmation handling
- [ ] Payment status tracking

**Sprint 3.2: Post-Game Management**
- [ ] Post-game admin interface (F007)
- [ ] Result recording functionality
- [ ] Payment tracking and reminders
- [ ] Complete notification flow

### Phase 4: Analytics and Polish (Weeks 7-8)
**Sprint 4.1: History and Statistics**
- [ ] Game history interface (F009)
- [ ] Statistics dashboard
- [ ] Data export functionality
- [ ] Performance optimization

**Sprint 4.2: Testing and Launch**
- [ ] End-to-end testing
- [ ] User acceptance testing with Santiago and Agustin
- [ ] Bug fixes and performance improvements
- [ ] Production deployment and monitoring

## Critical Questions Checklist

- [x] Are there existing solutions we're improving upon?
  *Answer: This is a custom solution for a specific field, not competing with general booking platforms*

- [x] What's the minimum viable version?
  *Answer: Game creation, friend registration, basic notifications, and payment tracking*

- [x] What are the potential risks or unintended consequences?
  *Answer: WhatsApp API restrictions, MercadoPago integration complexity, user adoption challenges*

- [x] Have we considered platform-specific requirements?
  *Answer: Argentine market focus (Spanish language, MercadoPago, WhatsApp prevalence)*

## Final Notes

This documentation provides a comprehensive foundation for developing the Cancha Leconte web application. The scope is intentionally limited to the specific requirements mentioned in the original idea, ensuring the project remains simple and manageable while solving the core problems faced by Santiago and Agustin in organizing their soccer games.

The prioritization focuses on delivering core functionality first (P0 features), followed by important enhancements (P1), and nice-to-have features (P2) that can be implemented if time and resources allow.

All technical decisions should prioritize simplicity, reliability, and ease of maintenance, given this is a personal project for a specific use case rather than a scalable commercial platform.