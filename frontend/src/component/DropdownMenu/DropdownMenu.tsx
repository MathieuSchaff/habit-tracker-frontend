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
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useCaptureDismiss } from '@/hooks/useCaptureDismiss'
import { useEscapeKey } from '@/hooks/useEscapeKey'

import './DropdownMenu.css'

type Align = 'start' | 'end'
type Side = 'top' | 'bottom'

type InitialFocus = 'first' | 'last'

interface DropdownMenuContextValue {
  isOpen: boolean
  open: (initial?: InitialFocus) => void
  close: () => void
  toggle: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  wrapperRef: React.RefObject<HTMLDivElement | null>
  menuId: string
  initialFocusRef: React.MutableRefObject<InitialFocus>
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
  // Tells Content which item to focus when the menu opens. ArrowUp on the
  // trigger sets 'last' (per ARIA APG menu-button); everything else defaults
  // to 'first'. Ref (not state) so toggling it doesn't re-render.
  const initialFocusRef = useRef<InitialFocus>('first')
  const menuId = useId()

  const close = useCallback(() => {
    setIsOpen(false)
    // Return focus to the trigger so keyboard users keep their place. Skip if
    // the trigger node was detached (route change unmounting the parent,
    // ancestor dialog closing concurrently) - focusing a detached node no-ops
    // and steals focus from whatever the browser would otherwise hand it to.
    const trigger = triggerRef.current
    if (trigger && document.contains(trigger)) trigger.focus()
  }, [])

  const open = useCallback((initial: InitialFocus = 'first') => {
    initialFocusRef.current = initial
    setIsOpen(true)
  }, [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  // useCaptureDismiss (not useClickOutside): the portaled menu floats over
  // sibling product cards. A mousedown-based dismiss would close the menu
  // AND let the underlying card click through (navigating by surprise on
  // mobile). See hook docs for the tap-block rationale.
  // Multi-ref: portaled content sits outside wrapperRef, so both refs count
  // as "inside". Gated on isOpen so closed menus keep no listener
  // (one DropdownMenu per product card × N cards adds up).
  useCaptureDismiss([wrapperRef, contentRef], () => setIsOpen(false), { enabled: isOpen })

  useEscapeKey(() => {
    if (isOpen) close()
  })

  return (
    <DropdownMenuContext
      value={{
        isOpen,
        open,
        close,
        toggle,
        triggerRef,
        contentRef,
        wrapperRef,
        menuId,
        initialFocusRef,
      }}
    >
      <div ref={wrapperRef} className={`dropdown-menu${className ? ` ${className}` : ''}`}>
        {children}
      </div>
    </DropdownMenuContext>
  )
}

interface DropdownMenuTriggerProps {
  children: ReactElement<{
    ref?: React.Ref<HTMLElement>
    onClick?: (e: React.MouseEvent) => void
    onKeyDown?: (e: React.KeyboardEvent) => void
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
    'aria-controls'?: string
  }>
}

function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { isOpen, open, toggle, triggerRef, menuId } = useDropdownMenu()

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
    onKeyDown: (e: React.KeyboardEvent) => {
      children.props.onKeyDown?.(e)
      // ARIA APG menu-button: ArrowDown opens with focus on first item,
      // ArrowUp opens with focus on last. Enter/Space already work via
      // the button's native click → toggle path.
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        open('first')
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        open('last')
      }
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

interface MenuCoords {
  top: number
  left: number
}

function DropdownMenuContent({
  children,
  align = 'end',
  side = 'bottom',
  className,
  ariaLabel,
}: DropdownMenuContentProps) {
  const { isOpen, close, triggerRef, contentRef, menuId, initialFocusRef } = useDropdownMenu()
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  // Portal target captured in state (not read inline at render): keeps the
  // triggerRef.current lookup out of the render path (concurrent-mode safe),
  // recomputes only on open, and locks the menu to the container it opened in
  // so a dialog closing mid-open doesn't teleport the menu and drop focus.
  const [portalTarget, setPortalTarget] = useState<Element>(() => document.body)

  useLayoutEffect(() => {
    if (!isOpen) return
    setPortalTarget(triggerRef.current?.closest('dialog[open]') ?? document.body)
  }, [isOpen, triggerRef])

  // Compute fixed position from the trigger rect. useLayoutEffect runs after the
  // menu is in the DOM but before paint, so the user never sees the (0,0)
  // first-render position. Repeats on resize/scroll so the menu follows the
  // trigger when the page moves.
  useLayoutEffect(() => {
    if (!isOpen) return

    const compute = () => {
      const trigger = triggerRef.current
      const content = contentRef.current
      if (!trigger || !content) return

      const tr = trigger.getBoundingClientRect()
      const cr = content.getBoundingClientRect()

      const gap = 4
      const margin = 8

      let top = side === 'bottom' ? tr.bottom + gap : tr.top - cr.height - gap
      let left = align === 'start' ? tr.left : tr.right - cr.width

      // Clamp horizontally so triggers near viewport edges don't push the menu off-screen.
      if (left < margin) left = margin
      const maxLeft = window.innerWidth - margin - cr.width
      if (left > maxLeft) left = maxLeft

      // Same clamp vertically - covers short viewports (mobile portrait + keyboard
      // open) and trigger placement near the bottom edge. No auto-flip yet:
      // intentional follow-up if a real overflow case bites.
      const maxTop = window.innerHeight - margin - cr.height
      if (top > maxTop) top = maxTop
      if (top < margin) top = margin

      setCoords({ top, left })
    }

    compute()
    window.addEventListener('resize', compute, { passive: true })
    window.addEventListener('scroll', compute, { passive: true, capture: true })

    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, { capture: true })
    }
  }, [isOpen, side, align, triggerRef, contentRef])

  // Reset coords once closed so the next open recomputes from scratch.
  useEffect(() => {
    if (!isOpen) setCoords(null)
  }, [isOpen])

  // Focus the initial item once opened so arrow keys work right away.
  // `initialFocusRef` is set by the trigger (or defaults to 'first') just
  // before isOpen flips, so by the time this effect runs the choice is settled.
  // Reads items live from the DOM (querySelectorAll) - Fragment children,
  // nested wrappers, and conditional remounts are all picked up without a
  // separate registration step.
  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => {
      const items = contentRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
      if (!items?.length) return
      const target = initialFocusRef.current === 'last' ? items[items.length - 1] : items[0]
      target?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, contentRef, initialFocusRef])

  // Tell ancestor <dialog> handlers (Sheet/Modal) to skip their Escape close
  // path while a menu is open, so Escape collapses the menu first instead of
  // closing both layers at once. Counter (not boolean) handles nested menus.
  useEffect(() => {
    if (!isOpen) return
    const next = Number.parseInt(document.body.dataset.dropdownMenuOpen ?? '0', 10) + 1
    document.body.dataset.dropdownMenuOpen = String(next)
    return () => {
      // Defer decrement past the current task: when the menu closes via
      // Escape, React unmounts before the browser dispatches the dialog's
      // `cancel` event. If we cleared the flag here, DialogPrimitive.handleCancel
      // would see no menu and close the dialog too. setTimeout(0) lands after
      // cancel, so the dialog stays put.
      setTimeout(() => {
        const prev = Number.parseInt(document.body.dataset.dropdownMenuOpen ?? '1', 10) - 1
        if (prev <= 0) delete document.body.dataset.dropdownMenuOpen
        else document.body.dataset.dropdownMenuOpen = String(prev)
      }, 0)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Live DOM query - items source of truth is `[role=menuitem]` under
  // contentRef, not a registered collection. Survives parent re-renders,
  // Fragments, nested wrappers, and conditional remounts for free.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    )
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
    } else if (e.key === 'Tab') {
      e.preventDefault()
      close()
    }
  }

  // Pre-measure: render at (0,0) on first commit so useLayoutEffect can measure
  // the content size. useLayoutEffect runs synchronously before paint, so the
  // (0,0) frame is never visible - by the time the browser paints, coords is set.
  const style: React.CSSProperties = coords
    ? { position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px` }
    : { position: 'fixed', top: 0, left: 0 }

  const content = (
    <div
      ref={contentRef}
      id={menuId}
      role="menu"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-orientation="vertical"
      className={`dropdown-menu__content${className ? ` ${className}` : ''}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )

  // Native <dialog open> via showModal() places the dialog in the browser's
  // top layer; anything portaled to document.body renders BELOW that layer
  // regardless of z-index. Target resolved in the open-effect above.
  return createPortal(content, portalTarget)
}

interface DropdownMenuItemProps {
  /** Must be a natively focusable element (button, a, input) so Space/Enter activate it. */
  children: ReactElement<{
    ref?: React.Ref<HTMLElement>
    onClick?: (e: React.MouseEvent) => void
    role?: string
    className?: string
  }>
  variant?: 'default' | 'danger'
  closeOnSelect?: boolean
  onSelect?: () => void
}

function DropdownMenuItem({
  children,
  variant = 'default',
  closeOnSelect = true,
  onSelect,
}: DropdownMenuItemProps) {
  const { close } = useDropdownMenu()

  if (!isValidElement(children)) {
    throw new Error('DropdownMenu.Item expects a single React element child')
  }

  const childClassName = children.props.className ?? ''
  const itemClass = `dropdown-menu__item${variant === 'danger' ? ' dropdown-menu__item--danger' : ''}${childClassName ? ` ${childClassName}` : ''}`

  // biome-ignore lint/suspicious/noExplicitAny: cloneElement ref typing across element kinds
  return cloneElement(children as ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      // Forward to the child's existing ref only - kb nav reads items from the
      // DOM live (querySelectorAll under contentRef), no central registration.
      const childRef = (children as unknown as { ref?: React.Ref<HTMLElement> }).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && 'current' in childRef)
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node
    },
    role: 'menuitem',
    // Roving tabIndex: focus is moved imperatively via arrow keys, so items
    // stay out of the natural tab sequence (WAI-ARIA APG Menu pattern).
    tabIndex: -1,
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
