import { Moon, Sun } from 'lucide-react'

import { useThemeStore } from '../../store/theme'
import './ThemeToggle.css'

export const ThemeToggle = () => {
  const { theme, toggle } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="theme-toggle"
      onClick={toggle}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
          <Sun size={12} strokeWidth={2.5} />
        </span>
        <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
          <Moon size={12} strokeWidth={2.5} />
        </span>
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  )
}
