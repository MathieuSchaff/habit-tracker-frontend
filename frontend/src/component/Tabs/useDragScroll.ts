import { type RefObject, useCallback, useRef } from 'react'

interface UseDragScrollOptions {
  enabled?: boolean
  threshold?: number
}

interface DragState {
  active: boolean
  startX: number
  startScroll: number
  moved: boolean
}

export function useDragScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { enabled = true, threshold = 5 }: UseDragScrollOptions = {}
) {
  const state = useRef<DragState>({ active: false, startX: 0, startScroll: 0, moved: false })

  const onPointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!enabled || !ref.current) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      state.current = {
        active: true,
        startX: e.clientX,
        startScroll: ref.current.scrollLeft,
        moved: false,
      }
      // Capture lazily on first drag past threshold so taps stay on the button
      // and let onClick fire normally. Capturing here would steal the click.
    },
    [enabled, ref]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!state.current.active || !ref.current) return
      const dx = e.clientX - state.current.startX
      if (!state.current.moved) {
        if (Math.abs(dx) < threshold) return
        state.current.moved = true
        ref.current.setPointerCapture(e.pointerId)
      }
      ref.current.scrollLeft = state.current.startScroll - dx
    },
    [ref, threshold]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<T>) => {
      if (ref.current?.hasPointerCapture(e.pointerId)) {
        ref.current.releasePointerCapture(e.pointerId)
      }
      state.current.active = false
    },
    [ref]
  )

  // Suppress synthetic click that follows a drag, so tab change doesn't fire.
  const onClickCapture = useCallback((e: React.MouseEvent<T>) => {
    if (state.current.moved) {
      e.stopPropagation()
      e.preventDefault()
      state.current.moved = false
    }
  }, [])

  if (!enabled) return {}

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
  }
}
