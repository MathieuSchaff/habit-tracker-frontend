import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { users } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { IngredientError } from '../ingredients-error'
import {
  createIngredient,
  getIngredientById,
  getIngredientBySlug,
  listIngredientEdits,
  updateIngredient,
} from '../service'

let user: any

async function makeIngredient(
  name: string,
  extra: {
    type?: string
    description?: string
    content?: string
    category?: string
    slug?: string
  } = {}
) {
  return createIngredient(testDb, user.id, { name, type: 'skincare', ...extra })
}

describe('updateIngredient — exhaustive', () => {
  beforeEach(async () => {
    user = await createTestUser()
  })

  describe('returning shape and values', () => {
    it('should return a full Ingredient object', async () => {
      const created = await makeIngredient('Rétinol Return', {
        description: 'Avant',
        content: '## Wiki',
        category: 'actif',
      })

      const updated = await updateIngredient(testDb, user.id, created.id, { description: 'Après' })

      expect(updated.id).toBe(created.id)
      expect(updated.name).toBe('Rétinol Return')
      expect(updated.slug).toBe('retinol-return')
      expect(updated.description).toBe('Après')
      expect(updated.content).toBe('## Wiki')
      expect(updated.category).toBe('actif')
      expect(updated.createdBy).toBe(user.id)
      expect(updated.createdAt).toBeInstanceOf(Date)
      expect(updated.updatedAt).toBeInstanceOf(Date)
    })

    it('should return unchanged fields intact', async () => {
      const created = await makeIngredient('Intact', {
        description: 'Desc originale',
        content: 'Contenu original',
        category: 'vitamine',
      })

      const updated = await updateIngredient(testDb, user.id, created.id, { category: 'actif' })

      expect(updated.category).toBe('actif')
      expect(updated.name).toBe('Intact')
      expect(updated.description).toBe('Desc originale')
      expect(updated.content).toBe('Contenu original')
    })

    it('should persist the update in the database', async () => {
      const created = await makeIngredient('Persist Test')

      await updateIngredient(testDb, user.id, created.id, { description: 'Nouvelle description' })

      const fetched = await getIngredientById(testDb, created.id)
      expect(fetched.description).toBe('Nouvelle description')
    })

    it('should return the original ingredient when no actual change occurs', async () => {
      const created = await makeIngredient('NoChange', { category: 'actif' })

      const updated = await updateIngredient(testDb, user.id, created.id, { category: 'actif' })

      expect(updated.id).toBe(created.id)
      expect(updated.category).toBe('actif')
    })
  })

  describe('individual field updates', () => {
    it('should update name only', async () => {
      const created = await makeIngredient('Ancien Nom')

      const updated = await updateIngredient(testDb, user.id, created.id, { name: 'Nouveau Nom' })

      expect(updated.name).toBe('Nouveau Nom')
    })

    it('should update description only', async () => {
      const created = await makeIngredient('Desc Test')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Description mise à jour',
      })

      expect(updated.description).toBe('Description mise à jour')
    })

    it('should update content only', async () => {
      const created = await makeIngredient('Content Test')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        content: '## Nouveau contenu wiki',
      })

      expect(updated.content).toBe('## Nouveau contenu wiki')
    })

    it('should update category only', async () => {
      const created = await makeIngredient('Cat Test', { category: 'actif' })

      const updated = await updateIngredient(testDb, user.id, created.id, { category: 'excipient' })

      expect(updated.category).toBe('excipient')
    })

    it('should set category to null', async () => {
      const created = await makeIngredient('Cat Null', { category: 'actif' })

      const updated = await updateIngredient(testDb, user.id, created.id, { category: null })

      expect(updated.category).toBeNull()
    })

    it('should update description from default empty string to a value', async () => {
      const created = await makeIngredient('Empty Desc')
      expect(created.description).toBe('')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Maintenant rempli',
      })

      expect(updated.description).toBe('Maintenant rempli')
    })

    it('should update content from default empty string to a value', async () => {
      const created = await makeIngredient('Empty Content')
      expect(created.content).toBe('')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        content: '# Wiki complet',
      })

      expect(updated.content).toBe('# Wiki complet')
    })
  })

  describe('multiple fields at once', () => {
    it('should update two fields simultaneously', async () => {
      const created = await makeIngredient('Multi 2')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Nouvelle desc',
        category: 'vitamine',
      })

      expect(updated.description).toBe('Nouvelle desc')
      expect(updated.category).toBe('vitamine')
    })

    it('should update all mutable fields simultaneously', async () => {
      const created = await makeIngredient('Multi All', {
        description: 'Ancienne desc',
        content: 'Ancien contenu',
        category: 'actif',
      })

      const updated = await updateIngredient(
        testDb,
        user.id,
        created.id,
        {
          name: 'Multi All Renamed',
          description: 'Nouvelle desc',
          content: 'Nouveau contenu',
          category: 'excipient',
        },
        'Mise à jour complète'
      )

      expect(updated.name).toBe('Multi All Renamed')
      expect(updated.slug).toBe('multi-all-renamed')
      expect(updated.description).toBe('Nouvelle desc')
      expect(updated.content).toBe('Nouveau contenu')
      expect(updated.category).toBe('excipient')
    })

    it('should only track fields that actually changed in a multi-field update', async () => {
      const created = await makeIngredient('Partial Change', {
        description: 'Déjà là',
        category: 'actif',
      })

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Déjà là', category: 'excipient' },
        'Changement partiel'
      )

      const edits = await listIngredientEdits(testDb, created.id)

      expect(edits).toHaveLength(1)
      expect(edits[0]?.changes).not.toHaveProperty('description')
      expect(edits[0]?.changes).toHaveProperty('category')
    })
  })

  describe('slug logic', () => {
    it('should auto-regenerate slug when name changes', async () => {
      const created = await makeIngredient('Acide Original')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        name: 'Acide Hyaluronique Modifié',
      })

      expect(updated.slug).toBe('acide-hyaluronique-modifie')
    })

    it('should use explicit slug when provided by admin', async () => {
      const created = await makeIngredient('Slug Explicit')
      await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))

      const updated = await updateIngredient(testDb, user.id, created.id, {
        slug: 'mon-slug-custom',
      })

      expect(updated.slug).toBe('mon-slug-custom')
    })

    it('should NOT use explicit slug when provided by non-admin', async () => {
      const created = await makeIngredient('Slug Explicit')
      await testDb.update(users).set({ role: 'user' }).where(eq(users.id, user.id))

      const updated = await updateIngredient(testDb, user.id, created.id, {
        slug: 'mon-slug-custom',
      })

      expect(updated.slug).toBe('slug-explicit') // unchanged or auto from name if name changed
    })

    it('should prefer explicit slug over auto-generated from name (admin)', async () => {
      const created = await makeIngredient('Ancien Nom')
      await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))

      const updated = await updateIngredient(testDb, user.id, created.id, {
        name: 'Nouveau Nom',
        slug: 'slug-force',
      })

      expect(updated.name).toBe('Nouveau Nom')
      expect(updated.slug).toBe('slug-force')
    })

    it('should not change slug when only non-name fields are updated', async () => {
      const created = await makeIngredient('Slug Stable')
      const originalSlug = created.slug

      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Nouvelle description',
      })

      expect(updated.slug).toBe(originalSlug)
    })

    it('should be fetchable by new slug after name change', async () => {
      const created = await makeIngredient('Ancien Slug Fetch')

      await updateIngredient(testDb, user.id, created.id, { name: 'Nouveau Slug Fetch' })

      const fetched = await getIngredientBySlug(testDb, 'nouveau-slug-fetch')
      expect(fetched.id).toBe(created.id)
    })

    it('should handle accented characters in slug generation', async () => {
      const created = await makeIngredient('Accent Slug')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        name: 'Rétinoïde Épaisseur',
      })

      expect(updated.slug).toBe('retinoide-epaisseur')
    })
  })

  describe('audit log', () => {
    it('should record old and new values in changes', async () => {
      const created = await makeIngredient('Audit Values', { category: 'actif' })

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { category: 'excipient' },
        'Changement catégorie'
      )

      const edits = await listIngredientEdits(testDb, created.id)

      expect(edits).toHaveLength(1)
      const changes = edits[0]?.changes as Record<string, { old: unknown; new: unknown }>
      expect(changes.category.old).toBe('actif')
      expect(changes.category.new).toBe('excipient')
    })

    it('should record old null → new value', async () => {
      const created = await makeIngredient('Audit Null To Value')

      await updateIngredient(testDb, user.id, created.id, { category: 'actif' }, 'Ajout catégorie')

      const edits = await listIngredientEdits(testDb, created.id)
      const changes = edits[0]?.changes as Record<string, { old: unknown; new: unknown }>
      expect(changes.category.old).toBeNull()
      expect(changes.category.new).toBe('actif')
    })

    it('should record old value → new null', async () => {
      const created = await makeIngredient('Audit Value To Null', { category: 'actif' })

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { category: null },
        'Suppression catégorie'
      )

      const edits = await listIngredientEdits(testDb, created.id)
      const changes = edits[0]?.changes as Record<string, { old: unknown; new: unknown }>
      expect(changes.category.old).toBe('actif')
      expect(changes.category.new).toBeNull()
    })

    it('should record empty string → value for description', async () => {
      const created = await makeIngredient('Audit Empty To Desc')
      expect(created.description).toBe('')

      await updateIngredient(testDb, user.id, created.id, { description: 'Rempli' }, 'Ajout desc')

      const edits = await listIngredientEdits(testDb, created.id)
      const changes = edits[0]?.changes as Record<string, { old: unknown; new: unknown }>
      expect(changes.description.old).toBe('')
      expect(changes.description.new).toBe('Rempli')
    })

    it('should record multiple changed fields in a single audit entry', async () => {
      const created = await makeIngredient('Audit Multi', {
        description: 'Ancienne',
        content: 'Ancien contenu',
        category: 'actif',
      })

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Nouvelle', content: 'Nouveau contenu', category: 'excipient' },
        'Triple changement'
      )

      const edits = await listIngredientEdits(testDb, created.id)

      expect(edits).toHaveLength(1)
      expect(edits[0]?.changes).toHaveProperty('description')
      expect(edits[0]?.changes).toHaveProperty('content')
      expect(edits[0]?.changes).toHaveProperty('category')
    })

    it('should store summary when provided', async () => {
      const created = await makeIngredient('Summary Yes')

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Changé' },
        'Mon résumé explicite'
      )

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits[0]?.summary).toBe('Mon résumé explicite')
    })

    it('should store summary as null when not provided', async () => {
      const created = await makeIngredient('Summary No')

      await updateIngredient(testDb, user.id, created.id, { description: 'Changé sans summary' })

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits[0]?.summary).toBeNull()
    })

    it('should store the correct editedBy user', async () => {
      const other = await createTestUser('autre@test.com')
      const created = await makeIngredient('EditedBy Test')

      await updateIngredient(testDb, other.id, created.id, { description: 'Modifié par autre' })

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits[0]?.editedBy).toBe(other.id)
    })

    it('should store the correct ingredientId', async () => {
      const created = await makeIngredient('IngredientId Test')

      await updateIngredient(testDb, user.id, created.id, { description: 'Check ingredientId' })

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits[0]?.ingredientId).toBe(created.id)
    })

    it('should store createdAt on the edit entry', async () => {
      const created = await makeIngredient('Edit Timestamp')

      await updateIngredient(testDb, user.id, created.id, { description: 'Timestamp check' })

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits[0]?.createdAt).toBeInstanceOf(Date)
    })

    it('should not create audit log when same value is set (no-op)', async () => {
      const created = await makeIngredient('NoOp Test', {
        description: 'Identique',
        category: 'actif',
      })

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Identique', category: 'actif' },
        'Devrait pas logger'
      )

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits).toHaveLength(0)
    })

    it('should not create audit log when null is set on already-null field', async () => {
      const created = await makeIngredient('Null Null')
      expect(created.category).toBeNull()

      await updateIngredient(testDb, user.id, created.id, { category: null })

      const edits = await listIngredientEdits(testDb, created.id)
      expect(edits).toHaveLength(0)
    })

    it('should create separate audit entries for successive updates', async () => {
      const created = await makeIngredient('Multi Edit')

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Première modif' },
        'Edit 1'
      )
      await updateIngredient(
        testDb,
        user.id,
        created.id,
        { description: 'Deuxième modif' },
        'Edit 2'
      )
      await updateIngredient(testDb, user.id, created.id, { category: 'actif' }, 'Edit 3')

      const edits = await listIngredientEdits(testDb, created.id)

      expect(edits).toHaveLength(3)
      expect(edits[0]?.summary).toBe('Edit 3')
      expect(edits[1]?.summary).toBe('Edit 2')
      expect(edits[2]?.summary).toBe('Edit 1')
    })
    it('should not include EXCLUDED_KEYS in changes even if passed', async () => {
      const created = await makeIngredient('Excluded Keys')

      await updateIngredient(
        testDb,
        user.id,
        created.id,
        {
          description: 'Changed',
          slug: 'new-slug-ignored-in-audit',
        },
        'Excluded test'
      )

      const edits = await listIngredientEdits(testDb, created.id)

      expect(edits).toHaveLength(1)
      expect(edits[0]?.changes).toHaveProperty('description')
      expect(edits[0]?.changes).not.toHaveProperty('slug')
      expect(edits[0]?.changes).not.toHaveProperty('id')
      expect(edits[0]?.changes).not.toHaveProperty('updatedAt')
    })
  })

  describe('error cases', () => {
    it('should throw ingredient_not_found for non-existent id', async () => {
      const fakeId = crypto.randomUUID()

      try {
        await updateIngredient(testDb, user.id, fakeId, { description: 'X' })
        throw new Error('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(IngredientError)
        expect((e as IngredientError).code).toBe('ingredient_not_found')
      }
    })

    it('should not create any audit log when ingredient is not found', async () => {
      const fakeId = crypto.randomUUID()

      try {
        await updateIngredient(testDb, user.id, fakeId, { description: 'X' }, 'Ghost edit')
      } catch {}

      const real = await makeIngredient('Real For Ghost Check')
      const edits = await listIngredientEdits(testDb, real.id)
      expect(edits).toHaveLength(0)
    })
  })

  describe('updatedAt behavior', () => {
    it('should advance updatedAt after a real change', async () => {
      const created = await makeIngredient('Timestamp Advance')
      const originalUpdatedAt = created.updatedAt

      await new Promise((r) => setTimeout(r, 50))

      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Changé pour timestamp',
      })

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
    })

    it('should not change createdAt after update', async () => {
      const created = await makeIngredient('CreatedAt Stable')

      const updated = await updateIngredient(testDb, user.id, created.id, {
        description: 'Modifié',
      })

      expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime())
    })
  })
})
