import { describe, expect, test } from 'bun:test'

import { GOLD_SET_FOCUS_TAGS } from '../gold-set/fixtures'
import { FOCUS_TAG_LAYER, GOLD_SET_LAYERS, layerOf, summarizeByLayer } from '../gold-set/layers'
import type { PerTagMetrics } from '../gold-set/metrics'

describe('gold-set layer taxonomy', () => {
  test('GOLD_SET_LAYERS lists the four pipeline layers in canonical order', () => {
    expect([...GOLD_SET_LAYERS]).toEqual(['algo-derm', 'actif-class', 'brand-cert', 'formula'])
  })

  test('FOCUS_TAG_LAYER maps every focus tag to a known layer', () => {
    expect(Object.keys(FOCUS_TAG_LAYER).length).toBe(GOLD_SET_FOCUS_TAGS.length)
    for (const tag of GOLD_SET_FOCUS_TAGS) {
      expect(GOLD_SET_LAYERS).toContain(FOCUS_TAG_LAYER[tag])
    }
  })

  test('focus tags split 12 actif-class / 17 formula / 1 algo-derm / 0 brand-cert', () => {
    const counts: Record<string, number> = {
      'algo-derm': 0,
      'actif-class': 0,
      'brand-cert': 0,
      formula: 0,
    }
    for (const tag of GOLD_SET_FOCUS_TAGS) counts[FOCUS_TAG_LAYER[tag]]++
    expect(counts).toEqual({ 'algo-derm': 1, 'actif-class': 12, 'brand-cert': 0, formula: 17 })
  })

  test('layerOf resolves representative tags', () => {
    expect(layerOf('retinoids')).toBe('actif-class')
    expect(layerOf('aha')).toBe('actif-class')
    expect(layerOf('fini-mat')).toBe('formula')
    expect(layerOf('keratose-pilaire')).toBe('formula')
    expect(layerOf('eczema-atopie')).toBe('formula')
    expect(layerOf('reparation-cutanee')).toBe('formula')
    expect(layerOf('reparateur')).toBe('formula')
    expect(layerOf('cernes-poches')).toBe('formula')
    expect(layerOf('rougeurs-vasculaires')).toBe('formula')
    expect(layerOf('hyperpigmentation')).toBe('formula')
    expect(layerOf('eclat-teint-uniforme')).toBe('formula')
    expect(layerOf('pores-sebum')).toBe('formula')
    expect(layerOf('deshydratation')).toBe('formula')
    expect(layerOf('acne-imperfections')).toBe('formula')
    expect(layerOf('anti-age')).toBe('formula')
    expect(layerOf('barriere-cutanee')).toBe('formula')
    expect(layerOf('apaisant')).toBe('formula')
    expect(layerOf('protection')).toBe('algo-derm')
  })
})

describe('summarizeByLayer', () => {
  const metric = (tagSlug: string, over: Partial<PerTagMetrics> = {}): PerTagMetrics => ({
    tagSlug,
    tp: 0,
    fp: 0,
    fn: 0,
    tn: 0,
    rated: 0,
    precision: Number.NaN,
    recall: Number.NaN,
    f1: Number.NaN,
    brier: Number.NaN,
    ece: Number.NaN,
    ...over,
  })

  test('always returns all four layers in canonical order, even with partial metrics', () => {
    const out = summarizeByLayer([metric('retinoids', { rated: 5 })])
    expect(out.map((l) => l.layer)).toEqual(['algo-derm', 'actif-class', 'brand-cert', 'formula'])
  })

  test('reports structural focusTagCount per layer regardless of metrics presence', () => {
    const byLayer = Object.fromEntries(summarizeByLayer([]).map((l) => [l.layer, l.focusTagCount]))
    expect(byLayer).toEqual({ 'algo-derm': 1, 'actif-class': 12, 'brand-cert': 0, formula: 17 })
  })

  test('rolls up rated counts plus macro/micro for a populated layer', () => {
    const out = summarizeByLayer([
      metric('retinoids', {
        rated: 4,
        tp: 3,
        fp: 1,
        fn: 0,
        precision: 0.75,
        recall: 1,
        f1: 0.857,
        brier: 0.25,
        ece: 0.1,
      }),
      metric('aha', {
        rated: 2,
        tp: 1,
        fp: 0,
        fn: 1,
        precision: 1,
        recall: 0.5,
        f1: 0.667,
        brier: 0.5,
        ece: 0.2,
      }),
    ])
    const actif = out.find((l) => l.layer === 'actif-class')
    expect(actif?.rated).toBe(6)
    // macro = unweighted mean of per-tag precision (0.75, 1) = 0.875
    expect(actif?.macro.precision).toBeCloseTo(0.875, 5)
    // micro pools tp/fp/fn: tp=4 fp=1 fn=1 → P=R=F1=0.8
    expect(actif?.micro.precision).toBeCloseTo(0.8, 5)
    expect(actif?.micro.recall).toBeCloseTo(0.8, 5)
  })

  test('empty layer yields zero rated and NaN aggregates', () => {
    const algo = summarizeByLayer([]).find((l) => l.layer === 'algo-derm')
    expect(algo?.rated).toBe(0)
    expect(Number.isNaN(algo?.macro.precision ?? 0)).toBe(true)
    expect(Number.isNaN(algo?.micro.precision ?? 0)).toBe(true)
  })
})
