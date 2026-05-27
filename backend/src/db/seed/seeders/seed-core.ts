import { type ProductKind, SKINCARE_INGREDIENT_CATEGORY_VALUES } from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { count, sql } from 'drizzle-orm'

import { detectAllAutoTags, partitionEczemaReview } from '../../../features/auto-tagging'
import { addTagToIngredient } from '../../../features/ingredient-tags/service'
import { createIngredient } from '../../../features/ingredients/service'
import { addTagToProduct } from '../../../features/product-tags/service'
import { addIngredientToProduct } from '../../../features/products/product-ingredients/product-ingredients.service'
import { createProduct } from '../../../features/products/service'
import { db } from '../..'
import {
  brandCertifications,
  ingredientDermoProfiles,
  ingredients,
  ingredientTagLinks,
  ingredientTagTypes,
  productIngredients,
  products,
  productTagLinks,
  productTagTypes,
} from '../../schema'
import { BRAND_CERTIFICATION_INSERTS } from '../data/brand-certifications'
import { ingredientTagMap } from '../data/ingredient-tags'
import { ingredientData } from '../data/ingredients'
import { FILLER_SLUGS } from '../data/ingredients/skincare/seed-dermo-profiles-fillers'
import { allIngredientProductTags, allProductData, allProductTagsMap } from '../data/products'
import { ingredientTagData, productTagData } from '../data/tags'
import { type ProductTagGroups, seedBatch, toNumeric, toText } from '../utils/batch'
import { cleanDatabase, fetchIdMaps, flattenTagGroups } from '../utils/id-maps'
import { printValidationReport, validateAllIngredients } from '../utils/markdown-validator'
import { getOrCreateSeedUser } from './create-user'
import { seedBlog } from './seed-blog'
import { seedTestUsers } from './seed-test-users'
import { seedUserCollection } from './seed-user-collection'

// Utilitaires de Validation

// Lookup in a slug→id map after `pruneRelationshipPairs` guaranteed the key
// exists. A miss here means the prune step is broken, so throw loudly.
function requireId(map: Map<string, string>, key: string, entity: string): string {
  const id = map.get(key)
  if (id === undefined) throw new Error(`Missing ${entity} id for slug "${key}"`)
  return id
}

function warnInvalidEntries() {
  const invalid = allIngredientProductTags.filter((i) => !i.ingredientSlug)
  if (invalid.length === 0) return

  console.warn(`\n⚠️  ${invalid.length} entrée(s) avec ingredientSlug manquant :`)
  for (const i of invalid) {
    console.warn(`  → product=${i.productSlug}`)
  }
  console.warn('  Vérifie que la propriété est bien nommée "slug" dans les fichiers source.\n')
}

// Dedupe (slug, tagSlug) pairs — keeps the first relevance seen. Silent
// collapse instead of throwing: the obsolete-tag remap and the native
// category backfill both legitimately produce identical pairs, and the
// DB treats a re-tag as idempotent.
function dedupPairs<T extends { slug: string; tagSlug: string }>(pairs: T[], label: string): T[] {
  const seen = new Set<string>()
  const kept: T[] = []
  for (const pair of pairs) {
    const key = `${pair.slug}::${pair.tagSlug}`
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(pair)
  }
  const dupes = pairs.length - kept.length
  if (dupes > 0) console.log(`ℹ️  ${dupes} doublon(s) ${label} fusionné(s)`)
  return kept
}

// Filters a relationship pair list to rows whose left AND right slug
// resolved to a created entity. Unresolved slugs are reported once per
// entity as warnings — the seed keeps going with the valid subset instead
// of aborting on the first stale reference.
function pruneRelationshipPairs<T extends Record<string, unknown>>(
  pairs: T[],
  leftSlugField: string,
  rightSlugField: string,
  leftMap: Map<string, string>,
  rightMap: Map<string, string>,
  leftEntityName: string,
  rightEntityName: string
): T[] {
  const missingLeft = new Set<string>()
  const missingRight = new Set<string>()
  const kept: T[] = []

  for (const pair of pairs) {
    const leftSlug = pair[leftSlugField]
    const rightSlug = pair[rightSlugField]
    const leftOk = typeof leftSlug === 'string' && leftMap.has(leftSlug)
    const rightOk = typeof rightSlug === 'string' && rightMap.has(rightSlug)

    if (!leftOk && typeof leftSlug === 'string') missingLeft.add(leftSlug)
    if (!rightOk && typeof rightSlug === 'string') missingRight.add(rightSlug)

    if (leftOk && rightOk) kept.push(pair)
  }

  if (missingLeft.size > 0) {
    console.warn(
      `\n⚠️  ${missingLeft.size} ${leftEntityName}(s) référencés mais non créés (ignorés) :`
    )
    for (const s of missingLeft) {
      console.warn(`   - ${s}`)
    }
  }

  if (missingRight.size > 0) {
    console.warn(
      `\n⚠️  ${missingRight.size} ${rightEntityName}(s) référencés mais non créés (ignorés) :`
    )
    for (const s of missingRight) {
      console.warn(`   - ${s}`)
    }
  }

  return kept
}

// Fonction Principale

// Reproduces createProduct's slug derivation for filtering (input.slug ??
// `${name}-${brand}`, then slugify). Needed because seed product entries can
// omit slug — the filter against existingProductSlugs has to compare the
// same canonical form the insert path would produce.
function computeProductSlug(input: { name: string; brand: string; slug?: string }): string {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const brand = input.brand.trim().replace(/\s+/g, ' ')
  const raw = input.slug ?? `${name}${brand ? `-${brand}` : ''}`
  return slugify(raw)
}

export async function seedCore(shouldClean = false) {
  const idempotent = !shouldClean
  console.log(
    `🌱 Démarrage du seed CORE (Données de base + Produits manuels)${idempotent ? ' [idempotent]' : ' [RESET — table truncate]'}...\n`
  )

  // All inserts are atomic: if anything fails mid-way the DB rolls back cleanly
  await db.transaction(async (tx) => {
    // Bypass RLS for the seeder session (owner role)
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)

    if (shouldClean) {
      // Mismatch guard: if the target DB already holds more products than
      // the JS seed files would re-insert, the operator probably wired the
      // wrong DB (e.g. dev instead of test) — refuse unless they opt in
      // explicitly with `SEED_FORCE_RESET=1`. The 2026-05-07 incident is
      // exactly this scenario: dev DB had 3137 snapshot products, seed had
      // 469 squelettes, and the truncate destroyed 2668 rows.
      const [{ value: dbProductCount }] = await tx.select({ value: count() }).from(products)
      const seedProductCount = allProductData.length
      if (dbProductCount > seedProductCount && process.env.SEED_FORCE_RESET !== '1') {
        throw new Error(
          `Refus du --reset : la DB cible contient ${dbProductCount} produits, le seed JS n'en fournit que ${seedProductCount}. ` +
            `Vraisemblablement la mauvaise DB (dev au lieu de test ?). ` +
            `Si tu es sûr, relance avec SEED_FORCE_RESET=1. ` +
            `Pour récupérer une DB dev écrasée : make db-snapshot-load.`
        )
      }
      warnInvalidEntries()
      await cleanDatabase(tx)
    }

    console.log("👤 Création de l'utilisateur seed...")
    const user = await getOrCreateSeedUser()
    console.log(`✅ Utilisateur seed : ${user.email} (${user.id})\n`)

    // In idempotent mode we can't rely on per-row try/catch for uniqueness:
    // Promise.allSettled in `seedBatch` runs inserts concurrently and a single
    // unique-violation aborts the outer transaction so every later insert
    // cascade-fails ("current transaction is aborted"). SAVEPOINTs would fix
    // the abort but Drizzle's nested-tx counter races under concurrency
    // ("savepoint sN does not exist"). So we pre-fetch existing slugs/pairs
    // and filter the seed inputs before they ever hit the DB.
    let existingIngredientSlugs = new Set<string>()
    let existingProductSlugs = new Set<string>()
    let existingTagProductPairs = new Set<string>()
    let existingTagIngredientPairs = new Set<string>()
    let existingProductIngredientPairs = new Set<string>()

    if (idempotent) {
      console.log('🔎 Lecture de l’état DB existant pour pré-filtrage...')
      const [existIng, existProd, existTagProd, existTagIng, existProdIng] = await Promise.all([
        tx.select({ slug: ingredients.slug }).from(ingredients),
        tx.select({ slug: products.slug }).from(products),
        tx
          .select({ pId: productTagLinks.productId, tId: productTagLinks.productTagId })
          .from(productTagLinks),
        tx
          .select({ iId: ingredientTagLinks.ingredientId, tId: ingredientTagLinks.ingredientTagId })
          .from(ingredientTagLinks),
        tx
          .select({ pId: productIngredients.productId, iId: productIngredients.ingredientId })
          .from(productIngredients),
      ])
      existingIngredientSlugs = new Set(existIng.map((r) => r.slug))
      existingProductSlugs = new Set(existProd.map((r) => r.slug))
      existingTagProductPairs = new Set(existTagProd.map((r) => `${r.pId}::${r.tId}`))
      existingTagIngredientPairs = new Set(existTagIng.map((r) => `${r.iId}::${r.tId}`))
      existingProductIngredientPairs = new Set(existProdIng.map((r) => `${r.pId}::${r.iId}`))
      console.log(
        `   Existant : ${existingIngredientSlugs.size} ingrédients · ${existingProductSlugs.size} produits · ${existingTagProductPairs.size} tag-products · ${existingTagIngredientPairs.size} tag-ingredients · ${existingProductIngredientPairs.size} product-ingredients`
      )
    }

    // Validate markdown before touching the DB
    console.log('🔍 Validation du markdown des ingrédients...')
    const ingredientValidation = validateAllIngredients(ingredientData)
    printValidationReport(ingredientValidation)

    if (ingredientValidation.summary.valid === 0 && ingredientData.length > 0) {
      throw new Error('Aucun ingrédient valide - Seed interrompu')
    }
    const correctedIngredientData = ingredientValidation.fixed

    // Prepare relation pairs (pure data, no DB) so we can validate before the transaction.
    // `source: 'manual'` marks curated rows so a later auto-tag retag preserves them
    // (write.ts deletes only `source != 'manual'` for the product).
    const manualProductTagPairs = flattenTagGroups(
      allProductTagsMap as Record<string, ProductTagGroups>
    ).map((p) => ({ ...p, source: 'manual' as const }))

    // Auto-derive product tags via the shared orchestrator (10 ordered layers,
    // including percent-claim, interaction, brand, and peau-normale in addition
    // to algo-derm/actif-class/kind/formula/cross-signal/avoid) running on every
    // skincare/solaire/bodycare product. Single source of truth shared with
    // `features/auto-tagging/runners/backfill/main.ts` — seed-core followed by a
    // backfill re-run is a no-op on auto-tag pairs (parity test
    // `features/auto-tagging/tests/auto-tag-orchestrator-parity.test.ts`
    // enforces this contract).
    // Brand certifications are inserted later in this same transaction, but
    // the auto-tag pass runs in-memory (no DB read). Build the lookup
    // straight from the curated list. The Insert shape has booleans
    // optional (DB defaults) — coerce to Select shape so the orchestrator's
    // ReadonlyMap<string, BrandCertification> type matches.
    const brandCertMap = new Map(
      BRAND_CERTIFICATION_INSERTS.map((r) => [
        r.brandNormalized,
        {
          brandNormalized: r.brandNormalized,
          brandDisplay: r.brandDisplay,
          isVegan: r.isVegan ?? false,
          isCrueltyFree: r.isCrueltyFree ?? false,
          isNaturalCertified: r.isNaturalCertified ?? false,
          sources: r.sources ?? {},
          notes: r.notes ?? null,
          updatedAt: new Date().toISOString(),
        },
      ])
    )

    const secondaryBySource: Record<string, number> = {
      'algo-derm': 0,
      'actif-class': 0,
      kind: 0,
      formula: 0,
      'cross-signal': 0,
      'percent-claim': 0,
      brand: 0,
    }
    // `'cross-signal'` source overlaps between secondary and avoid streams —
    // disambiguate by AutoTagPair.relevance.
    const avoidBySource: Record<string, number> = {
      'algo-derm': 0,
      'cross-signal': 0,
      interaction: 0,
    }
    const autoSecondaryPairs: {
      slug: string
      tagSlug: string
      relevance: 'secondary'
      source: string
    }[] = []
    const avoidPairs: {
      slug: string
      tagSlug: string
      relevance: 'avoid'
      source: string
    }[] = []
    // Sentinel queue: products whose description names atopy under a
    // contraindication. The eczema-atopie tag is withheld (it would invert the
    // claim) and the product is surfaced for manual review at end of run.
    // Guards the future import, see partitionEczemaReview.
    const eczemaReviewQueue: { slug: string; name: string; description: string }[] = []
    const percentClaimsByProduct = new Map<
      string,
      {
        ingredientSlug: string
        concentrationValue: number
        concentrationUnit: string
      }[]
    >()
    for (const row of allIngredientProductTags) {
      if (!row.ingredientSlug || row.concentrationValue == null || !row.concentrationUnit) continue
      const arr = percentClaimsByProduct.get(row.productSlug) ?? []
      arr.push({
        ingredientSlug: row.ingredientSlug,
        concentrationValue: Number(row.concentrationValue),
        concentrationUnit: row.concentrationUnit,
      })
      percentClaimsByProduct.set(row.productSlug, arr)
    }
    for (const product of allProductData) {
      const inci = (product as { inci?: string | null }).inci
      const name = (product as { name?: string | null }).name
      const description = (product as { description?: string | null }).description
      const pairs = detectAllAutoTags(
        {
          inci,
          kind: product.kind as ProductKind,
          category: product.category,
          brand: product.brand,
          name,
          description,
          percentClaims: percentClaimsByProduct.get(product.slug) ?? [],
        },
        { brandCertifications: brandCertMap }
      )
      const { kept, withheld } = partitionEczemaReview(pairs, description)
      if (withheld) {
        eczemaReviewQueue.push({
          slug: product.slug,
          name: name ?? product.slug,
          description: description ?? '',
        })
      }
      for (const p of kept) {
        if (p.relevance === 'avoid') {
          avoidBySource[p.source] = (avoidBySource[p.source] ?? 0) + 1
          avoidPairs.push({
            slug: product.slug,
            tagSlug: p.tagSlug,
            relevance: 'avoid',
            source: p.source,
          })
        } else {
          secondaryBySource[p.source] = (secondaryBySource[p.source] ?? 0) + 1
          autoSecondaryPairs.push({
            slug: product.slug,
            tagSlug: p.tagSlug,
            relevance: 'secondary',
            source: p.source,
          })
        }
      }
    }
    if (autoSecondaryPairs.length > 0) {
      console.log(
        `🏷  Backfill auto-tags: +${autoSecondaryPairs.length} pair(s) (algo-derm ${secondaryBySource['algo-derm']} · actif-class ${secondaryBySource['actif-class']} · kind ${secondaryBySource.kind} · formula ${secondaryBySource.formula} · cross-signal ${secondaryBySource['cross-signal']} · percent-claim ${secondaryBySource['percent-claim']} · brand ${secondaryBySource.brand})`
      )
    }
    if (avoidPairs.length > 0) {
      console.log(
        `🛡  Backfill avoid: +${avoidBySource['algo-derm']} grossesse · +${avoidBySource['cross-signal']} stack-irritation · +${avoidBySource.interaction} interaction`
      )
    }
    if (eczemaReviewQueue.length > 0) {
      console.warn(
        `⚠  eczema-atopie review queue: ${eczemaReviewQueue.length} product(s) name atopy under a contraindication — NOT auto-tagged, review manually:`
      )
      for (const f of eczemaReviewQueue) {
        console.warn(`    • ${f.name} [${f.slug}] — ${f.description.slice(0, 160)}`)
      }
    }

    // Avoid pairs sit first in the dedup chain so they win on collision with
    // a manual `secondary` for the same (product, tag) pair — the safety
    // signal must override an editor's stale "compatible" call when the INCI
    // says otherwise (mirrors backfill-auto-tags upsert behaviour).
    const productTagPairs = dedupPairs(
      [...avoidPairs, ...manualProductTagPairs, ...autoSecondaryPairs],
      'productTags'
    )

    const validProductIngredients = allIngredientProductTags.filter((i) => !!i.ingredientSlug)

    const rawIngredientTagPairs = flattenTagGroups(
      ingredientTagMap as Record<string, ProductTagGroups>
    )

    // Drop entries whose tagSlug resolved to `undefined` — these originate
    // from domain slug references in ingredientTagMap pointing at slugs
    // removed during a tag split (AJUSTEUR_PH, SOLVANT, AHA, ACNE…). We warn
    // once with a unique key list so the taxonomy can be reconciled manually;
    // the seed keeps running.
    const droppedTagKeys = new Set<string>()
    const ingredientTagPairs = rawIngredientTagPairs.filter((p) => {
      if (typeof p.tagSlug !== 'string' || p.tagSlug.length === 0) {
        droppedTagKeys.add(String(p.tagSlug))
        return false
      }
      return true
    })
    if (droppedTagKeys.size > 0) {
      console.warn(
        `⚠️  ${rawIngredientTagPairs.length - ingredientTagPairs.length} pair(s) ingredientTags ignorée(s) — slugs inexistants: ${[...droppedTagKeys].join(', ')}`
      )
    }

    // Backfill: every ingredient with a native `category` matching an
    // ingredient_attribute slug (actif, humectant, emollient, filtre-uv,
    // tensioactif, excipient…) gets a synthetic 'primary' tag pair if the
    // manual map doesn't already list it. This way the attribute filter
    // bucket stays in sync with the native column without hand-editing
    // hundreds of entries. The shared-schemas-vs-tags test guarantees
    // SKINCARE_INGREDIENT_CATEGORY_VALUES ↔ ingredient_attribute tag slugs.
    const existing = new Set(ingredientTagPairs.map((p) => `${p.slug}::${p.tagSlug}`))
    // Whitelist of skincare formulation roles that exist as ingredient_attribute
    // tag slugs. Supplement ingredients store their functional class in the same
    // `category` column (carotenoide, plante, neuroactif…) — skip them here so
    // the backfill never emits tags that aren't in the ingredient taxonomy.
    const validCategorySlugs = new Set<string>(SKINCARE_INGREDIENT_CATEGORY_VALUES)
    let backfilled = 0
    for (const ing of correctedIngredientData) {
      const category = ing.category
      if (!category) continue
      if (!validCategorySlugs.has(category)) continue
      const key = `${ing.slug}::${category}`
      if (existing.has(key)) continue
      ingredientTagPairs.push({ slug: ing.slug, tagSlug: category, relevance: 'primary' })
      existing.add(key)
      backfilled++
    }
    if (backfilled > 0) {
      console.log(`🔁 Backfill: +${backfilled} ingredient_attribute tags depuis la colonne native`)
    }

    const dedupedIngredientTagPairs = dedupPairs(ingredientTagPairs, 'ingredientTags')

    // 1. Tag definitions (ingredient + product domains are independent).
    // Bulk insert bypasses per-row service calls because seed data is already
    // in the `{slug, label, tagType}` shape the schema expects.
    // Bulk tag defs use `onConflictDoNothing` on the slug unique idx so a
    // re-run picks up new slugs without erroring on existing ones. Harmless
    // after `cleanDatabase` (table is empty).
    if (ingredientTagData.length > 0) {
      await tx.insert(ingredientTagTypes).values(ingredientTagData).onConflictDoNothing({
        target: ingredientTagTypes.slug,
      })
    }
    console.log(`✅ ${ingredientTagData.length} ingredient_tags créés`)

    if (productTagData.length > 0) {
      await tx.insert(productTagTypes).values(productTagData).onConflictDoNothing({
        target: productTagTypes.slug,
      })
    }
    console.log(`✅ ${productTagData.length} product_tags créés`)

    // Brand-level certifications (T4.B). Independent of product/tag rows —
    // safe to seed before products since the lookup is by free-text brand,
    // not FK. Idempotent via PK upsert; re-runs after editing the curated
    // list refresh flags + sources.
    if (BRAND_CERTIFICATION_INSERTS.length > 0) {
      await tx
        .insert(brandCertifications)
        .values(BRAND_CERTIFICATION_INSERTS)
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
    }
    console.log(`✅ ${BRAND_CERTIFICATION_INSERTS.length} brand_certifications créés`)

    const ingredientsToInsert = idempotent
      ? correctedIngredientData.filter((i) => !existingIngredientSlugs.has(i.slug))
      : correctedIngredientData
    if (idempotent) {
      const skipped = correctedIngredientData.length - ingredientsToInsert.length
      console.log(
        `   Ingrédients à insérer : ${ingredientsToInsert.length} (${skipped} déjà en DB, sautés)`
      )
    }

    await seedBatch(
      'ingrédients',
      ingredientsToInsert,
      (ing) => createIngredient(tx, user.id, ing),
      (ing) => ing.slug,
      true
    )

    const allProductsCast = [...allProductData] as Parameters<typeof createProduct>[1][]
    const productsToInsert = idempotent
      ? allProductsCast.filter((p) => !existingProductSlugs.has(computeProductSlug(p)))
      : allProductsCast
    if (idempotent) {
      const skipped = allProductsCast.length - productsToInsert.length
      console.log(
        `   Produits à insérer : ${productsToInsert.length} (${skipped} déjà en DB, sautés)`
      )
    }

    await seedBatch(
      'produits (manuels)',
      productsToInsert,
      // Skip per-product auto-tagging: ingredients aren't linked yet, so it
      // would emit a partial tag set that PK-collides with the dedicated
      // auto-tag phase below (which runs with percent-claims). That phase is
      // the authoritative inserter.
      (p) => createProduct(user.id, p, tx, { autoTag: false }),
      (p) => p.slug ?? p.name,
      true
    )

    // 2. Fetch IDs of just-inserted entities within the same transaction
    const { productSlugToId, productTagSlugToId, ingredientTagSlugToId, ingredientSlugToId } =
      await fetchIdMaps(tx)

    // 3. Relations
    console.log('\n🔗 Préparation des relations produit-tags...')
    const prunedProductTagPairs = pruneRelationshipPairs(
      productTagPairs,
      'slug',
      'tagSlug',
      productSlugToId,
      productTagSlugToId,
      'Produit',
      'ProductTag'
    )

    const productTagPairsToInsert = idempotent
      ? prunedProductTagPairs.filter(({ slug, tagSlug }) => {
          const pId = productSlugToId.get(slug)
          const tId = productTagSlugToId.get(tagSlug)
          if (!pId || !tId) return false
          return !existingTagProductPairs.has(`${pId}::${tId}`)
        })
      : prunedProductTagPairs
    if (idempotent) {
      console.log(
        `   ProductTags à insérer : ${productTagPairsToInsert.length} (${prunedProductTagPairs.length - productTagPairsToInsert.length} déjà liés, sautés)`
      )
    }

    await seedBatch(
      'productTags',
      productTagPairsToInsert,
      ({ slug, tagSlug, relevance, source }) =>
        addTagToProduct(
          tx,
          requireId(productSlugToId, slug, 'product'),
          requireId(productTagSlugToId, tagSlug, 'productTag'),
          relevance,
          source
        ),
      ({ slug, tagSlug }) => `${slug} ↔ ${tagSlug}`
    )

    console.log('\n🔗 Préparation des relations produit-ingrédients...')
    const prunedProductIngredients = pruneRelationshipPairs(
      validProductIngredients,
      'productSlug',
      'ingredientSlug',
      productSlugToId,
      ingredientSlugToId,
      'Produit',
      'Ingrédient'
    )

    const productIngredientsToInsert = idempotent
      ? prunedProductIngredients.filter(({ productSlug, ingredientSlug }) => {
          if (!ingredientSlug) return false
          const pId = productSlugToId.get(productSlug)
          const iId = ingredientSlugToId.get(ingredientSlug)
          if (!pId || !iId) return false
          return !existingProductIngredientPairs.has(`${pId}::${iId}`)
        })
      : prunedProductIngredients
    if (idempotent) {
      console.log(
        `   ProductIngredients à insérer : ${productIngredientsToInsert.length} (${prunedProductIngredients.length - productIngredientsToInsert.length} déjà liés, sautés)`
      )
    }

    await seedBatch(
      'productIngredients',
      productIngredientsToInsert,
      ({ productSlug, ingredientSlug, notes, concentrationValue, concentrationUnit }) => {
        if (!ingredientSlug) throw new Error(`Missing ingredientSlug for product ${productSlug}`)
        return addIngredientToProduct(tx, {
          productId: requireId(productSlugToId, productSlug, 'product'),
          ingredientId: requireId(ingredientSlugToId, ingredientSlug, 'ingredient'),
          notes: toText(notes),
          concentrationValue: toNumeric(concentrationValue),
          concentrationUnit: toText(concentrationUnit),
          concentrationPer: null,
        })
      },
      ({ productSlug, ingredientSlug }) => `${productSlug} ↔ ${ingredientSlug}`
    )

    console.log('\n🔗 Préparation des relations ingrédient-tags...')
    const prunedIngredientTagPairs = pruneRelationshipPairs(
      dedupedIngredientTagPairs,
      'slug',
      'tagSlug',
      ingredientSlugToId,
      ingredientTagSlugToId,
      'Ingrédient',
      'IngredientTag'
    )

    const ingredientTagPairsToInsert = idempotent
      ? prunedIngredientTagPairs.filter(({ slug, tagSlug }) => {
          const iId = ingredientSlugToId.get(slug)
          const tId = ingredientTagSlugToId.get(tagSlug)
          if (!iId || !tId) return false
          return !existingTagIngredientPairs.has(`${iId}::${tId}`)
        })
      : prunedIngredientTagPairs
    if (idempotent) {
      console.log(
        `   IngredientTags à insérer : ${ingredientTagPairsToInsert.length} (${prunedIngredientTagPairs.length - ingredientTagPairsToInsert.length} déjà liés, sautés)`
      )
    }

    await seedBatch(
      'ingredientTags',
      ingredientTagPairsToInsert,
      ({ slug, tagSlug, relevance }) =>
        addTagToIngredient(
          tx,
          requireId(ingredientSlugToId, slug, 'ingredient'),
          requireId(ingredientTagSlugToId, tagSlug, 'ingredientTag'),
          relevance
        ),
      ({ slug, tagSlug }) => `${slug} ↔ ${tagSlug}`
    )

    // 4. Dermo profiles — mark all fillers
    console.log('\n🧪 Seed des profils dermo fillers...')
    const fillerProfiles = FILLER_SLUGS.flatMap((slug) => {
      const id = ingredientSlugToId.get(slug)
      if (!id) return []
      return [{ ingredientId: id, isFiller: true }]
    })

    if (fillerProfiles.length > 0) {
      await tx
        .insert(ingredientDermoProfiles)
        .values(fillerProfiles)
        .onConflictDoUpdate({
          target: ingredientDermoProfiles.ingredientId,
          set: { isFiller: true },
        })
      console.log(`✅ ${fillerProfiles.length} profils dermo fillers insérés`)
    }

    const missingFillers = FILLER_SLUGS.filter((s) => !ingredientSlugToId.has(s))
    if (missingFillers.length > 0) {
      console.warn(`⚠️  ${missingFillers.length} slugs fillers non trouvés en DB :`)
      for (const s of missingFillers) {
        console.warn(`   - ${s}`)
      }
    }

    // 5. User collection
    await seedUserCollection(tx, user.id, productSlugToId)

    // 6. Test personas (5 users × varied dermo profiles + collections + reviews)
    await seedTestUsers(tx, productSlugToId)
  })

  await seedBlog(idempotent)

  console.log('\n✨ Seed CORE terminé avec succès !\n')
}

// Auto-exécution si lancé directement.
//
// Default behavior is idempotent (`shouldClean=false`) — destructive reset
// is opt-in via `--reset`. `--no-clean` is still recognized for legacy
// callers but is now a no-op (default already idempotent).
if (import.meta.main || process.argv[1]?.endsWith('seed-core.ts')) {
  const shouldClean = process.argv.includes('--reset')
  seedCore(shouldClean).catch((err) => {
    console.error('\n💥 Erreur fatale :', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
