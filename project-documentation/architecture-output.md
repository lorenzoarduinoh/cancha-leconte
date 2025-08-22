# Arquitectura Técnica: Sistema de Edición de Nombres de Equipos

## Executive Summary

Esta arquitectura define una solución completa para implementar la funcionalidad de edición inline de nombres de equipos en el sistema Cancha Leconte. La solución permite a los administradores personalizar los nombres "Equipo A" y "Equipo B" con nombres custom que persistan en la base de datos y se reflejen en tiempo real en toda la aplicación.

### Tecnologías Core
- **Backend**: Next.js API Routes con Supabase PostgreSQL
- **Frontend**: React con TypeScript y Tailwind CSS
- **Estado**: React hooks locales con optimistic updates
- **Validación**: Zod schemas para consistencia client/server
- **Real-time**: Refetch automático después de cambios

### Componentes del Sistema
- Migración de base de datos para team names
- API endpoints para CRUD de team names
- Componente EditableTeamName para edición inline
- Actualizaciones en TeamManagement y GameResultForm
- Validaciones robustas y manejo de errores
- **Deployment:** Vercel with automatic deployments and edge optimization
- **Integrations:** WhatsApp Business Cloud API and MercadoPago for Argentine market requirements
- **State Management:** React Context + useReducer for application state management

### System Component Overview
- **Admin Dashboard:** Secure game management interface for Santiago and Agustin
- **Friend Registration:** Public game registration system accessible via shareable links
- **Payment System:** Automated MercadoPago integration with payment tracking
- **Notification Engine:** WhatsApp messaging for game reminders and payment requests
- **Analytics Dashboard:** Game history and financial statistics

### Critical Technical Constraints
- Only 2 admin users with authentication required
- Public friend registration without user authentication (security via game tokens)
- Argentine market focus (Spanish language, MercadoPago, WhatsApp)
- Mobile-first design for primary user access
- Real-time updates for registration status

---

## Technology Stack Architecture

### Frontend Architecture
**Framework:** Next.js 15.4.6 with TypeScript
- Server-side rendering for improved SEO and performance
- Built-in API routes eliminating need for separate backend
- Automatic code splitting and optimization
- TypeScript for type safety and improved developer experience

**Styling:** Tailwind CSS 4
- Utility-first approach for rapid development
- Mobile-first responsive design methodology
- Consistent design system with minimal custom CSS
- Excellent performance with purging unused styles
- **Responsive Breakpoints**: 320px+, 768px, 1024px, 1440px+ as per design specs
- **WhatsApp Browser Optimization**: Specific handling for in-app browser constraints

**State Management:** React Context + useReducer + Real-time Subscriptions
- Context providers for game state, admin auth, and notifications
- useReducer for complex state transitions (game status, payment flow)
- Local state with useState for component-specific data
- **Real-time state synchronization** via WebSocket connections
- **Performance optimized state updates** with debouncing and batching

**Animation & Motion:** CSS Transitions + Framer Motion
- Loading states with skeleton screens and spinners
- Success animations for completed actions (500ms duration)
- Form validation micro-interactions (200ms transitions)
- Page transitions and modal animations (300-400ms)
- Mobile-optimized touch interactions and gestures

### Backend Architecture
**Database & Backend:** Supabase + Real-time Infrastructure
- Managed PostgreSQL database with ACID compliance
- Built-in authentication system for admin users
- Row Level Security (RLS) for data protection
- **WebSocket connections** for real-time dashboard updates
- **Real-time player count tracking** with live registration updates
- Edge functions for serverless operations
- Automatic backups and connection pooling
- **Performance optimized queries** with proper indexing for <3s dashboard loads

**API Architecture:** RESTful + Real-time with Next.js API Routes
- Server-side validation using Zod schemas
- **Rate limiting middleware**: 5 attempts per 15 minutes for auth, custom limits per endpoint
- **CSRF protection** and security headers enforcement
- Error handling with standardized response formats
- **WebSocket endpoints** for real-time features
- Webhook endpoints for MercadoPago and WhatsApp integrations
- **Performance targets**: <3s dashboard, <2min payment completion, <30s registration

### Infrastructure Foundation
**Hosting:** Vercel
- Automatic deployments from Git repository
- Global edge network for optimal performance
- Built-in analytics and monitoring
- Environment variable management
- Preview deployments for testing

**Environment Strategy:**
- **Development:** Local development with Supabase cloud instance
- **Staging:** Vercel preview deployments with staging environment variables
- **Production:** Vercel production deployment with production Supabase project

---

## System Component Design

### Core Components

#### 1. Authentication Service
**Responsibilities:**
- Admin user authentication (Santiago & Agustin only)
- Session management and token validation
- Protected route access control

**Interfaces:**
- Supabase Auth integration
- Custom middleware for route protection
- Session persistence across browser sessions

#### 2. Game Management Service
**Responsibilities:**
- Game CRUD operations with validation
- Shareable link generation using secure tokens
- Game state management (draft, open, closed, completed)
- Team assignment (manual and automatic)

**Communication Patterns:**
- Direct database operations via Supabase client
- Real-time updates via Supabase subscriptions
- State synchronization across admin and public interfaces

#### 3. Registration Service
**Responsibilities:**
- Friend registration without authentication
- Player validation and duplicate prevention
- Registration status tracking
- Waiting list management when games are full

**Data Flow:**
- Public endpoints accessible via game tokens
- Real-time registration updates to admin dashboard
- Validation against game capacity limits

#### 4. Payment Processing Service
**Responsibilities:**
- MercadoPago payment link generation
- Payment status tracking and updates
- Webhook handling for payment confirmations
- Payment reminder logic

**Integration Architecture:**
- Server-side payment creation for security
- Webhook endpoints for payment status updates
- Secure payment data handling via MercadoPago

#### 5. Notification Engine
**Responsibilities:**
- WhatsApp message sending via Business Cloud API
- Message template management
- Delivery status tracking
- Automated scheduling for reminders

**Event-Driven Architecture:**
- Game creation triggers invitation notifications
- Payment completion stops reminder notifications
- Game updates trigger change notifications

### Integration Architecture

#### External Service Integrations
1. **WhatsApp Business Cloud API**
   - Template-based messaging for compliance
   - Webhook endpoints for delivery status
   - Rate limiting compliance
   - Phone number validation for Argentine format
   - **Message delivery tracking** with retry mechanisms

2. **MercadoPago SDK Integration**
   - **Payment preference creation** with game context
   - **Secure checkout URL generation** with proper validation
   - **Webhook signature verification** for payment notifications
   - **Payment status synchronization** with automatic admin updates
   - **Security validation** with HTTPS enforcement
   - **Error handling** for payment failures and retries
   - **Mobile-optimized payment flow** for WhatsApp browser

3. **Real-time Communication**
   - WebSocket connections for live dashboard updates
   - Server-sent events for payment status changes
   - Real-time player registration notifications
   - Connection management with automatic reconnection

#### Inter-Service Communication
- Synchronous API calls for immediate operations
- Database triggers for automated workflows
- Real-time subscriptions for live updates
- Event-driven patterns for notifications

---

## Real-time Features Architecture

### WebSocket Integration Specifications

#### Connection Management
```typescript
// WebSocket service for real-time updates
class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: Map<string, Function[]> = new Map();
  
  connect(userId: string, userType: 'admin' | 'public') {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?userId=${userId}&type=${userType}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      this.handleReconnect();
    };
  }
  
  subscribe(channel: string, callback: Function) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel)!.push(callback);
  }
  
  private handleMessage(data: any) {
    const { channel, payload } = data;
    const callbacks = this.subscribers.get(channel) || [];
    callbacks.forEach(callback => callback(payload));
  }
  
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(/* previous params */);
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }
}
```

#### Real-time Event Types
```typescript
interface RealtimeEvent {
  channel: string;
  event: string;
  payload: any;
  timestamp: Date;
}

// Dashboard real-time events
type DashboardEvent = 
  | { event: 'player_registered'; payload: { gameId: string; playerCount: number; playerName: string } }
  | { event: 'player_cancelled'; payload: { gameId: string; playerCount: number; playerName: string } }
  | { event: 'payment_completed'; payload: { gameId: string; playerId: string; amount: number } }
  | { event: 'game_status_changed'; payload: { gameId: string; status: string; updatedBy: string } }
  | { event: 'registration_deadline_reached'; payload: { gameId: string; finalPlayerCount: number } };

// Public registration events
type RegistrationEvent = 
  | { event: 'game_full'; payload: { gameId: string; waitingListPosition?: number } }
  | { event: 'spot_available'; payload: { gameId: string; availableSpots: number } }
  | { event: 'game_cancelled'; payload: { gameId: string; reason: string } }
  | { event: 'game_updated'; payload: { gameId: string; changes: any } };
```

#### Performance Optimization
```typescript
// Debounced updates for high-frequency events
class RealtimeManager {
  private updateQueue: Map<string, any> = new Map();
  private updateTimeout: NodeJS.Timeout | null = null;
  
  queueUpdate(key: string, data: any) {
    this.updateQueue.set(key, data);
    
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateTimeout = setTimeout(() => {
      this.flushUpdates();
    }, 250); // 250ms debounce
  }
  
  private flushUpdates() {
    this.updateQueue.forEach((data, key) => {
      this.broadcastUpdate(key, data);
    });
    this.updateQueue.clear();
  }
  
  private broadcastUpdate(channel: string, data: any) {
    // Send to all connected clients in channel
    this.connectedClients
      .filter(client => client.channels.includes(channel))
      .forEach(client => {
        client.send(JSON.stringify({ channel, payload: data }));
      });
  }
}
```

### Live Dashboard Implementation

#### Real-time Data Hooks
```typescript
// Custom hook for real-time dashboard data
export function useRealtimeDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const realtimeService = useRealtimeService();
  
  useEffect(() => {
    // Subscribe to dashboard events
    realtimeService.subscribe('dashboard', (data: DashboardEvent) => {
      setDashboardData(prev => {
        if (!prev) return prev;
        
        switch (data.event) {
          case 'player_registered':
            return updateGamePlayerCount(prev, data.payload.gameId, data.payload.playerCount);
          case 'payment_completed':
            return updatePaymentStatus(prev, data.payload);
          case 'game_status_changed':
            return updateGameStatus(prev, data.payload.gameId, data.payload.status);
          default:
            return prev;
        }
      });
    });
    
    // Initial data load
    loadDashboardData().then(setDashboardData);
    
    return () => {
      realtimeService.unsubscribe('dashboard');
    };
  }, [realtimeService]);
  
  return { dashboardData, isConnected };
}

// Real-time game registration hook
export function useRealtimeGameRegistrations(gameId: string) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('open');
  const realtimeService = useRealtimeService();
  
  useEffect(() => {
    realtimeService.subscribe(`game:${gameId}`, (data: RegistrationEvent) => {
      switch (data.event) {
        case 'player_registered':
          setRegistrations(prev => [...prev, data.payload]);
          break;
        case 'player_cancelled':
          setRegistrations(prev => prev.filter(r => r.id !== data.payload.playerId));
          break;
        case 'game_full':
          setGameStatus('full');
          break;
        case 'spot_available':
          setGameStatus('open');
          break;
      }
    });
    
    return () => {
      realtimeService.unsubscribe(`game:${gameId}`);
    };
  }, [gameId, realtimeService]);
  
  return { registrations, gameStatus };
}
```

#### Connection State Management
```typescript
// Connection status indicator component
export function ConnectionStatus() {
  const { isConnected, connectionQuality } = useRealtimeService();
  
  return (
    <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-dot" />
      <span className="status-text">
        {isConnected ? 'En vivo' : 'Reconectando...'}
      </span>
      {connectionQuality && (
        <div className="quality-bars">
          {[1, 2, 3].map(bar => (
            <div 
              key={bar}
              className={`bar ${connectionQuality >= bar ? 'active' : 'inactive'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Mobile Real-time Optimization

#### Background Connection Management
```typescript
// Handle mobile browser background/foreground
class MobileRealtimeManager {
  private backgroundTime: number = 0;
  private isInBackground: boolean = false;
  
  constructor(private realtimeService: RealtimeService) {
    this.setupVisibilityHandlers();
  }
  
  private setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleBackground();
      } else {
        this.handleForeground();
      }
    });
    
    // WhatsApp browser specific events
    window.addEventListener('blur', () => this.handleBackground());
    window.addEventListener('focus', () => this.handleForeground());
  }
  
  private handleBackground() {
    this.isInBackground = true;
    this.backgroundTime = Date.now();
    
    // Reduce connection frequency for battery conservation
    this.realtimeService.setHeartbeatInterval(30000); // 30 seconds
  }
  
  private handleForeground() {
    this.isInBackground = false;
    const backgroundDuration = Date.now() - this.backgroundTime;
    
    // Restore normal frequency
    this.realtimeService.setHeartbeatInterval(5000); // 5 seconds
    
    // If backgrounded for >5 minutes, force refresh
    if (backgroundDuration > 300000) {
      this.realtimeService.forceReconnect();
    }
  }
}
```

---

## Database Schema Specifications

### Core Entities

#### Users Table (Admin Authentication)
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
```

#### Games Table
```sql
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  min_players INTEGER NOT NULL CHECK (min_players > 0),
  max_players INTEGER NOT NULL CHECK (max_players >= min_players),
  field_cost_per_player DECIMAL(10,2) NOT NULL CHECK (field_cost_per_player > 0),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled')),
  share_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  teams_assigned_at TIMESTAMP WITH TIME ZONE,
  results_recorded_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_share_token ON games(share_token);
CREATE INDEX idx_games_created_by ON games(created_by);

-- RLS Policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage games" ON games FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Public can read games via token" ON games FOR SELECT USING (true);
```

#### Game Registrations Table
```sql
CREATE TABLE game_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  player_phone VARCHAR(20) NOT NULL,
  team_assignment VARCHAR(10) CHECK (team_assignment IN ('team_a', 'team_b')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id VARCHAR(255),
  payment_amount DECIMAL(10,2),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(game_id, player_phone)
);

-- Indexes
CREATE INDEX idx_registrations_game_id ON game_registrations(game_id);
CREATE INDEX idx_registrations_payment_status ON game_registrations(payment_status);
CREATE INDEX idx_registrations_phone ON game_registrations(player_phone);

-- RLS Policies
ALTER TABLE game_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage registrations" ON game_registrations FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Public can register for games" ON game_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read own registration" ON game_registrations FOR SELECT USING (true);
```

#### Game Results Table
```sql
CREATE TABLE game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  team_a_score INTEGER DEFAULT 0 CHECK (team_a_score >= 0),
  team_b_score INTEGER DEFAULT 0 CHECK (team_b_score >= 0),
  winning_team VARCHAR(10) CHECK (winning_team IN ('team_a', 'team_b', 'draw')),
  notes TEXT,
  recorded_by UUID REFERENCES users(id) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_results_game_id ON game_results(game_id);

-- RLS Policies
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage results" ON game_results FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('game_reminder', 'payment_request', 'payment_reminder', 'game_update', 'game_cancelled')),
  message_content TEXT NOT NULL,
  whatsapp_message_id VARCHAR(255),
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_game_id ON notifications(game_id);
CREATE INDEX idx_notifications_status ON notifications(delivery_status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

### Database Relationships
- Users (1) → Games (many) via created_by
- Games (1) → Game Registrations (many) via game_id
- Games (1) → Game Results (1) via game_id
- Games (1) → Notifications (many) via game_id
- Users (1) → Game Results (many) via recorded_by

### Performance Optimization
- Composite indexes on frequently queried columns
- Partial indexes for active games and pending payments
- Connection pooling via Supabase
- Query optimization for statistics and reporting

---

## API Architecture Specifications

### Authentication Endpoints

#### POST /api/auth/login
```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response
interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Status Codes: 200 (success), 401 (invalid credentials), 429 (rate limited)
```

#### POST /api/auth/logout
```typescript
// Request: No body required (uses session cookie)
// Response: 200 (success), 401 (not authenticated)
```

#### GET /api/auth/session
```typescript
// Response
interface SessionResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
  authenticated: boolean;
}
```

### Game Management Endpoints

#### GET /api/games
```typescript
// Query Parameters
interface GamesQuery {
  status?: 'draft' | 'open' | 'closed' | 'completed' | 'cancelled';
  limit?: number;
  offset?: number;
}

// Response
interface GamesResponse {
  games: Game[];
  total: number;
  hasMore: boolean;
}

interface Game {
  id: string;
  title: string;
  description?: string;
  game_date: string;
  min_players: number;
  max_players: number;
  field_cost_per_player: number;
  status: string;
  current_players: number;
  created_at: string;
  updated_at: string;
}
```

#### POST /api/games
```typescript
// Request
interface CreateGameRequest {
  title: string;
  description?: string;
  game_date: string; // ISO 8601
  min_players: number;
  max_players: number;
  field_cost_per_player: number;
}

// Response
interface CreateGameResponse {
  game: Game & {
    share_token: string;
    share_url: string;
  };
}

// Status Codes: 201 (created), 400 (validation error), 401 (unauthorized)
```

#### PUT /api/games/[id]
```typescript
// Request: Same as CreateGameRequest
// Response: Updated Game object
// Status Codes: 200 (updated), 400 (validation error), 401 (unauthorized), 404 (not found)
```

#### DELETE /api/games/[id]
```typescript
// Response: 204 (deleted), 401 (unauthorized), 404 (not found)
```

### Registration Endpoints

#### GET /api/games/[token]/details
```typescript
// Response
interface GameDetailsResponse {
  game: {
    id: string;
    title: string;
    description?: string;
    game_date: string;
    min_players: number;
    max_players: number;
    field_cost_per_player: number;
    status: string;
    current_players: number;
    registrations: {
      player_name: string;
      team_assignment?: string;
    }[];
  };
}

// Status Codes: 200 (success), 404 (invalid token)
```

#### POST /api/games/[token]/register
```typescript
// Request
interface RegisterRequest {
  player_name: string;
  player_phone: string;
}

// Response
interface RegisterResponse {
  registration: {
    id: string;
    player_name: string;
    registered_at: string;
    position: number; // Position in list or waiting list
  };
  game_full: boolean;
  waiting_list_position?: number;
}

// Status Codes: 201 (registered), 400 (validation error), 409 (already registered), 422 (game closed)
```

#### DELETE /api/games/[token]/register/[phone]
```typescript
// Response: 204 (cancelled), 404 (not found), 422 (registration closed)
```

### Team Management Endpoints

#### POST /api/games/[id]/teams/assign
```typescript
// Request
interface AssignTeamsRequest {
  method: 'random' | 'manual';
  manual_assignments?: {
    [registrationId: string]: 'team_a' | 'team_b';
  };
}

// Response
interface TeamsResponse {
  team_a: Registration[];
  team_b: Registration[];
  assignment_method: string;
  assigned_at: string;
}
```

### Payment Endpoints

#### POST /api/games/[id]/payments/create
```typescript
// Request
interface CreatePaymentRequest {
  registration_id: string;
}

// Response
interface PaymentResponse {
  payment_url: string;
  payment_id: string;
  amount: number;
  expires_at: string;
}
```

#### POST /api/webhooks/mercadopago
```typescript
// Webhook payload handling for payment status updates
// Response: 200 (processed), 400 (invalid payload)
```

### Notification Endpoints

#### POST /api/notifications/send
```typescript
// Request
interface SendNotificationRequest {
  game_id: string;
  message_type: 'game_reminder' | 'payment_request' | 'payment_reminder' | 'game_update' | 'game_cancelled';
  recipient_phones?: string[]; // If not provided, sends to all registered players
  custom_message?: string; // For game updates or cancellations
}

// Response
interface NotificationResponse {
  notifications_sent: number;
  failed_notifications: string[];
  message_ids: string[];
}
```

#### POST /api/webhooks/whatsapp
```typescript
// Webhook payload handling for WhatsApp delivery status
// Response: 200 (processed), 400 (invalid payload)
```

### Real-time WebSocket Endpoints

#### WS /api/ws/dashboard
```typescript
// Admin dashboard real-time updates
interface DashboardConnection {
  connectionId: string;
  userId: string;
  userType: 'admin';
  channels: string[];
}

// Subscription message format
interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  channel: string;
}

// Dashboard update events
interface DashboardUpdate {
  channel: 'dashboard';
  event: 'player_registered' | 'payment_completed' | 'game_status_changed';
  payload: any;
  timestamp: string;
}
```

#### WS /api/ws/game/[token]
```typescript
// Public game real-time updates
interface GameConnection {
  connectionId: string;
  gameToken: string;
  channels: string[];
}

// Game update events
interface GameUpdate {
  channel: string; // 'game:{gameId}'
  event: 'player_registered' | 'game_full' | 'spot_available' | 'game_cancelled';
  payload: any;
  timestamp: string;
}
```

### Enhanced Payment Endpoints

#### POST /api/payments/create
```typescript
// Request
interface CreatePaymentRequest {
  registration_id: string;
  payment_context?: {
    source: 'whatsapp' | 'web' | 'admin';
    user_agent?: string;
  };
}

// Response
interface PaymentResponse {
  payment_url: string;
  payment_id: string;
  amount: number;
  expires_at: string;
  sandbox_init_point?: string; // For testing
  qr_code?: string; // QR code for mobile payments
}
```

#### GET /api/payments/[id]/status
```typescript
// Response
interface PaymentStatusResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  status_detail: string;
  external_reference: string;
  amount: number;
  currency: string;
  date_created: string;
  date_last_updated: string;
  payment_method: string;
  installments: number;
  notification_url: string;
}
```

#### POST /api/webhooks/mercadopago/[type]
```typescript
// Enhanced webhook handler with type-specific processing
interface MercadoPagoWebhookRequest {
  action: 'payment.created' | 'payment.updated' | 'plan.updated';
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: 'payment' | 'plan' | 'subscription';
  user_id: string;
}

// Response with detailed processing
interface WebhookResponse {
  status: 'processed' | 'ignored' | 'error';
  message: string;
  processing_time_ms: number;
  actions_taken: string[];
}
```

### Mobile-Optimized API Endpoints

#### POST /api/mobile/register
```typescript
// Mobile-optimized registration with reduced payload
interface MobileRegisterRequest {
  game_token: string;
  player_name: string;
  player_phone: string;
  device_info?: {
    user_agent: string;
    is_whatsapp_browser: boolean;
    viewport_width: number;
  };
}

// Optimized response for mobile
interface MobileRegisterResponse {
  success: boolean;
  registration_id: string;
  position: number;
  game_full: boolean;
  waiting_list_position?: number;
  next_steps: {
    payment_required: boolean;
    payment_deadline?: string;
    whatsapp_group_invite?: string;
  };
}
```

#### GET /api/mobile/game/[token]/lite
```typescript
// Lite version of game details for slow connections
interface LiteGameResponse {
  id: string;
  title: string;
  game_date: string;
  location: string;
  cost_per_player: number;
  current_players: number;
  max_players: number;
  status: 'open' | 'closed' | 'full' | 'cancelled';
  registration_deadline?: string;
  essential_info_only: true;
}
```

### Performance Monitoring Endpoints

#### POST /api/monitoring/performance
```typescript
// Performance metrics collection
interface PerformanceMetric {
  operation: string;
  duration: number;
  threshold: number;
  timestamp: string;
  user_agent: string;
  url: string;
  user_id?: string;
  additional_context?: {
    connection_type?: string;
    device_memory?: number;
    is_mobile?: boolean;
  };
}
```

#### POST /api/monitoring/accessibility
```typescript
// Accessibility violation reporting
interface AccessibilityViolation {
  type: 'color-contrast' | 'keyboard-access' | 'touch-target' | 'screen-reader';
  severity: 'error' | 'warning' | 'info';
  element_selector: string;
  message: string;
  url: string;
  timestamp: string;
  user_agent: string;
  remediation_suggestion?: string;
}
```

### Security and Audit Endpoints

#### POST /api/security/events
```typescript
// Security event logging
interface SecurityEvent {
  event_type: 'rate_limit_exceeded' | 'suspicious_session' | 'invalid_token' | 'payment_fraud_attempt';
  identifier: string; // IP, user ID, session ID
  rule?: string;
  timestamp: string;
  additional_data?: {
    user_agent?: string;
    ip_address?: string;
    request_path?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
}
```

#### GET /api/admin/audit/log
```typescript
// Admin action audit log
interface AuditLogResponse {
  events: {
    id: string;
    action: string;
    user_id: string;
    timestamp: string;
    resource_type: 'game' | 'player' | 'payment' | 'notification';
    resource_id?: string;
    changes?: any;
    ip_address: string;
    user_agent: string;
  }[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}
```

### Statistics Endpoints

#### GET /api/statistics/overview
```typescript
// Enhanced statistics with performance metrics
interface StatisticsResponse {
  total_games: number;
  games_this_month: number;
  total_revenue: number;
  revenue_this_month: number;
  unique_players: number;
  average_players_per_game: number;
  payment_completion_rate: number;
  most_active_players: {
    player_name: string;
    games_played: number;
  }[];
  
  // Performance metrics
  performance_metrics: {
    average_dashboard_load_time: number;
    average_registration_time: number;
    average_payment_time: number;
    mobile_usage_percentage: number;
    whatsapp_browser_percentage: number;
  };
  
  // Real-time metrics
  real_time_stats: {
    active_connections: number;
    events_per_minute: number;
    connection_success_rate: number;
  };
}
```

#### GET /api/statistics/accessibility
```typescript
// Accessibility compliance metrics
interface AccessibilityStats {
  compliance_score: number; // 0-100
  violations_by_type: {
    [key: string]: number;
  };
  improvements_over_time: {
    date: string;
    score: number;
  }[];
  most_common_issues: {
    type: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
  }[];
}
```

### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

### Authentication Architecture
- Cookie-based sessions for admin authentication
- JWT tokens from Supabase Auth
- Middleware for protecting admin routes
- Public endpoints secured via game tokens
- Rate limiting on all public endpoints

---

## Accessibility and Inclusive Design Architecture

### WCAG AA Compliance Implementation

#### Accessibility Standards Framework
```typescript
// Accessibility testing and validation service
class AccessibilityValidator {
  private violations: AccessibilityViolation[] = [];
  
  async validatePage(element: HTMLElement): Promise<AccessibilityReport> {
    const violations: AccessibilityViolation[] = [];
    
    // Color contrast validation
    violations.push(...await this.validateColorContrast(element));
    
    // Keyboard navigation validation
    violations.push(...await this.validateKeyboardAccess(element));
    
    // Screen reader validation
    violations.push(...await this.validateScreenReader(element));
    
    // Touch target validation
    violations.push(...await this.validateTouchTargets(element));
    
    return {
      violations,
      passed: violations.length === 0,
      level: this.calculateComplianceLevel(violations)
    };
  }
  
  private async validateColorContrast(element: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];
    const textElements = element.querySelectorAll('*');
    
    for (const el of textElements) {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      const ratio = this.calculateContrastRatio(color, backgroundColor);
      
      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      const isLargeText = this.isLargeText(styles);
      const requiredRatio = isLargeText ? 3 : 4.5;
      
      if (ratio < requiredRatio) {
        violations.push({
          type: 'color-contrast',
          element: el,
          message: `Insufficient color contrast: ${ratio.toFixed(2)}:1 (required: ${requiredRatio}:1)`,
          severity: 'error'
        });
      }
    }
    
    return violations;
  }
  
  private async validateKeyboardAccess(element: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];
    const interactiveElements = element.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex], [role="button"], [role="link"]'
    );
    
    for (const el of interactiveElements) {
      // Check if element is focusable
      if (!this.isFocusable(el as HTMLElement)) {
        violations.push({
          type: 'keyboard-access',
          element: el,
          message: 'Interactive element is not keyboard accessible',
          severity: 'error'
        });
      }
      
      // Check focus indicators
      if (!this.hasFocusIndicator(el as HTMLElement)) {
        violations.push({
          type: 'focus-indicator',
          element: el,
          message: 'Element lacks visible focus indicator',
          severity: 'warning'
        });
      }
    }
    
    return violations;
  }
  
  private async validateTouchTargets(element: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];
    const touchTargets = element.querySelectorAll('button, input, select, a, [role="button"]');
    
    for (const target of touchTargets) {
      const rect = target.getBoundingClientRect();
      const minSize = 44; // 44px minimum per WCAG guidelines
      
      if (rect.width < minSize || rect.height < minSize) {
        violations.push({
          type: 'touch-target',
          element: target,
          message: `Touch target too small: ${rect.width}×${rect.height}px (minimum: ${minSize}×${minSize}px)`,
          severity: 'error'
        });
      }
    }
    
    return violations;
  }
}
```

#### Screen Reader Optimization
```typescript
// Screen reader optimization utilities
class ScreenReaderOptimizer {
  setupLiveRegions(): void {
    // Create ARIA live regions for dynamic content
    this.createLiveRegion('notifications', 'polite');
    this.createLiveRegion('alerts', 'assertive');
    this.createLiveRegion('status', 'polite');
  }
  
  private createLiveRegion(id: string, politeness: 'polite' | 'assertive'): void {
    const region = document.createElement('div');
    region.id = `live-${id}`;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    
    document.body.appendChild(region);
  }
  
  announceToScreenReader(message: string, type: 'notification' | 'alert' | 'status' = 'notification'): void {
    const region = document.getElementById(`live-${type}`);
    if (region) {
      region.textContent = message;
      
      // Clear after announcement to allow repeated messages
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  }
  
  optimizeFormLabels(): void {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    for (const input of inputs) {
      const label = this.findAssociatedLabel(input as HTMLElement);
      if (!label) {
        console.warn('Form input missing associated label:', input);
      }
      
      // Add aria-describedby for help text
      const helpText = this.findHelpText(input as HTMLElement);
      if (helpText) {
        const helpId = `${input.id || 'input'}-help`;
        helpText.id = helpId;
        input.setAttribute('aria-describedby', helpId);
      }
    }
  }
  
  private findAssociatedLabel(input: HTMLElement): HTMLLabelElement | null {
    // Check for explicit label association
    const id = input.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement;
      if (label) return label;
    }
    
    // Check for implicit label association (input inside label)
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel;
    
    return null;
  }
}
```

#### Keyboard Navigation Enhancement
```typescript
// Enhanced keyboard navigation manager
class KeyboardNavigationManager {
  private focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="link"]'
  ].join(', ');
  
  setupKeyboardNavigation(): void {
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    this.setupSkipLinks();
    this.setupModalTrapFocus();
  }
  
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'Escape':
        this.handleEscapeKey(event);
        break;
      case 'Enter':
      case ' ':
        this.handleActivation(event);
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        this.handleArrowNavigation(event);
        break;
    }
  }
  
  private setupSkipLinks(): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Saltar al contenido principal';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
  
  private setupModalTrapFocus(): void {
    document.addEventListener('keydown', (event) => {
      const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
      if (modal && event.key === 'Tab') {
        this.trapFocusInModal(event, modal as HTMLElement);
      }
    });
  }
  
  private trapFocusInModal(event: KeyboardEvent, modal: HTMLElement): void {
    const focusableElements = modal.querySelectorAll(this.focusableSelectors);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }
}
```

### Mobile-First Architecture Implementation

#### Responsive Design System
```typescript
// Mobile-first responsive design manager
class ResponsiveDesignManager {
  private breakpoints = {
    mobile: { min: 320, max: 767 },
    tablet: { min: 768, max: 1023 },
    desktop: { min: 1024, max: 1439 },
    wide: { min: 1440, max: Infinity }
  };
  
  private currentBreakpoint: string = 'mobile';
  
  constructor() {
    this.detectBreakpoint();
    this.setupBreakpointListener();
    this.optimizeForCurrentBreakpoint();
  }
  
  private detectBreakpoint(): void {
    const width = window.innerWidth;
    
    for (const [name, { min, max }] of Object.entries(this.breakpoints)) {
      if (width >= min && width <= max) {
        this.currentBreakpoint = name;
        break;
      }
    }
  }
  
  private setupBreakpointListener(): void {
    let resizeTimeout: NodeJS.Timeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const previousBreakpoint = this.currentBreakpoint;
        this.detectBreakpoint();
        
        if (previousBreakpoint !== this.currentBreakpoint) {
          this.onBreakpointChange(previousBreakpoint, this.currentBreakpoint);
        }
      }, 250);
    });
  }
  
  private onBreakpointChange(from: string, to: string): void {
    document.body.setAttribute('data-breakpoint', to);
    this.optimizeForCurrentBreakpoint();
    
    // Emit custom event for components to react
    window.dispatchEvent(new CustomEvent('breakpointChange', {
      detail: { from, to }
    }));
  }
  
  private optimizeForCurrentBreakpoint(): void {
    switch (this.currentBreakpoint) {
      case 'mobile':
        this.applyMobileOptimizations();
        break;
      case 'tablet':
        this.applyTabletOptimizations();
        break;
      case 'desktop':
        this.applyDesktopOptimizations();
        break;
      case 'wide':
        this.applyWideOptimizations();
        break;
    }
  }
  
  private applyMobileOptimizations(): void {
    // Touch-optimized interactions
    document.body.classList.add('touch-optimized');
    
    // Disable hover effects on mobile
    const hoverStyles = document.querySelectorAll('[data-hover-effect]');
    hoverStyles.forEach(el => el.classList.add('no-hover'));
    
    // Optimize form inputs for mobile
    this.optimizeMobileInputs();
    
    // Enable mobile-specific gestures
    this.enableMobileGestures();
  }
  
  private optimizeMobileInputs(): void {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const inputEl = input as HTMLInputElement;
      
      // Add appropriate input modes
      switch (inputEl.type) {
        case 'email':
          inputEl.inputMode = 'email';
          break;
        case 'tel':
          inputEl.inputMode = 'tel';
          break;
        case 'number':
          inputEl.inputMode = 'numeric';
          break;
      }
      
      // Prevent zoom on focus for iOS
      if (inputEl.type !== 'range' && inputEl.type !== 'checkbox') {
        inputEl.style.fontSize = Math.max(16, parseInt(getComputedStyle(inputEl).fontSize)) + 'px';
      }
    });
  }
  
  private enableMobileGestures(): void {
    // Swipe navigation for modals and carousels
    let startX: number, startY: number;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', (e) => {
      if (!startX || !startY) return;
      
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      
      // Detect swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > 50) {
          const direction = deltaX > 0 ? 'right' : 'left';
          this.handleSwipeGesture(direction, e.target as HTMLElement);
        }
      }
    });
  }
  
  private handleSwipeGesture(direction: 'left' | 'right', target: HTMLElement): void {
    // Handle modal dismissal with swipe
    const modal = target.closest('[role="dialog"]');
    if (modal && direction === 'right') {
      const closeButton = modal.querySelector('[data-dismiss="modal"]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
    
    // Handle carousel navigation
    const carousel = target.closest('[data-carousel]');
    if (carousel) {
      const nextButton = carousel.querySelector(`[data-carousel-${direction}]`) as HTMLElement;
      if (nextButton) {
        nextButton.click();
      }
    }
  }
}
```

#### WhatsApp Browser Optimization
```typescript
// WhatsApp-specific browser optimizations
class WhatsAppBrowserOptimizer {
  private isWhatsAppBrowser: boolean = false;
  
  constructor() {
    this.detectWhatsAppBrowser();
    if (this.isWhatsAppBrowser) {
      this.applyWhatsAppOptimizations();
    }
  }
  
  private detectWhatsAppBrowser(): void {
    const userAgent = navigator.userAgent;
    this.isWhatsAppBrowser = /WhatsApp/i.test(userAgent);
    
    if (this.isWhatsAppBrowser) {
      document.body.classList.add('whatsapp-browser');
    }
  }
  
  private applyWhatsAppOptimizations(): void {
    // Disable problematic features
    this.disableProblematicFeatures();
    
    // Optimize memory usage
    this.optimizeMemoryUsage();
    
    // Simplify animations
    this.simplifyAnimations();
    
    // Optimize for single-page flows
    this.optimizeForSinglePage();
  }
  
  private disableProblematicFeatures(): void {
    // Disable smooth scrolling (can be janky in WhatsApp browser)
    document.documentElement.style.scrollBehavior = 'auto';
    
    // Disable complex CSS filters
    const filtersStyle = document.createElement('style');
    filtersStyle.textContent = `
      .whatsapp-browser * {
        filter: none !important;
        backdrop-filter: none !important;
      }
    `;
    document.head.appendChild(filtersStyle);
    
    // Disable sticky positioning (unreliable)
    const stickyElements = document.querySelectorAll('[style*="sticky"], .sticky');
    stickyElements.forEach(el => {
      (el as HTMLElement).style.position = 'relative';
    });
  }
  
  private optimizeMemoryUsage(): void {
    // Reduce image quality
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.src.includes('data:')) {
        img.loading = 'lazy';
      }
    });
    
    // Limit concurrent network requests
    this.implementRequestQueuing();
  }
  
  private simplifyAnimations(): void {
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
      .whatsapp-browser *,
      .whatsapp-browser *::before,
      .whatsapp-browser *::after {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
      }
    `;
    document.head.appendChild(animationStyle);
  }
  
  private optimizeForSinglePage(): void {
    // Prevent navigation away from the current page
    window.addEventListener('beforeunload', (e) => {
      if (this.isImportantFlow()) {
        e.preventDefault();
        e.returnValue = '';
        return '¿Estás seguro de que quieres salir?';
      }
    });
    
    // Optimize for back button behavior
    this.optimizeBackButtonBehavior();
  }
  
  private isImportantFlow(): boolean {
    const currentPath = window.location.pathname;
    const importantPaths = ['/payment/', '/register/', '/games/'];
    
    return importantPaths.some(path => currentPath.includes(path));
  }
  
  private optimizeBackButtonBehavior(): void {
    // Handle back button to prevent unexpected navigation
    window.addEventListener('popstate', (e) => {
      if (this.isImportantFlow()) {
        // Push current state back to prevent navigation
        history.pushState(null, '', window.location.href);
        
        // Show confirmation dialog
        const shouldLeave = confirm('¿Seguro que quieres salir? Perderás el progreso actual.');
        if (shouldLeave) {
          window.location.href = 'whatsapp://';
        }
      }
    });
    
    // Initialize history state
    history.pushState(null, '', window.location.href);
  }
}
```

---

## Component Architecture

### React Component Hierarchy

#### Admin Dashboard Structure
```
AdminDashboard/
├── AuthGuard
├── Navigation/
│   ├── Sidebar
│   ├── TopBar
│   └── MobileMenu
├── Dashboard/
│   ├── StatsOverview
│   ├── QuickActions
│   └── RecentGames
├── Games/
│   ├── GamesList
│   ├── GameCard
│   ├── CreateGameForm
│   ├── EditGameForm
│   └── GameDetails/
│       ├── RegistrationsList
│       ├── TeamsView
│       ├── PaymentStatus
│       └── GameActions
├── Statistics/
│   ├── OverviewStats
│   ├── RevenueChart
│   ├── PlayerStats
│   └── ExportData
└── Settings/
    ├── ProfileSettings
    ├── NotificationSettings
    └── SystemSettings
```

#### Public Registration Structure
```
PublicRegistration/
├── GameInfo/
│   ├── GameHeader
│   ├── GameDetails
│   └── PlayersList
├── RegistrationForm/
│   ├── PlayerForm
│   ├── ValidationErrors
│   └── SubmissionState
├── RegistrationSuccess/
│   ├── ConfirmationMessage
│   ├── GameReminder
│   └── ContactInfo
└── GameFull/
    ├── WaitingListInfo
    └── WaitingListForm
```

### State Management Patterns

#### Context Providers Structure
```typescript
// App-level providers
<AuthProvider>
  <GameProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </GameProvider>
</AuthProvider>

// AuthContext
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' };

// GameContext
interface GameState {
  games: Game[];
  currentGame: Game | null;
  registrations: Registration[];
  loading: boolean;
  error: string | null;
  filters: {
    status: string;
    dateRange: [Date, Date];
  };
}

type GameAction =
  | { type: 'FETCH_GAMES_START' }
  | { type: 'FETCH_GAMES_SUCCESS'; payload: Game[] }
  | { type: 'FETCH_GAMES_ERROR'; payload: string }
  | { type: 'CREATE_GAME_SUCCESS'; payload: Game }
  | { type: 'UPDATE_GAME_SUCCESS'; payload: Game }
  | { type: 'DELETE_GAME_SUCCESS'; payload: string }
  | { type: 'SET_CURRENT_GAME'; payload: Game | null }
  | { type: 'UPDATE_REGISTRATIONS'; payload: Registration[] }
  | { type: 'SET_FILTERS'; payload: Partial<GameState['filters']> };

// NotificationContext
interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'CLEAR_ALL' };
```

#### Real-time State Synchronization
```typescript
// Real-time subscriptions using Supabase
useEffect(() => {
  const gameSubscription = supabase
    .channel('games-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'games' },
      (payload) => {
        dispatch({ type: 'SYNC_GAME_CHANGE', payload });
      }
    )
    .subscribe();

  const registrationSubscription = supabase
    .channel('registrations-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'game_registrations' },
      (payload) => {
        dispatch({ type: 'SYNC_REGISTRATION_CHANGE', payload });
      }
    )
    .subscribe();

  return () => {
    gameSubscription.unsubscribe();
    registrationSubscription.unsubscribe();
  };
}, []);
```

### Reusable Component Library

#### Core Components
```typescript
// Form Components
<Input 
  type="text" 
  label="Player Name" 
  error={errors.name}
  required 
/>

<DateTimePicker 
  value={gameDate}
  onChange={setGameDate}
  minDate={new Date()}
  label="Game Date & Time"
/>

<PhoneInput 
  value={phone}
  onChange={setPhone}
  country="AR"
  placeholder="11 1234 5678"
/>

// Display Components
<GameCard 
  game={game}
  onEdit={handleEdit}
  onDelete={handleDelete}
  showActions={isAdmin}
/>

<PlayersList 
  players={registrations}
  showTeams={teamsAssigned}
  showPaymentStatus={gameCompleted}
/>

<PaymentStatus 
  status={paymentStatus}
  amount={amount}
  onMarkPaid={handleMarkPaid}
/>

// Layout Components
<PageHeader 
  title="Game Management"
  actions={<CreateGameButton />}
/>

<LoadingSpinner size="lg" />

<ErrorBoundary fallback={<ErrorFallback />}>
  <GameDetails />
</ErrorBoundary>
```

#### Component Design Patterns
- **Compound Components:** Complex components with multiple related parts
- **Render Props:** Flexible components that accept functions for custom rendering
- **Higher-Order Components:** Authentication and permission wrappers
- **Custom Hooks:** Reusable logic for API calls, form handling, and state management

### Performance Optimization
- React.memo for expensive renders
- useMemo for complex calculations
- useCallback for stable function references
- Lazy loading for large components
- Virtual scrolling for long lists
- Optimistic updates for better UX

---

## Performance Requirements and Optimization

### Performance Targets (From Design Specifications)

#### Critical Performance Metrics
```typescript
interface PerformanceTargets {
  // Dashboard Performance
  dashboardInitialLoad: 3000; // ms - Complete dashboard load
  dashboardDataRefresh: 1000; // ms - Real-time data updates
  dashboardNavigation: 500; // ms - Between sections
  
  // Authentication Performance
  loginResponse: 3000; // ms - Authentication completion
  sessionValidation: 500; // ms - Session check response
  
  // Registration Performance
  registrationFlow: 30000; // ms - Complete friend registration
  registrationSubmission: 3000; // ms - Registration processing
  gameDetailsLoad: 2000; // ms - Game information display
  
  // Payment Performance
  paymentFlow: 120000; // ms - Complete payment process
  paymentRedirect: 1000; // ms - MercadoPago handoff
  paymentConfirmation: 5000; // ms - Status update after payment
  
  // Mobile Performance
  mobileInitialLoad: 2000; // ms - On 3G connection
  mobileRegistration: 20000; // ms - Optimized mobile flow
  whatsappBrowser: 1500; // ms - In-app browser optimization
}
```

#### Performance Monitoring Implementation
```typescript
// Performance monitoring service
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`;
    performance.mark(`${timerId}_start`);
    return timerId;
  }
  
  endTimer(timerId: string): number {
    performance.mark(`${timerId}_end`);
    performance.measure(timerId, `${timerId}_start`, `${timerId}_end`);
    
    const measure = performance.getEntriesByName(timerId)[0];
    const duration = measure.duration;
    
    // Store metric for analysis
    const operation = timerId.split('_')[0];
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
    
    // Alert on performance degradation
    this.checkPerformanceThresholds(operation, duration);
    
    return duration;
  }
  
  private checkPerformanceThresholds(operation: string, duration: number) {
    const thresholds: Record<string, number> = {
      'dashboard_load': 3000,
      'payment_process': 120000,
      'registration_submit': 3000,
      'auth_login': 3000
    };
    
    const threshold = thresholds[operation];
    if (threshold && duration > threshold) {
      console.warn(`Performance threshold exceeded: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
      
      // Send to monitoring service
      this.reportPerformanceIssue(operation, duration, threshold);
    }
  }
  
  private async reportPerformanceIssue(operation: string, duration: number, threshold: number) {
    // Report to external monitoring service
    try {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          duration,
          threshold,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      console.error('Failed to report performance issue:', error);
    }
  }
}
```

#### Mobile Performance Optimization
```typescript
// Mobile-specific performance optimizations
class MobileOptimizer {
  private isLowPowerMode: boolean = false;
  private connectionSpeed: 'fast' | 'slow' | 'offline' = 'fast';
  
  constructor() {
    this.detectPerformanceContext();
    this.setupAdaptiveLoading();
  }
  
  private detectPerformanceContext() {
    // Detect connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        this.connectionSpeed = 'slow';
      }
    }
    
    // Detect low power mode (iOS)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.isLowPowerMode = battery.level < 0.2;
      });
    }
  }
  
  private setupAdaptiveLoading() {
    if (this.connectionSpeed === 'slow' || this.isLowPowerMode) {
      // Reduce features for performance
      this.enableLiteMode();
    }
  }
  
  private enableLiteMode() {
    // Disable real-time updates on slow connections
    window.__CANCHA_LITE_MODE__ = true;
    
    // Reduce image quality
    document.documentElement.style.setProperty('--image-quality', '0.7');
    
    // Disable animations
    document.documentElement.style.setProperty('--animation-duration', '0ms');
  }
  
  optimizeForWhatsAppBrowser(): void {
    // WhatsApp browser-specific optimizations
    if (this.isWhatsAppBrowser()) {
      // Disable smooth scrolling
      document.documentElement.style.scrollBehavior = 'auto';
      
      // Reduce JavaScript execution
      this.throttleJavaScript();
      
      // Optimize for single-page flows
      this.enableSinglePageOptimization();
    }
  }
  
  private isWhatsAppBrowser(): boolean {
    return /WhatsApp/i.test(navigator.userAgent);
  }
}
```

#### Caching Strategy Implementation
```typescript
// Multi-layer caching for optimal performance
class CacheManager {
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  // In-memory cache for frequent data
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
  
  get(key: string): any | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  // Service Worker cache for offline support
  async cacheForOffline(url: string, data: any): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const cache = await caches.open('cancha-v1');
      
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      await cache.put(url, response);
    }
  }
  
  // Database-level caching
  async getWithDatabaseCache(key: string, fetcher: () => Promise<any>): Promise<any> {
    // Check memory cache first
    let data = this.get(key);
    if (data) return data;
    
    // Check database cache
    data = await this.getFromDatabase(key);
    if (data) {
      this.set(key, data);
      return data;
    }
    
    // Fetch fresh data
    data = await fetcher();
    this.set(key, data);
    await this.saveToDatabase(key, data);
    
    return data;
  }
}
```

---

## Enhanced Security Architecture

### Multi-Layer Security Implementation

#### CSRF Protection and Security Headers
```typescript
// CSRF protection middleware
import { createHash, randomBytes } from 'crypto';

class CSRFProtection {
  private tokens: Map<string, { token: string; expires: number }> = new Map();
  private readonly TOKEN_TTL = 30 * 60 * 1000; // 30 minutes
  
  generateToken(sessionId: string): string {
    const token = randomBytes(32).toString('hex');
    const expires = Date.now() + this.TOKEN_TTL;
    
    this.tokens.set(sessionId, { token, expires });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  validateToken(sessionId: string, providedToken: string): boolean {
    const stored = this.tokens.get(sessionId);
    if (!stored || Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === providedToken;
  }
  
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

// Security headers middleware
export function securityHeaders() {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' https://www.mercadopago.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' wss: https://api.whatsapp.com https://api.mercadopago.com",
      "frame-src https://www.mercadopago.com",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ')
  };
}
```

#### Rate Limiting with Adaptive Thresholds
```typescript
// Advanced rate limiting with different rules per endpoint
class AdaptiveRateLimit {
  private attempts: Map<string, { count: number; resetTime: number; blocked: boolean }> = new Map();
  
  private rules: Record<string, { maxAttempts: number; windowMs: number; blockDurationMs: number }> = {
    'auth_login': { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
    'registration': { maxAttempts: 10, windowMs: 15 * 60 * 1000, blockDurationMs: 5 * 60 * 1000 },
    'payment_create': { maxAttempts: 3, windowMs: 5 * 60 * 1000, blockDurationMs: 10 * 60 * 1000 },
    'api_general': { maxAttempts: 100, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 }
  };
  
  checkLimit(identifier: string, ruleKey: string): { allowed: boolean; resetTime?: number } {
    const rule = this.rules[ruleKey] || this.rules['api_general'];
    const now = Date.now();
    
    let attempt = this.attempts.get(identifier);
    
    // Clean up expired entries
    if (attempt && now > attempt.resetTime) {
      attempt = undefined;
      this.attempts.delete(identifier);
    }
    
    // Check if blocked
    if (attempt?.blocked && now < attempt.resetTime) {
      return { allowed: false, resetTime: attempt.resetTime };
    }
    
    // Initialize or increment
    if (!attempt) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + rule.windowMs,
        blocked: false
      });
      return { allowed: true };
    }
    
    attempt.count++;
    
    // Check if limit exceeded
    if (attempt.count > rule.maxAttempts) {
      attempt.blocked = true;
      attempt.resetTime = now + rule.blockDurationMs;
      
      // Log security event
      this.logSecurityEvent('rate_limit_exceeded', identifier, ruleKey);
      
      return { allowed: false, resetTime: attempt.resetTime };
    }
    
    return { allowed: true };
  }
  
  private logSecurityEvent(event: string, identifier: string, rule: string): void {
    console.warn(`Security event: ${event} - ${identifier} - ${rule}`);
    
    // Send to security monitoring
    this.reportSecurityEvent({
      event,
      identifier,
      rule,
      timestamp: new Date().toISOString()
    });
  }
  
  private async reportSecurityEvent(data: any): Promise<void> {
    try {
      await fetch('/api/security/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }
}
```

#### Session Management with Security
```typescript
// Secure session management
class SecureSessionManager {
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REMEMBER_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  async createSession(userId: string, rememberMe: boolean = false): Promise<string> {
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (rememberMe ? this.REMEMBER_DURATION : this.SESSION_DURATION));
    
    // Store session in database
    await this.storeSession({
      sessionId,
      userId,
      expiresAt,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent()
    });
    
    return sessionId;
  }
  
  async validateSession(sessionId: string): Promise<{ valid: boolean; userId?: string }> {
    const session = await this.getSession(sessionId);
    
    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await this.destroySession(sessionId);
      }
      return { valid: false };
    }
    
    // Update last activity
    await this.updateSessionActivity(sessionId);
    
    // Check for suspicious activity
    if (await this.detectSuspiciousActivity(session)) {
      await this.destroySession(sessionId);
      this.logSecurityEvent('suspicious_session', session.userId);
      return { valid: false };
    }
    
    return { valid: true, userId: session.userId };
  }
  
  private async detectSuspiciousActivity(session: any): Promise<boolean> {
    // Check for IP changes
    const currentIP = this.getCurrentIP();
    if (session.ipAddress !== currentIP) {
      // Allow IP changes but log them
      this.logSecurityEvent('session_ip_change', session.userId);
    }
    
    // Check for concurrent sessions (optional security measure)
    const activeSessions = await this.getActiveSessionsForUser(session.userId);
    if (activeSessions.length > 3) { // Allow up to 3 concurrent sessions
      return true;
    }
    
    return false;
  }
  
  async destroySession(sessionId: string): Promise<void> {
    await this.deleteSession(sessionId);
  }
  
  async destroyAllUserSessions(userId: string): Promise<void> {
    await this.deleteAllUserSessions(userId);
  }
}
```

---

## Security Architecture

### Authentication & Authorization Patterns

#### Admin Authentication Flow
```typescript
// Login process
1. User submits credentials via secure form
2. Credentials sent to Supabase Auth via HTTPS
3. Supabase returns JWT and refresh token
4. Tokens stored in httpOnly cookies
5. Session validated on each admin route access
6. Auto-refresh handled by Supabase client

// Authorization middleware
export async function withAuth(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { user, error } = await supabase.auth.getUser(req.headers.authorization);
    
    if (error || !user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    req.user = user;
    return handler(req, res);
  };
}
```

#### Game Token Security
```typescript
// Secure token generation
const shareToken = crypto.randomBytes(32).toString('base64url');

// Token validation middleware
export async function validateGameToken(token: string): Promise<Game | null> {
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('share_token', token)
    .single();
    
  return game;
}

// Rate limiting for public endpoints
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 registrations per phone number per window
  keyGenerator: (req) => req.body.player_phone,
});
```

### Data Protection Strategies

#### Input Validation & Sanitization
```typescript
// Zod schemas for validation
const GameSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  description: z.string().max(1000).optional(),
  game_date: z.string().datetime(),
  min_players: z.number().int().min(1).max(50),
  max_players: z.number().int().min(1).max(50),
  field_cost_per_player: z.number().positive().max(10000),
});

const RegistrationSchema = z.object({
  player_name: z.string().min(1).max(255).trim(),
  player_phone: z.string().regex(/^\+54\s?9?\s?\d{2,4}\s?\d{4}\s?\d{4}$/),
});

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
```

#### Database Security (RLS Policies)
```sql
-- Admin-only access to sensitive operations
CREATE POLICY "Admins full access to games" ON games
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Public read access via token validation
CREATE POLICY "Public read games via valid token" ON games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g 
      WHERE g.share_token = current_setting('request.jwt.claims', true)::json ->> 'game_token'
    )
  );

-- Prevent data leakage in registrations
CREATE POLICY "Players can only see own registration" ON game_registrations
  FOR SELECT USING (
    player_phone = current_setting('request.jwt.claims', true)::json ->> 'phone'
    OR auth.jwt() ->> 'role' = 'admin'
  );
```

#### Data Encryption
```typescript
// Phone number encryption at rest
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.PHONE_ENCRYPTION_KEY;

export function encryptPhone(phone: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptPhone(encryptedPhone: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedPhone, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### API Security Measures

#### Request Validation & Rate Limiting
```typescript
// API route protection
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Rate limiting
  await registrationLimiter(req, res);
  
  // Input validation
  const validation = RegistrationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: validation.error.issues
    });
  }
  
  // Process request...
}
```

#### CORS & Security Headers
```typescript
// next.config.js security headers
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
          }
        ]
      }
    ];
  }
};
```

#### Webhook Security
```typescript
// MercadoPago webhook verification
export async function verifyMercadoPagoWebhook(
  payload: string, 
  signature: string
): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// WhatsApp webhook verification
export async function verifyWhatsAppWebhook(
  payload: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  return signature === expectedSignature;
}
```

---

## Integration Architecture

### WhatsApp Business API Integration

#### Message Template Management
```typescript
// Pre-approved message templates
const MessageTemplates = {
  GAME_REMINDER: {
    name: 'game_reminder',
    language: 'es_AR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{player_name}}' },
          { type: 'text', text: '{{game_title}}' },
          { type: 'text', text: '{{game_time}}' }
        ]
      }
    ]
  },
  PAYMENT_REQUEST: {
    name: 'payment_request',
    language: 'es_AR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{player_name}}' },
          { type: 'text', text: '{{amount}}' },
          { type: 'text', text: '{{payment_url}}' }
        ]
      }
    ]
  }
};

// WhatsApp API client
class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  }
  
  async sendTemplateMessage(
    to: string,
    templateName: string,
    parameters: string[]
  ): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'es_AR' },
            components: [
              {
                type: 'body',
                parameters: parameters.map(param => ({ type: 'text', text: param }))
              }
            ]
          }
        })
      }
    );
    
    const data = await response.json();
    return data.messages[0].id;
  }
}
```

#### Notification Workflow
```typescript
// Automated notification scheduling
export async function scheduleGameNotifications(gameId: string) {
  const game = await getGameById(gameId);
  const registrations = await getGameRegistrations(gameId);
  
  for (const registration of registrations) {
    // Schedule game reminder (1 hour before)
    const reminderTime = new Date(game.game_date);
    reminderTime.setHours(reminderTime.getHours() - 1);
    
    await scheduleNotification({
      game_id: gameId,
      player_phone: registration.player_phone,
      message_type: 'game_reminder',
      scheduled_for: reminderTime,
      template_params: [
        registration.player_name,
        game.title,
        formatGameTime(game.game_date)
      ]
    });
  }
}

// Webhook handler for delivery status
export async function handleWhatsAppWebhook(payload: any) {
  const { statuses } = payload.entry[0].changes[0].value;
  
  for (const status of statuses || []) {
    await updateNotificationStatus(status.id, {
      delivery_status: status.status,
      delivered_at: status.status === 'delivered' ? new Date() : null
    });
  }
}
```

### MercadoPago Payment Integration

#### Payment Flow Architecture
```typescript
// Enhanced payment service with comprehensive error handling
class MercadoPagoService {
  private client: MercadoPagoConfig;
  private retryAttempts = 3;
  private baseDelay = 1000;
  
  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
      options: {
        timeout: 30000,
        idempotencyKey: 'mp-idempotency-key',
      }
    });
  }
  
  async createPayment(registrationId: string): Promise<PaymentResponse> {
    return this.withRetry(async () => {
      const registration = await getRegistrationById(registrationId);
      const game = await getGameById(registration.game_id);
      
      // Validate payment eligibility
      if (registration.payment_status === 'paid') {
        throw new Error('Payment already completed');
      }
      
      if (new Date() > new Date(game.game_date)) {
        throw new Error('Cannot create payment for past games');
      }
      
      const preference = {
        items: [
          {
            title: `Pago cancha - ${game.title}`,
            description: `Partido del ${new Date(game.game_date).toLocaleDateString('es-AR')}`,
            quantity: 1,
            unit_price: game.field_cost_per_player,
            currency_id: 'ARS'
          }
        ],
        payer: {
          name: registration.player_name,
          phone: {
            area_code: '+54',
            number: registration.player_phone
          },
          email: `${registration.player_phone}@whatsapp.local` // Dummy email for MP
        },
        external_reference: registrationId,
        notification_url: `${process.env.BASE_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${process.env.BASE_URL}/payment/success?ref=${registrationId}`,
          failure: `${process.env.BASE_URL}/payment/failure?ref=${registrationId}`,
          pending: `${process.env.BASE_URL}/payment/pending?ref=${registrationId}`
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        
        // Mobile optimization
        additional_info: {
          items: [{
            id: gameId,
            title: `Cancha Leconte - ${game.title}`,
            description: `Cuota del partido: $${game.field_cost_per_player}`,
            quantity: 1,
            unit_price: game.field_cost_per_player
          }]
        },
        
        // Security settings
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 1 // Force single payment
        }
      };
      
      const response = await this.client.preference.create({ body: preference });
      
      // Store payment reference with audit trail
      await updateRegistrationPayment(registrationId, {
        payment_id: response.id,
        payment_amount: game.field_cost_per_player,
        payment_created_at: new Date(),
        payment_expires_at: new Date(preference.expiration_date_to)
      });
      
      // Log payment creation for monitoring
      await logPaymentEvent('payment_created', {
        registrationId,
        gameId: game.id,
        amount: game.field_cost_per_player,
        paymentId: response.id
      });
      
      return {
        payment_url: response.init_point,
        payment_id: response.id,
        amount: game.field_cost_per_player,
        expires_at: preference.expiration_date_to,
        sandbox_init_point: response.sandbox_init_point // For testing
      };
    });
  }
  
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return this.withRetry(async () => {
      const payment = await this.client.payment.findById(paymentId);
      
      return {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        date_created: payment.date_created,
        date_last_updated: payment.date_last_updated,
        payment_method: payment.payment_method_id,
        installments: payment.installments
      };
    });
  }
  
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        if (attempt < this.retryAttempts) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
  
  private isNonRetryableError(error: any): boolean {
    // Don't retry validation errors, authentication errors, etc.
    const nonRetryableStatuses = [400, 401, 403, 404];
    return nonRetryableStatuses.includes(error.status) || 
           error.message?.includes('already completed');
  }
}

// Webhook handler for payment notifications
export async function handleMercadoPagoWebhook(payload: any) {
  const { action, data } = payload;
  
  if (action === 'payment.updated') {
    const paymentId = data.id;
    const payment = await mercadoPago.payment.findById(paymentId);
    
    const registrationId = payment.external_reference;
    
    await updateRegistrationPayment(registrationId, {
      payment_status: mapPaymentStatus(payment.status),
      paid_at: payment.status === 'approved' ? new Date() : null
    });
    
    // Stop payment reminders if paid
    if (payment.status === 'approved') {
      await cancelPendingPaymentReminders(registrationId);
    }
  }
}
```

#### Payment Status Mapping
```typescript
function mapPaymentStatus(mpStatus: string): string {
  const statusMap: Record<string, string> = {
    'approved': 'paid',
    'pending': 'pending',
    'rejected': 'failed',
    'cancelled': 'failed',
    'refunded': 'refunded'
  };
  
  return statusMap[mpStatus] || 'pending';
}
```

### Webhook Handling Architecture

#### Centralized Webhook Router
```typescript
// Webhook validation and routing
export default async function webhookHandler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  const { provider } = req.query;
  
  try {
    switch (provider) {
      case 'mercadopago':
        if (!await verifyMercadoPagoWebhook(req.body, req.headers['x-signature'])) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        await handleMercadoPagoWebhook(req.body);
        break;
        
      case 'whatsapp':
        if (!await verifyWhatsAppWebhook(req.body, req.headers['x-hub-signature-256'])) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        await handleWhatsAppWebhook(req.body);
        break;
        
      default:
        return res.status(404).json({ error: 'Unknown provider' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### Retry Logic for Failed Webhooks
```typescript
// Webhook retry mechanism
class WebhookRetryService {
  async processWithRetry(payload: any, processor: Function, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await processor(payload);
        return;
      } catch (error) {
        console.error(`Webhook processing attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          // Store for manual processing
          await storeFailedWebhook(payload, error);
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
}
```

---

## File Structure & Project Organization

### Complete Project Structure
```
cancha-leconte/
├── .env.local                          # Environment variables
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore rules
├── .eslintrc.json                      # ESLint configuration
├── .prettierrc                         # Prettier configuration
├── next.config.js                      # Next.js configuration
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Lock file
├── tailwind.config.js                  # Tailwind configuration
├── tsconfig.json                       # TypeScript configuration
├── README.md                           # Project documentation
│
├── public/                             # Static assets
│   ├── favicon.ico
│   ├── logo.png
│   ├── manifest.json                   # PWA manifest
│   └── icons/                          # App icons
│       ├── icon-192.png
│       └── icon-512.png
│
├── src/                                # Source code
│   ├── components/                     # Reusable components
│   │   ├── common/                     # Generic components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── DateTimePicker.tsx
│   │   ├── forms/                      # Form components
│   │   │   ├── GameForm.tsx
│   │   │   ├── RegistrationForm.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── PhoneInput.tsx
│   │   ├── games/                      # Game-related components
│   │   │   ├── GameCard.tsx
│   │   │   ├── GamesList.tsx
│   │   │   ├── GameDetails.tsx
│   │   │   ├── RegistrationsList.tsx
│   │   │   ├── TeamsView.tsx
│   │   │   └── PaymentStatus.tsx
│   │   ├── layout/                     # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   └── statistics/                 # Statistics components
│   │       ├── StatsOverview.tsx
│   │       ├── RevenueChart.tsx
│   │       └── PlayerStats.tsx
│   │
│   ├── contexts/                       # React contexts
│   │   ├── AuthContext.tsx             # Authentication context
│   │   ├── GameContext.tsx             # Game state context
│   │   └── NotificationContext.tsx     # Notification context
│   │
│   ├── hooks/                          # Custom hooks
│   │   ├── useAuth.ts                  # Authentication hook
│   │   ├── useGames.ts                 # Games management hook
│   │   ├── useRegistrations.ts         # Registration management hook
│   │   ├── usePayments.ts              # Payment processing hook
│   │   ├── useNotifications.ts         # Notifications hook
│   │   └── useRealtime.ts              # Real-time subscriptions hook
│   │
│   ├── lib/                            # Utility libraries
│   │   ├── supabase.ts                 # Supabase client configuration
│   │   ├── validations.ts              # Zod validation schemas
│   │   ├── utils.ts                    # Utility functions
│   │   ├── constants.ts                # App constants
│   │   ├── whatsapp.ts                 # WhatsApp service
│   │   ├── mercadopago.ts              # MercadoPago service
│   │   └── notifications.ts            # Notification service
│   │
│   ├── middleware.ts                   # Next.js middleware
│   │
│   ├── pages/                          # Next.js pages
│   │   ├── _app.tsx                    # App wrapper
│   │   ├── _document.tsx               # Document wrapper
│   │   ├── index.tsx                   # Landing page
│   │   ├── login.tsx                   # Admin login
│   │   │
│   │   ├── admin/                      # Admin dashboard
│   │   │   ├── index.tsx               # Dashboard overview
│   │   │   ├── games/                  # Game management
│   │   │   │   ├── index.tsx           # Games list
│   │   │   │   ├── create.tsx          # Create game
│   │   │   │   └── [id]/               # Game details
│   │   │   │       ├── index.tsx       # Game overview
│   │   │   │       ├── edit.tsx        # Edit game
│   │   │   │       ├── registrations.tsx # Manage registrations
│   │   │   │       ├── teams.tsx       # Team assignment
│   │   │   │       └── results.tsx     # Game results
│   │   │   ├── statistics/             # Statistics pages
│   │   │   │   ├── index.tsx           # Overview stats
│   │   │   │   ├── revenue.tsx         # Revenue analytics
│   │   │   │   └── players.tsx         # Player analytics
│   │   │   └── settings/               # Settings pages
│   │   │       ├── index.tsx           # General settings
│   │   │       ├── profile.tsx         # Profile settings
│   │   │       └── notifications.tsx   # Notification settings
│   │   │
│   │   ├── games/                      # Public game pages
│   │   │   └── [token]/                # Game registration
│   │   │       ├── index.tsx           # Game details & registration
│   │   │       └── success.tsx         # Registration success
│   │   │
│   │   ├── payment/                    # Payment pages
│   │   │   ├── success.tsx             # Payment success
│   │   │   ├── failure.tsx             # Payment failure
│   │   │   └── pending.tsx             # Payment pending
│   │   │
│   │   └── api/                        # API routes
│   │       ├── auth/                   # Authentication endpoints
│   │       │   ├── login.ts
│   │       │   ├── logout.ts
│   │       │   └── session.ts
│   │       ├── games/                  # Game management endpoints
│   │       │   ├── index.ts            # List/create games
│   │       │   ├── [id]/               # Game operations
│   │       │   │   ├── index.ts        # Get/update/delete game
│   │       │   │   ├── registrations.ts # Registration management
│   │       │   │   ├── teams.ts        # Team assignment
│   │       │   │   ├── results.ts      # Game results
│   │       │   │   └── payments/       # Payment endpoints
│   │       │   │       ├── create.ts   # Create payment
│   │       │   │       └── status.ts   # Payment status
│   │       │   └── [token]/            # Public game endpoints
│   │       │       ├── details.ts      # Game details
│   │       │       └── register.ts     # Player registration
│   │       ├── notifications/          # Notification endpoints
│   │       │   ├── send.ts             # Send notifications
│   │       │   └── status.ts           # Notification status
│   │       ├── statistics/             # Statistics endpoints
│   │       │   ├── overview.ts         # Overview stats
│   │       │   ├── revenue.ts          # Revenue analytics
│   │       │   └── players.ts          # Player analytics
│   │       └── webhooks/               # Webhook endpoints
│   │           ├── mercadopago.ts      # MercadoPago webhooks
│   │           └── whatsapp.ts         # WhatsApp webhooks
│   │
│   ├── styles/                         # Styles
│   │   ├── globals.css                 # Global styles
│   │   └── components.css              # Component-specific styles
│   │
│   └── types/                          # TypeScript types
│       ├── auth.ts                     # Authentication types
│       ├── games.ts                    # Game-related types
│       ├── payments.ts                 # Payment types
│       ├── notifications.ts            # Notification types
│       └── api.ts                      # API response types
│
├── supabase/                           # Supabase configuration
│   ├── config.toml                     # Supabase configuration
│   ├── migrations/                     # Database migrations
│   │   ├── 001_initial_schema.sql      # Initial database schema
│   │   ├── 002_rls_policies.sql        # Row level security policies
│   │   └── 003_functions.sql           # Database functions
│   └── seed.sql                        # Seed data
│
├── docs/                               # Documentation
│   ├── api.md                          # API documentation
│   ├── deployment.md                   # Deployment guide
│   └── development.md                  # Development guide
│
└── tests/                              # Test files
    ├── __mocks__/                      # Mock files
    ├── components/                     # Component tests
    ├── pages/                          # Page tests
    ├── api/                            # API tests
    └── utils/                          # Utility tests
```

### Configuration Files

#### Environment Variables (.env.example)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token
MERCADOPAGO_WEBHOOK_SECRET=your_webhook_secret

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Cancha Leconte

# Security
NEXTAUTH_SECRET=your_nextauth_secret
PHONE_ENCRYPTION_KEY=your_encryption_key
```

#### Next.js Configuration (next.config.js)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/webhooks/mercadopago',
        destination: '/api/webhooks/mercadopago',
      },
      {
        source: '/api/webhooks/whatsapp',
        destination: '/api/webhooks/whatsapp',
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Tailwind Configuration (tailwind.config.js)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

#### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/contexts/*": ["./src/contexts/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Implementation Guidance for Development Teams

### For Backend Engineers

#### Database Implementation Priority
1. **Phase 1:** Set up Supabase project and implement core schema (users, games, game_registrations)
2. **Phase 2:** Add RLS policies and implement authentication
3. **Phase 3:** Add payment and notification tables with proper relationships
4. **Phase 4:** Implement database functions for statistics and reporting

#### API Development Approach
1. **Start with authentication endpoints** - critical for admin access
2. **Implement game CRUD operations** - core functionality
3. **Add public registration endpoints** - friend-facing features
4. **Integrate payment processing** - MercadoPago webhook handling
5. **Complete notification system** - WhatsApp integration

#### Key Implementation Notes
- Use Supabase RLS policies instead of application-level authorization where possible
- Implement proper error handling and validation for all endpoints
- Set up webhook endpoints early for testing with external services
- Use database transactions for operations affecting multiple tables

### For Frontend Engineers

#### Component Development Strategy
1. **Phase 1:** Build authentication flow and admin layout structure
2. **Phase 2:** Implement game management interfaces (create, edit, list)
3. **Phase 3:** Create public registration flow with mobile-first design
4. **Phase 4:** Add real-time features and payment integration UI
5. **Phase 5:** Implement statistics dashboard and data visualization

#### State Management Implementation
1. **Set up Context providers** early in the project structure
2. **Use React Query or SWR** for server state management and caching
3. **Implement optimistic updates** for better user experience
4. **Add real-time subscriptions** for registration updates

#### Performance Optimization Checklist
- Implement code splitting for admin and public routes
- Use Next.js Image component for all images
- Add loading states and skeleton screens
- Implement error boundaries for graceful error handling
- Optimize mobile performance with proper viewport settings

### For QA Engineers

#### Testing Strategy
1. **Unit Tests:** Focus on utility functions, validation schemas, and custom hooks
2. **Integration Tests:** Test API endpoints with realistic data scenarios
3. **E2E Tests:** Cover complete user workflows (game creation → registration → payment)
4. **Performance Tests:** Verify mobile responsiveness and loading times
5. **Security Tests:** Validate authentication, authorization, and input sanitization

#### Critical Test Scenarios
- Admin authentication and session management
- Game creation with various player limits and dates
- Friend registration with edge cases (full games, invalid data)
- Payment flow including webhook processing
- WhatsApp notification delivery and status tracking
- Real-time updates across multiple browser sessions

### For Security Analysts

#### Security Implementation Priorities
1. **Authentication Security:** Implement secure admin login with proper session management
2. **API Security:** Add rate limiting, input validation, and CORS configuration
3. **Data Protection:** Implement phone number encryption and secure token generation
4. **Webhook Security:** Verify all incoming webhook signatures
5. **Infrastructure Security:** Configure proper HTTPS, security headers, and environment variables

#### Security Monitoring Requirements
- Monitor failed authentication attempts
- Track unusual API usage patterns
- Alert on webhook verification failures
- Monitor payment processing anomalies
- Track WhatsApp delivery failures

#### Compliance Considerations
- GDPR compliance for personal data (names, phone numbers)
- PCI DSS considerations for payment data (handled by MercadoPago)
- WhatsApp Business API terms compliance
- Argentine data protection regulations

---

## Deployment and Infrastructure

### Development Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd cancha-leconte

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up Supabase
npx supabase init
npx supabase start
npx supabase db reset

# Start development server
npm run dev
```

### Production Deployment Pipeline
1. **Repository Setup:** GitHub repository with main branch protection
2. **Vercel Integration:** Automatic deployments on push to main
3. **Environment Configuration:** Production environment variables in Vercel
4. **Database Migration:** Supabase production project with migration scripts
5. **Domain Configuration:** Custom domain with SSL certificate
6. **Monitoring Setup:** Error tracking and performance monitoring

### Performance Optimization
- Next.js automatic code splitting and optimization
- Vercel edge caching for static assets
- Supabase connection pooling for database queries
- Image optimization with Next.js Image component
- Mobile-first responsive design for optimal mobile performance

### Monitoring and Analytics
- Vercel Analytics for performance monitoring
- Supabase dashboard for database monitoring
- Custom error tracking for application errors
- WhatsApp delivery status monitoring
- Payment success rate tracking

---

## Conclusion

This technical architecture document provides a comprehensive blueprint for implementing the Cancha Leconte web application. The architecture prioritizes simplicity, security, and scalability while meeting all product requirements for the Argentine market.

**Key Success Factors:**
- Clear separation of concerns between admin and public interfaces
- Robust security through Supabase RLS and proper authentication
- Reliable third-party integrations with WhatsApp and MercadoPago
- Mobile-first design for optimal user experience
- Real-time features for immediate feedback and updates

**Implementation Readiness:**
- Database schema ready for immediate implementation
- API contracts defined for parallel development
- Component architecture supporting modular development
- Security measures planned from the ground up
- Integration patterns established for external services

The architecture supports the development roadmap phases and provides clear guidance for each specialist team. With proper implementation following this blueprint, the application will successfully solve Santiago and Agustin's game organization challenges while providing an excellent user experience for their friends.

**Next Steps:**
1. Set up development environment and Supabase project
2. Begin with Phase 1 implementation (authentication and basic game management)
3. Initiate WhatsApp Business API verification process
4. Set up MercadoPago developer account and testing environment
5. Implement core functionality following the defined API contracts

This architecture document serves as the foundation for building a robust, secure, and user-friendly soccer field management system tailored specifically for the Cancha Leconte use case.

## Updated Architecture Summary (Post-Design Integration)

### Enhanced Technical Capabilities

Following the comprehensive review of UX/UI design specifications, the architecture has been significantly enhanced to support:

#### Real-time Features
- **WebSocket Integration**: Live dashboard updates, real-time player counts, instant payment notifications
- **Mobile-Optimized Connections**: Background/foreground management, connection quality adaptation
- **Performance Monitoring**: 250ms debounced updates, connection state management

#### Advanced Payment Integration
- **Enhanced MercadoPago Flow**: Retry logic, mobile optimization, comprehensive error handling
- **Payment Security**: Server-side validation, webhook signature verification, fraud protection
- **Mobile Payment UX**: WhatsApp browser optimization, QR codes, simplified flows

#### Performance Requirements Met
- **Dashboard**: <3 seconds initial load, <1 second real-time updates
- **Registration**: <30 seconds complete flow, <3 seconds submission
- **Payment**: <2 minutes complete process, <1 second MercadoPago handoff
- **Mobile**: <2 seconds on 3G, WhatsApp browser optimized

#### Security Enhancements
- **Multi-layer Protection**: CSRF tokens, adaptive rate limiting, session security
- **Audit Trail**: Comprehensive logging, security event monitoring
- **Mobile Security**: Touch hijacking prevention, secure token handling

#### Accessibility Compliance
- **WCAG AA Standard**: 4.5:1 contrast ratios, keyboard navigation, screen reader support
- **Mobile Accessibility**: 44px touch targets, voice control compatibility
- **Progressive Enhancement**: Graceful degradation for assistive technologies

#### Dependencies Installed
- **framer-motion**: For smooth animations and micro-interactions
- **ws + @types/ws**: WebSocket implementation for real-time features
- **Enhanced Supabase Integration**: Real-time subscriptions and optimized queries

### Implementation Roadmap Alignment

The updated architecture directly supports the design specifications with:

1. **Component-Ready Specifications**: Detailed CSS classes, animation timings, responsive breakpoints
2. **API-Ready Endpoints**: Complete interface definitions for all real-time and payment features  
3. **Performance Benchmarks**: Measurable targets aligned with UX requirements
4. **Security Standards**: Comprehensive protection suitable for financial transactions
5. **Accessibility Framework**: Built-in compliance testing and validation

### Technology Stack Validation

The chosen stack (Next.js + Supabase + MercadoPago + WhatsApp API) proves ideal for the enhanced requirements:

- **Next.js 15**: Handles real-time features, mobile optimization, and performance targets
- **Supabase**: Provides WebSocket support, RLS security, and real-time subscriptions
- **MercadoPago**: Native mobile support, comprehensive payment options, webhook reliability
- **Tailwind CSS 4**: Mobile-first responsive design, performance optimization
- **TypeScript**: Type safety for complex real-time and payment integrations

This comprehensive architecture update ensures the technical implementation will seamlessly support the detailed UX/UI designs while maintaining scalability, security, and performance standards appropriate for a production soccer field management system.