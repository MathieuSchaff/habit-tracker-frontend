import { getProductTagLabel } from '@aurore/shared'

import clsx from 'clsx'
import { FilterX, X } from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'

import { SentimentIcon } from '@/assets/sentiment-icons'
import { Button } from '@/component/Button/Button'
import { Sheet } from '@/component/Dialog/Sheet'
import { Select, type SelectOption } from '@/component/Input/Select/Select'
import { SCORE_THRESHOLDS } from '@/features/collection/constants'
import {
  type CollectionFilterValues,
  DEFAULT_FILTERS,
  useCollectionFilter,
} from '@/features/collection/context/CollectionFilterContext'

import './CollectionFiltersSheet.css'

// Tiers mirror card-corner thresholds without exposing the raw /20 score.
const NOTE_TIERS: { value: number; label: string }[] = [
  { value: 0, label: 'Toutes' },
  { value: SCORE_THRESHOLDS.good, label: 'Bonne' },
  { value: SCORE_THRESHOLDS.rare, label: 'Très bonne' },
  { value: SCORE_THRESHOLDS.gold, label: 'Excellente' },
]

interface CollectionFiltersSheetProps {
  onClose: () => void
}

// Local draft: commit to global state only on "Appliquer"; Esc/backdrop/X discards.
type Draft = CollectionFilterValues

export function CollectionFiltersSheet({ onClose }: CollectionFiltersSheetProps) {
  const { brand, productType, sentiment, repurchase, minNote, maxPrice, filterOptions, setFilter } =
    useCollectionFilter()

  // Sheet unmounts on close; initial state reflects committed filters at open time.
  const [draft, setDraft] = useState<Draft>({
    brand,
    productType,
    sentiment,
    repurchase,
    minNote,
    maxPrice,
  })

  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const priceId = useId()

  const brandOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: 'Toutes les marques' },
      ...filterOptions.brands.map((b) => ({ value: b, label: b })),
    ],
    [filterOptions.brands]
  )

  const productTypeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: 'Tous les types' },
      ...filterOptions.productTypes.map((slug) => ({
        value: slug,
        label: getProductTagLabel(slug) ?? slug,
      })),
    ],
    [filterOptions.productTypes]
  )

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleApply = useCallback(() => {
    setFilter(draft)
    onClose()
  }, [draft, setFilter, onClose])

  const handleReset = useCallback(() => {
    setDraft(DEFAULT_FILTERS)
  }, [])

  return (
    <Sheet onClose={onClose} initialFocusRef={closeBtnRef} className="coll-sheet">
      <div className="coll-sheet-handle" aria-hidden="true" />

      <header className="coll-sheet-header">
        <div className="coll-eyebrow">
          <span className="coll-eyebrow-dot" aria-hidden="true" />
          Aurore · Collection
        </div>
        <div className="coll-titlerow">
          <Sheet.Title className="coll-title">Filtres</Sheet.Title>
          <div className="coll-sheet-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              title="Réinitialiser tous les filtres"
            >
              <FilterX size={14} aria-hidden="true" />
              <span>Réinitialiser</span>
            </Button>
            <Button
              ref={closeBtnRef}
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fermer les filtres sans appliquer"
              className="coll-icon-btn"
            >
              <X size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="coll-lede">Affinez l'affichage de votre collection.</p>
      </header>

      <div className="coll-sheet-body">
        <div className="coll-adv-grid">
          <div className="coll-field">
            <span className="coll-field-label" id="coll-brand-label">
              Marque
            </span>
            <Select
              className="coll-select"
              aria-labelledby="coll-brand-label"
              options={brandOptions}
              value={draft.brand}
              onValueChange={(v) => update('brand', v || 'all')}
            />
          </div>

          <div className="coll-field">
            <span className="coll-field-label" id="coll-product-type-label">
              Type de produit
            </span>
            <Select
              className="coll-select"
              aria-labelledby="coll-product-type-label"
              options={productTypeOptions}
              value={draft.productType}
              onValueChange={(v) => update('productType', v || 'all')}
            />
          </div>

          <fieldset className="coll-field">
            <legend className="coll-field-label">Ressenti</legend>
            <div className="coll-rail">
              {(['all', 1, 2, 3, 4, 5, 6] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={clsx(
                    'coll-chip',
                    s === 'all' && 'is-text',
                    draft.sentiment === s && 'is-active'
                  )}
                  aria-pressed={draft.sentiment === s}
                  aria-label={s === 'all' ? 'Tous les ressentis' : `Ressenti ${s} sur 6`}
                  onClick={() => update('sentiment', s === 'all' ? 'all' : (s as number))}
                >
                  {s === 'all' ? 'Tous' : <SentimentIcon value={s} size={18} />}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="coll-field">
            <legend className="coll-field-label">Prêt à racheter ?</legend>
            <div className="coll-rail coll-rail--equal">
              {(['all', 'yes', 'no', 'unsure'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={clsx('coll-chip is-text', draft.repurchase === r && 'is-active')}
                  aria-pressed={draft.repurchase === r}
                  onClick={() => update('repurchase', r)}
                >
                  {r === 'all' && 'Tous'}
                  {r === 'yes' && 'Oui'}
                  {r === 'no' && 'Non'}
                  {r === 'unsure' && 'Peut-être'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="coll-field">
            <legend className="coll-field-label">Évaluation minimale</legend>
            <div className="coll-rail coll-rail--equal">
              {NOTE_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  className={clsx('coll-chip is-text', draft.minNote === tier.value && 'is-active')}
                  aria-pressed={draft.minNote === tier.value}
                  onClick={() => update('minNote', tier.value)}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="coll-field">
            <label className="coll-field-label" htmlFor={priceId}>
              Prix maximum
            </label>
            <div className="coll-priceinput">
              <input
                id={priceId}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="—"
                value={draft.maxPrice}
                onChange={(e) =>
                  update('maxPrice', e.target.value === '' ? '' : Number.parseFloat(e.target.value))
                }
              />
              <span className="coll-priceinput-suffix" aria-hidden="true">
                €
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="coll-sheet-footer">
        <Button fullWidth onClick={handleApply}>
          Appliquer les filtres
        </Button>
      </div>
    </Sheet>
  )
}
