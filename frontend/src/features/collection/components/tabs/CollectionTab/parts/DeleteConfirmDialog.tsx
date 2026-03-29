import { AlertTriangle, X } from 'lucide-react'
import { useRef } from 'react'

import { useClickOutside } from '@/hooks/useClickOutside'
import './DeleteConfirmDialog.css'

interface DeleteConfirmDialogProps {
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
  message?: string
  confirmLabel?: string
}

export function DeleteConfirmDialog({
  onConfirm,
  onClose,
  isPending,
  message = 'Retirer ce produit de votre collection ?',
  confirmLabel = 'Retirer',
}: DeleteConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Ferme sur clic extérieur OU touche Escape
  useClickOutside(ref, onClose)

  return (
    <div className="dcd-overlay">
      <div
        className="dcd-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="dcd-header">
          <div className="dcd-header-title">
            <AlertTriangle size={14} className="dcd-warning-icon" />
            <span className="dcd-dialog-title">CONFIRMATION</span>
          </div>
          <button type="button" className="dcd-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>

        <div className="dcd-body">
          <p>{message}</p>

          <div className="dcd-footer">
            <button type="button" className="dcd-cancel" onClick={onClose} disabled={isPending}>
              Annuler
            </button>
            <button
              type="button"
              className="dcd-confirm"
              onClick={(e) => {
                e.stopPropagation()
                onConfirm()
              }}
              disabled={isPending}
            >
              {isPending ? '...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
