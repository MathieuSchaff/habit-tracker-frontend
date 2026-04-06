import clsx from 'clsx'
import { createContext, useContext, useEffect, useId, useRef } from 'react'

import { useScrollLock } from '@/hooks/useScrollLock'

import './DialogPrimitive.css'

interface DialogTitleContextValue {
  id: string
}

const DialogTitleContext = createContext<DialogTitleContextValue | null>(null)

export function useDialogTitleId() {
  const ctx = useContext(DialogTitleContext)
  if (!ctx) throw new Error('Dialog.Title must be used inside a Modal or Sheet')
  return ctx.id
}

interface DialogPrimitiveProps {
  onClose: () => void
  /** optional — if omitted, an id is generated and exposed via Modal.Title / Sheet.Title */
  labelledBy?: string
  /** native <dialog> implies role="dialog"; pass "alertdialog" only when the dialog interrupts a flow */
  role?: 'dialog' | 'alertdialog'
  closeOnBackdrop?: boolean
  /** focused on open instead of the browser's default (first focusable) */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  children: React.ReactNode
}

export function DialogPrimitive({
  onClose,
  labelledBy,
  role,
  closeOnBackdrop = true,
  initialFocusRef,
  className,
  children,
}: DialogPrimitiveProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const generatedId = useId()
  const titleId = labelledBy ?? generatedId
  // showModal() locks background scroll natively; we only need the manual lock on the fallback path
  const needsManualLock = useRef(false)

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (typeof node.showModal === 'function') {
      try {
        node.showModal()
      } catch {
        node.setAttribute('open', '')
        needsManualLock.current = true
      }
    } else {
      node.setAttribute('open', '')
      needsManualLock.current = true
    }
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus()
    }
    return () => {
      if (node.open) {
        try {
          node.close()
        } catch {
          node.removeAttribute('open')
        }
      }
    }
  }, [initialFocusRef])

  useScrollLock(needsManualLock.current)

  // native fires "cancel" on Escape — drive the unmount via React state instead of letting the browser close it alone
  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault()
    onClose()
  }

  // backdrop clicks have target === dialog itself; clicks on inner content bubble with a different target
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return
    if (e.target === dialogRef.current) onClose()
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click handler; Esc is handled by the browser via onCancel
    <dialog
      ref={dialogRef}
      className={clsx('dialog-content', className)}
      aria-labelledby={titleId}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <DialogTitleContext.Provider value={{ id: titleId }}>{children}</DialogTitleContext.Provider>
    </dialog>
  )
}
