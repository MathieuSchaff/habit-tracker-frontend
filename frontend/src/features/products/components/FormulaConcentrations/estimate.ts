export interface ConcentrationInput {
  meanPct: number
  ciLowPct: number
  ciHighPct: number
  solverMeanPct?: number
  solverCiLowPct?: number
  solverCiHighPct?: number
  claimPct?: number
}

export type ConcentrationRead =
  | { kind: 'declared'; value: number }
  | { kind: 'band'; lo: number; hi: number; mean: number }
  | { kind: 'unestimable' }

// Wider bands look more certain than they are, so keep them qualitative.
const CONC_BAND_MAX_REL_WIDTH = 1.5

const wholePctFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const decimalPctFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const READ_RANK: Record<ConcentrationRead['kind'], number> = {
  declared: 0,
  band: 1,
  unestimable: 2,
}

function relativeBandWidth(read: Extract<ConcentrationRead, { kind: 'band' }>): number {
  return (read.hi - read.lo) / read.mean
}

export function compareConcentrationReads(a: ConcentrationRead, b: ConcentrationRead): number {
  const rankDiff = READ_RANK[a.kind] - READ_RANK[b.kind]
  if (rankDiff !== 0 || a.kind !== 'band' || b.kind !== 'band') return rankDiff
  return relativeBandWidth(a) - relativeBandWidth(b)
}

export function readConcentration(e: ConcentrationInput): ConcentrationRead {
  if (e.claimPct != null && e.claimPct > 0) return { kind: 'declared', value: e.claimPct }

  // The raw prior alone is not strong enough to show a number.
  if (e.solverCiLowPct == null || e.solverCiHighPct == null || e.solverMeanPct == null) {
    return { kind: 'unestimable' }
  }

  const lo = e.solverCiLowPct
  const hi = e.solverCiHighPct
  const mean = e.solverMeanPct
  if (!(lo > 0) || !(hi > lo) || !(mean > 0)) return { kind: 'unestimable' }
  if ((hi - lo) / mean > CONC_BAND_MAX_REL_WIDTH) return { kind: 'unestimable' }
  if (roundPct(lo) === roundPct(hi)) return { kind: 'unestimable' }
  return { kind: 'band', lo, hi, mean }
}

function roundPct(n: number): number {
  return n >= 1 ? Math.round(n) : Math.round(n * 10) / 10
}

function fmtPct(n: number): string {
  const rounded = roundPct(n)
  return (n >= 1 ? wholePctFormatter : decimalPctFormatter).format(rounded)
}

export function formatConcentrationRead(r: ConcentrationRead): string | null {
  if (r.kind === 'declared') return `${fmtPct(r.value)} % (déclaré)`
  if (r.kind === 'band') {
    const lo = fmtPct(r.lo)
    const hi = fmtPct(r.hi)
    return lo === hi ? null : `~${lo}–${hi} %`
  }
  return null
}
