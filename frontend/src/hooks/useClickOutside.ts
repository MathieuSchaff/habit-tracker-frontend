/**
 * useClickOutside — Détecte les clics en dehors d'un élément ET la touche Escape.
 *
 * Utilisé par les dialogs et menus pour se fermer proprement.
 * Le callback est stocké dans une ref pour éviter de réattacher
 * les listeners à chaque re-render du parent.
 */

import { type RefObject, useEffect, useRef } from 'react'

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  handleOnClickOutside: (event: MouseEvent | TouchEvent | KeyboardEvent) => void
) => {
  const callbackRef = useRef(handleOnClickOutside)
  callbackRef.current = handleOnClickOutside

  useEffect(() => {
    // Clic souris ou touch en dehors de l'élément
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      callbackRef.current(event)
    }

    // Touche Escape → fermeture
    const keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callbackRef.current(event)
      }
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    document.addEventListener('keydown', keyListener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
      document.removeEventListener('keydown', keyListener)
    }
  }, [ref])
}
