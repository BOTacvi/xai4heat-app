# Component Architecture Guidelines

## 1. Component Organization

### Global Components (src/components)

- **Fields**: Create a `fields/` subfolder for form-related components (Input, TextArea, etc.)
- **Atoms**: Create an `atoms/` folder for basic building blocks (Button, Select, Badge, etc.)
- **Molecules**: Create a `molecules/` folder for components that combine atoms (SearchBar, FormGroup, etc.)

### Page-Specific Components

- Create a `components/` folder within each page/route directory-if needed (if there are any dynamic parts of the page that needs to be created separately as client components)
- Only include components used exclusively on that page or subroute
- Keep page-specific logic isolated

## 2. Page Structure (Next.js App Router)

- **Pages**: Should be Server Components by default
- **Dynamic sections**: Extract into separate Client Components when interactivity is needed
- Mark Client Components with 'use client' directive only when necessary

## 3. File Structure Standards

### For Pages:

```
/app/page-name/
  ├── page.tsx (Server Component)
  ├── PageName.module.css
  └── components/
      └── PageSpecificComponent/
```

### For Components (3-file pattern):

```
/ComponentName/
  ├── ComponentName.component.tsx (component logic)
  ├── ComponentName.module.css (styles - ALWAYS use .module.css)
  └── index.ts (default export)
```

**Component File Structure:**

```typescript
// ComponentName.component.tsx
import clsx from 'clsx'
import styles from './ComponentName.module.css'

// 1. Always define props type with ComponentName + "Props" suffix
type ComponentNameProps = {
  className?: string
  // ... other props
}

// 2. Use React.FC<PropsType> pattern
export const ComponentName: React.FC<ComponentNameProps> = ({
  className,
  ...otherProps
}) => {
  // 3. Create classes using clsx with:
  //    - styles from module.css
  //    - className prop (for parent overrides)
  //    - global classes from globals.css if needed
  const classes = clsx(
    styles.container,           // Local styles first
    'global-utility-class',     // Global classes second
    className                   // Parent overrides last
  )

  return (
    <div className={classes}>
      {/* Component content */}
    </div>
  )
}
```

**Example (from GlobalNavigation):**
```typescript
type GlobalNavigationProps = {
  className?: string
}

export default function GlobalNavigation({ className }: GlobalNavigationProps) {
  const classes = clsx(
    styles.sidebar,
    "thermionix-white-container",
    className
  )

  return <aside className={classes}>...</aside>
}
```

## 4. Data-Driven Component Pattern & Constants

### Data-Driven Components

**ALWAYS extract repetitive, hardcoded content into data structures:**

#### When to Use Data-Driven Pattern:
- Multiple similar elements (navigation links, cards, tabs, list items)
- Dropdown options, select menus, radio/checkbox groups
- Table headers/columns
- Dashboard tiles/cards
- Form field configurations
- Any pattern that repeats 2+ times

#### Implementation:

**Create a `data/` folder at component level:**
```typescript
// app/dashboard/data/index.ts
export const DASHBOARD_CARDS = [
  {
    title: 'Thermionix',
    href: DASHBOARD_ROUTES.THERMIONIX,
    icon: Thermometer,
    description: 'Monitor temperature and humidity sensors',
  },
  // ... more items
]
```

**Map over data in component:**
```typescript
// app/dashboard/page.tsx
import { DASHBOARD_CARDS } from './data'

export default function DashboardPage() {
  return (
    <div>
      {DASHBOARD_CARDS.map((card) => {
        const Icon = card.icon
        return (
          <Link key={card.href} href={card.href}>
            <Icon size={32} />
            <h2>{card.title}</h2>
          </Link>
        )
      })}
    </div>
  )
}
```

#### Benefits:
- ✅ Easy to add/remove/reorder items (edit data, not JSX)
- ✅ Single source of truth
- ✅ Less repetitive code
- ✅ Easier to maintain and test

### Constants - No Magic Strings/Numbers

**NEVER hardcode values directly in components. ALWAYS define constants.**

#### Rule 1: Default Values
❌ **WRONG:**
```typescript
const [timeout, setTimeout] = useState(5000)
const [maxRetries, setMaxRetries] = useState(3)
```

✅ **CORRECT:**
```typescript
const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_MAX_RETRIES = 3

const [timeout, setTimeout] = useState(DEFAULT_TIMEOUT_MS)
const [maxRetries, setMaxRetries] = useState(DEFAULT_MAX_RETRIES)
```

#### Rule 2: Magic Strings
❌ **WRONG:**
```typescript
if (status === 'active') { }
if (type === 'primary') { }
```

✅ **CORRECT:**
```typescript
const STATUS_ACTIVE = 'active' as const
const BUTTON_TYPE_PRIMARY = 'primary' as const

if (status === STATUS_ACTIVE) { }
if (type === BUTTON_TYPE_PRIMARY) { }
```

#### Rule 3: Repeated Values
❌ **WRONG:**
```typescript
<Input maxLength={50} />
// ... somewhere else
<TextArea maxLength={50} />
```

✅ **CORRECT:**
```typescript
const MAX_INPUT_LENGTH = 50

<Input maxLength={MAX_INPUT_LENGTH} />
<TextArea maxLength={MAX_INPUT_LENGTH} />
```

#### Where to Define Constants:

**Option 1: Top of Component File (Simple Cases)**
```typescript
// Component.tsx
const DEFAULT_PAGE_SIZE = 20
const MAX_RETRIES = 3
const POLLING_INTERVAL_MS = 5000

export const MyComponent: React.FC = () => {
  // Use constants here
}
```

**Option 2: In data/ Folder (Multiple Related Constants)**
```typescript
// data/index.ts
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INITIAL_PAGE: 1,
} as const

export const API_CONFIG = {
  TIMEOUT_MS: 5000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const
```

**Option 3: Centralized Constants File (Shared Across App)**
```typescript
// lib/constants/config.ts
export const APP_CONFIG = {
  DEFAULT_TIMEOUT_MS: 5000,
  MAX_FILE_SIZE_MB: 10,
  ITEMS_PER_PAGE: 20,
} as const
```

#### Naming Convention:
- Use `SCREAMING_SNAKE_CASE` for true constants (never change)
- Use descriptive names that indicate purpose and unit
- Examples:
  - `DEFAULT_TIMEOUT_MS` (not `TIMEOUT` - be specific!)
  - `MAX_UPLOAD_SIZE_MB` (not `MAX_SIZE` - include unit!)
  - `POLLING_INTERVAL_SECONDS` (not just `INTERVAL`)

### Route Constants

**ALWAYS use centralized route constants, NEVER hardcode paths:**

```typescript
// lib/constants/routes.ts
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
} as const

export const DASHBOARD_ROUTES = {
  HOME: '/dashboard',
  SETTINGS: '/dashboard/settings',
} as const
```

**Usage:**
```typescript
// ✅ CORRECT
import { AUTH_ROUTES } from '@/lib/constants/routes'
redirect(AUTH_ROUTES.LOGIN)

// ❌ WRONG
redirect('/auth/login')
```

## 5. Styling Guidelines

### CSS Class Naming Convention

**IMPORTANT: All CSS classes must use kebab-case matching the component name**

```css
/* ✅ CORRECT - Button component */
.button { }          /* Main container */
.button-icon { }     /* Sub-element */
.button-primary { }  /* Variant */

/* ✅ CORRECT - TemperatureCard component */
.temperature-card { }
.temperature-card-value { }
.temperature-card-label { }

/* ❌ WRONG - Don't use camelCase */
.temperatureCard { }
.buttonIcon { }

/* ❌ WRONG - Don't use PascalCase */
.TemperatureCard { }
.ButtonIcon { }
```

**Pattern:**
- Main container class = component name in kebab-case
- Sub-elements = `{component-name}-{element}` in kebab-case
- Variants/modifiers = `{component-name}-{variant}` in kebab-case

**Example:**
```typescript
// GlobalHeader.component.tsx
const headerClasses = clsx(
  styles.globalHeader,  // ← Must be 'global-header' in CSS
  className
)

// GlobalHeader.module.css
.globalHeader {       /* ← camelCase in TypeScript (CSS Modules) */
  /* maps to .global-header class name */
}
```

### Color Management - Single Source of Truth

**CRITICAL RULE: ALL colors must be defined in `tailwind.config.js` FIRST, then used via Tailwind utilities or CSS variables.**

#### The Rule:
1. ❌ **NEVER** hardcode color values (hex, rgb, hsl) anywhere in the app
2. ✅ **ALWAYS** define colors in `tailwind.config.js` first
3. ✅ **ALWAYS** reference Tailwind colors in CSS files using `@apply` or CSS variables
4. ✅ If you need a new color, add it to `tailwind.config.js` BEFORE using it

#### Wrong vs Right:

❌ **WRONG - Hardcoded colors:**
```typescript
// app/layout.tsx - BAD!
<Toaster
  toastOptions={{
    success: {
      style: {
        background: '#4CAF50',  // ❌ Hardcoded hex
        color: 'white',
      },
    },
  }}
/>
```

❌ **WRONG - Hardcoded in CSS:**
```css
/* Component.module.css - BAD! */
.button {
  background-color: #4CAF50;  /* ❌ Hardcoded */
  color: white;
}
```

✅ **CORRECT - Use Tailwind config colors:**

**Step 1: Define in tailwind.config.js**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        success: {
          DEFAULT: '#4CAF50',
          bg: 'rgba(76, 175, 80, 0.1)',
        },
        error: {
          DEFAULT: '#E53935',
          bg: 'rgba(229, 57, 53, 0.1)',
        },
      },
    },
  },
}
```

**Step 2: Use in CSS via @apply or CSS variables**
```css
/* globals.css - Style toast notifications */
.toast-success {
  @apply bg-success text-white;
}

.toast-error {
  @apply bg-error text-white;
}

/* OR use CSS variables */
.toast-success {
  background-color: theme('colors.success.DEFAULT');
  color: white;
}
```

**Step 3: Apply classes to third-party components**
```typescript
// app/layout.tsx - CORRECT!
<Toaster
  position="top-right"
  toastOptions={{
    className: '', // Use CSS classes instead
    success: {
      className: 'toast-success',
    },
    error: {
      className: 'toast-error',
    },
  }}
/>
```

#### Benefits:
- ✅ Change color once in config → updates everywhere
- ✅ Consistent design system
- ✅ Easy to implement dark mode
- ✅ All colors documented in one place

#### Implementation Pattern for Third-Party Libraries:

When using libraries with inline style APIs (like react-hot-toast):

**Option 1: Global CSS Classes (Recommended)**
```css
/* globals.css */
:root {
  --toast-success-bg: theme('colors.success.DEFAULT');
  --toast-error-bg: theme('colors.error.DEFAULT');
}

.react-hot-toast > [data-type="success"] {
  background-color: var(--toast-success-bg) !important;
  color: white !important;
}

.react-hot-toast > [data-type="error"] {
  background-color: var(--toast-error-bg) !important;
  color: white !important;
}
```

**Option 2: Custom Wrapper Component**
```typescript
// components/atoms/Toast/Toast.tsx
import toast from 'react-hot-toast'

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    className: 'toast-success', // CSS class with Tailwind colors
  })
}
```

### Use Tailwind (in css file with @apply) for:

- Spacing (padding, margin, gaps)
- **Colors (ALWAYS from tailwind.config.js)**
- Basic layout (flex, grid)
- Typography basics
- Borders and shadows

### Use CSS files for:

- Complex animations
- Pseudo-elements and pseudo-selectors
- Media queries with complex logic
- Component-specific complex styles
- **Third-party library styling overrides (using Tailwind colors via @apply or theme())**

### Use globals.css for:

- Reusable utility classes
- Design system tokens
- Shared patterns used across multiple components
- **Third-party library style overrides**
