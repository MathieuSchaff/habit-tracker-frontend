import { useAuthStore } from '../../../../store/auth'
import './DemoBanner.css'

export function DemoBanner() {
  const isDemo = useAuthStore((s) => s.isDemo)
  if (!isDemo) return null
  return (
    <output className="demo-banner">
      ⚡ Mode démo — les données seront perdues à la déconnexion
    </output>
  )
}
