import { eq } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { profiles } from '../../db/schema'

// Accent-free so /u/:username stays URL-safe; calm/neutral so an auto-assigned
// handle never reads as a claim or an identity leak before the user renames it.
const ADJECTIVES = [
  'doux',
  'calme',
  'clair',
  'frais',
  'leger',
  'lisse',
  'pur',
  'serein',
  'tendre',
  'soyeux',
  'vif',
  'sage',
  'mat',
  'satine',
  'paisible',
  'limpide',
  'fluide',
  'discret',
  'subtil',
  'fin',
]

const NOUNS = [
  'brume',
  'cedre',
  'argile',
  'lin',
  'miel',
  'sauge',
  'lotus',
  'jade',
  'aloe',
  'coton',
  'peche',
  'menthe',
  'ambre',
  'opale',
  'iris',
  'saule',
  'givre',
  'aube',
  'baume',
  'nacre',
  'source',
  'petale',
  'mousse',
  'lavande',
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T
}

function randomHandle(suffixCeil = 900, suffixBase = 100): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${suffixBase + Math.floor(Math.random() * suffixCeil)}`
}

// Probe before insert: createProfile runs inside the signup tx, where a unique
// violation would abort the whole transaction. The unique index stays the backstop.
export async function generateUniqueUsername(db: DB): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const candidate = randomHandle()
    const [taken] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.username, candidate))
      .limit(1)
    if (!taken) return candidate
  }
  // Friendly space exhausted (vanishingly unlikely) — widen the numeric suffix.
  return randomHandle(1e7, 0)
}
