import clsx from 'clsx'
import { FilterX, X } from 'lucide-react'

import { useCollectionFilter } from '@/features/collection/context/CollectionFilterContext'
import { useScrollLock } from '@/hooks/useScrollLock'

import './CollectionFiltersSheet.css'

interface CollectionFiltersSheetProps {
  onClose: () => void
}

export function CollectionFiltersSheet({ onClose }: CollectionFiltersSheetProps) {
  useScrollLock(true)

  const {
    brand,
    kind,
    sentiment,
    repurchase,
    minNote,
    maxPrice,
    filterOptions,
    setFilter,
    resetFilters,
  } = useCollectionFilter()

  return (
    <div className="coll-sheet-overlay">
      <button type="button" className="coll-sheet-backdrop" onClick={onClose} aria-label="Fermer" />
      <div
        className="coll-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coll-sheet-title"
      >
        <div className="coll-sheet-handle" />
        <div className="coll-sheet-header">
          <h3 id="coll-sheet-title">FILTRES AVANCÉS</h3>
          <div className="coll-sheet-actions">
            <button
              type="button"
              className="coll-reset-btn"
              onClick={resetFilters}
              title="Réinitialiser tous les filtres"
            >
              <FilterX size={18} />
              <span>Réinitialiser</span>
            </button>
            <button
              type="button"
              className="coll-sheet-close"
              onClick={onClose}
              aria-label="Fermer les filtres"
              // biome-ignore lint/a11y/noAutofocus: intentional focus on open
              autoFocus
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="coll-sheet-body">
          <div className="coll-adv-grid">
            <div className="coll-adv-group">
              <label htmlFor="coll-brand">Marque</label>
              <select
                id="coll-brand"
                value={brand}
                onChange={(e) => setFilter({ brand: e.target.value })}
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
                value={kind}
                onChange={(e) => setFilter({ kind: e.target.value })}
              >
                <option value="all">Toutes les catégories</option>
                {filterOptions.kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="coll-adv-group">
              <span className="coll-label">Ressenti minimum</span>
              <div className="coll-sentiment-row">
                {['all', 1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={clsx('coll-sentiment-btn', sentiment === s && 'active')}
                    onClick={() =>
                      setFilter({
                        sentiment: s === 'all' ? 'all' : (s as number),
                      })
                    }
                  >
                    {s === 'all' ? 'Tous' : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="coll-adv-group">
              <span className="coll-label">Prêt à racheter ?</span>
              <div className="coll-repurchase-row">
                {['all', 'yes', 'no', 'unsure'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={clsx('coll-repurchase-btn', repurchase === r && 'active')}
                    onClick={() => setFilter({ repurchase: r as 'yes' | 'no' | 'unsure' | 'all' })}
                  >
                    {r === 'all' && 'Tous'}
                    {r === 'yes' && 'Oui'}
                    {r === 'no' && 'Non'}
                    {r === 'unsure' && 'Peut-être'}
                  </button>
                ))}
              </div>
            </div>

            <div className="coll-adv-group">
              <div className="coll-label-row">
                <label htmlFor="coll-min-note">Note minimum</label>
                <span className="coll-range-val">{minNote}/20</span>
              </div>
              <input
                id="coll-min-note"
                type="range"
                min="0"
                max="20"
                step="1"
                value={minNote}
                onChange={(e) => setFilter({ minNote: Number.parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="coll-adv-group">
              <label htmlFor="coll-max-price">Prix maximum (€)</label>
              <input
                id="coll-max-price"
                type="number"
                placeholder="Ex: 50"
                value={maxPrice}
                onChange={(e) =>
                  setFilter({
                    maxPrice: e.target.value === '' ? '' : Number.parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="coll-sheet-footer">
          <button type="button" className="coll-apply-btn" onClick={onClose}>
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  )
}
