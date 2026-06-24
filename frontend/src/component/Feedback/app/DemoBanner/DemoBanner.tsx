import { Link } from '@tanstack/react-router'

import { useAuthStore } from '../../../../store/auth'
import './DemoBanner.css'

export function DemoBanner() {
  const isDemo = useAuthStore((s) => s.isDemo)
  if (!isDemo) return null
  return (
    <div className="demo-banner" role="status">
      <span>Mode démo — les données seront perdues à la déconnexion.</span>{' '}
      <Link to="/auth/signup" className="demo-banner__cta">
        Créer un compte pour les garder
      </Link>
    </div>
  )
}
