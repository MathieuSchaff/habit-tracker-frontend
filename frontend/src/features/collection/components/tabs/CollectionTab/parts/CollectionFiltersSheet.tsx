import clsx from 'clsx'
import { FilterX, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Sheet } from '@/component/Dialog/Sheet'
import { Input } from '@/component/Input/Input'
import { useCollectionFilter } from '@/features/collection/context/CollectionFilterContext'

import './CollectionFiltersSheet.css'

interface CollectionFiltersSheetProps {
  onClose: () => void
}

// Local draft so the page behind the sheet doesn't flicker on every click —
// we only commit to the global filter state when the user clicks "Appliquer".
// Closing via Esc, backdrop, or the X button discards the draft.
type Draft = {
  brand: string
  kind: string
  sentiment: number | 'all'
  repurchase: 'yes' | 'no' | 'unsure' | 'all'
  minNote: number
  maxPrice: number | ''
}

const EMPTY_DRAFT: Draft = {
  brand: 'all',
  kind: 'all',
  sentiment: 'all',
  repurchase: 'all',
  minNote: 0,
  maxPrice: '',
}

export function CollectionFiltersSheet({ onClose }: CollectionFiltersSheetProps) {
  const { brand, kind, sentiment, repurchase, minNote, maxPrice, filterOptions, setFilter } =
    useCollectionFilter()

  // The sheet is unmounted when closed, so initial state always reflects
  // the latest committed filters at the moment the user opens it.
  const [draft, setDraft] = useState<Draft>({
    brand,
    kind,
    sentiment,
    repurchase,
    minNote,
    maxPrice,
  })

  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleApply = useCallback(() => {
    setFilter(draft)
    onClose()
  }, [draft, setFilter, onClose])

  const handleReset = useCallback(() => {
    setDraft(EMPTY_DRAFT)
  }, [])

  return (
    <Sheet onClose={onClose} initialFocusRef={closeBtnRef} className="coll-sheet">
      <div className="coll-sheet-handle" />
      <div className="coll-sheet-header">
        <Sheet.Title>FILTRES AVANCÉS</Sheet.Title>
        <div className="coll-sheet-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            title="Réinitialiser tous les filtres"
          >
            <FilterX size={18} />
            <span>Réinitialiser</span>
          </Button>
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fermer les filtres sans appliquer"
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      <div className="coll-sheet-body">
        <div className="coll-adv-grid">
          <div className="coll-adv-group">
            <label htmlFor="coll-brand">Marque</label>
            <select
              id="coll-brand"
              value={draft.brand}
              onChange={(e) => update('brand', e.target.value)}
            >
              <option value="all">Toutes les marques</option>
              {filterOptions.brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="coll-adv-group">
            <label htmlFor="coll-kind">Catégorie</label>
            <select
              id="coll-kind"
              value={draft.kind}
              onChange={(e) => update('kind', e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              {filterOptions.kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="coll-adv-group">
            <legend className="coll-label">Ressenti minimum</legend>
            <div className="coll-sentiment-row">
              {['all', 1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={clsx('coll-sentiment-btn', draft.sentiment === s && 'active')}
                  aria-pressed={draft.sentiment === s}
                  onClick={() => update('sentiment', s === 'all' ? 'all' : (s as number))}
                >
                  {s === 'all' ? 'Tous' : s}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="coll-adv-group">
            <legend className="coll-label">Prêt à racheter ?</legend>
            <div className="coll-repurchase-row">
              {['all', 'yes', 'no', 'unsure'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={clsx('coll-repurchase-btn', draft.repurchase === r && 'active')}
                  aria-pressed={draft.repurchase === r}
                  onClick={() => update('repurchase', r as 'yes' | 'no' | 'unsure' | 'all')}
                >
                  {r === 'all' && 'Tous'}
                  {r === 'yes' && 'Oui'}
                  {r === 'no' && 'Non'}
                  {r === 'unsure' && 'Peut-être'}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="coll-adv-group">
            <div className="coll-label-row">
              <label htmlFor="coll-min-note">Note minimum</label>
              <span className="coll-range-val" id="coll-min-note-val">
                {draft.minNote}/20
              </span>
            </div>
            <input
              id="coll-min-note"
              type="range"
              min="0"
              max="20"
              step="1"
              value={draft.minNote}
              aria-describedby="coll-min-note-val"
              aria-valuetext={`${draft.minNote} sur 20`}
              onChange={(e) => update('minNote', Number.parseInt(e.target.value, 10))}
            />
          </div>

          <div className="coll-adv-group">
            <Input
              id="coll-max-price"
              label="Prix maximum (€)"
              type="number"
              placeholder="Ex: 50"
              value={draft.maxPrice}
              onChange={(e) =>
                update('maxPrice', e.target.value === '' ? '' : Number.parseFloat(e.target.value))
              }
            />
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
