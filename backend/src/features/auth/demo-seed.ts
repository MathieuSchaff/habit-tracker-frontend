import { addDays, format, subDays, subMonths } from 'date-fns'

import type { Database } from '../../db/index'
import { listProducts } from '../products/service'
import { createSubtask, createTask, updateTask } from '../tasks/service'
import { addPurchase, finishPurchase, openPurchase } from '../user-products/purchase.service'
import { createUserProduct, upsertUserProductReview } from '../user-products/service'

const d = (date: Date) => format(date, 'yyyy-MM-dd')

export async function seedDemoData(userId: string, db: Database) {
  console.log(`🌱 Seeding demo data for user ${userId}...`)

  await seedDemoTasks(userId, db)
  await seedDemoCollection(userId, db)

  console.log(`✅ Demo data seeded successfully for user ${userId}`)
}

async function seedDemoTasks(userId: string, db: Database) {
  // Active tasks with subtasks
  const tRoutine = await createTask(
    { title: 'Tester la routine du soir', energy: 'low' },
    userId,
    db
  )
  await updateTask(tRoutine.id, userId, { status: 'active' }, db)
  await createSubtask(tRoutine.id, { title: 'Appliquer le sérum vitamine C' }, db)
  await createSubtask(tRoutine.id, { title: 'Tester la crème barrière' }, db)
  await createSubtask(tRoutine.id, { title: 'Note les réactions le lendemain matin' }, db)

  const tSdb = await createTask(
    { title: 'Nettoyer la salle de bain', energy: 'medium' },
    userId,
    db
  )
  await updateTask(tSdb.id, userId, { status: 'active' }, db)
  await createSubtask(tSdb.id, { title: 'Trier les produits périmés' }, db)
  await createSubtask(tSdb.id, { title: 'Ranger les nouvelles commandes' }, db)

  // Inbox tasks
  await createTask({ title: 'Prendre rendez-vous chez le dermatologue', energy: 'low' }, userId, db)
  await createTask({ title: "Chercher un SPF teinté pour l'été", energy: 'medium' }, userId, db)
  await createTask(
    { title: 'Commander les recharges avant rupture de stock', energy: 'high' },
    userId,
    db
  )

  // Snoozed task (visible in 4 days)
  const tSnooze = await createTask(
    { title: 'Faire le bilan de la routine du mois', energy: 'low' },
    userId,
    db
  )
  await updateTask(
    tSnooze.id,
    userId,
    {
      status: 'snoozed',
      snoozedUntil: d(addDays(new Date(), 4)),
    },
    db
  )

  // Done tasks
  const tDone1 = await createTask(
    { title: 'Lire les avis sur le nouvel acide glycolique', energy: 'low' },
    userId,
    db
  )
  await updateTask(tDone1.id, userId, { status: 'done' }, db)

  const tDone2 = await createTask(
    { title: 'Mettre à jour la liste de produits à éviter', energy: 'medium' },
    userId,
    db
  )
  await updateTask(tDone2.id, userId, { status: 'done' }, db)
}

async function seedDemoCollection(userId: string, db: Database) {
  const { items: products } = await listProducts(
    { category: 'skincare', page: 1, limit: 15, sort: 'random' },
    db
  )

  if (products.length === 0) {
    console.warn('No products found in catalog — skipping collection seed')
    return
  }

  // Status distribution across the 15 products
  const assignments: Array<{
    status: 'in_stock' | 'wishlist' | 'holy_grail' | 'archived' | 'avoided' | 'watched'
    sentiment?: number
    wouldRepurchase?: 'yes' | 'no' | 'unsure'
    comment?: string
  }> = [
    // in_stock (5)
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
    // wishlist (3)
    { status: 'wishlist' },
    { status: 'wishlist', comment: 'Très bien noté sur les forums, à tester absolument.' },
    { status: 'wishlist' },
    // holy_grail (2)
    {
      status: 'holy_grail',
      sentiment: 5,
      wouldRepurchase: 'yes',
      comment: 'Résultats visibles en 2 semaines. Je ne change plus.',
    },
    { status: 'holy_grail', sentiment: 5, wouldRepurchase: 'yes' },
    // archived (2)
    {
      status: 'archived',
      sentiment: 2,
      wouldRepurchase: 'no',
      comment: 'Trop riche pour ma peau, bouchait les pores.',
    },
    { status: 'archived', sentiment: 3, wouldRepurchase: 'no' },
    // avoided (2)
    {
      status: 'avoided',
      sentiment: 1,
      wouldRepurchase: 'no',
      comment: 'Réaction cutanée — parfum trop agressif.',
    },
    { status: 'avoided' },
    // watched (1)
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

    // Reviews for rated products
    if (config.sentiment) {
      await upsertUserProductReview(
        userId,
        up.id,
        {
          efficacy: config.sentiment,
          sensoriality: Math.max(1, config.sentiment - 1 + Math.round(Math.random())),
          tolerance: config.status === 'avoided' ? 1 : Math.min(5, config.sentiment),
          valueForMoney: config.sentiment >= 4 ? 4 : 3,
        },
        db
      )
    }

    // Purchases for in_stock and holy_grail products
    if (
      config.status === 'in_stock' ||
      config.status === 'holy_grail' ||
      config.status === 'archived'
    ) {
      await seedDemoPurchases(userId, up.id, config.status, db)
    }
  }
}

async function seedDemoPurchases(
  userId: string,
  userProductId: string,
  status: 'in_stock' | 'holy_grail' | 'archived',
  db: Database
) {
  if (status === 'archived') {
    // One finished purchase in the past
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

  if (status === 'holy_grail') {
    // Old finished purchase + currently open one
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

  // in_stock: 50% chance of a currently open purchase, rest just purchased
  const hasOpen = Math.random() > 0.5
  const p = await addPurchase(
    userId,
    userProductId,
    {
      purchasedAt: d(subMonths(new Date(), Math.floor(Math.random() * 4) + 1)),
      pricePaidCents: Math.floor(Math.random() * 3000) + 800,
    },
    db
  )

  if (hasOpen) {
    await openPurchase(
      userId,
      p.id,
      { openedAt: d(subDays(new Date(), Math.floor(Math.random() * 60) + 7)) },
      db
    )
  }
}
