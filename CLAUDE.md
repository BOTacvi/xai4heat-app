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

## 4. Styling Guidelines

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

### Use Tailwind (in css file with @apply) for:

- Spacing (padding, margin, gaps)
- Colors
- Basic layout (flex, grid)
- Typography basics
- Borders and shadows

### Use CSS files for:

- Complex animations
- Pseudo-elements and pseudo-selectors
- Media queries with complex logic
- Component-specific complex styles

### Use globals.css for:

- Reusable utility classes
- Design system tokens
- Shared patterns used across multiple components
