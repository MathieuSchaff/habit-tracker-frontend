import { ChevronDown } from 'lucide-react'

import { HeroBase } from '../../components/Hero/HeroBase'
import { AppEntriesSection } from '../../components/sections/AppEntriesSection'
import { FinalCTASection } from '../../components/sections/FinalCTASection'
import { FlowSection } from '../../components/sections/FlowSection'
import { PhilosophySection } from '../../components/sections/PhilosophySection'
import { PillarsSection } from '../../components/sections/PillarsSection'
import { ProblemSection } from '../../components/sections/ProblemSection'

// Anonymous landing: the conversion narrative. Signed-in visitors get HomeHub
// instead (same route, content adapts by auth — ADR 0011).
//
// The visible spine (hero → problem → app → CTA) stays short on purpose; the
// deeper manifesto (pillars, flow, philosophy) collapses behind a native
// <details> so a first-time visitor isn't met with an 8-screen wall. Content
// stays in the DOM (crawlable, keyboard-accessible) — just not forced.
export function HomeMarketing() {
  return (
    <>
      <HeroBase />
      <ProblemSection />
      <AppEntriesSection />
      <details className="aur-marketing-more">
        <summary className="aur-marketing-more__toggle">
          <span>Voir la démarche complète</span>
          <ChevronDown size={18} aria-hidden="true" className="aur-marketing-more__chevron" />
        </summary>
        <PillarsSection />
        <FlowSection />
        <PhilosophySection />
      </details>
      <FinalCTASection />
    </>
  )
}
