import { useHydrated } from '@tanstack/react-router'
import { Moon, Sun } from 'lucide-react'
import { useId, useRef } from 'react'

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
  const popoverId = useId()
  const hydrated = useHydrated()
  // The store reads localStorage/matchMedia, which the server can't see: SSR
  // always renders light. Mirror that on the first client render (hydration
  // must match), then show the real theme once hydrated.
  const isDark = hydrated && theme === 'dark'
  const currentVariant = VARIANTS.find((v) => v.value === variant)

  // The button's popovertarget owns open/close. A manual onClick toggle races
  // the auto-popover light-dismiss: dismiss hides on pointerdown, then the
  // handler re-reads :popover-open as false and re-opens. Position from the
  // toggle events so the browser stays the single source of truth.
  const position = () => {
    const el = popoverRef.current
    const btn = triggerRef.current
    if (!el || !btn) return
    // Viewport-relative so overflow parents don't clip the popover.
    const rect = btn.getBoundingClientRect()
    el.style.left = `${rect.left}px`
    // Open toward the larger gap: downward from the top bar, upward from the drawer footer.
    if (rect.top < window.innerHeight / 2) {
      el.style.top = `${rect.bottom + 8}px`
      el.style.bottom = 'auto'
    } else {
      el.style.bottom = `${window.innerHeight - rect.top + 8}px`
      el.style.top = 'auto'
    }
  }

  // Clamp into the viewport once the popover is measurable (after it opens).
  const clampX = () => {
    const el = popoverRef.current
    if (!el) return
    const margin = 8
    const popRect = el.getBoundingClientRect()
    if (popRect.right > window.innerWidth - margin) {
      el.style.left = `${Math.max(margin, window.innerWidth - margin - popRect.width)}px`
    } else if (popRect.left < margin) {
      el.style.left = `${margin}px`
    }
  }

  const close = () => popoverRef.current?.hidePopover()

  return (
    <div className="theme-toggle-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="theme-toggle-trigger"
        aria-label="Changer le thème"
        popoverTarget={popoverId}
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

      {/* popover="auto" handles outside-click + Escape; the button's
          popoverTarget handles toggle. beforetoggle pre-positions to avoid a
          flash, toggle clamps once the popover is measurable. */}
      <div
        ref={popoverRef}
        id={popoverId}
        className="theme-dropdown"
        popover="auto"
        onBeforeToggle={(e) => {
          if (e.newState === 'open') position()
        }}
        onToggle={(e) => {
          if (e.newState === 'open') clampX()
        }}
      >
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
