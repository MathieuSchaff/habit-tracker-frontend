import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useDemo } from '../../../../lib/queries/auth'
import { Entries } from '../../components/marketing/Entries'
import { FounderNote } from '../../components/marketing/FounderNote'
import { Opening } from '../../components/marketing/Opening'
import { ProductJournal } from '../../components/marketing/ProductJournal'
import { Refusals } from '../../components/marketing/Refusals'

// Anonymous landing (ADR 0011: same "/", auth only swaps content).
// Shaped as a letter, not a funnel; the one-click demo is the only ask.
export function HomeMarketing() {
  const demo = useDemo()
  const navigate = useNavigate()
  // Keep spinning through the demo POST and protected-route navigation below.
  const [redirecting, setRedirecting] = useState(false)

  // Stay in the SPA so the access token returned by /auth/demo is still present
  // for the first protected-route check.
  const startDemo = () =>
    demo.mutate(undefined, {
      onSuccess: () => {
        setRedirecting(true)
        navigate({ to: '/collection' })
      },
    })

  const demoPending = demo.isPending || redirecting

  return (
    <>
      <Opening onStartDemo={startDemo} demoPending={demoPending} />
      <ProductJournal />
      <Refusals />
      <Entries />
      <FounderNote onStartDemo={startDemo} demoPending={demoPending} />
    </>
  )
}
