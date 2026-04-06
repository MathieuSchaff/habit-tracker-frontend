import { useRouterState } from '@tanstack/react-router'

import './NavigationProgress.css'

export const NavigationProgress = () => {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })

  if (!isLoading) return null

  return (
    <div className="navigation-progress" role="progressbar" aria-label="Chargement de la page">
      <div className="navigation-progress__bar" />
    </div>
  )
}
