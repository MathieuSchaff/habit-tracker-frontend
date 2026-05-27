import { useCallback, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void
}

/**
 * Promise-based confirm modal - drop-in for `window.confirm` but calm.
 * Usage: `if (!(await confirm({ title: '…' }))) return; …`
 *
 * Returns `confirm` (async) + `dialog` JSX to render once at the page root.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const pendingResolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      pendingResolver.current = resolve
      setRequest({ ...opts, resolve })
    })
  }, [])

  const close = useCallback((result: boolean) => {
    pendingResolver.current?.(result)
    pendingResolver.current = null
    setRequest(null)
  }, [])

  const dialog = request ? (
    <Modal onClose={() => close(false)} role="alertdialog" size="sm" className="admin-confirm">
      <Modal.Title className="admin-confirm__title">{request.title}</Modal.Title>
      {request.message && <p className="admin-confirm__message">{request.message}</p>}
      <div className="admin-confirm__actions">
        <Button variant="ghost" onClick={() => close(false)}>
          {request.cancelLabel ?? 'Annuler'}
        </Button>
        <Button
          variant={request.variant === 'danger' ? 'primary' : 'primary'}
          onClick={() => close(true)}
        >
          {request.confirmLabel ?? 'Confirmer'}
        </Button>
      </div>
    </Modal>
  ) : null

  return { confirm, dialog }
}
