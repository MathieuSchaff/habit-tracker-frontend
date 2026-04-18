import type { UserProductStatus } from '@habit-tracker/shared'

import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { SHELF_ORDER, statusLabels } from '@/features/collection/constants'

export type ShelfTabKey = 'all' | UserProductStatus

interface ShelfTabsProps {
  active: ShelfTabKey
  onChange: (key: ShelfTabKey) => void
  countsByStatus: Record<UserProductStatus, number>
  className?: string
}

/**
 * Thin adapter over the shared `Tabs` primitive (underline variant).
 * Builds the "Tout" + 6-status options with per-status color + dimmed empty shelves.
 */
export function ShelfTabs({ active, onChange, countsByStatus, className }: ShelfTabsProps) {
  const totalCount = SHELF_ORDER.reduce((sum, s) => sum + countsByStatus[s], 0)

  const options: TabOption<ShelfTabKey>[] = [
    {
      id: 'all',
      label: 'Tout',
      badge: totalCount,
      color: 'var(--text-primary)',
    },
    ...SHELF_ORDER.map<TabOption<ShelfTabKey>>((s) => {
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

  return (
    <Tabs
      variant="underline"
      scrollable
      options={options}
      activeTab={active}
      onTabChange={onChange}
      className={className}
      idPrefix="shelf"
      ariaLabel="Étagères"
    />
  )
}
