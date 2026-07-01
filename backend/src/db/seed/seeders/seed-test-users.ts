import type {
  Email,
  PreferencesTag,
  RawPassword,
  RepurchaseFlag,
  RessentiTag,
  RoutineTag,
  SkinConcern,
  SkinType,
  UserProductStatus,
} from '@aurore/shared'

import { and, eq, inArray } from 'drizzle-orm'

import { signup } from '../../../features/auth/service'
import { getUser } from '../../../features/auth/user.utils'
import { calendarMonthsAgoUTC } from '../../../utils/dates'
import type { DB } from '../..'
import { userBans } from '../../schema/auth/user-bans'
import { profiles, userDermoProfiles, users } from '../../schema/auth/users'
import { purchases } from '../../schema/products/purchases'
import { userProductReviews, userProducts } from '../../schema/products/user-products'
import { createCtx } from './create-user'

// Five personas covering every skin type, varied Fitzpatrick + concerns.
// Reviews skip the obviously redundant axes (e.g. no mixability score on an
// eau micellaire) so the seeded distribution still looks realistic, not flat.
type CollectionEntry = {
  slug: string
  status: UserProductStatus
  sentiment?: number
  wouldRepurchase?: RepurchaseFlag
  comment?: string
  ressenti?: RessentiTag[]
  routine?: RoutineTag[]
  preferences?: PreferencesTag[]
  review?: {
    tolerance?: number
    efficacy?: number
    sensoriality?: number
    stability?: number
    mixability?: number
    valueForMoney?: number
    comment?: string
    isPublic?: boolean
    ratingsPublic?: boolean
  }
}

type Persona = {
  email: string
  password: string
  username: string
  bio?: string
  skinTypes: SkinType[]
  fitzpatrickType: number
  skinConcerns: SkinConcern[]
  privateNotes?: string
  collection: CollectionEntry[]
}

const SHARED_PASSWORD = 'Azerty123!seed'

const PERSONAS: Persona[] = [
  {
    email: 'marie@seed.local',
    password: SHARED_PASSWORD,
    username: 'marie-test',
    bio: 'Peau sèche depuis toujours, je cherche des baumes vraiment riches.',
    skinTypes: ['peau-seche'],
    fitzpatrickType: 2,
    skinConcerns: ['deshydratation', 'barriere-cutanee'],
    privateNotes: 'Persona seed — peau sèche / Fitzpatrick 2.',
    collection: [
      {
        slug: 'cerave-baume-hydratant',
        status: 'in_stock',
        sentiment: 6,
        wouldRepurchase: 'yes',
        comment: 'Mon Holy Grail. Indispensable en hiver.',
        ressenti: ['riche', 'confortable'],
        routine: ['soir', 'hiver'],
        review: {
          tolerance: 5,
          efficacy: 5,
          sensoriality: 4,
          stability: 5,
          mixability: 5,
          valueForMoney: 5,
          comment: 'Texture épaisse qui pénètre bien, aucune réaction même sur peau réactive.',
          isPublic: true,
          ratingsPublic: true,
        },
      },
      {
        slug: 'cerave-creme-hydratante',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        ressenti: ['confortable'],
        routine: ['matin'],
        review: {
          tolerance: 5,
          efficacy: 4,
          sensoriality: 4,
          valueForMoney: 5,
          comment: 'Plus légère que le baume, parfaite pour la journée.',
        },
      },
      {
        slug: 'avene-tolerance-control-baume-relipidant',
        status: 'in_stock',
        sentiment: 4,
        ressenti: ['riche'],
      },
      {
        slug: 'avene-eau-thermale',
        status: 'in_stock',
        sentiment: 4,
        routine: ['matin', 'ete'],
      },
      {
        slug: 'avene-hydrance-riche-creme-hydratante',
        status: 'archived',
        sentiment: 3,
        wouldRepurchase: 'no',
        comment: 'Pas assez riche pour mon hiver.',
      },
      {
        slug: 'la-roche-posay-cicaplast-baume-b5-ultra-reparateur',
        status: 'wishlist',
      },
    ],
  },
  {
    email: 'lea@seed.local',
    password: SHARED_PASSWORD,
    username: 'lea-test',
    bio: 'Zone T qui brille, joues normales. Je cherche le bon équilibre.',
    skinTypes: ['peau-mixte'],
    fitzpatrickType: 3,
    skinConcerns: ['pores-dilates', 'brillance', 'eclat'],
    privateNotes: 'Persona seed — peau mixte / Fitzpatrick 3.',
    collection: [
      {
        slug: 'avene-cleanance-eau-micellaire',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        routine: ['soir'],
        review: {
          tolerance: 5,
          efficacy: 4,
          sensoriality: 5,
          valueForMoney: 4,
          comment: 'Démaquille bien sans laisser de film, ne pique pas les yeux.',
        },
      },
      {
        slug: 'avene-hydrance-boost-serum-concentre-hydratant',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        ressenti: ['leger'],
        routine: ['matin', 'soir'],
        review: {
          tolerance: 5,
          efficacy: 5,
          sensoriality: 5,
          stability: 4,
          valueForMoney: 4,
          comment: 'Hydratation sans effet collant, parfait sous SPF le matin.',
          isPublic: true,
        },
      },
      {
        slug: 'avene-cleanance-hydra-creme-apaisante',
        status: 'in_stock',
        sentiment: 4,
        ressenti: ['leger'],
      },
      {
        slug: 'avene-cleanance-spf50-ultra-leger-anti-imperfections',
        status: 'in_stock',
        sentiment: 4,
        routine: ['matin', 'ete'],
      },
      {
        slug: 'cerave-creme-hydratante',
        status: 'avoided',
        sentiment: 2,
        wouldRepurchase: 'no',
        comment: 'Trop riche pour ma zone T.',
        ressenti: ['collant'],
        preferences: ['eviter-pour-moi'],
        review: {
          tolerance: 4,
          efficacy: 2,
          sensoriality: 2,
          comment: 'Bonne tolérance mais texture vraiment inadaptée à ma peau mixte.',
        },
      },
      {
        slug: 'avene-hydrance-light-creme-hydratante',
        status: 'wishlist',
      },
    ],
  },
  {
    email: 'theo@seed.local',
    password: SHARED_PASSWORD,
    username: 'theo-test',
    bio: 'Acné adulte, je teste pas mal de routines.',
    skinTypes: ['peau-grasse'],
    fitzpatrickType: 4,
    skinConcerns: ['anti-acne', 'post-acne', 'pores-dilates'],
    privateNotes: 'Persona seed — peau grasse / Fitzpatrick 4.',
    collection: [
      {
        slug: 'avene-cleanance-gel-nettoyant',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        routine: ['matin', 'soir'],
        review: {
          tolerance: 5,
          efficacy: 5,
          sensoriality: 4,
          valueForMoney: 5,
          comment: 'Nettoie bien sans dessécher. Tube qui dure longtemps.',
        },
      },
      {
        slug: 'avene-cleanance-comedomed-serum-intensif',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        ressenti: ['leger'],
        routine: ['soir'],
        review: {
          tolerance: 4,
          efficacy: 5,
          sensoriality: 4,
          stability: 5,
          valueForMoney: 3,
          comment: 'Vrai effet sur les imperfections après 3 semaines. Cher mais ça marche.',
        },
      },
      {
        slug: 'la-roche-posay-effaclar-gel-purifiant',
        status: 'in_stock',
        sentiment: 4,
        routine: ['matin'],
      },
      {
        slug: 'la-roche-posay-effaclar-duo-m',
        status: 'in_stock',
        sentiment: 4,
        ressenti: ['leger'],
      },
      {
        slug: 'avene-cicalfate-lotion-assechante-reparatrice',
        status: 'archived',
        sentiment: 3,
        wouldRepurchase: 'unsure',
        comment: 'Efficace en localisé mais trop asséchant en plein visage.',
      },
      {
        slug: 'avene-cleanance-comedomed-peeling-creme-intensive',
        status: 'wishlist',
      },
    ],
  },
  {
    email: 'anna@seed.local',
    password: SHARED_PASSWORD,
    username: 'anna-test',
    bio: 'Routine simple, je cherche surtout à prévenir le vieillissement.',
    skinTypes: ['peau-normale'],
    fitzpatrickType: 3,
    skinConcerns: ['anti-age', 'eclat', 'repulpant'],
    privateNotes: 'Persona seed — peau normale / Fitzpatrick 3.',
    collection: [
      {
        slug: 'cerave-creme-hydratante',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        ressenti: ['confortable'],
        routine: ['matin', 'soir'],
        review: {
          tolerance: 5,
          efficacy: 4,
          sensoriality: 5,
          stability: 4,
          mixability: 5,
          valueForMoney: 5,
          comment: 'Le compromis idéal. Pas de chichi, juste une crème qui hydrate.',
        },
      },
      {
        slug: 'avene-hydrance-boost-serum-hydratant',
        status: 'in_stock',
        sentiment: 4,
        ressenti: ['leger'],
        routine: ['matin'],
      },
      {
        slug: 'la-roche-posay-anthelios-age-correct-spf50',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        ressenti: ['leger'],
        routine: ['matin'],
        review: {
          tolerance: 5,
          efficacy: 4,
          sensoriality: 5,
          stability: 5,
          mixability: 4,
          valueForMoney: 4,
          comment: 'SPF qui ne laisse pas de fini blanc, parfait sous maquillage.',
        },
      },
      {
        slug: 'aroma-zone-serum-acide-hyaluronique-3-5',
        status: 'in_stock',
        sentiment: 4,
        ressenti: ['leger'],
        routine: ['matin', 'soir'],
      },
      {
        slug: 'avene-eau-thermale',
        status: 'in_stock',
        sentiment: 3,
        routine: ['ete'],
      },
      {
        slug: 'beauty-of-joseon-ginseng-moist-sun-serum-spf-50-pa',
        status: 'wishlist',
      },
    ],
  },
  {
    email: 'banned@seed.local',
    password: SHARED_PASSWORD,
    username: 'banned-test',
    skinTypes: ['peau-normale'] as SkinType[],
    fitzpatrickType: 2,
    skinConcerns: [] as SkinConcern[],
    privateNotes: 'Persona seed — ban global actif (test).',
    collection: [],
  },
  {
    email: 'camille@seed.local',
    password: SHARED_PASSWORD,
    username: 'camille-test',
    bio: 'Rosacée diagnostiquée. Tout produit irritant est éliminé.',
    skinTypes: ['peau-sensible'],
    fitzpatrickType: 1,
    skinConcerns: ['anti-rougeurs', 'rosacee', 'cicatrisation'],
    privateNotes: 'Persona seed — peau sensible / rosacée / Fitzpatrick 1.',
    collection: [
      {
        slug: 'avene-cicalfate-creme-reparatrice-protectrice',
        status: 'in_stock',
        sentiment: 6,
        wouldRepurchase: 'yes',
        comment: 'Calme les poussées en une nuit.',
        ressenti: ['riche', 'aucun-souci'],
        routine: ['soir'],
        preferences: ['sans-parfum'],
        review: {
          tolerance: 5,
          efficacy: 5,
          sensoriality: 4,
          stability: 5,
          valueForMoney: 4,
          comment: "Pas une seule rougeur depuis que je l'utilise en cure.",
          isPublic: true,
          ratingsPublic: true,
        },
      },
      {
        slug: 'avene-tolerance-control-creme-apaisante',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        ressenti: ['confortable', 'aucun-souci'],
        routine: ['matin'],
        review: {
          tolerance: 5,
          efficacy: 4,
          sensoriality: 5,
          stability: 5,
          valueForMoney: 4,
          comment: 'Formule courte, aucune réaction. Texture fondante.',
        },
      },
      {
        slug: 'bioderma-sensibio-ar-plus',
        status: 'in_stock',
        sentiment: 5,
        routine: ['soir'],
        preferences: ['sans-parfum'],
      },
      {
        slug: 'avene-eau-thermale',
        status: 'in_stock',
        sentiment: 5,
        wouldRepurchase: 'yes',
        routine: ['matin', 'soir'],
      },
      {
        slug: 'avene-tolerance-hydra-10-creme-hydratante',
        status: 'archived',
        sentiment: 4,
        comment: 'Bien tolérée, mais je préfère la Tolérance Control.',
      },
      {
        slug: 'la-roche-posay-cicaplast-baume-b5-ultra-reparateur',
        status: 'wishlist',
        preferences: ['a-comparer'],
      },
    ],
  },
]

async function getOrCreateTestUser(persona: Persona) {
  const ctx = createCtx()
  const existing = await getUser(ctx.db, persona.email as Email)
  if (existing) return existing

  const result = await signup(ctx, persona.email as Email, persona.password as RawPassword)
  if (result.success === false) {
    throw new Error(`Seed test user signup failed for ${persona.email}: ${result.error}`)
  }

  // Signup returns no user (ADR 0009); fetch the created row.
  const created = await getUser(ctx.db, persona.email as Email)
  if (!created) {
    throw new Error(`Seed test user not found after signup: ${persona.email}`)
  }

  // Skip email verification flow — these are seed users, no real inbox.
  await ctx.db
    .update(users)
    .set({ emailVerifiedAt: new Date().toISOString() })
    .where(eq(users.id, created.id))

  return created
}

export async function seedTestUsers(tx: DB, productSlugToId: Map<string, string>) {
  console.log('\n👥 Seed users de test (6 personas)...')

  for (const persona of PERSONAS) {
    const user = await getOrCreateTestUser(persona)

    await tx
      .update(profiles)
      .set({
        username: persona.username,
        bio: persona.bio ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(profiles.userId, user.id))

    if (persona.email === 'banned@seed.local') {
      await tx
        .insert(userBans)
        .values({
          userId: user.id,
          scope: 'global',
          reason: 'Compte de test banni (seed)',
          // bannedBy must reference a valid user — self-referencing is acceptable for seed fixtures.
          bannedBy: user.id,
        })
        .onConflictDoNothing()
    }

    const now = new Date().toISOString()
    await tx
      .insert(userDermoProfiles)
      .values({
        userId: user.id,
        skinTypes: persona.skinTypes,
        fitzpatrickType: persona.fitzpatrickType,
        skinConcerns: persona.skinConcerns,
        privateNotes: persona.privateNotes ?? null,
      })
      .onConflictDoUpdate({
        target: userDermoProfiles.userId,
        set: {
          skinTypes: persona.skinTypes,
          fitzpatrickType: persona.fitzpatrickType,
          skinConcerns: persona.skinConcerns,
          privateNotes: persona.privateNotes ?? null,
          updatedAt: now,
        },
      })

    const userProductInserts = persona.collection
      .map((entry) => {
        const productId = productSlugToId.get(entry.slug)
        if (!productId) {
          console.warn(`  ⚠ Produit "${entry.slug}" introuvable (persona ${persona.email})`)
          return null
        }
        return {
          userId: user.id,
          productId,
          status: entry.status,
          sentiment: entry.sentiment ?? null,
          wouldRepurchase: entry.wouldRepurchase ?? null,
          comment: entry.comment ?? null,
          ressenti: entry.ressenti ?? [],
          routine: entry.routine ?? [],
          preferences: entry.preferences ?? [],
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)

    if (userProductInserts.length === 0) {
      console.log(`  ℹ ${persona.username}: aucun produit valide, skip.`)
      continue
    }

    await tx.insert(userProducts).values(userProductInserts).onConflictDoNothing()

    // Re-query to map productId → userProduct.id (covers both newly inserted
    // and pre-existing rows from a previous seed run).
    const productIds = userProductInserts.map((u) => u.productId)
    const upRows = await tx
      .select({ id: userProducts.id, productId: userProducts.productId })
      .from(userProducts)
      .where(and(eq(userProducts.userId, user.id), inArray(userProducts.productId, productIds)))

    const upIdByProductId = new Map(upRows.map((r) => [r.productId, r.id]))

    const reviewInserts = persona.collection
      .map((entry) => {
        if (!entry.review) return null
        const productId = productSlugToId.get(entry.slug)
        if (!productId) return null
        const upId = upIdByProductId.get(productId)
        if (!upId) return null
        return {
          userProductId: upId,
          tolerance: entry.review.tolerance ?? null,
          efficacy: entry.review.efficacy ?? null,
          sensoriality: entry.review.sensoriality ?? null,
          stability: entry.review.stability ?? null,
          mixability: entry.review.mixability ?? null,
          valueForMoney: entry.review.valueForMoney ?? null,
          comment: entry.review.comment ?? null,
          isPublic: entry.review.isPublic ?? false,
          ratingsPublic: entry.review.ratingsPublic ?? false,
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)

    if (reviewInserts.length > 0) {
      await tx.insert(userProductReviews).values(reviewInserts).onConflictDoNothing()
    }

    // Purchase history so the Achats page has data. Derived from status (mirrors
    // demo-seed): in_stock = one open bottle, archived = bought → used → finished,
    // Holy Grail (sentiment 6) = a finished bottle plus a repurchase. Wishlist /
    // watched / avoided are never bought.
    const purchaseSeeds = persona.collection.flatMap((entry, i) => {
      if (entry.status !== 'in_stock' && entry.status !== 'archived') return []
      const productId = productSlugToId.get(entry.slug)
      const upId = productId ? upIdByProductId.get(productId) : undefined
      if (!upId) return []

      const pricePaidCents = 1500 + (i % 5) * 500
      if (entry.sentiment === 6) {
        return [
          {
            userProductId: upId,
            purchasedAt: calendarMonthsAgoUTC(10),
            pricePaidCents,
            openedAt: calendarMonthsAgoUTC(9),
            finishedAt: calendarMonthsAgoUTC(5),
          },
          {
            userProductId: upId,
            purchasedAt: calendarMonthsAgoUTC(5),
            pricePaidCents,
            openedAt: calendarMonthsAgoUTC(4),
          },
        ]
      }
      if (entry.status === 'archived') {
        return [
          {
            userProductId: upId,
            purchasedAt: calendarMonthsAgoUTC(8),
            pricePaidCents,
            openedAt: calendarMonthsAgoUTC(7),
            finishedAt: calendarMonthsAgoUTC(2),
          },
        ]
      }
      const boughtMonthsAgo = 2 + (i % 4)
      return [
        {
          userProductId: upId,
          purchasedAt: calendarMonthsAgoUTC(boughtMonthsAgo),
          pricePaidCents,
          openedAt: calendarMonthsAgoUTC(boughtMonthsAgo - 1),
        },
      ]
    })

    // Idempotent: skip products that already have a purchase — there is no unique
    // key to dedupe on, so a re-run must not double-insert.
    let purchaseInserts = purchaseSeeds
    if (purchaseSeeds.length > 0) {
      const upIds = [...new Set(purchaseSeeds.map((p) => p.userProductId))]
      const existing = await tx
        .select({ userProductId: purchases.userProductId })
        .from(purchases)
        .where(inArray(purchases.userProductId, upIds))
      const alreadySeeded = new Set(existing.map((r) => r.userProductId))
      purchaseInserts = purchaseSeeds.filter((p) => !alreadySeeded.has(p.userProductId))
      if (purchaseInserts.length > 0) {
        await tx.insert(purchases).values(purchaseInserts)
      }
    }

    console.log(
      `  ✅ ${persona.username}: ${userProductInserts.length} produits, ${reviewInserts.length} reviews, ${purchaseInserts.length} achats`
    )
  }
}
