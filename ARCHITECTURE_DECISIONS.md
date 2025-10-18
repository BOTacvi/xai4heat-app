# Architecture Decisions & Recommendations

This document explains the technical decisions made for this Next.js 14 app, with detailed reasoning for a frontend engineer learning backend concepts.

---

## 1. Authentication State Management

### ✅ CHOSEN: Server-Side Sessions + React Context

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│  Server Components (default)                            │
│  - Fetch user via getCurrentUser() (server-side)        │
│  - Pass initialUser to AuthProvider                     │
│  - Fast first render, SEO-friendly                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  React Context (AuthProvider)                           │
│  - Client component wrapping the app                    │
│  - Subscribes to Supabase auth changes                  │
│  - Provides { user, settings, logout } via useAuth()    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Middleware (Edge)                                      │
│  - Runs before every request                            │
│  - Redirects unauthenticated users to /login            │
│  - Redirects authenticated users away from auth pages   │
└─────────────────────────────────────────────────────────┘
```

**Why This Over Alternatives:**

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **React Context** ⭐ | ✅ Zero dependencies<br>✅ Perfect for auth<br>✅ Works with Server Components<br>✅ Simple API | ⚠️ Not for high-frequency updates | ✅ Auth state<br>✅ Theme/locale<br>✅ User preferences |
| **Zustand** | ✅ Small bundle<br>✅ Simple API<br>✅ Good DevTools | ❌ Extra dependency<br>❌ Client-only | ✅ Complex client state<br>✅ Shopping carts<br>✅ UI state machines |
| **Redux** | ✅ Powerful DevTools<br>✅ Ecosystem | ❌ Heavy boilerplate<br>❌ Large bundle<br>❌ Old paradigm | ✅ Very large apps<br>✅ Time-travel debugging<br>❌ NOT for small apps |
| **Server Actions** | ✅ No client state needed<br>✅ Progressive enhancement | ❌ No reactive UI<br>❌ Full page reloads | ✅ Forms<br>✅ Mutations<br>❌ NOT for auth checks |

**Key Insight:** Modern Next.js favors **server-first** architecture. Keep state on the server when possible, use client state sparingly.

---

## 2. Chart Library

### ✅ CHOSEN: Recharts

**Why Recharts:**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={temperatureData}>
    {/* Your temperature line */}
    <Line type="monotone" dataKey="temperature" stroke="#3b82f6" />

    {/* Expected range as shaded area */}
    <ReferenceArea
      y1={settings.expected_temp_min}
      y2={settings.expected_temp_max}
      fill="#10b981"
      opacity={0.1}
    />

    {/* Formatted date axis */}
    <XAxis
      dataKey="datetime"
      tickFormatter={(date) => format(date, 'MMM dd')}
    />
  </LineChart>
</ResponsiveContainer>
```

**Perfect for your use case:**
- ✅ Time-series data (temperature/pressure over time)
- ✅ Reference areas (to show expected ranges)
- ✅ Date formatting built-in
- ✅ Responsive by default
- ✅ React-friendly JSX syntax

**Comparison:**

| Library | Bundle Size | API Style | Performance | Best For |
|---------|-------------|-----------|-------------|----------|
| **Recharts** ⭐ | 100KB | JSX (declarative) | Good (1k-10k points) | Time-series, business charts |
| **Chart.js** | 60KB | Config object | Excellent (10k+ points) | Simple charts, max performance |
| **Victory** | 150KB | JSX | Fair (100s of points) | Small datasets, beautiful defaults |
| **Visx** | Variable | Low-level primitives | Excellent | Custom visualizations, advanced users |

**To install (do this next session):**
```bash
npm install recharts date-fns
```

---

## 3. Date Range Picker

### ✅ CHOSEN: react-day-picker + date-fns

**Implementation Pattern:**
```typescript
import { DayPicker } from 'react-day-picker'
import { subDays, subMonths, subYears } from 'date-fns'

function DateRangeSelector({ onRangeChange }) {
  const [range, setRange] = useState({ from: subDays(new Date(), 7), to: new Date() })

  return (
    <div>
      {/* Quick select buttons */}
      <button onClick={() => setRange({ from: subDays(new Date(), 7), to: new Date() })}>
        Last Week
      </button>
      <button onClick={() => setRange({ from: subMonths(new Date(), 1), to: new Date() })}>
        Last Month
      </button>

      {/* Custom picker */}
      <DayPicker mode="range" selected={range} onSelect={setRange} />
    </div>
  )
}
```

**Why This:**
- ✅ Lightweight (~15KB)
- ✅ Fully customizable with CSS
- ✅ ARIA-compliant (accessible)
- ✅ No external dependencies (except date-fns, which you need anyway for charts)
- ✅ Works great with Recharts' date formatting

**To install:**
```bash
npm install react-day-picker date-fns
```

---

## 4. Real-Time Updates

### ✅ CHOSEN: Supabase Realtime (PostgreSQL CDC)

**Architecture:**
```
PostgreSQL Database
     ↓
   INSERT new measurement
     ↓
Supabase listens to postgres changes (LISTEN/NOTIFY)
     ↓
Broadcasts via WebSocket to subscribed clients
     ↓
React components update automatically
```

**Implementation Example:**
```typescript
// lib/realtime/thermionix.ts
export function subscribeToApartmentMeasurements(
  apartmentId: string,
  onNewMeasurement: (data) => void
) {
  const channel = supabase
    .channel(`apartment:${apartmentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tuya_measurements',
        filter: `device_id=eq.${apartmentId}`
      },
      (payload) => {
        onNewMeasurement(payload.new)
      }
    )
    .subscribe()

  // Return cleanup function
  return () => channel.unsubscribe()
}

// In component
useEffect(() => {
  const unsubscribe = subscribeToApartmentMeasurements(
    apartmentId,
    (newData) => {
      setCurrentTemp(newData.temp_current)
      // Append to chart data
      setChartData(prev => [...prev, newData])
    }
  )

  return unsubscribe // Cleanup on unmount
}, [apartmentId])
```

**Why This Over Alternatives:**

| Approach | Setup | Performance | Cost | When to Use |
|----------|-------|-------------|------|-------------|
| **Supabase Realtime** ⭐ | Zero (already using Supabase) | Excellent | Free tier: 200 concurrent | ✅ DB changes<br>✅ Already using Supabase |
| **Socket.io** | Need separate server | Good | Server costs | ✅ Custom logic<br>✅ Room management |
| **Native WebSockets** | Manual implementation | Excellent | Server costs | ✅ Max control<br>❌ Need reconnection logic |
| **Server-Sent Events** | Simple | Good | Minimal | ✅ One-way updates<br>❌ Not for DB changes |
| **Polling** | Simplest | Poor | Database load | ❌ Avoid (inefficient) |

**Best Practices:**
```typescript
// ✅ DO: Cleanup subscriptions
useEffect(() => {
  const unsubscribe = subscribe()
  return unsubscribe // Prevent memory leaks
}, [apartmentId])

// ✅ DO: Handle connection states
const [status, setStatus] = useState('connecting')
channel.on('system', { event: 'connected' }, () => setStatus('connected'))

// ✅ DO: Debounce high-frequency updates
const debouncedUpdate = useMemo(() => debounce(setTemp, 500), [])

// ❌ DON'T: Subscribe in render
function Component() {
  subscribe() // ❌ WRONG - creates new subscription on every render
}

// ❌ DON'T: Forget to unsubscribe
useEffect(() => {
  subscribe()
  // ❌ Missing: return () => unsubscribe()
}, [])
```

---

## 5. API Routes vs Server Actions

**When to use each:**

### API Routes (Route Handlers)
```typescript
// app/api/measurements/route.ts
export async function GET(request: NextRequest) {
  // ✅ Good for:
  // - External APIs calling your app
  // - RESTful endpoints
  // - Non-form requests (GET, DELETE)
  // - Webhooks
}
```

**Use when:**
- ✅ Building a REST API
- ✅ Webhook endpoints
- ✅ Third-party integrations
- ✅ GET requests with query params

### Server Actions
```typescript
// app/actions.ts
'use server'

export async function updateSettings(formData: FormData) {
  // ✅ Good for:
  // - Form submissions
  // - Mutations from UI
  // - Progressive enhancement
}
```

**Use when:**
- ✅ Form submissions
- ✅ Button click mutations
- ✅ Progressive enhancement (works without JS)
- ✅ Tight coupling with UI

**For this app:**
- Auth API routes ✅ (might need external access later)
- Settings API routes ✅ (used by Context, might add mobile app)
- Measurements API routes ✅ (charts fetch data client-side)

---

## 6. Component Structure

**Following claude.md conventions:**

```
components/
├── atoms/              # Basic building blocks
│   ├── Button/
│   ├── Badge/
│   └── Spinner/
│
├── fields/             # Form-related components
│   ├── Input/
│   ├── Select/
│   └── TextArea/
│
└── molecules/          # Combinations of atoms
    ├── SearchBar/
    └── FormGroup/

app/
└── thermionix/
    ├── page.tsx                    # Server Component
    ├── Thermionix.css             # Page styles
    └── components/                 # Page-specific components
        ├── TemperatureCard/
        │   ├── TemperatureCard.component.tsx  # Client component
        │   ├── TemperatureCard.styles.css
        │   └── index.ts
        └── TemperatureGraph/
```

**Why this structure:**
- ✅ Clear separation (atoms vs molecules vs page-specific)
- ✅ Easy to find components
- ✅ Prevents circular dependencies
- ✅ Scales well

---

## 7. Styling Strategy

**Following claude.md conventions:**

### Tailwind (via @apply in CSS files)
```css
/* For: Spacing, colors, basic layout */
.button {
  @apply px-4 py-2 rounded-lg;
  @apply bg-blue-600 text-white;
  @apply hover:bg-blue-700;
}
```

### CSS files
```css
/* For: Complex animations, pseudo-elements */
.button::before {
  content: '';
  position: absolute;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### globals.css
```css
/* For: Design tokens, utility classes used everywhere */
:root {
  --color-primary: #3b82f6;
  --spacing-unit: 8px;
}

.card {
  @apply bg-white rounded-xl shadow-lg p-6;
}
```

**Why this approach:**
- ✅ Tailwind for rapid development
- ✅ CSS for complex cases
- ✅ No inline styles (maintainability)
- ✅ Follows Next.js best practices

---

## 8. Error Handling Pattern

**Layered error handling:**

```typescript
// 1. API Route Level
export async function GET(request: NextRequest) {
  try {
    const data = await prisma.measurement.findMany()
    return NextResponse.json(data)
  } catch (error) {
    console.error('DB error:', error) // Log details server-side
    return NextResponse.json(
      { error: 'Failed to fetch data' }, // Generic message to client
      { status: 500 }
    )
  }
}

// 2. Component Level
function TemperatureCard() {
  const [error, setError] = useState(null)

  try {
    // fetch data
  } catch (err) {
    setError(err.message)
  }

  if (error) return <ErrorMessage>{error}</ErrorMessage>
}

// 3. Error Boundary Level (for uncaught errors)
// app/error.tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## 9. Performance Considerations

### Server Components by Default
```typescript
// ✅ DO: Keep pages as Server Components
export default async function Page() {
  const data = await fetchData() // Server-side, fast
  return <ClientChart data={data} />
}

// ❌ DON'T: Make entire page client component
'use client'
export default function Page() {
  const [data, setData] = useState()
  useEffect(() => { fetchData() }, []) // Client-side, slow
}
```

### Streaming and Suspense
```typescript
// For slow data fetching
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <SlowDataComponent />
    </Suspense>
  )
}
```

### Caching Strategy
```typescript
// Prisma queries are cached during request
const data1 = await prisma.user.findUnique({ where: { id } })
const data2 = await prisma.user.findUnique({ where: { id } })
// ↑ Only hits DB once (deduped automatically)

// Force revalidation
export const revalidate = 60 // seconds
```

---

## Summary

This architecture prioritizes:
1. **Server-first** rendering (fast initial load)
2. **Minimal client JS** (better performance)
3. **Type safety** (TypeScript + Prisma)
4. **Security** (middleware + API auth checks)
5. **Maintainability** (clear file structure, conventions)

Each decision balances **simplicity** (easy to learn) with **scalability** (can grow).
