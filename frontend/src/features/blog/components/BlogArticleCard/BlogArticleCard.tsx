import { type ArticleListItem, BLOG_CATEGORY_LABELS } from '@habit-tracker/shared'

import { Link } from '@tanstack/react-router'
import type React from 'react'

import { Card } from '@/component/Card/Card'
import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { Time } from '@/component/DataDisplay/Time/Time'

type Props = {
  article: ArticleListItem
  isHero?: boolean
}

export function BlogArticleCard({ article, isHero }: Props) {
  return (
    <Card
      as={Link as React.ElementType}
      to="/blog/$category/$slug"
      params={{ category: article.category, slug: article.slug }}
      accent="var(--color-primary)"
      className={isHero ? 'blog-card--hero' : undefined}
    >
      {article.coverImageUrl && (
        <Card.Media className="blog-list__cover">
          <img src={article.coverImageUrl} alt="" loading="lazy" />
        </Card.Media>
      )}
      <Card.Body>
        <Card.Title>{article.title}</Card.Title>
        {article.excerpt && <Card.Description>{article.excerpt}</Card.Description>}
      </Card.Body>
      <Card.Footer>
        <Badge variant="chip">{BLOG_CATEGORY_LABELS[article.category]}</Badge>
        {article.publishedAt && (
          <Time iso={article.publishedAt} style="medium" className="blog-card__date" />
        )}
      </Card.Footer>
    </Card>
  )
}
