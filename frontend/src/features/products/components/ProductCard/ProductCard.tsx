import { getProductKindLabel, PRODUCT_KINDS, PRODUCT_UNITS } from '@aurore/shared'

import { Link } from '@tanstack/react-router'
import { Check, Plus } from 'lucide-react'
import { memo, useCallback, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Card } from '@/component/Card/Card'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { ProductImage } from '@/features/products/components/ProductImage/ProductImage'
import { tagLabel } from '@/features/products/filters'
import type { ProductListItem } from '@/lib/queries/products'

import './ProductCard.css'

const KIND_TO_CATEGORY = Object.fromEntries(
  Object.entries(PRODUCT_KINDS).flatMap(([category, kinds]) =>
    Object.values(kinds).map((kind) => [kind, category])
  )
) as Record<string, string>

const CATEGORIES_WITH_HUE = new Set(['skincare', 'complement'])

const KNOWN_UNITS = new Set<string>(
  Object.values(PRODUCT_UNITS).flatMap((domain) => Object.values(domain))
)

function kindClass(kind: string): string {
  const category = KIND_TO_CATEGORY[kind]
  return category && CATEGORIES_WITH_HUE.has(category) ? `kind--${category}` : 'kind--default'
}

function unitClass(unit: string | null | undefined): string {
  const u = unit?.toLowerCase().trim() ?? ''
  return KNOWN_UNITS.has(u) ? `unit--${u}` : ''
}

const eurFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

const MAX_PRIMARY_CHIPS = 1

export type AddToCollectionTarget = {
  id: string
  name: string
  brand: string
  priceCents?: number | null
}

type Props = {
  product: ProductListItem
  onAdd: (target: AddToCollectionTarget) => void
}

function ProductCardImpl({ product, onAdd }: Props) {
  const [flagTipOpen, setFlagTipOpen] = useState(false)
  const handleAdd = useCallback(() => {
    onAdd({
      id: product.id,
      name: product.name,
      brand: product.brand,
      priceCents: product.priceCents,
    })
  }, [onAdd, product.id, product.name, product.brand, product.priceCents])

  const allPrimaryTags = product.tags.filter((t) => t.relevance === 'primary')
  const primaryTags = allPrimaryTags.slice(0, MAX_PRIMARY_CHIPS)
  const extraTagsCount = allPrimaryTags.length - primaryTags.length

  const avoidLabels = product.profileMatches.map(
    (s) =>
      SKIN_TYPE_LABELS[s as keyof typeof SKIN_TYPE_LABELS] ??
      SKIN_CONCERN_LABELS[s as keyof typeof SKIN_CONCERN_LABELS] ??
      tagLabel(s)
  )

  return (
    <Card
      as="li"
      interactive
      accent="var(--_kind-color)"
      className={`list-card list-card--product ${kindClass(product.kind)} ${unitClass(product.unit)}`}
    >
      <div className="list-card__inner">
        <Link to="/products/$slug" params={{ slug: product.slug }} className="list-card__header">
          <ProductImage
            kind={product.kind}
            unit={product.unit}
            imageUrl={product.imageUrl}
            fill
            className="list-card__icon-wrap"
          />

          <div className="list-card__body">
            <span className="list-card__kicker">
              <span className="list-card__kind">{getProductKindLabel(product.kind)}</span>
              <span className="list-card__brand">{product.brand}</span>
            </span>
            <Card.Title
              as="p"
              className="list-card__name"
              style={{ viewTransitionName: `product-name-${product.slug}` }}
            >
              {product.name}
            </Card.Title>
          </div>
        </Link>

        <Card.Footer>
          {primaryTags.length > 0 && (
            <ul className="list-card__chips">
              {primaryTags.map((t) => (
                <li key={t.slug} className="list-card__chip" title={tagLabel(t.slug)}>
                  {tagLabel(t.slug)}
                </li>
              ))}
              {extraTagsCount > 0 && (
                <li
                  className="list-card__chip list-card__chip--more"
                  aria-label={`et ${extraTagsCount} autre${extraTagsCount > 1 ? 's' : ''}`}
                >
                  +{extraTagsCount}
                </li>
              )}
            </ul>
          )}
          <div className="list-card__footer-row">
            {product.profileMatches.length > 0 && (
              <span className="list-card__preference-flag-wrap">
                <button
                  type="button"
                  className="list-card__preference-flag"
                  onMouseEnter={() => setFlagTipOpen(true)}
                  onMouseLeave={() => setFlagTipOpen(false)}
                  onFocus={() => setFlagTipOpen(true)}
                  onBlur={() => setFlagTipOpen(false)}
                  onClick={() => setFlagTipOpen((v) => !v)}
                  aria-label={`Pour vous. Contient des ingrédients liés à : ${avoidLabels.join(', ')}. Note personnelle, pas un avertissement.`}
                  aria-describedby={flagTipOpen ? `preference-flag-tip-${product.id}` : undefined}
                >
                  Pour vous
                </button>
                {flagTipOpen && (
                  <span
                    className="list-card__preference-tip"
                    role="tooltip"
                    id={`preference-flag-tip-${product.id}`}
                  >
                    Contient des ingrédients liés à : {avoidLabels.join(', ')}. Note personnelle,
                    pas un avertissement.
                  </span>
                )}
              </span>
            )}
            <div className="list-card__price-wrap">
              {product.priceCents != null && product.priceCents > 0 ? (
                <span className="list-card__price">
                  {eurFormatter.format(product.priceCents / 100)}
                </span>
              ) : (
                <>
                  <span className="list-card__price list-card__price--empty" aria-hidden="true">
                    —
                  </span>
                  <span className="sr-only">Prix non renseigné</span>
                </>
              )}
              {product.totalAmount != null && product.totalAmount > 0 && (
                <span className="list-card__amount">
                  · {product.totalAmount} {product.amountUnit ?? product.unit}
                </span>
              )}
            </div>
            {product.userStatus === null ? (
              <Button
                variant="outline"
                size="sm"
                aria-label={`Ajouter ${product.name} à la collection`}
                onClick={handleAdd}
              >
                <Plus size={14} aria-hidden="true" />
                <span>Ajouter</span>
              </Button>
            ) : product.userStatus === 'avoided' ? (
              <span className="list-card__shelf-flag list-card__shelf-flag--avoided">
                Marqué à éviter pour vous
              </span>
            ) : (
              <span className="list-card__shelf-flag">
                <Check size={14} aria-hidden="true" />
                Sur votre étagère
              </span>
            )}
          </div>
        </Card.Footer>
      </div>
    </Card>
  )
}

export const ProductCard = memo(ProductCardImpl)
