import { AlertTriangle, X } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
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
  return (
    <Modal onClose={onClose} role="alertdialog" size="sm" className="dcd-dialog">
      <div className="dcd-header">
        <div className="dcd-header-title">
          <AlertTriangle size={14} className="dcd-warning-icon" />
          <Modal.Title className="dcd-dialog-title">CONFIRMATION</Modal.Title>
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
    </Modal>
  )
}
