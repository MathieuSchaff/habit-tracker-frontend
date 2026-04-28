import { Moon, Sun } from 'lucide-react'
import { useRef } from 'react'

import type { Variant } from '../../store/theme'
import { useThemeStore } from '../../store/theme'
import './ThemeToggle.css'

const VARIANTS: Array<{ value: Variant; label: string; color: string }> = [
  { value: 'bleu', label: 'Bleu', color: 'oklch(55% 0.2 260)' },
  { value: 'terracota', label: 'Terra', color: 'oklch(52% 0.13 32)' },
  { value: 'foret', label: 'Forêt', color: 'oklch(40% 0.16 140)' },
  { value: 'ardoise', label: 'Ardoise', color: 'oklch(35% 0.12 240)' },
  { value: 'vivid', label: 'Vivid', color: 'oklch(52% 0.22 145)' },
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

    // Position above the trigger (viewport-relative, works through any overflow parent)
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

      {/* popover="auto" handles outside-click and Escape dismiss natively */}
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
