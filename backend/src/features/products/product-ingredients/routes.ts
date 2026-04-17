import { createProductIngredientSchema, HTTP_STATUS, ok } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../../app-env'
import { isUniqueViolation } from '../../../lib/helpers'
import { requireJwtAuth } from '../../auth/middleware'
import { withRlsContext } from '../../auth/rls-context.middleware'
import {
  addIngredientToProduct,
  listIngredientsByProduct,
  removeIngredientFromProduct,
  replaceProductIngredients,
  updateProductIngredient,
} from './product-ingredients.service'
import { ProductIngredientError } from './product-ingredients-error'

const productParams = z.object({ productId: z.uuid() })
const ingredientLinkParams = z.object({ productId: z.uuid(), ingredientId: z.uuid() })

const updateProductIngredientSchema = z
  .object({
    concentrationValue: z.number().min(0).nullable().optional(),
    concentrationUnit: z.enum(['%', 'IU', 'mg', 'mcg', 'mg/mL']).nullable().optional(),
    concentrationPer: z.string().min(1).max(50).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict()

const replaceIngredientsSchema = z.object({
  ingredients: z.array(createProductIngredientSchema),
})

const productIngredientsApp = new Hono<AppEnv>()

productIngredientsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})
productIngredientsApp.use('*', withRlsContext)

export const productIngredientRoutes = productIngredientsApp

  .get('/:productId/ingredients', zValidator('param', productParams), async (c) => {
    const db = c.get('db')
    const { productId } = c.req.valid('param')
    const items = await listIngredientsByProduct(db, productId)
    return c.json(ok(items), HTTP_STATUS.OK)
  })

  .post(
    '/:productId/ingredients',
    zValidator('param', productParams),
    zValidator('json', createProductIngredientSchema),
    async (c) => {
      const db = c.get('db')
      const { productId } = c.req.valid('param')
      const input = c.req.valid('json')

      try {
        const link = await addIngredientToProduct(db, {
          productId,
          ingredientId: input.ingredientId,
          concentrationValue:
            input.concentrationValue != null ? String(input.concentrationValue) : null,
          concentrationUnit: input.concentrationUnit ?? null,
          concentrationPer: input.concentrationPer ?? null,
          notes: input.notes ?? null,
        })
        if (!link) throw new ProductIngredientError('database_error')
        return c.json(ok(link), HTTP_STATUS.CREATED)
      } catch (e) {
        if (e instanceof ProductIngredientError) throw e
        if (isUniqueViolation(e))
          throw new ProductIngredientError('product_ingredient_already_exists')
        throw e
      }
    }
  )

  .patch(
    '/:productId/ingredients/:ingredientId',
    zValidator('param', ingredientLinkParams),
    zValidator('json', updateProductIngredientSchema),
    async (c) => {
      const db = c.get('db')
      const { productId, ingredientId } = c.req.valid('param')
      const input = c.req.valid('json')

      const updated = await updateProductIngredient(db, productId, ingredientId, {
        concentrationValue:
          input.concentrationValue != null
            ? String(input.concentrationValue)
            : input.concentrationValue,
        concentrationUnit: input.concentrationUnit,
        concentrationPer: input.concentrationPer,
        notes: input.notes,
      })

      if (!updated) throw new ProductIngredientError('product_ingredient_not_found')
      return c.json(ok(updated), HTTP_STATUS.OK)
    }
  )

  .delete(
    '/:productId/ingredients/:ingredientId',
    zValidator('param', ingredientLinkParams),
    async (c) => {
      const db = c.get('db')
      const { productId, ingredientId } = c.req.valid('param')
      const removed = await removeIngredientFromProduct(db, productId, ingredientId)
      if (!removed) throw new ProductIngredientError('product_ingredient_not_found')
      return c.body(null, 204)
    }
  )

  .put(
    '/:productId/ingredients',
    zValidator('param', productParams),
    zValidator('json', replaceIngredientsSchema),
    async (c) => {
      const db = c.get('db')
      const { productId } = c.req.valid('param')
      const { ingredients } = c.req.valid('json')

      const links = await replaceProductIngredients(
        db,
        productId,
        ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          concentrationValue: i.concentrationValue != null ? String(i.concentrationValue) : null,
          concentrationUnit: i.concentrationUnit ?? null,
          concentrationPer: i.concentrationPer ?? null,
          notes: i.notes ?? null,
        }))
      )
      return c.json(ok(links), HTTP_STATUS.OK)
    }
  )
