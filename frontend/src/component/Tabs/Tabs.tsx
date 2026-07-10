import clsx from 'clsx'
import type React from 'react'
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './Tabs.css'

import { useDragScroll } from './useDragScroll'

export interface TabOption<T extends string> {
  id: T
  label: string
  icon?: React.ReactNode
  badge?: string | number
  /** Underline variant only. */
  color?: string
  /** Underline variant only. */
  dimmed?: boolean
}

type TabsVariant = 'pill' | 'underline'

interface TabsProps<T extends string> {
  options: TabOption<T>[]
  activeTab: T
  onTabChange: (id: T) => void
  /**
   * `pill` (default): equal-width segmented control with sliding white pill on primary bg.
   * `underline`: horizontal list with 2px underline indicator; supports variable widths,
   * per-option color, scroll-snap when combined with `scrollable`.
   */
  variant?: TabsVariant
  /** Underline variant only. */
  scrollable?: boolean
  className?: string
  containerClassName?: string
  idPrefix?: string
  ariaLabel?: string
  /**
   * Set to false when tabs control navigation/filtering without associated tabpanel elements.
   * Omits aria-controls to avoid pointing to non-existent DOM nodes.
   */
  hasPanels?: boolean
}

export const Tabs = <T extends string>({
  options,
  activeTab,
  onTabChange,
  variant = 'pill',
  scrollable = false,
  className,
  containerClassName,
  idPrefix = 'tab',
  ariaLabel,
  hasPanels = true,
}: TabsProps<T>) => {
  const activeIndex = options.findIndex((opt) => opt.id === activeTab)

  const listRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  // Measure-based indicator: aligns with the active tab's actual box (labels vary in width).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when tab list changes
  useLayoutEffect(() => {
    const btn = btnRefs.current[activeTab]
    const list = listRef.current
    if (!btn || !list) return
    const btnRect = btn.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    setIndicator({
      left: btnRect.left - listRect.left + list.scrollLeft,
      width: btnRect.width,
    })
  }, [activeTab, variant, options])

  useEffect(() => {
    if (!scrollable) return
    const btn = btnRefs.current[activeTab]
    const list = listRef.current
    if (!btn || !list) return
    const btnLeft = btn.offsetLeft
    const btnRight = btnLeft + btn.offsetWidth
    const viewLeft = list.scrollLeft
    const viewRight = viewLeft + list.clientWidth
    if (btnLeft < viewLeft) {
      list.scrollTo({ left: btnLeft - 16, behavior: 'smooth' })
    } else if (btnRight > viewRight) {
      list.scrollTo({ left: btnRight - list.clientWidth + 16, behavior: 'smooth' })
    }
  }, [activeTab, scrollable])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = options.findIndex((opt) => opt.id === activeTab)
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % options.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + options.length) % options.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = options.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      onTabChange(options[nextIndex].id)
      btnRefs.current[options[nextIndex].id]?.focus()
    }
  }

  const activeColor =
    variant === 'underline'
      ? (options[activeIndex]?.color ?? 'var(--color-primary)')
      : 'var(--color-primary)'

  const dragHandlers = useDragScroll(listRef, { enabled: scrollable })

  return (
    <div
      className={clsx(
        'tabs-wrapper',
        variant === 'underline' && 'tabs-wrapper--underline',
        className
      )}
    >
      <div
        ref={listRef}
        className={clsx(
          variant === 'underline' ? 'underline-tabs' : 'pill-tabs',
          scrollable && 'tabs-scrollable',
          containerClassName
        )}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        style={{ '--active-tab-color': activeColor } as CSSProperties}
        {...dragHandlers}
      >
        {options.map((option) => {
          const isActive = activeTab === option.id
          const tintStyle =
            variant === 'underline' && option.color
              ? ({ '--tab-color': option.color } as CSSProperties)
              : undefined
          return (
            <button
              key={option.id}
              ref={(el) => {
                btnRefs.current[option.id] = el
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-${option.id}`}
              className={clsx(
                variant === 'underline' ? 'underline-tab' : 'pill-tab',
                isActive && (variant === 'underline' ? 'underline-tab-active' : 'pill-tab-active'),
                variant === 'underline' && option.dimmed && !isActive && 'underline-tab-dimmed'
              )}
              style={tintStyle}
              onClick={() => onTabChange(option.id)}
              aria-selected={isActive}
              aria-controls={hasPanels ? `${idPrefix}-panel-${option.id}` : undefined}
              tabIndex={isActive ? 0 : -1}
              aria-label={
                option.badge !== undefined ? `${option.label} (${option.badge})` : undefined
              }
            >
              {option.icon && <span aria-hidden="true">{option.icon}</span>}
              <span>{option.label}</span>
              {option.badge !== undefined && (
                <span className="tab-badge" aria-hidden="true">
                  {option.badge}
                </span>
              )}
            </button>
          )
        })}

        {indicator && (
          <span
            className={variant === 'underline' ? 'underline-tabs-indicator' : 'tabs-indicator'}
            aria-hidden="true"
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          />
        )}
      </div>
    </div>
  )
}
