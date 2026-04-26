import { HttpResponse, http } from 'msw'

import {
  PRODUCT_FILTER_OPTIONS,
  PRODUCT_INGREDIENTS,
  PRODUCT_TAGS,
  PRODUCTS,
} from '../fixtures/products'

const ok = <T>(data: T) => HttpResponse.json({ success: true, data })

// Filter keys read from the query string. Tag categories cover the slugs
// stored in PRODUCT_TAGS; `ingredient` cross-references PRODUCT_INGREDIENTS.
const TAG_PARAMS = ['concern', 'skin_type', 'skin_zone', 'product_type', 'routine_step']

export const productsHandlers = [
  http.get('*/api/products/filter-options', () => ok(PRODUCT_FILTER_OPTIONS)),

  http.get('*/api/products', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')

    const tagFilters: string[] = []
    for (const k of TAG_PARAMS) {
      const v = url.searchParams.get(k)
      if (v) tagFilters.push(...v.split(',').filter(Boolean))
    }
    const ingredientFilters = (url.searchParams.get('ingredient') ?? '').split(',').filter(Boolean)

    const filtered = PRODUCTS.filter((p) => {
      const tags = PRODUCT_TAGS[p.id] ?? []
      const ings = PRODUCT_INGREDIENTS[p.id] ?? []
      if (tagFilters.length > 0 && !tagFilters.every((t) => tags.includes(t))) return false
      if (ingredientFilters.length > 0 && !ingredientFilters.every((i) => ings.includes(i)))
        return false
      return true
    })

    return ok({ items: filtered, total: filtered.length, page, limit })
  }),
]
