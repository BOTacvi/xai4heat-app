# System Architecture Overview

Complete visual guide to how all the pieces fit together.

---

## 🏗️ Full Stack Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP Request (GET /thermionix)
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS MIDDLEWARE (Edge)                    │
│  Location: middleware.ts                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Read auth cookie from request                           │ │
│  │ 2. Validate JWT token with Supabase                        │ │
│  │ 3. Decision:                                               │ │
│  │    - Valid token → Allow request                           │ │
│  │    - Invalid/missing → Redirect to /login                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (Node.js)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ROOT LAYOUT (Server Component)                           │  │
│  │ Location: app/layout.tsx                                 │  │
│  │                                                          │  │
│  │ - Calls: getCurrentUser() (server-side)                 │  │
│  │ - Fetches user from Supabase Auth                       │  │
│  │ - Passes initialUser to AuthProvider                    │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ PAGE COMPONENT (Server Component)                          ││
│  │ Location: app/thermionix/page.tsx                          ││
│  │                                                            ││
│  │ - Runs on server (not in browser)                         ││
│  │ - Can import Prisma directly                              ││
│  │ - Fetches initial data:                                   ││
│  │   • User info                                             ││
│  │   • User settings                                         ││
│  │   • Initial measurements                                  ││
│  │ - Renders HTML                                            ││
│  │ - Passes data as props to Client Components               ││
│  └────────────────────────┬───────────────────────────────────┘│
│                           │                                     │
│                           │ (HTML + Props)                      │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ AuthProvider (Client Component)                            │ │
│  │ Location: lib/contexts/AuthContext                         │ │
│  │                                                            │ │
│  │ - Hydrates with initialUser from server                   │ │
│  │ - Subscribes to auth changes: supabase.onAuthStateChange  │ │
│  │ - Fetches settings from: /api/user/settings               │ │
│  │ - Provides: { user, settings, logout } via useAuth()      │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Interactive Components (Client Components)                 │ │
│  │                                                            │ │
│  │ ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │ │
│  │ │TemperatureCard│  │TemperatureGraph│  │DateRangePicker │ │ │
│  │ └──────────────┘  └───────────────┘  └─────────────────┘ │ │
│  │                                                            │ │
│  │ - Use useState, useEffect                                 │ │
│  │ - Handle user interactions (clicks, form input)           │ │
│  │ - Call API routes for data                                │ │
│  │ - Subscribe to real-time updates                          │ │
│  │ - Access auth via: const { user } = useAuth()             │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                     User interactions
                     (button clicks, form submit)
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        API ROUTES                               │
│  Location: app/api/*/route.ts                                  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET /api/user/settings                                     │ │
│  │ - Authenticate user                                        │ │
│  │ - Query Prisma for user settings                           │ │
│  │ - Return JSON                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PUT /api/user/settings                                     │ │
│  │ - Authenticate user                                        │ │
│  │ - Validate input                                           │ │
│  │ - Update Prisma record                                     │ │
│  │ - Return updated settings                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET /api/measurements/[apartmentId]                        │ │
│  │ - Authenticate user                                        │ │
│  │ - Parse query params (date range)                          │ │
│  │ - Query Prisma for measurements                            │ │
│  │ - Return JSON                                              │ │
│  └────────────────────────┬───────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PRISMA ORM                                  │
│  Location: lib/prisma.ts                                       │
│                                                                 │
│  - Type-safe database queries                                  │
│  - Automatic migrations                                        │
│  - Connection pooling                                          │
│  - Query deduplication (within same request)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                            │
│  Provider: Supabase                                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ TABLES:                                                    │ │
│  │ - user_settings (our table via Prisma)                    │ │
│  │ - tuya_measurements (sensor data)                          │ │
│  │ - weatherlink_measurements (weather data)                  │ │
│  │ - scada_measurements (SCADA data)                          │ │
│  │                                                            │ │
│  │ + auth.users (Supabase managed)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ (LISTEN/NOTIFY)
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE REALTIME                             │
│                                                                 │
│  - Listens to PostgreSQL change events                         │
│  - Broadcasts to WebSocket subscribers                         │
│  - Filters by table/schema/row                                 │
│  - Handles reconnection automatically                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    WebSocket Connection
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CLIENT SUBSCRIPTIONS                           │
│  (In Client Components)                                        │
│                                                                 │
│  supabase.channel('apartment:L8_53_12')                        │
│    .on('postgres_changes', { table: 'tuya_measurements' })     │
│    .subscribe((payload) => {                                   │
│      setCurrentTemp(payload.new.temp_current)                  │
│    })                                                           │
│                                                                 │
│  → Automatically updates UI when new data arrives              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Examples

### Example 1: User Visits Protected Page

```
1. User → GET /thermionix
2. Middleware → Check auth cookie
   - Cookie exists? YES
   - Token valid? YES
   → Allow request
3. Server → Render page.tsx (Server Component)
   - Call getCurrentUser()
   - Fetch measurements from Prisma
   - Generate HTML
4. Browser → Receive HTML
   - Hydrate React components
   - AuthProvider sets up listener
   - Components become interactive
5. Client → Subscribe to real-time updates
   - supabase.channel().subscribe()
6. RESULT: User sees page with live data
```

### Example 2: User Changes Settings

```
1. User → Clicks "Save" in Settings form
2. Client → handleSubmit runs
   - Validate form data
   - Call fetch('/api/user/settings', { method: 'PUT', body: {...} })
3. API Route → PUT /api/user/settings
   - Authenticate user
   - Validate input (min < max)
   - Update Prisma: prisma.userSettings.update()
   - Return updated settings
4. Client → Receives response
   - Call refreshSettings() from AuthContext
   - AuthContext fetches new settings
   - Context updates, all components re-render
5. Dashboard → useAuth() gets new settings
   - Temperature cards check against new ranges
   - Colors update: 27°C now shows warning-high
6. RESULT: UI reflects new settings immediately
```

### Example 3: New Temperature Data Arrives

```
1. IoT Device → Sends measurement to your backend
2. Backend → INSERT INTO tuya_measurements (...)
3. PostgreSQL → Row inserted, triggers LISTEN/NOTIFY
4. Supabase Realtime → Detects change
   - Finds subscribers to this device_id
   - Broadcasts via WebSocket
5. Client → Subscription callback fires
   - setState(newData)
   - Component re-renders
6. Chart → Recharts receives new data point
   - Automatically adds to graph
   - Axis rescales if needed
7. Card → Compares new temp vs user's expected range
   - current < min → Blue background
   - current > max → Red background
   - within range → Green background
8. RESULT: Dashboard updates in < 1 second
```

---

## 🗂️ Component Hierarchy

```
app/layout.tsx (Server)
└── AuthProvider (Client)
    ├── GlobalHeader (Client)
    │   ├── Logo
    │   └── UserMenu
    │       └── useAuth() → { user, logout }
    │
    ├── GlobalNavigation (Server)
    │   └── NavLink (Client)
    │
    └── app/thermionix/page.tsx (Server)
        ├── [Fetches initial data server-side]
        │
        └── Client Components ↓
            ├── ApartmentSelector (Client)
            │   ├── Select (field component)
            │   └── useEffect: fetch apartments on mount
            │
            ├── TemperatureCard (Client)
            │   ├── useAuth() → settings
            │   ├── useEffect: subscribe to real-time
            │   ├── Current value display
            │   └── Status indicator (color based on range)
            │
            ├── TemperatureGraph (Client)
            │   ├── Recharts <LineChart>
            │   ├── DateRangePicker (Client)
            │   │   └── react-day-picker
            │   ├── useEffect: fetch data on date change
            │   └── useEffect: append real-time data
            │
            ├── PressureCard (Client)
            │   └── [Similar to TemperatureCard]
            │
            ├── PressureGraph (Client)
            │   └── [Similar to TemperatureGraph]
            │
            └── WeatherLinkSection (Client)
                ├── useEffect: fetch weather data
                └── Display outside temperature
```

---

## 📦 Data Model Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE AUTH                                │
│  (Managed by Supabase, not in your Prisma schema)              │
│                                                                 │
│  auth.users                                                     │
│  ┌─────────┬────────────────────┬────────────────┐             │
│  │ id (PK) │ email              │ encrypted_pw   │             │
│  │ uuid    │ user@example.com   │ ********       │             │
│  └────┬────┴────────────────────┴────────────────┘             │
└───────┼──────────────────────────────────────────────────────────┘
        │
        │ user_id (FK)
        │
        ↓
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR DATABASE (Prisma)                       │
│                                                                 │
│  user_settings                                                  │
│  ┌─────────┬──────────┬────────────────┬───────────────────┐   │
│  │ id (PK) │ user_id  │ expected_temp  │ expected_pressure │   │
│  │ uuid    │ uuid (FK)│ min/max        │ min/max           │   │
│  └─────────┴──────────┴────────────────┴───────────────────┘   │
│                                                                 │
│  tuya_measurements                                              │
│  ┌──────────────┬────────────┬─────────────┬────────────┐      │
│  │ datetime (PK)│ device_id  │ temp_current│ humidity   │      │
│  │ timestamp    │ varchar    │ int         │ int        │      │
│  └──────────────┴────────────┴─────────────┴────────────┘      │
│        ↑                                                        │
│        │ Foreign Key                                            │
│        │                                                        │
│  devices                                                        │
│  ┌──────────────┬─────────────┬──────────────┬──────────┐      │
│  │ device_id(PK)│ device_type │ location     │ name     │      │
│  │ varchar      │ enum        │ varchar      │ varchar  │      │
│  └──────────────┴─────────────┴──────────────┴──────────┘      │
│                                                                 │
│  weatherlink_measurements                                       │
│  ┌──────────────┬──────────┬──────────┬───────────┐            │
│  │ datetime (PK)│ location │ temp_out │ bar       │            │
│  │ timestamp    │ varchar  │ float    │ float     │            │
│  └──────────────┴──────────┴──────────┴───────────┘            │
│                                                                 │
│  scada_measurements                                             │
│  ┌──────────────┬──────────┬────────┬────────┬────────┐        │
│  │ datetime (PK)│ location │ t_amb  │ t_ref  │ ...    │        │
│  │ timestamp    │ varchar  │ float  │ float  │        │        │
│  └──────────────┴──────────┴────────┴────────┴────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Relationships:**
- `user_settings.user_id` → `auth.users.id` (Supabase Auth)
- `tuya_measurements.device_id` → `devices.device_id`

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Middleware (Edge)                                     │
│ - Validates JWT token                                          │
│ - Redirects unauthenticated users                              │
│ - Runs BEFORE every request                                    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: Server Components                                     │
│ - Calls getCurrentUser() to verify auth                        │
│ - Can redirect() if needed                                     │
│ - Never exposes sensitive data to client                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: API Routes                                            │
│ - Re-validates auth (never trust that middleware ran)          │
│ - Checks authorization (user can only access their data)       │
│ - Validates input (prevent SQL injection, XSS)                 │
│ - Rate limiting (future: add Upstash)                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: Database (Optional: RLS)                              │
│ - Row Level Security policies                                  │
│ - Even if API is bypassed, DB enforces access                  │
│ - user_settings: WHERE user_id = auth.uid()                    │
└─────────────────────────────────────────────────────────────────┘
```

**Defense in Depth:** Multiple layers ensure security even if one fails.

---

## 🚀 Performance Optimizations

### Server-Side Rendering (SSR)
```
Traditional SPA:               Next.js App Router:
Browser loads empty HTML       Browser receives fully rendered HTML
  ↓                              ↓
Download React bundle          HTML shows immediately (fast!)
  ↓                              ↓
Fetch data from API            Download minimal JS for interactivity
  ↓                              ↓
Render UI                      Hydrate (make interactive)
  ↓                              ↓
User sees content (slow!)      User can interact (fast!)
```

### Data Fetching Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│ INITIAL LOAD (Server Component)                                │
│ - Fetch all data on server                                     │
│ - Send complete HTML to browser                                │
│ - No loading spinners                                          │
│ - SEO-friendly                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USER INTERACTIONS (Client Component)                           │
│ - Fetch only changed data                                      │
│ - Show loading states for user actions                         │
│ - Optimistic updates (update UI before API confirms)           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REAL-TIME UPDATES (WebSocket)                                  │
│ - Push-based (no polling)                                      │
│ - Only send changed rows                                       │
│ - Filter at database level                                     │
│ - Debounce high-frequency updates                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Summary

**Layers:**
1. Edge (Middleware) - Auth guard
2. Server (Next.js) - Rendering & data fetching
3. Client (Browser) - Interactivity & real-time
4. API (Route Handlers) - Backend logic
5. Database (PostgreSQL) - Data storage

**Data Flow:**
- **Down:** Server → Client (props, initial render)
- **Up:** Client → API Routes → Database (user actions)
- **Realtime:** Database → Supabase → Client (live updates)

**Security:**
- Tokens in httpOnly cookies (XSS-safe)
- Auth checked at multiple layers
- Input validation on server
- Type safety with TypeScript

**Performance:**
- Server-side rendering (fast initial load)
- Minimal client JavaScript
- Real-time updates (no polling)
- Efficient queries (Prisma)

This architecture is **scalable**, **secure**, and **maintainable**. 🎉
