import { describe, expect, test } from 'bun:test'

import {
  bucketByConfidence,
  computeBrier,
  computeConfusion,
  computeECE,
  computePerTagMetrics,
  macroAverage,
  microAverage,
  type PerTagMetrics,
  type Sample,
} from '../gold-set/metrics'

const s = (p: number, y: 0 | 1): Sample => ({ p, y })

describe('computeBrier', () => {
  test('empty input → NaN (no measurement, not 0)', () => {
    expect(computeBrier([])).toBeNaN()
  })

  test('perfect predictions → 0', () => {
    expect(computeBrier([s(1, 1), s(0, 0), s(1, 1), s(0, 0)])).toBe(0)
  })

  test('perfectly wrong predictions → 1', () => {
    expect(computeBrier([s(1, 0), s(0, 1), s(1, 0)])).toBe(1)
  })

  test('uniform 0.5 prediction on balanced labels → 0.25 (random)', () => {
    expect(computeBrier([s(0.5, 1), s(0.5, 0), s(0.5, 1), s(0.5, 0)])).toBeCloseTo(0.25, 5)
  })

  test('matches mean squared error formula', () => {
    // (0.8 - 1)² + (0.2 - 0)² = 0.04 + 0.04 = 0.08; /2 = 0.04
    expect(computeBrier([s(0.8, 1), s(0.2, 0)])).toBeCloseTo(0.04, 5)
  })
})

describe('computeECE', () => {
  test('empty input → NaN', () => {
    expect(computeECE([])).toBeNaN()
  })

  test('perfectly calibrated single bin → 0', () => {
    // All predictions 0.7, with 70 % positive rate → ECE = |0.7 - 0.7| = 0
    const samples: Sample[] = []
    for (let i = 0; i < 7; i++) samples.push(s(0.7, 1))
    for (let i = 0; i < 3; i++) samples.push(s(0.7, 0))
    expect(computeECE(samples)).toBeCloseTo(0, 5)
  })

  test('overconfident model → ECE > 0', () => {
    // All predictions 0.9 but accuracy 0.5 → bin 8 (0.8-0.9): |0.9 - 0.5| = 0.4
    const samples: Sample[] = []
    for (let i = 0; i < 5; i++) samples.push(s(0.9, 1))
    for (let i = 0; i < 5; i++) samples.push(s(0.9, 0))
    // 0.9 → binIndex(0.9, 10) = floor(0.9 * 10) = 9; the bin range is [0.9, 1.0)
    // weight = 10/10 = 1; |avg_conf - acc| = |0.9 - 0.5| = 0.4
    expect(computeECE(samples)).toBeCloseTo(0.4, 5)
  })

  test('confidence == 1 lands in last bin (not overflow)', () => {
    // p=1.0 with y=1 → perfect; bin 9 stat: avg_conf=1, acc=1 → ECE = 0
    const samples: Sample[] = [s(1, 1), s(1, 1), s(1, 1)]
    expect(computeECE(samples)).toBeCloseTo(0, 5)
  })

  test('mixed calibration across bins → weighted-avg ECE', () => {
    // Bin 0 (0.0-0.1): 4 samples, all p=0.05, all y=0 → ECE_bin = |0.05 - 0| = 0.05, weight 4/10
    // Bin 9 (0.9-1.0): 6 samples, all p=0.95, all y=1 → ECE_bin = |0.95 - 1| = 0.05, weight 6/10
    // Total: 0.05 * 0.4 + 0.05 * 0.6 = 0.05
    const samples: Sample[] = [
      s(0.05, 0),
      s(0.05, 0),
      s(0.05, 0),
      s(0.05, 0),
      s(0.95, 1),
      s(0.95, 1),
      s(0.95, 1),
      s(0.95, 1),
      s(0.95, 1),
      s(0.95, 1),
    ]
    expect(computeECE(samples)).toBeCloseTo(0.05, 5)
  })
})

describe('bucketByConfidence', () => {
  test('returns nBins entries even when some bins are empty', () => {
    const result = bucketByConfidence([s(0.5, 1)], 10)
    expect(result.length).toBe(10)
    expect(result.filter((b) => b.count > 0).length).toBe(1)
  })

  test('throws on nBins < 1', () => {
    expect(() => bucketByConfidence([s(0.5, 1)], 0)).toThrow()
  })

  test('confidence == 0 lands in bin 0', () => {
    const result = bucketByConfidence([s(0, 0), s(0, 0)], 10)
    expect(result[0]!.count).toBe(2)
  })

  test('boundary p=0.5 with nBins=10 → bin 5 (half-open)', () => {
    const result = bucketByConfidence([s(0.5, 1)], 10)
    expect(result[5]!.count).toBe(1)
  })
})

describe('computePerTagMetrics', () => {
  test('all positives detected → P=1 R=1 F1=1', () => {
    const m = computePerTagMetrics('retinoids', [
      { p: 1, y: 1, predicted: true },
      { p: 1, y: 1, predicted: true },
      { p: 0, y: 0, predicted: false },
      { p: 0, y: 0, predicted: false },
    ])
    expect(m.tp).toBe(2)
    expect(m.fp).toBe(0)
    expect(m.fn).toBe(0)
    expect(m.tn).toBe(2)
    expect(m.precision).toBe(1)
    expect(m.recall).toBe(1)
    expect(m.f1).toBe(1)
    expect(m.brier).toBe(0)
  })

  test('all-FP scenario → P=0 R=NaN (no positives in gold)', () => {
    const m = computePerTagMetrics('vitamin-c', [
      { p: 1, y: 0, predicted: true },
      { p: 1, y: 0, predicted: true },
    ])
    expect(m.tp).toBe(0)
    expect(m.fp).toBe(2)
    expect(m.fn).toBe(0)
    expect(m.tn).toBe(0)
    expect(m.precision).toBe(0)
    expect(m.recall).toBeNaN()
    expect(m.f1).toBeNaN()
  })

  test('all-FN scenario → R=0 P=NaN (no positives predicted)', () => {
    const m = computePerTagMetrics('vitamin-e', [
      { p: 0, y: 1, predicted: false },
      { p: 0, y: 1, predicted: false },
    ])
    expect(m.tp).toBe(0)
    expect(m.fp).toBe(0)
    expect(m.fn).toBe(2)
    expect(m.tn).toBe(0)
    expect(m.precision).toBeNaN()
    expect(m.recall).toBe(0)
    expect(m.f1).toBeNaN()
  })

  test('zero rated samples → all metrics NaN, counts 0', () => {
    const m = computePerTagMetrics('aha', [])
    expect(m.tp).toBe(0)
    expect(m.fp).toBe(0)
    expect(m.fn).toBe(0)
    expect(m.tn).toBe(0)
    expect(m.rated).toBe(0)
    expect(m.precision).toBeNaN()
    expect(m.recall).toBeNaN()
    expect(m.f1).toBeNaN()
    expect(m.brier).toBeNaN()
    expect(m.ece).toBeNaN()
  })

  test('mixed precision/recall realistic case', () => {
    // 3 TP + 1 FP + 1 FN + 5 TN → P=3/4, R=3/4, F1=3/4
    const m = computePerTagMetrics('peptides', [
      { p: 0.9, y: 1, predicted: true }, // TP
      { p: 0.9, y: 1, predicted: true }, // TP
      { p: 0.9, y: 1, predicted: true }, // TP
      { p: 0.9, y: 0, predicted: true }, // FP
      { p: 0, y: 1, predicted: false }, // FN
      { p: 0, y: 0, predicted: false }, // TN
      { p: 0, y: 0, predicted: false }, // TN
      { p: 0, y: 0, predicted: false }, // TN
      { p: 0, y: 0, predicted: false }, // TN
      { p: 0, y: 0, predicted: false }, // TN
    ])
    expect(m.precision).toBeCloseTo(0.75, 5)
    expect(m.recall).toBeCloseTo(0.75, 5)
    expect(m.f1).toBeCloseTo(0.75, 5)
  })
})

describe('computeConfusion', () => {
  test('counts all four cells', () => {
    const c = computeConfusion([
      { predicted: true, label: 1 },
      { predicted: true, label: 1 },
      { predicted: true, label: 0 },
      { predicted: false, label: 1 },
      { predicted: false, label: 0 },
      { predicted: false, label: 0 },
    ])
    expect(c).toEqual({ tp: 2, fp: 1, fn: 1, tn: 2 })
  })
})

describe('macroAverage', () => {
  const stub = (
    over: Partial<PerTagMetrics> & { tagSlug: string; rated: number }
  ): PerTagMetrics => ({
    tp: 0,
    fp: 0,
    fn: 0,
    tn: 0,
    precision: Number.NaN,
    recall: Number.NaN,
    f1: Number.NaN,
    brier: Number.NaN,
    ece: Number.NaN,
    ...over,
  })

  test('skips NaN entries', () => {
    const a = macroAverage([
      stub({ tagSlug: 't1', rated: 4, precision: 1, recall: 1, f1: 1, brier: 0, ece: 0 }),
      stub({ tagSlug: 't2', rated: 0 }), // all NaN
      stub({
        tagSlug: 't3',
        rated: 2,
        precision: 0.5,
        recall: 0.5,
        f1: 0.5,
        brier: 0.25,
        ece: 0.1,
      }),
    ])
    expect(a.precision).toBeCloseTo(0.75, 5)
    expect(a.recall).toBeCloseTo(0.75, 5)
    expect(a.f1).toBeCloseTo(0.75, 5)
    expect(a.brier).toBeCloseTo(0.125, 5)
    expect(a.ece).toBeCloseTo(0.05, 5)
  })

  test('all NaN → all NaN', () => {
    const a = macroAverage([stub({ tagSlug: 't1', rated: 0 }), stub({ tagSlug: 't2', rated: 0 })])
    expect(a.precision).toBeNaN()
    expect(a.recall).toBeNaN()
    expect(a.f1).toBeNaN()
  })
})

describe('microAverage', () => {
  test('pools TP/FP/FN across tags before computing', () => {
    // tag A: TP=10 FP=0 FN=0 → P=1 R=1
    // tag B: TP=0 FP=10 FN=10 → P=0 R=0
    // micro: TP=10 FP=10 FN=10 → P=0.5 R=0.5 F1=0.5
    // (macro would average to P=0.5 R=0.5 — same here, but micro/macro
    // differ when sample counts differ across tags.)
    const m = microAverage([
      {
        tagSlug: 'a',
        tp: 10,
        fp: 0,
        fn: 0,
        tn: 0,
        rated: 10,
        precision: 1,
        recall: 1,
        f1: 1,
        brier: 0,
        ece: 0,
      },
      {
        tagSlug: 'b',
        tp: 0,
        fp: 10,
        fn: 10,
        tn: 0,
        rated: 20,
        precision: 0,
        recall: 0,
        f1: Number.NaN,
        brier: 1,
        ece: 1,
      },
    ])
    expect(m.precision).toBeCloseTo(0.5, 5)
    expect(m.recall).toBeCloseTo(0.5, 5)
    expect(m.f1).toBeCloseTo(0.5, 5)
  })

  test('macro and micro differ when class sizes are imbalanced', () => {
    // tag A (rare, 10 rated): TP=8 FP=2 FN=0 TN=0 → P=0.8 R=1
    // tag B (common, 100 rated): TP=20 FP=80 FN=0 TN=0 → P=0.2 R=1
    // macro P = (0.8 + 0.2) / 2 = 0.5
    // micro P = (8 + 20) / (10 + 100) = 28/110 ≈ 0.255
    const tags: PerTagMetrics[] = [
      {
        tagSlug: 'a',
        tp: 8,
        fp: 2,
        fn: 0,
        tn: 0,
        rated: 10,
        precision: 0.8,
        recall: 1,
        f1: 0.888,
        brier: 0,
        ece: 0,
      },
      {
        tagSlug: 'b',
        tp: 20,
        fp: 80,
        fn: 0,
        tn: 0,
        rated: 100,
        precision: 0.2,
        recall: 1,
        f1: 0.333,
        brier: 0,
        ece: 0,
      },
    ]
    const macro = macroAverage(tags)
    const micro = microAverage(tags)
    expect(macro.precision).toBeCloseTo(0.5, 3)
    expect(micro.precision).toBeCloseTo(28 / 110, 3)
    expect(macro.precision).not.toBeCloseTo(micro.precision, 2)
  })
})
