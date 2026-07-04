import { addDays, subMonths } from 'date-fns'

import type { Database } from '../../db/index'
import { logger } from '../../lib/logger'
import { listProducts } from '../products/service'
import { addPurchase, finishPurchase, openPurchase } from '../user-products/purchase.service'
import { createUserProduct, upsertUserProductReview } from '../user-products/service'

// Wire dates are ISO datetime UTC; backend boundary truncates to YYYY-MM-DD.
const d = (date: Date) => date.toISOString()

export async function seedDemoData(userId: string, db: Database) {
  logger.info({ userId }, 'seeding demo data')

  await seedDemoCollection(userId, db)

  logger.info({ userId }, 'demo data seeded')
}

async function seedDemoCollection(userId: string, db: Database) {
  const { items: products } = await listProducts(
    { category: 'skincare', page: 1, limit: 15, sort: 'random' },
    db
  )

  if (products.length === 0) {
    logger.warn({ userId }, 'no catalog products — skipping demo collection seed')
    return
  }

  // Holy Grail is sentiment=6 (orthogonal to status), not its own status.
  const assignments: Array<{
    status: 'in_stock' | 'wishlist' | 'archived' | 'avoided' | 'watched'
    sentiment?: number
    wouldRepurchase?: 'yes' | 'no' | 'unsure'
    comment?: string
  }> = [
    {
      status: 'in_stock',
      sentiment: 4,
      wouldRepurchase: 'yes',
      comment: 'Fonctionne bien sur ma peau sensible.',
    },
    { status: 'in_stock', sentiment: 3, wouldRepurchase: 'unsure' },
    {
      status: 'in_stock',
      sentiment: 5,
      wouldRepurchase: 'yes',
      comment: 'Mon indispensable du matin.',
    },
    { status: 'in_stock' },
    { status: 'in_stock', sentiment: 4, wouldRepurchase: 'yes' },
    { status: 'wishlist' },
    { status: 'wishlist', comment: 'Très bien noté sur les forums, à tester absolument.' },
    { status: 'wishlist' },
    {
      status: 'in_stock',
      sentiment: 6,
      wouldRepurchase: 'yes',
      comment: 'Résultats visibles en 2 semaines. Je ne change plus.',
    },
    { status: 'in_stock', sentiment: 6, wouldRepurchase: 'yes' },
    {
      status: 'archived',
      sentiment: 2,
      wouldRepurchase: 'no',
      comment: 'Trop riche pour ma peau, bouchait les pores.',
    },
    { status: 'archived', sentiment: 3, wouldRepurchase: 'no' },
    {
      status: 'avoided',
      sentiment: 1,
      wouldRepurchase: 'no',
      comment: 'Réaction cutanée — parfum trop agressif.',
    },
    { status: 'avoided' },
    { status: 'watched', comment: 'Nouveau lancement à surveiller.' },
  ]

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    if (!product) continue
    const config = assignments[i] ?? { status: 'in_stock' as const }

    const up = await createUserProduct(
      userId,
      {
        productId: product.id,
        status: config.status,
        sentiment: config.sentiment,
        wouldRepurchase: config.wouldRepurchase,
        comment: config.comment,
      },
      db
    )

    if (!up) continue

    // Holy Grail (sentiment=6) caps review axes at 5.
    if (config.sentiment) {
      const reviewBase = Math.min(5, config.sentiment)
      await upsertUserProductReview(
        userId,
        up.id,
        {
          efficacy: reviewBase,
          sensoriality: Math.max(1, reviewBase - 1 + Math.round(Math.random())),
          tolerance: config.status === 'avoided' ? 1 : reviewBase,
          valueForMoney: reviewBase >= 4 ? 4 : 3,
        },
        db
      )
    }

    if (config.status === 'in_stock' || config.status === 'archived') {
      const isHolyGrail = config.sentiment === 6
      await seedDemoPurchases(userId, up.id, isHolyGrail ? 'holy_grail' : config.status, db)
    }
  }
}

async function seedDemoPurchases(
  userId: string,
  userProductId: string,
  pattern: 'in_stock' | 'holy_grail' | 'archived',
  db: Database
) {
  if (pattern === 'archived') {
    const p = await addPurchase(
      userId,
      userProductId,
      {
        purchasedAt: d(subMonths(new Date(), 8)),
        pricePaidCents: 2490,
      },
      db
    )
    await openPurchase(userId, p.id, { openedAt: d(subMonths(new Date(), 7)) }, db)
    await finishPurchase(userId, userProductId, { finishedAt: d(subMonths(new Date(), 2)) }, db)
    return
  }

  if (pattern === 'holy_grail') {
    const old = await addPurchase(
      userId,
      userProductId,
      {
        purchasedAt: d(subMonths(new Date(), 10)),
        pricePaidCents: 3200,
      },
      db
    )
    await openPurchase(userId, old.id, { openedAt: d(subMonths(new Date(), 9)) }, db)
    await finishPurchase(userId, userProductId, { finishedAt: d(subMonths(new Date(), 5)) }, db)

    const current = await addPurchase(
      userId,
      userProductId,
      {
        purchasedAt: d(subMonths(new Date(), 5)),
        pricePaidCents: 3200,
      },
      db
    )
    await openPurchase(userId, current.id, { openedAt: d(subMonths(new Date(), 4)) }, db)
    return
  }

  // Non-deterministic on purpose (varied demo collections). Safe for analytics:
  // every metric filters is_demo=false (see db/audit/stats-db.ts).
  const hasOpen = Math.random() > 0.5
  const purchasedAt = subMonths(new Date(), Math.floor(Math.random() * 4) + 1)
  const p = await addPurchase(
    userId,
    userProductId,
    {
      purchasedAt: d(purchasedAt),
      pricePaidCents: Math.floor(Math.random() * 3000) + 800,
    },
    db
  )

  if (hasOpen) {
    // opened_at must be >= purchased_at (constraint purchases_opened_after_purchased): pick a
    // day inside the elapsed window, not an independent random date that could precede purchase.
    const daysSincePurchase = Math.floor((Date.now() - purchasedAt.getTime()) / 86_400_000)
    const openedAt = addDays(purchasedAt, Math.floor(Math.random() * daysSincePurchase))
    await openPurchase(userId, p.id, { openedAt: d(openedAt) }, db)
  }
}
