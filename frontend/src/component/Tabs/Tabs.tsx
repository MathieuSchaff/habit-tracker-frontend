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
}

export const Tabs = <T extends string>({
  options,
  activeTab,
  onTabChange,
  className,
  containerClassName,
}: TabsProps<T>) => {
  const activeIndex = options.findIndex((opt) => opt.id === activeTab)

  return (
    <div className={clsx('tabs-wrapper', className)}>
      <div
        className={clsx('icon-tabs', containerClassName)}
        style={
          {
            '--active-index': Math.max(0, activeIndex),
            '--tabs-count': options.length,
          } as React.CSSProperties
        }
      >
        <div className="tabs-indicator" />

        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={clsx('icon-tab', activeTab === option.id && 'icon-tab-active')}
            onClick={() => onTabChange(option.id)}
            aria-current={activeTab === option.id ? 'page' : undefined}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.badge !== undefined && <span className="tab-badge">{option.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
