// Gold-set annotations for auto-tag precision/recall measurement (audit O2).
//
// Hand-maintained corpus (~1226 products as of 2026-05-25), each product judged
// on the 29 focus tags. Drives precision/recall/F1/Brier/ECE per tag so
// calibration changes can be verified against stable ground truth.
//
// Selective annotation: `present` = annotator confirms the tag fits, `absent` =
// explicitly does not, otherwise `unrated`. Unrated tags are excluded from
// per-tag metrics, keeping the corpus maintainable without exhaustive judgments.
//
// Schema is narrow by design: no annotator confidence, no relevance distinction.
// Gold targets `secondary` membership; `avoid` correctness is validated via
// safety-net tests, not the gold set.

import type { ProductKind, SkincareProductTagSlug } from '@aurore/shared'

export const GOLD_SET_SCHEMA_VERSION = '2026-05-08' as const

// 29 focus tags, "calibrated 2026-05-08" subset (AUTO-TAGS.md §"Récap reprise"):
//   - 9 actif-class clusters (positionCap: ∞)
//   - 3 sensoriel Tier-1 (formula heuristics)
//   - 3 acid clusters (positionCap=10 drift preserved by design)
//   - 10 algo-derm concerns, §20 piste f pilot
//   - 4 formula-pass concerns, §20 piste f, formula-layer expansion
//
// `satisfies` catches slug renames at compile time instead of silently skewing
// benchmark metrics at runtime.
export const GOLD_SET_FOCUS_TAGS = [
  'retinoids',
  'vitamin-c',
  'vitamin-e',
  'hyaluronic-acid',
  'peptides',
  'polyphenols',
  'enzymes-exfoliants',
  'ceramides',
  'tyrosinase-inhibitors',
  'fini-mat',
  'texture-legere',
  'texture-riche',
  // formula-pass concern layer (§20 piste f)
  'keratose-pilaire',
  'eczema-atopie',
  'reparation-cutanee',
  'cernes-poches',
  'aha',
  'bha',
  'pha',
  // algo-derm concern layer (§20 piste f pilot)
  'acne-imperfections',
  'anti-age',
  'hyperpigmentation',
  'barriere-cutanee',
  'apaisant',
  'deshydratation',
  'pores-sebum',
  'rougeurs-vasculaires',
  'eclat-teint-uniforme',
  'protection',
] as const satisfies readonly SkincareProductTagSlug[]

export type GoldSetFocusTag = (typeof GOLD_SET_FOCUS_TAGS)[number]

const FOCUS_TAG_SET: ReadonlySet<string> = new Set(GOLD_SET_FOCUS_TAGS)

export function isGoldSetFocusTag(slug: string): slug is GoldSetFocusTag {
  return FOCUS_TAG_SET.has(slug)
}

export interface GoldSetAnnotation {
  productSlug: string
  kind: ProductKind
  category: string
  present: GoldSetFocusTag[]
  // Tag in neither `present` nor `absent` is `unrated`: excluded from metrics.
  absent: GoldSetFocusTag[]
  // Bootstrap stamps "" until the annotator fills `present`/`absent`.
  annotatedAt: string
  // Which focus tag(s) caused this product to be sampled. Non-authoritative.
  sampledFor?: GoldSetFocusTag[]
  notes?: string
}

export interface GoldSetFile {
  schemaVersion: typeof GOLD_SET_SCHEMA_VERSION
  // Pinned at bootstrap time so benchmark reports can be tied to a rule version.
  rulesetVersion?: string
  annotations: GoldSetAnnotation[]
}

export class GoldSetValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoldSetValidationError'
  }
}

// Validates: schema version, no duplicate productSlug, every tag ∈ FOCUS_TAGS, present ∩ absent = ∅.
export async function loadGoldSet(path: string): Promise<GoldSetFile> {
  const file = Bun.file(path)
  if (!(await file.exists())) {
    throw new GoldSetValidationError(`Gold-set file not found: ${path}`)
  }
  const raw = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new GoldSetValidationError(
      `Gold-set file is not valid JSON: ${path} — ${e instanceof Error ? e.message : String(e)}`
    )
  }
  return validateGoldSet(parsed, path)
}

export function validateGoldSet(value: unknown, path: string): GoldSetFile {
  if (!value || typeof value !== 'object') {
    throw new GoldSetValidationError(`Gold-set root must be an object (${path})`)
  }
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== GOLD_SET_SCHEMA_VERSION) {
    throw new GoldSetValidationError(
      `Gold-set schemaVersion mismatch (${path}): expected "${GOLD_SET_SCHEMA_VERSION}", got "${String(root.schemaVersion)}"`
    )
  }
  if (!Array.isArray(root.annotations)) {
    throw new GoldSetValidationError(`Gold-set "annotations" must be an array (${path})`)
  }

  const seen = new Set<string>()
  const annotations: GoldSetAnnotation[] = []
  for (let i = 0; i < root.annotations.length; i++) {
    const a = root.annotations[i] as Record<string, unknown>
    const where = `${path} #${i}`
    if (!a || typeof a !== 'object') {
      throw new GoldSetValidationError(`Annotation must be an object at ${where}`)
    }
    const slug = a.productSlug
    if (typeof slug !== 'string' || slug.length === 0) {
      throw new GoldSetValidationError(`Missing or empty "productSlug" at ${where}`)
    }
    if (seen.has(slug)) {
      throw new GoldSetValidationError(`Duplicate productSlug "${slug}" at ${where}`)
    }
    seen.add(slug)

    const present = checkTagList(a.present, 'present', where)
    const absent = checkTagList(a.absent, 'absent', where)
    const overlap = present.filter((t) => absent.includes(t))
    if (overlap.length > 0) {
      throw new GoldSetValidationError(
        `Tag(s) appear in both "present" and "absent" for "${slug}" at ${where}: ${overlap.join(', ')}`
      )
    }
    const sampledFor =
      a.sampledFor === undefined
        ? undefined
        : (checkTagList(a.sampledFor, 'sampledFor', where) as GoldSetFocusTag[])

    annotations.push({
      productSlug: slug,
      kind: a.kind as ProductKind,
      category: typeof a.category === 'string' ? a.category : '',
      present,
      absent,
      annotatedAt: typeof a.annotatedAt === 'string' ? a.annotatedAt : '',
      ...(sampledFor !== undefined ? { sampledFor } : {}),
      ...(typeof a.notes === 'string' && a.notes.length > 0 ? { notes: a.notes } : {}),
    })
  }

  return {
    schemaVersion: GOLD_SET_SCHEMA_VERSION,
    ...(typeof root.rulesetVersion === 'string' ? { rulesetVersion: root.rulesetVersion } : {}),
    annotations,
  }
}

function checkTagList(value: unknown, field: string, where: string): GoldSetFocusTag[] {
  if (!Array.isArray(value)) {
    throw new GoldSetValidationError(`"${field}" must be an array at ${where}`)
  }
  const out: GoldSetFocusTag[] = []
  for (const v of value) {
    if (typeof v !== 'string') {
      throw new GoldSetValidationError(
        `"${field}" entries must be strings at ${where}, got ${typeof v}`
      )
    }
    if (!isGoldSetFocusTag(v)) {
      throw new GoldSetValidationError(
        `"${field}" entry "${v}" is not in GOLD_SET_FOCUS_TAGS at ${where}`
      )
    }
    out.push(v)
  }
  return out
}

// Deterministic serializer for diff-friendly writes: sorts by productSlug,
// sorts present/absent/sampledFor alphabetically, omits undefined fields.
export function serializeGoldSet(file: GoldSetFile): string {
  const sorted = [...file.annotations].sort((a, b) => a.productSlug.localeCompare(b.productSlug))
  const out = {
    schemaVersion: file.schemaVersion,
    ...(file.rulesetVersion ? { rulesetVersion: file.rulesetVersion } : {}),
    annotations: sorted.map((a) => ({
      productSlug: a.productSlug,
      kind: a.kind,
      category: a.category,
      present: [...a.present].sort(),
      absent: [...a.absent].sort(),
      annotatedAt: a.annotatedAt,
      ...(a.sampledFor ? { sampledFor: [...a.sampledFor].sort() } : {}),
      ...(a.notes ? { notes: a.notes } : {}),
    })),
  }
  return `${JSON.stringify(out, null, 2)}\n`
}
