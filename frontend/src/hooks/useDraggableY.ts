import { useEffect, useEffectEvent, useRef, useState } from 'react'

type DraggableBounds = { minY: number; maxY: number }

const clamp = (v: number, { minY, maxY }: DraggableBounds) => Math.max(minY, Math.min(maxY, v))

type Options = {
  storageKey: string
  // Re-invoked on mount and window resize so bounds can react to viewport
  // and DOM-derived obstacles (e.g. nav bars).
  computeBounds: () => DraggableBounds
  dragThreshold?: number
  enabled?: boolean
}

export function useDraggableY({
  storageKey,
  computeBounds,
  dragThreshold = 6,
  enabled = true,
}: Options) {
  // Latest computeBounds without forcing the caller to memoise it.
  const recomputeBounds = useEffectEvent(computeBounds)

  const boundsRef = useRef<DraggableBounds | null>(null)
  if (boundsRef.current === null) boundsRef.current = computeBounds()
  const [y, setY] = useState(() => {
    if (typeof window === 'undefined') return 0
    const raw = window.localStorage.getItem(storageKey)
    const parsed = raw === null ? 0 : Number(raw)
    const bounds = boundsRef.current
    return bounds && Number.isFinite(parsed) ? clamp(parsed, bounds) : 0
  })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startClientY: number; startY: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const onResize = () => {
      const next = recomputeBounds()
      boundsRef.current = next
      setY((cur) => clamp(cur, next))
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
      const bounds = boundsRef.current
      if (!drag || !bounds) return
      const dy = e.clientY - drag.startClientY
      if (!drag.moved && Math.abs(dy) >= dragThreshold) {
        drag.moved = true
        setDragging(true)
      }
      if (drag.moved) setY(clamp(drag.startY + dy, bounds))
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
