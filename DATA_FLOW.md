# Data Flow Architecture

Visual guide to understand how data moves through the application.

---

## 1. Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Action                             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                    Visit /thermionix
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Middleware (Edge)                            │
│  - Runs on every request                                        │
│  - Reads auth cookie                                            │
│  - Validates JWT token                                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                    Is user authenticated?
                    ┌────────┴────────┐
                    │                 │
                   Yes                No
                    │                 │
                    ↓                 ↓
         ┌──────────────────┐  ┌─────────────────┐
         │ Continue to page │  │ Redirect to     │
         │                  │  │ /login          │
         └────────┬─────────┘  └─────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Root Layout (Server)                         │
│  - Calls getCurrentUser()                                       │
│  - Fetches user from Supabase                                   │
│  - Passes initialUser to AuthProvider                           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  AuthProvider (Client)                          │
│  - Receives initialUser                                         │
│  - Sets up onAuthStateChange listener                           │
│  - Fetches user settings from /api/user/settings                │
│  - Provides { user, settings, logout } via Context              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Page Component                               │
│  - Can access useAuth() hook                                    │
│  - Shows user data                                              │
│  - Calls logout() on button click                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Page Render Flow (Server + Client)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Request                              │
│                    GET /thermionix                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Server Component (page.tsx)                        │
│  - Runs on Next.js server                                       │
│  - Can import Prisma                                            │
│  - Can await database queries                                   │
│  - Generates initial HTML                                       │
│                                                                 │
│  Example:                                                       │
│    const user = await getCurrentUser()                          │
│    const measurements = await prisma.tuya_measurements.findMany()│
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                   Pass data as props
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Client Component (Chart, Card)                     │
│  - Has 'use client' directive                                   │
│  - Can use useState, useEffect                                  │
│  - Can handle onClick, onChange                                 │
│  - Receives initial data from server                            │
│  - Subscribes to real-time updates                              │
│                                                                 │
│  Example:                                                       │
│    function Chart({ initialData }) {                            │
│      const [data, setData] = useState(initialData)              │
│      useEffect(() => {                                          │
│        subscribeToUpdates((newData) => setData(newData))        │
│      }, [])                                                     │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Server Components render ONCE on server
- Client Components hydrate in browser and become interactive
- Server → Client data flow is one-way (props)
- Client can then manage its own state

---

## 3. Real-Time Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    IoT Device                                   │
│  - Thermionix sensor measures temperature                       │
│  - Sends data to your backend                                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Your Backend Script                                │
│  - Receives measurement                                         │
│  - Inserts into PostgreSQL:                                     │
│    INSERT INTO tuya_measurements VALUES (...)                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                                │
│  - Row inserted into tuya_measurements                          │
│  - Triggers LISTEN/NOTIFY                                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Supabase Realtime Service                          │
│  - Listens to database changes (CDC)                            │
│  - Broadcasts to WebSocket subscribers                          │
│  - Only sends to clients subscribed to this device_id           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Client Component (Browser)                         │
│  - Subscribed via:                                              │
│    supabase.channel('apartment:L8_53_12')                       │
│      .on('postgres_changes', { table: 'tuya_measurements' })    │
│  - Receives new measurement                                     │
│  - Calls callback: onNewMeasurement(data)                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              React State Update                                 │
│  - setState(newData)                                            │
│  - Component re-renders                                         │
│  - Chart updates automatically                                  │
│  - Color changes if value is out of range                       │
└─────────────────────────────────────────────────────────────────┘
```

**Why this is powerful:**
- ✅ No polling (efficient)
- ✅ Near-instant updates (< 1 second)
- ✅ Filtered at DB level (only relevant data sent)
- ✅ Automatic reconnection on disconnect

---

## 4. API Route Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Client Component                                   │
│  - User changes date range                                      │
│  - Calls: fetch('/api/measurements/L8_53_12?from=2025-01-01')  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              API Route Handler                                  │
│              (app/api/measurements/[id]/route.ts)               │
│                                                                 │
│  STEP 1: Authentication                                         │
│    const supabase = await createServerClient()                 │
│    const { user } = await supabase.auth.getUser()              │
│    if (!user) return 401 Unauthorized                           │
│                                                                 │
│  STEP 2: Parse params                                           │
│    const apartmentId = params.id                                │
│    const from = searchParams.get('from')                        │
│    const to = searchParams.get('to')                            │
│                                                                 │
│  STEP 3: Query database                                         │
│    const measurements = await prisma.tuya_measurements.findMany({│
│      where: {                                                   │
│        device_id: apartmentId,                                  │
│        datetime: { gte: from, lte: to }                         │
│      },                                                         │
│      orderBy: { datetime: 'asc' }                               │
│    })                                                           │
│                                                                 │
│  STEP 4: Return response                                        │
│    return NextResponse.json(measurements)                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Client Component                                   │
│  - Receives JSON response                                       │
│  - Updates chart data:                                          │
│    setChartData(measurements)                                   │
│  - Recharts re-renders with new data                            │
└─────────────────────────────────────────────────────────────────┘
```

**Security layers:**
1. ✅ Middleware checks auth before request reaches API
2. ✅ API route validates user again
3. ✅ Prisma query filtered by user's permissions
4. ✅ No raw SQL (prevents SQL injection)

---

## 5. Form Submission Flow (Login Example)

```
┌─────────────────────────────────────────────────────────────────┐
│              User Action                                        │
│  - Enters email/password                                        │
│  - Clicks "Sign In"                                             │
│  - onSubmit triggered                                           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Client Component (LoginForm)                       │
│                                                                 │
│  const handleSubmit = async (e) => {                            │
│    e.preventDefault()  // Stop page reload                      │
│                                                                 │
│    // Client-side validation                                    │
│    if (!email || !password) {                                   │
│      setError('Fill all fields')                                │
│      return                                                     │
│    }                                                            │
│                                                                 │
│    // Call Supabase                                             │
│    const { data, error } = await supabase.auth                  │
│      .signInWithPassword({ email, password })                   │
│                                                                 │
│    if (error) {                                                 │
│      setError(error.message)                                    │
│      return                                                     │
│    }                                                            │
│                                                                 │
│    // Success! Redirect                                         │
│    router.push('/thermionix')                                   │
│    router.refresh()  // Re-fetch server components              │
│  }                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Supabase Auth API                                  │
│  - Validates credentials                                        │
│  - Checks if user exists                                        │
│  - Verifies password hash                                       │
│  - Generates JWT token                                          │
│  - Returns token + user object                                  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Browser                                            │
│  - Receives response                                            │
│  - Stores token in httpOnly cookie (automatic)                  │
│  - Triggers onAuthStateChange in AuthContext                    │
│  - Navigates to /thermionix                                     │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Middleware                                         │
│  - Intercepts /thermionix request                               │
│  - Reads auth cookie                                            │
│  - Validates token (now valid!)                                 │
│  - Allows request through                                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                    User sees protected page ✅
```

---

## 6. Settings Update Flow

```
User changes temp range (23-26°C)
             ↓
┌───────────────────────────────────────────────┐
│  Settings Form (Client Component)            │
│  - handleSubmit calls:                        │
│    fetch('/api/user/settings', {              │
│      method: 'PUT',                           │
│      body: JSON.stringify({                   │
│        expected_temp_min: 23,                 │
│        expected_temp_max: 26                  │
│      })                                       │
│    })                                         │
└───────────────┬───────────────────────────────┘
                ↓
┌───────────────────────────────────────────────┐
│  API Route: PUT /api/user/settings            │
│  - Authenticates user                         │
│  - Validates input (min < max)                │
│  - Updates database:                          │
│    await prisma.userSettings.update({         │
│      where: { user_id },                      │
│      data: { expected_temp_min: 23, ... }     │
│    })                                         │
│  - Returns updated settings                   │
└───────────────┬───────────────────────────────┘
                ↓
┌───────────────────────────────────────────────┐
│  Settings Form                                │
│  - Calls refreshSettings() from AuthContext   │
│  - Shows success message                      │
└───────────────┬───────────────────────────────┘
                ↓
┌───────────────────────────────────────────────┐
│  AuthContext                                  │
│  - refreshSettings() fetches new values       │
│  - Updates context state                      │
│  - All components using useAuth() re-render   │
└───────────────┬───────────────────────────────┘
                ↓
┌───────────────────────────────────────────────┐
│  Thermionix Page                              │
│  - useAuth() gets updated settings            │
│  - Cards check temperature against new range  │
│  - Colors update immediately:                 │
│    - 22°C was normal, now warning-low         │
│    - 27°C was normal, now warning-high        │
└───────────────────────────────────────────────┘
```

**Key insight:** Context propagates changes to all components automatically!

---

## Summary

**Data flows in layers:**
1. **User** → Browser
2. **Browser** → Middleware (auth check)
3. **Middleware** → Server Component (initial render)
4. **Server** → Client Component (hydration)
5. **Client** → API Route (user actions)
6. **API** → Database (queries)
7. **Database** → Supabase Realtime → Client (live updates)

**Security checks at every layer:**
- Middleware: Auth token validation
- Server Components: User permissions
- API Routes: Authentication + authorization
- Database: Row Level Security (optional, for extra security)

**Performance optimizations:**
- Server Components: No client JS for static content
- Streaming: Show UI before all data loads
- Real-time: No polling, push-based updates
- Caching: Prisma deduplicates queries during request
