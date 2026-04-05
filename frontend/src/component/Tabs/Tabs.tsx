import clsx from 'clsx'
import type React from 'react'
import './Tabs.css'

export interface TabOption<T extends string> {
  id: T
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

interface TabsProps<T extends string> {
  options: TabOption<T>[]
  activeTab: T
  onTabChange: (id: T) => void
  className?: string
  containerClassName?: string
  idPrefix?: string
}

export const Tabs = <T extends string>({
  options,
  activeTab,
  onTabChange,
  className,
  containerClassName,
  idPrefix = 'tab',
}: TabsProps<T>) => {
  const activeIndex = options.findIndex((opt) => opt.id === activeTab)

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
      // Focus the newly activated tab
      const tablist = e.currentTarget
      const tabs = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      tabs[nextIndex]?.focus()
    }
  }

  return (
    <div className={clsx('tabs-wrapper', className)}>
      <div
        className={clsx('icon-tabs', containerClassName)}
        role="tablist"
        onKeyDown={handleKeyDown}
        style={
          {
            '--active-index': Math.max(0, activeIndex),
            '--tabs-count': options.length,
          } as React.CSSProperties
        }
      >
        <div className="tabs-indicator" aria-hidden="true" />

        {options.map((option) => {
          const isActive = activeTab === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              id={`${idPrefix}-${option.id}`}
              className={clsx('icon-tab', isActive && 'icon-tab-active')}
              onClick={() => onTabChange(option.id)}
              aria-selected={isActive}
              aria-controls={`${idPrefix}-panel-${option.id}`}
              tabIndex={isActive ? 0 : -1}
            >
              {option.icon}
              <span>{option.label}</span>
              {option.badge !== undefined && (
                <span className="tab-badge" aria-hidden="true">
                  {option.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
