import type { UserProductStatus } from '@habit-tracker/shared'

import clsx from 'clsx'
import { X } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/FormMessage/FormMessage'
import { Input } from '@/component/Input/Input'
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
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </Button>
        </div>

        <div className="qa-modal-content">
          <div className="qa-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={clsx('qa-tab', activeTab === 'existing' && 'active')}
              onClick={() => setActiveTab('existing')}
              aria-selected={activeTab === 'existing'}
            >
              Produit existant
            </button>
            <button
              type="button"
              role="tab"
              className={clsx('qa-tab', activeTab === 'new' && 'active')}
              onClick={() => setActiveTab('new')}
              aria-selected={activeTab === 'new'}
            >
              Nouveau produit
            </button>
          </div>

          {activeTab === 'existing' ? (
            <div className="qa-search-section">
              {!selectedProduct ? (
                <SearchCombobox
                  label="Rechercher un produit dans le catalogue"
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
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
                      Changer
                    </Button>
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
                          aria-pressed={selectedStatus === s}
                        >
                          <Icon size={18} />
                          <span>{cfg.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {selectedStatus === 'in_stock' && (
                    <div className="qa-purchase-fields">
                      <Input
                        id="qa-purchased-at"
                        label="Date d'achat"
                        type="date"
                        value={purchasedAt}
                        onChange={(e) => setPurchasedAt(e.target.value)}
                        required
                      />
                      <Input
                        id="qa-purchase-price"
                        label="Prix payé (€) — optionnel"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                      />
                      <Input
                        id="qa-expires-at"
                        label="Date d'expiration — optionnel"
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    fullWidth
                    onClick={handleAddExisting}
                    disabled={isPending}
                    loading={isPending}
                  >
                    Ajouter à ma collection
                  </Button>
                </>
              )}
            </div>
          ) : (
            <form className="qa-form" onSubmit={handleCreateAndAdd}>
              <Input
                id="qa-new-name"
                label="Nom du produit"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: CeraVe Hydrating Cleanser"
              />
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
                <FormMessage variant="warning">
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
                </FormMessage>
              )}

              <Input
                id="qa-new-kind"
                label="Catégorie"
                required
                value={newKind}
                onChange={(e) => setNewKind(e.target.value)}
              />

              <div className="qa-status-grid qa-status-grid--spaced">
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
                  <Input
                    id="qa-new-purchased-at"
                    label="Date d'achat"
                    type="date"
                    value={purchasedAt}
                    onChange={(e) => setPurchasedAt(e.target.value)}
                    required
                  />
                  <Input
                    id="qa-new-purchase-price"
                    label="Prix payé (€) — optionnel"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                  <Input
                    id="qa-new-expires-at"
                    label="Date d'expiration — optionnel"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={isPending || !newBrand.trim() || !newBrandConfirmed}
                loading={isPending}
              >
                Créer et ajouter
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
