import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { reportError } from '../../../../lib/errorReporter'
import { Button } from '../../../Button/Button'
import './GlobalError.css'

interface GlobalErrorProps {
  error: Error
  reset?: () => void
  is404?: boolean
}

const DropperIllustration = () => (
  <svg
    width="110"
    height="230"
    viewBox="0 0 110 230"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Spill blob */}
    <ellipse cx="55" cy="215" rx="42" ry="11" fill="var(--color-primary-light)" opacity="0.7" />
    <ellipse cx="55" cy="213" rx="28" ry="7" fill="var(--color-primary-light)" opacity="0.5" />

    {/* Animated drops — fall from tip (y=170) toward the spill */}
    <circle className="dropper-drop" cx="55" cy="171" r="4" fill="var(--color-primary)" />
    <circle
      className="dropper-drop dropper-drop-2"
      cx="55"
      cy="171"
      r="3"
      fill="var(--color-primary)"
    />
    <circle
      className="dropper-drop dropper-drop-3"
      cx="55"
      cy="171"
      r="3.5"
      fill="var(--color-primary)"
    />

    {/* Tip — narrow point */}
    <path d="M 49 158 L 55 172 L 61 158 Z" fill="var(--color-primary)" />

    {/* Bottle body — glass rectangle */}
    <rect
      x="38"
      y="68"
      width="34"
      height="92"
      rx="5"
      fill="var(--bg-card)"
      stroke="var(--border-default)"
      strokeWidth="2"
    />

    {/* Liquid fill inside bottle (~40% height from bottom) */}
    <rect
      x="40"
      y="120"
      width="30"
      height="38"
      rx="3"
      fill="var(--color-primary-light)"
      opacity="0.8"
    />

    {/* Highlight on glass */}
    <rect x="43" y="74" width="6" height="30" rx="3" fill="var(--bg-card)" opacity="0.6" />

    {/* Neck */}
    <rect
      x="47"
      y="54"
      width="16"
      height="16"
      rx="2"
      fill="var(--bg-card)"
      stroke="var(--border-default)"
      strokeWidth="2"
    />

    {/* Rubber bulb */}
    <ellipse cx="55" cy="40" rx="20" ry="15" fill="var(--color-accent)" />
    {/* Bulb highlight */}
    <ellipse cx="48" cy="34" rx="5" ry="4" fill="var(--color-accent-light)" opacity="0.5" />
  </svg>
)

export const GlobalError = ({ error, reset, is404 = false }: GlobalErrorProps) => {
  const navigate = useNavigate()

  // biome-ignore lint/correctness/useExhaustiveDependencies: report once on mount only
  useEffect(() => {
    reportError(error, { component: 'GlobalError' })
  }, [])

  const title = is404 ? "Cette page n'est pas dans notre routine." : 'On a renversé quelque chose.'

  const subtitle = is404
    ? "Elle a peut-être changé d'adresse, ou n'a jamais existé."
    : "Pas d'inquiétude — tes données sont en sécurité. On nettoie ça."

  return (
    <div className="global-error-page">
      <div className="global-error-illustration">
        <DropperIllustration />
      </div>

      <h1 className="global-error-title">{title}</h1>
      <p className="global-error-subtitle">{subtitle}</p>

      <div className="global-error-actions">
        {reset && <Button onClick={() => reset()}>Réessayer</Button>}
        <Button variant="outline" onClick={() => navigate({ to: '/' })}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  )
}
