#!/usr/bin/env bun
/**
 * audit-imported-products.ts - Review report for bulk-imported product seeds.
 *
 * Reads active data/products/*.seed.ts files, focuses on .atida/.pharmashop
 * imports, and reports the debt that must be reviewed before merging imports
 * into curated brand seeds.
 *
 * Usage:
 *   bun run backend/src/db/seed/maintenance/audit-imported-products.ts
 *   bun run backend/src/db/seed/maintenance/audit-imported-products.ts --write
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { UnifiedProductSeed } from '../data/products/types'

const WRITE = process.argv.includes('--write')

const SEED_ROOT = join(import.meta.dir, '..')
const REPO_ROOT = join(SEED_ROOT, '..', '..', '..', '..')
const PRODUCTS_DIR = join(SEED_ROOT, 'data', 'products')
const PRODUCTS_INDEX = join(PRODUCTS_DIR, 'index.ts')
const OUTPUT_DIR = join(SEED_ROOT, 'output')
const JSON_REPORT_PATH = join(OUTPUT_DIR, 'imported-products-audit.json')
const MD_REPORT_PATH = join(OUTPUT_DIR, 'imported-products-audit.md')

type ImportSource = 'atida' | 'pharmashop' | 'curated'

interface LoadedSeedFile {
  filePath: string
  relPath: string
  products: UnifiedProductSeed[]
  source: ImportSource
  parent: string
  brandDir: string
  indexed: boolean
  importError?: string
}

interface FileAudit {
  file: string
  source: ImportSource
  parent: string
  brandDir: string
  indexed: boolean
  products: number
  emptyDescription: number
  emptyNotes: number
  emptyImageUrl: number
  missingKeyIngredients: number
  emptyPrimary: number
  primaryOverCap: number
  duplicateTagsAcrossBuckets: number
  suspiciousNameCasing: number
  semanticDuplicateProducts: number
  markers: {
    autoSuggested: number
    autoInferred: number
    todo: number
  }
  sampleSuspiciousNames: Array<{
    slug: string
    name: string
    words: string[]
  }>
}

interface ProductRef {
  file: string
  slug: string
  name: string
  brand: string
}

type DupTier = 'auto-merge' | 'review' | 'weak'

interface DupPair {
  a: ProductRef
  b: ProductRef
  tier: DupTier
  inci: number
  name: number
  score: number
  sameSize: boolean
  flags: string[]
}

interface SummaryStats {
  files: number
  products: number
  emptyDescription: number
  emptyNotes: number
  emptyImageUrl: number
  missingKeyIngredients: number
  emptyPrimary: number
  primaryOverCap: number
  duplicateTagsAcrossBuckets: number
  suspiciousNameCasing: number
  semanticDuplicateProducts: number
}

interface AuditReport {
  generatedAt: string
  summary: SummaryStats & {
    activeProducts: number
    importedFiles: number
    importedProducts: number
    unindexedImportedFiles: number
    unreferencedProductFiles: number
  }
  bySource: Record<string, SummaryStats>
  byParent: Record<string, SummaryStats>
  reviewPriority: FileAudit[]
  topImportedFiles: FileAudit[]
  unindexedImportedFiles: string[]
  unreferencedProductFiles: string[]
  crossSourceDuplicates: DupPair[]
  intraSourceDuplicates: DupPair[]
  importErrors: Array<{
    file: string
    error: string
  }>
  files: FileAudit[]
}

const IMPORTED_FILE_RE = /\.(?:atida|pharmashop)\.seed\.ts$/
const SEED_FILE_RE = /\.seed\.ts$/
const INDEX_IMPORT_RE = /import\s+\{\s*([^}]+)\s*\}\s+from '\.\/([^']+)'/g
const SOURCE_MARKERS = {
  autoSuggested: /auto-suggested/g,
  autoInferred: /AUTO-INFERRED/g,
  todo: /TODO/g,
}

const ALLOWED_UPPERCASE_NAME_WORDS = new Set([
  'AC',
  'AH',
  'AHA',
  'AP',
  'AR',
  'BB',
  'BHA',
  'CC',
  'CICA',
  'DS',
  'HA',
  'LP',
  'PHA',
  'PSO',
  'SOS',
  'SPF',
  'UVA',
  'UVB',
  'UV',
])

function walkSeedFiles(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) files.push(...walkSeedFiles(full))
    else if (SEED_FILE_RE.test(name)) files.push(full)
  }
  return files
}

function rel(filePath: string): string {
  return relative(REPO_ROOT, filePath)
}

function sourceFor(filePath: string): ImportSource {
  if (filePath.endsWith('.pharmashop.seed.ts')) return 'pharmashop'
  if (filePath.endsWith('.atida.seed.ts')) return 'atida'
  return 'curated'
}

function pathPartsFromProducts(filePath: string): { parent: string; brandDir: string } {
  const parts = relative(PRODUCTS_DIR, filePath).split(/[\\/]/)
  return { parent: parts[0] ?? '', brandDir: parts[1] ?? '' }
}

function indexedProductImports(): Map<string, string[]> {
  const text = readFileSync(PRODUCTS_INDEX, 'utf-8')
  const files = new Map<string, string[]>()
  for (const m of text.matchAll(INDEX_IMPORT_RE)) {
    const exportName = m[1].split(/\s+as\s+/)[0]?.trim()
    if (!exportName) continue
    const filePath = join(PRODUCTS_DIR, `${m[2]}.ts`)
    const exportNames = files.get(filePath) ?? []
    exportNames.push(exportName)
    files.set(filePath, exportNames)
  }
  return files
}

async function loadSeedFile(
  filePath: string,
  indexedExportNames: string[] | undefined
): Promise<LoadedSeedFile> {
  const { parent, brandDir } = pathPartsFromProducts(filePath)
  const base: LoadedSeedFile = {
    filePath,
    relPath: rel(filePath),
    products: [],
    source: sourceFor(filePath),
    parent,
    brandDir,
    indexed: indexedExportNames !== undefined,
  }

  try {
    const mod = (await import(pathToFileURL(filePath).href)) as Record<string, unknown>
    const exportKey =
      indexedExportNames?.find((name) => Array.isArray(mod[name])) ??
      Object.keys(mod).find((k) => Array.isArray(mod[k]) && k.endsWith('_SEED'))
    if (!exportKey) return { ...base, importError: 'No *_SEED array export found' }
    return { ...base, products: mod[exportKey] as UnifiedProductSeed[] }
  } catch (err) {
    return { ...base, importError: (err as Error).message }
  }
}

function isBlank(s: string | undefined): boolean {
  return s === undefined || s.trim() === ''
}

function countMatches(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0
}

function tagOverlapCount(p: UnifiedProductSeed): number {
  const tags = [...p.tags.primary, ...p.tags.secondary, ...p.tags.avoid]
  return tags.length - new Set(tags).size
}

function suspiciousUppercaseWords(name: string): string[] {
  const words = new Set<string>()
  for (const m of name.matchAll(/\b[A-ZÀ-Ý]{2,}\b/g)) {
    const word = m[0]
    if (!ALLOWED_UPPERCASE_NAME_WORDS.has(word)) words.add(word)
  }
  return [...words]
}

function normalizeKeyPart(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ---------- Duplicate detection helpers ----------

const VOLUME_RE = /\b\d+\s*(ml|l|g|kg|gr)\b/g
const FORMAT_RE =
  /\b(eco[-\s]?recharge|recharge|eco|format|nomade|lot|pack|x\s*\d+|de\s+\d+|flacon)\b/g

function deburr(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function stripName(s: string, brand: string): string {
  const brandPattern = new RegExp(
    `\\b(${normalizeKeyPart(brand).replace(/\s+/g, '\\s*')}|laboratoire|labo)\\b`,
    'g'
  )
  return deburr(s)
    .replace(brandPattern, ' ')
    .replace(VOLUME_RE, ' ')
    .replace(FORMAT_RE, ' ')
    .replace(/\d{5,}/g, ' ')
    .replace(/[+&]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function nameTokens(name: string, brand: string): Set<string> {
  return new Set(
    stripName(name, brand)
      .split(/\s+/)
      .filter((t) => t.length > 2)
  )
}

function inciTokens(inci: string | undefined): string[] {
  if (!inci) return []
  return inci
    .replace(/^.*INGREDIENTS\s*:/i, '')
    .split(/[,;]/)
    .map((t) => deburr(t).replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 1)
}

function jaccardArr(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  if (A.size === 0 && B.size === 0) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

function jaccardSet<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

function symmetricDiff<T>(a: Set<T>, b: Set<T>): Set<T> {
  const out = new Set<T>()
  for (const x of a) if (!b.has(x)) out.add(x)
  for (const x of b) if (!a.has(x)) out.add(x)
  return out
}

const TINT_WORDS = new Set([
  'light',
  'medium',
  'dark',
  'fonce',
  'clair',
  'claire',
  'natural',
  'naturel',
  'beige',
  'sable',
  'dore',
  'doree',
  'ivoire',
  'porcelaine',
  'teinte',
])

// Color names that act as variant discriminators for non-tint products
// (toothbrushes, color-coded interdental brushes, packaging colors).
// Kept disjoint from TINT_WORDS so the right flag fires per product type.
const COLOR_WORDS = new Set([
  'bleu',
  'blue',
  'rose',
  'pink',
  'vert',
  'green',
  'rouge',
  'red',
  'violet',
  'purple',
  'mauve',
  'orange',
  'jaune',
  'yellow',
  'noir',
  'black',
  'blanc',
  'white',
  'marron',
  'brown',
  'gris',
  'grey',
  'gray',
  'turquoise',
  'corail',
  'fuchsia',
  'lavande',
  'lavender',
])

// Audience / age-group markers — different audiences = distinct products
// (Klorane Bébé vs adulte, Elmex Junior vs Pro, etc.).
const AUDIENCE_WORDS = new Set([
  'bebe',
  'baby',
  'enfant',
  'kids',
  'kid',
  'junior',
  'maman',
  'mom',
  'adulte',
  'adult',
  'pro',
  'professionnel',
  'professional',
  'expert',
])

// Model/sub-line markers within a brand — these segment a product line into
// distinct SKUs even when INCI is identical (handle, head shape, density,
// hardness for toothbrushes/interdental brushes).
const MODEL_VARIANT_WORDS = new Set([
  'mini',
  'micro',
  'maxi',
  'conique',
  'fin',
  'fine',
  'large',
  'etroit',
  'narrow',
  'wide',
  'ultra',
  'soft',
  'souple',
  'medium',
  'hard',
  'dur',
  'extra',
  'compact',
  'recharge',
  'reserve',
])

function semanticNumbers(name: string): Set<string> {
  const stripped = deburr(name).replace(VOLUME_RE, ' ')
  const out = new Set<string>()
  for (const m of stripped.matchAll(/spf\s*(\d+)\+?/g)) out.add(`spf:${m[1]}`)
  for (const m of stripped.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) out.add(`pct:${m[1]}`)
  for (const m of stripped.matchAll(/\b(\d{1,3}(?:\.\d+)?)\b/g)) out.add(`n:${m[1]}`)
  return out
}

function tintTokens(name: string, brand: string): Set<string> {
  const out = new Set<string>()
  for (const tok of stripName(name, brand).split(/\s+/)) if (TINT_WORDS.has(tok)) out.add(tok)
  return out
}

// Brossette interdentaire diameter (0.6mm, 1.2mm, 0,8 mm, etc.). Slugs use
// `0-7mm`/`1-2mm` while names usually carry `0,7mm`/`1,2 mm` — normalize both.
function sizeMmTokens(name: string): Set<string> {
  const out = new Set<string>()
  const norm = deburr(name).replace(/[,]/g, '.')
  for (const m of norm.matchAll(/(\d+(?:\.\d+)?)\s*mm\b/g)) out.add(`${m[1]}mm`)
  return out
}

function colorTokens(name: string, brand: string): Set<string> {
  const out = new Set<string>()
  for (const tok of stripName(name, brand).split(/\s+/)) if (COLOR_WORDS.has(tok)) out.add(tok)
  return out
}

function audienceTokens(name: string, brand: string): Set<string> {
  const out = new Set<string>()
  for (const tok of stripName(name, brand).split(/\s+/)) if (AUDIENCE_WORDS.has(tok)) out.add(tok)
  return out
}

function modelVariantTokens(name: string, brand: string): Set<string> {
  const out = new Set<string>()
  for (const tok of stripName(name, brand).split(/\s+/))
    if (MODEL_VARIANT_WORDS.has(tok)) out.add(tok)
  return out
}

// Hair coloration codes (Herbatint 6N, 5C, 8NB, etc.). Match a 1-2 digit
// number immediately followed by 1-3 letters, before stripName drops anything.
function tintLetterTokens(name: string): Set<string> {
  const out = new Set<string>()
  for (const m of deburr(name).matchAll(/\b(\d{1,2}[a-z]{1,3})\b/g)) out.add(m[1] ?? '')
  return out
}

function gammeLetters(originalName: string): Set<string> {
  const out = new Set<string>()
  for (const m of originalName.matchAll(/\b([A-Z])\b/g)) out.add(m[1])
  return out
}

interface ClassifyResult {
  tier: DupTier | null
  score: number
  inci: number
  name: number
  flags: string[]
}

function classifyPair(a: UnifiedProductSeed, b: UnifiedProductSeed): ClassifyResult {
  if (deburr(a.brand) !== deburr(b.brand))
    return { tier: null, score: 0, inci: 0, name: 0, flags: [] }

  const inci = jaccardArr(inciTokens(a.inci), inciTokens(b.inci))
  const name = jaccardSet(nameTokens(a.name, a.brand), nameTokens(b.name, b.brand))
  const kindEq = a.kind === b.kind

  const flags: string[] = []
  const numDiff = symmetricDiff(semanticNumbers(a.name), semanticNumbers(b.name))
  if (numDiff.size > 0) flags.push(`num-diff:${[...numDiff].join(',')}`)
  const tintDiff = symmetricDiff(tintTokens(a.name, a.brand), tintTokens(b.name, b.brand))
  if (tintDiff.size > 0) flags.push(`tint-diff:${[...tintDiff].join(',')}`)
  const sizeMmDiff = symmetricDiff(sizeMmTokens(a.name), sizeMmTokens(b.name))
  if (sizeMmDiff.size > 0) flags.push(`size-mm:${[...sizeMmDiff].join(',')}`)
  const colorDiff = symmetricDiff(colorTokens(a.name, a.brand), colorTokens(b.name, b.brand))
  if (colorDiff.size > 0) flags.push(`color-diff:${[...colorDiff].join(',')}`)
  const audienceDiff = symmetricDiff(
    audienceTokens(a.name, a.brand),
    audienceTokens(b.name, b.brand)
  )
  if (audienceDiff.size > 0) flags.push(`audience-diff:${[...audienceDiff].join(',')}`)
  const modelDiff = symmetricDiff(
    modelVariantTokens(a.name, a.brand),
    modelVariantTokens(b.name, b.brand)
  )
  if (modelDiff.size > 0) flags.push(`model-variant:${[...modelDiff].join(',')}`)
  const tintLetterDiff = symmetricDiff(tintLetterTokens(a.name), tintLetterTokens(b.name))
  if (tintLetterDiff.size > 0) flags.push(`tint-letter:${[...tintLetterDiff].join(',')}`)
  const lA = gammeLetters(a.name)
  const lB = gammeLetters(b.name)
  if (lA.size > 0 && lB.size > 0) {
    const letDiff = symmetricDiff(lA, lB)
    if (letDiff.size > 0 && letDiff.size === lA.size + lB.size) {
      flags.push(`gamme-letter:${[...letDiff].join(',')}`)
    }
  }
  if (!kindEq) flags.push(`kind-diff:${a.kind}/${b.kind}`)

  const conflict = flags.some(
    (f) =>
      f.startsWith('num-diff:') ||
      f.startsWith('tint-diff:') ||
      f.startsWith('gamme-letter:') ||
      f.startsWith('size-mm:') ||
      f.startsWith('color-diff:') ||
      f.startsWith('audience-diff:') ||
      f.startsWith('model-variant:') ||
      f.startsWith('tint-letter:')
  )
  const combined = 0.6 * inci + 0.3 * name + 0.1 * (kindEq ? 1 : 0)

  if (inci >= 0.85 && name >= 0.4 && !conflict) {
    return { tier: 'auto-merge', score: inci, inci, name, flags }
  }
  if (combined >= 0.7 || (inci >= 0.85 && conflict)) {
    return { tier: 'review', score: combined, inci, name, flags }
  }
  if (name >= 0.7) {
    return { tier: 'weak', score: name, inci, name, flags }
  }
  return { tier: null, score: 0, inci, name, flags }
}

function buildDupPair(
  seedA: LoadedSeedFile,
  productA: UnifiedProductSeed,
  seedB: LoadedSeedFile,
  productB: UnifiedProductSeed,
  result: ClassifyResult
): DupPair {
  const sameSize =
    productA.totalAmount === productB.totalAmount && productA.amountUnit === productB.amountUnit
  return {
    a: productRef(seedA, productA),
    b: productRef(seedB, productB),
    tier: result.tier as DupTier,
    inci: result.inci,
    name: result.name,
    score: result.score,
    sameSize,
    flags: result.flags,
  }
}

function blankStats(): SummaryStats {
  return {
    files: 0,
    products: 0,
    emptyDescription: 0,
    emptyNotes: 0,
    emptyImageUrl: 0,
    missingKeyIngredients: 0,
    emptyPrimary: 0,
    primaryOverCap: 0,
    duplicateTagsAcrossBuckets: 0,
    suspiciousNameCasing: 0,
    semanticDuplicateProducts: 0,
  }
}

function addFileToSummary(summary: SummaryStats, file: FileAudit): void {
  summary.files++
  summary.products += file.products
  summary.emptyDescription += file.emptyDescription
  summary.emptyNotes += file.emptyNotes
  summary.emptyImageUrl += file.emptyImageUrl
  summary.missingKeyIngredients += file.missingKeyIngredients
  summary.emptyPrimary += file.emptyPrimary
  summary.primaryOverCap += file.primaryOverCap
  summary.duplicateTagsAcrossBuckets += file.duplicateTagsAcrossBuckets
  summary.suspiciousNameCasing += file.suspiciousNameCasing
  summary.semanticDuplicateProducts += file.semanticDuplicateProducts
}

function groupedSummary(
  files: FileAudit[],
  key: 'source' | 'parent'
): Record<string, SummaryStats> {
  const out: Record<string, SummaryStats> = {}
  for (const file of files) {
    const group = file[key]
    out[group] ??= blankStats()
    addFileToSummary(out[group], file)
  }
  return out
}

function fileAudit(seed: LoadedSeedFile): FileAudit {
  const text = readFileSync(seed.filePath, 'utf-8')
  const sampleSuspiciousNames: FileAudit['sampleSuspiciousNames'] = []
  let emptyDescription = 0
  let emptyNotes = 0
  let emptyImageUrl = 0
  let missingKeyIngredients = 0
  let emptyPrimary = 0
  let primaryOverCap = 0
  let duplicateTagsAcrossBuckets = 0
  let suspiciousNameCasing = 0

  for (const product of seed.products) {
    if (isBlank(product.description)) emptyDescription++
    if (isBlank(product.notes)) emptyNotes++
    if (isBlank(product.imageUrl)) emptyImageUrl++
    if (!product.keyIngredients || product.keyIngredients.length === 0) missingKeyIngredients++
    if (product.tags.primary.length === 0) emptyPrimary++
    if (product.tags.primary.length > 3) primaryOverCap++
    if (tagOverlapCount(product) > 0) duplicateTagsAcrossBuckets++

    const words = suspiciousUppercaseWords(product.name)
    if (words.length > 0) {
      suspiciousNameCasing++
      if (sampleSuspiciousNames.length < 5) {
        sampleSuspiciousNames.push({ slug: product.slug, name: product.name, words })
      }
    }
  }

  return {
    file: seed.relPath,
    source: seed.source,
    parent: seed.parent,
    brandDir: seed.brandDir,
    indexed: seed.indexed,
    products: seed.products.length,
    emptyDescription,
    emptyNotes,
    emptyImageUrl,
    missingKeyIngredients,
    emptyPrimary,
    primaryOverCap,
    duplicateTagsAcrossBuckets,
    suspiciousNameCasing,
    semanticDuplicateProducts: 0,
    markers: {
      autoSuggested: countMatches(text, SOURCE_MARKERS.autoSuggested),
      autoInferred: countMatches(text, SOURCE_MARKERS.autoInferred),
      todo: countMatches(text, SOURCE_MARKERS.todo),
    },
    sampleSuspiciousNames,
  }
}

function productRef(seed: LoadedSeedFile, product: UnifiedProductSeed): ProductRef {
  return {
    file: seed.relPath,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
  }
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|')
}

function renderMarkdown(report: AuditReport): string {
  const lines: string[] = []
  lines.push('# Imported Products Audit')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---:|')
  lines.push(`| Active products | ${report.summary.activeProducts} |`)
  lines.push(`| Imported files | ${report.summary.importedFiles} |`)
  lines.push(`| Imported products | ${report.summary.importedProducts} |`)
  lines.push(`| Empty descriptions | ${report.summary.emptyDescription} |`)
  lines.push(`| Empty notes | ${report.summary.emptyNotes} |`)
  lines.push(`| Empty imageUrl | ${report.summary.emptyImageUrl} |`)
  lines.push(`| Missing keyIngredients | ${report.summary.missingKeyIngredients} |`)
  lines.push(`| Suspicious name casing | ${report.summary.suspiciousNameCasing} |`)
  lines.push(
    `| Imported products w/ a dup candidate | ${report.summary.semanticDuplicateProducts} |`
  )
  lines.push(`| Cross-source duplicate pairs | ${report.crossSourceDuplicates.length} |`)
  lines.push(`| Intra-source duplicate pairs | ${report.intraSourceDuplicates.length} |`)
  lines.push(`| Unindexed imported files | ${report.summary.unindexedImportedFiles} |`)
  lines.push(`| Unreferenced product files | ${report.summary.unreferencedProductFiles} |`)
  lines.push(`| Import errors | ${report.importErrors.length} |`)
  lines.push('')
  lines.push('## By Source')
  lines.push('')
  lines.push(
    '| Source | Files | Products | Empty desc | Missing KI | Empty imageUrl | Casing | Duplicates |'
  )
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|')
  for (const [source, stats] of Object.entries(report.bySource)) {
    lines.push(
      `| ${source} | ${stats.files} | ${stats.products} | ${stats.emptyDescription} | ${stats.missingKeyIngredients} | ${stats.emptyImageUrl} | ${stats.suspiciousNameCasing} | ${stats.semanticDuplicateProducts} |`
    )
  }
  lines.push('')
  lines.push('## Review Priority')
  lines.push('')
  lines.push('| File | Products | Duplicates | Missing KI | Casing | Primary > 3 |')
  lines.push('|---|---:|---:|---:|---:|---:|')
  for (const file of report.reviewPriority.slice(0, 25)) {
    lines.push(
      `| ${escapeMd(file.file)} | ${file.products} | ${file.semanticDuplicateProducts} | ${file.missingKeyIngredients} | ${file.suspiciousNameCasing} | ${file.primaryOverCap} |`
    )
  }
  lines.push('')
  const dupTierCounts = (pairs: DupPair[]): Record<DupTier, number> => ({
    'auto-merge': pairs.filter((p) => p.tier === 'auto-merge').length,
    review: pairs.filter((p) => p.tier === 'review').length,
    weak: pairs.filter((p) => p.tier === 'weak').length,
  })
  const crossCounts = dupTierCounts(report.crossSourceDuplicates)
  const intraCounts = dupTierCounts(report.intraSourceDuplicates)

  lines.push('## Duplicate Detection (cross-source)')
  lines.push('')
  lines.push(
    `Auto-merge candidates: **${crossCounts['auto-merge']}** &middot; Review: **${crossCounts.review}** &middot; Weak: **${crossCounts.weak}**`
  )
  lines.push('')
  const renderDupSection = (title: string, pairs: DupPair[], limit = 30): void => {
    if (pairs.length === 0) return
    lines.push(`### ${title} (${pairs.length})`)
    lines.push('')
    lines.push('| Score | INCI | Name | Same size | A | B | Flags |')
    lines.push('|---:|---:|---:|---|---|---|---|')
    for (const p of pairs.slice(0, limit)) {
      const a = `${escapeMd(p.a.slug)}<br><sub>${escapeMd(p.a.file)}</sub>`
      const b = `${escapeMd(p.b.slug)}<br><sub>${escapeMd(p.b.file)}</sub>`
      const flags = p.flags.length > 0 ? escapeMd(p.flags.join('; ')) : ''
      lines.push(
        `| ${p.score.toFixed(2)} | ${p.inci.toFixed(2)} | ${p.name.toFixed(2)} | ${p.sameSize ? 'yes' : 'no'} | ${a} | ${b} | ${flags} |`
      )
    }
    lines.push('')
  }
  const sortByScore = (a: DupPair, b: DupPair): number => b.score - a.score
  renderDupSection(
    'Auto-merge candidates',
    [...report.crossSourceDuplicates.filter((p) => p.tier === 'auto-merge')].sort(sortByScore)
  )
  renderDupSection(
    'Review candidates',
    [...report.crossSourceDuplicates.filter((p) => p.tier === 'review')].sort(sortByScore)
  )
  renderDupSection(
    'Weak candidates (name-only signal)',
    [...report.crossSourceDuplicates.filter((p) => p.tier === 'weak')].sort(sortByScore)
  )

  if (report.intraSourceDuplicates.length > 0) {
    lines.push('## Intra-source Duplicates (same file imported multiple times)')
    lines.push('')
    lines.push(
      `Auto-merge: **${intraCounts['auto-merge']}** &middot; Review: **${intraCounts.review}** &middot; Weak: **${intraCounts.weak}**`
    )
    lines.push('')
    renderDupSection('Intra-source pairs', [...report.intraSourceDuplicates].sort(sortByScore), 40)
  }

  if (report.importErrors.length > 0) {
    lines.push('## Import Errors')
    lines.push('')
    lines.push('| File | Error |')
    lines.push('|---|---|')
    for (const error of report.importErrors) {
      lines.push(`| ${escapeMd(error.file)} | ${escapeMd(error.error)} |`)
    }
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

function reviewScore(file: FileAudit): number {
  return (
    file.semanticDuplicateProducts * 8 +
    file.missingKeyIngredients * 3 +
    file.primaryOverCap * 2 +
    file.duplicateTagsAcrossBuckets * 2 +
    file.suspiciousNameCasing
  )
}

async function loadActiveProductCount(): Promise<number | null> {
  try {
    const mod = (await import(pathToFileURL(PRODUCTS_INDEX).href)) as Record<string, unknown>
    const allProductData = mod.allProductData
    return Array.isArray(allProductData) ? allProductData.length : null
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const indexedFiles = indexedProductImports()
  const seedFiles = walkSeedFiles(PRODUCTS_DIR).sort()
  const loadedFiles: LoadedSeedFile[] = []

  for (const file of seedFiles) {
    loadedFiles.push(await loadSeedFile(file, indexedFiles.get(file)))
  }

  const imported = loadedFiles.filter((f) => IMPORTED_FILE_RE.test(f.filePath))
  const curatedActive = loadedFiles.filter((f) => f.source === 'curated' && f.indexed)
  const importedAudits = imported.map(fileAudit)

  // Cross-source duplicates: each imported product vs every curated product of the same brand,
  // plus imported vs other imported (different file). Brand-keyed bucket avoids O(N²) blowup.
  const productsByBrand = new Map<
    string,
    Array<{ seed: LoadedSeedFile; product: UnifiedProductSeed }>
  >()
  for (const seed of [...curatedActive, ...imported]) {
    for (const product of seed.products) {
      const key = deburr(product.brand)
      const bucket = productsByBrand.get(key) ?? []
      bucket.push({ seed, product })
      productsByBrand.set(key, bucket)
    }
  }

  const crossSourceDuplicates: DupPair[] = []
  const intraSourceDuplicates: DupPair[] = []
  const seenPairs = new Set<string>()
  const flaggedPerFile = new Map<string, Set<string>>()
  const flagSlug = (file: string, slug: string): void => {
    const bucket = flaggedPerFile.get(file) ?? new Set<string>()
    bucket.add(slug)
    flaggedPerFile.set(file, bucket)
  }

  for (const items of productsByBrand.values()) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const x = items[i]
        const y = items[j]
        const result = classifyPair(x.product, y.product)
        if (!result.tier) continue
        const pairKey = [x.seed.relPath, x.product.slug, y.seed.relPath, y.product.slug]
          .sort()
          .join('||')
        if (seenPairs.has(pairKey)) continue
        seenPairs.add(pairKey)
        const pair = buildDupPair(x.seed, x.product, y.seed, y.product, result)
        if (x.seed.relPath === y.seed.relPath) {
          intraSourceDuplicates.push(pair)
          flagSlug(x.seed.relPath, x.product.slug)
          flagSlug(y.seed.relPath, y.product.slug)
        } else {
          crossSourceDuplicates.push(pair)
          // Only count imported-side files for the per-file priority score.
          if (IMPORTED_FILE_RE.test(x.seed.filePath)) flagSlug(x.seed.relPath, x.product.slug)
          if (IMPORTED_FILE_RE.test(y.seed.filePath)) flagSlug(y.seed.relPath, y.product.slug)
        }
      }
    }
  }

  for (const audit of importedAudits) {
    audit.semanticDuplicateProducts = flaggedPerFile.get(audit.file)?.size ?? 0
  }

  const summary = blankStats()
  for (const file of importedAudits) addFileToSummary(summary, file)

  const unindexedImportedFiles = imported
    .filter((file) => !file.indexed)
    .map((file) => file.relPath)
  const unreferencedProductFiles = loadedFiles
    .filter((file) => !file.indexed)
    .map((file) => file.relPath)

  const activeProductsFromFiles = loadedFiles
    .filter((file) => file.indexed)
    .reduce((total, file) => total + file.products.length, 0)
  const activeProducts = (await loadActiveProductCount()) ?? activeProductsFromFiles
  const importErrors = loadedFiles
    .filter((file) => file.importError)
    .map((file) => ({ file: file.relPath, error: file.importError ?? '' }))

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      activeProducts,
      importedFiles: importedAudits.length,
      importedProducts: summary.products,
      unindexedImportedFiles: unindexedImportedFiles.length,
      unreferencedProductFiles: unreferencedProductFiles.length,
    },
    bySource: groupedSummary(importedAudits, 'source'),
    byParent: groupedSummary(importedAudits, 'parent'),
    reviewPriority: [...importedAudits].sort((a, b) => reviewScore(b) - reviewScore(a)),
    topImportedFiles: [...importedAudits].sort((a, b) => b.products - a.products).slice(0, 20),
    unindexedImportedFiles,
    unreferencedProductFiles,
    crossSourceDuplicates,
    intraSourceDuplicates,
    importErrors,
    files: importedAudits,
  }

  console.log('audit-imported-products')
  console.log(`  active products          : ${report.summary.activeProducts}`)
  console.log(
    `  imported files/products  : ${report.summary.importedFiles}/${report.summary.importedProducts}`
  )
  console.log(`  empty descriptions       : ${report.summary.emptyDescription}`)
  console.log(`  missing keyIngredients   : ${report.summary.missingKeyIngredients}`)
  console.log(`  suspicious name casing   : ${report.summary.suspiciousNameCasing}`)
  const tier = (t: DupTier): number =>
    report.crossSourceDuplicates.filter((p) => p.tier === t).length
  console.log(
    `  cross-source dup pairs   : ${report.crossSourceDuplicates.length} (auto:${tier('auto-merge')} review:${tier('review')} weak:${tier('weak')})`
  )
  console.log(`  intra-source dup pairs   : ${report.intraSourceDuplicates.length}`)
  console.log(`  imported prods w/ dup    : ${report.summary.semanticDuplicateProducts}`)
  console.log(`  unindexed imported files : ${report.summary.unindexedImportedFiles}`)
  console.log(`  unreferenced seed files  : ${report.summary.unreferencedProductFiles}`)
  console.log(`  import errors           : ${report.importErrors.length}`)

  if (WRITE) {
    if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
    writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf-8')
    writeFileSync(MD_REPORT_PATH, renderMarkdown(report), 'utf-8')
    console.log(`  wrote ${relative(SEED_ROOT, JSON_REPORT_PATH)}`)
    console.log(`  wrote ${relative(SEED_ROOT, MD_REPORT_PATH)}`)
  } else {
    console.log('  dry-run. Re-run with --write to write output/imported-products-audit.{json,md}')
  }
}

main().catch((err) => {
  console.error('\nImport audit failed:', err)
  process.exit(1)
})
