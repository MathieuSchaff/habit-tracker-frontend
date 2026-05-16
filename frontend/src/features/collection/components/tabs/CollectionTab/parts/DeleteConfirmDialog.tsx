import { X } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import './DeleteConfirmDialog.css'

interface DeleteConfirmDialogProps {
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
  message?: string
  confirmLabel?: string
  title?: string
  // "Avoid instead" path: destructive delete becomes the fallback, not the default.
  onAvoid?: () => void
  avoidLabel?: string
  avoidPending?: boolean
}

export function DeleteConfirmDialog({
  onConfirm,
  onClose,
  isPending,
  message = 'Retirer ce produit de votre collection ?',
  confirmLabel = 'Retirer',
  title = 'Confirmation',
  onAvoid,
  avoidLabel = 'Marquer à éviter (garder mes notes)',
  avoidPending = false,
}: DeleteConfirmDialogProps) {
  const anyPending = isPending || avoidPending

  return (
    <Modal onClose={onClose} role="alertdialog" size="sm" className="dcd-dialog">
      <div className="dcd-header">
        <Modal.Title className="dcd-dialog-title">{title}</Modal.Title>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
          <X size={14} />
        </Button>
      </div>

      <div className="dcd-body">
        <p>{message}</p>

        <div className="dcd-footer">
          {onAvoid && (
            <Button onClick={onAvoid} disabled={anyPending} loading={avoidPending} fullWidth>
              {avoidLabel}
            </Button>
          )}
          <div className="dcd-footer-secondary">
            <Button variant="outline" onClick={onClose} disabled={anyPending}>
              Annuler
            </Button>
            <Button
              variant="ghost"
              onClick={() => onConfirm()}
              disabled={anyPending}
              loading={isPending}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
