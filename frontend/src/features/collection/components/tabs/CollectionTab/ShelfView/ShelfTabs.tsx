import type { UserProductStatus } from '@habit-tracker/shared'

import clsx from 'clsx'
import { ChevronDown, Gem } from 'lucide-react'

import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import {
  PRIMARY_SHELF_ORDER,
  SECONDARY_SHELF_ORDER,
  statusLabels,
} from '@/features/collection/constants'

// Virtual tabs (holy_grail, repurchase) filter on fields other than status —
// keeping them as tab keys lets the active-tab state machine treat them uniformly.
export type ShelfTabKey = 'all' | 'holy_grail' | 'repurchase' | UserProductStatus

interface ShelfTabsProps {
  active: ShelfTabKey
  onChange: (key: ShelfTabKey) => void
  countsByStatus: Record<UserProductStatus, number>
  holyGrailCount: number
  repurchaseCount: number
  className?: string
}

const HOLY_GRAIL_COLOR = 'var(--status-color-holy-grail)'
const REPURCHASE_COLOR = 'var(--status-color-repurchase)'

export function ShelfTabs({
  active,
  onChange,
  countsByStatus,
  holyGrailCount,
  repurchaseCount,
  className,
}: ShelfTabsProps) {
  const totalCount = PRIMARY_SHELF_ORDER.reduce((sum, s) => sum + countsByStatus[s], 0)

  const primaryOptions: TabOption<ShelfTabKey>[] = [
    {
      id: 'all',
      label: 'Tout',
      badge: totalCount,
      color: 'var(--text-primary)',
    },
    ...PRIMARY_SHELF_ORDER.map<TabOption<ShelfTabKey>>((s) => {
      const cfg = statusLabels[s]
      const Icon = cfg.icon
      return {
        id: s,
        label: cfg.label,
        icon: <Icon size={15} />,
        badge: countsByStatus[s],
        color: cfg.color,
        dimmed: countsByStatus[s] === 0,
      }
    }),
  ]

  const secondaryItems: { key: ShelfTabKey; label: string; count: number; color: string }[] = [
    {
      key: 'holy_grail',
      label: 'Saint Graal',
      count: holyGrailCount,
      color: HOLY_GRAIL_COLOR,
    },
    {
      key: 'repurchase',
      label: 'À racheter',
      count: repurchaseCount,
      color: REPURCHASE_COLOR,
    },
    ...SECONDARY_SHELF_ORDER.map((s) => ({
      key: s as ShelfTabKey,
      label: statusLabels[s].label,
      count: countsByStatus[s],
      color: statusLabels[s].color,
    })),
  ]

  const activeSecondary = secondaryItems.find((it) => it.key === active)

  return (
    <div className={clsx('shelf-tabs-row', className)}>
      <Tabs
        variant="underline"
        scrollable
        options={primaryOptions}
        activeTab={active}
        onTabChange={onChange}
        idPrefix="shelf"
        ariaLabel="Étagères"
        className="shelf-tabs-primary"
      />
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button
            type="button"
            className={clsx('shelf-tabs-plus', activeSecondary && 'shelf-tabs-plus--active')}
            aria-label={
              activeSecondary
                ? `Filtre actif : ${activeSecondary.label}. Plus de filtres`
                : 'Plus de filtres'
            }
            style={
              activeSecondary
                ? ({ '--shelf-plus-color': activeSecondary.color } as React.CSSProperties)
                : undefined
            }
          >
            {activeSecondary ? (
              <>
                <Gem size={14} aria-hidden="true" />
                <span>{activeSecondary.label}</span>
                {activeSecondary.count > 0 && (
                  <span className="shelf-tabs-plus-badge">{activeSecondary.count}</span>
                )}
              </>
            ) : (
              <>
                <span>Plus</span>
                <ChevronDown size={14} aria-hidden="true" />
              </>
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          side="bottom"
          align="end"
          className="shelf-tabs-plus-menu"
          ariaLabel="Filtres secondaires"
        >
          {secondaryItems.map((item, idx) => (
            <DropdownMenu.Item key={item.key} index={idx} onSelect={() => onChange(item.key)}>
              <button
                type="button"
                className={clsx(
                  'shelf-tabs-plus-item',
                  active === item.key && 'shelf-tabs-plus-item--active'
                )}
                style={{ '--shelf-plus-color': item.color } as React.CSSProperties}
              >
                <span className="shelf-tabs-plus-item-dot" aria-hidden="true" />
                <span className="shelf-tabs-plus-item-label">{item.label}</span>
                <span className="shelf-tabs-plus-item-count">{item.count}</span>
              </button>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  )
}
