/**
 * ThemeToggle Component - Dark Mode Toggle Button
 *
 * LEARNING: Client component for theme switching
 * - Uses useTheme() hook to access theme context
 * - Shows Sun icon in dark mode, Moon icon in light mode
 * - Positioned at bottom of navigation sidebar
 *
 * DESIGN:
 * - Small icon button
 * - Smooth transition between icons
 * - Hover state with secondary color background
 */

'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/contexts/ThemeContext'
import styles from './ThemeToggle.module.css'

type ThemeToggleProps = {
  className?: string
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.toggleButton} ${className || ''}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className={styles.icon} />
      ) : (
        <Sun size={20} className={styles.icon} />
      )}
    </button>
  )
}
