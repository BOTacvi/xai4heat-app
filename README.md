# Thermionix - Temperature & Pressure Monitoring App

A Next.js 15 application for monitoring Thermionix temperature and pressure sensors across multiple apartments and buildings.

## 🎯 Project Overview

**Tech Stack:**
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Modules
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL (via Supabase) with Prisma ORM
- **Icons:** lucide-react

## ✨ Features Implemented

### ✅ Authentication System
- Complete login/signup/forgot-password flow
- Server-side session management
- Protected routes with middleware
- 4-layer authentication system:
  1. Middleware (server-side)
  2. Layout error handling
  3. AuthRedirect component (client-side monitoring)
  4. API client with 401 interceptor

### ✅ Navigation
- Global navigation sidebar with icons
- Active route highlighting
- Conditional rendering (only for authenticated users)
- Routes: Home, Thermionix, SCADA, WeatherLink, Settings

### ✅ API Routes
- `/api/devices` - Fetch/create devices with extensive error handling
- `/api/thermionix` - Fetch temperature/humidity measurements with date filtering
- `/api/scada` - SCADA measurements
- `/api/weatherlink` - Weather data
- `/api/user/settings` - User preferences (temp/pressure ranges)

### ✅ Utilities
- Device name parsing (`"L8_33_67"` → Lamela 8, Building 33, Apartment 67)
- Location parsing (`"L8"` → Lamela 8)
- API client with automatic authentication handling
- Comprehensive error handling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Supabase account

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DIRECT_URL=postgresql://postgres:password@host:5432/postgres
```

3. **Generate Prisma client:**
```bash
npx prisma generate
```

4. **Push database schema:**
```bash
npx prisma db push
```

5. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
xai4heat-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── devices/              # Device CRUD
│   │   ├── thermionix/           # Temperature measurements
│   │   ├── scada/                # SCADA data
│   │   ├── weatherlink/          # Weather data
│   │   └── user/settings/        # User settings
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── forgot-password/          # Password reset
│   ├── thermionix/               # Thermionix monitoring (TODO)
│   ├── scada/                    # SCADA monitoring (TODO)
│   ├── weatherlink/              # Weather monitoring (TODO)
│   ├── settings/                 # Settings pages
│   ├── layout.tsx                # Root layout (auth wrapper)
│   └── page.tsx                  # Homepage
├── components/
│   ├── atoms/                    # Basic components (Button, NavLink)
│   ├── fields/                   # Form fields (Input)
│   └── globals/                  # Global components (Header, Navigation)
├── lib/
│   ├── contexts/                 # React contexts (Auth)
│   ├── supabase/                 # Supabase clients (server/client)
│   ├── utils/                    # Utility functions
│   │   ├── deviceParsing.ts     # Device name parsing
│   │   └── apiClient.ts         # API client with 401 handling
│   ├── prisma.ts                 # Prisma client
│   └── generated/prisma/         # Generated Prisma types
├── prisma/
│   └── schema.prisma             # Database schema
├── middleware.ts                 # Route protection
└── Documentation/
    ├── ARCHITECTURE_DECISIONS.md
    ├── AUTH_SETUP.md
    ├── AUTHENTICATION_REDIRECTS.md
    ├── ERROR_FIXES_EXPLAINED.md
    └── NEXT_STEPS.md
```

## 🗄️ Database Schema

### Key Tables
- **devices** - Physical sensor devices
  - `device_id` (String, PK)
  - `name` (e.g., "L8_33_67" - Lamela_Building_Apartment)
  - `location` (e.g., "L8" - just the lamela)

- **thermionyx_measurements** - Temperature/humidity data
  - `datetime`, `device_id`, `probe_id` (Composite PK)
  - `temperature`, `relative_humidity`, `co2`

- **scada_measurements** - SCADA system data

- **weatherlink_measurements** - Weather station data

- **user_settings** - User preferences
  - Temperature ranges (min/max)
  - Pressure ranges (min/max)

## 🔐 Authentication Flow

```
1. User visits /thermionix (not logged in)
        ↓
2. Middleware redirects to /login?redirectTo=/thermionix
        ↓
3. User enters credentials
        ↓
4. LoginForm reads redirectTo parameter
        ↓
5. On success: Redirects back to /thermionix
```

**4 Layers of Protection:**
1. Middleware (server-side, catches on initial request)
2. Layout (server-side, handles errors gracefully)
3. AuthRedirect (client-side, monitors runtime changes)
4. API Client (client-side, catches 401 errors)

## 🛠️ Common Issues & Solutions

### Build Errors with Turbopack
**Issue:** `ENOENT: no such file or directory` errors with `_buildManifest.js`

**Solution:** Turbopack is experimental and causes issues. Removed from scripts:
```json
// package.json
"scripts": {
  "dev": "next dev",        // ✅ No --turbopack flag
  "build": "next build"     // ✅ No --turbopack flag
}
```

If errors persist:
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run build
```

### Dynamic Server Usage Errors
**Issue:** "Route couldn't be rendered statically because it used `cookies`"

**Solution:** Added `export const dynamic = 'force-dynamic'` to layout.tsx

This is **expected** for auth-dependent apps - tells Next.js to render dynamically.

## 📚 Documentation

Comprehensive documentation available in project root:

- **ARCHITECTURE_DECISIONS.md** - Tech stack choices explained
- **AUTH_SETUP.md** - Authentication system guide
- **AUTHENTICATION_REDIRECTS.md** - 4-layer auth system explained
- **ERROR_FIXES_EXPLAINED.md** - Common errors and solutions
- **NEXT_STEPS.md** - Development roadmap

## 🎨 Component Conventions

Following `claude.md` guidelines:

```typescript
// Type naming
type ComponentNameProps = { ... }

// Component declaration
const ComponentName: React.FC<ComponentNameProps> = ({ ...props }) => {
  // Implementation
}

// CSS class naming (kebab-case)
.component-name { }
.component-name-element { }

// Class composition (clsx pattern)
const classes = clsx(
  styles.localClass,       // 1. Local module styles
  'global-utility-class',  // 2. Global utility classes
  className                // 3. Parent overrides
)
```

## 🚧 TODO / Next Steps

### Immediate Priority
1. **Build Thermionix Page** - Temperature/pressure monitoring UI
2. **Build SCADA Page** - Lamela-level monitoring
3. **Build WeatherLink Page** - Weather data display

### Components Needed
- ApartmentSelector (dropdown for device selection)
- TemperatureCard (current value with status)
- TemperatureGraph (historical data with date range)
- PressureCard
- PressureGraph
- Real-time data updates (Supabase Realtime)

### Future Enhancements
- Chart library integration (Recharts recommended)
- Date range picker
- Data export functionality
- Mobile responsive design improvements
- Performance monitoring

## 🧪 Testing

```bash
# Build for production
npm run build

# Run production build locally
npm run start
```

**Test Checklist:**
- [ ] Logout, visit `/thermionix` → Redirects to login
- [ ] Login → Redirects back to `/thermionix`
- [ ] Navigation shows correct icons
- [ ] Navigation hidden on homepage/auth pages
- [ ] API routes return data correctly
- [ ] Settings page loads user preferences

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [lucide-react Icons](https://lucide.dev)

## 📝 License

Private project - All rights reserved

---

**Current Status:** ✅ Authentication complete, Navigation working, API routes ready, UI pages pending implementation

**Last Updated:** October 2025
