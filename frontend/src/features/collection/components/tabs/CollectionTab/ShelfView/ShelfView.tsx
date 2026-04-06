import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useMemo, useState } from 'react'

import { SHELF_ORDER } from '@/features/collection/constants'
import type { UserProduct } from '@/lib/queries/user-products'
import { ProductCardCondensed } from '../ProductCard/Condensed/ProductCardCondensed'
import { ShelfGrid } from './ShelfGrid'
import { ShelfSection } from './ShelfSection'

import './ShelfView.css'

interface ShelfViewProps {
  products: UserProduct[]
  onStatusChange: (productId: string, newStatus: UserProduct['status']) => void
  onToggleExpand: (id: string) => void
}

export function ShelfView({ products, onStatusChange, onToggleExpand }: ShelfViewProps) {
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

  const [activeId, setActiveId] = useState<string | null>(null)
  const activeProduct = activeId ? (products.find((p) => p.id === activeId) ?? null) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
      modifiers={[restrictToWindowEdges]}
    >
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
                  />
                ))}
              </ShelfGrid>
            </ShelfSection>
          )
        })}
      </div>
      <DragOverlay>
        {activeProduct ? (
          <ProductCardCondensed p={activeProduct} onToggleExpand={() => {}} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
