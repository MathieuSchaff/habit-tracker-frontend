// Gold-set annotations for auto-tag precision/recall measurement (audit O2).
//
// A small (60-80 product) corpus where each product is hand-judged on the 16
// focus tags listed below. Used to compute precision / recall / F1 / Brier /
// ECE per tag from the orchestrator output, so calibration moves can be
// verified against a stable ground truth instead of running blind.
//
// Selective annotation: a tag is `present` when the annotator confirms it
// fits, `absent` when it explicitly does not, otherwise `unrated`. Unrated
// tags do not contribute to per-tag metrics — they are out of scope for that
// product (often outside the annotator's confidence). This keeps the gold
// set small enough to maintain by hand without forcing exhaustive judgments.
//
// Schema is intentionally narrow: no per-tag confidence by the annotator,
// no relevance distinction (gold focuses on `secondary` membership; the
// orchestrator's `avoid` decisions are validated via the existing safety-net
// tests, not the gold set).

import type { ProductKind, SkincareProductTagSlug } from '@habit-tracker/shared'

export const GOLD_SET_SCHEMA_VERSION = '2026-05-08' as const

// 16 tags in scope for the focus-calibration gold set. Mirrors the
// "calibrated 2026-05-08" subset documented in AUTO-TAGS.md §"Récap reprise":
//   - 9 actif-class clusters recalibrated to recall=100% (positionCap: ∞)
//   - 4 sensoriels Tier-1 (formula heuristics)
//   - 3 acid clusters carrying the design-conserved positionCap=10 drift
//
// `satisfies` enforces every entry resolves to a real Aurore tag slug at
// compile time — drift on a renamed slug shows up as a TS error here, not
// at benchmark runtime.
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
  'aha',
  'bha',
  'pha',
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
  // Confirmed-correct tags. Annotator vouches that this tag fits the product.
  present: GoldSetFocusTag[]
  // Confirmed-incorrect tags. Annotator vouches that this tag does NOT fit.
  // A tag in neither `present` nor `absent` is `unrated` — metrics ignore it.
  absent: GoldSetFocusTag[]
  // ISO date of annotation creation or last edit. Bootstrap stamps "" until
  // the annotator fills `present`/`absent`.
  annotatedAt: string
  // Hint surfaced by the bootstrap: which focus tag(s) caused this product
  // to be sampled. Non-authoritative — present to help the annotator focus
  // when triaging the corpus.
  sampledFor?: GoldSetFocusTag[]
  // Free-text reasoning for borderline calls. Optional.
  notes?: string
}

export interface GoldSetFile {
  schemaVersion: typeof GOLD_SET_SCHEMA_VERSION
  // Optional free-form ruleset id — pinned at bootstrap time for traceability
  // (e.g. "products-branch@a4934d1f"). Lets a benchmark report tie metrics
  // to the rule version that produced them.
  rulesetVersion?: string
  annotations: GoldSetAnnotation[]
}

export class GoldSetValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoldSetValidationError'
  }
}

// Strict load: validates schema version, no duplicate productSlug, every
// tag in present/absent ∈ FOCUS_TAGS, present ∩ absent = ∅. Mutates nothing.
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

// Stable serializer for diff-friendly file writes. Sorts annotations by
// productSlug, sorts present/absent/sampledFor alphabetically, omits
// undefined optional fields. Use for `gold-set-bootstrap` and any future
// programmatic editor.
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
