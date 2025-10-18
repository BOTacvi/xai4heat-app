# Quick Start for Session 2

Everything is ready! Here's what you need to know to start building.

---

## ✅ What's Already Done

- ✅ Authentication system (login, signup, password reset)
- ✅ User settings in database
- ✅ All page templates created
- ✅ All components follow standards
- ✅ Directory structure organized
- ✅ CSS Modules throughout
- ✅ Build verified ✅

---

## 🎯 Component Standards (Quick Reference)

### Creating a New Component

1. **Create directory in proper location:**
   - `/components/globals/` - Layout components
   - `/components/atoms/` - Basic building blocks
   - `/components/fields/` - Form inputs
   - `/components/molecules/` - Combinations of atoms
   - `/app/[page]/components/` - Page-specific

2. **Create 3 files:**
   ```
   ComponentName/
   ├── ComponentName.component.tsx
   ├── ComponentName.module.css
   └── index.ts
   ```

3. **Component structure:**
   ```typescript
   'use client' // Only if needs interactivity

   import clsx from 'clsx'
   import styles from './ComponentName.module.css'

   type ComponentNameProps = {
     className?: string
     // ... other props
   }

   const ComponentName: React.FC<ComponentNameProps> = ({
     className,
     ...props
   }) => {
     const classes = clsx(
       styles.componentName,    // Local styles
       'global-class',          // Global if needed
       className                // Parent override
     )

     return <div className={classes}>...</div>
   }

   export default ComponentName
   ```

4. **CSS file (kebab-case names):**
   ```css
   .componentName {  /* camelCase in TS, kebab-case in CSS */
     @apply /* tailwind classes */;
   }

   .componentName-element { }
   .componentName-variant { }
   ```

5. **Index file:**
   ```typescript
   export { default } from './ComponentName.component'
   ```

---

## 📁 Where Things Are

### Existing Components You Can Use:
```typescript
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/fields/Input'
import NavLink from '@/components/atoms/NavLink'
import GlobalHeader from '@/components/globals/GlobalHeader'
import GlobalNavigation from '@/components/globals/GlobalNavigation'
```

### Auth Hook:
```typescript
'use client'
import { useAuth } from '@/lib/contexts/AuthContext'

function MyComponent() {
  const { user, settings, logout, refreshSettings } = useAuth()

  // user.email, user.id
  // settings.expected_temp_min, settings.expected_temp_max
  // settings.expected_pressure_min, settings.expected_pressure_max
}
```

### Server-Side Auth:
```typescript
import { getCurrentUser, getUserSettings } from '@/lib/supabase/server'

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const settings = await getUserSettings(user.id)
  // Use settings.expected_temp_min, etc.
}
```

### Database Queries:
```typescript
import { prisma } from '@/lib/prisma'

const measurements = await prisma.tuya_measurements.findMany({
  where: { device_id: 'L8_53_12' },
  orderBy: { datetime: 'desc' },
  take: 100
})
```

---

## 🚀 Session 2 Checklist

### Before You Start:
1. Install chart library: `npm install recharts date-fns react-day-picker`
2. Review `claude.md` for standards
3. Check `FINAL_SUMMARY.md` for what's been done

### Page Templates Ready:
- ✅ `/app/thermionix/page.tsx` - Has auth check, TODOs marked
- ✅ `/app/scada/page.tsx` - Has auth check, TODOs marked
- ✅ `/app/weatherlink/page.tsx` - Has auth check, TODOs marked

### What to Build (Session 2):

**Thermionix Page:**
1. Create `/components/molecules/ApartmentSelector/` - Dropdown to select apartment
2. Create `/app/thermionix/components/TemperatureCard/` - Current temp + status
3. Create `/app/thermionix/components/TemperatureGraph/` - Recharts line chart
4. Create `/app/thermionix/components/PressureCard/` - Current pressure + status
5. Create `/app/thermionix/components/PressureGraph/` - Recharts line chart
6. Create `/components/molecules/DateRangePicker/` - Select date range

**API Routes:**
1. Create `/app/api/apartments/route.ts` - List all apartments
2. Create `/app/api/measurements/[id]/route.ts` - Get measurements for apartment
3. Create `/app/api/weatherlink/route.ts` - Get outside temperature

**Real-Time:**
1. Create `/lib/realtime/thermionix.ts` - Supabase subscription helpers
2. Wire up subscriptions in components

---

## 🎨 Styling Quick Reference

**Use Tailwind with @apply:**
```css
.componentName {
  @apply flex items-center gap-4 p-4;
  @apply bg-white rounded-lg shadow-sm;
  @apply hover:shadow-md transition-shadow;
}
```

**Complex animations in CSS:**
```css
.componentName {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Global utilities in globals.css:**
```css
.card {
  @apply bg-white rounded-xl shadow-sm p-6;
}
```

---

## 🐛 Common Patterns

### Server Component Fetching Data:
```typescript
export default async function Page() {
  const user = await getCurrentUser()
  const settings = await getUserSettings(user.id)
  const data = await prisma.table.findMany()

  return <ClientComponent initialData={data} settings={settings} />
}
```

### Client Component with Real-Time:
```typescript
'use client'

export const MyComponent: React.FC<MyComponentProps> = ({
  initialData
}) => {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    const unsubscribe = subscribeToUpdates((newData) => {
      setData(newData)
    })
    return unsubscribe  // Cleanup
  }, [])

  return <div>{/* Render data */}</div>
}
```

### API Route:
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await prisma.table.findMany()
  return NextResponse.json(data)
}
```

---

## 📖 Reference Documents

- **CLAUDE.md** - All component standards
- **FINAL_SUMMARY.md** - What's been done
- **AUTH_SETUP.md** - How auth works
- **ARCHITECTURE_DECISIONS.md** - Why we chose each tech
- **QUICK_REFERENCE.md** - Code snippets

---

## ✅ Verification Before Starting

Run these to ensure everything works:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Test build
npm run build

# Start dev server
npm run dev
```

All should succeed ✅

---

## 🎯 First Steps for Session 2

1. Install chart libraries:
   ```bash
   npm install recharts date-fns react-day-picker
   ```

2. Create first API route (apartments list):
   ```bash
   mkdir -p app/api/apartments
   # Create route.ts following API pattern
   ```

3. Create ApartmentSelector component:
   ```bash
   mkdir -p components/molecules/ApartmentSelector
   # Follow 3-file pattern
   ```

4. Wire up in Thermionix page
5. Test and iterate

**Follow the patterns, reference the docs, and you're good to go!** 🚀
