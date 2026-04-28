import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '../Button/Button'
import './BackToTopButton.css'

const SCROLL_THRESHOLD = 600

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleClick = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      className={`back-to-top${visible ? ' back-to-top--visible' : ''}`}
      aria-label="Revenir en haut de la page"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={handleClick}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </Button>
  )
}
