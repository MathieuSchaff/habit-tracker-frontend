import { HttpResponse, http } from 'msw'

import { INGREDIENT_BY_SLUG, INGREDIENT_FILTER_OPTIONS, INGREDIENTS } from '../fixtures/ingredients'

const ok = <T>(data: T) => HttpResponse.json({ success: true, data })

export const ingredientsHandlers = [
  http.get('*/api/ingredients/search', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    if (!q) return ok([])
    const hits = INGREDIENTS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)
    ).slice(0, 10)
    return ok(hits)
  }),

  http.get('*/api/ingredients/by-slugs', ({ request }) => {
    const url = new URL(request.url)
    const raw = url.searchParams.get('slugs') ?? ''
    const slugs = raw.split(',').filter(Boolean).slice(0, 50)
    const rows = slugs
      .map((s) => INGREDIENT_BY_SLUG[s])
      .filter((r): r is { slug: string; name: string } => Boolean(r))
    return ok(rows)
  }),

  http.get('*/api/ingredients/filter-options', () => ok(INGREDIENT_FILTER_OPTIONS)),
]
