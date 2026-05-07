import type { ProductCategory } from '@habit-tracker/shared'

import { X } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { Input } from '@/component/Input/Input'
import { SearchCombobox } from '@/component/Search/SearchCombobox'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { useQuickAdd } from '@/features/collection/hooks/useQuickAdd'
import { BrandCombobox } from '@/features/products/components/BrandCombobox/BrandCombobox'
import { productQueries } from '@/lib/queries/products'
import { PurchaseFields } from './PurchaseFields'
import { StatusSelector } from './StatusSelector'

import './QuickAdd.css'

interface QuickAddProps {
  onClose: () => void
}

type QaTabId = 'existing' | 'new'

const QA_TAB_OPTIONS: TabOption<QaTabId>[] = [
  { id: 'existing', label: 'Produit existant' },
  { id: 'new', label: 'Nouveau produit' },
]

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
    newCategory,
    setNewCategory,
    newBrandConfirmed,
    setNewBrandConfirmed,
    similarProducts,
    handleAddExisting,
    handleCreateAndAdd,
    isPending,
  } = useQuickAdd({ onClose })

  const purchaseFieldsVisible = selectedStatus === 'in_stock'

  return (
    <Modal onClose={onClose} size="lg" className="qa-modal">
      <div className="qa-modal-header">
        <Modal.Title>AJOUTER À MA COLLECTION</Modal.Title>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </Button>
      </div>

      <div className="qa-modal-content">
        <Tabs
          options={QA_TAB_OPTIONS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          idPrefix="qa-tab"
          className="qa-tabs"
        />

        {activeTab === 'existing' ? (
          <div
            className="qa-search-section"
            role="tabpanel"
            id="qa-tab-panel-existing"
            aria-labelledby="qa-tab-existing"
          >
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

                <StatusSelector value={selectedStatus} onChange={setSelectedStatus} />

                {purchaseFieldsVisible && (
                  <PurchaseFields
                    idPrefix="qa"
                    purchasedAt={purchasedAt}
                    onPurchasedAtChange={setPurchasedAt}
                    purchasePrice={purchasePrice}
                    onPurchasePriceChange={setPurchasePrice}
                    expiresAt={expiresAt}
                    onExpiresAtChange={setExpiresAt}
                  />
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
          <form
            className="qa-form"
            onSubmit={handleCreateAndAdd}
            role="tabpanel"
            id="qa-tab-panel-new"
            aria-labelledby="qa-tab-new"
          >
            <Input
              id="qa-new-name"
              label="Nom du produit"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex: CeraVe Hydrating Cleanser"
            />
            <BrandCombobox
              id="qa-new-brand"
              label="Marque"
              value={newBrand}
              onChange={(v, confirmed) => {
                setNewBrand(v)
                setNewBrandConfirmed(confirmed)
              }}
              placeholder="ex: CeraVe"
            />
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
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
            />

            <StatusSelector value={selectedStatus} onChange={setSelectedStatus} spaced />

            {purchaseFieldsVisible && (
              <PurchaseFields
                idPrefix="qa-new"
                purchasedAt={purchasedAt}
                onPurchasedAtChange={setPurchasedAt}
                purchasePrice={purchasePrice}
                onPurchasePriceChange={setPurchasePrice}
                expiresAt={expiresAt}
                onExpiresAtChange={setExpiresAt}
              />
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
    </Modal>
  )
}
