import { getProductKindLabel, PRODUCT_KINDS, PRODUCT_UNITS } from '@habit-tracker/shared'

import { Link } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import { memo, useCallback } from 'react'

import { ProductIcon } from '@/assets/product-icons'
import { Button } from '@/component/Button/Button'
import { Card } from '@/component/Card/Card'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
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
  const handleAdd = useCallback(() => {
    onAdd({
      id: product.id,
      name: product.name,
      brand: product.brand,
      priceCents: product.priceCents,
    })
  }, [onAdd, product.id, product.name, product.brand, product.priceCents])

  return (
    <Card
      as="li"
      interactive
      accent="var(--_kind-color)"
      className={`list-card list-card--product ${kindClass(product.kind)} ${unitClass(product.unit)}`}
    >
      <div className="list-card__inner">
        <Link to="/products/$slug" params={{ slug: product.slug }} className="list-card__header">
          <div className="list-card__header-top">
            <div className="list-card__top-meta">
              <span className="list-card__kind">{getProductKindLabel(product.kind)}</span>
              {product.profileMatches.length > 0 && (
                <span
                  className="list-card__avoid-badge"
                  title={`Déconseillé pour : ${product.profileMatches
                    .map(
                      (s) =>
                        SKIN_TYPE_LABELS[s as keyof typeof SKIN_TYPE_LABELS] ??
                        SKIN_CONCERN_LABELS[s as keyof typeof SKIN_CONCERN_LABELS] ??
                        s
                    )
                    .join(', ')}`}
                >
                  <AlertTriangle size={12} aria-hidden="true" />
                  Éviter
                </span>
              )}
            </div>
            <div className="list-card__icon-wrap" aria-hidden="true">
              <ProductIcon unit={product.unit} kind={product.kind} size={18} />
            </div>
          </div>
          <span className="list-card__brand">{product.brand}</span>
          <Card.Title
            as="p"
            className="list-card__name"
            style={{ viewTransitionName: `product-name-${product.slug}` }}
          >
            {product.name}
          </Card.Title>
        </Link>

        <Card.Footer>
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
              <span className="list-card__unit-chip">
                {product.totalAmount} {product.amountUnit ?? product.unit}
              </span>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            aria-label={`Ajouter ${product.name} à la collection`}
            onClick={handleAdd}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Ajouter</span>
          </Button>
        </Card.Footer>
      </div>
    </Card>
  )
}

export const ProductCard = memo(ProductCardImpl)
