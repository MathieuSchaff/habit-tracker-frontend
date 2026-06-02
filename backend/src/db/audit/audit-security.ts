/**
 * Scans existing DB rows for suspicious content that pre-dates the safeUrl/HTML
 * validation introduced in the security hardening pass.
 *
 * Run with: bun run src/db/audit/audit-security.ts
 * Env:
 *   CSV_OUT=/tmp/findings.csv: export all findings to CSV
 *   WRITE=1: apply auto-fixes for high-severity fixable findings
 */

import { writeFile } from 'node:fs/promises'

import { eq } from 'drizzle-orm'

import type { DB } from '..'
import { db } from '..'
import { profiles } from '../schema/auth/users'
import { articles } from '../schema/blog/articles'
import { products } from '../schema/products/products'
import {
  EMBEDDED_URL_RE,
  hasDangerousHtmlContent,
  hasSuspiciousHtml,
  isHttpUrl,
  isMaliciousUrl,
  preview,
  stripHtml,
} from './audit-security-helpers'

type Severity = 'high' | 'low'

type Finding = {
  description: string
  severity: Severity
  table: string
  identifier: string
  field: string
  value: string
  fixable: boolean
  applyFix?: () => Promise<void>
}

type CheckResult = { name: string; findings: Finding[] }
type Checker = (db: DB) => Promise<CheckResult>

async function checkProductUrls(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      url: products.url,
      imageUrl: products.imageUrl,
    })
    .from(products)

  const findings: Finding[] = []
  for (const row of rows) {
    const url = row.url
    if (isMaliciousUrl(url))
      findings.push({
        description: `product ${row.slug} — url: ${preview(url)}`,
        severity: 'high',
        table: 'products',
        identifier: row.slug,
        field: 'url',
        value: url,
        fixable: true,
        applyFix: async () => {
          await db.update(products).set({ url: null }).where(eq(products.id, row.id))
        },
      })
    const imageUrl = row.imageUrl
    if (isMaliciousUrl(imageUrl))
      findings.push({
        description: `product ${row.slug} — imageUrl: ${preview(imageUrl)}`,
        severity: 'high',
        table: 'products',
        identifier: row.slug,
        field: 'imageUrl',
        value: imageUrl,
        fixable: true,
        applyFix: async () => {
          await db.update(products).set({ imageUrl: null }).where(eq(products.id, row.id))
        },
      })
  }
  return { name: 'product-urls', findings }
}

async function checkProductTextFields(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      inci: products.inci,
      description: products.description,
      notes: products.notes,
    })
    .from(products)

  const findings: Finding[] = []
  for (const row of rows) {
    for (const field of ['inci', 'description', 'notes'] as const) {
      const val = row[field]
      if (!hasSuspiciousHtml(val)) continue
      findings.push({
        description: `product ${row.slug} — ${field}: ${preview(val)}`,
        severity: 'high',
        table: 'products',
        identifier: row.slug,
        field,
        value: val,
        fixable: true,
        applyFix: async () => {
          await db
            .update(products)
            .set({ [field]: stripHtml(val) })
            .where(eq(products.id, row.id))
        },
      })
    }
  }
  return { name: 'product-text-fields', findings }
}

// name and brand are rendered in product cards, worth auditing even though React
// auto-escapes JSX (guards against future unsafe render patterns).
async function checkProductNameFields(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ id: products.id, slug: products.slug, name: products.name, brand: products.brand })
    .from(products)

  const findings: Finding[] = []
  for (const row of rows) {
    if (hasSuspiciousHtml(row.name))
      findings.push({
        description: `product ${row.slug} — name: ${preview(row.name)}`,
        severity: 'high',
        table: 'products',
        identifier: row.slug,
        field: 'name',
        value: row.name,
        fixable: true,
        applyFix: async () => {
          await db
            .update(products)
            .set({ name: stripHtml(row.name) })
            .where(eq(products.id, row.id))
        },
      })
    if (hasSuspiciousHtml(row.brand))
      findings.push({
        description: `product ${row.slug} — brand: ${preview(row.brand)}`,
        severity: 'high',
        table: 'products',
        identifier: row.slug,
        field: 'brand',
        value: row.brand,
        fixable: true,
        applyFix: async () => {
          await db
            .update(products)
            .set({ brand: stripHtml(row.brand) })
            .where(eq(products.id, row.id))
        },
      })
  }
  return { name: 'product-name-fields', findings }
}

async function checkProfileUrls(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ userId: profiles.userId, avatarUrl: profiles.avatarUrl, links: profiles.links })
    .from(profiles)

  const findings: Finding[] = []
  for (const row of rows) {
    const avatarUrl = row.avatarUrl
    if (isMaliciousUrl(avatarUrl))
      findings.push({
        description: `profile ${row.userId} — avatarUrl: ${preview(avatarUrl)}`,
        severity: 'high',
        table: 'profiles',
        identifier: row.userId,
        field: 'avatarUrl',
        value: avatarUrl,
        fixable: true,
        applyFix: async () => {
          await db.update(profiles).set({ avatarUrl: null }).where(eq(profiles.userId, row.userId))
        },
      })
    for (const link of row.links ?? []) {
      if (!isMaliciousUrl(link.url)) continue
      const maliciousUrl = link.url
      findings.push({
        description: `profile ${row.userId} — links[].url: ${preview(maliciousUrl)}`,
        severity: 'high',
        table: 'profiles',
        identifier: row.userId,
        field: 'links[].url',
        value: maliciousUrl,
        fixable: true,
        // Re-fetch current links to avoid clobbering concurrent fixes on the same profile.
        applyFix: async () => {
          const current = await db
            .select({ links: profiles.links })
            .from(profiles)
            .where(eq(profiles.userId, row.userId))
          const cleanLinks = (current[0]?.links ?? []).filter((l) => l.url !== maliciousUrl)
          await db
            .update(profiles)
            .set({ links: cleanLinks })
            .where(eq(profiles.userId, row.userId))
        },
      })
    }
  }
  return { name: 'profile-urls', findings }
}

async function checkProfileTextFields(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ userId: profiles.userId, bio: profiles.bio, username: profiles.username })
    .from(profiles)

  const findings: Finding[] = []
  for (const row of rows) {
    for (const field of ['bio', 'username'] as const) {
      const val = row[field]
      if (!hasSuspiciousHtml(val)) continue
      findings.push({
        description: `profile ${row.userId} — ${field}: ${preview(val)}`,
        severity: 'high',
        table: 'profiles',
        identifier: row.userId,
        field,
        value: val,
        fixable: true,
        applyFix: async () => {
          await db
            .update(profiles)
            .set({ [field]: stripHtml(val) })
            .where(eq(profiles.userId, row.userId))
        },
      })
    }
  }
  return { name: 'profile-text-fields', findings }
}

async function checkArticleUrls(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ id: articles.id, slug: articles.slug, coverImageUrl: articles.coverImageUrl })
    .from(articles)

  const findings: Finding[] = []
  for (const row of rows) {
    const coverImageUrl = row.coverImageUrl
    if (isMaliciousUrl(coverImageUrl))
      findings.push({
        description: `article ${row.slug} — coverImageUrl: ${preview(coverImageUrl)}`,
        severity: 'high',
        table: 'articles',
        identifier: row.slug,
        field: 'coverImageUrl',
        value: coverImageUrl,
        fixable: true,
        applyFix: async () => {
          await db.update(articles).set({ coverImageUrl: null }).where(eq(articles.id, row.id))
        },
      })
  }
  return { name: 'article-urls', findings }
}

async function checkArticleTitles(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
    })
    .from(articles)

  const findings: Finding[] = []
  for (const row of rows) {
    for (const field of ['title', 'excerpt'] as const) {
      const val = row[field]
      if (!hasSuspiciousHtml(val)) continue
      findings.push({
        description: `article ${row.slug} — ${field}: ${preview(val)}`,
        severity: 'high',
        table: 'articles',
        identifier: row.slug,
        field,
        value: val,
        fixable: true,
        applyFix: async () => {
          await db
            .update(articles)
            .set({ [field]: stripHtml(val) })
            .where(eq(articles.id, row.id))
        },
      })
    }
  }
  return { name: 'article-titles', findings }
}

// Article content is expected to contain HTML, look for dangerous patterns only.
// Not auto-fixable: stripping content blindly could corrupt the article.
async function checkArticleContent(db: DB): Promise<CheckResult> {
  const rows = await db.select({ slug: articles.slug, content: articles.content }).from(articles)

  const findings: Finding[] = []
  for (const row of rows) {
    if (hasDangerousHtmlContent(row.content))
      findings.push({
        description: `article ${row.slug} — content contains dangerous pattern`,
        severity: 'high',
        table: 'articles',
        identifier: row.slug,
        field: 'content',
        value: '(see DB)',
        fixable: false,
      })
  }
  return { name: 'article-content', findings }
}

// Non-HTTPS URLs: low severity, not auto-fixed (could break the link).
async function checkNonHttpsUrls(db: DB): Promise<CheckResult> {
  const findings: Finding[] = []

  const productRows = await db
    .select({ slug: products.slug, url: products.url, imageUrl: products.imageUrl })
    .from(products)
  for (const row of productRows) {
    const url = row.url
    if (isHttpUrl(url))
      findings.push({
        description: `product ${row.slug} — url: ${preview(url)}`,
        severity: 'low',
        table: 'products',
        identifier: row.slug,
        field: 'url',
        value: url,
        fixable: false,
      })
    const imageUrl = row.imageUrl
    if (isHttpUrl(imageUrl))
      findings.push({
        description: `product ${row.slug} — imageUrl: ${preview(imageUrl)}`,
        severity: 'low',
        table: 'products',
        identifier: row.slug,
        field: 'imageUrl',
        value: imageUrl,
        fixable: false,
      })
  }

  const profileRows = await db
    .select({ userId: profiles.userId, avatarUrl: profiles.avatarUrl, links: profiles.links })
    .from(profiles)
  for (const row of profileRows) {
    const avatarUrl = row.avatarUrl
    if (isHttpUrl(avatarUrl))
      findings.push({
        description: `profile ${row.userId} — avatarUrl: ${preview(avatarUrl)}`,
        severity: 'low',
        table: 'profiles',
        identifier: row.userId,
        field: 'avatarUrl',
        value: avatarUrl,
        fixable: false,
      })
    for (const link of row.links ?? []) {
      if (isHttpUrl(link.url))
        findings.push({
          description: `profile ${row.userId} — links[].url: ${preview(link.url)}`,
          severity: 'low',
          table: 'profiles',
          identifier: row.userId,
          field: 'links[].url',
          value: link.url,
          fixable: false,
        })
    }
  }

  const articleRows = await db
    .select({ slug: articles.slug, coverImageUrl: articles.coverImageUrl })
    .from(articles)
  for (const row of articleRows) {
    const coverImageUrl = row.coverImageUrl
    if (isHttpUrl(coverImageUrl))
      findings.push({
        description: `article ${row.slug} — coverImageUrl: ${preview(coverImageUrl)}`,
        severity: 'low',
        table: 'articles',
        identifier: row.slug,
        field: 'coverImageUrl',
        value: coverImageUrl,
        fixable: false,
      })
  }

  return { name: 'non-https-urls (LOW)', findings }
}

// Embedded URLs in text: spam vector. Not auto-fixed, needs human decision.
async function checkEmbeddedUrlsInText(db: DB): Promise<CheckResult> {
  const findings: Finding[] = []

  const productRows = await db
    .select({ slug: products.slug, description: products.description, notes: products.notes })
    .from(products)
  for (const row of productRows) {
    for (const field of ['description', 'notes'] as const) {
      const val = row[field]
      if (val && EMBEDDED_URL_RE.test(val))
        findings.push({
          description: `product ${row.slug} — ${field}: ${preview(val)}`,
          severity: 'low',
          table: 'products',
          identifier: row.slug,
          field,
          value: val,
          fixable: false,
        })
    }
  }

  const profileRows = await db.select({ userId: profiles.userId, bio: profiles.bio }).from(profiles)
  for (const row of profileRows) {
    const bio = row.bio
    if (bio && EMBEDDED_URL_RE.test(bio))
      findings.push({
        description: `profile ${row.userId} — bio: ${preview(bio)}`,
        severity: 'low',
        table: 'profiles',
        identifier: row.userId,
        field: 'bio',
        value: bio,
        fixable: false,
      })
  }

  const articleRows = await db
    .select({ slug: articles.slug, excerpt: articles.excerpt })
    .from(articles)
  for (const row of articleRows) {
    const excerpt = row.excerpt
    if (excerpt && EMBEDDED_URL_RE.test(excerpt))
      findings.push({
        description: `article ${row.slug} — excerpt: ${preview(excerpt)}`,
        severity: 'low',
        table: 'articles',
        identifier: row.slug,
        field: 'excerpt',
        value: excerpt,
        fixable: false,
      })
  }

  return { name: 'embedded-urls-in-text (LOW)', findings }
}

const checkers: Checker[] = [
  checkProductUrls,
  checkProductTextFields,
  checkProductNameFields,
  checkProfileUrls,
  checkProfileTextFields,
  checkArticleUrls,
  checkArticleTitles,
  checkArticleContent,
  checkNonHttpsUrls,
  checkEmbeddedUrlsInText,
]

const MAX_LINES = 30

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

async function main() {
  const WRITE = process.env.WRITE === '1'
  const CSV_OUT = process.env.CSV_OUT

  console.log(
    `🔍 Security audit — scanning DB for suspicious content…${WRITE ? ' [WRITE MODE]' : ''}\n`
  )

  const results = await Promise.all(checkers.map((c) => c(db)))
  const allFindings = results.flatMap((r) => r.findings)

  let totalHigh = 0
  let totalLow = 0

  for (const r of results) {
    if (r.findings.length === 0) {
      console.log(`✓ ${r.name}`)
      continue
    }
    const isLow = r.findings.every((f) => f.severity === 'low')
    if (isLow) {
      totalLow += r.findings.length
      console.log(`ℹ️  ${r.name} (${r.findings.length} finding(s))`)
    } else {
      totalHigh += r.findings.length
      console.log(`⚠️  ${r.name} (${r.findings.length} finding(s))`)
    }
    for (const f of r.findings.slice(0, MAX_LINES)) {
      const tag = f.fixable ? '[auto-fix]' : '[manual]'
      console.log(`   ${tag} ${f.description}`)
    }
    if (r.findings.length > MAX_LINES) console.log(`   … and ${r.findings.length - MAX_LINES} more`)
    console.log()
  }

  if (CSV_OUT) {
    const header = 'severity,table,identifier,field,value,fixable'
    const rows = allFindings.map((f) =>
      [
        f.severity.toUpperCase(),
        f.table,
        f.identifier,
        f.field,
        csvEscape(f.value),
        f.fixable ? 'yes' : 'no',
      ].join(',')
    )
    await writeFile(CSV_OUT, [header, ...rows].join('\n'))
    console.log(`📄 CSV written to ${CSV_OUT} (${allFindings.length} rows)\n`)
  }

  if (WRITE) {
    const fixable = allFindings.filter(
      (f): f is Finding & { applyFix: NonNullable<Finding['applyFix']> } =>
        f.severity === 'high' && f.fixable && f.applyFix !== undefined
    )
    if (fixable.length === 0) {
      console.log('✓ No auto-fixable high-severity findings')
    } else {
      console.log(`🔧 Applying ${fixable.length} fix(es)…`)
      let fixed = 0
      let failed = 0
      for (const f of fixable) {
        try {
          await f.applyFix()
          console.log(`   ✓ fixed: ${f.description}`)
          fixed++
        } catch (err) {
          console.error(
            `   ✗ failed: ${f.description} — ${err instanceof Error ? err.message : err}`
          )
          failed++
        }
      }
      console.log(`\n🔧 ${fixed} fixed, ${failed} failed`)
    }
    const manualHigh = allFindings.filter((f) => f.severity === 'high' && !f.fixable)
    if (manualHigh.length > 0) {
      console.warn(
        `⚠️  ${manualHigh.length} high-severity finding(s) require manual review (not auto-fixable)`
      )
    }
  }

  console.log()
  if (totalLow > 0)
    console.log(`ℹ️  ${totalLow} low-severity finding(s) — review manually or export via CSV_OUT`)
  if (totalHigh === 0) {
    console.log('✓ No high-severity content found')
  } else if (!WRITE) {
    console.warn(
      `⚠️  ${totalHigh} high-severity finding(s) — run with WRITE=1 to auto-fix, or export via CSV_OUT`
    )
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
