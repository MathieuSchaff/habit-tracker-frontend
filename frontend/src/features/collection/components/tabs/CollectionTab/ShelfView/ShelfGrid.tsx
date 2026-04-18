import type { ReactNode } from 'react'

import './ShelfGrid.css'

interface ShelfGridProps {
  children: ReactNode
}

export function ShelfGrid({ children }: ShelfGridProps) {
  return <div className="shelf-grid">{children}</div>
}
