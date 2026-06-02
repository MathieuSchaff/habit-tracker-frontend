import { useCallback, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { Textarea } from '@/component/Input/Textarea/Textarea'

type ReasonField = {
  label: string
  placeholder?: string
  hint?: string
  required?: boolean
}

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  // When set, the dialog renders a note field and confirm() resolves with the entered text.
  reason?: ReasonField
}

export type ConfirmResult = { confirmed: boolean; reason: string }

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean | ConfirmResult) => void
}

/**
 * Promise-based confirm modal - drop-in for `window.confirm` but calm.
 * Usage: `if (!(await confirm({ title: '…' }))) return; …`
 *
 * Pass `reason` to also capture a note; confirm() then resolves
 * `{ confirmed, reason }` instead of a bare boolean.
 *
 * Returns `confirm` (async) + `dialog` JSX to render once at the page root.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [reason, setReason] = useState('')
  const pendingResolver = useRef<((value: boolean | ConfirmResult) => void) | null>(null)

  function confirm(opts: ConfirmOptions & { reason: ReasonField }): Promise<ConfirmResult>
  function confirm(opts: ConfirmOptions): Promise<boolean>
  function confirm(opts: ConfirmOptions): Promise<boolean | ConfirmResult> {
    setReason('')
    return new Promise((resolve) => {
      pendingResolver.current = resolve
      setRequest({ ...opts, resolve })
    })
  }

  const settle = useCallback((value: boolean | ConfirmResult) => {
    pendingResolver.current?.(value)
    pendingResolver.current = null
    setRequest(null)
  }, [])

  const dialog = request ? (
    <Modal
      onClose={() => settle(request.reason ? { confirmed: false, reason: '' } : false)}
      role="alertdialog"
      size="sm"
      className="admin-confirm"
    >
      <Modal.Title className="admin-confirm__title">{request.title}</Modal.Title>
      {request.message && <p className="admin-confirm__message">{request.message}</p>}
      {request.reason && (
        <Textarea
          label={request.reason.label}
          placeholder={request.reason.placeholder}
          hint={request.reason.hint}
          required={request.reason.required}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <div className="admin-confirm__actions">
        <Button
          variant="ghost"
          onClick={() => settle(request.reason ? { confirmed: false, reason: '' } : false)}
        >
          {request.cancelLabel ?? 'Annuler'}
        </Button>
        <Button
          variant={request.variant === 'danger' ? 'danger-ghost' : 'primary'}
          disabled={!!request.reason?.required && reason.trim().length === 0}
          onClick={() => settle(request.reason ? { confirmed: true, reason: reason.trim() } : true)}
        >
          {request.confirmLabel ?? 'Confirmer'}
        </Button>
      </div>
    </Modal>
  ) : null

  return { confirm, dialog }
}
