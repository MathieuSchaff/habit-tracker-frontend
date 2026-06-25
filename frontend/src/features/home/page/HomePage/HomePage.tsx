import { Footer } from '../../components/Footer/Footer'
import { HeroBase } from '../../components/Hero/HeroBase'
import { AppEntriesSection } from '../../components/sections/AppEntriesSection'
import { FinalCTASection } from '../../components/sections/FinalCTASection'
import { FlowSection } from '../../components/sections/FlowSection'
import { PhilosophySection } from '../../components/sections/PhilosophySection'
import { PillarsSection } from '../../components/sections/PillarsSection'
import { ProblemSection } from '../../components/sections/ProblemSection'

import './HomePage.css'

export function HomePage() {
  return (
    <div className="aur-page">
      <main>
        <HeroBase />
        <ProblemSection />
        <PillarsSection />
        <AppEntriesSection />
        <FlowSection />
        <PhilosophySection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  )
}
