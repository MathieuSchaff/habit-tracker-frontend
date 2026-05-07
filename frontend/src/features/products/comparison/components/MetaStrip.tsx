import type { EnrichedComparisonProduct, SkincareProductTagCategory } from '@habit-tracker/shared'

import { tagLabel } from '@/features/products/filters'

import './MetaStrip.css'

type Props = { products: EnrichedComparisonProduct[] }

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function formatPricePer(p: EnrichedComparisonProduct): string {
  if (!p.pricePer) return '—'
  return `${eur.format(p.pricePer.cents / 100)} / ${p.pricePer.unit}`
}

// Subset of skincare tag categories shown as chips in the comparison header.
// Typed against the shared union so a rename in `shared` becomes a TS error here.
const TAG_TYPES: readonly SkincareProductTagCategory[] = [
  'product_type_v2',
  'texture',
  'routine_moment',
  'skin_type',
]
const TAG_TYPES_SET: ReadonlySet<string> = new Set(TAG_TYPES)

export function MetaStrip({ products }: Props) {
  const allUnits = new Set(
    products.map((p) => p.pricePer?.unit).filter((u): u is NonNullable<typeof u> => Boolean(u))
  )
  const mixed = allUnits.size > 1

  return (
    <ul className="meta-strip">
      {products.map((p) => {
        const tags = p.tags.filter((t) => TAG_TYPES_SET.has(t.tagType) && t.relevance === 'primary')

        const activeCount = p.ingredients.filter((i) => i.signals.includes('active')).length

        return (
          <li key={p.id} className="meta-strip__card">
            <div className="meta-strip__img-wrap">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="meta-strip__image" />
              ) : (
                <div className="meta-strip__image-placeholder" aria-hidden>
                  🧴
                </div>
              )}
            </div>

            <p className="meta-strip__brand">{p.brand}</p>
            <p className="meta-strip__name">{p.name}</p>

            <div className="meta-strip__info-row">
              {p.totalAmount && p.amountUnit ? (
                <span className="meta-strip__amount">
                  {p.totalAmount} {p.amountUnit}
                </span>
              ) : (
                <span className="meta-strip__amount">—</span>
              )}
              {(p.totalAmount || p.pricePer) && <span className="meta-strip__separator">·</span>}
              <span className={`meta-strip__price${mixed ? ' meta-strip__price--mixed' : ''}`}>
                {mixed ? 'Prix non comparable' : formatPricePer(p)}
              </span>
            </div>

            <div className="meta-strip__badges">
              {activeCount > 0 && (
                <span className="meta-strip__badge meta-strip__badge--actives">
                  {activeCount} actif{activeCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="meta-strip__badge meta-strip__badge--count">
                {p.ingredients.length} ingr.
              </span>
            </div>

            {tags.length > 0 && (
              <ul className="meta-strip__tags">
                {tags.map((t) => (
                  <li key={t.slug} className="meta-strip__tag">
                    {tagLabel(t.slug)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
