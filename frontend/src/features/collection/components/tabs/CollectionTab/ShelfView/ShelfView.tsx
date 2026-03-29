import type { DisplayScale } from '@habit-tracker/shared'

import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useMemo } from 'react'

import { SHELF_ORDER } from '@/features/collection/constants'
import type { CriteriaWeights } from '@/lib/helpers/reviews'
import type { UserProduct } from '@/lib/queries/user-products'
import { ProductCardCondensed } from '../ProductCard/Condensed/ProductCardCondensed'
import { ShelfGrid } from './ShelfGrid'
import { ShelfSection } from './ShelfSection'

import './ShelfView.css'

interface ShelfViewProps {
  products: UserProduct[]
  onStatusChange: (productId: string, newStatus: UserProduct['status']) => void
  onToggleExpand: (id: string) => void
  criteriaWeights: CriteriaWeights | undefined
  displayScale: DisplayScale | undefined
}

export function ShelfView({
  products,
  onStatusChange,
  onToggleExpand,
  criteriaWeights,
  displayScale,
}: ShelfViewProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      // If the user moves the finger more than 5px very fast, we think they
      // want to scroll the page, not drag the card.
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const productsByStatus = useMemo(() => {
    const map: Partial<Record<UserProduct['status'], UserProduct[]>> = {}
    for (const p of products) {
      if (!map[p.status]) map[p.status] = []
      map[p.status]?.push(p)
    }
    return map
  }, [products])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const productId = active.id as string
    const newStatus = over.id as UserProduct['status']
    const product = products.find((p) => p.id === productId)

    if (product && product.status !== newStatus) {
      onStatusChange(productId, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
      <div className="shelf-view">
        {SHELF_ORDER.map((status) => {
          const list = productsByStatus[status] || []
          return (
            <ShelfSection key={status} status={status} count={list.length}>
              <ShelfGrid>
                {list.map((p) => (
                  <ProductCardCondensed
                    key={p.id}
                    p={p}
                    onToggleExpand={() => onToggleExpand(p.id)}
                    criteriaWeights={criteriaWeights}
                    displayScale={displayScale}
                  />
                ))}
              </ShelfGrid>
            </ShelfSection>
          )
        })}
      </div>
    </DndContext>
  )
}
