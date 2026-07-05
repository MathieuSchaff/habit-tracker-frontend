// Pure metric primitives for the gold-set benchmark.
// Separated from the runner to allow DB-free unit tests.
//
// Conventions:
//   p ∈ [0, 1]   predicted probability
//   y ∈ {0, 1}   gold label (1 = present, 0 = absent)
//
// Deterministic detectors (passes 2-6) collapse p to {0,1}: Brier reduces to
// misclassification rate and ECE collapses to a single bin by design.

export interface Sample {
  p: number
  y: 0 | 1
}

export interface ConfusionCounts {
  tp: number
  fp: number
  fn: number
  tn: number
}

export interface PerTagMetrics {
  tagSlug: string
  // Counts on rated products only (annotated present OR absent).
  tp: number
  fp: number
  fn: number
  tn: number
  // tp+fp+fn+tn. 0 means nothing to measure.
  rated: number
  // NaN when denominator is 0.
  precision: number
  recall: number
  f1: number
  brier: number
  ece: number
}

export interface BinStat {
  // Half-open [k/nBins, (k+1)/nBins); last bin closed on the right.
  bin: number
  count: number
  avgConfidence: number
  accuracy: number
}

// Brier score: MSE of probabilistic predictions. Range [0,1], lower is better.
export function computeBrier(samples: readonly Sample[]): number {
  if (samples.length === 0) return Number.NaN
  let sum = 0
  for (const s of samples) {
    const d = s.p - s.y
    sum += d * d
  }
  return sum / samples.length
}

// Expected Calibration Error (Guo et al., 2017): weighted mean of
// |avg_confidence - accuracy| per bin. Range [0,1], lower is better.
// Empty bins are excluded from the weighted average.
export function computeECE(samples: readonly Sample[], nBins = 10): number {
  if (samples.length === 0) return Number.NaN
  const stats = bucketByConfidence(samples, nBins)
  let total = 0
  for (const s of stats) {
    if (s.count === 0) continue
    total += (s.count / samples.length) * Math.abs(s.avgConfidence - s.accuracy)
  }
  return total
}

// Empty bins included as zeros so callers can render a stable reliability-diagram axis.
export function bucketByConfidence(samples: readonly Sample[], nBins = 10): BinStat[] {
  if (nBins < 1) throw new Error('nBins must be >= 1')
  const binAccumulators = Array.from({ length: nBins }, () => ({
    count: 0,
    confSum: 0,
    labelSum: 0,
  }))
  for (const s of samples) {
    const bin = binIndex(s.p, nBins)
    const b = binAccumulators[bin]
    b.count++
    b.confSum += s.p
    b.labelSum += s.y
  }
  return binAccumulators.map((b, i) => ({
    bin: i,
    count: b.count,
    avgConfidence: b.count === 0 ? Number.NaN : b.confSum / b.count,
    accuracy: b.count === 0 ? Number.NaN : b.labelSum / b.count,
  }))
}

function binIndex(p: number, nBins: number): number {
  if (p <= 0) return 0
  if (p >= 1) return nBins - 1
  // p>=1 short-circuits above, so confidence==1 lands in bin N-1, not a phantom bin N.
  return Math.min(nBins - 1, Math.floor(p * nBins))
}

export function computeConfusion(
  rows: readonly { predicted: boolean; label: 0 | 1 }[]
): ConfusionCounts {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const r of rows) {
    if (r.predicted && r.label === 1) tp++
    else if (r.predicted && r.label === 0) fp++
    else if (!r.predicted && r.label === 1) fn++
    else tn++
  }
  return { tp, fp, fn, tn }
}

// Only pass rated-product rows: unrated products must be excluded before calling.
export function computePerTagMetrics(
  tagSlug: string,
  rows: readonly { p: number; y: 0 | 1; predicted: boolean }[]
): PerTagMetrics {
  const conf = computeConfusion(rows.map((r) => ({ predicted: r.predicted, label: r.y })))
  const samples: Sample[] = rows.map((r) => ({ p: r.p, y: r.y }))
  const rated = rows.length
  const precDen = conf.tp + conf.fp
  const recDen = conf.tp + conf.fn
  const precision = precDen === 0 ? Number.NaN : conf.tp / precDen
  const recall = recDen === 0 ? Number.NaN : conf.tp / recDen
  const f1 =
    Number.isNaN(precision) || Number.isNaN(recall) || precision + recall === 0
      ? Number.NaN
      : (2 * precision * recall) / (precision + recall)
  return {
    tagSlug,
    tp: conf.tp,
    fp: conf.fp,
    fn: conf.fn,
    tn: conf.tn,
    rated,
    precision,
    recall,
    f1,
    brier: computeBrier(samples),
    ece: computeECE(samples),
  }
}

// Unweighted mean across tags. NaN metrics (e.g., precision when no positives) are skipped.
export function macroAverage(metrics: readonly PerTagMetrics[]): {
  precision: number
  recall: number
  f1: number
  brier: number
  ece: number
} {
  return {
    precision: meanIgnoringNaN(metrics.map((m) => m.precision)),
    recall: meanIgnoringNaN(metrics.map((m) => m.recall)),
    f1: meanIgnoringNaN(metrics.map((m) => m.f1)),
    brier: meanIgnoringNaN(metrics.map((m) => m.brier)),
    ece: meanIgnoringNaN(metrics.map((m) => m.ece)),
  }
}

// Pools TP/FP/FN/TN across tags: implicitly weights by sample count (opposite of macro).
export function microAverage(metrics: readonly PerTagMetrics[]): {
  precision: number
  recall: number
  f1: number
} {
  let tp = 0
  let fp = 0
  let fn = 0
  for (const m of metrics) {
    tp += m.tp
    fp += m.fp
    fn += m.fn
  }
  const precDen = tp + fp
  const recDen = tp + fn
  const precision = precDen === 0 ? Number.NaN : tp / precDen
  const recall = recDen === 0 ? Number.NaN : tp / recDen
  const f1 =
    Number.isNaN(precision) || Number.isNaN(recall) || precision + recall === 0
      ? Number.NaN
      : (2 * precision * recall) / (precision + recall)
  return { precision, recall, f1 }
}

function meanIgnoringNaN(values: readonly number[]): number {
  let sum = 0
  let n = 0
  for (const v of values) {
    if (Number.isNaN(v)) continue
    sum += v
    n++
  }
  return n === 0 ? Number.NaN : sum / n
}
