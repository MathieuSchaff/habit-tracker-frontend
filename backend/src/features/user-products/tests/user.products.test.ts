import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import type { Product } from '../../../db/schema/products'
import { userProductReviews, userProducts } from '../../../db/schema/user-products'
import type { User } from '../../../db/schema/users'
import { createProduct } from '../../../features/products/service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import {
  createUserProduct,
  deleteUserProduct,
  getUserProductById,
  getUserProductByProductId,
  getUserProducts,
  updateUserProduct,
  upsertUserProductReview,
} from '../service'
import { UserProductError } from '../user-product-error'

describe('User Products Service', () => {
  let user: User | undefined
  let product: Product | undefined

  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser('user@test.com')
    product = await createProduct(
      user.id,
      { name: 'Vitamine C', brand: 'Solgar', category: 'skincare', kind: 'complément', unit: 'gélule' },
      testDb
    )
  })

  describe('createUserProduct', () => {
    it('should create a user product', async () => {
      const userProduct = await createUserProduct(
        user.id,
        {
          productId: product.id,
          status: 'in_stock',
          sentiment: 5,
          wouldRepurchase: 'yes',
          comment: 'Good product',
        },
        testDb
      )

      expect(userProduct).toBeDefined()
      expect(userProduct.userId).toBe(user.id)
      expect(userProduct.productId).toBe(product.id)
      expect(userProduct.status).toBe('in_stock')
    })

    it('should update existing user product on conflict', async () => {
      await createUserProduct(
        user.id,
        {
          productId: product.id,
          status: 'in_stock',
        },
        testDb
      )

      const updated = await createUserProduct(
        user.id,
        {
          productId: product.id,
          status: 'archived',
        },
        testDb
      )

      expect(updated.status).toBe('archived')

      const count = await testDb.query.userProducts.findMany({
        where: eq(userProducts.userId, user.id),
      })
      expect(count).toHaveLength(1)
    })
  })

  describe('getUserProducts', () => {
    it('should return all products for a user', async () => {
      await createUserProduct(user.id, { productId: product.id, status: 'in_stock' }, testDb)

      const results = await getUserProducts(user.id, testDb)
      expect(results).toHaveLength(1)
      expect(results[0].productId).toBe(product.id)
    })

    it('should return an empty array if user has no products', async () => {
      const otherUser = await createTestUser('other@test.com')
      const results = await getUserProducts(otherUser.id, testDb)
      expect(results).toHaveLength(0)
    })
  })

  describe('getUserProductById', () => {
    it('should return a user product by id', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )

      const fetched = await getUserProductById(user.id, created.id, testDb)
      expect(fetched?.id).toBe(created.id)
    })

    it('should return undefined if not found', async () => {
      const fakeId = crypto.randomUUID()
      const fetched = await getUserProductById(user.id, fakeId, testDb)
      expect(fetched).toBeUndefined()
    })

    it('should return undefined if the product belongs to another user', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )
      const otherUser = await createTestUser('other@test.com')

      const fetched = await getUserProductById(otherUser.id, created.id, testDb)
      expect(fetched).toBeUndefined()
    })
  })

  describe('getUserProductByProductId', () => {
    it('should return a user product by productId', async () => {
      await createUserProduct(user.id, { productId: product.id, status: 'in_stock' }, testDb)

      const fetched = await getUserProductByProductId(user.id, product.id, testDb)
      expect(fetched?.productId).toBe(product.id)
    })

    it('should return undefined if not found', async () => {
      const fakeProductId = crypto.randomUUID()
      const fetched = await getUserProductByProductId(user.id, fakeProductId, testDb)
      expect(fetched).toBeUndefined()
    })

    it('should return undefined if the user has no association with this product', async () => {
      await createUserProduct(user.id, { productId: product.id, status: 'in_stock' }, testDb)
      const otherUser = await createTestUser('other@test.com')

      const fetched = await getUserProductByProductId(otherUser.id, product.id, testDb)
      expect(fetched).toBeUndefined()
    })
  })

  describe('updateUserProduct', () => {
    it('should update a user product', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )

      const updated = await updateUserProduct(user.id, created.id, { status: 'holy_grail' }, testDb)
      expect(updated.status).toBe('holy_grail')
    })

    it('should throw if user product does not exist', async () => {
      const fakeId = crypto.randomUUID()
      expect(updateUserProduct(user.id, fakeId, { status: 'holy_grail' }, testDb)).rejects.toThrow(
        UserProductError
      )
    })

    it('should throw if user product belongs to another user', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )
      const otherUser = await createTestUser('other@test.com')

      expect(
        updateUserProduct(otherUser.id, created.id, { status: 'holy_grail' }, testDb)
      ).rejects.toThrow(UserProductError)
    })
  })

  describe('deleteUserProduct', () => {
    it('should delete a user product', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )

      await deleteUserProduct(user.id, created.id, testDb)

      const fetched = await getUserProductById(user.id, created.id, testDb)
      expect(fetched).toBeUndefined()
    })

    it('should throw if user product does not exist', async () => {
      const fakeId = crypto.randomUUID()
      expect(deleteUserProduct(user.id, fakeId, testDb)).rejects.toThrow(UserProductError)
    })

    it('should throw if user product belongs to another user', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )
      const otherUser = await createTestUser('other@test.com')

      expect(deleteUserProduct(otherUser.id, created.id, testDb)).rejects.toThrow(UserProductError)
    })
  })

  describe('upsertUserProductReview', () => {
    it('should create and update a review', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )

      const review = await upsertUserProductReview(
        user.id,
        created.id,
        { tolerance: 5, efficacy: 4 },
        testDb
      )
      expect(review.tolerance).toBe(5)

      const updated = await upsertUserProductReview(user.id, created.id, { tolerance: 4 }, testDb)
      expect(updated.tolerance).toBe(4)

      const reviews = await testDb.query.userProductReviews.findMany({
        where: eq(userProductReviews.userProductId, created.id),
      })
      expect(reviews).toHaveLength(1)
    })

    it('should throw if user product not found', async () => {
      const fakeId = crypto.randomUUID()
      expect(upsertUserProductReview(user.id, fakeId, { tolerance: 5 }, testDb)).rejects.toThrow(
        UserProductError
      )
    })

    it('should throw if user product belongs to another user', async () => {
      const created = await createUserProduct(
        user.id,
        { productId: product.id, status: 'in_stock' },
        testDb
      )
      const otherUser = await createTestUser('other@test.com')

      expect(
        upsertUserProductReview(otherUser.id, created.id, { tolerance: 5 }, testDb)
      ).rejects.toThrow(UserProductError)
    })
  })
})
