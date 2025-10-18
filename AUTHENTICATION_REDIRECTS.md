# Authentication & Redirect System

## Overview

This document explains how authentication and redirects work in the Thermionix app. The system has **multiple layers** of protection to ensure unauthenticated users are always redirected to login.

---

## Architecture Layers

### 1. **Middleware (Server-Side - First Line of Defense)**
**File**: `middleware.ts`

**What it does**:
- Runs BEFORE every request (on the Edge)
- Checks authentication status from cookies
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from auth pages

**Example Flow**:
```
User visits /thermionix
    ↓
Middleware checks auth cookie
    ↓
Not authenticated?
    ↓
Redirect to /login?redirectTo=/thermionix
```

**Code**:
```typescript
if (!user && isProtectedRoute) {
  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('redirectTo', path)
  return NextResponse.redirect(redirectUrl)
}
```

---

### 2. **Layout (Server Component - Second Line)**
**File**: `app/layout.tsx`

**What it does**:
- Fetches initial user on server
- Wraps errors in try-catch (graceful failure)
- Only shows header/nav for authenticated users
- Prevents crashes if auth check fails

**Code**:
```typescript
let initialUser = null;

try {
  initialUser = await getCurrentUser();
} catch (error) {
  console.error("Error fetching user in layout:", error);
  // Continue with null user instead of crashing
}

// Conditionally render navigation
{initialUser && (
  <>
    <GlobalHeader />
    <GlobalNavigation />
    <main>{children}</main>
  </>
)}

{!initialUser && <>{children}</>}
```

---

### 3. **AuthRedirect Component (Client-Side - Third Line)**
**File**: `lib/contexts/AuthContext/AuthRedirect.component.tsx`

**What it does**:
- Monitors auth state changes in real-time
- Redirects when user becomes unauthenticated
- Handles session expiration during usage
- Preserves URL for return after login

**When it triggers**:
- User was logged in, then session expires
- User logs out in another tab
- Token becomes invalid
- Auth state changes to null

**Code**:
```typescript
useEffect(() => {
  if (loading) return

  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const loginUrl = `/login?redirectTo=${encodeURIComponent(pathname)}`
    router.push(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    router.push('/thermionix')
  }
}, [user, loading, pathname, router])
```

---

### 4. **API Client (Client-Side - Fourth Line)**
**File**: `lib/utils/apiClient.ts`

**What it does**:
- Intercepts all API calls
- Detects 401 Unauthorized responses
- Automatically redirects to login
- Preserves current page for return

**When it triggers**:
- API returns 401 status
- User's session expired mid-session
- Auth token becomes invalid

**Code**:
```typescript
if (response.status === 401) {
  console.error('[ApiClient] 401 Unauthorized - redirecting to login')

  const currentPath = window.location.pathname
  const loginUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}`

  window.location.href = loginUrl

  throw new ApiError('Unauthorized - please login', 401, data)
}
```

**Usage**:
```typescript
// Instead of fetch:
const response = await fetch('/api/devices')
const data = await response.json()

// Use apiClient (automatically handles 401):
import { apiClient } from '@/lib/utils'
const devices = await apiClient.get('/api/devices')
```

---

### 5. **Page-Level Auth Checks (Server Components)**
**Example**: `app/thermionix/page.tsx`

**What it does**:
- Each protected page checks auth
- Redirects to login if not authenticated
- Double protection (belt and suspenders)

**Code**:
```typescript
export default async function ThermionixPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Page content
}
```

---

## Redirect Flow with URL Preservation

### Scenario: User Tries to Access Protected Page

```
1. User visits /thermionix (not logged in)
        ↓
2. Middleware catches: redirects to /login?redirectTo=/thermionix
        ↓
3. User sees login page
        ↓
4. User enters credentials
        ↓
5. LoginForm reads redirectTo parameter
        ↓
6. On success: router.push(redirectTo) → back to /thermionix
```

### Code in LoginForm:
```typescript
const searchParams = useSearchParams()
const redirectTo = searchParams.get('redirectTo') || '/thermionix'

// After successful login:
router.push(redirectTo)
```

---

## Protected vs Public Routes

### Protected Routes (Require Authentication):
- `/thermionix` - Thermionix monitoring
- `/scada` - SCADA monitoring
- `/weatherlink` - Weather data
- `/settings` - User settings
- `/settings/user` - User profile
- `/settings/app` - App configuration

### Public Routes (No Authentication Required):
- `/` - Homepage/landing page
- `/login` - Login page
- `/signup` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset confirmation

---

## Error Handling Scenarios

### 1. Auth Service Down
```
Layout tries: await getCurrentUser()
    ↓
Throws error
    ↓
Caught by try-catch
    ↓
initialUser = null
    ↓
User sees public pages only
```

### 2. API Returns 401 During Usage
```
User clicks button → API call
    ↓
API returns 401 Unauthorized
    ↓
apiClient detects 401
    ↓
window.location.href = '/login?redirectTo=...'
    ↓
Full page redirect to login
```

### 3. Session Expires Mid-Session
```
User browsing app
    ↓
Auth token expires
    ↓
AuthRedirect detects user becomes null
    ↓
router.push('/login?redirectTo=...')
    ↓
Client-side redirect to login
```

### 4. User Logs Out in Another Tab
```
Tab A: User clicks logout
    ↓
Supabase auth state changes
    ↓
Tab B: AuthContext listener fires
    ↓
Tab B: setUser(null)
    ↓
Tab B: AuthRedirect detects null user
    ↓
Tab B: Redirects to login
```

---

## Testing the System

### Test 1: Try Protected Page While Logged Out
1. Clear cookies (logout if logged in)
2. Visit `/thermionix` directly
3. **Expected**: Redirect to `/login?redirectTo=/thermionix`
4. Login with credentials
5. **Expected**: Redirect back to `/thermionix`

### Test 2: Try Login Page While Logged In
1. Make sure you're logged in
2. Visit `/login` directly
3. **Expected**: Redirect to `/thermionix`

### Test 3: Session Expiration
1. Login to app
2. Open browser DevTools
3. Clear auth cookies manually
4. Click any button that makes API call
5. **Expected**: Redirect to login

### Test 4: API 401 Error
1. Login to app
2. Make API call that returns 401
3. **Expected**: Automatic redirect to login with current page preserved

---

## Configuration

### Adding New Protected Routes

**In Middleware**:
```typescript
// middleware.ts
const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
const isProtectedRoute = !isPublicRoute && path !== '/'
```

**In AuthRedirect**:
```typescript
// AuthRedirect.component.tsx
const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password']
```

### Adding New Public Routes

Just add to the `publicRoutes` arrays above.

---

## Common Issues & Solutions

### Issue: Infinite Redirect Loop
**Symptom**: Page keeps redirecting back and forth
**Cause**: Route is in both public and protected lists
**Solution**: Check middleware.ts and AuthRedirect.component.tsx - ensure route is only in one list

### Issue: "Loading..." Stuck Forever
**Symptom**: AuthRedirect shows loading screen indefinitely
**Cause**: AuthContext not updating `loading` state
**Solution**: Check AuthContext.component.tsx - ensure `setLoading(false)` is called

### Issue: Login Redirects to Wrong Page
**Symptom**: After login, user goes to `/thermionix` instead of intended page
**Cause**: `redirectTo` parameter not being set or read correctly
**Solution**: Check middleware.ts sets it, LoginForm.component.tsx reads it

### Issue: API Calls Don't Redirect on 401
**Symptom**: API returns 401 but user stays on page
**Cause**: Using `fetch` directly instead of `apiClient`
**Solution**: Replace all `fetch` calls with `apiClient.get/post/put/del`

---

## Backend Learning Notes

### Why Multiple Layers?
**Defense in depth** - If one layer fails, others catch it:
1. **Middleware**: Fast, server-side, runs on Edge
2. **Layout**: Graceful error handling, prevents crashes
3. **AuthRedirect**: Client-side monitoring, real-time
4. **API Client**: Catches auth failures during operations
5. **Page checks**: Final safety net

### Server vs Client Auth Checks

**Server (Middleware, Layout, Pages)**:
- Faster (no client download needed)
- SEO friendly (crawlers see redirect)
- Secure (can't be bypassed by disabling JavaScript)

**Client (AuthRedirect, API Client)**:
- Handles runtime changes (session expiration)
- Better UX (client-side navigation)
- Catches API failures

### URL Preservation
The `?redirectTo=` parameter ensures users return to where they were:
```typescript
// User at /thermionix/device/42
// Session expires
// Redirects to /login?redirectTo=/thermionix/device/42
// After login, returns to /thermionix/device/42
```

This is called **deep linking** and greatly improves UX.

---

## Files Modified

1. ✅ `middleware.ts` - Server-side auth checks
2. ✅ `app/layout.tsx` - Error handling, conditional rendering
3. ✅ `lib/contexts/AuthContext/AuthRedirect.component.tsx` - Client-side monitoring (NEW)
4. ✅ `lib/contexts/AuthContext/index.ts` - Export AuthRedirect
5. ✅ `app/login/components/LoginForm/LoginForm.component.tsx` - Redirect handling
6. ✅ `lib/utils/apiClient.ts` - API error interceptor (NEW)
7. ✅ `lib/utils/index.ts` - Export apiClient

---

## Next Steps

When building new features:
1. Use `apiClient` instead of `fetch` for all API calls
2. Protected pages should call `getCurrentUser()` and redirect if null
3. Add new protected routes to both middleware and AuthRedirect
4. Test with cleared cookies to ensure redirect works
