import clsx from 'clsx'

import { DialogPrimitive, useDialogTitleId } from './DialogPrimitive'

import './Sheet.css'

interface SheetProps {
  onClose: () => void
  labelledBy?: string
  closeOnBackdrop?: boolean
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  children: React.ReactNode
}

export function Sheet({
  onClose,
  labelledBy,
  closeOnBackdrop = true,
  initialFocusRef,
  className,
  children,
}: SheetProps) {
  return (
    <DialogPrimitive
      onClose={onClose}
      labelledBy={labelledBy}
      closeOnBackdrop={closeOnBackdrop}
      initialFocusRef={initialFocusRef}
      className={clsx('dialog-sheet', className)}
    >
      {children}
    </DialogPrimitive>
  )
}

interface SheetTitleProps {
  className?: string
  children: React.ReactNode
}

Sheet.Title = function SheetTitle({ className, children }: SheetTitleProps) {
  const id = useDialogTitleId()
  return (
    <h2 id={id} className={className}>
      {children}
    </h2>
  )
}
