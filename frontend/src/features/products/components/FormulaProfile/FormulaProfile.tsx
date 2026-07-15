import { SKINCARE_PRODUCT_TAG_CATEGORY_META } from '@aurore/shared'

import { Fragment } from 'react'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import type { ProductDetail } from '@/lib/queries/products'
import './FormulaProfile.css'

// Descriptive categories only: what is in the formula, when and where it is
// used — never suitability, concerns, or a verdict. Array order = display
// order: most formula-specific first, not META.order (filter-menu order).
const PROFILE_CATEGORIES = ['actif_class', 'skin_effect', 'routine_step_v2', 'skin_zone'] as const

interface FormulaProfileProps {
  tags: ProductDetail['tags']
}

export function FormulaProfile({ tags }: FormulaProfileProps) {
  const groups = PROFILE_CATEGORIES.map((category) => ({
    category,
    label: SKINCARE_PRODUCT_TAG_CATEGORY_META[category].label,
    tags: tags.filter((t) => t.tagCategory === category && t.relevance !== 'avoid'),
  })).filter((g) => g.tags.length > 0)

  if (groups.length === 0) return null

  return (
    <section className="product-section formula-profile">
      <SectionHeader title="Profil de la formule" as="h2" />
      <dl className="formula-profile__groups">
        {groups.map((g) => (
          <Fragment key={g.category}>
            <dt className="formula-profile__label">{g.label}</dt>
            <dd className="formula-profile__cell">
              <ul role="list" className="formula-profile__chips">
                {g.tags.map((t) => (
                  <li key={t.tagSlug}>
                    <Badge variant="chip">{t.tagName}</Badge>
                  </li>
                ))}
              </ul>
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  )
}
