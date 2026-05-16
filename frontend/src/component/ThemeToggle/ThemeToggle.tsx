import { Moon, Sun } from 'lucide-react'
import { useRef } from 'react'

import type { Variant } from '../../store/theme'
import { useThemeStore } from '../../store/theme'
import './ThemeToggle.css'

const VARIANTS: Array<{ value: Variant; label: string; color: string }> = [
  { value: 'terracota', label: 'Terra', color: 'oklch(52% 0.13 32)' },
  { value: 'foret', label: 'Forêt', color: 'oklch(40% 0.16 140)' },
  { value: 'ardoise', label: 'Ardoise', color: 'oklch(35% 0.12 240)' },
]

export const ThemeToggle = () => {
  const { theme, variant, toggle, setVariant } = useThemeStore()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const isDark = theme === 'dark'
  const currentVariant = VARIANTS.find((v) => v.value === variant)

  const handleTrigger = () => {
    const el = popoverRef.current
    const btn = triggerRef.current
    if (!el || !btn) return

    if (el.matches(':popover-open')) {
      el.hidePopover()
      return
    }

    // Viewport-relative positioning so overflow parents don't clip the popover.
    const rect = btn.getBoundingClientRect()
    el.style.left = `${rect.left}px`
    el.style.bottom = `${window.innerHeight - rect.top + 8}px`
    el.showPopover()
  }

  const close = () => popoverRef.current?.hidePopover()

  return (
    <div className="theme-toggle-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="theme-toggle-trigger"
        aria-label="Changer le thème"
        onClick={handleTrigger}
      >
        {isDark ? (
          <Moon size={16} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Sun size={16} strokeWidth={2} aria-hidden="true" />
        )}
        <span
          className="theme-toggle-trigger__dot"
          style={{ backgroundColor: currentVariant?.color }}
          aria-hidden="true"
        />
      </button>

      {/* popover="auto" handles outside-click + Escape natively. */}
      <div ref={popoverRef} className="theme-dropdown" popover="auto">
        <button
          type="button"
          className="theme-dropdown__btn"
          aria-pressed={!isDark}
          onClick={() => {
            if (isDark) toggle()
            close()
          }}
        >
          <Sun size={14} strokeWidth={2} aria-hidden="true" />
          Clair
        </button>
        <button
          type="button"
          className="theme-dropdown__btn"
          aria-pressed={isDark}
          onClick={() => {
            if (!isDark) toggle()
            close()
          }}
        >
          <Moon size={14} strokeWidth={2} aria-hidden="true" />
          Sombre
        </button>

        <div className="theme-dropdown__sep" />

        {VARIANTS.map((v) => (
          <button
            key={v.value}
            type="button"
            className="theme-dropdown__btn"
            aria-pressed={variant === v.value}
            onClick={() => {
              setVariant(v.value)
              close()
            }}
          >
            <span
              className="theme-dropdown__dot"
              style={{ backgroundColor: v.color }}
              aria-hidden="true"
            />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}
