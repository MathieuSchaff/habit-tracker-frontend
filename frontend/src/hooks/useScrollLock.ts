/**
 * useScrollLock — Verrouille le scroll de la page quand un overlay est ouvert.
 *
 * Technique : position:fixed sur le body avec un offset top négatif
 * pour éviter le saut de scroll (nécessaire sur iOS où overflow:hidden ne suffit pas).
 * La position de scroll est sauvegardée dans body.dataset.scrollY et restaurée au unlock.
 */

import { useEffect } from 'react'

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollY = window.scrollY
    const body = document.body

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
