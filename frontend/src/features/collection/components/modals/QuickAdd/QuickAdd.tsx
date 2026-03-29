import type { UserProductStatus } from '@habit-tracker/shared'

import clsx from 'clsx'
import { X } from 'lucide-react'

import { SearchCombobox } from '@/component/search/SearchCombobox'
import { statusLabels } from '@/features/collection/constants'
import { useQuickAdd } from '@/features/collection/hooks/useQuickAdd'
import { BrandCombobox } from '@/features/products/components/BrandCombobox/BrandCombobox'
import { productQueries } from '@/lib/queries/products'

import './QuickAdd.css'

interface QuickAddProps {
  onClose: () => void
}

export function QuickAdd({ onClose }: QuickAddProps) {
  const {
    activeTab,
    setActiveTab,
    selectedProduct,
    setSelectedProduct,
    selectedStatus,
    setSelectedStatus,
    purchasedAt,
    setPurchasedAt,
    purchasePrice,
    setPurchasePrice,
    expiresAt,
    setExpiresAt,
    newName,
    setNewName,
    newBrand,
    setNewBrand,
    newKind,
    setNewKind,
    newBrandConfirmed,
    setNewBrandConfirmed,
    similarProducts,
    handleAddExisting,
    handleCreateAndAdd,
    isPending,
  } = useQuickAdd({ onClose })

  return (
    <div className="qa-modal-overlay">
      <button
        type="button"
        className="qa-backdrop"
        onClick={onClose}
        aria-label="Fermer la fenêtre"
      />
      <div className="qa-modal" role="dialog" aria-modal="true" aria-labelledby="qa-modal-title">
        <div className="qa-modal-header">
          <h2 id="qa-modal-title">AJOUTER À MA COLLECTION</h2>
          <button type="button" className="qa-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="qa-modal-content">
          <div className="qa-tabs">
            <button
              type="button"
              className={clsx('qa-tab', activeTab === 'existing' && 'active')}
              onClick={() => setActiveTab('existing')}
            >
              Produit existant
            </button>
            <button
              type="button"
              className={clsx('qa-tab', activeTab === 'new' && 'active')}
              onClick={() => setActiveTab('new')}
            >
              Nouveau produit
            </button>
          </div>

          {activeTab === 'existing' ? (
            <div className="qa-search-section">
              {!selectedProduct ? (
                <SearchCombobox
                  placeholder="Rechercher dans le catalogue..."
                  queryFn={(q) => productQueries.search(q)}
                  toResult={(item) => ({
                    id: item.id,
                    slug: item.slug,
                    label: item.name,
                    sublabel: item.brand,
                  })}
                  onSelect={(_slug, item) => {
                    setSelectedProduct({
                      id: String(item.id),
                      slug: item.slug,
                      name: item.label,
                      brand: item.sublabel ?? '',
                    })
                  }}
                />
              ) : (
                <>
                  <div className="qa-selected-product">
                    <div className="qa-prod-info">
                      <h3>{selectedProduct.name}</h3>
                      <p>{selectedProduct.brand}</p>
                    </div>
                    <button
                      type="button"
                      className="qa-change-prod"
                      onClick={() => setSelectedProduct(null)}
                    >
                      Changer
                    </button>
                  </div>

                  <div className="qa-status-grid">
                    {(Object.keys(statusLabels) as UserProductStatus[]).map((s) => {
                      const cfg = statusLabels[s]
                      const Icon = cfg.icon
                      return (
                        <button
                          key={s}
                          type="button"
                          className={clsx('qa-status-opt', selectedStatus === s && 'active')}
                          onClick={() => setSelectedStatus(s)}
                        >
                          <Icon size={18} />
                          <span>{cfg.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {selectedStatus === 'in_stock' && (
                    <div className="qa-purchase-fields">
                      <div className="qa-field">
                        <label htmlFor="qa-purchased-at">Date d'achat</label>
                        <input
                          id="qa-purchased-at"
                          type="date"
                          value={purchasedAt}
                          onChange={(e) => setPurchasedAt(e.target.value)}
                          required
                        />
                      </div>
                      <div className="qa-field">
                        <label htmlFor="qa-purchase-price">Prix payé (€) — optionnel</label>
                        <input
                          id="qa-purchase-price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                        />
                      </div>
                      <div className="qa-field">
                        <label htmlFor="qa-expires-at">Date d'expiration — optionnel</label>
                        <input
                          id="qa-expires-at"
                          type="date"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="qa-submit-btn"
                    style={{ width: '100%' }}
                    onClick={handleAddExisting}
                    disabled={isPending}
                  >
                    {isPending ? 'Ajout...' : 'Ajouter à ma collection'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form className="qa-form" onSubmit={handleCreateAndAdd}>
              <div className="qa-field">
                <label htmlFor="qa-new-name">Nom du produit</label>
                <input
                  id="qa-new-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: CeraVe Hydrating Cleanser"
                />
              </div>
              <div className="qa-field">
                <label htmlFor="qa-new-brand">Marque</label>
                <BrandCombobox
                  id="qa-new-brand"
                  value={newBrand}
                  onChange={(v, confirmed) => {
                    setNewBrand(v)
                    setNewBrandConfirmed(confirmed)
                  }}
                  placeholder="ex: CeraVe"
                />
              </div>
              {similarProducts && similarProducts.length > 0 && (
                <div className="qa-duplicate-warning" role="alert">
                  <p>
                    {similarProducts.length === 1
                      ? 'Un produit similaire existe déjà :'
                      : 'Des produits similaires existent déjà :'}
                  </p>
                  <ul>
                    {similarProducts.map((p) => (
                      <li key={p.id}>
                        {p.name} — {p.brand}
                      </li>
                    ))}
                  </ul>
                  <p className="qa-duplicate-hint">
                    Vous pouvez l'ajouter via l'onglet « Produit existant ».
                  </p>
                </div>
              )}

              <div className="qa-field">
                <label htmlFor="qa-new-kind">Catégorie</label>
                <input
                  id="qa-new-kind"
                  type="text"
                  required
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value)}
                />
              </div>

              <div className="qa-status-grid" style={{ marginTop: '0.5rem' }}>
                {(Object.keys(statusLabels) as UserProductStatus[]).map((s) => {
                  const cfg = statusLabels[s]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={s}
                      type="button"
                      className={clsx('qa-status-opt', selectedStatus === s && 'active')}
                      onClick={() => setSelectedStatus(s)}
                    >
                      <Icon size={18} />
                      <span>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>

              {selectedStatus === 'in_stock' && (
                <div className="qa-purchase-fields">
                  <div className="qa-field">
                    <label htmlFor="qa-new-purchased-at">Date d'achat</label>
                    <input
                      id="qa-new-purchased-at"
                      type="date"
                      value={purchasedAt}
                      onChange={(e) => setPurchasedAt(e.target.value)}
                      required
                    />
                  </div>
                  <div className="qa-field">
                    <label htmlFor="qa-new-purchase-price">Prix payé (€) — optionnel</label>
                    <input
                      id="qa-new-purchase-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                    />
                  </div>
                  <div className="qa-field">
                    <label htmlFor="qa-new-expires-at">Date d'expiration — optionnel</label>
                    <input
                      id="qa-new-expires-at"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="qa-submit-btn"
                disabled={isPending || !newBrand.trim() || !newBrandConfirmed}
              >
                {isPending ? 'Chargement...' : 'Créer et ajouter'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
