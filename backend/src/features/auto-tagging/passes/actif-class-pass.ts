// Pass wrapper around `detectActifClasses`. ADR-0001.
// Cross-signal and avoid passes read output via `priorSlugsBySource(prior, 'actif-class')`.

import { normalize } from 'algo-derm'

import type { AutoTagProposal, Pass, PassContext } from '../lib/pass-types'
import {
  type ConcentrationLookup,
  detectActifClassesWithEvidence,
  type RoleAtDoseLookup,
} from './actif-class-detection'

type MatchedEvidence = NonNullable<PassContext['assessment']>['matchedEvidence'][number]

// Maps a matched acid pattern (canonical lowercase fragment) to a per-ingredient
// value picked off algo-derm's assessment, reusing the assessment built once per
// product. Keys fan out over every name algo-derm knows for the ingredient;
// first write wins (canonical names registered before alias collisions).
function buildAssessmentLookup<V>(
  assessment: PassContext['assessment'],
  pick: (m: MatchedEvidence) => V | undefined
): ((pattern: string) => V | undefined) | undefined {
  if (!assessment) return undefined
  const byName = new Map<string, V>()
  for (const m of assessment.matchedEvidence) {
    const value = pick(m)
    if (value === undefined) continue
    for (const key of [m.inci, m.ingredient, m.evidence.inci, ...(m.evidence.aliases ?? [])]) {
      const n = normalize(key)
      if (n && !byName.has(n)) byName.set(n, value)
    }
  }
  return (pattern) => byName.get(normalize(pattern))
}

export const actifClassPass: Pass = {
  name: 'actif-class',
  run: (ctx) => {
    const out: AutoTagProposal[] = []
    // Solver % lets the detector second-guess cap-marginal AHA hits on dose,
    // not just INCI position (obs 1).
    const concentrationLookup: ConcentrationLookup | undefined = buildAssessmentLookup(
      ctx.assessment,
      (m) => m.concentrationEstimate?.solverMeanPct
    )
    // Dose-conditioned exfoliant-vs-pH-adjuster signal; present only on
    // ingredients with an authored role curve (today: the AHA exfoliants). ADR-0014.
    const roleAtDoseLookup: RoleAtDoseLookup | undefined = buildAssessmentLookup(
      ctx.assessment,
      (m) => m.roleAtDose
    )
    for (const [tagSlug, evidence] of detectActifClassesWithEvidence(
      ctx.inci,
      ctx.normalizedIngredients,
      ctx.kind,
      ctx.name,
      concentrationLookup,
      roleAtDoseLookup
    )) {
      out.push({ tagSlug, relevance: 'secondary', source: 'actif-class', evidence })
    }
    return out
  },
}
