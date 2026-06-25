import { HeroBase } from '../../components/Hero/HeroBase'
import { AppEntriesSection } from '../../components/sections/AppEntriesSection'
import { FinalCTASection } from '../../components/sections/FinalCTASection'
import { FlowSection } from '../../components/sections/FlowSection'
import { PhilosophySection } from '../../components/sections/PhilosophySection'
import { PillarsSection } from '../../components/sections/PillarsSection'
import { ProblemSection } from '../../components/sections/ProblemSection'

// Anonymous landing: the conversion narrative. Signed-in visitors get HomeHub
// instead (same route, content adapts by auth — ADR 0011).
export function HomeMarketing() {
  return (
    <>
      <HeroBase />
      <ProblemSection />
      <PillarsSection />
      <AppEntriesSection />
      <FlowSection />
      <PhilosophySection />
      <FinalCTASection />
    </>
  )
}
