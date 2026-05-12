// Upsert curated brand-level certifications (T4.B). Idempotent — safe to
// re-run after editing `data/brand-certifications.ts`. Existing rows have
// their boolean flags + sources merged (incoming sources win per claim;
// flags follow the curated row of truth).
//
// OBF / PETA / Leaping Bunny ingestion (T4.D, T4.E) will use the same target
// table but with `source ∈ {'obf','peta','leaping-bunny'}` so the manual seed
// stays distinguishable in `sources` jsonb.
//
// Usage:
//   bun run backend/src/db/seed/seeders/seed-brand-certifications.ts          # dry-run
//   bun run backend/src/db/seed/seeders/seed-brand-certifications.ts --write  # apply

import { sql } from 'drizzle-orm'

import { db } from '../..'
import { brandCertifications } from '../../schema'
import { BRAND_CERTIFICATION_INSERTS } from '../data/brand-certifications'

const WRITE = process.argv.includes('--write')

async function main() {
  console.log('🏷  Seed brand-certifications')
  console.log(
    `   mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · ${BRAND_CERTIFICATION_INSERTS.length} curated brands\n`
  )

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  let totalVegan = 0
  let totalCrueltyFree = 0
  let totalNatural = 0
  for (const r of BRAND_CERTIFICATION_INSERTS) {
    if (r.isVegan) totalVegan++
    if (r.isCrueltyFree) totalCrueltyFree++
    if (r.isNaturalCertified) totalNatural++
  }
  console.log(`   vegan         : ${totalVegan}`)
  console.log(`   cruelty-free  : ${totalCrueltyFree}`)
  console.log(`   natural-cert  : ${totalNatural}\n`)

  if (!WRITE) {
    console.log('Run avec --write pour appliquer.')
    return
  }

  const CHUNK = 200
  let upserted = 0
  for (let i = 0; i < BRAND_CERTIFICATION_INSERTS.length; i += CHUNK) {
    const chunk = BRAND_CERTIFICATION_INSERTS.slice(i, i + CHUNK)
    await db
      .insert(brandCertifications)
      .values(chunk)
      .onConflictDoUpdate({
        target: brandCertifications.brandNormalized,
        set: {
          brandDisplay: sql`excluded.brand_display`,
          isVegan: sql`excluded.is_vegan`,
          isCrueltyFree: sql`excluded.is_cruelty_free`,
          isNaturalCertified: sql`excluded.is_natural_certified`,
          sources: sql`excluded.sources`,
          notes: sql`excluded.notes`,
        },
      })
    upserted += chunk.length
  }

  console.log(`✅ ${upserted} marques upsert.\n`)
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
