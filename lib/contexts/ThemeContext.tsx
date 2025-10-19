/**
 * Theme Context - Dark Mode Support
 *
 * LEARNING: Client-side theme management
 * - Manages dark/light theme state
 * - Persists preference to localStorage
 * - Applies 'dark' class to html element for Tailwind
 *
 * USAGE:
 * - Wrap app with <ThemeProvider>
 * - Use useTheme() hook to access theme and toggle function
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const THEME_STORAGE_KEY = 'theme-preference'

type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // STEP 1: Initialize theme state
  // Start with light theme, will be updated on mount
  const [theme, setThemeState] = useState<Theme>('light')

  // STEP 2: Apply theme immediately on mount (runs before render)
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null

    if (storedTheme) {
      setThemeState(storedTheme)
      applyTheme(storedTheme)
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialTheme = prefersDark ? 'dark' : 'light'
      setThemeState(initialTheme)
      applyTheme(initialTheme)
    }
  }, [])

  // STEP 3: Apply theme by adding/removing 'dark' class on html element
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement

    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // STEP 4: Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  // STEP 5: Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
