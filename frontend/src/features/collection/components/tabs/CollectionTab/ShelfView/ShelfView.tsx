/**
 * ShelfView — Vue "étagère" de la collection avec drag-and-drop.
 */

import type { DisplayScale, UserProductStatus } from '@habit-tracker/shared'

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useCallback, useMemo, useState } from 'react'

import { SHELF_ORDER } from '@/features/collection/constants'
import type { CriteriaWeights } from '@/lib/helpers/reviews'
import { calculateWeightedScore } from '@/lib/helpers/reviews'
import type { UserProduct } from '@/lib/queries/user-products'
import { ProductCardCondensed } from '../ProductCard/Condensed/ProductCardCondensed'
import { ShelfSection } from './ShelfSection'

import './ShelfView.css'

interface ShelfViewProps {
  products: UserProduct[]
  onStatusChange: (productId: string, newStatus: UserProductStatus) => void
  onToggleExpand?: (productId: string) => void
  criteriaWeights?: CriteriaWeights
  displayScale?: DisplayScale
}

export function ShelfView({
  products,
  onStatusChange,
  onToggleExpand,
  criteriaWeights,
  displayScale,
}: ShelfViewProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<UserProductStatus>>(new Set())
  const [activeProduct, setActiveProduct] = useState<UserProduct | null>(null)
  const [lastDroppedId, setLastDroppedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const grouped = useMemo(() => {
    const groups: Record<string, UserProduct[]> = {}
    for (const product of products) {
      if (!groups[product.status]) groups[product.status] = []
      groups[product.status].push(product)
    }
    return groups
  }, [products])

  const toggleCollapse = useCallback((status: UserProductStatus) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const product = products.find((p) => p.id === event.active.id)
      setActiveProduct(product ?? null)
    },
    [products]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveProduct(null)
      const { active, over } = event
      if (!over) return

      const productId = active.id as string
      const targetStatus = over.data.current?.status as UserProductStatus | undefined
      if (!targetStatus) return

      const product = products.find((p) => p.id === productId)
      if (!product || product.status === targetStatus) return

      onStatusChange(productId, targetStatus)

      setLastDroppedId(productId)
      setTimeout(() => setLastDroppedId(null), 1000)
    },
    [products, onStatusChange]
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="shelf-view">
        {SHELF_ORDER.map((status) => {
          const sectionProducts = grouped[status] ?? []
          if (sectionProducts.length === 0) return null

          return (
            <ShelfSection
              key={status}
              status={status}
              products={sectionProducts}
              isCollapsed={collapsedSections.has(status)}
              onToggleCollapse={() => toggleCollapse(status)}
              onProductClick={(id) => onToggleExpand?.(id)}
              lastDroppedId={lastDroppedId}
              criteriaWeights={criteriaWeights}
              displayScale={displayScale}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeProduct && (
          <ProductCardCondensed
            product={activeProduct}
            score={calculateWeightedScore(
              activeProduct.review,
              criteriaWeights,
              displayScale ?? 'out_of_20'
            )}
            displayScale={displayScale}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
