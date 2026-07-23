// Verdict for a cap-marginal AHA hit: a pH-active acid (lactic/glycolic et al.)
// admitted only by the looser rinse-off cap. Below ~1% these are pH adjusters,
// above they are exfoliant actifs; the narrow solver `%`/roleAtDose tiebreaker
// scoped to this ambiguous band decides. Consulted only for defs that declare
// `rinseOffNameGate`; every other cluster is a pure pattern-table lookup. ADR-0014.

import type { RoleAtDose } from 'algo-derm'

// Names that legitimately position a deep rinse-off acid as an exfoliant actif
// (rescues the cap-marginal gate). Matches exfoliant/exfoliation, (super)foliant,
// peel/peeling, gommage, resurfacing.
const EXFOLIATION_NAME_RE = /exfolia|foliant|peel|gommage|resurfa/

// The name-gate keyword list (exfolia|peel|...) misses acid-named products (e.g. "Chestnut
// AHA Essence"), wrongly dropping real exfoliant actives sitting deep in rinse-off INCI.
// The solver % rescues them: a cap-marginal AHA the name doesn't vouch for is kept when the
// solver puts it at a confidently functional dose. Threshold 2% (not 1%) so solver noise
// (MAE 4pts) near the pH-adjuster boundary can't rescue a true pH adjuster: only the
// unambiguous actives, not 1% cleansers.
const AHA_RESCUE_PCT_MIN = 2

// roleAtDose (algo-derm v21+): a dose-conditioned exfoliant-vs-pH-adjuster signal on
// each matched AHA. When confident it is authoritative over the name-gate: a sub-c50
// dose is a pH adjuster even under an exfoliant-positioned name (e.g. a 40% urea peel
// whose lactic acid sits sub-1%), and an active dose is kept even when the name keyword
// list misses it. Near the curve knee confidence collapses, so fall back to the
// name-gate + %-rescue. c50 is the curve midpoint; the confidence floor is gold-set
// calibrated.
const AHA_ROLE_DOSE_C50 = 0.5
const AHA_ROLE_CONFIDENCE_MIN = 0.5

// Resolves the algo-derm solver-estimated concentration (% w/w) for a matched acid
// pattern, or undefined when the solver has no estimate. Built once per product from
// the shared assessment (see actif-class-pass). Only consulted for cap-marginal AHA.
export type ConcentrationLookup = (matchedPattern: string) => number | undefined

// Resolves the algo-derm roleAtDose signal for a matched acid pattern, built once per
// product from the shared assessment. Only consulted for cap-marginal AHA hits.
export type RoleAtDoseLookup = (matchedPattern: string) => RoleAtDose | undefined

export type AhaCapMarginalVerdict = 'keep' | 'drop'

// Cascade, most-authoritative first: (1) a confident roleAtDose decides alone,
// sub-c50 drops, active dose keeps; (2) an exfoliant-positioning name keeps;
// (3) %-rescue keeps a neutral name only at a confidently functional dose.
// `gateName` is the already-trimmed/lowercased product name; empty means the caller
// cannot vouch for the product, so legacy keep. No lookups: identical to the bare name-gate.
export function resolveAhaCapMarginalVerdict(
  matchedPattern: string,
  gateName: string | undefined,
  concentrationLookup?: ConcentrationLookup,
  roleAtDoseLookup?: RoleAtDoseLookup
): AhaCapMarginalVerdict {
  const role = roleAtDoseLookup?.(matchedPattern)
  if (role && role.confidence >= AHA_ROLE_CONFIDENCE_MIN) {
    return role.doseFactor < AHA_ROLE_DOSE_C50 ? 'drop' : 'keep'
  }
  if (gateName && EXFOLIATION_NAME_RE.test(gateName)) return 'keep'
  const pct = concentrationLookup?.(matchedPattern)
  const rescued = pct !== undefined && pct >= AHA_RESCUE_PCT_MIN
  if (!rescued && gateName) return 'drop'
  return 'keep'
}
