import { describe, expect, it } from 'vitest'

import { INGREDIENTS } from '../fixtures/ingredients'

describe('MSW smoke', () => {
  it('intercepts /api/ingredients/search and returns matching fixtures', async () => {
    const res = await fetch('/api/ingredients/search?q=nia')
    expect(res.ok).toBe(true)
    const json = (await res.json()) as { success: true; data: typeof INGREDIENTS }
    expect(json.success).toBe(true)
    const slugs = json.data.map((i) => i.slug)
    expect(slugs).toContain('niacinamide')
    expect(slugs).toContain('niacin-pca')
  })

  it('intercepts /api/ingredients/by-slugs and resolves names', async () => {
    const res = await fetch('/api/ingredients/by-slugs?slugs=retinol,niacinamide')
    const json = (await res.json()) as {
      success: true
      data: { slug: string; name: string }[]
    }
    expect(json.data).toHaveLength(2)
    expect(json.data.find((r) => r.slug === 'retinol')?.name).toBe('Retinol')
  })

  it('intercepts /api/products/filter-options', async () => {
    const res = await fetch('/api/products/filter-options')
    const json = (await res.json()) as {
      success: true
      data: { kinds: string[]; brands: string[]; tagCounts: Record<string, number> }
    }
    expect(json.data.brands).toContain('CeraVe')
  })
})
