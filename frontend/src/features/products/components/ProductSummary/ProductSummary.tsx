import { getProductKindLabel } from '@aurore/shared'

import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { summarizeIngredientGroups } from '@/constants/ingredientGroups'
import './ProductSummary.css'

interface ProductSummaryProps {
  kind: string | null
  categories: Array<string | null>
}

function joinFr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

// At a Glance (design-system §2): a neutral, one-line read of the product —
// kind plus the functional ingredient groups present. Derived from data, never a
// score, warning, or recommendation.
export function ProductSummary({ kind, categories }: ProductSummaryProps) {
  const groups = summarizeIngredientGroups(categories)
  const kindLabel = kind ? getProductKindLabel(kind) : null

  if (!kindLabel && groups.length === 0) return null

  return (
    <section className="product-section product-summary">
      <SectionHeader title="En bref" as="h2" />
      <p className="product-summary__text">
        {kindLabel && <span className="product-summary__kind">{kindLabel}.</span>}
        {groups.length > 0 && <> Composition : {joinFr(groups)}.</>}
      </p>
    </section>
  )
}
