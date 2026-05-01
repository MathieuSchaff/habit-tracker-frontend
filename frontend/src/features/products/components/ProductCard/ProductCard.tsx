import {
  DENTAL_PRODUCT_TAG_TAXONOMY,
  getProductKindLabel,
  HAIRCARE_PRODUCT_TAG_TAXONOMY,
  PRODUCT_KINDS,
  PRODUCT_UNITS,
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
} from '@habit-tracker/shared'

import { Link } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import { memo, useCallback } from 'react'

import { Button } from '@/component/Button/Button'
import { Card } from '@/component/Card/Card'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { ProductImage } from '@/features/products/components/ProductImage/ProductImage'
import { LABEL_OVERRIDES } from '@/features/products/filters'
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

// Merged lookup across all 4 domain taxonomies. Slugs are effectively unique;
// when they overlap (e.g. peau-grasse exists in skincare + haircare) labels match.
const ALL_TAG_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(SKINCARE_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
  ...Object.fromEntries(
    Object.entries(HAIRCARE_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
  ...Object.fromEntries(
    Object.entries(DENTAL_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
  ...Object.fromEntries(
    Object.entries(SUPPLEMENT_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
}

function tagLabel(slug: string): string {
  return LABEL_OVERRIDES[slug] ?? ALL_TAG_LABELS[slug] ?? slug
}

// Maps tagType → chip visual variant. Drives CSS class so concern/goal pop in
// accent color, audience/restriction stay neutral, labels look like flags.
const TAG_VARIANT: Record<string, string> = {
  concern: 'benefit',
  goal: 'benefit',
  skin_type: 'audience',
  hair_type: 'audience',
  age_group: 'audience',
  restriction: 'audience',
  product_label: 'label',
  shared_label: 'label',
}

function tagVariant(tagType: string): string {
  return TAG_VARIANT[tagType] ?? 'neutral'
}

function kindClass(kind: string): string {
  const category = KIND_TO_CATEGORY[kind]
  return category && CATEGORIES_WITH_HUE.has(category) ? `kind--${category}` : 'kind--default'
}

function unitClass(unit: string | null | undefined): string {
  const u = unit?.toLowerCase().trim() ?? ''
  return KNOWN_UNITS.has(u) ? `unit--${u}` : ''
}

const eurFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

const MAX_PRIMARY_CHIPS = 3

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

  const primaryTags = product.tags
    .filter((t) => t.relevance === 'primary')
    .slice(0, MAX_PRIMARY_CHIPS)

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
            size={140}
            className="list-card__icon-wrap"
          />

          <div className="list-card__body">
            <div className="list-card__top-row">
              <span className="list-card__kind">{getProductKindLabel(product.kind)}</span>
              {product.profileMatches.length > 0 && (
                <span
                  className="list-card__avoid-badge"
                  title={`Déconseillé pour : ${avoidLabels.join(', ')}`}
                >
                  <AlertTriangle size={12} aria-hidden="true" />
                  Éviter
                </span>
              )}
            </div>

            <span className="list-card__brand">{product.brand}</span>
            <Card.Title
              as="p"
              className="list-card__name"
              style={{ viewTransitionName: `product-name-${product.slug}` }}
            >
              {product.name}
            </Card.Title>

            {primaryTags.length > 0 && (
              <ul className="list-card__chips">
                {primaryTags.map((t) => (
                  <li
                    key={t.slug}
                    className={`list-card__chip list-card__chip--${tagVariant(t.tagType)}`}
                  >
                    {tagLabel(t.slug)}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
              <span className="list-card__amount">
                · {product.totalAmount} {product.amountUnit ?? product.unit}
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
