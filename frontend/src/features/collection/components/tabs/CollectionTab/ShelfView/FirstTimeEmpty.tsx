import { Plus } from 'lucide-react'

import { ProdCreamJarIcon, ProdPumpIcon, ProdTubeIcon } from '@/assets/product-icons'
import { Button } from '@/component/Button/Button'

import './FirstTimeEmpty.css'

interface FirstTimeEmptyProps {
  onAdd: () => void
}

export function FirstTimeEmpty({ onAdd }: FirstTimeEmptyProps) {
  return (
    <div className="first-empty">
      <div className="first-empty-art" aria-hidden="true">
        <div className="first-empty-shelf" />
        <div className="first-empty-bottle first-empty-bottle--b1">
          <ProdTubeIcon size={32} />
        </div>
        <div className="first-empty-bottle first-empty-bottle--b2">
          <ProdPumpIcon size={40} />
        </div>
        <div className="first-empty-bottle first-empty-bottle--b3">
          <ProdCreamJarIcon size={30} />
        </div>
        <div className="first-empty-sparkle first-empty-sparkle--s1">✦</div>
        <div className="first-empty-sparkle first-empty-sparkle--s2">✦</div>
      </div>
      <h2 className="first-empty-title">Votre étagère est vide</h2>
      <p className="first-empty-sub">
        Commencez par ajouter vos produits préférés. Nous vous aiderons à analyser vos habitudes et
        à trouver ce qui fonctionne vraiment pour vous.
      </p>
      <Button variant="primary" size="lg" className="first-empty-cta" onClick={onAdd}>
        <Plus size={18} aria-hidden="true" />
        <span>Ajouter mon premier produit</span>
      </Button>
      <div className="first-empty-hints">
        <div className="first-empty-hint">
          <span className="first-empty-hint-icon" aria-hidden="true">
            💎
          </span>
          <span>
            <b>Saint Graal</b> — vos coups de cœur
          </span>
        </div>
        <div className="first-empty-hint">
          <span className="first-empty-hint-icon" aria-hidden="true">
            📦
          </span>
          <span>
            <b>En stock</b> — ce que vous utilisez
          </span>
        </div>
        <div className="first-empty-hint">
          <span className="first-empty-hint-icon" aria-hidden="true">
            🛍️
          </span>
          <span>
            <b>Wishlist</b> — vos envies
          </span>
        </div>
      </div>
    </div>
  )
}
