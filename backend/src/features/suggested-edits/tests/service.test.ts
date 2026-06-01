import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { products } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createSuggestedEdit, listSuggestedEdits, reviewSuggestedEdit } from '../service'

setupDbTests()

let proposerId: string
let reviewerId: string
let productId: string

beforeEach(async () => {
  const proposer = await createTestUser('proposer@toto.com', 'Azerty123!')
  const reviewer = await createTestUser('reviewer@toto.com', 'Azerty123!')
  proposerId = proposer.id
  reviewerId = reviewer.id
  const [p] = await testDb
    .insert(products)
    .values({
      name: 'Old Name',
      brand: 'BrandX',
      category: 'skincare',
      kind: 'serum',
      unit: 'pump',
      slug: 'old-name-brandx',
      createdBy: proposerId,
    })
    .returning({ id: products.id })
  if (!p) throw new Error('product seed failed')
  productId = p.id
})

describe('suggested-edits service', () => {
  it('createSuggestedEdit inserts a pending row', async () => {
    const row = await createSuggestedEdit(testDb, {
      proposerId,
      body: {
        targetType: 'product',
        targetId: productId,
        field: 'name',
        proposedValue: 'New Name',
      },
    })
    expect(row.status).toBe('pending')
    expect(row.proposedValue).toBe('New Name')
  })

  it('listSuggestedEdits filters by status, newest first', async () => {
    await createSuggestedEdit(testDb, {
      proposerId,
      body: { targetType: 'product', targetId: productId, field: 'name', proposedValue: 'A' },
    })
    const { items } = await listSuggestedEdits(testDb, { status: 'pending' })
    expect(items.length).toBe(1)
    expect(items[0]?.status).toBe('pending')
  })

  it('ACCEPT applies the proposed value to the product sheet field + stamps reviewer', async () => {
    const edit = await createSuggestedEdit(testDb, {
      proposerId,
      body: {
        targetType: 'product',
        targetId: productId,
        field: 'name',
        proposedValue: 'Accepted Name',
      },
    })
    const result = await reviewSuggestedEdit(testDb, {
      id: edit.id,
      reviewerId,
      status: 'accepted',
    })
    expect(result.status).toBe('accepted')
    expect(result.reviewedBy).toBe(reviewerId)
    expect(result.reviewedAt).not.toBeNull()
    const [p] = await testDb
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId))
    expect(p?.name).toBe('Accepted Name')
  })

  it('REJECT leaves the sheet untouched', async () => {
    const edit = await createSuggestedEdit(testDb, {
      proposerId,
      body: {
        targetType: 'product',
        targetId: productId,
        field: 'name',
        proposedValue: 'Should Not Apply',
      },
    })
    await reviewSuggestedEdit(testDb, { id: edit.id, reviewerId, status: 'rejected' })
    const [p] = await testDb
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId))
    expect(p?.name).toBe('Old Name')
  })

  it('ACCEPT on a non-pending edit throws', async () => {
    const edit = await createSuggestedEdit(testDb, {
      proposerId,
      body: { targetType: 'product', targetId: productId, field: 'name', proposedValue: 'X' },
    })
    await reviewSuggestedEdit(testDb, { id: edit.id, reviewerId, status: 'accepted' })
    await expect(
      reviewSuggestedEdit(testDb, { id: edit.id, reviewerId, status: 'accepted' })
    ).rejects.toThrow()
  })

  it('ACCEPT 404s a missing edit', async () => {
    await expect(
      reviewSuggestedEdit(testDb, {
        id: '00000000-0000-7000-8000-000000000000',
        reviewerId,
        status: 'accepted',
      })
    ).rejects.toThrow()
  })

  // Covers the applyToSheet 0-row branch: the edit exists but its target is gone.
  it('ACCEPT on an edit whose target sheet is gone throws', async () => {
    const edit = await createSuggestedEdit(testDb, {
      proposerId,
      body: {
        targetType: 'product',
        targetId: '00000000-0000-7000-8000-000000000000',
        field: 'name',
        proposedValue: 'X',
      },
    })
    await expect(
      reviewSuggestedEdit(testDb, { id: edit.id, reviewerId, status: 'accepted' })
    ).rejects.toThrow()
  })
})
