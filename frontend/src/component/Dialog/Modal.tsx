import clsx from 'clsx'

import { DialogPrimitive, useDialogTitleId } from './DialogPrimitive'

import './Modal.css'

interface ModalProps {
  onClose: () => void
  labelledBy?: string
  role?: 'dialog' | 'alertdialog'
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  children: React.ReactNode
}

export function Modal({
  onClose,
  labelledBy,
  role = 'dialog',
  size = 'md',
  closeOnBackdrop = true,
  initialFocusRef,
  className,
  children,
}: ModalProps) {
  return (
    <DialogPrimitive
      onClose={onClose}
      labelledBy={labelledBy}
      role={role}
      closeOnBackdrop={closeOnBackdrop}
      initialFocusRef={initialFocusRef}
      className={clsx('dialog-modal', `dialog-modal--${size}`, className)}
    >
      {children}
    </DialogPrimitive>
  )
}

interface ModalTitleProps {
  className?: string
  children: React.ReactNode
}

// auto-wires its id to the parent Modal's aria-labelledby so callers don't have to manage ids
Modal.Title = function ModalTitle({ className, children }: ModalTitleProps) {
  const id = useDialogTitleId()
  return (
    <h2 id={id} className={className}>
      {children}
    </h2>
  )
}
