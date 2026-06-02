// Groups focus tags by pipeline layer for per-layer coverage reporting.
// An uncovered layer (0 focus tags) surfaces as a gold-set expansion target (§20 piste f).
// Layers map onto AutoTagSource: 'brand-cert' corresponds to source 'brand', the rest identical.

import { type GoldSetFocusTag, isGoldSetFocusTag } from './fixtures'
import { macroAverage, microAverage, type PerTagMetrics } from './metrics'

export const GOLD_SET_LAYERS = ['algo-derm', 'actif-class', 'brand-cert', 'formula'] as const

export type GoldSetLayer = (typeof GOLD_SET_LAYERS)[number]

// `satisfies` forces every focus tag to map to a real layer: a renamed tag trips
// a compile error here rather than silently skewing layer rollups.
export const FOCUS_TAG_LAYER = {
  retinoids: 'actif-class',
  'vitamin-c': 'actif-class',
  'vitamin-e': 'actif-class',
  'hyaluronic-acid': 'actif-class',
  peptides: 'actif-class',
  polyphenols: 'actif-class',
  'enzymes-exfoliants': 'actif-class',
  ceramides: 'actif-class',
  'tyrosinase-inhibitors': 'actif-class',
  aha: 'actif-class',
  bha: 'actif-class',
  pha: 'actif-class',
  'fini-mat': 'formula',
  'texture-legere': 'formula',
  'texture-riche': 'formula',
  'keratose-pilaire': 'formula',
  'eczema-atopie': 'formula',
  'reparation-cutanee': 'formula',
  'cernes-poches': 'formula',
  'acne-imperfections': 'algo-derm',
  'anti-age': 'algo-derm',
  hyperpigmentation: 'algo-derm',
  'barriere-cutanee': 'algo-derm',
  apaisant: 'algo-derm',
  deshydratation: 'algo-derm',
  'pores-sebum': 'algo-derm',
  'rougeurs-vasculaires': 'algo-derm',
  'eclat-teint-uniforme': 'algo-derm',
  protection: 'algo-derm',
} as const satisfies Record<GoldSetFocusTag, GoldSetLayer>

export function layerOf(tag: GoldSetFocusTag): GoldSetLayer {
  return FOCUS_TAG_LAYER[tag]
}

export interface LayerSummary {
  layer: GoldSetLayer
  // 0 means the layer is unmeasured in the current gold set.
  focusTagCount: number
  rated: number
  macro: ReturnType<typeof macroAverage>
  micro: ReturnType<typeof microAverage>
}

// focusTagCount comes from the static map, not perTag, so unrated layers still
// report their structural size. All four layers are always emitted in order.
export function summarizeByLayer(perTag: readonly PerTagMetrics[]): LayerSummary[] {
  const focusCountByLayer = new Map<GoldSetLayer, number>()
  for (const layer of GOLD_SET_LAYERS) focusCountByLayer.set(layer, 0)
  for (const layer of Object.values(FOCUS_TAG_LAYER)) {
    focusCountByLayer.set(layer, (focusCountByLayer.get(layer) ?? 0) + 1)
  }

  return GOLD_SET_LAYERS.map((layer) => {
    const inLayer = perTag.filter(
      (m) => isGoldSetFocusTag(m.tagSlug) && layerOf(m.tagSlug) === layer
    )
    return {
      layer,
      focusTagCount: focusCountByLayer.get(layer) ?? 0,
      rated: inLayer.reduce((sum, m) => sum + m.rated, 0),
      macro: macroAverage(inLayer),
      micro: microAverage(inLayer),
    }
  })
}
