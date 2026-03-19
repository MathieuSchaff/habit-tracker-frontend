import { useEffect } from 'react'

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollY = window.scrollY
    const body = document.body

    // HACK: On iOS, simple overflow:hidden doesn't always work.
    // Using position:fixed with top offset to prevent the background from jumping.
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'
    body.dataset.scrollY = String(scrollY)

    return () => {
      const savedScrollY = body.dataset.scrollY
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.overflow = ''

      if (savedScrollY) {
        window.scrollTo(0, parseInt(savedScrollY, 10))
        delete body.dataset.scrollY
      }
    }
  }, [locked])
}
