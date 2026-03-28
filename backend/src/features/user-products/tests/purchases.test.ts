import { beforeEach, describe, expect, it } from 'bun:test'

import type { Product } from '../../../db/schema/products'
import type { UserProduct } from '../../../db/schema/user-products'
import type { User } from '../../../db/schema/users'
import { createProduct } from '../../../features/products/service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { addPurchase, finishPurchase, getPurchases, openPurchase } from '../purchase.service'
import { PurchaseError } from '../purchase-error'
import { createUserProduct } from '../service'

describe('Purchase Service', () => {
  let user: User | undefined
  let product: Product | undefined
  let userProduct: UserProduct | undefined

  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser('user@test.com')
    product = await createProduct(
      user.id,
      { name: 'Vitamine C', brand: 'Solgar', kind: 'complément', unit: 'gélule' },
      testDb
    )
    userProduct = await createUserProduct(
      user.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
  })

  describe('addPurchase', () => {
    it('should create a purchase for a user product', async () => {
      const purchase = await addPurchase(
        user.id,
        userProduct.id,
        { purchasedAt: '2026-03-22', pricePaidCents: 1500 },
        testDb
      )
      expect(purchase.userProductId).toBe(userProduct.id)
      expect(purchase.purchasedAt).toBe('2026-03-22')
      expect(purchase.pricePaidCents).toBe(1500)
      expect(purchase.openedAt).toBeNull()
      expect(purchase.finishedAt).toBeNull()
    })

    it('should throw if user product not found', async () => {
      const fakeId = crypto.randomUUID()
      expect(addPurchase(user.id, fakeId, { purchasedAt: '2026-03-22' }, testDb)).rejects.toThrow(
        PurchaseError
      )
    })

    it('should throw if user product belongs to another user', async () => {
      const otherUser = await createTestUser('other@test.com')
      expect(
        addPurchase(otherUser.id, userProduct.id, { purchasedAt: '2026-03-22' }, testDb)
      ).rejects.toThrow(PurchaseError)
    })
  })

  describe('getPurchases', () => {
    it('should return purchases for a user product', async () => {
      await addPurchase(user.id, userProduct.id, { purchasedAt: '2026-03-22' }, testDb)
      await addPurchase(user.id, userProduct.id, { purchasedAt: '2026-03-20' }, testDb)

      const purchases = await getPurchases(user.id, userProduct.id, testDb)
      expect(purchases).toHaveLength(2)
    })

    it('should throw if user product not found', async () => {
      const fakeId = crypto.randomUUID()
      expect(getPurchases(user.id, fakeId, testDb)).rejects.toThrow(PurchaseError)
    })
  })

  describe('openPurchase', () => {
    it('should set openedAt on a purchase', async () => {
      const purchase = await addPurchase(
        user.id,
        userProduct.id,
        { purchasedAt: '2026-03-20' },
        testDb
      )
      const opened = await openPurchase(user.id, purchase.id, { openedAt: '2026-03-22' }, testDb)
      expect(opened.openedAt).toBe('2026-03-22')
    })

    it('should throw if another purchase is already active', async () => {
      const p1 = await addPurchase(user.id, userProduct.id, { purchasedAt: '2026-03-20' }, testDb)
      await openPurchase(user.id, p1.id, { openedAt: '2026-03-20' }, testDb)

      const p2 = await addPurchase(user.id, userProduct.id, { purchasedAt: '2026-03-21' }, testDb)
      expect(openPurchase(user.id, p2.id, { openedAt: '2026-03-22' }, testDb)).rejects.toThrow(
        PurchaseError
      )
    })

    it('should throw if purchase not found', async () => {
      const fakeId = crypto.randomUUID()
      expect(openPurchase(user.id, fakeId, { openedAt: '2026-03-22' }, testDb)).rejects.toThrow(
        PurchaseError
      )
    })
  })

  describe('finishPurchase', () => {
    it('should set finishedAt on the active purchase', async () => {
      const purchase = await addPurchase(
        user.id,
        userProduct.id,
        { purchasedAt: '2026-03-20' },
        testDb
      )
      await openPurchase(user.id, purchase.id, { openedAt: '2026-03-20' }, testDb)
      const finished = await finishPurchase(
        user.id,
        userProduct.id,
        { finishedAt: '2026-03-22' },
        testDb
      )
      expect(finished.finishedAt).toBe('2026-03-22')
    })

    it('should throw if no active purchase exists', async () => {
      expect(
        finishPurchase(user.id, userProduct.id, { finishedAt: '2026-03-22' }, testDb)
      ).rejects.toThrow(PurchaseError)
    })
  })
})
