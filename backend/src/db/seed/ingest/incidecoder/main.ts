// Targets weak (<70% INCI match-rate) products on 10 brands and pulls clean
// English INCI from INCIDecoder. Three phases: crawl, match, fetch.
//
// Phase 1 (--crawl)  : iterate /brands/<slug>?offset=N until empty, dump
//                       {brand: [{slug,name}]} to /tmp/incidecoder-index.json.
// Phase 2 (--match)  : load DB weak products (<70%), score fuzzy match against
//                       index, write /tmp/incidecoder-matches.json (manual review).
// Phase 3 (--fetch)  : fetch each matched product page, parse #ingredlist-short
//                       <a class="ingred-link">, write /tmp/incidecoder-inci.json.
// Phase 4 (--apply)  : UPDATE products SET inci WHERE slug IN (…). Idempotent
//                       (skips if existing INCI is already a strict superset
//                       in terms of normalized matched ingredients).
//
// Run via: docker exec -w /app/backend -e DATABASE_URL=… app_api bun src/db/seed/ingest/incidecoder/main.ts --crawl

import { SQL } from 'bun'

import { normalize, splitINCI } from 'algo-derm'
import { buildAliasIndex, lookupIngredient, MERGED_EVIDENCE_DB } from 'algo-derm/engine'

const TARGET_BRANDS_DB: Record<string, string> = {
  cosrx: 'cosrx',
  medik8: 'medik8',
  medicube: 'medicube',
  missha: 'missha',
  skin1004: 'skin1004',
  anua: 'anua',
  mixsoon: 'mixsoon',
  'beauty of joseon': 'beauty-of-joseon',
  'round lab': 'round-lab',
  vichy: 'vichy',
}

const INDEX_PATH = '/tmp/incidecoder-index.json'
const MATCH_PATH = '/tmp/incidecoder-matches.json'
const INCI_PATH = '/tmp/incidecoder-inci.json'

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 aurore-seed-bot/1.0'
const FETCH_DELAY_MS = 300

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

type BrandEntry = { slug: string; name: string }
type BrandIndex = Record<string, BrandEntry[]>

function extractBrandProducts(html: string): BrandEntry[] {
  const out = new Map<string, string>()
  const rx = /<a[^>]+href="\/products\/([a-z0-9-]+)"[^>]*>([^<]+)<\/a>/g
  for (const m of html.matchAll(rx)) {
    const slug = m[1]
    const name = m[2].trim()
    if (!out.has(slug)) out.set(slug, name)
  }
  return [...out].map(([slug, name]) => ({ slug, name }))
}

async function crawlBrand(idSlug: string): Promise<BrandEntry[]> {
  const all = new Map<string, string>()
  for (let offset = 0; offset < 20; offset++) {
    const url =
      offset === 0
        ? `https://incidecoder.com/brands/${idSlug}`
        : `https://incidecoder.com/brands/${idSlug}?offset=${offset}`
    const html = await fetchHTML(url)
    const items = extractBrandProducts(html)
    if (items.length === 0) break
    let added = 0
    for (const it of items) {
      if (!all.has(it.slug)) {
        all.set(it.slug, it.name)
        added++
      }
    }
    console.log(`  ${idSlug} offset=${offset} got=${items.length} new=${added}`)
    if (added === 0) break
    await sleep(FETCH_DELAY_MS)
  }
  return [...all].map(([slug, name]) => ({ slug, name }))
}

function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(eu|us|version|new|old|discontinued|set|kit)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function diceScore(a: string, b: string): number {
  const bigrams = (s: string) => {
    const out: string[] = []
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2))
    return out
  }
  const A = bigrams(a)
  const B = bigrams(b)
  if (A.length === 0 || B.length === 0) return 0
  const Bmap = new Map<string, number>()
  for (const x of B) Bmap.set(x, (Bmap.get(x) ?? 0) + 1)
  let inter = 0
  for (const x of A) {
    const c = Bmap.get(x) ?? 0
    if (c > 0) {
      inter++
      Bmap.set(x, c - 1)
    }
  }
  return (2 * inter) / (A.length + B.length)
}

function extractINCIFromProduct(html: string): string[] | null {
  // Locate id="ingredlist-short" container, then grab ingred-link <a> contents in order
  const start = html.indexOf('id="ingredlist-short"')
  if (start === -1) return null
  const end = html.indexOf('id="inci-warning"', start)
  const scope = end > 0 ? html.slice(start, end) : html.slice(start, start + 10000)
  const out: string[] = []
  const rx = /<a[^>]+class="ingred-link[^"]*"[^>]*>([^<]+)<\/a>/g
  for (const m of scope.matchAll(rx)) out.push(m[1].trim())
  return out
}

// ---------- Phase 1: crawl ----------
async function phaseCrawl(): Promise<void> {
  const index: BrandIndex = {}
  for (const idSlug of Object.values(TARGET_BRANDS_DB)) {
    console.log(`\n== crawl ${idSlug} ==`)
    index[idSlug] = await crawlBrand(idSlug)
    console.log(`   total unique: ${index[idSlug].length}`)
  }
  await Bun.write(INDEX_PATH, JSON.stringify(index, null, 2))
  console.log(`\nwrote ${INDEX_PATH}`)
}

// ---------- Phase 2: match ----------
type WeakProduct = {
  slug: string
  name: string
  brand: string
  brandKey: string
  inci: string
  ratio: number
  ings: number
}
type MatchResult = {
  db: WeakProduct
  candidate: BrandEntry | null
  score: number
  url: string | null
}

async function phaseMatch(): Promise<void> {
  const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
  const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')
  const brandKeys = Object.keys(TARGET_BRANDS_DB)
  const rows = await sql<Array<{ slug: string; name: string; brand: string; inci: string }>>`
    SELECT slug, name, brand, inci
    FROM products
    WHERE inci IS NOT NULL AND length(inci) > 10
      AND lower(brand) IN ${sql(brandKeys)}
  `
  const weak: WeakProduct[] = []
  for (const r of rows) {
    const tokens = splitINCI(r.inci).map(normalize).filter(Boolean)
    if (tokens.length < 3) continue
    let mat = 0
    for (const t of tokens) if (lookupIngredient(t, aliasIndex)) mat++
    const ratio = mat / tokens.length
    if (ratio >= 0.7) continue
    const brandKey = r.brand.toLowerCase()
    weak.push({
      slug: r.slug,
      name: r.name,
      brand: r.brand,
      brandKey,
      inci: r.inci,
      ratio,
      ings: tokens.length,
    })
  }
  await sql.end()
  console.log(`weak products: ${weak.length}`)

  const indexRaw = await Bun.file(INDEX_PATH).text()
  const index: BrandIndex = JSON.parse(indexRaw)

  const matches: MatchResult[] = []
  for (const w of weak) {
    const brandSlug = TARGET_BRANDS_DB[w.brandKey]
    const pool = index[brandSlug] ?? []
    const targetSlug = normalizeSlug(
      w.slug.replace(
        /^cosrx-|^medik8-|^medicube-|^missha-|^skin-?1004-|^anua-|^mixsoon-|^beauty-of-joseon-|^round-lab-|^vichy-/,
        ''
      )
    )
    const targetName = normalizeSlug(w.name)
    let best: BrandEntry | null = null
    let bestScore = 0
    for (const c of pool) {
      const cs = normalizeSlug(c.slug.replace(new RegExp(`^${brandSlug}-?`), ''))
      const cn = normalizeSlug(
        c.name.replace(new RegExp(`^${brandSlug.replace(/-/g, ' ')}\\s+`, 'i'), '')
      )
      const score = Math.max(diceScore(targetSlug, cs), diceScore(targetName, cn))
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    matches.push({
      db: w,
      candidate: best,
      score: bestScore,
      url: best ? `https://incidecoder.com/products/${best.slug}` : null,
    })
  }
  matches.sort((a, b) => b.score - a.score)
  await Bun.write(MATCH_PATH, JSON.stringify(matches, null, 2))
  console.log(`wrote ${MATCH_PATH}`)
  const strong = matches.filter((m) => m.score >= 0.75).length
  const medium = matches.filter((m) => m.score >= 0.55 && m.score < 0.75).length
  const weakM = matches.filter((m) => m.score < 0.55).length
  console.log(`score distribution  strong(≥0.75)=${strong}  medium=${medium}  weak=${weakM}`)
  console.log(`\nweakest 15 matches (manual triage):`)
  for (const m of matches.slice(-15)) {
    console.log(`  ${m.score.toFixed(2)}  ${m.db.brand} ${m.db.slug}`)
    console.log(`              -> ${m.candidate?.name ?? '(none)'}  [${m.candidate?.slug ?? ''}]`)
  }
}

// ---------- Phase 3: fetch ----------
type FetchedINCI = { db: WeakProduct; url: string; inci: string[]; rawINCI: string }

async function phaseFetch(scoreThreshold: number): Promise<void> {
  const matchRaw = await Bun.file(MATCH_PATH).text()
  const matches: MatchResult[] = JSON.parse(matchRaw)
  const kept = matches.filter((m) => m.score >= scoreThreshold && m.url)
  console.log(`fetching ${kept.length} products (threshold ${scoreThreshold})`)
  const out: FetchedINCI[] = []
  let i = 0
  for (const m of kept) {
    i++
    try {
      const html = await fetchHTML(m.url!)
      const inci = extractINCIFromProduct(html)
      if (!inci || inci.length === 0) {
        console.log(`  [${i}/${kept.length}] EMPTY ${m.db.slug}`)
        continue
      }
      out.push({ db: m.db, url: m.url!, inci, rawINCI: inci.join(', ') })
      console.log(`  [${i}/${kept.length}] ${m.db.slug}  (${inci.length} ings)`)
    } catch (e) {
      console.log(`  [${i}/${kept.length}] ERROR ${m.db.slug} :: ${(e as Error).message}`)
    }
    await sleep(FETCH_DELAY_MS)
  }
  await Bun.write(INCI_PATH, JSON.stringify(out, null, 2))
  console.log(`wrote ${INCI_PATH} (${out.length} products)`)
}

// ---------- Phase 4: apply ----------
async function phaseApply(): Promise<void> {
  const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
  const raw = await Bun.file(INCI_PATH).text()
  const data: FetchedINCI[] = JSON.parse(raw)
  const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')
  let updated = 0
  let skipped = 0
  for (const p of data) {
    const newRatio =
      p.inci.filter((t) => lookupIngredient(normalize(t), aliasIndex)).length / p.inci.length
    if (newRatio < p.db.ratio + 0.05) {
      console.log(
        `  skip (no gain) ${p.db.slug}  old=${(p.db.ratio * 100).toFixed(0)}% new=${(newRatio * 100).toFixed(0)}%`
      )
      skipped++
      continue
    }
    await sql`UPDATE products SET inci = ${p.rawINCI}, updated_at = now() WHERE slug = ${p.db.slug}`
    console.log(
      `  upd ${p.db.slug}  ${(p.db.ratio * 100).toFixed(0)}% -> ${(newRatio * 100).toFixed(0)}%`
    )
    updated++
  }
  await sql.end()
  console.log(`\nupdated=${updated}  skipped=${skipped}  total=${data.length}`)
}

// ---------- main ----------
const args = process.argv.slice(2)
if (args.includes('--crawl')) await phaseCrawl()
else if (args.includes('--match')) await phaseMatch()
else if (args.includes('--fetch')) {
  const t = parseFloat(args[args.indexOf('--fetch') + 1] ?? '0.75')
  await phaseFetch(isFinite(t) && t > 0 ? t : 0.75)
} else if (args.includes('--apply')) await phaseApply()
else {
  console.log('Usage: --crawl | --match | --fetch [threshold=0.75] | --apply')
  process.exit(1)
}
