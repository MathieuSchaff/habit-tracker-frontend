// Pass wrapper around `detectActifClasses`. ADR-0001.
// Cross-signal and avoid passes read output via `priorSlugsBySource(prior, 'actif-class')`.

import { normalize, type RoleAtDose } from 'algo-derm'

import type { AutoTagProposal, Pass, PassContext } from '../lib/pass-types'
import {
  type ConcentrationLookup,
  detectActifClassesWithEvidence,
  type RoleAtDoseLookup,
} from './actif-class-detection'

// Maps a matched acid pattern (canonical lowercase fragment) to algo-derm's solver
// concentration estimate, reusing the assessment built once per product. Lets the
// detector second-guess cap-marginal AHA hits on dose, not just INCI position (obs 1).
function buildConcentrationLookup(
  assessment: PassContext['assessment']
): ConcentrationLookup | undefined {
  if (!assessment) return undefined
  const byName = new Map<string, number>()
  for (const m of assessment.matchedEvidence) {
    const pct = m.concentrationEstimate?.solverMeanPct
    if (pct === undefined) continue
    for (const key of [m.inci, m.ingredient, m.evidence.inci, ...(m.evidence.aliases ?? [])]) {
      const n = normalize(key)
      // First write wins: canonical names registered before alias collisions.
      if (n && !byName.has(n)) byName.set(n, pct)
    }
  }
  return (pattern) => byName.get(normalize(pattern))
}

// Maps a matched acid pattern to algo-derm's dose-conditioned exfoliant-vs-pH-adjuster
// signal (roleAtDose), keyed identically to buildConcentrationLookup. Present only on
// ingredients with an authored role curve (today: the AHA exfoliants); absent ⇒ the
// detector falls back to position + name. ADR-0014.
function buildRoleAtDoseLookup(
  assessment: PassContext['assessment']
): RoleAtDoseLookup | undefined {
  if (!assessment) return undefined
  const byName = new Map<string, RoleAtDose>()
  for (const m of assessment.matchedEvidence) {
    if (!m.roleAtDose) continue
    for (const key of [m.inci, m.ingredient, m.evidence.inci, ...(m.evidence.aliases ?? [])]) {
      const n = normalize(key)
      if (n && !byName.has(n)) byName.set(n, m.roleAtDose)
    }
  }
  return (pattern) => byName.get(normalize(pattern))
}

export const actifClassPass: Pass = {
  name: 'actif-class',
  run: (ctx) => {
    const out: AutoTagProposal[] = []
    const concentrationLookup = buildConcentrationLookup(ctx.assessment)
    const roleAtDoseLookup = buildRoleAtDoseLookup(ctx.assessment)
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
