# SmartFare Architecture Documentation

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [AI Architecture](#ai-architecture)
4. [Security Architecture](#security-architecture)
5. [Performance Considerations](#performance-considerations)
6. [Scalability & Future](#scalability--future)

---

## System Architecture

### High-Level Overview

SmartFare follows a **modern microservices-inspired monolithic architecture** with clear separation of concerns:

```
┌──────────────────────────────────────┐
│   PRESENTATION LAYER (Frontend)      │
│   Angular 21 Standalone Components   │
│   Signals-based Reactive State       │
└──────────────┬───────────────────────┘
               │ HTTP/REST API
               ↓
┌──────────────────────────────────────┐
│   API LAYER (Express.js)             │
│   • Route handlers                   │
│   • Input validation (Zod)           │
│   • Rate limiting                    │
│   • Error handling                   │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│   SERVICE LAYER                      │
│   • Business logic                   │
│   • External integrations            │
│   • State management                 │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│   DATA ACCESS LAYER (Prisma)         │
│   • ORM abstraction                  │
│   • Query optimization               │
│   • Database operations              │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│   DATABASE LAYER (PostgreSQL)        │
│   • Persistent data storage          │
│   • Transactions & ACID              │
│   • Indexes & optimization           │
└──────────────────────────────────────┘
```

### Layered Architecture Details

#### **Presentation Layer** (Frontend)
- **Framework**: Angular 21 with Standalone Components
- **State Management**: Signals + Service layer
- **HTTP Client**: Angular HttpClient with Interceptors
- **Routing**: Feature-based lazy loading
- **Styling**: Bootstrap 5 + Custom CSS

Key Components:
- `AuthGuard`: Protect authenticated routes
- `ErrorBoundaryComponent`: Catch component crashes
- `LoggerService`: Structured logging
- Services: Layer between components and HTTP client

#### **API Layer** (Express.js)
- **Framework**: Express 5.2
- **Middleware Stack**:
  1. Request logging (Request ID tracking)
  2. Security headers (Helmet)
  3. CORS validation
  4. Rate limiting
  5. Auth middleware (JWT verification)
  6. Body parsing (JSON)
  7. Route handlers
  8. Error handler (last middleware)

- **Route Organization**:
  ```
  /auth/*          → Authentication endpoints
  /api/locations   → Location search
  /api/itineraries → Itinerary CRUD
  /api/ai/*        → AI endpoints
  /api/chat/*      → Chat sessions & messages
  /api/upload/*    → File uploads
  ```

#### **Service Layer** (Business Logic)
- **AuthService**: User authentication, OAuth, password management
- **ChatService**: Chat session management, streaming, state extraction
- **GeminiService**: Gemini API integration, prompt engineering, response validation
- **ItineraryService**: Itinerary persistence, workspace data
- **EmailService**: Email sending, notifications
- **LocationService**: Location data fetching

#### **Data Access Layer** (Prisma ORM)
- **Abstraction**: Database operations abstracted from services
- **Query Optimization**: Selective field retrieval, proper includes
- **Transactions**: Multi-step operations wrapped in transactions
- **Migrations**: Version-controlled schema changes

#### **Database Layer** (PostgreSQL)
- **Tables**: Users, Sessions, Itineraries, ChatSessions, Locations, etc.
- **Indexes**: Performance optimization for common queries
- **Relationships**: Foreign keys with proper cascading

---

## Data Flow

### Authentication Flow

```
User enters credentials
        ↓
POST /auth/login
        ↓
AuthService.Login()
        ↓
Verify email & password hash
        ↓
Create Auth Session in DB
        ↓
Generate JWT token
        ↓
Return token to frontend
        ↓
Frontend stores in localStorage/sessionStorage
        ↓
All future requests include token in Authorization header
        ↓
AuthMiddleware verifies token
        ↓
Request proceeds
```

### OAuth Flow (GitHub/Google)

```
User clicks "Login with GitHub"
        ↓
Frontend redirects to GitHub with state token
        ↓
User authorizes SmartFare
        ↓
GitHub redirects back with code
        ↓
Backend exchanges code for access token
        ↓
Fetch user profile from GitHub
        ↓
Check if user exists
        ├─ EXISTS: Issue JWT, login
        └─ NEW: Send registration token, request profile completion
        ↓
Frontend completes registration
        ↓
Create user & issue JWT
```

### AI Chat Flow

```
User sends message in chat
        ↓
Frontend: POST /api/chat/stream { message }
        ↓
Backend: ChatService.streamChatResponse()
        ↓
Extract planner state from conversation history
        ↓
Identify destination & location
        ↓
Build structured prompt with context
        ↓
Send to Gemini API with retry logic
        ↓
Stream response chunks to frontend
        ↓
Parse & validate JSON response
        ↓
Save message to database
        ↓
Update session metadata with new state
        ↓
Frontend displays response in real-time
```

### Itinerary Generation Flow

```
User initiates generation from chat
        ↓
ChatService.generateItineraryFromSession()
        ↓
Verify planner state is complete
        ↓
Fetch workspace (activities, hotels, categories)
        ↓
Build detailed itinerary generation prompt
        ↓
Call Gemini with structured JSON request
        ↓
Validate items exist in workspace
        ↓
Create Itinerary in database with items
        ↓
Return itinerary to frontend
        ↓
Frontend navigates to itinerary preview
```

---

## AI Architecture

### Gemini API Integration

#### **Model Selection Strategy**

```typescript
// Fallback chain for resilience
1. gemini-2.5-flash      ← Preferred (latest, fast)
2. gemini-2.5-flash-lite ← Fallback (cheaper, slower)
3. gemini-2.0-flash      ← Stable fallback

If rate limited (429) → Try next model
If timeout → Retry with exponential backoff
If all fail → Return user-friendly error
```

#### **Request/Response Cycle**

```
Frontend Request
    ↓
Validate input with Zod
    ↓
Extract context (destination, preferences)
    ↓
Build structured prompt
    ↓
Send to Gemini API
    ↓
Stream response chunks
    ↓
Accumulate & parse JSON
    ↓
Validate response structure (AiResponseValidator)
    ↓
Sanitize & normalize data
    ↓
Return to frontend OR fallback if parse fails
```

#### **Prompt Engineering**

**System Prompt Structure**:
```
1. Role definition ("Sei l'assistente IA di SmartFare")
2. Behavior guidelines (Sii proattivo, non inventare luoghi)
3. Output format specification (JSON schema)
4. Context (user preferences, destination, itinerary)
5. Available POIs (limited to top items by relevance)
6. Conversation history (last 5 messages)
```

**Key Features**:
- Token counting to stay within limits
- Activity ranking by relevance to prompt
- Food/cultural categories prioritized
- No hallucinated POIs allowed

#### **Response Validation**

```typescript
// Robust multi-stage validation
1. Try direct JSON parse
2. Extract JSON from text/markdown
3. Try removing code fences
4. Validate required fields (reply must exist)
5. Sanitize arrays (suggestions, actions, questions)
6. Enforce max lengths
7. Validate enum values
8. Return fallback response if parsing fails
```

### Chat Modes

#### **Planner Mode**
- **Context**: Destination, POIs, preferences
- **Goal**: Modify/generate itinerary
- **Temperature**: 0.75 (creative)
- **Actions**: add_item, remove_item, reorder_items, suggest
- **Output**: Structured suggestions + actions

#### **Assistant Mode**
- **Context**: None (general chat)
- **Goal**: General travel advice
- **Temperature**: 0.6 (deterministic)
- **Actions**: None (suggestions only)
- **Output**: Conversational replies

---

## Security Architecture

### Authentication & Authorization

```
User Credentials
    ↓
POST /auth/login
    ↓
bcryptjs.compare(password, hash)
    ↓
Create AuthSession in DB
    ↓
Generate JWT with sessionId
    ↓
JWT: { userId, email, sessionId, expiresIn: "7d" }
    ↓
Client stores token
    ↓
Include in Authorization header
    ↓
Middleware verifies JWT signature
    ↓
Check session not revoked in DB
    ↓
Proceed with request
```

### OAuth 2.0 with State Verification

```
Initiate OAuth
    ↓
Generate state token (JWT with expiry)
    ↓
Redirect to provider with state
    ↓
User authorizes
    ↓
Provider redirects back with code + state
    ↓
Verify state token validity & signature
    ↓
Exchange code for access token
    ↓
Fetch user profile
    ↓
Check if user exists
    ├─ New → Generate registration token
    └─ Existing → Issue JWT
```

### Input Validation & Sanitization

```
HTTP Request
    ↓
Parse JSON body
    ↓
Zod schema validation
    ├─ Email format
    ├─ Password strength (12+ chars, complexity)
    ├─ String length limits
    └─ Type checking
    ↓
If validation fails → Return 400 with error details
    ↓
Sanitize strings (trim, remove dangerous chars)
    ↓
Proceed to handler
```

### Rate Limiting

```
Global Rate Limiter
├─ 50 requests / 15 minutes per IP

API-Specific Limiters
├─ /auth/login: 5 attempts / 15 minutes
├─ /api/ai/*: 20 requests / 1 minute
└─ /api/chat/*: 30 requests / 1 minute

If limit exceeded → 429 Too Many Requests
With Retry-After header
```

### CORS & CSRF Protection

```
CORS
├─ Whitelist frontend domains
├─ Allow credentials
└─ Specific HTTP methods

CSRF
├─ SameSite=Strict cookies
├─ Double-submit tokens
└─ Preflight checks
```

---

## Performance Considerations

### Frontend Optimization

#### **Bundle Size**
- Angular standalone: ~150KB
- Bootstrap: ~50KB
- Leaflet: ~40KB
- Total gzipped: ~250KB

#### **Code Splitting**
```typescript
// Lazy-loaded routes
{
  path: 'itineraries',
  loadComponent: () => import('./features/planner/...').then(m => m.ItineraryComponent)
}
```

#### **Caching Strategy**
- Service worker for static assets
- HTTP cache headers for API responses
- ShareReplay(1) for expensive HTTP calls

#### **Rendering Performance**
- OnPush change detection where possible
- Signals for reactive state (better than RxJS for this)
- Lazy-load images with IntersectionObserver

### Backend Optimization

#### **Database Queries**
```typescript
// ✅ Good: Selective fields, proper includes
const itinerary = await prisma.itinerary.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    name: true,
    items: {
      select: {
        id: true,
        dayNumber: true,
        activity: { select: { name: true } }
      }
    }
  }
});

// ❌ Bad: N+1 problem
const itinerary = await prisma.itinerary.findUnique({ where: { id: 1 } });
for (const item of itinerary.items) {
  const activity = await prisma.activity.findUnique({ where: { id: item.activityId } });
}
```

#### **Connection Pooling**
```
PostgreSQL connection pool: 20 connections max
Prisma manages pool automatically
Configure via connection string query params
```

#### **Indexes**
```sql
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_chat_session_user_id ON "ChatSession"(userId);
CREATE INDEX idx_itinerary_user_id ON "Itinerary"(userId);
CREATE INDEX idx_itinerary_item_itinerary_id ON "ItineraryItem"(itineraryId);
```

#### **Response Compression**
- gzip enabled by default
- Response < 1MB enforced
- JSON streaming for large datasets

### AI Optimization

#### **Token Management**
- Limit conversation history to 5 messages
- Limit POIs to 40 activities, 20 accommodations
- Use compact JSON representations

#### **Latency Optimization**
- 30-second timeout per Gemini API call
- Model fallback reduces retry cost
- Exponential backoff prevents API overload

#### **Cost Optimization**
- gemini-2.5-flash preferred (fast & reasonable cost)
- Retry only on network errors, not on timeouts
- Cache location search results

---

## Scalability & Future

### Current Bottlenecks

1. **AI API Calls**: Slow (2-5 seconds)
   - Solution: Implement AI response caching by location/preferences
   
2. **Map Rendering**: Slow with 40+ markers
   - Solution: Use markercluster.js (already implemented)
   
3. **Database**: Single PostgreSQL instance
   - Solution: Read replicas for scaling reads
   
4. **Frontend Size**: Could be optimized further
   - Solution: Dynamic imports, more aggressive tree-shaking

### Scaling Strategy

#### **Horizontal Scaling** (Add more servers)
- Backend: Run multiple Express instances behind load balancer
- Frontend: Already distributed via Vercel CDN

#### **Vertical Scaling** (Bigger servers)
- PostgreSQL: Upgrade to larger instance
- Render: Increase RAM/CPU allocation

#### **Caching Layer**
- Redis for:
  - Session tokens
  - Location search results
  - AI response cache
  - Chat session state

#### **Microservices** (Future)
- Separate AI service
- Separate notifications service
- Separate file upload service

#### **Database Scaling**
- Sharding by locationId
- Read replicas
- Connection pooling optimization

---

## Deployment Architecture

### Frontend (Vercel)

```
Git Push → GitHub
    ↓
Vercel builds
    ↓
npm run build
    ↓
dist/SmartFare/browser/
    ↓
Vercel CDN (Edge)
    ↓
Automatic HTTPS
```

### Backend (Render)

```
Git Push → GitHub
    ↓
Render builds
    ↓
npm ci && npm run build
    ↓
Node.js runtime
    ↓
npm start
    ↓
Health check: /health
    ↓
Auto-restart on failure
```

### Database (PostgreSQL)

```
Cloud-hosted PostgreSQL
    ↓
Managed by provider
    ↓
Automated backups
    ↓
Connection pooling
```

---

## Monitoring & Observability

### Logging

```
Frontend:
├─ LoggerService with structured logging
├─ Error tracking via service
└─ Export logs for debugging

Backend:
├─ Request logging (method, path, duration)
├─ Error logging with stack traces
├─ AI API logging (model, latency)
└─ Database query logging
```

### Health Checks

```
GET /health → { status: "ok" }
Used by Render for auto-restart
Called every 30 seconds
```

### Metrics to Monitor

- API response times
- Database query latency
- AI API success rate
- Error rates
- User sessions
- Chat conversations

---

## Next Steps for Production

1. ✅ AI reliability (validators, fallbacks, timeouts)
2. ✅ Security hardening (strong passwords, CORS, rate limiting)
3. ✅ Error boundaries (frontend crash prevention)
4. ⏳ Load testing (benchmark under 1000+ concurrent users)
5. ⏳ CDN optimization (image caching, edge functions)
6. ⏳ Monitoring setup (Datadog, Sentry, New Relic)
7. ⏳ Backup & DR (automated backups, disaster recovery)
8. ⏳ Documentation (API docs, runbooks, troubleshooting)

---

*Last Updated: May 14, 2026*
