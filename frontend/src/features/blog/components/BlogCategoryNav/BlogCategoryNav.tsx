import {
  type ArticleCategoryCounts,
  BLOG_CATEGORY_LABELS,
  BLOG_CATEGORY_VALUES,
  type BlogCategory,
} from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { articleQueries } from '@/lib/queries/articles'

type Props = {
  category?: BlogCategory
}

function totalCount(counts: ArticleCategoryCounts | undefined): number | undefined {
  if (!counts) return undefined
  return BLOG_CATEGORY_VALUES.reduce((sum, c) => sum + counts[c], 0)
}

export function BlogCategoryNav({ category }: Props) {
  const { data: counts } = useQuery(articleQueries.categoryCounts())

  // Hide empty categories to reduce noise - but never hide the currently-active one,
  // so the user always sees where they are even if its last article was just removed.
  const visibleCategories = BLOG_CATEGORY_VALUES.filter(
    (c) => !counts || counts[c] > 0 || c === category
  )

  const renderCount = (n: number | undefined) =>
    n === undefined ? null : <span className="blog-category-nav__count">{n}</span>

  return (
    <nav className="blog-category-nav" aria-label="Catégories">
      <ul className="blog-category-nav__list">
        <li>
          <Link
            to="/blog"
            className={`blog-category-nav__item${category === undefined ? ' is-active' : ''}`}
            aria-current={category === undefined ? 'page' : undefined}
          >
            <span className="blog-category-nav__label">Tous</span>
            {renderCount(totalCount(counts))}
          </Link>
        </li>
        {visibleCategories.map((c) => (
          <li key={c}>
            <Link
              to="/blog/$category"
              params={{ category: c }}
              className={`blog-category-nav__item${category === c ? ' is-active' : ''}`}
              aria-current={category === c ? 'page' : undefined}
            >
              <span className="blog-category-nav__label">{BLOG_CATEGORY_LABELS[c]}</span>
              {renderCount(counts?.[c])}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
