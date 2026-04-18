import type { UserProductStatus } from '@habit-tracker/shared'

import { ArrowRight, X } from 'lucide-react'

import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import { StatusPicker } from './StatusPicker'

import './BulkBar.css'

interface BulkBarProps {
  selectedCount: number
  onMove: (status: UserProductStatus) => void
  onClear: () => void
}

export function BulkBar({ selectedCount, onMove, onClear }: BulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <section className="bulk-bar-wrap" aria-label="Actions groupées">
      <div className="bulk-bar">
        <button
          type="button"
          className="bulk-bar-close"
          onClick={onClear}
          aria-label="Annuler la sélection"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className="bulk-bar-label">
          <strong>{selectedCount}</strong>
          <span>{selectedCount > 1 ? 'produits sélectionnés' : 'produit sélectionné'}</span>
        </div>
        <div className="bulk-bar-action">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <button type="button" className="bulk-bar-move">
                <span>Déplacer vers</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              side="top"
              align="end"
              className="bulk-bar-picker"
              ariaLabel={`Déplacer ${selectedCount} produit${selectedCount > 1 ? 's' : ''}`}
            >
              <StatusPicker
                title={`Déplacer ${selectedCount} produit${selectedCount > 1 ? 's' : ''}`}
                onPick={onMove}
              />
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
    </section>
  )
}
