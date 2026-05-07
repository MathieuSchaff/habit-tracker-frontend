import { useEffect, useRef, useState } from 'react'

export type DraggableBounds = { minY: number; maxY: number }

const clamp = (v: number, { minY, maxY }: DraggableBounds) => Math.max(minY, Math.min(maxY, v))

type Options = {
  storageKey: string
  // Caller-provided so bounds can react to viewport, layout obstacles (nav bars),
  // or other DOM-derived values. Re-invoked on mount + window resize.
  computeBounds: () => DraggableBounds
  dragThreshold?: number
  enabled?: boolean
}

// Vertical-only drag with persistence. Returns spreadable pointer handlers, a
// click guard so a tap-after-drag doesn't fire onClick, and the current Y offset.
export function useDraggableY({
  storageKey,
  computeBounds,
  dragThreshold = 6,
  enabled = true,
}: Options) {
  // Latest computeBounds without forcing the caller to memoise it.
  const computeBoundsRef = useRef(computeBounds)
  computeBoundsRef.current = computeBounds

  const boundsRef = useRef<DraggableBounds>(computeBounds())
  const [y, setY] = useState(() => {
    if (typeof window === 'undefined') return 0
    const raw = window.localStorage.getItem(storageKey)
    const parsed = raw === null ? 0 : Number(raw)
    return Number.isFinite(parsed) ? clamp(parsed, boundsRef.current) : 0
  })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startClientY: number; startY: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const onResize = () => {
      boundsRef.current = computeBoundsRef.current()
      setY((cur) => clamp(cur, boundsRef.current))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0) return
      dragRef.current = { startClientY: e.clientY, startY: y, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current
      if (!drag) return
      const dy = e.clientY - drag.startClientY
      if (!drag.moved && Math.abs(dy) >= dragThreshold) {
        drag.moved = true
        setDragging(true)
      }
      if (drag.moved) setY(clamp(drag.startY + dy, boundsRef.current))
    },
    onPointerUp: () => {
      const drag = dragRef.current
      if (!drag) return
      if (drag.moved) {
        window.localStorage.setItem(storageKey, String(y))
        suppressClickRef.current = true
        setDragging(false)
      }
      dragRef.current = null
    },
    onPointerCancel: () => {
      dragRef.current = null
      setDragging(false)
    },
  }

  const withClickGuard = <Args extends unknown[]>(handler: (...args: Args) => void) => {
    return (...args: Args) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      handler(...args)
    }
  }

  return { y, dragging, dragHandlers, withClickGuard }
}
