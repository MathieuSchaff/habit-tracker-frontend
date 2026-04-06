import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import { useClickOutside } from '@/hooks/useClickOutside'

import './DropdownMenu.css'

type Align = 'start' | 'end'
type Side = 'top' | 'bottom'

interface DropdownMenuContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  menuId: string
  registerItem: (el: HTMLElement | null, idx: number) => void
  itemsRef: React.MutableRefObject<HTMLElement[]>
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

const useDropdownMenu = () => {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) throw new Error('DropdownMenu subcomponents must be used inside <DropdownMenu>')
  return ctx
}

interface DropdownMenuProps {
  children: ReactNode
  className?: string
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<HTMLElement[]>([])
  const menuId = useId()

  const close = useCallback(() => {
    setIsOpen(false)
    // Return focus to the trigger so keyboard users keep their place.
    triggerRef.current?.focus()
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  // Reset registered items each render so stale refs don't pile up.
  itemsRef.current = []
  const registerItem = useCallback((el: HTMLElement | null, idx: number) => {
    if (el) itemsRef.current[idx] = el
  }, [])

  useClickOutside(wrapperRef, () => setIsOpen(false))

  return (
    <DropdownMenuContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        triggerRef,
        contentRef,
        menuId,
        registerItem,
        itemsRef,
      }}
    >
      <div ref={wrapperRef} className={`dropdown-menu${className ? ` ${className}` : ''}`}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  children: ReactElement<{
    ref?: React.Ref<HTMLElement>
    onClick?: (e: React.MouseEvent) => void
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
    'aria-controls'?: string
  }>
}

function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { isOpen, toggle, triggerRef, menuId } = useDropdownMenu()

  if (!isValidElement(children)) {
    throw new Error('DropdownMenu.Trigger expects a single React element child')
  }

  // biome-ignore lint/suspicious/noExplicitAny: cloneElement ref typing across element kinds
  return cloneElement(children as ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
      // Forward to existing ref if any.
      const childRef = (children as unknown as { ref?: React.Ref<HTMLElement> }).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && 'current' in childRef)
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      children.props.onClick?.(e)
      toggle()
    },
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
    'aria-controls': menuId,
  })
}

interface DropdownMenuContentProps {
  children: ReactNode
  align?: Align
  side?: Side
  className?: string
  ariaLabel?: string
}

function DropdownMenuContent({
  children,
  align = 'end',
  side = 'bottom',
  className,
  ariaLabel,
}: DropdownMenuContentProps) {
  const { isOpen, close, contentRef, menuId, itemsRef } = useDropdownMenu()

  // Focus first item once opened so arrow keys work right away.
  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => itemsRef.current[0]?.focus())
    return () => cancelAnimationFrame(id)
  }, [isOpen, itemsRef])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = itemsRef.current.filter(Boolean)
    if (!items.length) return
    const currentIdx = items.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(currentIdx + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(currentIdx - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div
      ref={contentRef}
      id={menuId}
      role="menu"
      aria-label={ariaLabel}
      className={`dropdown-menu__content dropdown-menu__content--align-${align} dropdown-menu__content--side-${side}${className ? ` ${className}` : ''}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactElement<{
    ref?: React.Ref<HTMLElement>
    onClick?: (e: React.MouseEvent) => void
    role?: string
    className?: string
  }>
  index: number
  variant?: 'default' | 'danger'
  closeOnSelect?: boolean
  onSelect?: () => void
}

function DropdownMenuItem({
  children,
  index,
  variant = 'default',
  closeOnSelect = true,
  onSelect,
}: DropdownMenuItemProps) {
  const { close, registerItem } = useDropdownMenu()

  if (!isValidElement(children)) {
    throw new Error('DropdownMenu.Item expects a single React element child')
  }

  const childClassName = children.props.className ?? ''
  const itemClass = `dropdown-menu__item${variant === 'danger' ? ' dropdown-menu__item--danger' : ''}${childClassName ? ` ${childClassName}` : ''}`

  // biome-ignore lint/suspicious/noExplicitAny: cloneElement ref typing across element kinds
  return cloneElement(children as ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      registerItem(node, index)
      const childRef = (children as unknown as { ref?: React.Ref<HTMLElement> }).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && 'current' in childRef)
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node
    },
    role: 'menuitem',
    className: itemClass,
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e)
      onSelect?.()
      if (closeOnSelect) close()
    },
  })
}

DropdownMenu.Trigger = DropdownMenuTrigger
DropdownMenu.Content = DropdownMenuContent
DropdownMenu.Item = DropdownMenuItem
