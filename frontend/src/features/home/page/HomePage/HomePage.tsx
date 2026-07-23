import { useBootPending } from '@/lib/hooks/useBootPending'
import { useAuthStore } from '@/store/auth'
import { Footer } from '../../components/Footer/Footer'
import { HomeHub } from './HomeHub'
import { HomeMarketing } from './HomeMarketing'
import { HomeSkeleton } from './HomeSkeleton'

import './HomePage.css'

// Dual-audience route (ADR 0011): same "/" for everyone, no redirect/guard.
// Auth changes what the page shows, never whether it is reachable.
export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const bootRefreshPending = useBootPending()

  return (
    <div className="aur-page">
      <main>{bootRefreshPending ? <HomeSkeleton /> : user ? <HomeHub /> : <HomeMarketing />}</main>
      <Footer />
    </div>
  )
}
