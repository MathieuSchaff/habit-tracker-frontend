import { AlertTriangle, X } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/component/Button/Button'
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dcd-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="dcd-header">
          <div className="dcd-header-title">
            <AlertTriangle size={14} className="dcd-warning-icon" />
            <span id="dcd-title" className="dcd-dialog-title">
              CONFIRMATION
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X size={14} />
          </Button>
        </div>

        <div className="dcd-body">
          <p>{message}</p>

          <div className="dcd-footer">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              variant="danger-ghost"
              onClick={() => onConfirm()}
              disabled={isPending}
              loading={isPending}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
