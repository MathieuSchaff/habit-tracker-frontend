import { HOLY_GRAIL_SENTIMENT, type UserProductStatus } from '@habit-tracker/shared'

import { useCallback, useMemo, useState } from 'react'

import { ALL_TAB_STATUSES, SHELF_ORDER } from '@/features/collection/constants'
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
  onCompare?: (ids: [string, string]) => void
}

const ACTIVE_SHELF_KEY = 'collection:activeShelf'

export function ShelfView({
  products,
  onStatusChange,
  onStatusChangeMany,
  onToggleExpand,
  onAddClick,
  onCompare,
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
      in_stock: 0,
      wishlist: 0,
      watched: 0,
      archived: 0,
      avoided: 0,
    }
    for (const p of products) counts[p.status] += 1
    return counts
  }, [products])

  const holyGrailCount = useMemo(
    () => products.filter((p) => p.sentiment === HOLY_GRAIL_SENTIMENT).length,
    [products]
  )

  const repurchaseCount = useMemo(
    () => products.filter((p) => p.wouldRepurchase === 'yes').length,
    [products]
  )

  const visibleProducts = useMemo(() => {
    if (activeTab === 'all') {
      // "Tout" stays calm — past products + rejects live behind the Plus menu.
      return products.filter((p) => ALL_TAB_STATUSES.includes(p.status))
    }
    if (activeTab === 'holy_grail') {
      return products.filter((p) => p.sentiment === HOLY_GRAIL_SENTIMENT)
    }
    if (activeTab === 'repurchase') {
      return products.filter((p) => p.wouldRepurchase === 'yes')
    }
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

  const handleCompare = useCallback(() => {
    if (!onCompare || selected.size !== 2) return
    const [a, b] = Array.from(selected) as [string, string]
    onCompare([a, b])
    setSelected(new Set())
  }, [selected, onCompare])

  if (products.length === 0) {
    return <FirstTimeEmpty onAdd={onAddClick} />
  }

  const isStatusTab =
    activeTab !== 'all' &&
    activeTab !== 'holy_grail' &&
    SHELF_ORDER.includes(activeTab as UserProductStatus)
  const showShelfEmpty = isStatusTab && visibleProducts.length === 0

  return (
    <div className="shelf-view">
      <ShelfTabs
        active={activeTab}
        onChange={handleTabChange}
        countsByStatus={countsByStatus}
        holyGrailCount={holyGrailCount}
        repurchaseCount={repurchaseCount}
      />

      {showShelfEmpty ? (
        <ShelfEmpty status={activeTab as UserProductStatus} />
      ) : activeTab === 'holy_grail' && visibleProducts.length === 0 ? (
        <ShelfEmpty status="holy_grail" />
      ) : activeTab === 'repurchase' && visibleProducts.length === 0 ? (
        <ShelfEmpty status="repurchase" />
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

      <BulkBar
        selectedCount={selected.size}
        onMove={handleMoveBulk}
        onClear={clearSelection}
        onCompare={onCompare ? handleCompare : undefined}
      />
    </div>
  )
}
