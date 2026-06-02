import clsx from 'clsx'
import { createContext, use, useEffect, useId, useRef } from 'react'

import { useScrollLock } from '@/hooks/useScrollLock'

import './DialogPrimitive.css'

interface DialogTitleContextValue {
  id: string
}

const DialogTitleContext = createContext<DialogTitleContextValue | null>(null)

export function useDialogTitleId() {
  const ctx = use(DialogTitleContext)
  if (!ctx) throw new Error('Dialog.Title must be used inside a Modal or Sheet')
  return ctx.id
}

interface DialogPrimitiveProps {
  onClose: () => void
  /** optional - if omitted, an id is generated and exposed via Modal.Title / Sheet.Title */
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
  // showModal() locks scroll natively; manual lock only when falling back to open attribute.
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

  // Route cancel through React instead of letting the browser close the dialog alone.
  // Skip while a DropdownMenu is open: Escape should peel the menu first.
  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault()
    if (document.body.dataset.dropdownMenuOpen) return
    onClose()
  }

  // Content clicks bubble with a different target than the dialog element.
  // Coordinate guard: native <select> dismiss events can misroute to the dialog even when
  // the pointer is inside the panel. Zero-size rect (jsdom) skips the coordinate check.
  const closeOnBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return
    if (e.target !== dialogRef.current) return
    const rect = dialogRef.current.getBoundingClientRect()
    if (rect.width > 0 || rect.height > 0) {
      const insidePanel =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      if (insidePanel) return
    }
    onClose()
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click handler; Esc is handled by the browser via onCancel
    <dialog
      ref={dialogRef}
      className={clsx('dialog-content', className)}
      aria-labelledby={titleId}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      onCancel={handleCancel}
      onClick={closeOnBackdropClick}
    >
      <DialogTitleContext value={{ id: titleId }}>{children}</DialogTitleContext>
    </dialog>
  )
}
