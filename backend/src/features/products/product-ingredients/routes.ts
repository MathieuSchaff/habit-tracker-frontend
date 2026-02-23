import {
  createProductIngredientSchema,
  err,
  errorResponse,
  errorToStatus,
  HTTP_STATUS,
  ok,
  productIngredientErrorMapping,
  productIngredientResponseSchema,
  successResponse,
} from '@habit-tracker/shared'

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

import type { AppEnv } from '../../../app-env'
import { isUniqueViolation } from '../../../lib/helpers'
import { requireJwtAuth } from '../../auth/middleware'
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

const productIngredientWithDetailsSchema = productIngredientResponseSchema.extend({
  ingredientName: z.string(),
  ingredientSlug: z.string(),
  ingredientCategory: z.string().nullable(),
  ingredientDescription: z.string(),
})

const listIngredientsRoute = createRoute({
  method: 'get',
  path: '/{productId}/ingredients',
  tags: ['Product Ingredients'],
  summary: 'List ingredients for a product',
  request: { params: productParams },
  responses: {
    [HTTP_STATUS.OK]: successResponse(
      z.array(productIngredientWithDetailsSchema),
      'Ingredients retrieved'
    ),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Invalid product id'),
  },
})

const addIngredientRoute = createRoute({
  method: 'post',
  path: '/{productId}/ingredients',
  tags: ['Product Ingredients'],
  summary: 'Add an ingredient to a product',
  security: [{ Bearer: [] }],
  request: {
    params: productParams,
    body: { content: { 'application/json': { schema: createProductIngredientSchema } } },
  },
  responses: {
    [HTTP_STATUS.CREATED]: successResponse(productIngredientResponseSchema, 'Ingredient added'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.CONFLICT]: errorResponse('Ingredient already linked to this product'),
  },
})

const updateIngredientLinkRoute = createRoute({
  method: 'patch',
  path: '/{productId}/ingredients/{ingredientId}',
  tags: ['Product Ingredients'],
  summary: 'Update concentration or notes for a product ingredient',
  security: [{ Bearer: [] }],
  request: {
    params: ingredientLinkParams,
    body: { content: { 'application/json': { schema: updateProductIngredientSchema } } },
  },
  responses: {
    [HTTP_STATUS.OK]: successResponse(productIngredientResponseSchema, 'Ingredient link updated'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Ingredient not linked to this product'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
  },
})

const removeIngredientRoute = createRoute({
  method: 'delete',
  path: '/{productId}/ingredients/{ingredientId}',
  tags: ['Product Ingredients'],
  summary: 'Remove an ingredient from a product',
  security: [{ Bearer: [] }],
  request: { params: ingredientLinkParams },
  responses: {
    [HTTP_STATUS.OK]: successResponse(z.null(), 'Ingredient removed'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Ingredient not linked to this product'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
  },
})

const replaceIngredientsRoute = createRoute({
  method: 'put',
  path: '/{productId}/ingredients',
  tags: ['Product Ingredients'],
  summary: 'Replace all ingredients for a product',
  security: [{ Bearer: [] }],
  request: {
    params: productParams,
    body: { content: { 'application/json': { schema: replaceIngredientsSchema } } },
  },
  responses: {
    [HTTP_STATUS.OK]: successResponse(
      z.array(productIngredientResponseSchema),
      'Ingredients replaced'
    ),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
  },
})

// App

const productIngredientsApp = new OpenAPIHono<AppEnv>()

productIngredientsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})

productIngredientsApp.onError((error, c) => {
  if (error instanceof ProductIngredientError) {
    return c.json(
      err(error.code, error.details),
      errorToStatus(error.code, productIngredientErrorMapping)
    )
  }
  console.error('Unexpected error:', error)
  return c.json(err('server_error'), HTTP_STATUS.INTERNAL_SERVER_ERROR)
})

// Handlers

export const productIngredientRoutes = productIngredientsApp

  .openapi(listIngredientsRoute, async (c) => {
    const db = c.get('db')
    const { productId } = c.req.valid('param')
    const items = await listIngredientsByProduct(db, productId)
    return c.json(ok(items), HTTP_STATUS.OK)
  })

  .openapi(addIngredientRoute, async (c) => {
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
  })

  .openapi(updateIngredientLinkRoute, async (c) => {
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
  })

  .openapi(removeIngredientRoute, async (c) => {
    const db = c.get('db')
    const { productId, ingredientId } = c.req.valid('param')
    const removed = await removeIngredientFromProduct(db, productId, ingredientId)
    if (!removed) throw new ProductIngredientError('product_ingredient_not_found')
    return c.json(ok(null), HTTP_STATUS.OK)
  })

  .openapi(replaceIngredientsRoute, async (c) => {
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
  })
