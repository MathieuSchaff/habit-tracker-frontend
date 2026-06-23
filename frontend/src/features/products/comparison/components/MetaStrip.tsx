import type { EnrichedComparisonProduct, SkincareProductTagCategory } from '@aurore/shared'

import { Link } from '@tanstack/react-router'

import { ProductImage } from '@/features/products/components/ProductImage/ProductImage'
import { tagLabel } from '@/features/products/filters'

import './MetaStrip.css'

import { META_STRIP_LABELS } from './MetaStrip.constants'
import { productTone } from './productTones'

type Props = { products: EnrichedComparisonProduct[] }

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function formatPricePer(p: EnrichedComparisonProduct): string {
  if (!p.pricePer) return '—'
  return `${eur.format(p.pricePer.cents / 100)} / ${p.pricePer.unit}`
}

// Typed against shared union so renames there become TS errors here.
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
    <section className="cmp-shelf" aria-label="Produits comparés">
      <ol className="cmp-shelf__row">
        {products.map((p, i) => {
          const tags = p.tags.filter(
            (t) => TAG_TYPES_SET.has(t.tagType) && t.relevance === 'primary'
          )
          const activeCount = p.ingredients.filter((x) => x.signals.includes('active')).length

          return (
            <li key={p.id} className="cmp-shelf__item" style={productTone(i)}>
              <span className="cmp-shelf__num">N° {String(i + 1).padStart(2, '0')}</span>
              <Link
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="cmp-shelf__photo-link"
                aria-hidden="true"
                tabIndex={-1}
              >
                <ProductImage
                  kind={p.kind}
                  unit={p.amountUnit}
                  imageUrl={p.imageUrl}
                  size={96}
                  className="cmp-shelf__photo"
                />
              </Link>
              <p className="cmp-shelf__brand">{p.brand}</p>
              <h3 className="cmp-shelf__name">
                <Link
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="cmp-shelf__name-link"
                >
                  {p.name}
                </Link>
              </h3>
              <p className="cmp-shelf__meta">
                {p.totalAmount && p.amountUnit ? (
                  <span className="cmp-shelf__amount">
                    {p.totalAmount} {p.amountUnit}
                  </span>
                ) : (
                  <span className="cmp-shelf__amount">—</span>
                )}
                <span className="cmp-shelf__sep" aria-hidden="true">
                  ·
                </span>
                <span className={`cmp-shelf__price${mixed ? ' cmp-shelf__price--mixed' : ''}`}>
                  {mixed ? META_STRIP_LABELS.priceMixed : formatPricePer(p)}
                </span>
              </p>
              <div className="cmp-shelf__badges">
                {activeCount > 0 && (
                  <span className="cmp-shelf__badge cmp-shelf__badge--actives">
                    {activeCount} actif{activeCount > 1 ? 's' : ''}
                  </span>
                )}
                <span className="cmp-shelf__badge cmp-shelf__badge--count">
                  {p.ingredients.length} ingr.
                </span>
              </div>
              {tags.length > 0 && (
                <ul className="cmp-shelf__tags">
                  {tags.slice(0, 3).map((t) => (
                    <li key={t.slug} className="cmp-shelf__tag">
                      {tagLabel(t.slug)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
      <div className="cmp-shelf__plank" aria-hidden="true" />
    </section>
  )
}
