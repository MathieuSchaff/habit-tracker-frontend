// Pure metric primitives for the gold-set benchmark (audit O2).
//
// Kept separate from the runner so they are trivial to unit-test without
// touching the DB. Inputs are plain (p, y) sample arrays.
//
// Conventions:
//   p ∈ [0, 1]   predicted probability for the tag on the product
//   y ∈ {0, 1}   gold-truth label (1 = present, 0 = absent)
//
// For deterministic detectors (passes 2-6 in the orchestrator) the predicted
// probability collapses to {0, 1}: emitted → 1, not emitted → 0. Brier then
// reduces to misclassification rate and ECE collapses to a single bin —
// this is intentional and signals "no calibration signal to inspect".

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
  // Counts on rated products only (tag annotated as present OR absent).
  tp: number
  fp: number
  fn: number
  tn: number
  // Number of rated products = tp+fp+fn+tn. 0 means nothing to measure.
  rated: number
  // Nullable when denominator is 0. NaN signals "undefined for this slice".
  precision: number
  recall: number
  f1: number
  brier: number
  ece: number
}

export interface BinStat {
  // Half-open bin index 0..nBins-1. Bin k covers [k/nBins, (k+1)/nBins),
  // except the last bin which is closed on the right ([..., 1.0]).
  bin: number
  count: number
  avgConfidence: number
  accuracy: number
}

// Brier score: mean squared error of probabilistic predictions.
// Range [0, 1]. Lower is better. 0 = perfect, 0.25 = random, 1 = perfectly wrong.
export function computeBrier(samples: readonly Sample[]): number {
  if (samples.length === 0) return Number.NaN
  let sum = 0
  for (const s of samples) {
    const d = s.p - s.y
    sum += d * d
  }
  return sum / samples.length
}

// Expected Calibration Error over `nBins` equal-width confidence bins.
// Standard reliability-diagram metric (Guo et al., 2017): weighted average
// of |avg_confidence_in_bin - accuracy_in_bin|.
//
// Range [0, 1]. Lower is better. 0 = perfectly calibrated.
//
// Empty bins contribute 0 (excluded from the weighted average).
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

// Per-bin breakdown (useful for reliability diagrams). Empty bins included
// as zeros so callers can show a stable bin axis.
export function bucketByConfidence(samples: readonly Sample[], nBins = 10): BinStat[] {
  if (nBins < 1) throw new Error('nBins must be >= 1')
  const sums = Array.from({ length: nBins }, () => ({ n: 0, conf: 0, acc: 0 }))
  for (const s of samples) {
    const bin = binIndex(s.p, nBins)
    const b = sums[bin]
    b.n++
    b.conf += s.p
    b.acc += s.y
  }
  return sums.map((b, i) => ({
    bin: i,
    count: b.n,
    avgConfidence: b.n === 0 ? Number.NaN : b.conf / b.n,
    accuracy: b.n === 0 ? Number.NaN : b.acc / b.n,
  }))
}

function binIndex(p: number, nBins: number): number {
  if (p <= 0) return 0
  if (p >= 1) return nBins - 1
  // Half-open bins: [k/N, (k+1)/N). The last bin closes on the right via
  // the p>=1 short-circuit above, so confidence==1 lands in bin N-1 (not
  // a phantom bin N from rounding).
  return Math.min(nBins - 1, Math.floor(p * nBins))
}

// TP/FP/FN/TN for a binary classifier on a (predicted, label) pair list.
// `predicted` is the boolean emit decision; `label` is the gold ground truth.
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

// Wraps everything for one tag. Provide rated-product samples — never include
// products where the tag is unrated, otherwise the metric is meaningless.
export function computePerTagMetrics(
  tagSlug: string,
  // Each entry is one rated product for this tag.
  // `p`: predicted probability (orchestrator emit confidence; 0 if not emitted)
  // `y`: 1 if gold says present, 0 if gold says absent
  // `predicted`: whether the orchestrator emitted the tag (for confusion)
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

// Macro = unweighted mean of per-tag metrics. Skips tags with NaN metric
// (e.g. precision undefined when no positives predicted).
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

// Micro = pool TP/FP/FN/TN across tags then compute. Implicitly weights tags
// by sample count, so a 2-product tag and a 50-product tag contribute
// proportionally — opposite of macro.
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
