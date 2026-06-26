import { SKIN_CONCERNS, type SkinConcern } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { SKIN_CONCERN_LABELS } from '@/constants/skin'
import { socialQueries } from '@/lib/queries/social'
import { SimilarPeopleList } from './SimilarPeopleList'
import './SimilarPeople.css'

const CONCERN_OPTIONS = SKIN_CONCERNS.map((value) => ({
  value,
  label: SKIN_CONCERN_LABELS[value],
}))

function ConcernFilter({
  selected,
  onSelect,
}: {
  selected: SkinConcern | null
  onSelect: (concern: SkinConcern | null) => void
}) {
  return (
    <div className="similar-people__filter">
      <ChipGroup
        options={CONCERN_OPTIONS}
        selected={selected ? [selected] : []}
        onChange={(values) => onSelect(values[0] ?? null)}
        mode="exclusive"
        size="sm"
        maxVisible={8}
        aria-label="Chercher des gens par problématique de peau"
      />
      {selected && (
        <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Effacer
        </Button>
      )}
    </div>
  )
}

// Passive lens by default (people like me); picking a concern switches to the
// active search (people like me who share that concern's bucket).
export function SimilarPeople() {
  const [concern, setConcern] = useState<SkinConcern | null>(null)
  const { data, isError, refetch } = useQuery(
    concern ? socialQueries.searchByConcern(concern) : socialQueries.similar()
  )

  return (
    <div className="similar-people-panel">
      <ConcernFilter selected={concern} onSelect={setConcern} />
      {isError ? (
        <EmptyState
          icon={<Users size={24} />}
          title="La recherche n'a pas pu se charger"
          subtitle="Vos données sont intactes — réessayez dans un instant."
        >
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </EmptyState>
      ) : data ? (
        <SimilarPeopleList profiles={data.profiles} />
      ) : (
        <Spinner />
      )}
    </div>
  )
}
