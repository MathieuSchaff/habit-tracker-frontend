// Audit state aggregation: fetch the eligible subset, run analyzeINCI +
// detectAutoTags per product, and build the AuditState the reporters consume.
// Read-only on DB. Reporting + env dispatch live in main.ts; CHECK in check.ts.

import { fetchKnownConcentrationsByProduct } from '../../../../lib/fetch-known-concentrations'
import { buildPassContext } from '../../lib/build-pass-context'
import { buildOrchestratorInput } from '../../lib/orchestrator-input'
import type { PassContext } from '../../lib/pass-types'
import { detectAutoTags } from '../../passes/algo-derm-detection'
import { fetchEligibleProducts, fetchProductTagSlugsByProduct } from './db'
import {
  BENEFITS_OUT,
  CONF_OVERRIDE,
  CSV_OUT,
  DISABLE_FLOORS,
  DUMP_BENEFITS,
  INCLUDE_DROPPED,
  LIMIT,
} from './env'

export interface TagStat {
  hit: number
  agree: number
  new: number
  sumConf: number
  minConf: number
  maxConf: number
}

// assessment.interactions = firable subset of algo-derm interaction_rules.json:
// no profile condition (pregnant/sensitiveSkin/acneProne) and no pH condition
// (Aurore has no estimated_ph). Covers irritation/allergenicity stacks and
// EU-banned MI/MCI in leave-on.
export interface InteractionStat {
  count: number
  axes: string[]
  adjustment: number
  evidenceLevel: string
}

type Assessment = NonNullable<PassContext['assessment']>
type DetectedTag = ReturnType<typeof detectAutoTags>[number]

type ProductRow = Awaited<ReturnType<typeof fetchEligibleProducts>>[number]

export interface AuditState {
  withInci: number
  withTags: number
  totalEmitted: number
  totalAgree: number
  totalNew: number
  totalManualLabels: number
  productsWithRegulatory: number
  productsWithInteractions: number
  totalInteractionHits: number
  tagFreq: Map<string, TagStat>
  tagFreqByCategory: Map<string, Map<string, TagStat>>
  subsetSizeByCategory: Map<string, number>
  withInciByCategory: Map<string, number>
  regulatoryNoteFreq: Map<string, number>
  interactionFreq: Map<string, InteractionStat>
  dropCounts: Map<string, number>
  csvRows: string[]
  benefitSamples: Map<BenefitAxisName, number[]>
  benefitSamplesByCategory: Map<string, Map<BenefitAxisName, number[]>>
  benefitCsvRows: string[]
}

// Mirrored from algo-derm BENEFIT_AXES (type-only upstream): duplicated to avoid
// a runtime re-export. Update manually after an algo-derm axis bump.
export const BENEFIT_AXES = [
  'soothing',
  'hydrating',
  'barrierSupport',
  'antioxidant',
  'brightening',
  'seborrheicRegulation',
] as const
export type BenefitAxisName = (typeof BENEFIT_AXES)[number]

function emptyTagStat(): TagStat {
  return { hit: 0, agree: 0, new: 0, sumConf: 0, minConf: 1, maxConf: 0 }
}

function updateTagStat(stat: TagStat, confidence: number, isAlreadyTagged: boolean): void {
  stat.hit++
  stat.sumConf += confidence
  stat.minConf = Math.min(stat.minConf, confidence)
  stat.maxConf = Math.max(stat.maxConf, confidence)
  if (isAlreadyTagged) stat.agree++
  else stat.new++
}

function initState(): AuditState {
  const benefitSamples = new Map<BenefitAxisName, number[]>()
  if (DUMP_BENEFITS) for (const ax of BENEFIT_AXES) benefitSamples.set(ax, [])
  const csvRows: string[] = []
  if (CSV_OUT) csvRows.push('product_slug,product_name,tag_slug,confidence,source,already_present')
  const benefitCsvRows: string[] = []
  if (DUMP_BENEFITS && BENEFITS_OUT)
    benefitCsvRows.push('product_slug,category,kind,axis,benefit,confidence')
  return {
    withInci: 0,
    withTags: 0,
    totalEmitted: 0,
    totalAgree: 0,
    totalNew: 0,
    totalManualLabels: 0,
    productsWithRegulatory: 0,
    productsWithInteractions: 0,
    totalInteractionHits: 0,
    tagFreq: new Map(),
    tagFreqByCategory: new Map(),
    subsetSizeByCategory: new Map(),
    withInciByCategory: new Map(),
    regulatoryNoteFreq: new Map(),
    interactionFreq: new Map(),
    dropCounts: new Map(),
    csvRows,
    benefitSamples,
    benefitSamplesByCategory: new Map(),
    benefitCsvRows,
  }
}

function collectBenefitSamples(p: ProductRow, assessment: Assessment, state: AuditState): void {
  let catBucket = state.benefitSamplesByCategory.get(p.category)
  if (!catBucket) {
    catBucket = new Map()
    for (const ax of BENEFIT_AXES) catBucket.set(ax, [])
    state.benefitSamplesByCategory.set(p.category, catBucket)
  }
  for (const axis of BENEFIT_AXES) {
    const v = assessment.productBenefits[axis]?.benefit
    if (typeof v !== 'number' || Number.isNaN(v)) continue
    state.benefitSamples.get(axis)?.push(v)
    catBucket.get(axis)?.push(v)
    if (BENEFITS_OUT) {
      const conf = assessment.productBenefits[axis]?.confidence ?? 0
      state.benefitCsvRows.push(
        `${p.slug},${p.category},${p.kind},${axis},${v.toFixed(4)},${conf.toFixed(4)}`
      )
    }
  }
}

function aggregateRegulatory(assessment: Assessment, state: AuditState): void {
  if (assessment.regulatoryNotes.length === 0) return
  state.productsWithRegulatory++
  // Dedup: same note may surface for multiple ingredients (e.g. two parabens).
  const uniqueNotes = new Set(assessment.regulatoryNotes)
  for (const n of uniqueNotes) {
    state.regulatoryNoteFreq.set(n, (state.regulatoryNoteFreq.get(n) ?? 0) + 1)
  }
}

function aggregateInteractions(assessment: Assessment, state: AuditState): void {
  if (assessment.interactions.length === 0) return
  state.productsWithInteractions++
  state.totalInteractionHits += assessment.interactions.length
  for (const interaction of assessment.interactions) {
    const existing = state.interactionFreq.get(interaction.id)
    if (existing) {
      existing.count++
    } else {
      state.interactionFreq.set(interaction.id, {
        count: 1,
        axes: interaction.axes,
        adjustment: interaction.adjustment,
        evidenceLevel: interaction.evidenceLevel,
      })
    }
  }
}

function aggregateDetected(
  p: ProductRow,
  detected: DetectedTag[],
  existingSet: Set<string>,
  state: AuditState
): number {
  let catBucket = state.tagFreqByCategory.get(p.category)
  if (!catBucket) {
    catBucket = new Map()
    state.tagFreqByCategory.set(p.category, catBucket)
  }
  let emittedHere = 0
  for (const t of detected) {
    emittedHere++
    const isAgree = existingSet.has(t.slug)
    const stat = state.tagFreq.get(t.slug) ?? emptyTagStat()
    updateTagStat(stat, t.confidence, isAgree)
    state.tagFreq.set(t.slug, stat)
    if (isAgree) state.totalAgree++
    else state.totalNew++

    const catStat = catBucket.get(t.slug) ?? emptyTagStat()
    updateTagStat(catStat, t.confidence, isAgree)
    catBucket.set(t.slug, catStat)

    if (CSV_OUT) {
      const safeName = (p.name ?? '').replaceAll('"', '""')
      state.csvRows.push(
        `${p.slug},"${safeName}",${t.slug},${t.confidence.toFixed(3)},${t.source},${isAgree}`
      )
    }
  }
  return emittedHere
}

function processProduct(
  p: ProductRow,
  state: AuditState,
  existingByProduct: Map<string, Set<string>>,
  concentrationsByProduct: Map<string, Record<string, number>>
): void {
  state.subsetSizeByCategory.set(p.category, (state.subsetSizeByCategory.get(p.category) ?? 0) + 1)
  if (!p.inci?.trim()) return

  // Hoist via buildPassContext so the audit measures the same cleaned INCI +
  // solver context the runtime does (a hand-copied strip/split/analyze here
  // drifted from it once already; the assessment is reused by the regulatory
  // and interaction surfacing below).
  const ctx = buildPassContext(
    buildOrchestratorInput(p, {
      knownConcentrations: concentrationsByProduct.get(p.id),
    }),
    {
      ...(CONF_OVERRIDE !== null ? { confOverride: CONF_OVERRIDE } : {}),
      includeDropped: INCLUDE_DROPPED,
      disableFloors: DISABLE_FLOORS,
    }
  )
  const assessment = ctx.assessment
  // Always defined when INCI is non-empty (TS narrowing only); guarded before
  // the counters so a broken invariant cannot count a product it then skips.
  if (!assessment) return
  state.withInci++
  state.withInciByCategory.set(p.category, (state.withInciByCategory.get(p.category) ?? 0) + 1)

  const detected = detectAutoTags(p.inci, p.kind, {
    ...ctx.detectAutoTagsOptions,
    assessment,
    ingredients: ctx.ingredients,
    dropCounts: state.dropCounts,
  })

  if (DUMP_BENEFITS) collectBenefitSamples(p, assessment, state)
  aggregateRegulatory(assessment, state)
  aggregateInteractions(assessment, state)

  const existingSet = existingByProduct.get(p.id) ?? new Set<string>()
  state.totalManualLabels += existingSet.size

  const emittedHere = aggregateDetected(p, detected, existingSet, state)
  if (emittedHere > 0) state.withTags++
  state.totalEmitted += emittedHere
}

async function fetchEligibleProductSubset(): Promise<ProductRow[]> {
  return fetchEligibleProducts({ limit: LIMIT ?? undefined })
}

export async function fetchAuditStats(): Promise<{ state: AuditState; subsetLength: number }> {
  const subset = await fetchEligibleProductSubset()
  // Labels each emitted tag as agree (already present) vs new (proposal).
  const existingByProduct = await fetchProductTagSlugsByProduct()
  const concentrationsByProduct = await fetchKnownConcentrationsByProduct(subset.map((p) => p.id))

  const state = initState()
  for (const p of subset) processProduct(p, state, existingByProduct, concentrationsByProduct)

  return { state, subsetLength: subset.length }
}
