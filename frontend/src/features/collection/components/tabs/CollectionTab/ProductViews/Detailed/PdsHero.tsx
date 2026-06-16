import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { Check, ChevronDown, ExternalLink, X } from 'lucide-react'

import { Sheet } from '@/component/Dialog/Sheet'
import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import { statusLabels } from '@/features/collection/constants'
import { ProductImage } from '@/features/products/components/ProductImage/ProductImage'
import type { UserProduct } from '@/lib/queries/user-products'

interface PdsHeroProps {
  p: UserProduct
  closeBtnRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onStatusChange: (status: UserProduct['status']) => void
}

export function PdsHero({ p, closeBtnRef, onClose, onStatusChange }: PdsHeroProps) {
  const statusCfg = statusLabels[p.status]
  const StatusIcon = statusCfg.icon
  const priceEuros = p.product.priceCents ? `${(p.product.priceCents / 100).toFixed(2)} €` : null

  return (
    <header className="pds-hero">
      <div className="pds-hero-bar">
        <button
          ref={closeBtnRef}
          type="button"
          className="pds-hero-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <DropdownMenu className="pds-header-status">
          <DropdownMenu.Trigger>
            <button
              type="button"
              className="pds-header-status-trigger"
              style={{ '--header-status-color': statusCfg.color } as React.CSSProperties}
              aria-label={`Statut : ${statusCfg.label}. Changer le statut.`}
            >
              <StatusIcon size={14} aria-hidden="true" />
              <span>{statusCfg.label}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            ariaLabel="Changer le statut du produit"
            className="pds-header-status-content"
          >
            {(Object.keys(statusLabels) as UserProduct['status'][]).map((s) => {
              const cfg = statusLabels[s]
              const Icon = cfg.icon
              const isActive = p.status === s
              return (
                <DropdownMenu.Item key={s} onSelect={() => onStatusChange(s)}>
                  <button
                    type="button"
                    className={clsx('pds-header-status-item', isActive && 'is-active')}
                    title={cfg.purpose}
                  >
                    <Icon size={14} style={{ color: cfg.color }} aria-hidden="true" />
                    <span className="pds-header-status-label">{cfg.label}</span>
                    {isActive && (
                      <Check size={14} aria-hidden="true" className="pds-header-status-check" />
                    )}
                  </button>
                </DropdownMenu.Item>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      <div className="pds-hero-main">
        <ProductImage
          kind={p.product.kind}
          unit={p.product.unit}
          imageUrl={p.product.imageUrl}
          size={88}
          className="pds-hero-photo product-image--flat"
        />
        <div className="pds-hero-title">
          <div className="pds-hero-brandrow">
            <span className="pds-hero-brand">{p.product.brand}</span>
            <span className="pds-hero-dot" aria-hidden="true">
              ·
            </span>
            <span className="pds-hero-kind">{p.product.kind}</span>
          </div>
          <Sheet.Title className="pds-hero-name">{p.product.name}</Sheet.Title>
          <div className="pds-hero-meta">
            {priceEuros && <span className="pds-hero-price">{priceEuros}</span>}
            <Link to="/products/$slug" params={{ slug: p.product.slug }} className="pds-hero-link">
              <span>Fiche produit</span>
              <ExternalLink size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
