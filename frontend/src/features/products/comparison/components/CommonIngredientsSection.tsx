import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { useState } from 'react'

import { Button } from '@/component/Button'
import { computeCommon } from '../helpers/aggregations'

type Props = { products: EnrichedComparisonProduct[] }

export function CommonIngredientsSection({ products }: Props) {
  const [open, setOpen] = useState(false)
  const common = computeCommon(products)

  return (
    <section>
      <Button variant="ghost" onClick={() => setOpen((o) => !o)}>
        Communs à tous ({common.length}) {open ? '▾' : '▸'}
      </Button>
      {open && (
        <ul>
          {common.map((i) => (
            <li key={i.slug}>{i.inciName}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
