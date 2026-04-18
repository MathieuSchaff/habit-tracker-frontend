import type { UserProductStatus } from '@habit-tracker/shared'

import { useCallback, useMemo, useState } from 'react'

import type { UserProduct } from '@/lib/queries/user-products'
import { ProductCardCondensed } from '../ProductCard/Condensed/ProductCardCondensed'
import { BulkBar } from './BulkBar'
import { FirstTimeEmpty } from './FirstTimeEmpty'
import { ShelfEmpty } from './ShelfEmpty'
import { ShelfGrid } from './ShelfGrid'
import { type ShelfTabKey, ShelfTabs } from './ShelfTabs'

import './ShelfView.css'

interface ShelfViewProps {
  products: UserProduct[]
  onStatusChange: (productId: string, newStatus: UserProductStatus) => void
  onStatusChangeMany: (productIds: string[], newStatus: UserProductStatus) => void
  onToggleExpand: (id: string) => void
  onAddClick: () => void
}

const ACTIVE_SHELF_KEY = 'collection:activeShelf'

const ALL_STATUSES: UserProductStatus[] = [
  'holy_grail',
  'in_stock',
  'wishlist',
  'watched',
  'archived',
  'avoided',
]

export function ShelfView({
  products,
  onStatusChange,
  onStatusChangeMany,
  onToggleExpand,
  onAddClick,
}: ShelfViewProps) {
  const [activeTab, setActiveTab] = useState<ShelfTabKey>(() => {
    if (typeof window === 'undefined') return 'all'
    const saved = window.localStorage.getItem(ACTIVE_SHELF_KEY)
    return (saved as ShelfTabKey) ?? 'all'
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const selectMode = selected.size > 0

  const handleTabChange = useCallback((key: ShelfTabKey) => {
    setActiveTab(key)
    try {
      window.localStorage.setItem(ACTIVE_SHELF_KEY, key)
    } catch {
      /* ignore quota errors */
    }
  }, [])

  const countsByStatus = useMemo(() => {
    const counts: Record<UserProductStatus, number> = {
      holy_grail: 0,
      in_stock: 0,
      wishlist: 0,
      watched: 0,
      archived: 0,
      avoided: 0,
    }
    for (const p of products) counts[p.status] += 1
    return counts
  }, [products])

  const visibleProducts = useMemo(() => {
    if (activeTab === 'all') return products
    return products.filter((p) => p.status === activeTab)
  }, [products, activeTab])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const handleMoveBulk = useCallback(
    (status: UserProductStatus) => {
      onStatusChangeMany(Array.from(selected), status)
      setSelected(new Set())
    },
    [selected, onStatusChangeMany]
  )

  if (products.length === 0) {
    return <FirstTimeEmpty onAdd={onAddClick} />
  }

  const showShelfEmpty =
    activeTab !== 'all' && visibleProducts.length === 0 && ALL_STATUSES.includes(activeTab)

  return (
    <div className="shelf-view">
      <ShelfTabs active={activeTab} onChange={handleTabChange} countsByStatus={countsByStatus} />

      {showShelfEmpty ? (
        <ShelfEmpty status={activeTab as UserProductStatus} />
      ) : (
        <ShelfGrid>
          {visibleProducts.map((p) => (
            <ProductCardCondensed
              key={p.id}
              p={p}
              selectMode={selectMode}
              selected={selected.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
              onToggleExpand={() => onToggleExpand(p.id)}
              onMoveStatus={(s) => onStatusChange(p.id, s)}
            />
          ))}
        </ShelfGrid>
      )}

      <BulkBar selectedCount={selected.size} onMove={handleMoveBulk} onClear={clearSelection} />
    </div>
  )
}
