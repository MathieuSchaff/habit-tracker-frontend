import { beforeEach, describe, expect, it } from 'bun:test'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { articles } from '../../../db/schema/blog/articles'
import { ingredients } from '../../../db/schema/ingredients/ingredients'
import { products } from '../../../db/schema/products/products'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

describe('Sitemap route', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  it('emits published article routes with their category and update date', async () => {
    const author = await createTestUser()
    await testDb.insert(articles).values([
      {
        createdBy: author.id,
        title: 'Article publié',
        slug: 'article-publie',
        category: 'skincare',
        publishedAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-02-03T12:30:00.000Z',
      },
      {
        createdBy: author.id,
        title: 'Brouillon privé',
        slug: 'brouillon-prive',
        category: 'science',
        publishedAt: null,
      },
    ])

    const response = await app.request('/api/sitemap.xml')
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')
    expect(response.headers.get('cache-control')).toContain('max-age')
    expect(xml).toContain('/blog/skincare/article-publie</loc>')
    expect(xml).toContain('<lastmod>2026-02-03T12:30:00.000Z</lastmod>')
    expect(xml).not.toContain('brouillon-prive')
  })

  it('lists the static hubs and one hub per non-empty blog category', async () => {
    const author = await createTestUser()
    await testDb.insert(articles).values({
      createdBy: author.id,
      title: 'Publié skincare',
      slug: 'publie-skincare',
      category: 'skincare',
      publishedAt: '2026-01-01T10:00:00.000Z',
    })

    const xml = await (await app.request('/api/sitemap.xml')).text()

    for (const hub of ['/products', '/ingredients', '/blog']) {
      expect(xml).toContain(`${hub}</loc>`)
    }
    expect(xml).toContain('/blog/skincare</loc>')
    expect(xml).not.toContain('/blog/science</loc>')
  })

  it('lists only visible, formula-bearing products in the indexable categories', async () => {
    const author = await createTestUser()
    await testDb.insert(products).values([
      {
        createdBy: author.id,
        name: 'Crème visage',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-visage',
        inci: 'Aqua, Glycerin',
      },
      {
        createdBy: author.id,
        name: 'Testo Support',
        brand: 'BrandY',
        category: 'complement',
        kind: 'gelule',
        unit: 'capsule',
        slug: 'testo-support',
        inci: 'Zinc',
      },
      {
        createdBy: author.id,
        name: 'Formule absente',
        brand: 'BrandZ',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'formule-absente',
        inci: '   ',
      },
    ])

    const xml = await (await app.request('/api/sitemap.xml')).text()

    expect(xml).toContain('/products/creme-visage</loc>')
    expect(xml).not.toContain('testo-support')
    expect(xml).not.toContain('formule-absente')
  })

  it('lists visible ingredients and excludes moderated ones', async () => {
    const author = await createTestUser()
    await testDb.insert(ingredients).values([
      {
        createdBy: author.id,
        name: 'Glycérine',
        slug: 'glycerine-visible',
        type: 'skincare',
      },
      {
        createdBy: author.id,
        name: 'Entrée masquée',
        slug: 'ingredient-masque',
        type: 'skincare',
        moderationStatus: 'hidden',
      },
    ])

    const xml = await (await app.request('/api/sitemap.xml')).text()

    expect(xml).toContain('/ingredients/glycerine-visible</loc>')
    expect(xml).not.toContain('ingredient-masque')
  })

  it('escapes XML entities in URLs even when a slug bypassed slugification', async () => {
    const author = await createTestUser()
    // Raw insert on purpose: the create paths always slugify, so only a row written
    // behind their back can carry a reserved character. The sitemap must stay valid XML.
    await testDb.insert(articles).values({
      createdBy: author.id,
      title: 'Slug louche',
      slug: 'a&b',
      category: 'skincare',
      publishedAt: '2026-01-01T10:00:00.000Z',
    })

    const xml = await (await app.request('/api/sitemap.xml')).text()

    expect(xml).toContain('/blog/skincare/a&amp;b</loc>')
    expect(xml).not.toContain('a&b</loc>')
  })
})
