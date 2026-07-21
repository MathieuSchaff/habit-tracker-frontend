import { useRouterState } from '@tanstack/react-router'

import { isServer } from '../../../../lib/helpers/isServer'
import './NavigationProgress.css'

export const NavigationProgress = () => {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })

  // The router is still 'pending' while SSR renders, but 'idle' when the client
  // hydrates; rendering the bar on the server would mismatch. Navigation
  // feedback only makes sense on the client anyway.
  if (isServer) return null
  if (!isLoading) return null

  return (
    <div className="navigation-progress" role="progressbar" aria-label="Chargement de la page">
      <div className="navigation-progress__bar" />
    </div>
  )
}
