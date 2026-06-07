import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '../Button/Button'
import './BackToTopButton.css'

const SCROLL_THRESHOLD = 600

function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

export function BackToTopButton() {
  const [visible, setVisible] = useState(() => window.scrollY > SCROLL_THRESHOLD)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      className={`back-to-top${visible ? ' back-to-top--visible' : ''}`}
      aria-label="Revenir en haut de la page"
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </Button>
  )
}
